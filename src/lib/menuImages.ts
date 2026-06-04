import JSZip from 'jszip';
import { supabase } from './supabase/client';
import { uploadImage } from './uploadImage';

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
                    const response = await fetch(cat.image_url);
                    if (response.ok) {
                        const blob = await response.blob();
                        const ext = getExtFromUrl(cat.image_url) || 'webp';
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
                const response = await fetch(item.image_url);
                if (response.ok) {
                    const blob = await response.blob();
                    const ext = getExtFromUrl(item.image_url) || 'webp';
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
                        const imageUrl = await uploadImage(blob, `categories/${targetCat.id}`);
                        if (imageUrl) {
                            await supabase.from('categories').update({ image_url: imageUrl }).eq('id', targetCat.id);
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
                    const imageUrl = await uploadImage(blob, `items/${targetItem.id}`);
                    if (imageUrl) {
                        await supabase.from('items').update({ image_url: imageUrl }).eq('id', targetItem.id);
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
