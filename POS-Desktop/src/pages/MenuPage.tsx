import { useState, useEffect, useCallback, useRef } from 'react';
import { db, fileToBase64 } from '../lib/db';
import type { Category, MenuItem } from '../lib/db';
import { formatCurrency } from '../lib/helpers';
import {
    UtensilsCrossed, Download, Upload, RefreshCw, Package, Edit3, Check, X, Plus,
    FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, ImagePlus, ChevronDown, ChevronUp,
    Star, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MenuPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [collapsedCats, setCollapsedCats] = useState<Set<number>>(new Set());
    const [showAddCat, setShowAddCat] = useState(false);
    const [showAddItem, setShowAddItem] = useState<number | null>(null);
    const [editingItem, setEditingItem] = useState<number | null>(null);
    const [editingCat, setEditingCat] = useState<number | null>(null);
    const [deletingCat, setDeletingCat] = useState<number | null>(null);
    const [deletingItem, setDeletingItem] = useState<number | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Add category form
    const [newCat, setNewCat] = useState({ name_ar: '', name_en: '', emoji: '🍽️' });
    const [newCatImage, setNewCatImage] = useState<string | null>(null);
    // Add item form
    const [newItemForm, setNewItemForm] = useState({ title_ar: '', title_en: '', desc_ar: '', desc_en: '' });
    const [newItemPrices, setNewItemPrices] = useState<number[]>([0]);
    const [newItemSizes, setNewItemSizes] = useState<string[]>(['عادي']);
    const [newItemPopular, setNewItemPopular] = useState(false);
    const [newItemImage, setNewItemImage] = useState<string | null>(null);
    // Edit item form
    const [editForm, setEditForm] = useState({ title_ar: '', title_en: '', prices: [0], sizes: [''] });
    // Edit cat form
    const [editCatForm, setEditCatForm] = useState({ name_ar: '', name_en: '', emoji: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const cats = await db.categories.orderBy('sort_order').toArray();
        setCategories(cats);
        setItems(await db.menu_items.toArray());
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getCatImage = (catId: number) => categories.find(c => c.id === catId)?.image_data;
    const toggleCollapse = (id: number) => setCollapsedCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    /* ═══════ CATEGORY IMAGE ═══════ */
    const handleCategoryImage = async (catId: number, file: File) => {
        const b64 = await fileToBase64(file);
        await db.categories.update(catId, { image_data: b64 });
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, image_data: b64 } : c));
    };
    const handleItemImage = async (itemId: number, file: File) => {
        const b64 = await fileToBase64(file);
        await db.menu_items.update(itemId, { image_data: b64 });
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_data: b64 } : i));
    };

    /* ═══════ ADD CATEGORY ═══════ */
    const addCategory = async () => {
        if (!newCat.name_ar.trim()) return;
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0;
        await db.categories.add({ name_ar: newCat.name_ar.trim(), name_en: newCat.name_en.trim() || undefined, emoji: newCat.emoji || '🍽️', image_data: newCatImage || undefined, sort_order: maxOrder + 1 });
        setNewCat({ name_ar: '', name_en: '', emoji: '🍽️' }); setNewCatImage(null); setShowAddCat(false); fetchData();
    };

    /* ═══════ DELETE CATEGORY ═══════ */
    const confirmDeleteCat = async () => {
        if (!deletingCat) return;
        const catItems = items.filter(i => i.category_id === deletingCat);
        for (const item of catItems) await db.menu_items.delete(item.id!);
        await db.categories.delete(deletingCat);
        setDeletingCat(null); fetchData();
    };

    /* ═══════ EDIT CATEGORY ═══════ */
    const startEditCat = (cat: Category) => { setEditingCat(cat.id!); setEditCatForm({ name_ar: cat.name_ar, name_en: cat.name_en || '', emoji: cat.emoji || '' }); };
    const saveEditCat = async () => {
        if (!editingCat || !editCatForm.name_ar.trim()) return;
        await db.categories.update(editingCat, { name_ar: editCatForm.name_ar.trim(), name_en: editCatForm.name_en.trim() || undefined, emoji: editCatForm.emoji || undefined });
        setEditingCat(null); fetchData();
    };

    /* ═══════ ADD ITEM ═══════ */
    const resetNewItem = () => { setNewItemForm({ title_ar: '', title_en: '', desc_ar: '', desc_en: '' }); setNewItemPrices([0]); setNewItemSizes(['عادي']); setNewItemPopular(false); setNewItemImage(null); };
    const addItem = async (catId: number) => {
        const prices = newItemPrices.filter(p => p > 0);
        if (!newItemForm.title_ar.trim() || prices.length === 0) return;
        const labels = newItemSizes.filter((_, i) => newItemPrices[i] > 0);
        await db.menu_items.add({ category_id: catId, title_ar: newItemForm.title_ar.trim(), title_en: newItemForm.title_en.trim() || undefined, prices, size_labels: labels, is_available: true, is_popular: newItemPopular, image_data: newItemImage || undefined });
        resetNewItem(); setShowAddItem(null); fetchData();
    };

    /* ═══════ EDIT ITEM ═══════ */
    const startEditItem = (item: MenuItem) => { setEditingItem(item.id!); setEditForm({ title_ar: item.title_ar, title_en: item.title_en || '', prices: [...item.prices], sizes: [...(item.size_labels || item.prices.map(() => ''))] }); };
    const saveEditItem = async () => {
        if (!editingItem) return;
        const prices = editForm.prices.filter(p => p > 0);
        const sizes = editForm.sizes.filter((_, i) => editForm.prices[i] > 0);
        await db.menu_items.update(editingItem, { title_ar: editForm.title_ar.trim(), title_en: editForm.title_en.trim() || undefined, prices, size_labels: sizes });
        setEditingItem(null); fetchData();
    };

    const toggleAvailability = async (item: MenuItem) => { await db.menu_items.update(item.id!, { is_available: !item.is_available }); setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !item.is_available } : i)); };
    const confirmDeleteItem = async () => { if (!deletingItem) return; await db.menu_items.delete(deletingItem); setDeletingItem(null); fetchData(); };
    const togglePopular = async (item: MenuItem) => { await db.menu_items.update(item.id!, { is_popular: !item.is_popular }); setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_popular: !item.is_popular } : i)); };

    /* ═══════ EXPORT EXCEL ═══════ */
    const exportExcel = () => {
        const rows: Record<string, string | number>[] = [];
        categories.forEach(cat => {
            const catItems = items.filter(i => i.category_id === cat.id);
            if (catItems.length === 0) rows.push({ 'Category AR': cat.name_ar, 'Category EN': cat.name_en || '', 'Emoji': cat.emoji || '', 'Item AR': '', 'Item EN': '', 'Sizes': '', 'Prices': '', 'Popular': '' });
            else catItems.forEach(item => rows.push({ 'Category AR': cat.name_ar, 'Category EN': cat.name_en || '', 'Emoji': cat.emoji || '', 'Item AR': item.title_ar, 'Item EN': item.title_en || '', 'Sizes': (item.size_labels || []).join(','), 'Prices': item.prices.join(','), 'Popular': item.is_popular ? 'Yes' : 'No' }));
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Menu');
        XLSX.writeFile(wb, `Menu_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    /* ═══════ IMPORT EXCEL ═══════ */
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setImportStatus(null);
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
            const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(wb.Sheets[wb.SheetNames[0]]);
            if (rows.length === 0) { setImportStatus({ type: 'error', message: 'الملف فارغ!' }); return; }
            const existingCats = await db.categories.toArray();
            const catMap = new Map<string, number>(); existingCats.forEach(c => catMap.set(c.name_ar.trim(), c.id!));
            let nc = 0, ni = 0;
            for (const row of rows) { const ca = String(row['Category AR'] || '').trim(); if (!ca || catMap.has(ca)) continue; const mo = (await db.categories.orderBy('sort_order').last())?.sort_order || 0; const id = await db.categories.add({ name_ar: ca, name_en: String(row['Category EN'] || '').trim() || undefined, emoji: String(row['Emoji'] || '').trim() || '🍽️', sort_order: mo + 1 }); catMap.set(ca, id as number); nc++; }
            for (const row of rows) { const ca = String(row['Category AR'] || '').trim(); const ia = String(row['Item AR'] || '').trim(); if (!ca || !ia) continue; const cid = catMap.get(ca); if (!cid) continue; const pr = String(row['Prices'] || '0').split(',').map(p => parseFloat(p.trim()) || 0).filter(p => p > 0); if (pr.length === 0) pr.push(0); const sl = String(row['Sizes'] || '').split(',').map(s => s.trim()).filter(s => s); while (sl.length < pr.length) sl.push(sl[0] || 'عادي'); await db.menu_items.add({ category_id: cid, title_ar: ia, title_en: String(row['Item EN'] || '').trim() || undefined, prices: pr, size_labels: sl.slice(0, pr.length), is_available: true, is_popular: String(row['Popular'] || '').toLowerCase() === 'yes' }); ni++; }
            setImportStatus({ type: 'success', message: `تم استيراد ${ni} صنف${nc > 0 ? ` و ${nc} قسم جديد` : ''} بنجاح!` }); fetchData();
        } catch { setImportStatus({ type: 'error', message: 'خطأ في قراءة الملف' }); }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadTemplate = () => {
        const rows = [{ 'Category AR': 'ساندوتشات', 'Category EN': 'Sandwiches', 'Emoji': '🥪', 'Item AR': 'شاورما', 'Item EN': 'Shawarma', 'Sizes': 'صغير,وسط,كبير', 'Prices': '30,50,70', 'Popular': 'Yes' }];
        const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Menu'); XLSX.writeFile(wb, 'Menu_Template.xlsx');
    };

    return (
        <div className="max-w-5xl mx-auto animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white flex items-center gap-3"><UtensilsCrossed className="w-7 h-7 text-emerald-500" /> إدارة المنيو</h1>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowAddCat(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95"><Plus className="w-3.5 h-3.5" /> قسم جديد</button>
                    <button onClick={fetchData} className="p-2.5 bg-white dark:bg-dark-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-white/[0.04] transition"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 transition"><Download className="w-3.5 h-3.5" /> تصدير</button>
                </div>
            </div>

            {/* Import */}
            <div className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-2xl p-5">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 mb-3"><FileSpreadsheet className="w-4 h-4 text-emerald-500" /> استيراد من Excel</h3>
                <div className="flex flex-wrap gap-3 items-center">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg active:scale-95 transition"><Upload className="w-4 h-4" /> استيراد</button>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-dark-600 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-xl border border-zinc-200 dark:border-white/[0.04]"><FileSpreadsheet className="w-4 h-4" /> نموذج فارغ</button>
                </div>
                {importStatus && <div className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${importStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>{importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}{importStatus.message}</div>}
            </div>

            {/* ADD CATEGORY PANEL */}
            {showAddCat && (
                <div className="bg-white dark:bg-dark-700 border-2 border-blue-500/30 rounded-2xl overflow-hidden shadow-lg">
                    <div className="bg-blue-50 dark:bg-blue-500/5 px-6 py-4 border-b border-blue-200 dark:border-blue-500/20 flex items-center justify-between">
                        <h3 className="font-bold text-blue-600 dark:text-blue-400 text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> إضافة قسم جديد</h3>
                        <button onClick={() => setShowAddCat(false)} className="text-zinc-400 hover:text-red-500 transition"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">اسم القسم (عربي) *</label><input value={newCat.name_ar} onChange={e => setNewCat(v => ({ ...v, name_ar: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/[0.06] focus:border-blue-500 outline-none text-sm font-bold text-zinc-900 dark:text-white" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">اسم القسم (إنجليزي)</label><input value={newCat.name_en} onChange={e => setNewCat(v => ({ ...v, name_en: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/[0.06] focus:border-blue-500 outline-none text-sm font-bold text-zinc-900 dark:text-white" dir="ltr" /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">الإيموجي</label><input value={newCat.emoji} onChange={e => setNewCat(v => ({ ...v, emoji: e.target.value }))} maxLength={4} className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/[0.06] focus:border-blue-500 outline-none text-sm text-center font-bold text-2xl" /></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition">
                                <Upload className="w-4 h-4" /> رفع صورة غلاف
                                <input type="file" accept="image/*" className="hidden" onChange={async e => { if (e.target.files?.[0]) setNewCatImage(await fileToBase64(e.target.files[0])); }} />
                            </label>
                            {newCatImage && <img src={newCatImage} alt="" className="w-14 h-14 rounded-xl object-cover border border-zinc-200 dark:border-white/[0.06]" />}
                        </div>
                        <div className="flex items-center gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
                            <button onClick={addCategory} disabled={!newCat.name_ar.trim()} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 active:scale-95"><Save className="w-4 h-4" /> حفظ القسم</button>
                            <button onClick={() => setShowAddCat(false)} className="px-4 py-3 text-zinc-500 font-bold text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORIES */}
            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : (
                <div className="space-y-4">
                    {categories.map(cat => {
                        const catItems = items.filter(i => i.category_id === cat.id);
                        const collapsed = collapsedCats.has(cat.id!);
                        return (
                            <div key={cat.id} className="bg-white dark:bg-dark-700 border border-zinc-200 dark:border-white/[0.04] rounded-2xl overflow-hidden shadow-sm">
                                {/* Category Header */}
                                <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition" onClick={() => toggleCollapse(cat.id!)}>
                                    <label className="cursor-pointer relative group shrink-0" onClick={e => e.stopPropagation()}>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleCategoryImage(cat.id!, e.target.files[0]); }} />
                                        {cat.image_data ? <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.06]"><img src={cat.image_data} alt="" className="w-full h-full object-cover" /></div>
                                            : <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-dark-600 flex items-center justify-center text-xl border border-zinc-200 dark:border-white/[0.06]">{cat.emoji || '📁'}</div>}
                                        <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><ImagePlus className="w-4 h-4 text-white" /></div>
                                    </label>
                                    <div className="flex-1 min-w-0">
                                        {editingCat === cat.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input value={editCatForm.name_ar} onChange={e => setEditCatForm(v => ({ ...v, name_ar: e.target.value }))} className="px-3 py-1.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg text-sm font-bold text-zinc-900 dark:text-white w-36" />
                                                <input value={editCatForm.name_en} onChange={e => setEditCatForm(v => ({ ...v, name_en: e.target.value }))} className="px-3 py-1.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg text-sm text-zinc-900 dark:text-white w-36" dir="ltr" placeholder="English" />
                                                <input value={editCatForm.emoji} onChange={e => setEditCatForm(v => ({ ...v, emoji: e.target.value }))} className="px-2 py-1.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg text-center w-12" maxLength={4} />
                                                <button onClick={(e) => { e.stopPropagation(); saveEditCat(); }} className="text-emerald-500"><Check className="w-5 h-5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingCat(null); }} className="text-zinc-400"><X className="w-5 h-5" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">{cat.name_ar}</h3>
                                                {cat.name_en && <span className="text-xs text-zinc-400">({cat.name_en})</span>}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-dark-600 px-2.5 py-1 rounded-lg font-bold">{catItems.length} صنف</span>
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setShowAddItem(showAddItem === cat.id ? null : cat.id!)} className="text-xs text-emerald-500 font-bold px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition flex items-center gap-1"><Plus className="w-3 h-3" /> صنف</button>
                                        <button onClick={() => startEditCat(cat)} className="text-zinc-400 hover:text-blue-500 transition p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => setDeletingCat(cat.id!)} className="text-zinc-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    {collapsed ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronUp className="w-4 h-4 text-zinc-400" />}
                                </div>

                                {/* Add Item Panel */}
                                {showAddItem === cat.id && !collapsed && (
                                    <div className="border-t-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-5 space-y-4">
                                        <div className="flex items-center justify-between"><h4 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><Plus className="w-4 h-4" /> إضافة صنف جديد</h4><button onClick={() => { setShowAddItem(null); resetNewItem(); }} className="text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">اسم الصنف (عربي) *</label><input value={newItemForm.title_ar} onChange={e => setNewItemForm(v => ({ ...v, title_ar: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/[0.06] text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500" /></div>
                                            <div className="space-y-1"><label className="text-xs font-bold text-zinc-500">اسم الصنف (إنجليزي)</label><input value={newItemForm.title_en} onChange={e => setNewItemForm(v => ({ ...v, title_en: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/[0.06] text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-emerald-500" dir="ltr" /></div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-500">الأحجام والأسعار *</label>
                                            {newItemPrices.map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded-xl border border-zinc-200 dark:border-white/[0.06]">
                                                    <input value={newItemSizes[idx] || ''} onChange={e => { const ns = [...newItemSizes]; ns[idx] = e.target.value; setNewItemSizes(ns); }} placeholder="اسم الحجم" className="flex-1 px-3 py-2 bg-transparent border-b border-zinc-200 dark:border-white/[0.06] focus:border-emerald-500 outline-none text-sm font-bold text-zinc-900 dark:text-white" />
                                                    <input type="number" value={p || ''} onChange={e => { const np = [...newItemPrices]; np[idx] = parseFloat(e.target.value) || 0; setNewItemPrices(np); }} placeholder="0" className="w-24 px-3 py-2 bg-transparent border-b border-zinc-200 dark:border-white/[0.06] focus:border-emerald-500 outline-none text-sm font-bold tabular-nums text-center text-zinc-900 dark:text-white" dir="ltr" />
                                                    <span className="text-xs text-zinc-400">ج.م</span>
                                                    {newItemPrices.length > 1 && <button onClick={() => { setNewItemPrices(newItemPrices.filter((_, i) => i !== idx)); setNewItemSizes(newItemSizes.filter((_, i) => i !== idx)); }} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded"><X className="w-3 h-3" /></button>}
                                                </div>
                                            ))}
                                            <button onClick={() => { setNewItemPrices([...newItemPrices, 0]); setNewItemSizes([...newItemSizes, '']); }} className="text-xs text-emerald-500 font-bold flex items-center gap-1 hover:text-emerald-400"><Plus className="w-3 h-3" /> إضافة حجم</button>
                                        </div>
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <button onClick={() => setNewItemPopular(!newItemPopular)} className={`text-xs px-3 py-2 rounded-xl border font-bold transition ${newItemPopular ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'border-zinc-200 dark:border-white/[0.06] text-zinc-400'}`}>⭐ مميز</button>
                                            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 font-bold text-xs rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                                                <Upload className="w-3.5 h-3.5" /> صورة
                                                <input type="file" accept="image/*" className="hidden" onChange={async e => { if (e.target.files?.[0]) setNewItemImage(await fileToBase64(e.target.files[0])); }} />
                                            </label>
                                            {newItemImage && <img src={newItemImage} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                                        </div>
                                        <div className="flex gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.06]">
                                            <button onClick={() => addItem(cat.id!)} disabled={!newItemForm.title_ar.trim() || newItemPrices.every(p => p <= 0)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 active:scale-95"><Save className="w-4 h-4" /> حفظ الصنف</button>
                                            <button onClick={() => { setShowAddItem(null); resetNewItem(); }} className="text-zinc-500 font-bold text-sm px-4">إلغاء</button>
                                        </div>
                                    </div>
                                )}

                                {/* Items */}
                                {!collapsed && (
                                    <div className="border-t border-zinc-100 dark:border-white/[0.03] divide-y divide-zinc-100 dark:divide-white/[0.03]">
                                        {catItems.length === 0 ? (
                                            <div className="py-8 text-center text-zinc-400 text-sm"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" />لا توجد أصناف في هذا القسم</div>
                                        ) : catItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition group">
                                                <label className="cursor-pointer relative group/img shrink-0">
                                                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleItemImage(item.id!, e.target.files[0]); }} />
                                                    {item.image_data ? <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.06]"><img src={item.image_data} alt="" className="w-full h-full object-cover" /></div>
                                                        : getCatImage(item.category_id) ? <div className="w-12 h-12 rounded-xl overflow-hidden opacity-50 border border-zinc-200 dark:border-white/[0.06]"><img src={getCatImage(item.category_id)!} alt="" className="w-full h-full object-cover" /></div>
                                                            : <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-dark-600 flex items-center justify-center border border-zinc-200 dark:border-white/[0.06]"><Package className="w-5 h-5 text-zinc-400 dark:text-zinc-700" /></div>}
                                                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition"><ImagePlus className="w-3.5 h-3.5 text-white" /></div>
                                                </label>
                                                <div className="flex-1 min-w-0">
                                                    {editingItem === item.id ? (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <input value={editForm.title_ar} onChange={e => setEditForm(v => ({ ...v, title_ar: e.target.value }))} className="px-2 py-1.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg text-sm font-bold text-zinc-900 dark:text-white w-40" />
                                                                <input value={editForm.title_en} onChange={e => setEditForm(v => ({ ...v, title_en: e.target.value }))} className="px-2 py-1.5 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg text-sm text-zinc-900 dark:text-white w-36" dir="ltr" placeholder="English" />
                                                            </div>
                                                            {editForm.prices.map((p, idx) => (
                                                                <div key={idx} className="flex items-center gap-2">
                                                                    <input value={editForm.sizes[idx] || ''} onChange={e => { const ns = [...editForm.sizes]; ns[idx] = e.target.value; setEditForm(v => ({ ...v, sizes: ns })); }} className="px-2 py-1 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded text-xs text-zinc-900 dark:text-white w-24" />
                                                                    <input type="number" value={p || ''} onChange={e => { const np = [...editForm.prices]; np[idx] = parseFloat(e.target.value) || 0; setEditForm(v => ({ ...v, prices: np })); }} className="px-2 py-1 bg-zinc-50 dark:bg-dark-900 border border-zinc-200 dark:border-white/[0.06] rounded text-xs text-zinc-900 dark:text-white w-20" dir="ltr" />
                                                                </div>
                                                            ))}
                                                            <div className="flex gap-1"><button onClick={saveEditItem} className="text-emerald-500"><Check className="w-4 h-4" /></button><button onClick={() => setEditingItem(null)} className="text-zinc-400"><X className="w-4 h-4" /></button></div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{item.title_ar}</p>
                                                                {item.title_en && <span className="text-xs text-zinc-400">({item.title_en})</span>}
                                                                {item.is_popular && <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold border border-amber-200 dark:border-amber-500/20">⭐ مميز</span>}
                                                            </div>
                                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{item.prices.map((p, i) => `${item.size_labels?.[i] || ''} ${formatCurrency(p)}`).join(' / ')}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => togglePopular(item)} className={`p-1.5 rounded-lg transition ${item.is_popular ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'text-zinc-400 hover:text-amber-500'}`}><Star className="w-4 h-4" /></button>
                                                    <button onClick={() => toggleAvailability(item)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition ${item.is_available ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'}`}>{item.is_available ? 'متاح' : 'غير متاح'}</button>
                                                    <button onClick={() => startEditItem(item)} className="text-zinc-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition"><Edit3 className="w-4 h-4" /></button>
                                                    <button onClick={() => setDeletingItem(item.id!)} className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DELETE CATEGORY MODAL */}
            {deletingCat !== null && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">هل أنت متأكد من حذف هذا القسم وكل أصنافه؟</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={confirmDeleteCat} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition">تأكيد الحذف</button>
                            <button onClick={() => setDeletingCat(null)} className="px-6 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE ITEM MODAL */}
            {deletingItem !== null && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">هل أنت متأكد من حذف هذا الصنف؟</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={confirmDeleteItem} className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition">تأكيد الحذف</button>
                            <button onClick={() => setDeletingItem(null)} className="px-6 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
