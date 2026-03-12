"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { calculateRecipeCost } from "@/lib/helpers/costService";
import {
    BookOpen, Plus, Search, Edit3, Trash2, X, Save, Package, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type InventoryItem = { id: string; name: string; unit: string; cost_per_unit: number; };
type MenuItem = { id: string; title_ar: string; title_en?: string; recipe_id?: string | null; };
type Ingredient = { id?: string; inventory_item_id: string; quantity: number; unit: string; name?: string; cost?: number; };
type Recipe = {
    id: string; product_name: string; inventory_item_id: string | null;
    product_cost: number; notes: string | null; created_at: string;
    recipe_ingredients?: Ingredient[];
};

export default function RecipesPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [productName, setProductName] = useState("");
    const [linkedInventoryId, setLinkedInventoryId] = useState("");
    const [linkedMenuItemId, setLinkedMenuItemId] = useState("");
    const [notes, setNotes] = useState("");
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);

    const fetchData = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        // Fetch recipes and inventory items
        const [{ data: r }, { data: inv }] = await Promise.all([
            supabase.from('recipes').select('*, recipe_ingredients(id, inventory_item_id, quantity, unit)').eq('restaurant_id', restaurantId).order('product_name'),
            supabase.from('inventory_items').select('id, name, unit, cost_per_unit').eq('restaurant_id', restaurantId).eq('is_active', true).order('name'),
        ]);
        // Fetch menu items (from categories)
        const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', restaurantId);
        const catIds = (cats || []).map((c: { id: string }) => c.id);
        let menuItemsData: MenuItem[] = [];
        if (catIds.length > 0) {
            const { data: mi } = await supabase.from('items').select('id, title_ar, title_en, recipe_id').in('category_id', catIds);
            menuItemsData = (mi as MenuItem[]) || [];
        }
        setRecipes((r as Recipe[]) || []);
        setInventoryItems((inv as InventoryItem[]) || []);
        setMenuItems(menuItemsData);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async () => {
        if (!restaurantId || !productName.trim()) return;
        const recipePayload = {
            restaurant_id: restaurantId,
            product_name: productName.trim(),
            inventory_item_id: linkedInventoryId || null,
            notes: notes || null,
            updated_at: new Date().toISOString()
        };

        let recipeId = editId;

        // If editing, unlink old menu item first
        if (editId) {
            await supabase.from('items').update({ recipe_id: null }).eq('recipe_id', editId);
            await supabase.from('recipes').update(recipePayload).eq('id', editId);
            await supabase.from('recipe_ingredients').delete().eq('recipe_id', editId);
        } else {
            const { data } = await supabase.from('recipes').insert(recipePayload).select('id').single();
            recipeId = data?.id || null;
        }

        if (recipeId) {
            // Save ingredients
            if (ingredients.length > 0) {
                const ingPayloads = ingredients.filter(i => i.inventory_item_id && i.quantity > 0).map(i => ({
                    recipe_id: recipeId!,
                    inventory_item_id: i.inventory_item_id,
                    quantity: i.quantity,
                    unit: i.unit,
                }));
                if (ingPayloads.length > 0) {
                    await supabase.from('recipe_ingredients').insert(ingPayloads);
                }
            }

            // Recalculate recipe cost
            await calculateRecipeCost(recipeId!);

            // Link to menu item (critical for cost calculation on orders)
            if (linkedMenuItemId) {
                await supabase.from('items').update({ recipe_id: recipeId }).eq('id', linkedMenuItemId);
            }
        }

        toast.success(editId ? (isAr ? "تم التحديث" : "Recipe updated") : (isAr ? "تمت الإضافة" : "Recipe created"));
        closeModal();
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isAr ? "هل أنت متأكد؟" : "Are you sure?")) return;
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
        await supabase.from('recipes').delete().eq('id', id);
        toast.success(isAr ? "تم الحذف" : "Deleted");
        fetchData();
    };

    const openEdit = (r: Recipe) => {
        setEditId(r.id);
        setProductName(r.product_name);
        setLinkedInventoryId(r.inventory_item_id || "");
        // Find linked menu item
        const linkedMi = menuItems.find(mi => mi.recipe_id === r.id);
        setLinkedMenuItemId(linkedMi?.id || "");
        setNotes(r.notes || "");
        setIngredients((r.recipe_ingredients || []).map(i => ({
            inventory_item_id: i.inventory_item_id, quantity: i.quantity, unit: i.unit
        })));
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false); setEditId(null); setProductName(""); setLinkedInventoryId("");
        setLinkedMenuItemId(""); setNotes(""); setIngredients([]);
    };

    const addIngredient = () => setIngredients([...ingredients, { inventory_item_id: "", quantity: 0, unit: "كيلو" }]);
    const removeIngredient = (idx: number) => setIngredients(ingredients.filter((_, i) => i !== idx));
    const updateIngredient = (idx: number, field: string, value: string | number) => {
        setIngredients(ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
    };

    const getIngredientCost = (inv_id: string, qty: number) => {
        const item = inventoryItems.find(i => i.id === inv_id);
        return item ? item.cost_per_unit * qty : 0;
    };

    const totalCost = ingredients.reduce((s, i) => s + getIngredientCost(i.inventory_item_id, i.quantity), 0);

    const filtered = recipes.filter(r => {
        if (!search) return true;
        return r.product_name.toLowerCase().includes(search.toLowerCase());
    });

    const displayUnit = (u: string) => {
        if (!isAr) return u;
        const unitMap: Record<string, string> = {
            'kg': 'كيلو', 'piece': 'وحدة', 'liter': 'لتر', 'pack': 'باكيت', 'gram': 'جرام', 'unit': 'وحدة', 'كيلو': 'كيلو', 'وحدة': 'وحدة', 'لتر': 'لتر', 'باكيت': 'باكيت', 'جرام': 'جرام', 'قطعة': 'قطعة'
        };
        return unitMap[u.toLowerCase()] || u;
    };

    if (loading && recipes.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <BookOpen className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                        {isAr ? "إدارة الوصفات" : "Recipe Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-lg mt-1">{isAr ? "إدارة وصفات المنتجات ومكوناتها" : "Manage product recipes and ingredients"}</p>
                </div>
                <button onClick={() => { closeModal(); setShowModal(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-purple-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                    <Plus className="w-5 h-5" /> {isAr ? "إضافة وصفة" : "Add Recipe"}
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث في الوصفات..." : "Search recipes..."}
                    className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none" />
            </div>

            {/* Recipes Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد وصفات" : "No recipes found"}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(recipe => {
                        const ingCount = recipe.recipe_ingredients?.length || 0;
                        return (
                            <motion.div key={recipe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50 p-5 group hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{recipe.product_name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1 flex items-center gap-1">
                                            <Package className="w-4 h-4" /> {ingCount} {isAr ? "مكون" : "ingredient"}{ingCount !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(recipe)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-emerald-400 hover:bg-indigo-50 dark:hover:bg-emerald-500/10 rounded-lg transition">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(recipe.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Ingredients list */}
                                {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-black/20 rounded-lg p-3 mb-3 space-y-1">
                                        {recipe.recipe_ingredients.map((ing, i) => {
                                            const invItem = inventoryItems.find(inv => inv.id === ing.inventory_item_id);
                                            return (
                                                <div key={i} className="flex justify-between text-base">
                                                    <span className="text-slate-600 dark:text-zinc-400">{invItem?.name || "Unknown"}</span>
                                                    <span className="font-bold text-slate-700 dark:text-zinc-300">{ing.quantity} {displayUnit(ing.unit)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Cost */}
                                <div className="flex items-center gap-2 text-base mt-2">
                                    <DollarSign className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{isAr ? "التكلفة:" : "Cost:"} {recipe.product_cost?.toFixed(2) || "0.00"}</span>
                                </div>
                                {recipe.notes && <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2 italic">{recipe.notes}</p>}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ===== ADD/EDIT RECIPE MODAL ===== */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{editId ? (isAr ? "تعديل الوصفة" : "Edit Recipe") : (isAr ? "وصفة جديدة" : "New Recipe")}</h2>
                                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "اسم المنتج" : "Product Name"} *</label>
                                    <input value={productName} onChange={e => setProductName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                {/* Link to Menu Item */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ربط بصنف في المنيو" : "Link to Menu Item"} *</label>
                                    <select value={linkedMenuItemId} onChange={e => setLinkedMenuItemId(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                        <option value="">{isAr ? "— اختر صنف من المنيو —" : "— Select menu item —"}</option>
                                        {menuItems.map(mi => (
                                            <option key={mi.id} value={mi.id}>{mi.title_ar}{mi.title_en ? ` (${mi.title_en})` : ''}{mi.recipe_id && mi.recipe_id !== editId ? ` ✓` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Link to Inventory Item (optional) */}
                                {inventoryItems.length > 0 && (
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ربط بصنف مخزون (اختياري)" : "Link to Inventory Item (optional)"}</label>
                                        <select value={linkedInventoryId} onChange={e => setLinkedInventoryId(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                            <option value="">{isAr ? "— بدون ربط —" : "— Not linked —"}</option>
                                            {inventoryItems.map(inv => (
                                                <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Ingredients */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400">{isAr ? "المكونات" : "Ingredients"}</label>
                                        <button onClick={addIngredient} className="text-xs font-bold text-indigo-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> {isAr ? "إضافة مكون" : "Add Ingredient"}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {ingredients.map((ing, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-black/20 rounded-xl p-3">
                                                <select value={ing.inventory_item_id} onChange={e => updateIngredient(idx, 'inventory_item_id', e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none appearance-none">
                                                    <option value="">{isAr ? "اختر مكون..." : "Select ingredient..."}</option>
                                                    {inventoryItems.map(inv => <option key={inv.id} value={inv.id}>{inv.name}</option>)}
                                                </select>
                                                <input type="number" step="0.01" value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="w-24 px-3 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none text-center" placeholder="Qty" />
                                                <select value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                                                    className="w-20 px-2 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none appearance-none">
                                                    {['كيلو', 'وحدة', 'لتر', 'باكيت', 'جرام', 'قطعة'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-16 text-center">{getIngredientCost(ing.inventory_item_id, ing.quantity).toFixed(2)}</span>
                                                <button onClick={() => removeIngredient(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {ingredients.length > 0 && (
                                        <div className="flex items-center justify-end gap-2 mt-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{isAr ? "إجمالي التكلفة:" : "Total Cost:"} {totalCost.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none resize-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={closeModal} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {editId ? (isAr ? "حفظ" : "Save") : (isAr ? "إنشاء" : "Create")}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
