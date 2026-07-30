import * as xlsx from 'xlsx';
import { supabase } from './supabase/client';

export const exportMenuToExcel = async (restaurantId: string) => {
    try {
        // Fetch categories with items
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true });

        if (!cats) return false;

        const catIds = cats.map(c => c.id);
        const { data: items } = await supabase
            .from('items')
            .select('*')
            .in('category_id', catIds)
            .order('sort_order', { ascending: true });

        // Map to rows
        const rows: Record<string, string | number>[] = [];
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
                    'Spicy': '',
                    'Sold By Weight': '',
                    'الوحدة': ''
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
                        'Spicy': item.is_spicy ? 'Yes' : 'No',
                        'Sold By Weight': item.sell_by_weight ? 'Yes' : 'No',
                        'الوحدة': item.weight_unit || 'كجم'
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

export const downloadEmptyMenuTemplate = () => {
    try {
        const rows = [
            {
                'Category AR': 'البيتزا',
                'Category EN': 'Pizza',
                'Emoji': '🍕',
                'Item AR': 'بيتزا مارجريتا',
                'Item EN': 'Margherita Pizza',
                'Description AR': 'بيتزا بالجبنة والصلصة',
                'Description EN': 'Cheese and tomato sauce pizza',
                'Sizes': 'صغير,وسط,كبير',
                'Prices': '50,100,150',
                'Popular': 'نعم',
                'Spicy': 'لا',
                'Sold By Weight': 'لا',
                'الوحدة': 'قطعة',
                'Recipe Ingredients': 'دقيق:0.2:kg, جبنة موتزاريلا:0.1:kg',
                'Cost': '25'
            }
        ];

        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Menu Template");

        xlsx.writeFile(wb, `Empty_Menu_Template.xlsx`);
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
                const rows = xlsx.utils.sheet_to_json<Record<string, string | number>>(worksheet);

                if (rows.length === 0) {
                    return resolve({ success: false, message: "File is empty." });
                }

                let itemsCreated = 0;
                let itemsUpdated = 0;
                let recipesCreated = 0;
                let materialsCreated = 0;

                // The first database error, kept so a failed import can say what
                // actually went wrong. Reporting "check your columns" when the
                // columns are fine and the real cause was a permission denial
                // sends people looking in the wrong place.
                let firstDbError = '';
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const noteError = (where: string, e: any) => {
                    console.error(`[import] ${where}:`, e);
                    if (!firstDbError && e) {
                        firstDbError = `${where}: ${e.message || e.code || String(e)}`;
                    }
                };

                // A row is keyed by whichever name it actually has. An
                // English-only sheet leaves every Arabic cell blank, and keying
                // on Arabic alone silently skipped every row of it.
                const nameKey = (ar: string, en: string) => (ar || en).trim().toLowerCase();

                // 1. Fetch existing categories to avoid duplicates
                const { data: existingCats } = await supabase
                    .from('categories')
                    .select('id, name_ar, name_en')
                    .eq('restaurant_id', restaurantId);

                const catMap = new Map<string, string>();
                if (existingCats) {
                    existingCats.forEach(c => {
                        // Register under both names so a sheet written in either
                        // language still matches the category already on file.
                        if (c.name_ar) catMap.set(c.name_ar.trim().toLowerCase(), c.id);
                        if (c.name_en) catMap.set(c.name_en.trim().toLowerCase(), c.id);
                    });
                }

                // 1b. Fetch the items already on the menu, so re-uploading the
                // same file updates them instead of creating a second copy of
                // every dish. Keyed by category + name, registered under both
                // language columns so a sheet in either language still matches.
                const catIdsForLookup = existingCats?.map(c => c.id) ?? [];
                type ExistingItem = { id: string; recipe_id: string | null };
                const itemMap = new Map<string, ExistingItem>();

                if (catIdsForLookup.length > 0) {
                    const { data: existingItems } = await supabase
                        .from('items')
                        .select('id, category_id, title_ar, title_en, recipe_id')
                        .in('category_id', catIdsForLookup);

                    existingItems?.forEach(i => {
                        const rec = { id: i.id, recipe_id: i.recipe_id };
                        if (i.title_ar) itemMap.set(`${i.category_id}::${i.title_ar.trim().toLowerCase()}`, rec);
                        if (i.title_en) itemMap.set(`${i.category_id}::${i.title_en.trim().toLowerCase()}`, rec);
                    });
                }

                // 2. Fetch existing inventory items to avoid duplicating materials
                const { data: existingInv } = await supabase
                    .from('inventory_items')
                    .select('id, name, unit')
                    .eq('restaurant_id', restaurantId);

                // Map lowercase names to ID and Unit for quick lookup
                const invMap = new Map<string, { id: string, unit: string }>();
                if (existingInv) {
                    existingInv.forEach(i => invMap.set(i.name.trim().toLowerCase(), { id: i.id, unit: i.unit || 'كيلو' }));
                }

                let catOrderCounter = 1;
                const processedCats = new Set<string>();

                // Process categories
                for (const row of rows) {
                    const catAr = String(row['Category AR'] || '').trim();
                    const catEn = String(row['Category EN'] || '').trim();
                    const catKey = nameKey(catAr, catEn);
                    if (!catKey) continue;

                    if (!processedCats.has(catKey)) {
                        processedCats.add(catKey);

                        if (!catMap.has(catKey)) {
                            const { data: newCat, error: catError } = await supabase.from('categories').insert({
                                restaurant_id: restaurantId,
                                // Each column falls back to the other, so a sheet
                                // filled in one language still produces a complete
                                // row rather than a NOT NULL violation.
                                name_ar: catAr || catEn,
                                name_en: catEn || catAr,
                                emoji: String(row['Emoji'] || '').trim() || '🍽️',
                                sort_order: catOrderCounter++
                            }).select('id').single();

                            if (newCat) {
                                catMap.set(catKey, newCat.id);
                            } else if (catError) {
                                noteError(`create category "${catAr || catEn}"`, catError);
                            }
                        } else {
                            // Existing category: refresh what the sheet supplies
                            // and keep the file's ordering. image_url and
                            // thumbnail_url are deliberately not listed, so the
                            // category artwork survives a re-upload.
                            const catUpdate: Record<string, string | number> = {
                                sort_order: catOrderCounter++,
                            };
                            if (catAr) catUpdate.name_ar = catAr;
                            if (catEn) catUpdate.name_en = catEn;
                            const emoji = String(row['Emoji'] || '').trim();
                            if (emoji) catUpdate.emoji = emoji;

                            await supabase.from('categories')
                                .update(catUpdate)
                                .eq('id', catMap.get(catKey));
                        }
                    }
                }

                let itemOrderCounter = 1;

                // Process items sequentially to handle relational linking reliably
                for (const row of rows) {
                    const catAr = String(row['Category AR'] || '').trim();
                    const catEn = String(row['Category EN'] || '').trim();
                    const itemAr = String(row['Item AR'] || '').trim();
                    const itemEn = String(row['Item EN'] || '').trim();

                    const catKey = nameKey(catAr, catEn);
                    // Whichever name the sheet supplies is the one used for the
                    // recipe/inventory records generated below.
                    const itemName = itemAr || itemEn;
                    if (!catKey || !itemName) continue;

                    const catId = catMap.get(catKey);
                    if (!catId) continue;

                    // Is this dish already on the menu? Registered under both
                    // language columns, so an Arabic sheet matches an item that
                    // was originally created from an English one and vice versa.
                    const existing =
                        itemMap.get(`${catId}::${itemName.trim().toLowerCase()}`) ??
                        (itemEn ? itemMap.get(`${catId}::${itemEn.trim().toLowerCase()}`) : undefined);

                    const pricesStr = String(row['Prices'] || '0').split(',');
                    const sizesStr = String(row['Sizes'] || '').split(',');
                    const prices = pricesStr.map(p => parseFloat(p.trim()) || 0);
                    const size_labels = sizesStr.map(s => s.trim());
                    while (size_labels.length < prices.length) size_labels.push(size_labels[0] || 'عادي');

                    // Advanced: Cost and Recipe Ingredients
                    const costStr = String(row['Cost'] || '0').trim();
                    const baseCost = parseFloat(costStr) || 0;
                    const recipeIngredientsStr = String(row['Recipe Ingredients'] || row['مقادير الوصفة'] || '').trim();
                    
                    let inventoryItemId = null;
                    let recipeId = null;

                    // Only build the inventory tree for a dish that does not
                    // already have one. Without this, every re-upload would
                    // create another copy of the recipe and its raw materials.
                    if (recipeIngredientsStr && !existing?.recipe_id) {
                        try {
                            // Format expected: "زبدة:0.5:kg, سكر:0.4:kg"
                            const ingredientsList = recipeIngredientsStr.split(',').map(s => s.trim()).filter(Boolean);
                            
                            if (ingredientsList.length > 0) {
                                // 1. Create a Final Product Inventory Item
                                const { data: finalInv } = await supabase.from('inventory_items').insert({
                                    restaurant_id: restaurantId,
                                    name: `${itemName} (جاهز)`,
                                    quantity: 0,
                                    unit: 'كيلو', // Default to kg for bulk recipes, pieces or kg
                                    item_type: 'product',
                                    cost_per_unit: 0 // Auto-calculated later by costService if needed
                                }).select('id').single();
                                
                                if (finalInv) {
                                    inventoryItemId = finalInv.id;
                                    
                                    // 2. Create the Recipe
                                    const { data: recipe } = await supabase.from('recipes').insert({
                                        restaurant_id: restaurantId,
                                        product_name: `وصفة ${itemName}`,
                                        inventory_item_id: inventoryItemId,
                                        product_cost: baseCost
                                    }).select('id').single();

                                    if (recipe) {
                                        recipeId = recipe.id;
                                        recipesCreated++;
                                        const recipeIngredientsToInsert = [];

                                        // 3. Process Ingredients
                                        for (const ingStr of ingredientsList) {
                                            // Split by colon "Name:Qty:Unit" -> "زبدة:0.5:kg"
                                            const parts = ingStr.split(':').map(p => p.trim());
                                            if (parts.length >= 2) {
                                                const ingName = parts[0];
                                                const ingQty = parseFloat(parts[1]) || 0;
                                                const ingUnit = parts[2] || 'كيلو';
                                                
                                                let targetInvId = null;
                                                const searchKey = ingName.toLowerCase();

                                                if (invMap.has(searchKey)) {
                                                    targetInvId = invMap.get(searchKey)!.id;
                                                } else {
                                                    // Auto-create raw material
                                                    const { data: newMat } = await supabase.from('inventory_items').insert({
                                                        restaurant_id: restaurantId,
                                                        name: ingName,
                                                        quantity: 0,
                                                        unit: ingUnit,
                                                        item_type: 'raw_material',
                                                        cost_per_unit: 0
                                                    }).select('id').single();

                                                    if (newMat) {
                                                        targetInvId = newMat.id;
                                                        invMap.set(searchKey, { id: newMat.id, unit: ingUnit });
                                                        materialsCreated++;
                                                    }
                                                }

                                                if (targetInvId) {
                                                    recipeIngredientsToInsert.push({
                                                        recipe_id: recipeId,
                                                        inventory_item_id: targetInvId,
                                                        quantity: ingQty,
                                                        unit: ingUnit
                                                    });
                                                }
                                            }
                                        }

                                        // 4. Link ingredients to recipe
                                        if (recipeIngredientsToInsert.length > 0) {
                                            await supabase.from('recipe_ingredients').insert(recipeIngredientsToInsert);
                                            
                                            // Recalculate Recipe Cost async
                                            // (Requires invoking the costService, but we skip direct import here 
                                            // to keep excel.ts independent, we can let UI recalculate or do a simple fetch)
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.error(`Error processing recipe for ${itemName}:`, err);
                            // We swallow the error and insert the item without a recipe if it fails
                        }
                    }

                    // Everything the sheet is allowed to set. Note what is NOT
                    // here: image_url and thumbnail_url. Leaving them out of the
                    // update payload is what keeps the artwork after re-uploading
                    // a corrected menu — the sheet has no image columns, so
                    // including them would blank every photo.
                    const itemFields = {
                        // Dropped by accident when this object was extracted from
                        // the insert call to be shared with the update path. The
                        // row then failed its NOT NULL constraint — and, before
                        // that surfaced, failed the RLS check too, because the
                        // items policy resolves the tenant through category_id
                        // and a null one can match no category.
                        category_id: catId,
                        // Same fallback as the category: an English-only sheet
                        // still yields a usable title_ar, and every theme reads
                        // `title_en || title_ar`, so an English-only menu shows
                        // English in both language modes.
                        title_ar: itemAr || itemEn,
                        // Only title_ar falls back, because it is the column the
                        // themes read when nothing else is set. Leaving title_en
                        // null for an Arabic-only sheet keeps "this item has no
                        // English name" distinguishable from "its English name
                        // happens to be Arabic text" on the next export.
                        title_en: itemEn || null,
                        desc_ar: String(row['Description AR'] || '').trim() || null,
                        desc_en: String(row['Description EN'] || '').trim() || null,
                        price: prices[0] || 0,
                        prices: prices,
                        size_labels: size_labels.slice(0, prices.length),
                        is_popular: String(row['Popular'] || '').toLowerCase() === 'yes' || String(row['Popular'] || '').toLowerCase() === 'نعم',
                        is_spicy: String(row['Spicy'] || '').toLowerCase() === 'yes' || String(row['Spicy'] || '').toLowerCase() === 'نعم',
                        sell_by_weight: String(row['Sold By Weight'] || '').toLowerCase() === 'yes' || String(row['Sold By Weight'] || '').toLowerCase() === 'نعم',
                        weight_unit: String(row['الوحدة'] || 'كجم').trim() || null,
                        sort_order: itemOrderCounter++
                    };

                    if (existing) {
                        // is_available is left alone on purpose: an owner who
                        // hid a dish should not have it silently switched back
                        // on by re-uploading the price list.
                        const update: Record<string, unknown> = { ...itemFields };
                        if (recipeId) update.recipe_id = recipeId;
                        if (inventoryItemId) update.inventory_item_id = inventoryItemId;

                        const { error: updateError } = await supabase
                            .from('items').update(update).eq('id', existing.id);

                        if (!updateError) itemsUpdated++;
                        else noteError(`update item "${itemName}"`, updateError);
                    } else {
                        const { data: created, error: itemError } = await supabase
                            .from('items')
                            .insert({
                                ...itemFields,
                                is_available: true,
                                inventory_item_id: inventoryItemId,
                                recipe_id: recipeId,
                            })
                            .select('id')
                            .single();

                        if (!itemError) {
                            itemsCreated++;
                            // Register it, so a file listing the same dish twice
                            // updates the second time instead of inserting again.
                            if (created) {
                                const rec = { id: created.id, recipe_id: recipeId };
                                itemMap.set(`${catId}::${itemName.trim().toLowerCase()}`, rec);
                                if (itemEn) itemMap.set(`${catId}::${itemEn.trim().toLowerCase()}`, rec);
                            }
                        } else {
                            noteError(`insert item "${itemName}"`, itemError);
                        }
                    }
                }

                // Reporting success after importing nothing is what made the
                // English-only failure so hard to place: the file looked fine,
                // the upload said it worked, and no items appeared.
                if (itemsCreated + itemsUpdated === 0) {
                    // A database error means the file was fine and the write was
                    // refused — almost always a permissions problem. Say that,
                    // instead of sending the user to re-check correct columns.
                    if (firstDbError) {
                        return resolve({
                            success: false,
                            message:
                                `الملف سليم، لكن قاعدة البيانات رفضت الحفظ.\n\n${firstDbError}\n\n` +
                                `لو الرسالة تذكر "row-level security" فهذه مشكلة صلاحيات وليست مشكلة في الملف.`,
                        });
                    }

                    const headers = Object.keys(rows[0] || {}).join(' | ');
                    return resolve({
                        success: false,
                        message:
                            `لم يتم رفع أي صنف. تأكد أن الملف يحتوي على عمود اسم القسم ` +
                            `(Category AR أو Category EN) وعمود اسم الصنف (Item AR أو Item EN) ` +
                            `وأن الصفوف غير فارغة.\n\nالأعمدة الموجودة في الملف: ${headers}`,
                    });
                }

                const parts = [];
                if (itemsCreated) parts.push(`تمت إضافة ${itemsCreated} صنف جديد`);
                if (itemsUpdated) parts.push(`تم تحديث ${itemsUpdated} صنف موجود (مع الحفاظ على الصور)`);
                if (recipesCreated) parts.push(`تم إنشاء ${recipesCreated} وصفة و ${materialsCreated} خامة`);

                resolve({ success: true, message: parts.join('، ') + '.' });
            } catch (err: unknown) {
                console.error("Import exception:", err);
                const msg = err instanceof Error ? err.message : "Unknown error parsing Excel file.";
                resolve({ success: false, message: msg });
            }
        };
        reader.readAsArrayBuffer(file);
    });
};
