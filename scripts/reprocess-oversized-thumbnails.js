/**
 * Oversized Thumbnail Reprocessor
 *
 * Companion to backfill-thumbnails.js. That script creates thumbnails that are
 * MISSING; this one repairs thumbnails that EXIST but were never actually
 * resized.
 *
 * Why they exist: the upload route carried a "TEMPORARY DIAGNOSTIC: Bypass
 * Sharp completely" for a long time, during which every thumbs/ object was
 * written as a byte-for-byte copy of the original. The route is fixed, but
 * every image uploaded while the bypass was in place is still full size.
 *
 * What it does: walks thumbs/, measures each object, and re-encodes the ones
 * whose longest edge exceeds the thumbnail bound. The object is replaced AT
 * THE SAME PATH, so thumbnail_url stays valid and no database rows are
 * touched at all.
 *
 * Usage:
 *   node scripts/reprocess-oversized-thumbnails.js              # dry run, changes nothing
 *   node scripts/reprocess-oversized-thumbnails.js --apply      # actually rewrite
 *   node scripts/reprocess-oversized-thumbnails.js --apply --limit=50
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env / .env.local.
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'menu-images';

// Keep in step with src/app/api/upload-image/route.ts.
// Bounded by WIDTH: existing good thumbnails are 400x533, 400x500 etc., and
// re-capping those to a 400 longest edge would soften them for no real saving.
const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 1200;
const THUMB_QUALITY = 72;
const PAGE_SIZE = 100;
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    // Folder placeholders come back without metadata.
    out.push(...data.filter((o) => o.metadata && o.metadata.size));
    if (data.length < PAGE_SIZE) break;
  }
  return out;
}

/** Returns a result object; never throws, so one bad object cannot end the run. */
async function processOne(obj) {
  const path = `thumbs/${obj.name}`;
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(path);
    if (error) return { path, status: 'download-failed', detail: error.message };

    const input = Buffer.from(await data.arrayBuffer());
    const meta = await sharp(input).metadata();

    if ((meta.width || 0) <= THUMB_MAX_WIDTH && (meta.height || 0) <= THUMB_MAX_HEIGHT) {
      return { path, status: 'already-ok', before: input.length, after: input.length };
    }

    const output = await sharp(input)
      .rotate()
      .resize(THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    // Never make an object bigger than it already was.
    if (output.length >= input.length) {
      return { path, status: 'skipped-no-gain', before: input.length, after: input.length };
    }

    if (APPLY) {
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(path, output, { contentType: 'image/webp', cacheControl: '31536000', upsert: true });
      if (upErr) return { path, status: 'upload-failed', detail: upErr.message };
    }

    return {
      path,
      status: APPLY ? 'rewritten' : 'would-rewrite',
      before: input.length,
      after: output.length,
      dims: `${meta.width}x${meta.height}`,
    };
  } catch (err) {
    return { path, status: 'error', detail: err.message.split('\n')[0] };
  }
}

async function main() {
  console.log(`\nOversized thumbnail reprocessor — ${APPLY ? 'APPLY (will rewrite)' : 'DRY RUN (no writes)'}`);
  console.log(`target: width <= ${THUMB_MAX_WIDTH}px (height <= ${THUMB_MAX_HEIGHT}px), webp q${THUMB_QUALITY}\n`);

  const objects = (await listAll('thumbs')).slice(0, LIMIT);
  console.log(`found ${objects.length} objects under thumbs/\n`);

  const totals = { before: 0, after: 0 };
  const counts = {};
  let done = 0;

  for (let i = 0; i < objects.length; i += CONCURRENCY) {
    const results = await Promise.all(objects.slice(i, i + CONCURRENCY).map(processOne));
    for (const r of results) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (r.before) {
        totals.before += r.before;
        totals.after += r.after;
      }
      if (r.status === 'rewritten' || r.status === 'would-rewrite') {
        console.log(`  ${r.status.padEnd(13)} ${r.path.padEnd(34)} ${kb(r.before)} -> ${kb(r.after)}  (${r.dims})`);
      } else if (r.detail) {
        console.log(`  ${r.status.padEnd(13)} ${r.path.padEnd(34)} ${r.detail}`);
      }
    }
    done += results.length;
    if (done % 30 === 0) console.log(`  ... ${done}/${objects.length}`);
  }

  const saved = totals.before - totals.after;
  console.log('\n---------------------------------------------');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log('---------------------------------------------');
  console.log(`  total before   ${kb(totals.before)}`);
  console.log(`  total after    ${kb(totals.after)}`);
  console.log(`  saved          ${kb(saved)}${totals.before ? `  (${((saved / totals.before) * 100).toFixed(1)}%)` : ''}`);
  if (!APPLY) console.log('\n  dry run — nothing was written. Re-run with --apply to commit.');
  console.log();
}

main().catch((e) => {
  console.error('\nfatal:', e.message);
  process.exit(1);
});
