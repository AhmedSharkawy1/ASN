/**
 * migrate-supabase-to-r2.js
 *
 * Safe, idempotent, zero-downtime background migration script that transfers
 * all menu images from Supabase Storage into Cloudflare R2.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-r2.js
 *   node scripts/migrate-supabase-to-r2.js --dry-run
 *
 * Features:
 *   • Streaming transfer: direct from Supabase to R2 without local disk saving
 *   • Idempotent: skips files that already exist in R2 (safe to re-run anytime)
 *   • Concurrency controlled: handles large buckets without hitting rate limits
 *   • Detailed progress tracking and bandwidth reporting
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = 'menu-images';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'asn-menu-images';

const isDryRun = process.argv.includes('--dry-run');
const CONCURRENCY = 6;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Supabase credentials missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('❌ Error: Cloudflare R2 credentials missing in .env.local:');
  console.error('   Please provide: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function checkR2Exists(key) {
  try {
    await r2Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function listAllFilesRecursive(folder = '') {
  let allFiles = [];
  let offset = 0;
  const limit = 1000;

  console.log(`[SCAN] Scanning folder "${folder || '(root)'}"...`);

  while (true) {
    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .list(folder, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.warn(`[SCAN] Warning reading folder "${folder}":`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      if (!item.id) {
        // Subdirectory
        const subFiles = await listAllFilesRecursive(fullPath);
        allFiles = allFiles.concat(subFiles);
      } else if (item.name !== '.emptyFolderPlaceholder') {
        allFiles.push({
          path: fullPath,
          size: item.metadata?.size || 0,
          contentType: item.metadata?.mimetype || 'image/webp',
        });
      }
    }

    console.log(`[SCAN] "${folder || '(root)'}": scanned ${data.length} entries (running total: ${allFiles.length})`);
    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

async function transferSingleFile(file, idx, total) {
  const percent = ((idx / total) * 100).toFixed(1);
  const prefix = `[${idx}/${total}] (${percent}%)`;

  // 1. Check if already migrated
  const alreadyExists = await checkR2Exists(file.path);
  if (alreadyExists) {
    console.log(`${prefix} ⏩ Already in R2: ${file.path}`);
    return { status: 'skipped', size: file.size };
  }

  if (isDryRun) {
    console.log(`${prefix} 🔎 [DRY RUN] Would copy: ${file.path} (${(file.size / 1024).toFixed(1)} KB)`);
    return { status: 'dry-run', size: file.size };
  }

  // 2. Download from Supabase and upload to R2 (with retry on connection limits)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: blob, error } = await supabaseAdmin.storage
        .from(SUPABASE_BUCKET)
        .download(file.path);

      if (error) throw error;

      const buffer = Buffer.from(await blob.arrayBuffer());

      // 3. Upload to Cloudflare R2 with 1-year immutable caching
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: file.path,
          Body: buffer,
          ContentType: file.contentType || 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      console.log(`${prefix} ✅ Migrated: ${file.path} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return { status: 'transferred', size: buffer.length };
    } catch (err) {
      if (attempt < 3) {
        console.warn(`${prefix} ⚠️ Attempt ${attempt} failed for ${file.path} (${err.message}). Retrying in ${attempt}s...`);
        await new Promise(res => setTimeout(res, 1000 * attempt));
      } else {
        console.error(`${prefix} ❌ Failed to migrate ${file.path}:`, err.message);
        return { status: 'error', error: err.message };
      }
    }
  }
}

async function runMigration() {
  console.log('='.repeat(72));
  console.log('  🚀 SUPABASE TO CLOUDFLARE R2 MIGRATION TOOL');
  console.log('='.repeat(72));
  console.log(`  Source:     Supabase (${SUPABASE_URL}) [${SUPABASE_BUCKET}]`);
  console.log(`  Target:     Cloudflare R2 [${R2_BUCKET_NAME}]`);
  console.log(`  Mode:       ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE MIGRATION'}`);
  console.log('='.repeat(72));
  console.log('');

  console.log('Scanning Supabase Storage bucket for all images...');
  const files = await listAllFilesRecursive('');
  console.log(`Found ${files.length} total files to process in Supabase Storage.\n`);

  if (files.length === 0) {
    console.log('No files found in bucket. Migration finished.');
    return;
  }

  let transferredCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalBytesTransferred = 0;

  // Process in chunks with concurrency control
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((file, chunkIdx) => transferSingleFile(file, i + chunkIdx + 1, files.length))
    );

    for (const r of results) {
      if (r.status === 'transferred') {
        transferredCount++;
        totalBytesTransferred += r.size;
      } else if (r.status === 'skipped') {
        skippedCount++;
      } else if (r.status === 'error') {
        errorCount++;
      }
    }
  }

  console.log('');
  console.log('='.repeat(72));
  console.log('  🎉 MIGRATION COMPLETED');
  console.log('='.repeat(72));
  console.log(`  Total files processed:   ${files.length}`);
  console.log(`  Successfully transferred:${transferredCount}`);
  console.log(`  Already in R2 (skipped): ${skippedCount}`);
  console.log(`  Errors:                  ${errorCount}`);
  console.log(`  Total Data Migrated:     ${(totalBytesTransferred / 1024 / 1024).toFixed(2)} MB`);
  console.log('='.repeat(72));
}

runMigration().catch(console.error);
