import * as xlsx from 'xlsx';
import { supabase } from './supabase/client';

export const exportMenuToExcel = async (restaurantId: string, language: string) => {
    try {
        // Fetch categories with items
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (!cats) return false;

        const catIds = cats.map(c => c.id);
        const { data: items } = await supabase
            .from('items')
            .select('*')
            .in('category_id', catIds);

        // Map to rows
        const rows: any[] = [];
        cats.forEach(cat => {
            const catItems = items?.filter(i => i.category_id === cat.id) || [];
            if (catItems.length === 0) {
                // Export empty category just in case
                rows.push({
                    'Category AR': cat.name_ar,
                    'Category EN': cat.name_en || '',
                    'Emoji': cat.emoji || '',
                    'Item AR': '',
                    'Item EN': '',
                    'Description AR': '',
                    'Description EN': '',
                    'Sizes': '',
                    'Prices': '',
                    'Popular': '',
                    'Spicy': ''
                });
            } else {
                catItems.forEach(item => {
                    rows.push({
                        'Category AR': cat.name_ar,
                        'Category EN': cat.name_en || '',
                        'Emoji': cat.emoji || '',
                        'Item AR': item.title_ar,
                        'Item EN': item.title_en || '',
                        'Description AR': item.desc_ar || '',
                        'Description EN': item.desc_en || '',
                        'Sizes': (item.size_labels || []).join(','),
                        'Prices': (item.prices || []).join(','),
                        'Popular': item.is_popular ? 'Yes' : 'No',
                        'Spicy': item.is_spicy ? 'Yes' : 'No'
                    });
                });
            }
        });

        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Menu");

        // Write file and trigger download in browser
        xlsx.writeFile(wb, `Menu_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        return true;
    } catch (e) {
        console.error("Export error:", e);
        return false;
    }
};

export const importMenuFromExcel = async (restaurantId: string, file: File) => {
    return new Promise<{ success: boolean; message: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = xlsx.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet to JSON
                const rows = xlsx.utils.sheet_to_json<any>(worksheet);

                if (rows.length === 0) {
                    return resolve({ success: false, message: "File is empty." });
                }

                // First, fetch existing categories to avoid duplicates
                const { data: existingCats } = await supabase
                    .from('categories')
                    .select('id, name_ar')
                    .eq('restaurant_id', restaurantId);

                const catMap = new Map<string, string>();
                if (existingCats) {
                    existingCats.forEach(c => catMap.set(c.name_ar.trim(), c.id));
                }

                // Process categories
                for (const row of rows) {
                    const catAr = String(row['Category AR'] || '').trim();
                    if (!catAr) continue;

                    if (!catMap.has(catAr)) {
                        // Create new category
                        const { data: newCat } = await supabase.from('categories').insert({
                            restaurant_id: restaurantId,
                            name_ar: catAr,
                            name_en: String(row['Category EN'] || '').trim() || catAr,
                            emoji: String(row['Emoji'] || '').trim() || '🍽️'
                        }).select('id').single();

                        if (newCat) {
                            catMap.set(catAr, newCat.id);
                        }
                    }
                }

                // Process items
                const itemsToInsert = [];
                for (const row of rows) {
                    const catAr = String(row['Category AR'] || '').trim();
                    const itemAr = String(row['Item AR'] || '').trim();
                    if (!catAr || !itemAr) continue;

                    const catId = catMap.get(catAr);
                    if (!catId) continue;

                    const pricesStr = String(row['Prices'] || '0').split(',');
                    const sizesStr = String(row['Sizes'] || '').split(',');

                    const prices = pricesStr.map(p => parseFloat(p.trim()) || 0);
                    const size_labels = sizesStr.map(s => s.trim());

                    // Pad sizes array if smaller than prices array
                    while (size_labels.length < prices.length) {
                        size_labels.push(size_labels[0] || 'عادي');
                    }

                    itemsToInsert.push({
                        restaurant_id: restaurantId,
                        category_id: catId,
                        title_ar: itemAr,
                        title_en: String(row['Item EN'] || '').trim() || null,
                        desc_ar: String(row['Description AR'] || '').trim() || null,
                        desc_en: String(row['Description EN'] || '').trim() || null,
                        prices: prices,
                        size_labels: size_labels.slice(0, prices.length),
                        is_popular: String(row['Popular'] || '').toLowerCase() === 'yes' || String(row['Popular'] || '').toLowerCase() === 'نعم',
                        is_spicy: String(row['Spicy'] || '').toLowerCase() === 'yes' || String(row['Spicy'] || '').toLowerCase() === 'نعم',
                        is_available: true
                    });
                }

                if (itemsToInsert.length > 0) {
                    const { error } = await supabase.from('items').insert(itemsToInsert);
                    if (error) {
                        console.error("Batch insert items error:", error);
                        return resolve({ success: false, message: "Error saving items: " + error.message });
                    }
                }

                resolve({ success: true, message: `Successfully imported ${itemsToInsert.length} items.` });
            } catch (err: any) {
                console.error("Import exception:", err);
                resolve({ success: false, message: err.message || "Unknown error parsing Excel file." });
            }
        };
        reader.readAsArrayBuffer(file);
    });
};
