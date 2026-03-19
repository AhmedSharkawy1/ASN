"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { recordSupplyPayment } from "@/lib/helpers/supplyService";
import {
    Truck, ArrowLeft, ArrowRight, CalendarDays, DollarSign, Package,
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
type SupplyDetail = {
    id: string; supplier_id: string; total_cost: number; amount_paid: number;
    remaining_balance: number; delivery_date: string; notes: string | null; created_at: string;
    suppliers: { name: string; phone: string | null; notes: string | null } | null;
};
type SupplyItem = { id: string; item_name: string; quantity: number; unit_cost: number; total_cost: number; inventory_item_id: string | null };
type SupplyPayment = { id: string; amount: number; payment_date: string; notes: string | null; created_at: string };

export default function SupplyDetailsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const params = useParams();
    const supplyId = params.id as string;
    const isAr = language === "ar";

    const [supply, setSupply] = useState<SupplyDetail | null>(null);
    const [items, setItems] = useState<SupplyItem[]>([]);
    const [payments, setPayments] = useState<SupplyPayment[]>([]);
    const [loading, setLoading] = useState(true);

    // Payment modal
    const [showPayment, setShowPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState("");

    const fetchData = useCallback(async () => {
        if (!supplyId) return;
        setLoading(true);

        const [supplyRes, itemsRes, paymentsRes] = await Promise.all([
            supabase.from('supplies').select('*, suppliers(name, phone, notes)').eq('id', supplyId).single(),
            supabase.from('supply_items').select('*').eq('supply_id', supplyId),
            supabase.from('supply_payments').select('*').eq('supply_id', supplyId).order('payment_date', { ascending: false }),
        ]);

        if (supplyRes.data) setSupply(supplyRes.data as SupplyDetail);
        setItems((itemsRes.data as SupplyItem[]) || []);
        setPayments((paymentsRes.data as SupplyPayment[]) || []);
        setLoading(false);
    }, [supplyId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRecordPayment = async () => {
        if (!restaurantId || !supply || paymentAmount <= 0) return;
        const result = await recordSupplyPayment(restaurantId, supplyId, supply.supplier_id, paymentAmount, paymentDate, paymentNotes);
        if (result.success) {
            toast.success(isAr ? "تم تسجيل الدفعة" : "Payment recorded");
            setShowPayment(false); setPaymentAmount(0); setPaymentNotes("");
            fetchData();
        } else {
            toast.error(result.error || (isAr ? "خطأ" : "Error"));
        }
    };

    const handlePrintInvoice = async () => {
        if (!restaurantId || !supply) return;

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
            items: items.map(it => ({
                title: it.item_name,
                qty: it.quantity,
                price: it.unit_cost,
            }))
        };

        const html = renderReceiptHtml(orderObj, rest, isAr);
        const settings = getPrinterSettings();
        executePrint(html, settings);
    };

    const formatCurrency = (v: number) => `${v.toLocaleString()} ج.م`;
    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return d; }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
    if (!supply) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500">{isAr ? "لم يتم العثور على التوريد" : "Supply not found"}</div>;

    const isPaid = supply.remaining_balance <= 0;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Back + Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/supplies"
                    className="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                    {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <Truck className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                        {isAr ? "تفاصيل التوريد" : "Supply Details"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">ID: {supplyId.split('-')[0].toUpperCase()}</p>
                </div>
                {!isPaid && (
                    <button onClick={() => setShowPayment(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition active:scale-95">
                        <DollarSign className="w-4 h-4" /> {isAr ? "تسجيل دفعة" : "Record Payment"}
                    </button>
                )}
                <button onClick={handlePrintInvoice}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm hover:bg-slate-50 transition active:scale-95">
                    <Printer className="w-4 h-4" /> {isAr ? "طباعة" : "Print"}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{isAr ? "المورد" : "Supplier"}</p>
                    </div>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-zinc-200">{supply.suppliers?.name || "—"}</p>
                    {supply.suppliers?.phone && <p className="text-xs text-slate-500 dark:text-zinc-500" dir="ltr">{supply.suppliers.phone}</p>}
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CalendarDays className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{isAr ? "تاريخ التوريد" : "Delivery Date"}</p>
                    </div>
                    <p className="text-lg font-extrabold text-slate-800 dark:text-zinc-200">{formatDate(supply.delivery_date)}</p>
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "إجمالي التكلفة" : "Total Cost"}</p>
                    <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">{formatCurrency(supply.total_cost)}</p>
                </div>
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "المتبقي" : "Remaining"}</p>
                    <p className={`text-2xl font-extrabold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isPaid ? (isAr ? "✅ مدفوع" : "✅ Paid") : formatCurrency(supply.remaining_balance)}
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800/50 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{isAr ? "الأصناف المستلمة" : "Items Received"}</h2>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                {items.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-zinc-600">{isAr ? "لا توجد أصناف" : "No items"}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "الصنف" : "Item", isAr ? "الكمية" : "Qty", isAr ? "سعر الوحدة" : "Unit Cost", isAr ? "الإجمالي" : "Total"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} className="border-b border-slate-100 dark:border-zinc-800/30">
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{item.item_name}</td>
                                    <td className="px-4 py-3 font-extrabold text-slate-700 dark:text-zinc-300">{item.quantity}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{formatCurrency(item.unit_cost)}</td>
                                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-zinc-300">{formatCurrency(item.total_cost)}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 dark:bg-black/20">
                                <td colSpan={3} className="px-4 py-3 text-end font-extrabold text-slate-600 dark:text-zinc-400">{isAr ? "الإجمالي" : "Total"}</td>
                                <td className="px-4 py-3 font-extrabold text-orange-600 dark:text-orange-400">{formatCurrency(supply.total_cost)}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Payments History */}
            <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800/50 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{isAr ? "سجل المدفوعات" : "Payment History"}</h2>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 px-2 py-0.5 rounded-full">{payments.length}</span>
                </div>
                {payments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-zinc-600">{isAr ? "لا توجد مدفوعات" : "No payments"}</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "المبلغ" : "Amount", isAr ? "التاريخ" : "Date", isAr ? "ملاحظات" : "Notes"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id} className="border-b border-slate-100 dark:border-zinc-800/30">
                                    <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(payment.amount)}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{formatDate(payment.payment_date)}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{payment.notes || "—"}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50 dark:bg-black/20">
                                <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(supply.amount_paid)}</td>
                                <td colSpan={2} className="px-4 py-3 font-bold text-slate-500 dark:text-zinc-500">{isAr ? "إجمالي المدفوع" : "Total Paid"}</td>
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* Notes */}
            {supply.notes && (
                <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{isAr ? "ملاحظات" : "Notes"}</p>
                    <p className="text-slate-700 dark:text-zinc-300">{supply.notes}</p>
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
                                    {isAr ? "المتبقي:" : "Remaining:"} <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(supply.remaining_balance)}</span>
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ" : "Amount"} *</label>
                                    <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} min="0"
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
