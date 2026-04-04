"use client";
/* eslint-disable @next/next/no-img-element */

import { useLanguage } from "@/lib/context/LanguageContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/uploadImage";
import { Plus, Trash2, Edit2, Image as ImageIcon, Utensils, Star, Upload, X, Save, ChevronDown, ChevronUp, Download, FileSpreadsheet, RefreshCw, Loader2, FileDown } from "lucide-react";
import { exportMenuToExcel, importMenuFromExcel, downloadEmptyMenuTemplate } from "@/lib/excel";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
    id: string;
    category_id: string;
    title_ar: string;
    title_en?: string;
    desc_ar?: string;
    desc_en?: string;
    prices: number[];
    size_labels: string[];
    is_popular: boolean;
    is_spicy: boolean;
    image_url?: string;
    is_available: boolean;
    sell_by_weight: boolean;
    weight_unit?: string;
};

type Category = {
    id: string;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_url?: string;
    items: Item[];
};

export default function MenuBuilderPage() {
    const { language } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);
    const [previewKey, setPreviewKey] = useState(0);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editingCat, setEditingCat] = useState<string | null>(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [addingItemToCat, setAddingItemToCat] = useState<string | null>(null);
    const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
    const [deletingItemObj, setDeletingItemObj] = useState<{ catId: string, itemId: string } | null>(null);

    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const impersonatingTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;
                let { data: restaurant } = await supabase
                    .from('restaurants').select('id').eq(impersonatingTenant ? 'id' : 'email', impersonatingTenant || user.email).single();

                if (!restaurant && !impersonatingTenant) {
                    const { data: newRest } = await supabase
                        .from('restaurants').insert({ email: user.email, name: "My Restaurant" }).select('id').single();
                    restaurant = newRest;
                }

                if (restaurant) {
                    setRestaurantId(restaurant.id);
                    const { data: catsData } = await supabase
                        .from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order', { ascending: true });

                    if (catsData) {
                        const catIds = catsData.map(c => c.id);
                        const { data: itemsData } = catIds.length > 0
                            ? await supabase.from('items').select('*').in('category_id', catIds)
                            : { data: [] };

                        setCategories(catsData.map(cat => ({
                            id: cat.id, name_ar: cat.name_ar, name_en: cat.name_en,
                            emoji: cat.emoji, image_url: cat.image_url,
                            items: itemsData ? itemsData.filter(i => i.category_id === cat.id) : []
                        })));
                    }
                }
            } catch (error) { console.error("Error fetching menu:", error); }
            finally { setLoading(false); }
        };
        fetchMenuData();
    }, []);

    const toggleCollapse = (catId: string) => {
        setCollapsedCats(prev => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId); else next.add(catId);
            return next;
        });
    };

    const confirmDeleteCategory = async () => {
        if (!deletingCatId) return;
        await supabase.from('categories').delete().eq('id', deletingCatId);
        setCategories(categories.filter(c => c.id !== deletingCatId));
        setDeletingCatId(null);
    };

    const confirmDeleteItem = async () => {
        if (!deletingItemObj) return;
        await supabase.from('items').delete().eq('id', deletingItemObj.itemId);
        setCategories(categories.map(c => c.id === deletingItemObj.catId ? { ...c, items: c.items.filter(i => i.id !== deletingItemObj.itemId) } : c));
        setDeletingItemObj(null);
    };

    const handleDeleteCategory = (catId: string) => setDeletingCatId(catId);
    const handleDeleteItem = (catId: string, itemId: string) => setDeletingItemObj({ catId, itemId });

    const updateCategory = async (catId: string, updates: Partial<Category>) => {
        await supabase.from('categories').update(updates).eq('id', catId);
        setCategories(categories.map(c => c.id === catId ? { ...c, ...updates } : c));
    };

    const updateItem = async (catId: string, itemId: string, updates: Partial<Item>) => {
        await supabase.from('items').update(updates).eq('id', itemId);
        setCategories(categories.map(c => c.id === catId
            ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
            : c
        ));
    };

    const handleItemImageUpload = async (catId: string, itemId: string, file: File) => {
        const url = await uploadImage(file, `items/${itemId}`);
        if (url) await updateItem(catId, itemId, { image_url: url });
    };

    const handleCatImageUpload = async (catId: string, file: File) => {
        const url = await uploadImage(file, `categories/${catId}`);
        if (url) await updateCategory(catId, { image_url: url });
    };

    if (loading) return <div className="p-8 text-center text-silver animate-pulse">{language === "ar" ? "جاري تحميل المنيو..." : "Loading Menu Builder..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Main Menu Builder */}
            <div className="col-span-12 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-glass-border pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
                        {language === "ar" ? "صانع المنيو الذكي" : "Smart Menu Builder"}
                    </h1>
                    <p className="text-silver mb-4 md:mb-0">
                        {language === "ar" ? "أضف وعدّل الأقسام والأصناف والأسعار والصور بحرية كاملة." : "Add and edit categories, items, prices, and images with full control."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadEmptyMenuTemplate}
                        className="flex items-center gap-2 px-4 py-3 bg-glass-dark border border-dashed border-glass-border text-foreground font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm">
                        <FileDown className="w-5 h-5 text-blue" />
                        {language === "ar" ? "تحميل نموذج" : "Download Template"}
                    </button>
                    <button
                        onClick={async () => {
                            if (!restaurantId) return;
                            setIsExporting(true);
                            await exportMenuToExcel(restaurantId);
                            setIsExporting(false);
                        }}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-3 bg-glass-dark border border-glass-border text-foreground font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95 text-sm">
                        {isExporting ? <span className="animate-spin text-lg">⏳</span> : <Download className="w-5 h-5 text-blue" />}
                        {language === "ar" ? "تصدير" : "Export Excel"}
                    </button>
                    <label className="flex items-center gap-2 px-4 py-3 bg-glass-dark border border-glass-border text-foreground font-bold rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-95 text-sm">
                        {isImporting ? <span className="animate-spin text-lg">⏳</span> : <FileSpreadsheet className="w-5 h-5 text-emerald-500" />}
                        {language === "ar" ? "استيراد" : "Import Excel"}
                        <input type="file" accept=".xlsx,.xls" className="hidden" disabled={isImporting} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !restaurantId) return;
                            setIsImporting(true);
                            const res = await importMenuFromExcel(restaurantId, file);
                            alert(res.message);
                            if (res.success) window.location.reload();
                            setIsImporting(false);
                        }} />
                    </label>
                    <button onClick={() => { setShowAddCategory(true); setEditingCat(null); setEditingItem(null); setAddingItemToCat(null); }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue to-cyan-500 text-slate-900 dark:text-white font-bold rounded-xl shadow-[0_0_15px_rgba(46,163,255,0.4)] hover:shadow-[0_0_25px_rgba(46,163,255,0.6)] transition-all active:scale-95 text-sm sm:text-base">
                        <Plus className="w-5 h-5" />
                        {language === "ar" ? "إضافة قسم جديد" : "Add Category"}
                    </button>
                </div>
            </div>

            {/* ========= ADD CATEGORY PANEL ========= */}
            <AnimatePresence>
                {showAddCategory && restaurantId && (
                    <AddCategoryPanel
                        restaurantId={restaurantId}
                        language={language}
                        onCreated={(newCat) => { setCategories([...categories, { ...newCat, items: [] }]); setShowAddCategory(false); }}
                        onCancel={() => setShowAddCategory(false)}
                    />
                )}
            </AnimatePresence>

            {categories.length === 0 && !showAddCategory ? (
                <div className="flex flex-col items-center justify-center p-16 border border-dashed border-glass-border rounded-3xl bg-glass-dark text-center">
                    <Utensils className="w-16 h-16 text-silver/30 mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                        {language === "ar" ? "المنيو فارغ تماماً" : "Your Menu is Empty"}
                    </h3>
                    <p className="text-silver w-full max-w-xl">
                        {language === "ar" ? "اضغط على زر 'إضافة قسم جديد' بالأعلى لتبدأ." : "Click 'Add New Category' above to start."}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {categories.map((cat) => {
                        const isCollapsed = collapsedCats.has(cat.id);
                        return (
                            <div key={cat.id} className="bg-white dark:bg-card border border-glass-border rounded-2xl overflow-hidden shadow-sm">
                                {/* CATEGORY HEADER */}
                                <div className="bg-slate-50 dark:bg-glass-dark px-6 py-4 border-b border-glass-border">
                                    {editingCat === cat.id ? (
                                        <CategoryEditor cat={cat} language={language}
                                            onUpdate={(u) => updateCategory(cat.id, u)}
                                            onImageUpload={(f) => handleCatImageUpload(cat.id, f)}
                                            onClose={() => setEditingCat(null)} />
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleCollapse(cat.id)}>
                                                {cat.image_url ? (
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-glass-border flex-shrink-0">
                                                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-xl shadow-inner">
                                                        {cat.emoji || "🍽️"}
                                                    </div>
                                                )}
                                                <div>
                                                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                                        {cat.name_ar}
                                                        <span className="text-silver text-sm font-normal">({cat.items.length})</span>
                                                        {isCollapsed ? <ChevronDown className="w-5 h-5 text-silver" /> : <ChevronUp className="w-5 h-5 text-silver" />}
                                                    </h2>
                                                    {cat.name_en && cat.name_en !== cat.name_ar && <span className="text-sm text-silver">{cat.name_en}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => { setEditingCat(cat.id); setEditingItem(null); }} className="p-2 text-blue hover:bg-blue/10 rounded-lg transition-colors"><Edit2 className="w-5 h-5" /></button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ITEMS */}
                                <AnimatePresence>
                                    {!isCollapsed && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                            className="overflow-hidden">
                                            <div className="p-4 md:p-6 flex flex-col gap-4">
                                                {cat.items.length === 0 && addingItemToCat !== cat.id && (
                                                    <div className="text-center py-4 text-silver/60 text-base">{language === "ar" ? "لا توجد أصناف بعد." : "No items yet."}</div>
                                                )}

                                                {cat.items.map((item) => (
                                                    <div key={item.id} className="group rounded-2xl border border-glass-border bg-slate-50/50 dark:bg-card p-4 hover:border-blue/30 transition-colors">
                                                        {editingItem === item.id ? (
                                                            <ItemEditor item={item} language={language}
                                                                onUpdate={(u) => updateItem(cat.id, item.id, u)}
                                                                onImageUpload={(f) => handleItemImageUpload(cat.id, item.id, f)}
                                                                onClose={() => setEditingItem(null)} />
                                                        ) : (
                                                            <ItemRow item={item} language={language}
                                                                onEdit={() => { setEditingItem(item.id); setEditingCat(null); setAddingItemToCat(null); }}
                                                                onDelete={() => handleDeleteItem(cat.id, item.id)} />
                                                        )}
                                                    </div>
                                                ))}

                                                {/* ADD ITEM PANEL */}
                                                <AnimatePresence>
                                                    {addingItemToCat === cat.id && (
                                                        <AddItemPanel catId={cat.id} language={language}
                                                            onCreated={(newItem) => {
                                                                setCategories(categories.map(c => c.id === cat.id ? { ...c, items: [...c.items, newItem] } : c));
                                                                setAddingItemToCat(null);
                                                            }}
                                                            onCancel={() => setAddingItemToCat(null)} />
                                                    )}
                                                </AnimatePresence>

                                                <button onClick={() => { setAddingItemToCat(cat.id); setEditingItem(null); setEditingCat(null); setShowAddCategory(false); }}
                                                    className="mt-2 w-full py-3 rounded-xl border-2 border-dashed border-silver/30 text-silver font-medium flex items-center justify-center gap-2 hover:border-blue/50 hover:text-blue hover:bg-blue/5 transition-colors active:scale-[0.98]">
                                                    <Plus className="w-5 h-5" />
                                                    {language === "ar" ? "إضافة صنف جديد" : "Add New Item"}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DELETE CONFIRMATION MODALS */}
            {deletingCatId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-300 dark:bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-card rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-6 text-foreground">{language === "ar" ? "هل أنت متأكد من حذف هذا القسم وكل أصنافه؟" : "Are you sure you want to delete this category and all its items?"}</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={confirmDeleteCategory} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">
                                {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                            </button>
                            <button onClick={() => setDeletingCatId(null)} className="px-6 py-2.5 rounded-xl bg-gray-200 dark:bg-secondary text-gray-700 dark:text-gray-300 font-bold hover:opacity-80 transition-opacity">
                                {language === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {deletingItemObj && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-300 dark:bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-card rounded-3xl shadow-2xl p-6 w-full max-w-lg text-center">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-6 text-foreground">{language === "ar" ? "هل أنت متأكد من حذف هذا الصنف؟" : "Are you sure you want to delete this item?"}</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={confirmDeleteItem} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors">
                                {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                            </button>
                            <button onClick={() => setDeletingItemObj(null)} className="px-6 py-2.5 rounded-xl bg-gray-200 dark:bg-secondary text-gray-700 dark:text-gray-300 font-bold hover:opacity-80 transition-opacity">
                                {language === "ar" ? "إلغاء" : "Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>

        </div>
    );
}

// ===================== ADD CATEGORY PANEL =====================
function AddCategoryPanel({ restaurantId, language, onCreated, onCancel }: {
    restaurantId: string; language: string;
    onCreated: (cat: Category) => void;
    onCancel: () => void;
}) {
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [emoji, setEmoji] = useState('🍽️');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleSave = async () => {
        if (!nameAr.trim()) return;
        setSaving(true);
        try {
            const { data } = await supabase
                .from('categories')
                .insert({ restaurant_id: restaurantId, name_ar: nameAr, name_en: nameEn || nameAr, emoji })
                .select().single();
            if (data) {
                let imgUrl = null;
                if (imageFile) {
                    imgUrl = await uploadImage(imageFile, `categories/${data.id}`);
                    if (imgUrl) await supabase.from('categories').update({ image_url: imgUrl }).eq('id', data.id);
                }
                onCreated({ ...data, image_url: imgUrl, items: [] });
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-white dark:bg-card border-2 border-blue/30 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-blue/5 px-6 py-4 border-b border-blue/20 flex items-center justify-between">
                <h3 className="font-bold text-blue text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {language === "ar" ? "إضافة قسم جديد" : "Add New Category"}
                </h3>
                <button onClick={onCancel} className="p-2 text-silver hover:text-red-500 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "اسم القسم (عربي) *" : "Name (Arabic) *"}</label>
                        <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={language === "ar" ? "مثال: البيتزا" : "e.g. Pizza"}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "اسم القسم (إنجليزي)" : "Name (English)"}</label>
                        <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="e.g. Pizza" dir="ltr"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "الإيموجي" : "Emoji"}</label>
                        <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none text-base text-center font-bold text-2xl" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue/10 text-blue font-bold text-base rounded-xl hover:bg-blue/20 transition-colors">
                        <Upload className="w-5 h-5" /> {language === "ar" ? "رفع صورة غلاف" : "Upload Cover"}
                    </button>
                    {imagePreview && <img src={imagePreview} alt="" className="w-14 h-14 rounded-xl object-cover border border-glass-border" />}
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-glass-border">
                    <button onClick={handleSave} disabled={saving || !nameAr.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue to-cyan-500 text-slate-900 dark:text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95">
                        <Save className="w-4 h-4" />
                        {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ القسم" : "Save Category")}
                    </button>
                    <button onClick={onCancel} className="px-4 py-3 text-silver font-bold text-sm hover:text-foreground transition">{language === "ar" ? "إلغاء" : "Cancel"}</button>
                </div>
            </div>
        </motion.div>
    );
}

// ===================== ADD ITEM PANEL =====================
function AddItemPanel({ catId, language, onCreated, onCancel }: {
    catId: string; language: string;
    onCreated: (item: Item) => void;
    onCancel: () => void;
}) {
    const [titleAr, setTitleAr] = useState('');
    const [titleEn, setTitleEn] = useState('');
    const [descAr, setDescAr] = useState('');
    const [descEn, setDescEn] = useState('');
    const [prices, setPrices] = useState<number[]>([0]);
    const [sizeLabels, setSizeLabels] = useState<string[]>(['عادي']);
    const [isPopular, setIsPopular] = useState(false);
    const [isSpicy, setIsSpicy] = useState(false);
    const [sellByWeight, setSellByWeight] = useState(false);
    const [weightUnit, setWeightUnit] = useState('كجم');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleSave = async () => {
        if (!titleAr.trim() || prices[0] <= 0) return;
        setSaving(true);
        try {
            const { data } = await supabase
                .from('items')
                .insert({
                    category_id: catId,
                    title_ar: titleAr, title_en: titleEn || undefined,
                    desc_ar: descAr || undefined, desc_en: descEn || undefined,
                    price: prices[0] || 0,
                    prices: prices.filter(p => p > 0), size_labels: sizeLabels.filter((_, i) => prices[i] > 0),
                    is_popular: isPopular, is_spicy: isSpicy, is_available: true,
                    sell_by_weight: sellByWeight,
                    weight_unit: sellByWeight ? weightUnit : null
                }).select().single();
            if (data) {
                let imgUrl = null;
                if (imageFile) {
                    imgUrl = await uploadImage(imageFile, `items/${data.id}`);
                    if (imgUrl) await supabase.from('items').update({ image_url: imgUrl }).eq('id', data.id);
                }
                onCreated({ ...data, image_url: imgUrl });
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 20, height: 0 }}
            className="bg-white dark:bg-card border-2 border-slate-200 dark:border-glass-border rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-50 dark:bg-glass-dark px-6 py-4 border-b border-slate-200 dark:border-glass-border flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    {language === "ar" ? "إضافة صنف جديد" : "Add New Item"}
                </h3>
                <button onClick={onCancel} className="p-2 text-silver hover:text-red-500 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
                {/* Names */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "اسم الصنف (عربي) *" : "Item Name (Arabic) *"}</label>
                        <input value={titleAr} onChange={e => setTitleAr(e.target.value)} placeholder={language === "ar" ? "مثال: بيتزا مارجريتا" : "e.g. Margherita Pizza"}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border -blue outline-none text-base font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "اسم الصنف (إنجليزي)" : "Item Name (English)"}</label>
                        <input value={titleEn} onChange={e => setTitleEn(e.target.value)} placeholder="Margherita Pizza" dir="ltr"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border -blue outline-none text-base font-bold" />
                    </div>
                </div>

                {/* Descriptions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}</label>
                        <textarea value={descAr} onChange={e => setDescAr(e.target.value)} rows={2}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border -blue outline-none text-base resize-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-silver">{language === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}</label>
                        <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={2} dir="ltr"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border -blue outline-none text-base resize-none" />
                    </div>
                </div>

                {/* Sizes & Prices */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-silver">{language === "ar" ? "الأحجام والأسعار *" : "Sizes & Prices *"}</label>
                    {prices.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-black/20 p-2 rounded-xl border border-glass-border">
                            <input value={sizeLabels[idx] || ''} onChange={e => { const nl = [...sizeLabels]; nl[idx] = e.target.value; setSizeLabels(nl); }}
                                placeholder={language === "ar" ? "اسم الحجم" : "Size"} className="flex-1 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-base font-bold" />
                            <input type="number" value={p || ''} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}
                                placeholder="0" className="w-24 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />
                            <span className="text-sm text-silver">{language === "ar" ? "ج.م" : "EGP"}</span>
                            {prices.length > 1 && (
                                <button onClick={() => { setPrices(prices.filter((_, i) => i !== idx)); setSizeLabels(sizeLabels.filter((_, i) => i !== idx)); }}
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition"><X className="w-4 h-4" /></button>
                            )}
                        </div>
                    ))}
                    <button onClick={() => { setPrices([...prices, 0]); setSizeLabels([...sizeLabels, '']); }}
                        className="text-sm text-emerald-500 font-bold px-2 flex items-center gap-1 hover:text-emerald-400">
                        <Plus className="w-4 h-4" /> {language === "ar" ? "إضافة حجم" : "Add Size"}
                    </button>
                </div>

                {/* Badges + Image */}
                <div className="flex flex-wrap gap-3 items-center">
                    <button type="button" onClick={() => setIsPopular(!isPopular)}
                        className={`text-xs px-3 py-2 rounded-xl border font-bold transition ${isPopular ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600' : 'border-glass-border text-silver hover:border-yellow-500/50'}`}>
                        ⭐ {language === "ar" ? "مميز" : "Popular"}
                    </button>
                    <button type="button" onClick={() => setIsSpicy(!isSpicy)}
                        className={`text-xs px-3 py-2 rounded-xl border font-bold transition ${isSpicy ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-500' : 'border-glass-border text-silver hover:border-red-500/50'}`}>
                        🌶️ {language === "ar" ? "حار" : "Spicy"}
                    </button>
                    <div className="flex flex-col gap-2 relative">
                        <button type="button" onClick={() => setSellByWeight(!sellByWeight)}
                            className={`text-xs px-3 py-2 rounded-xl border font-bold transition ${sellByWeight ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'border-glass-border text-silver hover:border-indigo-500/50'}`}>
                            ⚖️ {language === "ar" ? "يباع بالوزن" : "By Weight"}
                        </button>
                    </div>
                    {sellByWeight && (
                        <div className="flex flex-col gap-1 w-full mt-2 animation-fade-in">
                            <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الوحدة (مثال: كيلو، علبة)" : "Unit"}</label>
                            <input value={weightUnit} onChange={e => setWeightUnit(e.target.value)} 
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/20 border border-glass-border focus:border-blue outline-none text-sm font-bold" placeholder="كجم" />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                        <button type="button" onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 font-bold text-xs rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                            <Upload className="w-3 h-3" /> {language === "ar" ? "رفع صورة" : "Upload Image"}
                        </button>
                        {imagePreview && <img src={imagePreview} alt="" className="w-10 h-10 rounded-lg object-cover border border-glass-border" />}
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-glass-border">
                    <button onClick={handleSave} disabled={saving || !titleAr.trim() || prices[0] <= 0}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95">
                        <Save className="w-4 h-4" />
                        {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ الصنف" : "Save Item")}
                    </button>
                    <button onClick={onCancel} className="px-4 py-3 text-silver font-bold text-sm hover:text-foreground transition">{language === "ar" ? "إلغاء" : "Cancel"}</button>
                </div>
            </div>
        </motion.div>
    );
}

// ===================== ITEM ROW (read-only) =====================
function ItemRow({ item, language, onEdit, onDelete }: {
    item: Item; language: string;
    onEdit: () => void; onDelete: () => void;
}) {
    return (
        <>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-glass-light flex items-center justify-center flex-shrink-0 border border-glass-border overflow-hidden">
                        {item.image_url ? <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-silver/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-bold text-foreground text-xl truncate">{item.title_ar}</h4>
                            {item.is_popular && <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {language === "ar" ? "مميز" : "Popular"}</span>}
                            {item.is_spicy && <span className="text-red-500 text-base">🌶️</span>}
                            {item.sell_by_weight && <span className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1">⚖️ {language === "ar" ? "وزن" : "Weight"} ({item.weight_unit || 'كجم'})</span>}
                        </div>
                        {item.title_en && <p className="text-sm text-silver mb-1">{item.title_en}</p>}
                        <p className="text-base text-silver line-clamp-2">{item.desc_ar || (language === "ar" ? "بدون وصف" : "No description")}</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={onEdit} className="p-2 text-blue hover:bg-blue/10 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-glass-border border-dashed">
                {(item.prices || []).map((price, pIdx) => (
                    <div key={pIdx} className="bg-white dark:bg-black/40 border border-glass-border rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                        <span className="text-sm text-silver font-medium">{item.size_labels?.[pIdx] || 'عادي'}:</span>
                        <span className="font-bold text-foreground text-base">{price} {language === "ar" ? "ج.م" : "EGP"}</span>
                    </div>
                ))}
            </div>
        </>
    );
}

// ===================== CATEGORY EDITOR =====================
function CategoryEditor({ cat, language, onUpdate, onImageUpload, onClose }: {
    cat: Category; language: string;
    onUpdate: (updates: Partial<Category>) => Promise<void>;
    onImageUpload: (file: File) => Promise<void>;
    onClose: () => void;
}) {
    const [nameAr, setNameAr] = useState(cat.name_ar);
    const [nameEn, setNameEn] = useState(cat.name_en || '');
    const [emoji, setEmoji] = useState(cat.emoji || '');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => { await onUpdate({ name_ar: nameAr, name_en: nameEn || nameAr, emoji }); onClose(); };

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        await onImageUpload(file);
        setUploading(false);
    };

    return (
        <div className="space-y-4 bg-blue/5 p-4 rounded-xl border border-blue/20">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue text-sm">{language === "ar" ? "تعديل القسم" : "Edit Category"}</h3>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-blue text-slate-900 dark:text-white text-sm font-bold rounded-lg"><Save className="w-3 h-3" /> {language === "ar" ? "حفظ" : "Save"}</button>
                    <button onClick={onClose} className="p-1.5 text-silver hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الاسم العربي" : "Name (AR)"}</label>
                    <input value={nameAr} onChange={e => setNameAr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الاسم الإنجليزي" : "Name (EN)"}</label>
                    <input value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الإيموجي" : "Emoji"}</label>
                    <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base text-center font-bold" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue/10 text-blue font-bold text-sm rounded-lg disabled:opacity-50">
                    <Upload className="w-4 h-4" /> {uploading ? "..." : (language === "ar" ? "رفع صورة غلاف" : "Upload Cover")}
                </button>
                {cat.image_url && <img src={cat.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-glass-border" />}
            </div>
        </div>
    );
}

// ===================== ITEM EDITOR =====================
function ItemEditor({ item, language, onUpdate, onImageUpload, onClose }: {
    item: Item; language: string;
    onUpdate: (updates: Partial<Item>) => Promise<void>;
    onImageUpload: (file: File) => Promise<void>;
    onClose: () => void;
}) {
    const [titleAr, setTitleAr] = useState(item.title_ar);
    const [titleEn, setTitleEn] = useState(item.title_en || '');
    const [descAr, setDescAr] = useState(item.desc_ar || '');
    const [descEn, setDescEn] = useState(item.desc_en || '');
    const [localPrices, setLocalPrices] = useState([...item.prices]);
    const [localLabels, setLocalLabels] = useState([...(item.size_labels || [])]);
    const [sellByWeight, setSellByWeight] = useState(item.sell_by_weight || false);
    const [weightUnit, setWeightUnit] = useState(item.weight_unit || 'كجم');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        await onUpdate({ title_ar: titleAr, title_en: titleEn, desc_ar: descAr, desc_en: descEn, prices: localPrices, size_labels: localLabels, sell_by_weight: sellByWeight, weight_unit: sellByWeight ? weightUnit : undefined });
        onClose();
    };

    const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setUploading(true); await onImageUpload(file); setUploading(false);
    };

    return (
        <div className="space-y-4 bg-blue/5 p-4 rounded-xl border border-blue/20">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue text-sm">{language === "ar" ? "تعديل الصنف" : "Edit Item"}</h3>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-blue text-slate-900 dark:text-white text-sm font-bold rounded-lg"><Save className="w-3 h-3" /> {language === "ar" ? "حفظ" : "Save"}</button>
                    <button onClick={onClose} className="p-1.5 text-silver hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "اسم الصنف (عربي)" : "Name (AR)"}</label>
                    <input value={titleAr} onChange={e => setTitleAr(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "اسم الصنف (إنجليزي)" : "Name (EN)"}</label>
                    <input value={titleEn} onChange={e => setTitleEn(e.target.value)} dir="ltr" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الوصف (عربي)" : "Desc (AR)"}</label>
                    <textarea value={descAr} onChange={e => setDescAr(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base resize-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الوصف (إنجليزي)" : "Desc (EN)"}</label>
                    <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={2} dir="ltr" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base resize-none" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الأحجام والأسعار" : "Sizes & Prices"}</label>
                {localPrices.map((price, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-black/30 p-2 rounded-lg border border-glass-border">
                        <input value={localLabels[idx] || ''} onChange={e => { const nl = [...localLabels]; nl[idx] = e.target.value; setLocalLabels(nl); }}
                            placeholder={language === "ar" ? "الحجم" : "Size"} className="flex-1 px-2 py-1 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-base font-bold" />
                        <input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}
                            className="w-24 px-2 py-1 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />
                        <span className="text-sm text-silver">{language === "ar" ? "ج.م" : "EGP"}</span>
                        {localPrices.length > 1 && <button onClick={() => { setLocalPrices(localPrices.filter((_, i) => i !== idx)); setLocalLabels(localLabels.filter((_, i) => i !== idx)); }} className="p-1 text-red-500"><X className="w-4 h-4" /></button>}
                    </div>
                ))}
                <button onClick={() => { setLocalPrices([...localPrices, 0]); setLocalLabels([...localLabels, '']); }} className="text-sm text-blue font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> {language === "ar" ? "إضافة حجم" : "Add Size"}</button>
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={() => onUpdate({ is_popular: !item.is_popular })} className={`text-xs px-3 py-1.5 rounded-md border font-bold ${item.is_popular ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600' : 'border-glass-border text-silver'}`}>⭐ {language === "ar" ? (item.is_popular ? "إلغاء" : "مميز") : (item.is_popular ? "Remove" : "Popular")}</button>
                <button type="button" onClick={() => onUpdate({ is_spicy: !item.is_spicy })} className={`text-xs px-3 py-1.5 rounded-md border font-bold ${item.is_spicy ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-500' : 'border-glass-border text-silver'}`}>🌶️ {language === "ar" ? (item.is_spicy ? "إلغاء" : "حار") : (item.is_spicy ? "Remove" : "Spicy")}</button>
                <button type="button" onClick={() => { setSellByWeight(!sellByWeight); onUpdate({ sell_by_weight: !sellByWeight, weight_unit: !sellByWeight ? weightUnit : undefined }); }} className={`text-xs px-3 py-1.5 rounded-md border font-bold ${sellByWeight ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500' : 'border-glass-border text-silver'}`}>⚖️ {language === "ar" ? (sellByWeight ? "إلغاء الوزن" : "وزن") : (sellByWeight ? "Remove Weight" : "Weight")}</button>
            </div>
            {sellByWeight && (
                <div className="w-full">
                    <label className="text-xs font-bold text-silver uppercase">{language === "ar" ? "الوحدة (مثال: كيلو، جرام)" : "Unit"}</label>
                    <input value={weightUnit} onChange={e => { setWeightUnit(e.target.value); onUpdate({ weight_unit: e.target.value }); }} 
                        className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-black/30 border border-glass-border focus:border-blue outline-none text-base font-bold" placeholder="كجم" />
                </div>
            )}
            <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue/10 text-blue font-bold text-sm rounded-lg disabled:opacity-50">
                    <Upload className="w-4 h-4" /> {uploading ? "..." : (language === "ar" ? "رفع صورة" : "Upload Image")}
                </button>
                {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-glass-border" />}
            </div>
        </div>
    );
}
