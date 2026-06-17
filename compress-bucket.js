require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const BUCKET_NAME = 'menu-images';

async function listFiles(path = '') {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(path, { limit: 1000 });
    if (error) {
        console.error(`Error listing path ${path}:`, error);
        return [];
    }

    let files = [];
    for (const item of data) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        if (!item.id) { // It's a folder
            const subFiles = await listFiles(fullPath);
            files = files.concat(subFiles);
        } else {
            // It's a file
            if (item.name !== '.emptyFolderPlaceholder' && !item.name.endsWith('.json')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

async function main() {
    console.log('Fetching list of files...');
    const allFiles = await listFiles();
    console.log(`Found ${allFiles.length} files. Starting compression...`);

    let processed = 0;
    let savedBytes = 0;

    for (const filePath of allFiles) {
        const { data: fileData, error: downloadError } = await supabase.storage.from(BUCKET_NAME).download(filePath);
        if (downloadError) {
            console.error(`Failed to download ${filePath}:`, downloadError.message);
            continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const originalSize = buffer.length;

        // Skip files smaller than 100KB, they are already small enough
        if (originalSize < 100 * 1024) {
            continue;
        }

        try {
            console.log(`Processing ${filePath} (${Math.round(originalSize / 1024)} KB)...`);
            
            // Compress using sharp to WebP
            const compressedBuffer = await sharp(buffer)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: 70 })
                .toBuffer();

            const newSize = compressedBuffer.length;

            if (newSize < originalSize) {
                // Upload and replace
                const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, compressedBuffer, {
                    upsert: true,
                    contentType: 'image/webp',
                    cacheControl: '3600'
                });

                if (uploadError) {
                    console.error(`Failed to upload ${filePath}:`, uploadError.message);
                } else {
                    const saved = originalSize - newSize;
                    savedBytes += saved;
                    processed++;
                    console.log(`✅ Compressed ${filePath}: ${Math.round(originalSize / 1024)}KB -> ${Math.round(newSize / 1024)}KB`);
                }
            } else {
                console.log(`Skipped ${filePath} (compression didn't reduce size)`);
            }
        } catch (err) {
            console.error(`Error processing ${filePath}:`, err.message);
        }
    }

    console.log('\n--- SUMMARY ---');
    console.log(`Successfully compressed ${processed} images.`);
    console.log(`Total space saved: ${Math.round(savedBytes / 1024 / 1024 * 100) / 100} MB`);
}

main();
