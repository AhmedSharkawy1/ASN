"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { createSupply, recordSupplyPayment, deleteSupply } from "@/lib/helpers/supplyService";
import type { SupplyItemInput } from "@/lib/helpers/supplyService";
import {
    Truck, Plus, Search, Eye, Trash2, X, Save, DollarSign,
    Package, CalendarDays, CreditCard, Users, PlusCircle, Printer, Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { getFactoryPrintStyles, getPrinterSettings } from "@/lib/helpers/printerSettings";
import { renderReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { executePrint } from "@/lib/helpers/printEngine";

/* ── Types ── */
type Supplier = { id: string; name: string; phone: string | null; notes: string | null };
type Supply = {
    id: string; supplier_id: string; total_cost: number; amount_paid: number;
    remaining_balance: number; delivery_date: string; notes: string | null; created_at: string;
    suppliers?: { name: string; phone: string | null } | null;
    items?: any[];
};
type InventoryItem = { id: string; name: string; unit: string; cost_per_unit: number };

/* ── Empty form ── */
const emptyLineItem = { inventory_item_id: '', item_name: '', quantity: 0, unit_cost: 0 };

export default function SuppliesPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    /* ── State ── */
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Create supply modal
    const [showCreate, setShowCreate] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [lineItems, setLineItems] = useState<SupplyItemInput[]>([{ ...emptyLineItem }]);
    const [amountPaid, setAmountPaid] = useState(0);
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [supplyNotes, setSupplyNotes] = useState("");
    const [saving, setSaving] = useState(false);

    // Add supplier modal
    const [showAddSupplier, setShowAddSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");
    const [newSupplierNotes, setNewSupplierNotes] = useState("");

    // Payment modal
    const [paymentModal, setPaymentModal] = useState<{ supplyId: string; supplierId: string; remaining: number } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState("");

    /* ── Fetch ── */
    const fetchSupplies = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        const { data } = await supabase
            .from('supplies')
            .select('*, suppliers(name, phone), items:supply_items(*)')
            .eq('restaurant_id', restaurantId)
            .order('delivery_date', { ascending: false });
        setSupplies((data as Supply[]) || []);
        setLoading(false);
    }, [restaurantId]);

    const fetchSuppliers = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).order('name');
        setSuppliers((data as Supplier[]) || []);
    }, [restaurantId]);

    const fetchInventoryItems = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('inventory_items').select('id, name, unit, cost_per_unit').eq('restaurant_id', restaurantId).eq('is_active', true).order('name');
        setInventoryItems((data as InventoryItem[]) || []);
    }, [restaurantId]);

    useEffect(() => { fetchSupplies(); fetchSuppliers(); fetchInventoryItems(); }, [fetchSupplies, fetchSuppliers, fetchInventoryItems]);

    // Realtime
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase
            .channel(`supplies-${restaurantId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'supplies', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchSupplies())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, fetchSupplies]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: supplies.length,
        totalCost: supplies.reduce((s, sup) => s + (sup.total_cost || 0), 0),
        totalPaid: supplies.reduce((s, sup) => s + (sup.amount_paid || 0), 0),
        totalRemaining: supplies.reduce((s, sup) => s + (sup.remaining_balance || 0), 0),
    }), [supplies]);

    /* ── Filtered ── */
    const filtered = useMemo(() => {
        if (!search) return supplies;
        const q = search.toLowerCase();
        return supplies.filter(s => s.suppliers?.name?.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q));
    }, [supplies, search]);

    /* ── Line item helpers ── */
    const updateLineItem = (index: number, field: keyof SupplyItemInput, value: string | number) => {
        setLineItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            // If inventory item changed, populate name and cost
            if (field === 'inventory_item_id') {
                const inv = inventoryItems.find(ii => ii.id === value);
                if (inv) {
                    updated.item_name = inv.name;
                    updated.unit_cost = inv.cost_per_unit;
                }
            }
            return updated;
        }));
    };

    const addLineItem = () => setLineItems(prev => [...prev, { ...emptyLineItem }]);
    const removeLineItem = (index: number) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const lineTotal = useMemo(() => lineItems.reduce((s, li) => s + li.quantity * li.unit_cost, 0), [lineItems]);

    /* ── Create supply ── */
    const handleCreateSupply = async () => {
        if (!restaurantId || !selectedSupplierId || lineItems.length === 0) return;
        const validItems = lineItems.filter(li => li.inventory_item_id && li.quantity > 0);
        if (validItems.length === 0) { toast.error(isAr ? "أضف صنف واحد على الأقل" : "Add at least one item"); return; }

        setSaving(true);
        const result = await createSupply(restaurantId, selectedSupplierId, validItems, amountPaid, deliveryDate, supplyNotes);
        setSaving(false);

        if (result.success) {
            toast.success(isAr ? "تم إنشاء التوريد بنجاح" : "Supply created successfully");
            resetCreateForm();
            fetchSupplies();
        } else {
            toast.error(result.error || (isAr ? "خطأ" : "Error"));
        }
    };

    const resetCreateForm = () => {
        setShowCreate(false);
        setSelectedSupplierId("");
        setLineItems([{ ...emptyLineItem }]);
        setAmountPaid(0);
        setDeliveryDate(new Date().toISOString().split('T')[0]);
        setSupplyNotes("");
    };

    /* ── Add supplier ── */
    const handleAddSupplier = async () => {
        if (!restaurantId || !newSupplierName.trim()) return;
        const { data, error } = await supabase.from('suppliers').insert({
            restaurant_id: restaurantId,
            name: newSupplierName.trim(),
            phone: newSupplierPhone.trim() || null,
            notes: newSupplierNotes.trim() || null,
        }).select('id').single();

        if (error) { toast.error(error.message); return; }
        toast.success(isAr ? "تم إضافة المورد" : "Supplier added");
        setShowAddSupplier(false);
        setNewSupplierName(""); setNewSupplierPhone(""); setNewSupplierNotes("");
        fetchSuppliers();
        if (data) setSelectedSupplierId(data.id);
    };

    /* ── Record payment ── */
    const handleRecordPayment = async () => {
        if (!restaurantId || !paymentModal || paymentAmount <= 0) return;
        const result = await recordSupplyPayment(
            restaurantId, paymentModal.supplyId, paymentModal.supplierId,
            paymentAmount, paymentDate, paymentNotes
        );
        if (result.success) {
            toast.success(isAr ? "تم تسجيل الدفعة" : "Payment recorded");
            setPaymentModal(null); setPaymentAmount(0); setPaymentNotes("");
            fetchSupplies();
        } else {
            toast.error(result.error || (isAr ? "خطأ" : "Error"));
        }
    };

    /* ── Delete ── */
    const handleDelete = async (supplyId: string) => {
        if (!restaurantId) return;
        if (!confirm(isAr ? "هل تريد حذف هذا التوريد؟ سيتم عكس تعديلات المخزون." : "Delete this supply? Inventory changes will be reversed.")) return;
        const result = await deleteSupply(restaurantId, supplyId);
        if (result.success) {
            toast.success(isAr ? "تم الحذف" : "Deleted");
            fetchSupplies();
        } else {
            toast.error(result.error || (isAr ? "خطأ" : "Error"));
        }
    };

    const handlePrint = () => {
        const s = getPrinterSettings();
        const isSmall = s.paperWidth !== 'A4';
        const printWindow = window.open('', '_blank', isSmall ? `width=400,height=800` : 'width=1000,height=700');
        if (!printWindow) return;

        const recordsHtml = filtered.map((sup, idx) => {
            const itemsHtml = (sup.items || []).map(item => `
                <tr style="border-bottom: 1px dotted #e2e8f0; font-size: 11px;">
                    <td style="padding: 4px 0; text-align: ${isAr ? 'right' : 'left'}; font-weight: 900;">${item.item_name}</td>
                    <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
                    <td style="padding: 4px 0; text-align: ${isAr ? 'left' : 'right'}; font-weight: 900;">${(item.total_cost || 0).toLocaleString()}</td>
                </tr>
            `).join('');

            return `
                <div style="margin-bottom: 25px; border: 2px solid #000; padding: 12px; border-radius: 8px; page-break-inside: avoid; background: #fff; color: #000;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 900;">${sup.suppliers?.name || '—'}</div>
                            ${sup.suppliers?.phone ? `<div style="font-size: 13px; font-weight: 900;">${sup.suppliers.phone}</div>` : ''}
                        </div>
                        <div style="text-align: ${isAr ? 'left' : 'right'};">
                            <div style="font-size: 14px; font-weight: 900;">${formatDate(sup.delivery_date)}</div>
                            <div style="font-size: 11px; font-weight: 900;">#${idx + 1} | ${sup.id.split('-')[0].toUpperCase()}</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                        <thead>
                            <tr style="border-bottom: 2px dashed #000; font-size: 12px; font-weight: 900;">
                                <th style="padding-bottom: 6px; text-align: ${isAr ? 'right' : 'left'};">${isAr ? 'الصنف' : 'Item'}</th>
                                <th style="padding-bottom: 6px; text-align: center;">${isAr ? 'الكمية' : 'Qty'}</th>
                                <th style="padding-bottom: 6px; text-align: ${isAr ? 'left' : 'right'};">${isAr ? 'الإجمالي' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                    </table>

                    <div style="display: flex; flex-direction: column; gap: 4px; border-top: 2px dashed #000; padding-top: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px;">
                            <span>${isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
                            <span>${sup.total_cost.toLocaleString()} ج.م</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px;">
                            <span>${isAr ? 'المدفوع:' : 'Paid:'}</span>
                            <span>${sup.amount_paid.toLocaleString()} ج.م</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
                            <span>${isAr ? 'المتبقي:' : 'Remaining:'}</span>
                            <span>${sup.remaining_balance.toLocaleString()} ج.م</span>
                        </div>
                    </div>

                    ${sup.notes ? `<div style="margin-top: 12px; padding: 8px; border: 1px dashed #000; border-radius: 6px; font-size: 12px; font-weight: 900;">${isAr ? 'ملاحظات: ' : 'Notes: '}${sup.notes}</div>` : ''}
                </div>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
            <head>
                <title>${isAr ? 'تقرير التوريدات' : 'Supplies Report'}</title>
                <style>
                    ${getFactoryPrintStyles(isAr ? 'rtl' : 'ltr')}
                    body { background: #fff; padding: 20px; color: #000; }
                    @media print { body { padding: 0.5cm; } .no-print { display: none; } }
                    * { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important; color: #000 !important; }
                </style>
            </head>
            <body>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 4px solid #000; padding-bottom: 15px;">
                    <div>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 900;">${isAr ? 'تقرير التوريدات' : 'Supplies Report'}</h1>
                        <div style="margin-top: 12px; border: 2px solid #000; padding: 8px 15px; border-radius: 8px; display: inline-block;">
                            <span style="font-size: 13px; font-weight: 900;">${isAr ? 'إجمالي المديونية:' : 'Total Debt:'}</span>
                            <span style="font-size: 20px; font-weight: 900; margin-right: 10px;">${stats.totalRemaining.toLocaleString()} ج.م</span>
                        </div>
                    </div>
                    <div style="text-align: ${isAr ? 'left' : 'right'};">
                        <div style="font-size: 16px; font-weight: 900;">${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
                        <div style="font-size: 14px; font-weight: 900; margin-top: 5px;">${isAr ? 'عدد العمليات: ' : 'Total Records: '}${filtered.length}</div>
                    </div>
                </div>
                <div>${recordsHtml}</div>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const handlePrintInvoice = async (supply: Supply) => {
        if (!restaurantId) return;

        const { data: rest } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();

        const orderObj = {
            ...supply,
            source: 'supplier_supply', // Specific label for suppliers
            order_number: 0,
            customer_name: supply.suppliers?.name,
            customer_phone: supply.suppliers?.phone,
            total: supply.total_cost,
            deposit_amount: supply.amount_paid,
            discount: 0,
            payment_method: supply.remaining_balance > 0 ? 'deposit' : 'cash',
            items: (supply.items || []).map(it => ({
                title: it.item_name,
                qty: it.quantity,
                price: it.unit_cost,
            }))
        };

        const html = renderReceiptHtml(orderObj, rest, isAr);
        const settings = getPrinterSettings();
        executePrint(html, settings);
    };

    const handleExportExcel = () => {
        const headers = isAr 
            ? ["المورد", "التكلفة", "المدفوع", "المتبقي", "التاريخ", "ملاحظات"]
            : ["Supplier", "Total Cost", "Paid", "Remaining", "Date", "Notes"];
        
        const rows = filtered.map(s => [
            s.suppliers?.name || "",
            s.total_cost,
            s.amount_paid,
            s.remaining_balance,
            s.delivery_date,
            s.notes || ""
        ]);

        const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Supplies_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
                        <Truck className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        {isAr ? "إدارة التوريدات" : "Supply Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "تتبع جميع المشتريات والتوريدات من الموردين" : "Track all purchases and deliveries from suppliers"}</p>
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
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                        <Plus className="w-5 h-5" /> {isAr ? "توريد جديد" : "New Supply"}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي التوريدات" : "Total Supplies", value: stats.total, color: "text-slate-700 dark:text-zinc-300", isCurrency: false },
                    { label: isAr ? "إجمالي التكلفة" : "Total Cost", value: stats.totalCost, color: "text-orange-600 dark:text-orange-400", isCurrency: true },
                    { label: isAr ? "إجمالي المدفوع" : "Total Paid", value: stats.totalPaid, color: "text-emerald-600 dark:text-emerald-400", isCurrency: true },
                    { label: isAr ? "إجمالي المتبقي" : "Total Remaining", value: stats.totalRemaining, color: "text-red-600 dark:text-red-400", isCurrency: true },
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
                                {[isAr ? "المورد" : "Supplier", isAr ? "التكلفة" : "Cost", isAr ? "المدفوع" : "Paid", isAr ? "المتبقي" : "Remaining", isAr ? "تاريخ التوريد" : "Delivery Date", isAr ? "إجراءات" : "Actions"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(supply => {
                                const isPaid = supply.remaining_balance <= 0;
                                return (
                                    <tr key={supply.id} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                                {supply.suppliers?.name || "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-extrabold text-slate-700 dark:text-zinc-300">{formatCurrency(supply.total_cost)}</td>
                                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(supply.amount_paid)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isPaid
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {isPaid ? (isAr ? "مدفوع بالكامل" : "Fully Paid") : formatCurrency(supply.remaining_balance)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                                            <CalendarDays className="w-3.5 h-3.5" /> {formatDate(supply.delivery_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handlePrintInvoice(supply)}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition" title={isAr ? "طباعة الفاتورة" : "Print Receipt"}>
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <Link href={`/dashboard/supplies/${supply.id}`}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition" title={isAr ? "عرض التفاصيل" : "View Details"}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                                {!isPaid && (
                                                    <button onClick={() => setPaymentModal({ supplyId: supply.id, supplierId: supply.supplier_id, remaining: supply.remaining_balance })}
                                                        className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition" title={isAr ? "تسجيل دفعة" : "Record Payment"}>
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(supply.id)}
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition" title={isAr ? "حذف" : "Delete"}>
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
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{isAr ? "توريد جديد" : "New Supply"}</h2>
                                <button onClick={resetCreateForm} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Supplier Selection */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المورد" : "Supplier"} *</label>
                                    <div className="flex gap-2">
                                        <select value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none appearance-none">
                                            <option value="">{isAr ? "اختر المورد..." : "Select supplier..."}</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>)}
                                        </select>
                                        <button onClick={() => setShowAddSupplier(true)}
                                            className="px-3 py-2.5 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition" title={isAr ? "إضافة مورد جديد" : "Add New Supplier"}>
                                            <PlusCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery Date */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "تاريخ التوريد" : "Delivery Date"}</label>
                                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
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
                                                    <option value="">{isAr ? "اختر الصنف..." : "Select item..."}</option>
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
                                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save className="w-4 h-4" /> {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "إنشاء التوريد" : "Create Supply")}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== ADD SUPPLIER MODAL ===== */}
            <AnimatePresence>
                {showAddSupplier && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setShowAddSupplier(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{isAr ? "إضافة مورد جديد" : "Add New Supplier"}</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "اسم المورد" : "Supplier Name"} *</label>
                                    <input value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "رقم الهاتف" : "Phone"}</label>
                                    <input value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} dir="ltr"
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <input value={newSupplierNotes} onChange={e => setNewSupplierNotes(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setShowAddSupplier(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleAddSupplier} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {isAr ? "إضافة" : "Add"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== PAYMENT MODAL ===== */}
            <AnimatePresence>
                {paymentModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPaymentModal(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    {isAr ? "تسجيل دفعة" : "Record Payment"}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
                                    {isAr ? "المتبقي:" : "Remaining:"} <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(paymentModal.remaining)}</span>
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ" : "Amount"} *</label>
                                    <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} min="0" max={paymentModal.remaining}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none text-center text-2xl font-extrabold" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "تاريخ الدفع" : "Payment Date"}</label>
                                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setPaymentModal(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleRecordPayment}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {isAr ? "تأكيد الدفع" : "Confirm Payment"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
