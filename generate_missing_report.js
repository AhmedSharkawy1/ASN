require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET_NAME = 'menu-images';

function extractUuid(urlOrPath) {
    if (!urlOrPath) return null;
    const parts = urlOrPath.split('/');
    const lastPart = parts[parts.length - 1] || '';
    return lastPart.replace(/\.[^/.]+$/, '') || null;
}

async function listAllFiles(folder = '') {
    let allFiles = new Set();
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
        if (error) break;
        if (!data || data.length === 0) break;

        const subFolderPromises = [];
        for (const item of data) {
            const itemPath = folder ? `${folder}/${item.name}` : item.name;
            if (item.id === null) {
                subFolderPromises.push(listAllFiles(itemPath));
            } else {
                const uuid = extractUuid(item.name);
                if (uuid) allFiles.add(uuid);
            }
        }

        if (subFolderPromises.length > 0) {
            const subFolderResults = await Promise.all(subFolderPromises);
            for (const subFiles of subFolderResults) {
                for (const file of subFiles) allFiles.add(file);
            }
        }

        if (data.length < limit) hasMore = false;
        else offset += limit;
    }
    return allFiles;
}

async function fetchAll(table, columns) {
    let allData = [];
    let hasMore = true;
    let start = 0;
    const step = 999;
    
    while (hasMore) {
        const { data, error } = await supabase.from(table).select(columns).range(start, start + step);
        if (error) {
            console.error(`Error fetching ${table}:`, error.message);
            break;
        }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < step + 1) hasMore = false;
        else start += step + 1;
    }
    return allData;
}

async function generateReport() {
    console.log('Fetching files from storage...');
    const existingUuids = await listAllFiles();
    console.log(`Found ${existingUuids.size} images remaining in storage.`);

    console.log('Fetching data from database...');
    const restaurants = await fetchAll('restaurants', 'id, name, logo_url, cover_url, cover_images');
    const categories = await fetchAll('categories', 'id, name_ar, name_en, image_url, restaurant_id');
    const items = await fetchAll('items', 'id, title_ar, title_en, image_url, category_id');

    const restMap = {};
    restaurants.forEach(r => restMap[r.id] = r.name);
    
    const catMap = {};
    categories.forEach(c => catMap[c.id] = { name: c.name_ar || c.name_en, restaurant_id: c.restaurant_id });

    let reportLines = [];
    reportLines.push('# تقرير بالصور المفقودة للمطاعم\n');

    let missingLogos = 0;
    let missingCovers = 0;
    let missingCategories = 0;
    let missingItems = 0;

    const missingByRestaurant = {};

    function addMissing(restId, type, name) {
        if (!missingByRestaurant[restId]) missingByRestaurant[restId] = { name: restMap[restId] || 'Unknown', items: [] };
        missingByRestaurant[restId].items.push(`- **${type}**: ${name}`);
    }

    restaurants.forEach(r => {
        const logo = extractUuid(r.logo_url);
        if (logo && !existingUuids.has(logo)) {
            addMissing(r.id, 'لوجو المطعم', r.name);
            missingLogos++;
        }
        const cover = extractUuid(r.cover_url);
        if (cover && !existingUuids.has(cover)) {
            addMissing(r.id, 'غلاف المطعم', r.name);
            missingCovers++;
        }
        if (r.cover_images) {
            r.cover_images.forEach(img => {
                const coverImg = extractUuid(img);
                if (coverImg && !existingUuids.has(coverImg)) {
                    addMissing(r.id, 'صورة غلاف إضافية', r.name);
                    missingCovers++;
                }
            });
        }
    });

    categories.forEach(c => {
        const img = extractUuid(c.image_url);
        if (img && !existingUuids.has(img)) {
            addMissing(c.restaurant_id, 'قسم (Category)', c.name_ar || c.name_en);
            missingCategories++;
        }
    });

    items.forEach(i => {
        const img = extractUuid(i.image_url);
        if (img && !existingUuids.has(img)) {
            const cat = catMap[i.category_id];
            const restId = cat ? cat.restaurant_id : null;
            const catName = cat ? cat.name : 'Unknown';
            addMissing(restId, 'صنف (Item)', `${i.title_ar || i.title_en} (قسم: ${catName})`);
            missingItems++;
        }
    });

    reportLines.push(`## إحصائيات الفقد:`);
    reportLines.push(`- عدد اللوجوهات المفقودة: ${missingLogos}`);
    reportLines.push(`- عدد الأغلفة المفقودة: ${missingCovers}`);
    reportLines.push(`- عدد صور الأقسام المفقودة: ${missingCategories}`);
    reportLines.push(`- عدد صور الأصناف المفقودة: ${missingItems}\n`);

    Object.values(missingByRestaurant).forEach(rest => {
        reportLines.push(`### مطعم: ${rest.name}`);
        rest.items.forEach(line => reportLines.push(line));
        reportLines.push('');
    });

    fs.writeFileSync('C:\\Users\\20111\\.gemini\\antigravity\\brain\\f2b1a3e3-ec7d-4e58-b00e-71fa5b1a8ee6\\missing_images_report.md', reportLines.join('\n'));
    console.log(`\nReport generated.`);
    console.log(`Missing items: ${missingItems}, categories: ${missingCategories}, covers: ${missingCovers}, logos: ${missingLogos}`);
}

generateReport().catch(console.error);
