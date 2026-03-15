"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

import {
    Plus, Search, Trash2, X, Save,
    Package, CalendarDays, Users, PlusCircle, Warehouse, Eye, Printer, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getFactoryPrintStyles } from "@/lib/helpers/printerSettings";

/* ── Types ── */
type BranchSupplyItem = {
    title: string;
    qty: number;
    price: number;
    unit: string;
}

type OrderRecord = {
    id: string; 
    customer_name: string; 
    customer_phone: string | null;
    total: number;
    deposit_amount: number;
    items: BranchSupplyItem[];
    created_at: string;
    notes: string | null;
};
type Customer = { id: string; name: string; phone: string | null; };
type InventoryItem = { id: string; name: string; unit: string; cost_per_unit: number };

/* ── Empty form ── */
const emptyLineItem = { inventory_item_id: '', item_name: '', quantity: 0, unit_cost: 0 };

export default function BranchSuppliesPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    /* ── State ── */
    const [supplies, setSupplies] = useState<OrderRecord[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Create supply modal
    const [showCreate, setShowCreate] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [lineItems, setLineItems] = useState<{ inventory_item_id: string; item_name: string; quantity: number; unit_cost: number; unit: string }[]>([{ ...emptyLineItem, unit: '' }]);
    const [amountPaid, setAmountPaid] = useState(0);
    const [supplyNotes, setSupplyNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Add customer modal
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    /* ── Fetch ── */
    const fetchSupplies = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        // Outgoing branch supplies are stored in the orders table
        const { data } = await supabase
            .from('orders')
            .select('id, customer_name, customer_phone, total, deposit_amount, items, created_at, notes')
            .eq('restaurant_id', restaurantId)
            .eq('source', 'branch_supply')
            .order('created_at', { ascending: false });
        setSupplies((data as OrderRecord[]) || []);
        setLoading(false);
    }, [restaurantId]);

    const fetchCustomers = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('customers').select('id, name, phone').eq('restaurant_id', restaurantId).order('name');
        setCustomers((data as Customer[]) || []);
    }, [restaurantId]);

    const fetchInventoryItems = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('inventory_items').select('id, name, unit, cost_per_unit').eq('restaurant_id', restaurantId).eq('is_active', true).order('name');
        setInventoryItems((data as InventoryItem[]) || []);
    }, [restaurantId]);

    useEffect(() => { fetchSupplies(); fetchCustomers(); fetchInventoryItems(); }, [fetchSupplies, fetchCustomers, fetchInventoryItems]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: supplies.length,
        totalCost: supplies.reduce((s, sup) => s + (sup.total || 0), 0),
        totalPaid: supplies.reduce((s, sup) => s + (sup.deposit_amount || 0), 0),
        totalRemaining: supplies.reduce((s, sup) => s + Math.max(0, (sup.total || 0) - (sup.deposit_amount || 0)), 0),
    }), [supplies]);

    /* ── Filtered ── */
    const filtered = useMemo(() => {
        if (!search) return supplies;
        const q = search.toLowerCase();
        return supplies.filter(s => s.customer_name?.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q));
    }, [supplies, search]);

    /* ── Line item helpers ── */
    const updateLineItem = (index: number, field: keyof typeof lineItems[0], value: string | number) => {
        setLineItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            // If inventory item changed, populate name and cost
            if (field === 'inventory_item_id') {
                const inv = inventoryItems.find(ii => ii.id === value);
                if (inv) {
                    updated.item_name = inv.name;
                    updated.unit_cost = inv.cost_per_unit;
                    updated.unit = inv.unit;
                }
            }
            return updated;
        }));
    };

    const addLineItem = () => setLineItems(prev => [...prev, { ...emptyLineItem, unit: '' }]);
    const removeLineItem = (index: number) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const lineTotal = useMemo(() => lineItems.reduce((s, li) => s + li.quantity * li.unit_cost, 0), [lineItems]);

    /* ── Create supply ── */
    const handleCreateSupply = async () => {
        if (!restaurantId || !selectedCustomerId || lineItems.length === 0) return;
        const validItems = lineItems.filter(li => li.inventory_item_id && li.quantity > 0);
        if (validItems.length === 0) { toast.error(isAr ? "أضف صنف واحد على الأقل" : "Add at least one item"); return; }

        setSaving(true);
        const customer = customers.find(c => c.id === selectedCustomerId);
        
        try {
            const processRes = await fetch('/api/branch-supply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    customer_id: selectedCustomerId,
                    customer_name: customer?.name || "Branch Transfer",
                    customer_phone: customer?.phone,
                    items: validItems.map(i => ({
                        inventory_item_id: i.inventory_item_id,
                        title: i.item_name,
                        qty: i.quantity,
                        price: i.unit_cost,
                        unit: i.unit
                    })),
                    deposit_amount: amountPaid,
                    notes: supplyNotes
                })
            });
            const result = await processRes.json();
            
            if (result.success) {
                toast.success(isAr ? "تم إنشاء التوريد بنجاح" : "Supply created successfully");
                resetCreateForm();
                fetchSupplies();
            } else {
                toast.error(result.error || (isAr ? "خطأ" : "Error"));
            }
        } catch (e: unknown) {
             toast.error(e instanceof Error ? e.message : (isAr ? "خطأ" : "Error"));
        } finally {
            setSaving(false);
        }
    };

    const resetCreateForm = () => {
        setShowCreate(false);
        setSelectedCustomerId("");
        setLineItems([{ ...emptyLineItem, unit: '' }]);
        setAmountPaid(0);
        setSupplyNotes("");
    };

    /* ── Add customer ── */
    const handleAddCustomer = async () => {
        if (!restaurantId || !newCustomerName.trim()) return;
        const { data, error } = await supabase.from('customers').insert({
            restaurant_id: restaurantId,
            name: newCustomerName.trim(),
            phone: newCustomerPhone.trim() || null,
        }).select('id').single();

        if (error) { toast.error(error.message); return; }
        toast.success(isAr ? "تم إضافة العميل/الفرع" : "Customer/Branch added");
        setShowAddCustomer(false);
        setNewCustomerName(""); setNewCustomerPhone("");
        fetchCustomers();
        if (data) setSelectedCustomerId(data.id);
    };

    /* ── Delete ── */
    const handleDelete = async (orderId: string) => {
        if (!restaurantId) return;
        if (!confirm(isAr ? "هل تريد حذف هذا التوريد؟ ستظل الكميات المخصومة من المخزن محذوفة." : "Delete this transfer? Stock deductions will NOT be automatically reverted.")) return;
        
        // As a quick implementation, we just delete the order. Real systems might need complex reversal.
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if (!error) {
            toast.success(isAr ? "تم الحذف" : "Deleted");
            fetchSupplies();
        } else {
            toast.error(error.message);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) return;

        const tableRows = filtered.map(s => {
            const remaining = Math.max(0, s.total - s.deposit_amount);
            return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${s.customer_name || '—'}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${formatCurrency(s.total)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; color: #059669;">${formatCurrency(s.deposit_amount)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626;">${formatCurrency(remaining)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatDate(s.created_at)}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <title>${isAr ? 'تقرير توريدات الفروع' : 'Branch Supplies Report'}</title>
                <style>
                    ${getFactoryPrintStyles(isAr ? 'rtl' : 'ltr')}
                    table { border: 1px solid #e2e8f0; margin-top: 20px; }
                    th { border: 1px solid #e2e8f0; background: #f8fafc; }
                </style>
            </head>
            <body>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 3px solid #0f172a; padding-bottom: 10px;">
                    <div>
                        <h1 style="margin: 0;">${isAr ? 'تقرير توريدات الفروع' : 'Branch Supplies Report'}</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-weight: bold;">${isAr ? 'إجمالي الدين (الآجل): ' : 'Total Remaining Credit: '}${formatCurrency(stats.totalRemaining)}</p>
                    </div>
                    <div style="text-align: ${isAr ? 'left' : 'right'};">
                        <p style="margin: 0; font-weight: bold;">${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">${isAr ? 'عدد العمليات: ' : 'Total Issues: '}${filtered.length}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="padding: 10px;">${isAr ? 'الفرع / العميل' : 'Branch/Customer'}</th>
                            <th style="padding: 10px;">${isAr ? 'القيمة الإجمالية' : 'Total Value'}</th>
                            <th style="padding: 10px;">${isAr ? 'المدفوع نقداً' : 'Paid Cash'}</th>
                            <th style="padding: 10px;">${isAr ? 'المتبقي (آجل)' : 'Remaining (Credit)'}</th>
                            <th style="padding: 10px;">${isAr ? 'التاريخ' : 'Date'}</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const handleExportExcel = () => {
        const headers = isAr 
            ? ["الفرع / العميل", "القيمة", "المدفوع", "المتبقي", "التاريخ", "ملاحظات"]
            : ["Branch/Customer", "Value", "Paid", "Remaining", "Date", "Notes"];
        
        const rows = filtered.map(s => [
            s.customer_name || "",
            s.total,
            s.deposit_amount,
            Math.max(0, s.total - s.deposit_amount),
            s.created_at,
            s.notes || ""
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Branch_Supplies_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /* ── Format ── */
    const formatCurrency = (v: number) => `${v.toLocaleString()} ج.م`;
    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return d; }
    };

    if (loading && supplies.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <Warehouse className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        {isAr ? "توريدات الفروع" : "Branch Supplies"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "صرف بضاعة من المخزن للفروع أو العملاء كطلب آجل" : "Issue inventory items to branches or customers on credit"}</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                    <button onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                        <Printer className="w-5 h-5" /> {isAr ? "طباعة" : "Print"}
                    </button>
                    <button onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
                        <Download className="w-5 h-5" /> {isAr ? "تصدير Excel" : "Excel Export"}
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-500 dark:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                        <Plus className="w-5 h-5" /> {isAr ? "صرف جديد" : "New Issue"}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي المنصرف" : "Total Issues", value: stats.total, color: "text-slate-700 dark:text-zinc-300", isCurrency: false },
                    { label: isAr ? "قيمة المنصرف" : "Total Value", value: stats.totalCost, color: "text-blue-600 dark:text-blue-400", isCurrency: true },
                    { label: isAr ? "المدفوع نقداً" : "Paid Cash", value: stats.totalPaid, color: "text-emerald-600 dark:text-emerald-400", isCurrency: true },
                    { label: isAr ? "الدين (الآجل)" : "Remaining Credit", value: stats.totalRemaining, color: "text-red-600 dark:text-red-400", isCurrency: true },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.isCurrency ? formatCurrency(s.value as number) : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={isAr ? "بحث بالمورد..." : "Search by supplier..."}
                    className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none" />
            </div>

            {/* Supplies Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد توريدات" : "No supplies found"}</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "الفرع / العميل" : "Branch/Customer", isAr ? "القيمة" : "Value", isAr ? "المدفوع" : "Paid", isAr ? "المتبقي" : "Remaining", isAr ? "تاريخ المنصرف" : "Issue Date", isAr ? "إجراءات" : "Actions"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(supply => {
                                const remaining = Math.max(0, supply.total - supply.deposit_amount);
                                const isPaid = remaining <= 0;
                                return (
                                    <tr key={supply.id} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                {supply.customer_name || "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-extrabold text-slate-700 dark:text-zinc-300">{formatCurrency(supply.total)}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(supply.deposit_amount)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isPaid
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {isPaid ? (isAr ? "مدفوع بالكامل" : "Fully Paid") : formatCurrency(remaining)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                                            <CalendarDays className="w-3.5 h-3.5" /> {formatDate(supply.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Link href={`/dashboard/branch-supplies/${supply.id}`}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition" title={isAr ? "تفاصيل" : "Details"}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(supply.id)}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition" title={isAr ? "حذف التوريد" : "Delete"}>
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

            {/* ===== CREATE SUPPLY MODAL ===== */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={resetCreateForm}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{isAr ? "صرف بضاعة لفرع" : "Issue Branch Supply"}</h2>
                                <button onClick={resetCreateForm} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Supplier Selection */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "الفرع / العميل المستلم" : "Branch/Customer"} *</label>
                                    <div className="flex gap-2">
                                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                            <option value="">{isAr ? "اختر العميل/الفرع..." : "Select customer/branch..."}</option>
                                            {customers.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>)}
                                        </select>
                                        <button onClick={() => setShowAddCustomer(true)}
                                            className="px-3 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-xl border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition" title={isAr ? "إضافة فرع جديد" : "Add New Branch"}>
                                            <PlusCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>



                                {/* Line Items */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-600 dark:text-zinc-400">{isAr ? "الأصناف" : "Items"} *</label>
                                        <button onClick={addLineItem} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                                            <Plus className="w-3 h-3" /> {isAr ? "إضافة صنف" : "Add Item"}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {lineItems.map((li, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-slate-50 dark:bg-black/20 rounded-xl p-3 border border-slate-100 dark:border-zinc-800/30">
                                                <select value={li.inventory_item_id} onChange={e => updateLineItem(idx, 'inventory_item_id', e.target.value)}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none appearance-none">
                                                    <option value="">{isAr ? "اختر الصنف من المخزن..." : "Select inventory item..."}</option>
                                                    {inventoryItems.map(ii => <option key={ii.id} value={ii.id}>{ii.name} ({ii.unit})</option>)}
                                                </select>
                                                <input type="number" value={li.quantity || ''} onChange={e => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                                    placeholder={isAr ? "الكمية" : "Qty"} min="0"
                                                    className="w-24 px-3 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none text-center" />
                                                <input type="number" value={li.unit_cost || ''} onChange={e => updateLineItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                    placeholder={isAr ? "سعر الوحدة" : "Unit Cost"} min="0" step="0.01"
                                                    className="w-28 px-3 py-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-700/50 rounded-lg text-sm text-slate-900 dark:text-white outline-none text-center" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-500 dark:text-zinc-500 whitespace-nowrap">{formatCurrency(li.quantity * li.unit_cost)}</span>
                                                    {lineItems.length > 1 && (
                                                        <button onClick={() => removeLineItem(idx)} className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <span className="text-base font-extrabold text-slate-900 dark:text-white">{isAr ? "الإجمالي:" : "Total:"} {formatCurrency(lineTotal)}</span>
                                    </div>
                                </div>

                                {/* Amount Paid */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ المدفوع" : "Amount Paid"}</label>
                                    <input type="number" value={amountPaid || ''} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} min="0"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                    {amountPaid > 0 && (
                                        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
                                            {isAr ? "المتبقي:" : "Remaining:"} <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(Math.max(0, lineTotal - amountPaid))}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <input value={supplyNotes} onChange={e => setSupplyNotes(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={resetCreateForm} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-700/50 transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleCreateSupply} disabled={saving}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save className="w-4 h-4" /> {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "تأكيد الصرف" : "Confirm Issue")}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== ADD CUSTOMER MODAL ===== */}
            <AnimatePresence>
                {showAddCustomer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowAddCustomer(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{isAr ? "إضافة فرع/عميل جديد" : "Add New Customer/Branch"}</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "اسم الفرع/العميل" : "Name"} *</label>
                                    <input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "رقم الهاتف" : "Phone"}</label>
                                    <input value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} dir="ltr"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setShowAddCustomer(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleAddCustomer} className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {isAr ? "إضافة" : "Add"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
