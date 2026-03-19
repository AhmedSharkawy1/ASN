"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { manualStockAdjustment } from "@/lib/helpers/inventoryService";
import { recalculateAllRecipeCosts } from "@/lib/helpers/costService";
import { formatQuantity } from "@/lib/helpers/formatters";
import {
    Warehouse, Plus, Search, Edit3, Trash2, AlertTriangle,
    Package, ArrowUpCircle, ArrowDownCircle, X, Save, Filter, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getFactoryPrintStyles } from "@/lib/helpers/printerSettings";

type InventoryItem = {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    minimum_stock: number;
    item_type: string;
    cost_per_unit: number;
    currency: string;
    supplier: string | null;
    expiry_tracking: boolean;
    expiry_date: string | null;
    category: string | null;
    is_active: boolean;
    created_at: string;
};

const UNITS = [
    { key: 'kg', label: 'كيلو' },
    { key: 'piece', label: 'قطعة' },
    { key: 'liter', label: 'لتر' },
    { key: 'pack', label: 'باكيت' },
    { key: 'gram', label: 'جرام' },
    { key: 'unit', label: 'وحدة' }
];
const ITEM_TYPES = ['raw_material', 'product'];

const emptyForm = {
    name: '', quantity: 0, unit: 'kg', minimum_stock: 0, item_type: 'raw_material',
    cost_per_unit: 0, currency: 'EGP', supplier: '', expiry_tracking: false,
    expiry_date: '', category: '', is_active: true
};

export default function InventoryPage() {
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [adjustModal, setAdjustModal] = useState<{ id: string; name: string } | null>(null);
    const [adjustQty, setAdjustQty] = useState(0);
    const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add');
    const [adjustNotes, setAdjustNotes] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printSearch, setPrintSearch] = useState("");

    const fetchItems = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        const { data } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name');
        setItems((data as InventoryItem[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // Realtime subscription
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase
            .channel(`inventory-${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchItems())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, fetchItems]);

    const handleSave = async () => {
        if (!restaurantId || !form.name.trim()) return;
        setLoading(true);
        try {
            const payload = {
                restaurant_id: restaurantId, name: form.name.trim(), quantity: form.quantity,
                unit: form.unit, minimum_stock: form.minimum_stock, item_type: form.item_type,
                cost_per_unit: form.cost_per_unit, currency: form.currency,
                supplier: form.supplier || null, expiry_tracking: form.expiry_tracking,
                expiry_date: form.expiry_date || null, category: form.category || null,
                is_active: form.is_active, updated_at: new Date().toISOString()
            };
            
            if (editId) {
                const { error } = await supabase.from('inventory_items').update(payload).eq('id', editId);
                if (error) throw error;
                toast.success(isAr ? "تم التحديث" : "Item updated");
            } else {
                const { error } = await supabase.from('inventory_items').insert(payload);
                if (error) throw error;
                toast.success(isAr ? "تمت الإضافة" : "Item added");
            }

            // Recalculate all recipe costs if anything changed (especially cost)
            await recalculateAllRecipeCosts(restaurantId);
            
            setShowModal(false); 
            setEditId(null); 
            setForm(emptyForm); 
            await fetchItems();
        } catch (err: unknown) {
            console.error(err);
            toast.error(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving item");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isAr ? "هل أنت متأكد؟" : "Are you sure?")) return;
        await supabase.from('inventory_items').delete().eq('id', id);
        toast.success(isAr ? "تم الحذف" : "Deleted");
        fetchItems();
    };

    const handleAdjust = async () => {
        if (!adjustModal || !restaurantId || adjustQty <= 0) return;
        const result = await manualStockAdjustment(restaurantId, adjustModal.id, adjustQty, adjustAction, 'admin', adjustNotes);
        if (result.success) {
            toast.success(isAr ? "تم تعديل المخزون" : "Stock adjusted");
            setAdjustModal(null); setAdjustQty(0); setAdjustNotes(''); fetchItems();
        } else {
            toast.error(result.error || (isAr ? "خطأ" : "Error"));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(i => i.id));
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;

        const itemsToPrint = selectedIds.length > 0 
            ? items.filter(i => selectedIds.includes(i.id))
            : filtered;

        const tableRows = itemsToPrint.map(item => {
            const qtyInfo = displayQtyInfo(item.quantity, item.unit);
            return `
                <tr style="border-bottom: 2px solid #000;">
                    <td style="padding: 8px; border: 1.5px solid #000; font-weight: 900;">${item.name}</td>
                    <td style="padding: 8px; border: 1.5px solid #000; font-weight: 900;">${item.item_type === 'raw_material' ? (isAr ? 'مواد خام' : 'Raw Material') : (isAr ? 'منتج' : 'Product')}</td>
                    <td style="padding: 8px; border: 1.5px solid #000; font-weight: 900; text-align: center;">${qtyInfo.qty} ${qtyInfo.unit}</td>
                    <td style="padding: 8px; border: 1.5px solid #000; font-weight: 900; text-align: center;">${item.cost_per_unit} ${item.currency}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <title>${isAr ? 'تقرير المخزون' : 'Inventory Report'}</title>
                <style>
                    ${getFactoryPrintStyles(isAr ? 'rtl' : 'ltr')}
                    table { border: 2px solid #000; margin-top: 20px; width: 100%; border-collapse: collapse; }
                    th { border: 2px solid #000; background: transparent; color: #000; font-weight: 900; }
                    .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 4px solid #000; padding-bottom: 10px; }
                </style>
            </head>
            <body style="margin: 0; padding: 4px; color: #000; font-weight: 900;">
                <div class="header-top">
                    <div>
                        <h1 style="margin: 0; font-weight: 900;">${isAr ? 'تقرير جرد المخزون' : 'Inventory Stock Report'}</h1>
                        <p style="margin: 5px 0 0 0; color: #000; font-weight: 900;">${restaurant?.name || ''}</p>
                    </div>
                    <div style="text-align: ${isAr ? 'left' : 'right'};">
                        <p style="margin: 0; font-weight: 900;">${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #000; font-weight: 900;">${isAr ? 'عدد الأصناف: ' : 'Total Items: '}${itemsToPrint.length}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="padding: 8px; border: 2px solid #000; font-weight: 900;">${isAr ? 'الصنف' : 'Item'}</th>
                            <th style="padding: 8px; border: 2px solid #000; font-weight: 900;">${isAr ? 'النوع' : 'Type'}</th>
                            <th style="padding: 8px; border: 2px solid #000; font-weight: 900;">${isAr ? 'الكمية' : 'Qty'}</th>
                            <th style="padding: 8px; border: 2px solid #000; font-weight: 900;">${isAr ? 'التكلفة' : 'Cost'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div style="margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; font-size: 13px; color: #000; text-align: center; font-weight: 900;">
                    ${isAr ? 'تم إنشاء التقرير آلياً بواسطة نظام ASN' : 'Report generated automatically by ASN System'}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    const openEdit = (item: InventoryItem) => {
        setEditId(item.id);
        setForm({
            name: item.name, quantity: item.quantity, unit: item.unit,
            minimum_stock: item.minimum_stock, item_type: item.item_type,
            cost_per_unit: item.cost_per_unit, currency: item.currency,
            supplier: item.supplier || '', expiry_tracking: item.expiry_tracking,
            expiry_date: item.expiry_date || '', category: item.category || '',
            is_active: item.is_active
        });
        setShowModal(true);
    };

    const filtered = useMemo(() => items.filter(i => {
        if (typeFilter !== 'all' && i.item_type !== typeFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (i.name?.toLowerCase() || "").includes(q) || 
                   (i.supplier?.toLowerCase() || "").includes(q) || 
                   (i.category?.toLowerCase() || "").includes(q);
        }
        return true;
    }), [items, typeFilter, search]);

    const lowStockItems = useMemo(() => items.filter(i => i.quantity <= i.minimum_stock && i.is_active), [items]);
    
    // Memoized stats to prevent recalculation on every render (like when typing in modal)
    const stats = useMemo(() => ({
        total: items.length,
        rawMaterials: items.filter((i: InventoryItem) => i.item_type === 'raw_material').length,
        products: items.filter((i: InventoryItem) => i.item_type === 'product').length,
        lowStock: lowStockItems.length
    }), [items, lowStockItems]);

    const displayQtyInfo = useCallback((qty: number, unit: string) => {
        const fmt = formatQuantity(qty, unit, isAr);
        return { qty: fmt.qty, unit: fmt.unit };
    }, [isAr]);

    if (loading && items.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <Warehouse className="w-8 h-8 text-indigo-600 dark:text-emerald-400" />
                        {isAr ? "إدارة المخزون" : "Inventory Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "إدارة المواد الخام والمنتجات في المستودع" : "Manage raw materials and products in warehouse"}</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                    <button onClick={() => setShowPrintModal(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                        <Printer className="w-5 h-5 text-indigo-500" /> {isAr ? "خيارات الطباعة" : "Print Options"}
                    </button>
                    <button onClick={() => { setEditId(null); setForm(emptyForm); setShowModal(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                        <Plus className="w-5 h-5" /> {isAr ? "إضافة صنف" : "Add Item"}
                    </button>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span className="font-bold text-amber-800 dark:text-amber-400">{isAr ? "تنبيه مخزون منخفض" : "Low Stock Alert"}</span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map(i => {
                            const fmt = displayQtyInfo(i.quantity, i.unit);
                            const minFmt = displayQtyInfo(i.minimum_stock, i.unit);
                            return (
                                <span key={i.id} className="text-sm bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-lg font-medium">
                                    {i.name}: {fmt.qty} {fmt.unit} ({isAr ? "الحد الأدنى" : "min"}: {minFmt.qty} {minFmt.unit})
                                </span>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي الأصناف" : "Total Items", value: stats.total, color: "text-slate-700 dark:text-zinc-300" },
                    { label: isAr ? "مواد خام" : "Raw Materials", value: stats.rawMaterials, color: "text-blue-600 dark:text-blue-400" },
                    { label: isAr ? "منتجات" : "Products", value: stats.products, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: isAr ? "مخزون منخفض" : "Low Stock", value: stats.lowStock, color: "text-amber-600 dark:text-amber-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={isAr ? "بحث بالاسم أو المورد..." : "Search by name or supplier..."}
                        className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none" />
                </div>

                <div className="relative w-full sm:w-auto">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none appearance-none cursor-pointer">
                        <option value="all">{isAr ? "كل الأنواع" : "All Types"}</option>
                        <option value="raw_material">{isAr ? "مواد خام" : "Raw Material"}</option>
                        <option value="product">{isAr ? "منتج" : "Product"}</option>
                    </select>
                </div>
            </div>

            {/* Items Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد أصناف" : "No items found"}</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "الصنف" : "Item", isAr ? "النوع" : "Type", isAr ? "الكمية" : "Qty", isAr ? "الوحدة" : "Unit", isAr ? "الحد الأدنى" : "Min Stock", isAr ? "التكلفة/وحدة" : "Cost/Unit", isAr ? "المورد" : "Supplier", isAr ? "إجراءات" : "Actions"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item: InventoryItem) => {
                                const isLow = item.quantity <= item.minimum_stock;
                                return (
                                    <tr key={item.id} className={`border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition ${isLow ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}`}>
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">
                                            <div className="flex items-center gap-2">
                                                {isLow && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                                                {item.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.item_type === 'raw_material' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                                                {item.item_type === 'raw_material' ? (isAr ? "خام" : "Raw") : (isAr ? "منتج" : "Product")}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-3 font-extrabold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                                            {displayQtyInfo(item.quantity, item.unit).qty}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{displayQtyInfo(item.quantity, item.unit).unit}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{displayQtyInfo(item.minimum_stock, item.unit).qty}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{item.cost_per_unit} {item.currency}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{item.supplier || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setAdjustModal({ id: item.id, name: item.name })} title={isAr ? "تعديل الكمية" : "Adjust Stock"}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-emerald-400 hover:bg-indigo-50 dark:hover:bg-emerald-500/10 rounded-lg transition">
                                                    <ArrowUpCircle className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openEdit(item)} title={isAr ? "تعديل" : "Edit"}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-emerald-400 hover:bg-indigo-50 dark:hover:bg-emerald-500/10 rounded-lg transition">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} title={isAr ? "حذف" : "Delete"}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== ADD/EDIT MODAL ===== */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{editId ? (isAr ? "تعديل الصنف" : "Edit Item") : (isAr ? "إضافة صنف جديد" : "Add New Item")}</h2>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "اسم الصنف" : "Item Name"} *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "الكمية" : "Quantity"}</label>
                                        <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "الوحدة" : "Unit"}</label>
                                        <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                            {UNITS.map(u => <option key={u.key} value={u.key}>{isAr ? u.label : u.key}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "الحد الأدنى" : "Min Stock"}</label>
                                        <input type="number" value={form.minimum_stock} onChange={e => setForm({ ...form, minimum_stock: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "النوع" : "Type"}</label>
                                        <select value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                            {ITEM_TYPES.map(t => <option key={t} value={t}>{t === 'raw_material' ? (isAr ? "مادة خام" : "Raw Material") : (isAr ? "منتج" : "Product")}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "التكلفة/وحدة" : "Cost/Unit"}</label>
                                        <input type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المورد" : "Supplier"}</label>
                                        <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "الفئة" : "Category"}</label>
                                    <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.expiry_tracking} onChange={e => setForm({ ...form, expiry_tracking: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-300 dark:border-zinc-600" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-zinc-400">{isAr ? "تتبع الصلاحية" : "Track Expiry"}</span>
                                    </label>
                                </div>
                                {form.expiry_tracking && (
                                    <div>
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "تاريخ الصلاحية" : "Expiry Date"}</label>
                                        <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700/50 transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {editId ? (isAr ? "حفظ التعديلات" : "Save Changes") : (isAr ? "إضافة" : "Add Item")}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== STOCK ADJUSTMENT MODAL ===== */}
            <AnimatePresence>
                {adjustModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setAdjustModal(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{isAr ? "تعديل المخزون" : "Adjust Stock"}: {adjustModal?.name}</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex gap-2">
                                    <button onClick={() => setAdjustAction('add')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${adjustAction === 'add' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border border-transparent'}`}>
                                        <ArrowUpCircle className="w-4 h-4" /> {isAr ? "إضافة" : "Add"}
                                    </button>
                                    <button onClick={() => setAdjustAction('deduct')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${adjustAction === 'deduct' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20' : 'bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border border-transparent'}`}>
                                        <ArrowDownCircle className="w-4 h-4" /> {isAr ? "خصم" : "Deduct"}
                                    </button>
                                </div>
                                <input type="number" value={adjustQty} onChange={e => setAdjustQty(parseFloat(e.target.value) || 0)} placeholder={isAr ? "الكمية" : "Quantity"}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none text-center text-2xl font-extrabold" />
                                <input value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder={isAr ? "ملاحظات (اختياري)" : "Notes (optional)"}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setAdjustModal(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleAdjust} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-bold rounded-xl shadow-lg transition">{isAr ? "تأكيد" : "Confirm"}</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== PRINT SETTINGS MODAL ===== */}
            <AnimatePresence>
                {showPrintModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 scrollbar-hide" onClick={() => setShowPrintModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                            
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800/50 bg-slate-50 dark:bg-white/5">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Printer className="w-6 h-6 text-indigo-600 dark:text-emerald-400" />
                                        {isAr ? "إعدادات طباعة الجرد" : "Stocktake Print Settings"}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">{isAr ? "حدد الأصناف التي ترغب في تضمينها في التقرير" : "Select items to include in the report"}</p>
                                </div>
                                <button onClick={() => setShowPrintModal(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"><X className="w-5 h-5" /></button>
                            </div>

                            {/* Modal Search & Quick Selection */}
                            <div className="p-4 border-b border-slate-100 dark:border-zinc-800/30 space-y-3">
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                                    <input value={printSearch} onChange={e => setPrintSearch(e.target.value)}
                                        placeholder={isAr ? "بحث سريع..." : "Quick search..."}
                                        className="w-full pe-10 ps-4 py-2 bg-slate-100 dark:bg-black/20 border border-transparent focus:border-indigo-500/50 rounded-xl text-sm outline-none" />
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    <button onClick={() => setSelectedIds(items.filter(i => i.item_type === 'raw_material').map(i => i.id))}
                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-500/20 whitespace-nowrap">
                                        {isAr ? "📦 كل الخامات" : "All Raw Materials"}
                                    </button>
                                    <button onClick={() => setSelectedIds(items.filter(i => i.item_type === 'product').map(i => i.id))}
                                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-500/20 whitespace-nowrap">
                                        {isAr ? "🍔 كل المنتجات" : "All Products"}
                                    </button>
                                    <button onClick={() => setSelectedIds(items.filter(i => i.quantity <= i.minimum_stock).map(i => i.id))}
                                        className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold border border-amber-100 dark:border-amber-500/20 whitespace-nowrap">
                                        {isAr ? "⚠️ نواقص" : "Low Stock"}
                                    </button>
                                    <div className="flex-1" />
                                    <button onClick={toggleSelectAll} className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-extrabold whitespace-nowrap">
                                        {selectedIds.length === filtered.length ? (isAr ? "إلغاء الكل" : "Deselect All") : (isAr ? "تحديد الكل" : "Select All")}
                                    </button>
                                </div>
                            </div>

                            {/* Modal Item List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50 dark:bg-black/10">
                                {items.filter(i => {
                                    if (!printSearch) return true;
                                    const q = printSearch.toLowerCase();
                                    return i.name.toLowerCase().includes(q) || 
                                           (i.category?.toLowerCase() || "").includes(q);
                                }).map(item => {
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <div key={item.id} onClick={() => toggleSelect(item.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${isSelected ? 'bg-indigo-50 dark:bg-emerald-500/10 border-indigo-200 dark:border-emerald-500/30' : 'bg-white dark:bg-card border-slate-200 dark:border-zinc-800/50 hover:border-slate-300 dark:hover:border-zinc-700'}`}>
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${isSelected ? 'bg-indigo-600 border-indigo-600 dark:bg-emerald-500 dark:border-emerald-500' : 'border-slate-300 dark:border-zinc-600'}`}>
                                                {isSelected && <Save className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm ${isSelected ? 'text-indigo-900 dark:text-emerald-300' : 'text-slate-700 dark:text-zinc-300'}`}>{item.name}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase">{item.item_type === 'raw_material' ? (isAr ? "مادة خام" : "Raw Material") : (isAr ? "منتج" : "Product")} {item.category ? `· ${item.category}` : ''}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{displayQtyInfo(item.quantity, item.unit).qty} {displayQtyInfo(item.quantity, item.unit).unit}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex items-center justify-between gap-4 bg-white dark:bg-card">
                                <div className="text-sm">
                                    <span className="text-slate-500 dark:text-zinc-500 font-bold">{isAr ? "تم تحديد: " : "Selected: "}</span>
                                    <span className="font-black text-indigo-600 dark:text-emerald-400 text-lg">{selectedIds.length}</span>
                                    <span className="text-slate-400 dark:text-zinc-600 ml-1"> / {items.length}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowPrintModal(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                    <button onClick={handlePrint}
                                        className="px-10 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 dark:from-emerald-500 dark:to-cyan-500 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition active:scale-95 flex items-center gap-2">
                                        <Printer className="w-5 h-5" /> {isAr ? "بدء الطباعة" : "Start Printing"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
