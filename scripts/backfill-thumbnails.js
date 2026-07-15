/**
 * Thumbnail Backfill Script
 * 
 * Securely backfills thumbnail_url for items and categories that have image_url
 * but no thumbnail_url. Downloads original, resizes locally via sharp, uploads
 * to thumbs/ and updates the database.
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

    if (downloadError) throw downloadError;

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

    if (uploadError) throw uploadError;

    // 4. Update Database
    const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);
    const thumbUrl = publicUrlData.publicUrl;

    const { error: dbError } = await supabaseAdmin
      .from(table)
      .update({ thumbnail_url: thumbUrl })
      .eq('id', record.id);

    if (dbError) throw dbError;

    const bytesSaved = buffer.byteLength - thumbBuffer.byteLength;
    if (bytesSaved > 0) stats.totalBytesSaved += bytesSaved;

    stats.success++;
    if (table === 'items') stats.itemsSuccess++;
    if (table === 'categories') stats.categoriesSuccess++;

    console.log(`    ✅ ${table}[${record.id}]: thumb generated (${(thumbBuffer.byteLength / 1024).toFixed(1)} KB)`);
  } catch (err) {
    stats.failed++;
    if (table === 'items') stats.itemsFailed++;
    if (table === 'categories') stats.categoriesFailed++;

    // Classify error
    const msg = err.message || '';
    const status = err.status || err.statusCode;
    
    if (status === 429 || msg.includes('429') || msg.includes('Too Many Requests')) {
      stats.err429++;
    } else if ((status >= 500 && status < 600) || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      stats.err5xx++;
    } else if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch') || err.name === 'FetchError' || msg.includes('ECONNRESET')) {
      stats.errNetwork++;
    }

    console.error(`    ❌ [ERROR] ${table} [${record.id}]: ${msg}`);
  }
}

async function processTable(table, stats, failedIdsSet, BATCH_FETCH_SIZE, concurrency) {
  let batchNumber = 0;

  while (true) {
    batchNumber++;

    // Fetch batch
    const { data: records, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select('id, image_url, thumbnail_url')
      .not('image_url', 'is', null)
      .is('thumbnail_url', null)
      .limit(BATCH_FETCH_SIZE);

    if (fetchErr && fetchErr.code !== '42703') {
      console.error(`[FATAL] Failed to fetch ${table}:`, fetchErr.message);
      break;
    }

    if (!records || records.length === 0) {
      console.log(`\n✅ No more processable records found in ${table}.`);
      break;
    }

    const processableRecords = records.filter(r => !failedIdsSet.has(r.id));

    if (processableRecords.length === 0) {
      console.log(`\n⚠️ Batch contains only previously failed IDs. Stopping safely for ${table}.`);
      break;
    }

    console.log(`\n--- Batch #${batchNumber} (${table}) ---`);
    console.log(`Fetched records: ${records.length}`);
    console.log(`Processable records (excluding prior failures): ${processableRecords.length}`);

    let batchSuccess = 0;
    let batchFailed = 0;

    // Process concurrently
    for (let i = 0; i < processableRecords.length; i += concurrency) {
      const chunk = processableRecords.slice(i, i + concurrency);
      
      const promises = chunk.map(async (record) => {
        stats.current++;
        const initialSuccess = stats.success;
        await processRecord(record, table, stats);
        
        if (stats.success > initialSuccess) {
          batchSuccess++;
        } else {
          batchFailed++;
          failedIdsSet.add(record.id);
          stats.failedRecords.push({ id: record.id, table });
        }
      });
      
      await Promise.all(promises);
      
      if (i + concurrency < processableRecords.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log(`\n[Batch #${batchNumber} Summary]`);
    console.log(`Successfully processed: ${batchSuccess}`);
    console.log(`Failed in batch: ${batchFailed}`);
    console.log(`Total processed this run: ${stats.success}`);
  }
}

async function runBackfill() {
  const batchArg = process.argv.find(a => a.startsWith('--batch='));
  const concurrency = batchArg ? parseInt(batchArg.split('=')[1]) : DEFAULT_CONCURRENCY;
  const BATCH_FETCH_SIZE = 500;

  console.log(`\n🚀 Starting thumbnail backfill (Batch-Draining Mode)...`);
  
  // Dry run / Count verification
  const { count: initialItems } = await supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).not('image_url', 'is', null).is('thumbnail_url', null);
  const { count: initialCats } = await supabaseAdmin.from('categories').select('*', { count: 'exact', head: true }).not('image_url', 'is', null).is('thumbnail_url', null);

  const stats = { 
    current: 0, 
    success: 0, 
    failed: 0, 
    itemsInitial: initialItems || 0,
    categoriesInitial: initialCats || 0,
    itemsSuccess: 0,
    itemsFailed: 0,
    categoriesSuccess: 0,
    categoriesFailed: 0,
    err429: 0,
    err5xx: 0,
    errNetwork: 0,
    totalBytesSaved: 0,
    failedRecords: []
  };

  console.log(`\n📊 Initial Backfill Summary:`);
  console.log(`   Items pending: ${stats.itemsInitial}`);
  console.log(`   Categories pending: ${stats.categoriesInitial}`);
  console.log(`   Total to process: ${stats.itemsInitial + stats.categoriesInitial}`);

  if (stats.itemsInitial + stats.categoriesInitial === 0) {
    console.log('\n✅ All records have thumbnail_url. Nothing to do!');
    return;
  }

  const failedIdsSet = new Set();

  await processTable('items', stats, failedIdsSet, BATCH_FETCH_SIZE, concurrency);
  await processTable('categories', stats, failedIdsSet, BATCH_FETCH_SIZE, concurrency);

  // Final check of remaining
  const { count: remItems } = await supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).not('image_url', 'is', null).is('thumbnail_url', null);
  const { count: remCats } = await supabaseAdmin.from('categories').select('*', { count: 'exact', head: true }).not('image_url', 'is', null).is('thumbnail_url', null);

  console.log('\n======================================');
  console.log('📋 FINAL BACKFILL REPORT:');
  console.log('======================================');
  console.log(`Items:`);
  console.log(`- Initial missing thumbnail count: ${stats.itemsInitial}`);
  console.log(`- Successfully processed: ${stats.itemsSuccess}`);
  console.log(`- Failed: ${stats.itemsFailed}`);
  console.log(`- Remaining where image_url IS NOT NULL AND thumbnail_url IS NULL: ${remItems || 0}`);
  
  console.log(`\nCategories:`);
  console.log(`- Initial missing thumbnail count: ${stats.categoriesInitial}`);
  console.log(`- Successfully processed: ${stats.categoriesSuccess}`);
  console.log(`- Failed: ${stats.categoriesFailed}`);
  console.log(`- Remaining where image_url IS NOT NULL AND thumbnail_url IS NULL: ${remCats || 0}`);

  console.log(`\nTotals:`);
  console.log(`- Total success: ${stats.success}`);
  console.log(`- Total failed: ${stats.failed}`);
  console.log(`- Total remaining: ${(remItems || 0) + (remCats || 0)}`);
  console.log(`- Number of HTTP 429 errors: ${stats.err429}`);
  console.log(`- Number of HTTP 5xx errors: ${stats.err5xx}`);
  console.log(`- Number of timeout/network errors: ${stats.errNetwork}`);

  if (stats.failedRecords.length > 0) {
    console.log(`\n⚠️ Failed Record IDs:`);
    stats.failedRecords.forEach(r => console.log(`   - ${r.table} [${r.id}]`));
  }
  
  console.log('======================================');
}

runBackfill().catch(console.error);
