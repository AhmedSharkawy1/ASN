"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { recordSupplyPayment } from "@/lib/helpers/supplyService";
import {
    Landmark, TrendingUp, TrendingDown, DollarSign, Search, Filter,
    CreditCard, Save, Users, ShoppingCart, CalendarDays, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

/* ── Types ── */
type OrderReceivable = {
    id: string; order_number: number; customer_name: string | null; customer_phone: string | null;
    total: number; deposit_amount: number; remaining: number; created_at: string; status: string;
};

type SupplierPayable = {
    supplier_id: string; supplier_name: string; supplier_phone: string | null;
    total_supplies_cost: number; total_paid: number; remaining: number; last_payment_date: string | null;
    supply_count: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupplyRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentRow = any;

export default function AccountsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    /* ── State ── */
    const [receivables, setReceivables] = useState<OrderReceivable[]>([]);
    const [payables, setPayables] = useState<SupplierPayable[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Customer payment modal
    const [customerPayModal, setCustomerPayModal] = useState<{ orderId: string; remaining: number; orderNumber: number } | null>(null);
    const [custPayAmount, setCustPayAmount] = useState(0);

    // Supplier payment modal
    const [supplierPayModal, setSupplierPayModal] = useState<{ supplierId: string; supplierName: string; remaining: number } | null>(null);
    const [suppPayAmount, setSuppPayAmount] = useState(0);
    const [suppPayDate, setSuppPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [suppPayNotes, setSuppPayNotes] = useState("");

    /* ── Fetch Receivables ── */
    const fetchReceivables = useCallback(async () => {
        if (!restaurantId) return;
        // Fetch all non-draft orders
        const { data: orders } = await supabase
            .from('orders')
            .select('id, order_number, customer_name, customer_phone, total, deposit_amount, created_at, status, payment_method')
            .eq('restaurant_id', restaurantId)
            .eq('is_draft', false)
            .order('created_at', { ascending: false });

        const mapped: OrderReceivable[] = (orders || [])
            .map(o => {
                const isCashEquivalent = ['cash', 'visa', 'card', 'online', 'bank', 'كاش', 'فيزا', 'بطاقة'].includes((o.payment_method || '').toLowerCase());
                
                let remaining = 0;
                if (o.deposit_amount !== null && o.deposit_amount !== undefined) {
                    remaining = (o.total || 0) - o.deposit_amount;
                } else {
                    remaining = isCashEquivalent ? 0 : (o.total || 0);
                }

                return {
                    ...o,
                    deposit_amount: o.deposit_amount || 0,
                    remaining: remaining,
                };
            })
            .filter(o => o.remaining > 0);

        setReceivables(mapped);
    }, [restaurantId]);

    /* ── Fetch Payables ── */
    const fetchPayables = useCallback(async () => {
        if (!restaurantId) return;
        // Get all supplies with supplier info
        const { data: supplies } = await supabase
            .from('supplies')
            .select('supplier_id, total_cost, amount_paid, remaining_balance, suppliers(name, phone)')
            .eq('restaurant_id', restaurantId);

        // Get last payment per supplier
        const { data: payments } = await supabase
            .from('supply_payments')
            .select('supplier_id, payment_date')
            .eq('restaurant_id', restaurantId)
            .order('payment_date', { ascending: false });

        // Aggregate by supplier
        const supplierMap = new Map<string, SupplierPayable>();

        for (const supply of (supplies as SupplyRow[] || [])) {
            const sid = supply.supplier_id;
            if (!sid) continue;
            const existing = supplierMap.get(sid);
            if (existing) {
                existing.total_supplies_cost += supply.total_cost || 0;
                existing.total_paid += supply.amount_paid || 0;
                existing.remaining += supply.remaining_balance || 0;
                existing.supply_count += 1;
            } else {
                supplierMap.set(sid, {
                    supplier_id: sid,
                    supplier_name: supply.suppliers?.name || "—",
                    supplier_phone: supply.suppliers?.phone || null,
                    total_supplies_cost: supply.total_cost || 0,
                    total_paid: supply.amount_paid || 0,
                    remaining: supply.remaining_balance || 0,
                    last_payment_date: null,
                    supply_count: 1,
                });
            }
        }

        // Set last payment date
        for (const payment of (payments as PaymentRow[] || [])) {
            const existing = supplierMap.get(payment.supplier_id);
            if (existing && !existing.last_payment_date) {
                existing.last_payment_date = payment.payment_date;
            }
        }

        setPayables(Array.from(supplierMap.values()).filter(s => s.remaining > 0));
    }, [restaurantId]);

    /* ── Load everything ── */
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchReceivables(), fetchPayables()]);
            setLoading(false);
        };
        load();
    }, [fetchReceivables, fetchPayables]);

    /* ── Summary Stats ── */
    const totalReceivable = useMemo(() => receivables.reduce((s, r) => s + r.remaining, 0), [receivables]);
    const totalPayable = useMemo(() => payables.reduce((s, p) => s + p.remaining, 0), [payables]);
    const netPosition = totalReceivable - totalPayable;

    /* ── Filter ── */
    const filteredReceivables = useMemo(() => {
        let result = receivables;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(r => r.customer_name?.toLowerCase().includes(q) || r.customer_phone?.includes(q) || r.order_number.toString().includes(q));
        }
        if (statusFilter === 'partial') result = result.filter(r => r.deposit_amount > 0 && r.remaining > 0);
        if (statusFilter === 'unpaid') result = result.filter(r => r.deposit_amount === 0);
        if (dateFrom) result = result.filter(r => r.created_at >= dateFrom);
        if (dateTo) result = result.filter(r => r.created_at <= dateTo + 'T23:59:59');
        return result;
    }, [receivables, search, statusFilter, dateFrom, dateTo]);

    const filteredPayables = useMemo(() => {
        let result = payables;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p => p.supplier_name.toLowerCase().includes(q));
        }
        return result;
    }, [payables, search]);

    /* ── Customer payment ── */
    const handleCustomerPayment = async () => {
        if (!customerPayModal || !restaurantId || custPayAmount <= 0) return;
        // Update the order's deposit_amount
        const { data: order } = await supabase.from('orders').select('deposit_amount, total').eq('id', customerPayModal.orderId).single();
        if (!order) { toast.error(isAr ? "خطأ" : "Error"); return; }

        const newDeposit = (order.deposit_amount || 0) + custPayAmount;
        const newRemaining = order.total - newDeposit;

        // If fully paid, update payment method
        const updates: Record<string, unknown> = { deposit_amount: newDeposit };
        if (newRemaining <= 0) {
            updates.payment_method = 'cash';
        }

        const { error } = await supabase.from('orders').update(updates).eq('id', customerPayModal.orderId);
        if (error) { toast.error(error.message); return; }

        toast.success(isAr ? "تم تسجيل الدفعة" : "Payment recorded");
        setCustomerPayModal(null); setCustPayAmount(0);
        fetchReceivables();
    };

    /* ── Supplier payment ── */
    const handleSupplierPayment = async () => {
        if (!supplierPayModal || !restaurantId || suppPayAmount <= 0) return;

        // Find all unpaid supplies for this supplier
        const { data: supplies } = await supabase
            .from('supplies')
            .select('id, remaining_balance')
            .eq('restaurant_id', restaurantId)
            .eq('supplier_id', supplierPayModal.supplierId)
            .gt('remaining_balance', 0)
            .order('delivery_date', { ascending: true });

        if (!supplies || supplies.length === 0) { toast.error(isAr ? "لا توجد توريدات مستحقة" : "No outstanding supplies"); return; }

        // Distribute payment across oldest supplies first
        let remainingAmount = suppPayAmount;
        for (const supply of supplies) {
            if (remainingAmount <= 0) break;
            const payForThis = Math.min(remainingAmount, supply.remaining_balance);
            await recordSupplyPayment(restaurantId, supply.id, supplierPayModal.supplierId, payForThis, suppPayDate, suppPayNotes);
            remainingAmount -= payForThis;
        }

        toast.success(isAr ? "تم تسجيل الدفعة" : "Payment recorded");
        setSupplierPayModal(null); setSuppPayAmount(0); setSuppPayNotes("");
        fetchPayables();
    };

    /* ── Format ── */
    const formatCurrency = (v: number) => `${v.toLocaleString()} ج.م`;
    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return d; }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <Landmark className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    {isAr ? "الحسابات المالية" : "Financial Accounts"}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "مدين ودائن — تتبع المستحقات والمدفوعات" : "Receivables & Payables — Track all financial balances"}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">{isAr ? "فلوس لينا (مستحقات)" : "Receivables (Owed to us)"}</p>
                    </div>
                    <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalReceivable)}</p>
                    <p className="text-xs text-emerald-600/60 dark:text-emerald-400/60 mt-1">{receivables.length} {isAr ? "طلبات مستحقة" : "outstanding orders"}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400 font-bold">{isAr ? "فلوس علينا (مطلوبات)" : "Payables (We owe)"}</p>
                    </div>
                    <p className="text-3xl font-extrabold text-red-700 dark:text-red-400">{formatCurrency(totalPayable)}</p>
                    <p className="text-xs text-red-600/60 dark:text-red-400/60 mt-1">{payables.length} {isAr ? "موردين مستحقين" : "suppliers with balance"}</p>
                </div>
                <div className={`bg-gradient-to-br ${netPosition >= 0
                    ? 'from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-200 dark:border-blue-500/20'
                    : 'from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-amber-200 dark:border-amber-500/20'
                    } border rounded-xl p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className={`w-5 h-5 ${netPosition >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`} />
                        <p className={`text-sm font-bold ${netPosition >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>{isAr ? "صافي المركز النقدي" : "Net Cash Position"}</p>
                    </div>
                    <p className={`text-3xl font-extrabold ${netPosition >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition)}
                    </p>
                    <p className={`text-xs mt-1 ${netPosition >= 0 ? 'text-blue-600/60 dark:text-blue-400/60' : 'text-amber-600/60 dark:text-amber-400/60'}`}>
                        {netPosition >= 0 ? (isAr ? "لصالحك" : "In your favor") : (isAr ? "عليك دفع" : "You need to pay")}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-800/50">
                <button onClick={() => setActiveTab('receivable')}
                    className={`px-5 py-3 text-base font-bold rounded-t-xl transition-colors ${activeTab === 'receivable'
                        ? 'bg-white dark:bg-card text-emerald-600 dark:text-emerald-400 border border-b-0 border-slate-200 dark:border-zinc-800/50'
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>
                    <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> {isAr ? "فلوس لينا عند العملاء" : "Customer Receivables"} <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">{receivables.length}</span></span>
                </button>
                <button onClick={() => setActiveTab('payable')}
                    className={`px-5 py-3 text-base font-bold rounded-t-xl transition-colors ${activeTab === 'payable'
                        ? 'bg-white dark:bg-card text-red-600 dark:text-red-400 border border-b-0 border-slate-200 dark:border-zinc-800/50'
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'}`}>
                    <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {isAr ? "فلوس علينا للموردين" : "Supplier Payables"} <span className="text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{payables.length}</span></span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={activeTab === 'receivable' ? (isAr ? "بحث بالعميل أو رقم الطلب..." : "Search customer or order #...") : (isAr ? "بحث بالمورد..." : "Search supplier...")}
                        className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none" />
                </div>
                {activeTab === 'receivable' && (
                    <>
                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-zinc-500" />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none appearance-none cursor-pointer">
                                <option value="all">{isAr ? "كل الحالات" : "All"}</option>
                                <option value="partial">{isAr ? "مدفوع جزئي" : "Partial"}</option>
                                <option value="unpaid">{isAr ? "غير مدفوع" : "Unpaid"}</option>
                            </select>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
                        </div>
                    </>
                )}
            </div>

            {/* ===== RECEIVABLES TABLE ===== */}
            {activeTab === 'receivable' && (
                <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                    {filteredReceivables.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 dark:text-zinc-600">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="font-bold">{isAr ? "لا توجد مستحقات من العملاء" : "No customer receivables"}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                    {[isAr ? "العميل" : "Customer", isAr ? "رقم الطلب" : "Order #", isAr ? "الإجمالي" : "Total", isAr ? "المدفوع/عربون" : "Paid/Deposit", isAr ? "المتبقي عليه" : "Remaining", isAr ? "التاريخ" : "Date", isAr ? "إجراءات" : "Actions"]
                                        .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivables.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{r.customer_name || (isAr ? "عميل" : "Customer")}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">#{r.order_number}</td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-zinc-300">{formatCurrency(r.total)}</td>
                                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(r.deposit_amount)}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                                {formatCurrency(r.remaining)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 text-xs">{formatDate(r.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => { setCustomerPayModal({ orderId: r.id, remaining: r.remaining, orderNumber: r.order_number }); setCustPayAmount(0); }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                                                <CreditCard className="w-3.5 h-3.5" /> {isAr ? "تسجيل دفعة" : "Record Payment"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ===== PAYABLES TABLE ===== */}
            {activeTab === 'payable' && (
                <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                    {filteredPayables.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 dark:text-zinc-600">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="font-bold">{isAr ? "لا توجد مطلوبات من الموردين" : "No supplier payables"}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                    {[isAr ? "المورد" : "Supplier", isAr ? "إجمالي التوريدات" : "Total Supplies", isAr ? "المدفوع" : "Paid", isAr ? "المتبقي له" : "Remaining", isAr ? "آخر دفعة" : "Last Payment", isAr ? "إجراءات" : "Actions"]
                                        .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayables.map(p => (
                                    <tr key={p.supplier_id} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-zinc-200">{p.supplier_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-500">{p.supply_count} {isAr ? "توريدات" : "supplies"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-zinc-300">{formatCurrency(p.total_supplies_cost)}</td>
                                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(p.total_paid)}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                                {formatCurrency(p.remaining)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 text-xs">
                                            {p.last_payment_date ? (
                                                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(p.last_payment_date)}</span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => { setSupplierPayModal({ supplierId: p.supplier_id, supplierName: p.supplier_name, remaining: p.remaining }); setSuppPayAmount(0); }}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                                                    <CreditCard className="w-3.5 h-3.5" /> {isAr ? "دفع" : "Pay"}
                                                </button>
                                                <Link href="/dashboard/supplies"
                                                    className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition" title={isAr ? "عرض التوريدات" : "View Supplies"}>
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ===== CUSTOMER PAYMENT MODAL ===== */}
            <AnimatePresence>
                {customerPayModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setCustomerPayModal(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    {isAr ? "تسجيل دفعة للعميل" : "Record Customer Payment"}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
                                    {isAr ? `طلب #${customerPayModal.orderNumber} — المتبقي:` : `Order #${customerPayModal.orderNumber} — Remaining:`}{" "}
                                    <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(customerPayModal.remaining)}</span>
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ" : "Amount"} *</label>
                                    <input type="number" value={custPayAmount || ''} onChange={e => setCustPayAmount(parseFloat(e.target.value) || 0)} min="0" max={customerPayModal.remaining}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none text-center text-2xl font-extrabold" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setCustomerPayModal(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleCustomerPayment}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {isAr ? "تأكيد الدفع" : "Confirm Payment"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== SUPPLIER PAYMENT MODAL ===== */}
            <AnimatePresence>
                {supplierPayModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSupplierPayModal(null)}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-zinc-800/50 shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800/50">
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    {isAr ? "دفع للمورد" : "Pay Supplier"}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
                                    {supplierPayModal.supplierName} — {isAr ? "المتبقي:" : "Remaining:"}{" "}
                                    <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(supplierPayModal.remaining)}</span>
                                </p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "المبلغ" : "Amount"} *</label>
                                    <input type="number" value={suppPayAmount || ''} onChange={e => setSuppPayAmount(parseFloat(e.target.value) || 0)} min="0" max={supplierPayModal.remaining}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none text-center text-2xl font-extrabold" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "تاريخ الدفع" : "Payment Date"}</label>
                                    <input type="date" value={suppPayDate} onChange={e => setSuppPayDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 block">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <input value={suppPayNotes} onChange={e => setSuppPayNotes(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-zinc-700/50 rounded-xl text-slate-900 dark:text-white outline-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800/50 flex gap-3">
                                <button onClick={() => setSupplierPayModal(null)} className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-bold rounded-xl transition">{isAr ? "إلغاء" : "Cancel"}</button>
                                <button onClick={handleSupplierPayment}
                                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> {isAr ? "تأكيد الدفع" : "Confirm"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
