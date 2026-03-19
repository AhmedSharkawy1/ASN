"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    Warehouse, ArrowLeft, ArrowRight, CalendarDays, DollarSign, Package,
    CreditCard, Save, Users, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";
import { renderReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { getPrinterSettings } from "@/lib/helpers/printerSettings";
import { executePrint } from "@/lib/helpers/printEngine";

/* ── Types ── */
type BranchSupplyItem = {
    title: string;
    qty: number;
    price: number;
    unit: string;
};

type OrderDetail = {
    id: string;
    order_number: number;
    customer_name: string | null;
    customer_phone: string | null;
    total: number;
    deposit_amount: number;
    items: BranchSupplyItem[];
    created_at: string;
    notes: string | null;
};

export default function BranchSupplyDetailsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const params = useParams();
    const orderId = params.id as string;
    const isAr = language === "ar";

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Payment modal
    const [showPayment, setShowPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);

    const fetchData = useCallback(async () => {
        if (!orderId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, customer_phone, total, deposit_amount, items, created_at, notes')
            .eq('id', orderId)
            .single();

        if (error) {
            toast.error(isAr ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data");
        } else {
            setOrder(data as OrderDetail);
        }
        setLoading(false);
    }, [orderId, isAr]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRecordPayment = async () => {
        if (!restaurantId || !order || paymentAmount <= 0) return;

        const newDeposit = (order.deposit_amount || 0) + paymentAmount;
        const newRemaining = order.total - newDeposit;

        const updates: Record<string, unknown> = { deposit_amount: newDeposit };
        if (newRemaining <= 0) {
            updates.payment_method = 'cash';
        }

        const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(isAr ? "تم تسجيل الدفعة بنجاح" : " payment recorded successfully");
            setShowPayment(false);
            setPaymentAmount(0);
            fetchData();
        }
    };

    const handlePrintInvoice = async () => {
        if (!restaurantId || !order) return;

        const { data: rest } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();

        const orderObj = {
            ...order,
            source: 'branch_supply',
            order_number: order.order_number || 0,
            total: order.total,
            discount: 0,
            payment_method: order.total - order.deposit_amount > 0 ? 'deposit' : 'cash',
            items: order.items || []
        };

        const html = renderReceiptHtml(orderObj, rest, isAr);
        const settings = getPrinterSettings();
        executePrint(html, settings);
    };

    const formatCurrency = (v: number) => `${v.toLocaleString()} ج.م`;
    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        catch { return d; }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
    if (!order) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500">{isAr ? "لم يتم العثور على التوريد" : "Order not found"}</div>;

    const remaining = Math.max(0, order.total - order.deposit_amount);
    const isPaid = remaining <= 0;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Back + Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/branch-supplies"
                    className="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                    {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <Warehouse className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        {isAr ? "تفاصيل توريد الفرع" : "Branch Supply Details"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">#{order.order_number} | ID: {orderId.split('-')[0].toUpperCase()}</p>
                </div>
                {!isPaid && (
                    <button onClick={() => setShowPayment(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition active:scale-95">
                        <DollarSign className="w-4 h-4" /> {isAr ? "تسجيل دفعة" : "Record Payment"}
                    </button>
                )}
                <button onClick={() => handlePrintInvoice()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition active:scale-95">
                    <Printer className="w-4 h-4" /> {isAr ? "طباعة" : "Print"}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{isAr ? "الفرع / العميل" : "Branch / Customer"}</p>
                    </div>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-zinc-200">{order.customer_name || "—"}</p>
                    {order.customer_phone && <p className="text-xs text-slate-500 dark:text-zinc-500" dir="ltr">{order.customer_phone}</p>}
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{isAr ? "تاريخ المنصرف" : "Date Issued"}</p>
                    </div>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-zinc-200 text-sm">{formatDate(order.created_at)}</p>
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "إجمالي القيمة" : "Total Value"}</p>
                    <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(order.total)}</p>
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "المتبقي (آجل)" : "Remaining Credit"}</p>
                    <p className={`text-2xl font-extrabold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPaid ? (isAr ? "✅ مدفوع بالكامل" : "✅ Fully Paid") : formatCurrency(remaining)}
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800/50 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{isAr ? "الأصناف المنصرفة" : "Items Issued"}</h2>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 px-2 py-0.5 rounded-full">{order.items?.length || 0}</span>
                </div>
                {!order.items || order.items.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-zinc-600">{isAr ? "لا توجد أصناف" : "No items"}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "الصنف" : "Item", isAr ? "الكمية" : "Qty", isAr ? "سعر الوحدة" : "Unit Price", isAr ? "الإجمالي" : "Total"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-slate-100 dark:border-zinc-800/30">
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{item.title}</td>
                                    <td className="px-4 py-3 font-extrabold text-slate-700 dark:text-zinc-300">
                                        {item.qty} <span className="text-[10px] text-slate-400">{item.unit}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{formatCurrency(item.price)}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-zinc-300">{formatCurrency(item.price * item.qty)}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 dark:bg-black/20">
                                <td colSpan={3} className="px-4 py-3 text-end font-extrabold text-slate-600 dark:text-zinc-400">{isAr ? "الإجمالي" : "Total"}</td>
                                <td className="px-4 py-3 font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(order.total)}</td>
                            </tr>
                            <tr className="bg-emerald-50/30 dark:bg-emerald-500/5">
                                <td colSpan={3} className="px-4 py-3 text-end font-extrabold text-emerald-600 dark:text-emerald-500">{isAr ? "المدفوع" : "Paid"}</td>
                                <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-500">{formatCurrency(order.deposit_amount)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "ملاحظات" : "Notes"}</p>
                    <p className="text-slate-700 dark:text-zinc-300">{order.notes}</p>
                </div>
            )}

            {/* ===== PAYMENT MODAL ===== */}
            <AnimatePresence>
                {showPayment && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    {isAr ? "تسجيل دفعة" : "Record Payment"}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
                                    {isAr ? "الباقي (آجل):" : "Remaining Credit:"} <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(remaining)}</span>
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ المدفوع حالياً" : "Amount to Pay Now"} *</label>
                                    <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} min="0" max={remaining}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none text-center text-2xl font-extrabold" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setShowPayment(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
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
