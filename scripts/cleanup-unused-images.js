const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'menu-images';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: env vars missing.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function extractUuid(urlOrPath) {
  if (!urlOrPath) return null;
  const parts = urlOrPath.split('/');
  const lastPart = parts[parts.length - 1] || '';
  return lastPart.replace(/\.[^/.]+$/, '') || null;
}

async function getUsedUuids() {
  const usedUuids = new Set();
  console.log('Fetching used image URLs from database...');

  try {
    const { data: items } = await supabaseAdmin.from('items').select('image_url');
    (items || []).forEach(item => {
      const uuid = extractUuid(item.image_url);
      if (uuid) usedUuids.add(uuid);
    });
    console.log(`- Loaded image URLs from ${items.length} items.`);
  } catch (err) {
    console.warn('⚠️ Warning fetching items:', err.message);
  }

  try {
    const { data: categories } = await supabaseAdmin.from('categories').select('image_url');
    (categories || []).forEach(cat => {
      const uuid = extractUuid(cat.image_url);
      if (uuid) usedUuids.add(uuid);
    });
    console.log(`- Loaded image URLs from ${categories.length} categories.`);
  } catch (err) {
    console.warn('⚠️ Warning fetching categories:', err.message);
  }

  try {
    const { data: restaurants } = await supabaseAdmin.from('restaurants').select('logo_url, cover_url, cover_images');
    (restaurants || []).forEach(rest => {
      const logoUuid = extractUuid(rest.logo_url);
      if (logoUuid) usedUuids.add(logoUuid);

      const coverUuid = extractUuid(rest.cover_url);
      if (coverUuid) usedUuids.add(coverUuid);

      if (Array.isArray(rest.cover_images)) {
        rest.cover_images.forEach(img => {
          const u = extractUuid(img);
          if (u) usedUuids.add(u);
        });
      }
    });
    console.log(`- Loaded image URLs from ${restaurants.length} restaurants.`);
  } catch (err) {
    console.warn('⚠️ Warning fetching restaurants:', err.message);
  }

  try {
    const { data: employees } = await supabaseAdmin.from('hr_employees').select('profile_photo_url');
    if (employees) {
      employees.forEach(emp => {
        const uuid = extractUuid(emp.profile_photo_url);
        if (uuid) usedUuids.add(uuid);
      });
      console.log(`- Loaded image URLs from ${employees.length} employees.`);
    }
  } catch (err) {}

  return usedUuids;
}

async function listAllFiles(folder = '') {
  let allFiles = [];
  let hasMore = true;
  let offset = 0;
  const limit = 1000;

  while (hasMore) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`Error listing folder "${folder}":`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    const filesInFolder = [];
    const subFolderPromises = [];

    for (const item of data) {
      const itemPath = folder ? `${folder}/${item.name}` : item.name;
      
      // ONLY treat as directory if id is null
      if (item.id === null) {
        subFolderPromises.push(listAllFiles(itemPath));
      } else {
        filesInFolder.push({
          path: itemPath,
          name: item.name,
          size: item.metadata?.size || item.size || 0,
          updatedAt: item.updated_at
        });
      }
    }

    allFiles = allFiles.concat(filesInFolder);

    if (subFolderPromises.length > 0) {
      const subFolderResults = await Promise.all(subFolderPromises);
      for (const subFiles of subFolderResults) {
        allFiles = allFiles.concat(subFiles);
      }
    }

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allFiles;
}

async function runCleanup() {
  const execute = process.argv.includes('--execute');
  console.log(`Starting unused images cleanup script... ${execute ? '(EXECUTION MODE)' : '(DRY RUN MODE)'}`);

  const usedUuids = await getUsedUuids();
  console.log(`Found ${usedUuids.size} unique image UUIDs referenced in the database.`);

  console.log('Listing all files in storage bucket (including originals and thumbnails)...');
  const files = await listAllFiles();
  console.log(`Found ${files.length} total files in the bucket.`);

  const unusedFiles = [];
  let totalUnusedSize = 0;

  for (const file of files) {
    const fileUuid = extractUuid(file.path);
    
    if (!fileUuid || file.name === '.emptyFolderPlaceholder') {
      continue;
    }

    if (!usedUuids.has(fileUuid)) {
      unusedFiles.push(file);
      totalUnusedSize += file.size;
    }
  }

  console.log('\n======================================');
  console.log('Unused Images Report:');
  console.log(`Unused files count: ${unusedFiles.length} / ${files.length} total files`);
  console.log(`Total storage size occupied by unused files: ${(totalUnusedSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log('======================================\n');

  if (unusedFiles.length === 0) {
    console.log('No unused files found. Cleaning is not needed! 🎉');
    return;
  }

  if (!execute) {
    console.log('List of unused files (dry run):');
    unusedFiles.slice(0, 50).forEach(f => {
      console.log(`- [Unused] ${f.path} (${(f.size / 1024).toFixed(1)} KB)`);
    });
    if (unusedFiles.length > 50) {
      console.log(`... and ${unusedFiles.length - 50} more files.`);
    }
    console.log('\nTo delete these files, run this script with: node scripts/cleanup-unused-images.js --execute');
    return;
  }

  console.log(`Deleting ${unusedFiles.length} files from Supabase Storage...`);
  
  const chunkSize = 50;
  let deletedCount = 0;

  for (let i = 0; i < unusedFiles.length; i += chunkSize) {
    const chunk = unusedFiles.slice(i, i + chunkSize);
    const pathsToDelete = chunk.map(f => f.path);

    console.log(`Deleting chunk ${i / chunkSize + 1} (${pathsToDelete.length} files)...`);
    
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete);

    if (error) {
      console.error(`❌ Failed to delete chunk starting at index ${i}:`, error.message);
    } else {
      deletedCount += pathsToDelete.length;
      console.log(`    ✅ Successfully deleted ${pathsToDelete.length} files.`);
    }
  }

  console.log(`\nCleanup complete! Deleted ${deletedCount} unused files, freeing up ${(totalUnusedSize / (1024 * 1024)).toFixed(2)} MB of storage. 🎉`);
}

runCleanup().catch(console.error);
