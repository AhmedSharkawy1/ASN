/**
 * Thumbnail Backfill Script
 * 
 * Securely backfills thumbnail_url for items and categories that have image_url
 * but no thumbnail_url. Downloads original, resizes locally via sharp, uploads
 * to thumbs/ and updates the database.
 * 
 * Usage:
 *   node scripts/backfill-thumbnails.js --dry-run
 *   node scripts/backfill-thumbnails.js
 *   node scripts/backfill-thumbnails.js --batch=3
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'menu-images';

const THUMB_MAX_WIDTH = 400;
const THUMB_QUALITY = 75;
const DEFAULT_CONCURRENCY = 3;
const DELAY_BETWEEN_BATCHES_MS = 500;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing env variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const SUPABASE_STORAGE_PATH = '/storage/v1/object/public/menu-images/';

function extractStoragePath(url) {
  if (!url) return null;
  const idx = url.indexOf(SUPABASE_STORAGE_PATH);
  if (idx === -1) return null;
  return url.substring(idx + SUPABASE_STORAGE_PATH.length);
}

function extractUuid(path) {
  if (!path) return null;
  const parts = path.split('/');
  return (parts[parts.length - 1] || '').replace(/\.[^/.]+$/, '');
}

async function processRecord(record, table, stats) {
  try {
    const originalPath = extractStoragePath(record.image_url);
    if (!originalPath) throw new Error('Invalid original URL format');

    const uuid = extractUuid(originalPath);
    if (!uuid) throw new Error('Could not extract UUID');

    // 1. Download original
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(originalPath);

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);

    const buffer = Buffer.from(await blob.arrayBuffer());

    // 2. Generate thumb
    const thumbBuffer = await sharp(buffer)
      .resize(THUMB_MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
      .rotate()
      .webp({ quality: THUMB_QUALITY, effort: 4 })
      .toBuffer();

    // 3. Upload thumb
    const thumbPath = `thumbs/${uuid}.webp`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 4. Update Database
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);
    const thumbUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseAdmin
      .from(table)
      .update({ thumbnail_url: thumbUrl })
      .eq('id', record.id);

    if (dbError) throw new Error(`Database update failed: ${dbError.message}`);

    const bytesSaved = buffer.byteLength - thumbBuffer.byteLength;
    if (bytesSaved > 0) stats.totalBytesSaved += bytesSaved;

    stats.success++;
    console.log(`    ✅ ${table}[${record.id}]: thumb generated (${(thumbBuffer.byteLength / 1024).toFixed(1)} KB)`);
  } catch (err) {
    stats.failed++;
    console.error(`    ❌ Failed ${table}[${record.id}]: ${err.message}`);
  }
}

async function runBackfill() {
  const dryRun = process.argv.includes('--dry-run');
  const batchArg = process.argv.find(a => a.startsWith('--batch='));
  const concurrency = batchArg ? parseInt(batchArg.split('=')[1]) : DEFAULT_CONCURRENCY;

  console.log(`\n🚀 Starting thumbnail backfill... ${dryRun ? '(DRY RUN)' : ''}`);

  // Fetch Items
  const { data: items, error: iErr } = await supabaseAdmin
    .from('items')
    .select('id, image_url, thumbnail_url')
    .not('image_url', 'is', null)
    .is('thumbnail_url', null);

  if (iErr) {
    console.error('Failed to fetch items:', iErr.message);
    // Continue anyway if the column doesn't exist yet (will error out cleanly)
    if (iErr.code === '42703') {
      console.log('thumbnail_url column missing. Run the SQL migration first!');
      return;
    }
  }

  // Fetch Categories
  const { data: categories, error: cErr } = await supabaseAdmin
    .from('categories')
    .select('id, image_url, thumbnail_url')
    .not('image_url', 'is', null)
    .is('thumbnail_url', null);

  const pendingItems = items || [];
  const pendingCats = categories || [];
  const total = pendingItems.length + pendingCats.length;

  console.log(`\n📊 Backfill Summary:`);
  console.log(`   Items pending: ${pendingItems.length}`);
  console.log(`   Categories pending: ${pendingCats.length}`);
  console.log(`   Total to process: ${total}`);

  if (total === 0) {
    console.log('\n✅ All records have thumbnail_url. Nothing to do!');
    return;
  }

  const stats = { current: 0, total, success: 0, failed: 0, totalBytesSaved: 0 };
  const allTasks = [
    ...pendingItems.map(r => ({ record: r, table: 'items' })),
    ...pendingCats.map(r => ({ record: r, table: 'categories' }))
  ];

  for (let i = 0; i < allTasks.length; i += concurrency) {
    const batch = allTasks.slice(i, i + concurrency);
    
    if (dryRun) {
      batch.forEach(t => console.log(`[DRY RUN] Would process ${t.table}[${t.record.id}]: ${t.record.image_url}`));
    } else {
      const promises = batch.map(t => {
        stats.current++;
        console.log(`[${stats.current}/${stats.total}] Processing ${t.table}[${t.record.id}]...`);
        return processRecord(t.record, t.table, stats);
      });
      await Promise.all(promises);
      if (i + concurrency < allTasks.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }
  }

  console.log('\n======================================');
  console.log('📋 Backfill Report:');
  console.log(`   Successfully generated: ${stats.success}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Estimated bandwidth saved per page load: ${(stats.totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
  console.log('======================================');
}

runBackfill().catch(console.error);
