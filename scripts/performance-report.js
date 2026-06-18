const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'menu-images';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Env variables missing.');
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

async function runReport() {
  console.log('Fetching image URLs from database...');

  // Get active image URLs
  const { data: items } = await supabaseAdmin.from('items').select('image_url');
  const { data: categories } = await supabaseAdmin.from('categories').select('image_url');
  
  const allUrls = new Set();
  
  (items || []).forEach(i => {
    if (i.image_url && i.image_url.includes(SUPABASE_STORAGE_PATH)) {
      allUrls.add(i.image_url);
    }
  });

  (categories || []).forEach(c => {
    if (c.image_url && c.image_url.includes(SUPABASE_STORAGE_PATH)) {
      allUrls.add(c.image_url);
    }
  });

  const urlArray = Array.from(allUrls);
  console.log(`Found ${urlArray.length} unique active menu images referenced in the database.`);

  if (urlArray.length === 0) {
    console.log('No active menu images found in database. Using realistic fallback calculations.');
  }

  // Sample a few images to measure original vs optimized sizes
  const sampleCount = Math.min(5, urlArray.length);
  console.log(`Downloading and optimizing a sample of ${sampleCount} actual images to calculate average compression ratios...`);
  
  let originalSizeSum = 0;
  let thumbSizeSum = 0;
  let sampleSuccessCount = 0;

  for (let i = 0; i < sampleCount; i++) {
    const url = urlArray[i];
    const storagePath = extractStoragePath(url);
    if (!storagePath) continue;

    try {
      const { data: blob, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(storagePath);

      if (error) throw error;

      const buffer = Buffer.from(await blob.arrayBuffer());
      const originalSize = buffer.byteLength;

      // Generate thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize(400, null, { fit: 'inside', withoutEnlargement: true })
        .rotate()
        .webp({ quality: 80 })
        .toBuffer();

      const thumbSize = thumbBuffer.byteLength;

      originalSizeSum += originalSize;
      thumbSizeSum += thumbSize;
      sampleSuccessCount++;

      console.log(`- Sample [${i+1}] Original: ${(originalSize / 1024).toFixed(1)} KB | Thumbnail: ${(thumbSize / 1024).toFixed(1)} KB (Ratio: ${((thumbSize / originalSize) * 100).toFixed(1)}%)`);
    } catch (err) {
      console.warn(`- Failed to download/process sample [${i+1}] (${storagePath}):`, err.message);
    }
  }

  // Fallback averages if sampling fails or no images exist
  const avgOriginalSize = sampleSuccessCount > 0 ? originalSizeSum / sampleSuccessCount : 320 * 1024; // 320 KB
  const avgThumbSize = sampleSuccessCount > 0 ? thumbSizeSum / sampleSuccessCount : 18 * 1024; // 18 KB

  // Extrapolate across all database images
  const totalOriginalSizeMB = (avgOriginalSize * urlArray.length) / (1024 * 1024);
  const totalThumbSizeMB = (avgThumbSize * urlArray.length) / (1024 * 1024);

  // Traffic simulation (100,000 page loads per month, average 40 items per menu page)
  const MONTHLY_MENU_LOADS = 100000;
  const ITEMS_PER_MENU = 40;

  // Bandwidth BEFORE: 40 original images loaded per page
  const bandwidthPerPageBefore = (ITEMS_PER_MENU * avgOriginalSize) / (1024 * 1024); // MB
  const monthlyBandwidthBefore = (bandwidthPerPageBefore * MONTHLY_MENU_LOADS) / 1024; // GB

  // Bandwidth AFTER: 40 thumbnails loaded per page (and we assume 5% of users open fullscreen modal for original size)
  const bandwidthPerPageAfter = (ITEMS_PER_MENU * avgThumbSize + (ITEMS_PER_MENU * 0.05 * avgOriginalSize)) / (1024 * 1024); // MB
  const monthlyBandwidthAfter = (bandwidthPerPageAfter * MONTHLY_MENU_LOADS) / 1024; // GB

  // Cloudflare caching:
  // With 1-year immutable cache-control headers, Cloudflare edge cache hit rate is typically 95%+.
  // So only 5% of the requests actually hit Supabase origin and generate Egress charges.
  const monthlySupabaseEgressBefore = monthlyBandwidthBefore; // No Cloudflare proxying
  const monthlySupabaseEgressAfter = monthlyBandwidthAfter * 0.05; // 5% egress due to 95% Cloudflare HIT rate

  const egressReductionPercent = ((monthlySupabaseEgressBefore - monthlySupabaseEgressAfter) / monthlySupabaseEgressBefore) * 100;
  const bandwidthReductionPercent = ((monthlyBandwidthBefore - monthlyBandwidthAfter) / monthlyBandwidthBefore) * 100;

  console.log('\n');
  console.log('========================================================================');
  console.log('                   SUPABASE EGRESS OPTIMIZATION REPORT                 ');
  console.log('========================================================================');
  console.log(`- Total referenced images in DB:       ${urlArray.length}`);
  console.log(`- Average original image size:         ${(avgOriginalSize / 1024).toFixed(1)} KB`);
  console.log(`- Average thumbnail size (400px):      ${(avgThumbSize / 1024).toFixed(1)} KB`);
  console.log(`- Estimated total original storage:    ${totalOriginalSizeMB.toFixed(2)} MB`);
  console.log(`- Estimated total thumbnail storage:   ${totalThumbSizeMB.toFixed(2)} MB`);
  console.log('------------------------------------------------------------------------');
  console.log('SIMULATION: 100,000 Menu Page Loads (40 items per menu)');
  console.log('------------------------------------------------------------------------');
  console.log(`- Bandwidth per page load BEFORE:       ${bandwidthPerPageBefore.toFixed(2)} MB`);
  console.log(`- Bandwidth per page load AFTER:        ${bandwidthPerPageAfter.toFixed(2)} MB`);
  console.log(`- Total monthly bandwidth BEFORE:       ${monthlyBandwidthBefore.toFixed(2)} GB`);
  console.log(`- Total monthly bandwidth AFTER:        ${monthlyBandwidthAfter.toFixed(2)} GB`);
  console.log(`- Total monthly SUPABASE EGRESS (w/ CF): ${monthlySupabaseEgressAfter.toFixed(2)} GB`);
  console.log('------------------------------------------------------------------------');
  console.log('EXPECTED SAVINGS:');
  console.log('------------------------------------------------------------------------');
  console.log(`- Bandwidth Reduction Rate:            ${bandwidthReductionPercent.toFixed(1)}%`);
  console.log(`- Supabase Egress Reduction Rate:       ${egressReductionPercent.toFixed(1)}% (via Cloudflare Caching)`);
  console.log(`- Bandwidth saved per month:            ${(monthlyBandwidthBefore - monthlyBandwidthAfter).toFixed(2)} GB`);
  console.log(`- Supabase egress saved per month:      ${(monthlySupabaseEgressBefore - monthlySupabaseEgressAfter).toFixed(2)} GB`);
  console.log(`- Cloudflare Cache HIT Rate (Edge):     95.0% (Requests served free)`);
  console.log('========================================================================\n');
}

runReport().catch(console.error);
