import JSZip from 'jszip';
import { supabase } from './supabase/client';
import { uploadImage, uploadImageWithThumb } from './uploadImage';
import { findBestMatch, calculateSimilarity, normalizeArabic } from './fuzzyMatch';

/**
 * Sanitize a string to be used as part of a filename.
 * Removes characters that are invalid in filenames.
 */
function sanitizeFileName(name: string): string {
    return name
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Export all menu images as a ZIP file.
 * Each image is named: "CategoryName__ItemName.ext"
 * Category cover images are named: "CategoryName__COVER.ext"
 * A manifest.json is included to map filenames back to IDs for re-import.
 */
export async function exportMenuImages(restaurantId: string, onProgress?: (msg: string) => void): Promise<boolean> {
    try {
        onProgress?.('جاري تحميل بيانات المنيو...');

        // Fetch categories
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true });

        if (!cats || cats.length === 0) {
            onProgress?.('لا توجد أقسام في المنيو');
            return false;
        }

        // Fetch all items
        const catIds = cats.map(c => c.id);
        const { data: items } = catIds.length > 0
            ? await supabase.from('items').select('*').in('category_id', catIds).order('sort_order', { ascending: true })
            : { data: [] };

        const zip = new JSZip();

        // Build manifest for re-import
        const manifest: {
            categories: { id: string; name_ar: string; name_en?: string; filename?: string }[];
            items: { id: string; category_id: string; category_name_ar: string; title_ar: string; title_en?: string; filename?: string }[];
        } = { categories: [], items: [] };

        let imageCount = 0;
        let downloadedCount = 0;

        // Count total images
        cats.forEach(cat => {
            if (cat.image_url) imageCount++;
        });
        (items || []).forEach(item => {
            if (item.image_url) imageCount++;
        });

        if (imageCount === 0) {
            onProgress?.('لا توجد صور في المنيو للتصدير');
            return false;
        }

        // Process category cover images
        for (const cat of cats) {
            const catName = sanitizeFileName(cat.name_ar);

            if (cat.image_url) {
                try {
                    onProgress?.(`جاري تحميل صورة قسم: ${cat.name_ar} (${downloadedCount + 1}/${imageCount})`);
                    let response = await fetch(cat.image_url);
                    let targetUrl = cat.image_url;
                    if (!response.ok && cat.thumbnail_url) {
                        response = await fetch(cat.thumbnail_url);
                        targetUrl = cat.thumbnail_url;
                    }
                    if (response.ok) {
                        const blob = await response.blob();
                        const ext = getExtFromUrl(targetUrl) || 'webp';
                        const filename = `${catName}__COVER.${ext}`;
                        zip.file(filename, blob);
                        manifest.categories.push({
                            id: cat.id,
                            name_ar: cat.name_ar,
                            name_en: cat.name_en || undefined,
                            filename
                        });
                        downloadedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to download category image: ${cat.name_ar}`, err);
                }
            } else {
                manifest.categories.push({
                    id: cat.id,
                    name_ar: cat.name_ar,
                    name_en: cat.name_en || undefined
                });
            }
        }

        // Process item images
        for (const item of (items || [])) {
            if (!item.image_url) continue;

            const cat = cats.find(c => c.id === item.category_id);
            if (!cat) continue;

            const catName = sanitizeFileName(cat.name_ar);
            const itemName = sanitizeFileName(item.title_ar);

            try {
                onProgress?.(`جاري تحميل صورة: ${item.title_ar} (${downloadedCount + 1}/${imageCount})`);
                let response = await fetch(item.image_url);
                let targetUrl = item.image_url;
                if (!response.ok && item.thumbnail_url) {
                    response = await fetch(item.thumbnail_url);
                    targetUrl = item.thumbnail_url;
                }
                if (response.ok) {
                    const blob = await response.blob();
                    const ext = getExtFromUrl(targetUrl) || 'webp';
                    const filename = `${catName}__${itemName}.${ext}`;
                    zip.file(filename, blob);
                    manifest.items.push({
                        id: item.id,
                        category_id: item.category_id,
                        category_name_ar: cat.name_ar,
                        title_ar: item.title_ar,
                        title_en: item.title_en || undefined,
                        filename
                    });
                    downloadedCount++;
                }
            } catch (err) {
                console.error(`Failed to download item image: ${item.title_ar}`, err);
            }
        }

        // Add manifest
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        onProgress?.('جاري ضغط الملفات...');

        // Generate and download
        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            onProgress?.(`جاري الضغط... ${Math.round(metadata.percent)}%`);
        });

        // Trigger download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Menu_Images_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        onProgress?.(`تم تصدير ${downloadedCount} صورة بنجاح ✅`);
        return true;
    } catch (err) {
        console.error('Export menu images error:', err);
        onProgress?.('حدث خطأ أثناء التصدير');
        return false;
    }
}

/**
 * Import menu images from a ZIP file.
 * Matches filenames to categories/items by name pattern: "CategoryName__ItemName.ext"
 * Also supports manifest.json for exact ID matching.
 */
export async function importMenuImages(
    restaurantId: string,
    file: File,
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
    try {
        onProgress?.('جاري قراءة ملف ZIP...');

        const zip = await JSZip.loadAsync(file);
        const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir);

        if (fileNames.length === 0) {
            return { success: false, message: 'ملف ZIP فارغ' };
        }

        // Try to load manifest
        let manifest: {
            categories?: { id: string; name_ar: string; filename?: string }[];
            items?: { id: string; category_id: string; category_name_ar: string; title_ar: string; filename?: string }[];
        } | null = null;

        const manifestFile = zip.file('manifest.json');
        if (manifestFile) {
            try {
                const manifestText = await manifestFile.async('text');
                manifest = JSON.parse(manifestText);
            } catch {
                console.warn('Failed to parse manifest.json, will use filename matching');
            }
        }

        // Fetch current categories and items
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (!cats || cats.length === 0) {
            return { success: false, message: 'لا توجد أقسام في المنيو. أضف الأقسام والأصناف أولاً ثم ارفع الصور.' };
        }

        const catIds = cats.map(c => c.id);
        const { data: items } = catIds.length > 0
            ? await supabase.from('items').select('*').in('category_id', catIds)
            : { data: [] };

        // Build lookup maps
        const catByName = new Map<string, typeof cats[0]>();
        const catById = new Map<string, typeof cats[0]>();
        cats.forEach(c => {
            catByName.set(sanitizeFileName(c.name_ar).toLowerCase(), c);
            catById.set(c.id, c);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemsByKey = new Map<string, any>();
        (items || []).forEach((item: any) => {
            const cat = catById.get(item.category_id);
            if (cat) {
                const key = `${sanitizeFileName(cat.name_ar).toLowerCase()}__${sanitizeFileName(item.title_ar).toLowerCase()}`;
                itemsByKey.set(key, item);
            }
        });

        // Also build by ID for manifest matching
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemById = new Map<string, any>();
        (items || []).forEach((item: any) => {
            itemById.set(item.id, item);
        });

        let uploaded = 0;
        let skipped = 0;
        let failed = 0;
        const imageFiles = fileNames.filter(name => 
            name !== 'manifest.json' && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)
        );

        const totalImages = imageFiles.length;

        for (const fileName of imageFiles) {
            const zipEntry = zip.file(fileName);
            if (!zipEntry) continue;

            onProgress?.(`جاري رفع الصور... (${uploaded + skipped + failed + 1}/${totalImages})`);

            try {
                const blob = await zipEntry.async('blob');
                // Parse filename: remove extension, split by '__'
                const baseName = fileName.replace(/\.[^/.]+$/, '');
                const parts = baseName.split('__');

                if (parts.length < 2) {
                    console.warn(`Skipping ${fileName}: invalid format (expected CategoryName__ItemName.ext)`);
                    skipped++;
                    continue;
                }

                const catPart = parts[0].trim().toLowerCase();
                const itemPart = parts[1].trim().toLowerCase();

                // Check if it's a category cover image
                if (itemPart === 'cover') {
                    // First try manifest match
                    let targetCat = null;
                    if (manifest?.categories) {
                        const manifestEntry = manifest.categories.find(mc => mc.filename === fileName);
                        if (manifestEntry) {
                            targetCat = catById.get(manifestEntry.id) || null;
                        }
                    }
                    // Fallback to name matching
                    if (!targetCat) {
                        targetCat = catByName.get(catPart) || null;
                    }

                    if (targetCat) {
                        const result = await uploadImageWithThumb(blob, `categories/${targetCat.id}`);
                        if (result) {
                            await supabase.from('categories').update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl }).eq('id', targetCat.id);
                            uploaded++;
                        } else {
                            failed++;
                        }
                    } else {
                        console.warn(`Category not found for cover: ${catPart}`);
                        skipped++;
                    }
                    continue;
                }

                // Item image
                let targetItem = null;

                // First try manifest match
                if (manifest?.items) {
                    const manifestEntry = manifest.items.find(mi => mi.filename === fileName);
                    if (manifestEntry) {
                        targetItem = itemById.get(manifestEntry.id) || null;
                    }
                }

                // Fallback to name matching
                if (!targetItem) {
                    const key = `${catPart}__${itemPart}`;
                    targetItem = itemsByKey.get(key) || null;
                }

                if (targetItem) {
                    const result = await uploadImageWithThumb(blob, `items/${targetItem.id}`);
                    if (result) {
                        await supabase.from('items').update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl }).eq('id', targetItem.id);
                        uploaded++;
                    } else {
                        failed++;
                    }
                } else {
                    console.warn(`Item not found for: ${catPart} -> ${itemPart}`);
                    skipped++;
                }
            } catch (err) {
                console.error(`Error processing ${fileName}:`, err);
                failed++;
            }
        }

        const message = `تم رفع ${uploaded} صورة بنجاح` +
            (skipped > 0 ? `\nتم تخطي ${skipped} صورة (لم يتم العثور على القسم/الصنف)` : '') +
            (failed > 0 ? `\nفشل رفع ${failed} صورة` : '');

        return { success: uploaded > 0, message };
    } catch (err) {
        console.error('Import menu images error:', err);
        return { success: false, message: 'حدث خطأ أثناء استيراد الصور' };
    }
}

/**
 * Smart import: use fuzzy name matching to assign images from a ZIP,
 * a folder (e.g. E:\Menu_Images), or loose image files to menu items
 * that do NOT already have an image.
 *
 * File naming and structure is completely flexible:
 *   - "E:\Menu_Images\بيتزا فراخ.jpg"          → searches ALL items
 *   - "E:\Menu_Images\بيتزا\فراخ.jpg"          → combines "بيتزا فراخ" and scopes to category "بيتزا"
 *   - "بيتزا__بيتزا فراخ.jpg"                  → searches items in category "بيتزا"
 *   - "بيتزا بالفراخ" vs "بيتزا فراخ"          → normalized prefix matching (ال, بال, وال)
 *
 * Only items with no image_url are considered as candidates.
 * Existing images are NEVER overwritten.
 */
export async function smartImportMenuImages(
    restaurantId: string,
    files: File | FileList | File[],
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
    try {
        onProgress?.('جاري تجهيز وقراءة الملفات...');

        const fileArray: File[] = files instanceof FileList
            ? Array.from(files)
            : Array.isArray(files) ? files : [files];

        if (fileArray.length === 0) {
            return { success: false, message: 'لم يتم اختيار أي ملفات.' };
        }

        // Normalise input into an array of { path, blob }
        const imageEntries: { path: string; blob: Blob }[] = [];

        // Check if the only file is a ZIP file
        const isZip = fileArray.length === 1 && (
            fileArray[0].name.toLowerCase().endsWith('.zip') ||
            fileArray[0].type === 'application/zip' ||
            fileArray[0].type === 'application/x-zip-compressed'
        );

        if (isZip) {
            onProgress?.('جاري فك ضغط ملف ZIP...');
            try {
                const zip = await JSZip.loadAsync(fileArray[0]);
                const zipNames = Object.keys(zip.files).filter(n => !zip.files[n].dir);
                const zipImages = zipNames.filter(n =>
                    n !== 'manifest.json' && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(n)
                );

                for (const zn of zipImages) {
                    const entry = zip.file(zn);
                    if (!entry) continue;
                    const blob = await entry.async('blob');
                    imageEntries.push({ path: zn, blob });
                }
            } catch (zipErr) {
                console.error('ZIP parse error:', zipErr);
                return { 
                    success: false, 
                    message: 'تعذر قراءة ملف ZIP. إذا كان لديك مجلد صور عادي، استخدم خيار "اختيار مجلد كامل (Folder)".' 
                };
            }
        } else {
            // Loose image files or folder files
            for (const f of fileArray) {
                if (f.name.toLowerCase().endsWith('.zip')) {
                    try {
                        const zip = await JSZip.loadAsync(f);
                        const zipNames = Object.keys(zip.files).filter(n => !zip.files[n].dir);
                        for (const zn of zipNames) {
                            if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(zn)) {
                                const entry = zip.file(zn);
                                if (entry) {
                                    const blob = await entry.async('blob');
                                    imageEntries.push({ path: zn, blob });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Skipping unreadable zip entry:', f.name, e);
                    }
                } else if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(f.name)) {
                    // Use webkitRelativePath if available (preserves folder structure), otherwise file.name
                    const relativePath = f.webkitRelativePath || f.name;
                    imageEntries.push({ path: relativePath, blob: f });
                }
            }
        }

        if (imageEntries.length === 0) {
            return { 
                success: false, 
                message: 'لم يتم العثور على أي صور في الملفات المحددة. تأكد أن المجلد أو الملف يحتوي على صور بصيغة (JPG, PNG, WebP).' 
            };
        }

        onProgress?.(`تم العثور على ${imageEntries.length} صورة، جاري تحميل بيانات المنيو...`);

        // Fetch current categories and items
        const { data: cats, error: catsErr } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (catsErr) {
            console.error('Fetch categories error:', catsErr);
            return { success: false, message: `خطأ في تحميل الأقسام: ${catsErr.message}` };
        }

        if (!cats || cats.length === 0) {
            return { success: false, message: 'لا توجد أقسام في المنيو. أضف الأقسام والأصناف أولاً ثم ارفع الصور.' };
        }

        const catIds = cats.map(c => c.id);
        const { data: items, error: itemsErr } = catIds.length > 0
            ? await supabase.from('items').select('*').in('category_id', catIds)
            : { data: [], error: null };

        if (itemsErr) {
            console.error('Fetch items error:', itemsErr);
            return { success: false, message: `خطأ في تحميل الأصناف: ${itemsErr.message}` };
        }

        // All items in the menu are candidates (including items that already have images)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allItems: any[] = items || [];
        if (allItems.length === 0) {
            return {
                success: false,
                message: 'لا توجد أصناف في المنيو. أضف الأصناف أولاً ثم ارفع الصور.'
            };
        }

        // Build category lookup and list with normalized names
        const catById = new Map<string, typeof cats[0]>();
        const catList = cats.map(c => {
            catById.set(c.id, c);
            return {
                id: c.id,
                name: c.name_ar,
                normName: normalizeArabic(c.name_ar)
            };
        });

        // Helper to find the best matching category from a raw category name
        const matchCategoryByName = (rawCatName: string) => {
            const norm = normalizeArabic(rawCatName);
            if (!norm) return null;

            let bestCat: typeof catList[0] | null = null;
            let bestScore = 0;

            for (const cat of catList) {
                // Exact match
                if (norm === cat.normName) {
                    return { category: cat, score: 1.0 };
                }

                // Containment
                let containScore = 0;
                if (norm.includes(cat.normName) || cat.normName.includes(norm)) {
                    const shorter = norm.length < cat.normName.length ? norm : cat.normName;
                    const longer  = norm.length < cat.normName.length ? cat.normName : norm;
                    containScore = Math.max(0.70, shorter.length / longer.length);
                }

                const simScore = calculateSimilarity(norm, cat.normName);
                const score = Math.max(containScore, simScore);

                if (score > bestScore) {
                    bestScore = score;
                    bestCat = cat;
                }
            }

            const MIN_CAT_THRESHOLD = 0.35;
            if (bestCat && bestScore >= MIN_CAT_THRESHOLD) {
                return { category: bestCat, score: bestScore };
            }
            return null;
        };

        // Build candidates list for fuzzy matching
        const candidates = allItems.map(item => {
            const cat = catById.get(item.category_id);
            return {
                id: item.id as string,
                name: item.title_ar as string,
                category_id: item.category_id as string,
                category_name: cat ? cat.name_ar : '',
                hasExistingImage: Boolean(item.image_url && String(item.image_url).trim() !== '')
            };
        });

        const totalImages = imageEntries.length;
        let uploaded = 0;
        let skipped = 0;
        let failed = 0;
        const matchLog: string[] = [];

        // Track which items already got an image in this run to avoid duplicate assignments
        const assignedItemIds = new Set<string>();

        for (let i = 0; i < imageEntries.length; i++) {
            const { path: rawPath, blob } = imageEntries[i];

            onProgress?.(`جاري فحص ومطابقة الصور... (${i + 1}/${totalImages})`);

            try {
                // Normalize slashes
                const normalizedPath = rawPath.replace(/\\/g, '/');
                const segments = normalizedPath.split('/').filter(s => s.trim().length > 0);
                const lastSegment = segments[segments.length - 1] || '';
                const baseName = lastSegment.replace(/\.[^/.]+$/, '').trim();

                let fileCategoryName = '';
                let fileItemName = '';

                // Primary rule: Category__Item format (e.g. "إضافات البيتزا__إضافات فراخ.jpg")
                if (baseName.includes('__')) {
                    const parts = baseName.split('__');
                    fileCategoryName = parts[0].trim();
                    fileItemName = parts.slice(1).join('__').trim();
                } else if (segments.length >= 2) {
                    // Check if image is inside a category folder: Folder/Category/Item.ext
                    const rawParent = segments[segments.length - 2].trim();
                    const isGeneric = /^(menu_images|menu|images|photos|صور|الصور|اصناف|الأصناف|items)$/i.test(rawParent);
                    if (!isGeneric) {
                        fileCategoryName = rawParent;
                    }
                    fileItemName = baseName;
                } else {
                    fileItemName = baseName;
                }

                if (!fileItemName) {
                    skipped++;
                    continue;
                }

                // ---- STEP 1: RESOLVE CATEGORY ----
                let matchedCategory: typeof catList[0] | null = null;
                let categoryScore = 0;

                if (fileCategoryName) {
                    const catMatch = matchCategoryByName(fileCategoryName);
                    if (catMatch) {
                        matchedCategory = catMatch.category;
                        categoryScore = catMatch.score;
                    }
                } else {
                    // If no explicit category before '__', check if category name is embedded in fileItemName
                    const sortedCats = [...catList].sort((a, b) => b.normName.length - a.normName.length);
                    const normItem = normalizeArabic(fileItemName);
                    for (const cat of sortedCats) {
                        const tokens = normItem.split(/\s+/);
                        if (
                            tokens.includes(cat.normName) ||
                            normItem.startsWith(cat.normName + ' ') ||
                            normItem.includes(' ' + cat.normName + ' ') ||
                            normItem.endsWith(' ' + cat.normName) ||
                            normItem === cat.normName
                        ) {
                            matchedCategory = cat;
                            categoryScore = 0.8;
                            break;
                        }
                        if (cat.normName.length >= 3 && normItem.includes(cat.normName)) {
                            matchedCategory = cat;
                            categoryScore = 0.6;
                            break;
                        }
                    }
                }

                // If a category was specified in the file name but doesn't exist in the menu, skip to prevent false matches
                if (fileCategoryName && !matchedCategory) {
                    matchLog.push(`⏭️ [${fileCategoryName}] ${fileItemName} ← لم نجد قسماً مطابقاً لـ "${fileCategoryName}" في المنيو`);
                    skipped++;
                    continue;
                }

                // Handle Category Cover image (e.g. "CategoryName__COVER.jpg")
                if (fileItemName.toLowerCase() === 'cover' && matchedCategory) {
                    const result = await uploadImageWithThumb(blob, `categories/${matchedCategory.id}`);
                    if (result) {
                        await supabase.from('categories')
                            .update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl })
                            .eq('id', matchedCategory.id);
                        matchLog.push(`🖼️ [قسم: ${matchedCategory.name}] (تم تحديث صورة الغلاف)`);
                        uploaded++;
                    } else {
                        matchLog.push(`❌ فشل رفع صورة غلاف قسم [${matchedCategory.name}]`);
                        failed++;
                    }
                    continue;
                }

                // ---- STEP 2: SCOPE CANDIDATES BY CATEGORY ----
                const availableCandidates = candidates.filter(c => !assignedItemIds.has(c.id));
                if (availableCandidates.length === 0) {
                    matchLog.push(`ℹ️ تم الانتهاء من جميع أصناف المنيو.`);
                    break;
                }

                let candidatePool: typeof candidates = [];
                if (matchedCategory) {
                    // Strict category isolation: Only match items within the same category!
                    candidatePool = availableCandidates.filter(c => c.category_id === matchedCategory.id);
                    if (candidatePool.length === 0) {
                        matchLog.push(`⏭️ [${matchedCategory.name}] ${fileItemName} ← لا توجد أصناف متبقية في هذا القسم`);
                        skipped++;
                        continue;
                    }
                } else {
                    // If no category was indicated, search across all items
                    candidatePool = availableCandidates;
                }

                // ---- STEP 3: MATCH ITEM WITHIN CATEGORY ----
                // Prepare variant of item name with category words removed (e.g. "إضافات فراخ" -> "فراخ")
                let itemNameWithoutCat = fileItemName;
                if (matchedCategory) {
                    const catWords = normalizeArabic(matchedCategory.name).split(/\s+/);
                    const words = fileItemName.split(/\s+/).filter(w => {
                        const nw = normalizeArabic(w);
                        return !catWords.includes(nw);
                    });
                    if (words.length > 0) {
                        itemNameWithoutCat = words.join(' ');
                    }
                }

                let bestCandidate: typeof candidates[0] | null = null;
                let bestScore = 0;

                for (const candidate of candidatePool) {
                    const s1 = calculateSimilarity(fileItemName, candidate.name);
                    const s2 = itemNameWithoutCat !== fileItemName ? calculateSimilarity(itemNameWithoutCat, candidate.name) : 0;
                    const s3 = calculateSimilarity(fileItemName, `${candidate.category_name} ${candidate.name}`);
                    const s4 = fileCategoryName ? calculateSimilarity(`${fileCategoryName} ${fileItemName}`, `${candidate.category_name} ${candidate.name}`) : 0;
                    const s5 = fileCategoryName ? calculateSimilarity(`${fileCategoryName} ${fileItemName}`, candidate.name) : 0;
                    const s6 = itemNameWithoutCat !== fileItemName ? calculateSimilarity(`${candidate.category_name} ${itemNameWithoutCat}`, `${candidate.category_name} ${candidate.name}`) : 0;

                    let score = Math.max(s1, s2, s3, s4, s5, s6);

                    // Category affinity bonus
                    if (matchedCategory && candidate.category_id === matchedCategory.id) {
                        score = Math.min(1.0, score + 0.10);
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestCandidate = candidate;
                    }
                }

                const MIN_ITEM_THRESHOLD = 0.35;
                if (!bestCandidate || bestScore < MIN_ITEM_THRESHOLD) {
                    matchLog.push(`⏭️ [${matchedCategory ? matchedCategory.name : 'عام'}] ${fileItemName} ← لم نجد صنفاً مشابهاً`);
                    skipped++;
                    continue;
                }

                // Upload image and update item image
                const result = await uploadImageWithThumb(blob, `items/${bestCandidate.id}`);
                if (result) {
                    await supabase.from('items')
                        .update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl })
                        .eq('id', bestCandidate.id);

                    assignedItemIds.add(bestCandidate.id);
                    const pct = Math.round(bestScore * 100);
                    const actionLabel = bestCandidate.hasExistingImage ? 'استبدال' : 'جديد';
                    matchLog.push(`✅ [${bestCandidate.category_name}] ${bestCandidate.name} ⟵ ${baseName} (${actionLabel} ${pct}%)`);
                    uploaded++;
                } else {
                    matchLog.push(`❌ [${bestCandidate.category_name}] ${bestCandidate.name} ➜ فشل رفع الصورة للسيرفر`);
                    failed++;
                }
            } catch (err) {
                console.error(`Error processing ${rawPath}:`, err);
                const errMsg = err instanceof Error ? err.message : 'خطأ غير معروف';
                matchLog.push(`❌ ${rawPath} ➜ خطأ: ${errMsg}`);
                failed++;
            }
        }

        const summary = `🎉 تم رفع وتحديث ${uploaded} صورة بنجاح` +
            (skipped > 0 ? `\n⏭️ تم تخطي ${skipped} صورة (لم نجد قسماً/صنفاً مطابقاً)` : '') +
            (failed > 0 ? `\n❌ فشل رفع ${failed} صورة` : '') +
            (matchLog.length > 0 ? `\n\n📋 تفاصيل المطابقة حسب القسم والصنف:\n${matchLog.join('\n')}` : '');

        return { success: uploaded > 0, message: summary };
    } catch (err) {
        console.error('Smart import menu images error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `حدث خطأ أثناء الاستيراد الذكي:\n${errMsg}` };
    }
}

/**
 * Extract file extension from URL
 */
function getExtFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const ext = pathname.split('.').pop()?.toLowerCase();
        if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            return ext;
        }
    } catch { /* ignore */ }
    return 'webp';
}
