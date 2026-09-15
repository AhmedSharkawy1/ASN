import JSZip from 'jszip';
import { supabase } from './supabase/client';
import { uploadImage, uploadImageWithThumb } from './uploadImage';
import { findBestMatch, calculateSimilarity, normalizeArabic } from './fuzzyMatch';
import { calculateSmartItemSimilarity } from './arabicLinguisticMatch';

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
 * Delete/clear all item and category images for a given restaurant.
 * Sets image_url and thumbnail_url to null.
 */
export async function deleteAllMenuImages(restaurantId: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
        const { data: cats, error: catsErr } = await supabase
            .from('categories')
            .select('id')
            .eq('restaurant_id', restaurantId);

        if (catsErr) throw catsErr;
        if (!cats || cats.length === 0) {
            return { success: true, message: 'لا توجد أقسام في هذا المنيو.', count: 0 };
        }

        const catIds = cats.map(c => c.id);

        // Clear images on items
        const { error: itemsErr, count: itemsCount } = await supabase
            .from('items')
            .update({ image_url: null, thumbnail_url: null }, { count: 'exact' })
            .in('category_id', catIds);

        if (itemsErr) throw itemsErr;

        // Clear images on categories
        const { error: catUpdateErr } = await supabase
            .from('categories')
            .update({ image_url: null, thumbnail_url: null })
            .eq('restaurant_id', restaurantId);

        if (catUpdateErr) throw catUpdateErr;

        return { 
            success: true, 
            message: `تم حذف وتفريغ صور جميع أصناف وأقسام هذا المنيو بنجاح.`, 
            count: itemsCount || 0 
        };
    } catch (err) {
        console.error('Delete all menu images error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `حدث خطأ أثناء حذف الصور: ${errMsg}`, count: 0 };
    }
}

export type SmartMatchItem = {
    id: string;
    fileName: string;
    fileCategoryName: string;
    fileItemName: string;
    blob: Blob;
    previewUrl: string;
    matchedCategoryId: string | null;
    matchedCategoryName: string | null;
    matchedItemId: string | null;
    matchedItemName: string | null;
    matchedItemCurrentImageUrl: string | null;
    isCover: boolean;
    score: number;
    categoryScore: number;
    status: 'confirmed' | 'uncertain' | 'no_match' | 'already_exists';
    confirmed: boolean;
};

export type AnalyzeOptions = {
    skipExistingImages?: boolean;
};

/**
 * Analyze images from a ZIP, folder, or file list.
 * Matches each image using Category__Item format with strict category scoping.
 * Returns matches with preview URLs for interactive user confirmation.
 */
export async function analyzeSmartImport(
    restaurantId: string,
    files: File | FileList | File[],
    onProgress?: (msg: string) => void,
    options?: AnalyzeOptions
): Promise<{ success: boolean; message?: string; matches: SmartMatchItem[]; alreadyExistsCount?: number }> {
    try {
        const skipExisting = options?.skipExistingImages !== false;
        onProgress?.('جاري قراءة وتجهيز الملفات...');

        const fileArray: File[] = files instanceof FileList
            ? Array.from(files)
            : Array.isArray(files) ? files : [files];

        if (fileArray.length === 0) {
            return { success: false, message: 'لم يتم اختيار أي ملفات.', matches: [] };
        }

        const imageEntries: { path: string; blob: Blob }[] = [];

        // Check if single zip
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
                    message: 'تعذر قراءة ملف ZIP. تأكد من سلامة الملف أو اختر مجلد الصور مباشرة.',
                    matches: [] 
                };
            }
        } else {
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
                        console.warn('Skipping zip entry:', f.name, e);
                    }
                } else if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(f.name)) {
                    const relativePath = f.webkitRelativePath || f.name;
                    imageEntries.push({ path: relativePath, blob: f });
                }
            }
        }

        if (imageEntries.length === 0) {
            return {
                success: false,
                message: 'لم يتم العثور على أي صور في الملفات المحددة.',
                matches: []
            };
        }

        onProgress?.(`تم العثور على ${imageEntries.length} صورة، جاري جلب بيانات المنيو...`);

        // Fetch categories & items
        const { data: cats, error: catsErr } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (catsErr || !cats || cats.length === 0) {
            return { success: false, message: 'لا توجد أقسام في المنيو. أضف الأقسام والأصناف أولاً.', matches: [] };
        }

        const catIds = cats.map(c => c.id);
        const { data: items, error: itemsErr } = await supabase
            .from('items')
            .select('*')
            .in('category_id', catIds);

        if (itemsErr || !items || items.length === 0) {
            return { success: false, message: 'لا توجد أصناف في المنيو. أضف الأصناف أولاً.', matches: [] };
        }

        const catById = new Map<string, typeof cats[0]>();
        const catList = cats.map(c => {
            catById.set(c.id, c);
            return {
                id: c.id,
                name: c.name_ar,
                normName: normalizeArabic(c.name_ar)
            };
        });

        // Helper: Category matching
        const matchCategoryByName = (rawCatName: string) => {
            const norm = normalizeArabic(rawCatName);
            if (!norm) return null;

            let bestCat: typeof catList[0] | null = null;
            let bestScore = 0;

            for (const cat of catList) {
                if (norm === cat.normName) {
                    return { category: cat, score: 1.0 };
                }

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

        const candidates = items.map((item: any) => {
            const cat = catById.get(item.category_id);
            return {
                id: item.id as string,
                name: item.title_ar as string,
                category_id: item.category_id as string,
                category_name: cat ? cat.name_ar : '',
                image_url: item.image_url || null
            };
        });

        const matchesResult: (SmartMatchItem | null)[] = new Array(imageEntries.length).fill(null);
        interface PendingItem {
            index: number;
            lastSegment: string;
            fileCategoryName: string;
            fileItemName: string;
            blob: Blob;
            previewUrl: string;
            matchedCategory: typeof catList[0];
            categoryScore: number;
        }
        const pendingItems: PendingItem[] = [];

        for (let i = 0; i < imageEntries.length; i++) {
            const { path: rawPath, blob } = imageEntries[i];
            onProgress?.(`جاري فحص وتصنيف الصور... (${i + 1}/${imageEntries.length})`);

            const normalizedPath = rawPath.replace(/\\/g, '/');
            const segments = normalizedPath.split('/').filter(s => s.trim().length > 0);
            const lastSegment = segments[segments.length - 1] || '';
            const baseName = lastSegment.replace(/\.[^/.]+$/, '').trim();

            let fileCategoryName = '';
            let fileItemName = '';

            if (baseName.includes('__')) {
                const parts = baseName.split('__');
                fileCategoryName = parts[0].trim();
                fileItemName = parts.slice(1).join('__').trim();
            } else if (segments.length >= 2) {
                const rawParent = segments[segments.length - 2].trim();
                const isGeneric = /^(menu_images|menu|images|photos|صور|الصور|اصناف|الأصناف|items)$/i.test(rawParent);
                if (!isGeneric) {
                    fileCategoryName = rawParent;
                }
                fileItemName = baseName;
            } else {
                fileItemName = baseName;
            }

            if (!fileItemName) continue;

            const previewUrl = URL.createObjectURL(blob);

            // Step 1: Match category
            let matchedCategory: typeof catList[0] | null = null;
            let categoryScore = 0;

            if (fileCategoryName) {
                const catMatch = matchCategoryByName(fileCategoryName);
                if (catMatch) {
                    matchedCategory = catMatch.category;
                    categoryScore = catMatch.score;
                }
            } else {
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

            // Check if Cover
            const isCover = fileItemName.toLowerCase() === 'cover';
            if (isCover) {
                if (matchedCategory) {
                    const currentCover = catById.get(matchedCategory.id)?.image_url;
                    if (skipExisting && currentCover) {
                        matchesResult[i] = {
                            id: `match-${i}`,
                            fileName: lastSegment,
                            fileCategoryName,
                            fileItemName,
                            blob,
                            previewUrl,
                            matchedCategoryId: matchedCategory.id,
                            matchedCategoryName: matchedCategory.name,
                            matchedItemId: null,
                            matchedItemName: 'صورة غلاف القسم',
                            matchedItemCurrentImageUrl: currentCover,
                            isCover: true,
                            score: 1.0,
                            categoryScore,
                            status: 'already_exists',
                            confirmed: false
                        };
                        continue;
                    }

                    const isHigh = categoryScore >= 0.75;
                    matchesResult[i] = {
                        id: `match-${i}`,
                        fileName: lastSegment,
                        fileCategoryName,
                        fileItemName,
                        blob,
                        previewUrl,
                        matchedCategoryId: matchedCategory.id,
                        matchedCategoryName: matchedCategory.name,
                        matchedItemId: null,
                        matchedItemName: 'صورة غلاف القسم',
                        matchedItemCurrentImageUrl: catById.get(matchedCategory.id)?.image_url || null,
                        isCover: true,
                        score: categoryScore,
                        categoryScore,
                        status: isHigh ? 'confirmed' : 'uncertain',
                        confirmed: isHigh
                    };
                } else {
                    matchesResult[i] = {
                        id: `match-${i}`,
                        fileName: lastSegment,
                        fileCategoryName,
                        fileItemName,
                        blob,
                        previewUrl,
                        matchedCategoryId: null,
                        matchedCategoryName: null,
                        matchedItemId: null,
                        matchedItemName: null,
                        matchedItemCurrentImageUrl: null,
                        isCover: true,
                        score: 0,
                        categoryScore: 0,
                        status: 'no_match',
                        confirmed: false
                    };
                }
                continue;
            }

            // If no category matched or recognized, DO NOT guess across random categories!
            if (!matchedCategory) {
                matchesResult[i] = {
                    id: `match-${i}`,
                    fileName: lastSegment,
                    fileCategoryName: fileCategoryName || 'غير محدد',
                    fileItemName,
                    blob,
                    previewUrl,
                    matchedCategoryId: null,
                    matchedCategoryName: null,
                    matchedItemId: null,
                    matchedItemName: null,
                    matchedItemCurrentImageUrl: null,
                    isCover: false,
                    score: 0,
                    categoryScore: 0,
                    status: 'no_match',
                    confirmed: false
                };
                continue;
            }

            // Valid candidate for linguistic item matching within category
            pendingItems.push({
                index: i,
                lastSegment,
                fileCategoryName,
                fileItemName,
                blob,
                previewUrl,
                matchedCategory,
                categoryScore
            });
        }

        // Step 2: Intelligent linguistic matching per category
        const pendingMap = new Map<number, PendingItem>();
        pendingItems.forEach(p => pendingMap.set(p.index, p));

        // Group pending items by category
        const categoryGroups = new Map<string, PendingItem[]>();
        for (const p of pendingItems) {
            const catId = p.matchedCategory.id;
            const list = categoryGroups.get(catId) || [];
            list.push(p);
            categoryGroups.set(catId, list);
        }

        // Process each category
        categoryGroups.forEach((catPending, catId) => {
            const catCandidates = candidates.filter(c => c.category_id === catId);

            interface ScorePair {
                itemIndex: number;
                candidate: typeof candidates[0];
                score: number;
            }
            const scorePairs: ScorePair[] = [];

            for (let pi = 0; pi < catPending.length; pi++) {
                const p = catPending[pi];
                for (let ci = 0; ci < catCandidates.length; ci++) {
                    const cand = catCandidates[ci];
                    const score = calculateSmartItemSimilarity(p.fileItemName, cand.name, p.matchedCategory.name);
                    // Only consider meaningful matches (>= 0.48)
                    if (score >= 0.48) {
                        scorePairs.push({ itemIndex: p.index, candidate: cand, score });
                    }
                }
            }

            // Sort matches descending by score so highest confidence matches claim items first!
            scorePairs.sort((a, b) => b.score - a.score);

            const assignedImageIndices = new Set<number>();
            const assignedCandidateIds = new Set<string>();

            for (let si = 0; si < scorePairs.length; si++) {
                const pair = scorePairs[si];
                if (assignedImageIndices.has(pair.itemIndex) || assignedCandidateIds.has(pair.candidate.id)) {
                    continue;
                }
                assignedImageIndices.add(pair.itemIndex);
                assignedCandidateIds.add(pair.candidate.id);

                const p = pendingMap.get(pair.itemIndex)!;
                const hasExistingImage = Boolean(pair.candidate.image_url);

                if (skipExisting && hasExistingImage) {
                    // Item already has a confirmed photo in the menu -> mark as already_exists to exclude from proposals
                    matchesResult[pair.itemIndex] = {
                        id: `match-${pair.itemIndex}`,
                        fileName: p.lastSegment,
                        fileCategoryName: p.fileCategoryName,
                        fileItemName: p.fileItemName,
                        blob: p.blob,
                        previewUrl: p.previewUrl,
                        matchedCategoryId: pair.candidate.category_id,
                        matchedCategoryName: pair.candidate.category_name,
                        matchedItemId: pair.candidate.id,
                        matchedItemName: pair.candidate.name,
                        matchedItemCurrentImageUrl: pair.candidate.image_url,
                        isCover: false,
                        score: pair.score,
                        categoryScore: p.categoryScore,
                        status: 'already_exists',
                        confirmed: false
                    };
                    continue;
                }

                const isHigh = p.categoryScore >= 0.75 && pair.score >= 0.82;

                matchesResult[pair.itemIndex] = {
                    id: `match-${pair.itemIndex}`,
                    fileName: p.lastSegment,
                    fileCategoryName: p.fileCategoryName,
                    fileItemName: p.fileItemName,
                    blob: p.blob,
                    previewUrl: p.previewUrl,
                    matchedCategoryId: pair.candidate.category_id,
                    matchedCategoryName: pair.candidate.category_name,
                    matchedItemId: pair.candidate.id,
                    matchedItemName: pair.candidate.name,
                    matchedItemCurrentImageUrl: pair.candidate.image_url,
                    isCover: false,
                    score: pair.score,
                    categoryScore: p.categoryScore,
                    status: isHigh ? 'confirmed' : 'uncertain',
                    confirmed: isHigh
                };
            }

            // Any remaining pending item with no match >= 0.48 is strictly marked as no_match!
            for (let pi = 0; pi < catPending.length; pi++) {
                const p = catPending[pi];
                if (!assignedImageIndices.has(p.index)) {
                    matchesResult[p.index] = {
                        id: `match-${p.index}`,
                        fileName: p.lastSegment,
                        fileCategoryName: p.fileCategoryName,
                        fileItemName: p.fileItemName,
                        blob: p.blob,
                        previewUrl: p.previewUrl,
                        matchedCategoryId: p.matchedCategory.id,
                        matchedCategoryName: p.matchedCategory.name,
                        matchedItemId: null,
                        matchedItemName: null,
                        matchedItemCurrentImageUrl: null,
                        isCover: false,
                        score: 0,
                        categoryScore: p.categoryScore,
                        status: 'no_match',
                        confirmed: false
                    };
                }
            }
        });

        const matches = matchesResult.filter((m): m is SmartMatchItem => m !== null);
        const alreadyExistsCount = matches.filter(m => m.status === 'already_exists').length;

        return {
            success: true,
            matches,
            alreadyExistsCount
        };
    } catch (err) {
        console.error('Analyze smart import error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `حدث خطأ أثناء فحص الصور:\n${errMsg}`, matches: [] };
    }
}

/**
 * Uploads only the items confirmed by the user in the review screen.
 */
export async function executeConfirmedImport(
    restaurantId: string,
    confirmedMatches: SmartMatchItem[],
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string; uploadedCount: number }> {
    try {
        const total = confirmedMatches.length;
        if (total === 0) {
            return { success: false, message: 'لم تقم بتأكيد أي صورة لرفعها.', uploadedCount: 0 };
        }

        let uploaded = 0;
        let failed = 0;
        const matchLog: string[] = [];

        for (let i = 0; i < total; i++) {
            const item = confirmedMatches[i];
            onProgress?.(`جاري رفع الصور وتحديث المنيو... (${i + 1}/${total})`);

            try {
                if (item.isCover && item.matchedCategoryId) {
                    const result = await uploadImageWithThumb(item.blob, `categories/${item.matchedCategoryId}`);
                    if (result) {
                        await supabase.from('categories')
                            .update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl })
                            .eq('id', item.matchedCategoryId);
                        matchLog.push(`🖼️ [غلاف قسم: ${item.matchedCategoryName}]`);
                        uploaded++;
                    } else {
                        failed++;
                    }
                } else if (item.matchedItemId) {
                    const result = await uploadImageWithThumb(item.blob, `items/${item.matchedItemId}`);
                    if (result) {
                        await supabase.from('items')
                            .update({ image_url: result.originalUrl, thumbnail_url: result.thumbUrl })
                            .eq('id', item.matchedItemId);
                        const pct = Math.round(item.score * 100);
                        matchLog.push(`✅ [${item.matchedCategoryName}] ${item.matchedItemName} (${pct}%)`);
                        uploaded++;
                    } else {
                        failed++;
                    }
                }
            } catch (err) {
                console.error(`Failed to upload ${item.fileName}:`, err);
                failed++;
            } finally {
                try {
                    URL.revokeObjectURL(item.previewUrl);
                } catch { /* ignore */ }
            }
        }

        const summary = `🎉 تم رفع وتحديث ${uploaded} صورة بنجاح` +
            (failed > 0 ? `\n❌ فشل رفع ${failed} صورة` : '') +
            (matchLog.length > 0 ? `\n\n📋 تفاصيل الصور المرفوعة:\n${matchLog.join('\n')}` : '');

        return {
            success: uploaded > 0,
            message: summary,
            uploadedCount: uploaded
        };
    } catch (err) {
        console.error('Execute confirmed import error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `حدث خطأ أثناء الرفع:\n${errMsg}`, uploadedCount: 0 };
    }
}

/**
 * Backward-compatible one-shot smart import function.
 */
export async function smartImportMenuImages(
    restaurantId: string,
    files: File | FileList | File[],
    onProgress?: (msg: string) => void
): Promise<{ success: boolean; message: string }> {
    const analysis = await analyzeSmartImport(restaurantId, files, onProgress);
    if (!analysis.success || analysis.matches.length === 0) {
        return { success: false, message: analysis.message || 'لم يتم العثور على صور لمطابقتها.' };
    }

    const confirmed = analysis.matches.filter(m => m.confirmed);
    if (confirmed.length === 0) {
        return {
            success: false,
            message: 'تم فحص الصور ولكن لم نجد تطابقاً مؤكداً بنسبة عالية. يمكنك استخدام شاشة المراجعة لتأكيد الصور يدوياً.'
        };
    }

    return await executeConfirmedImport(restaurantId, confirmed, onProgress);
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
