const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'menu-images';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: env missing.');
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
  const lastPart = parts[parts.length - 1] || '';
  return lastPart.replace(/\.[^/.]+$/, '');
}

async function getThumbsList() {
  const existingThumbs = new Set();
  let hasMore = true;
  let offset = 0;
  const limit = 1000;

  console.log('Fetching list of existing thumbnails from storage...');

  while (hasMore) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list('thumbs', {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing thumbs folder:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach(item => {
      const rawName = item.name.replace(/\.[^/.]+$/, '');
      existingThumbs.add(rawName);
    });

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return existingThumbs;
}

async function runMigration() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Starting database-driven thumbnail migration... ${dryRun ? '(DRY RUN)' : ''}`);

  // 1. Get existing thumbnails list (fast)
  const existingThumbs = await getThumbsList();
  console.log(`Found ${existingThumbs.size} existing thumbnails already generated.`);

  // 2. Query database for all image URLs
  console.log('Fetching image URLs from database...');
  const pathsToCheck = new Map(); // path -> uuid

  // Fetch from items
  const { data: items } = await supabaseAdmin.from('items').select('image_url');
  (items || []).forEach(i => {
    const p = extractStoragePath(i.image_url);
    if (p && !p.startsWith('thumbs/') && !p.startsWith('original/')) {
      pathsToCheck.set(p, extractUuid(p));
    }
  });

  // Fetch from categories
  const { data: categories } = await supabaseAdmin.from('categories').select('image_url');
  (categories || []).forEach(c => {
    const p = extractStoragePath(c.image_url);
    if (p && !p.startsWith('thumbs/') && !p.startsWith('original/')) {
      pathsToCheck.set(p, extractUuid(p));
    }
  });

  // Fetch from restaurants
  const { data: restaurants } = await supabaseAdmin.from('restaurants').select('logo_url, cover_url, cover_images');
  (restaurants || []).forEach(r => {
    const logoPath = extractStoragePath(r.logo_url);
    if (logoPath) pathsToCheck.set(logoPath, extractUuid(logoPath));

    const coverPath = extractStoragePath(r.cover_url);
    if (coverPath) pathsToCheck.set(coverPath, extractUuid(coverPath));

    if (Array.isArray(r.cover_images)) {
      r.cover_images.forEach(img => {
        const p = extractStoragePath(img);
        if (p) pathsToCheck.set(p, extractUuid(p));
      });
    }
  });

  console.log(`Found ${pathsToCheck.size} unique original images referenced in DB.`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytesSaved = 0;

  for (const [filePath, uuid] of pathsToCheck.entries()) {
    if (existingThumbs.has(uuid)) {
      skipped++;
      continue;
    }

    processed++;
    
    if (dryRun) {
      console.log(`[${processed}] Would process: ${filePath}`);
      continue;
    }

    console.log(`[${processed}] Processing: ${filePath}`);

    try {
      // 1. Download original file
      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      const buffer = Buffer.from(await blob.arrayBuffer());

      // 2. Generate thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize(400, null, { fit: 'inside', withoutEnlargement: true })
        .rotate()
        .webp({ quality: 80 })
        .toBuffer();

      // 3. Upload thumbnail
      const thumbPath = `thumbs/${uuid}.webp`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(thumbPath, thumbBuffer, {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const bytesSaved = buffer.byteLength - thumbBuffer.byteLength;
      if (bytesSaved > 0) {
        totalBytesSaved += bytesSaved;
      }

      console.log(`    ✅ Generated thumb: ${thumbPath} (${(thumbBuffer.byteLength / 1024).toFixed(1)} KB, saved ${(bytesSaved / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`    ❌ Failed to process ${filePath}:`, err.message);
      failed++;
    }
  }

  console.log('\n======================================');
  console.log('Migration Report:');
  console.log(`Total referenced files in DB: ${pathsToCheck.size}`);
  console.log(`Already exists (skipped): ${skipped}`);
  console.log(`Newly processed: ${processed - failed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Estimated Egress Bandwidth Saved: ${(totalBytesSaved / (1024 * 1024)).toFixed(2)} MB`);
  console.log('======================================');
}

runMigration().catch(console.error);
