"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { posDb } from "@/lib/pos-db";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import {
    BarChart3, ShoppingCart, DollarSign,
    Package, Download, Users, CreditCard,
    Banknote, Smartphone, Calendar, ArrowUpRight
} from "lucide-react";

type DateRange = "today" | "yesterday" | "week" | "month" | "all" | "custom";

type OrderLike = {
    id: string;
    status: string;
    is_draft?: boolean;
    total: number;
    deposit_amount?: number;
    delivery_fee?: number;
    discount?: number;
    payment_method?: string;
    cashier_name?: string;
    items: { title: string; qty: number; price: number; category?: string }[];
    created_at: string;
};

type Stats = {
    revenue: number; collectedCash: number; orders: number; avgTicket: number;
    deliveryFees: number; discounts: number; totalUnitsSold: number;
    topItems: { title: string; count: number; revenue: number; category?: string }[];
    allItems: { title: string; count: number; revenue: number; category?: string }[];
    categoryBreakdown: { name: string; items: number; revenue: number }[];
    staffBreakdown: { name: string; orders: number; revenue: number }[];
    paymentBreakdown: { method: string; count: number; revenue: number }[];
    hourlyBreakdown: { hour: number; count: number; revenue: number }[];
};

const RANGE_LABELS: Record<DateRange, string> = {
    today: "اليوم",
    yesterday: "أمس",
    week: "الأسبوع",
    month: "الشهر",
    all: "الكل",
    custom: "مخصص"
};

const PAY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    cash: { label: "كاش", icon: <Banknote className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400" },
    card: { label: "بطاقة", icon: <CreditCard className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
    online: { label: "أونلاين", icon: <Smartphone className="w-4 h-4" />, color: "text-violet-600 dark:text-violet-400" },
};

const getLocalStartOfDay = (d: Date) => {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    return start;
};

const getDateBounds = (range: DateRange, customStart: string, customEnd: string) => {
    const now = new Date();
    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    if (range === "today") {
        dateFrom = getLocalStartOfDay(now).toISOString();
    } else if (range === "yesterday") {
        const startOfYesterday = getLocalStartOfDay(now);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        dateFrom = startOfYesterday.toISOString();

        const endOfYesterday = new Date(startOfYesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        dateTo = endOfYesterday.toISOString();
    } else if (range === "week") {
        const w = getLocalStartOfDay(now);
        w.setDate(w.getDate() - 7);
        dateFrom = w.toISOString();
    } else if (range === "month") {
        const m = getLocalStartOfDay(now);
        m.setMonth(m.getMonth() - 1);
        dateFrom = m.toISOString();
    } else if (range === "custom") {
        if (customStart) {
            dateFrom = customStart.includes("T")
                ? new Date(customStart).toISOString()
                : new Date(customStart + "T00:00:00").toISOString();
        }
        if (customEnd) {
            dateTo = customEnd.includes("T")
                ? new Date(customEnd).toISOString()
                : new Date(customEnd + "T23:59:59.999").toISOString();
        }
    }
    return { dateFrom, dateTo };
};

export default function ReportsPage() {
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    const [range, setRange] = useState<DateRange>("today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [loading, setLoading] = useState(true);
    const [itemSearch, setItemSearch] = useState("");
    const [itemLimit, setItemLimit] = useState(30);
    const [activeTab, setActiveTab] = useState<"items" | "categories" | "staff" | "payments" | "hourly">("items");
    const [stats, setStats] = useState<Stats>({
        revenue: 0, collectedCash: 0, orders: 0, avgTicket: 0, deliveryFees: 0, discounts: 0, totalUnitsSold: 0,
        topItems: [], allItems: [], categoryBreakdown: [], staffBreakdown: [],
        paymentBreakdown: [], hourlyBreakdown: [],
    });

    const fetchStats = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);

        const { dateFrom, dateTo } = getDateBounds(range, customStart, customEnd);

        // 1️⃣ Load from local Dexie (always available, even offline)
        let localOrders = await posDb.orders.where("restaurant_id").equals(restaurantId)
            .and(o => o.status !== "cancelled" && !o.is_draft).toArray();

        if (dateFrom || dateTo) {
            const fromTime = dateFrom ? new Date(dateFrom).getTime() : 0;
            const toTime = dateTo ? new Date(dateTo).getTime() : Infinity;
            localOrders = localOrders.filter(o => {
                const t = new Date(o.created_at).getTime();
                return t >= fromTime && t <= toTime;
            });
        }

        const localMapped: OrderLike[] = localOrders.map(o => ({
            id: o.id,
            status: o.status,
            is_draft: o.is_draft,
            total: Number(o.total) || 0,
            deposit_amount: o.deposit_amount,
            delivery_fee: o.delivery_fee,
            discount: o.discount,
            payment_method: o.payment_method,
            cashier_name: o.cashier_name,
            items: (o.items || []).map((i: any) => ({
                title: i.title || "غير محدد",
                qty: Number(i.qty) || 1,
                price: Number(i.price) || 0,
                category: i.category,
            })),
            created_at: o.created_at,
        }));

        // 2️⃣ Load from Supabase in chunks (remote/cloud orders)
        let remoteOrders: OrderLike[] = [];
        try {
            const batchSize = 1000;
            let offset = 0;
            while (true) {
                let query = supabase
                    .from('orders')
                    .select('id, status, is_draft, total, deposit_amount, delivery_fee, discount, payment_method, cashier_name, items, created_at')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_draft', false)
                    .neq('status', 'cancelled')
                    .order('created_at', { ascending: false });

                if (dateFrom) query = query.gte('created_at', dateFrom);
                if (dateTo) query = query.lte('created_at', dateTo);

                const { data, error } = await query.range(offset, offset + batchSize - 1);
                if (error) {
                    console.error("Error fetching report orders:", error);
                    break;
                }
                if (!data || data.length === 0) break;

                const mapped = (data as OrderLike[]).map(o => ({
                    ...o,
                    total: Number(o.total) || 0,
                    items: (o.items || []).map((i: any) => ({
                        title: i.title || "غير محدد",
                        qty: Number(i.qty) || 1,
                        price: Number(i.price) || 0,
                        category: i.category,
                    })),
                }));
                remoteOrders.push(...mapped);

                if (data.length < batchSize) break;
                offset += batchSize;
            }
        } catch { /* offline — use local only */ }

        // 3️⃣ Merge: remote takes priority, local fills gaps
        const mergedMap = new Map<string, OrderLike>();
        localMapped.forEach(o => mergedMap.set(o.id, o));
        remoteOrders.forEach(o => mergedMap.set(o.id, o)); // remote wins
        let orders = Array.from(mergedMap.values());

        if (dateFrom || dateTo) {
            const fromTime = dateFrom ? new Date(dateFrom).getTime() : 0;
            const toTime = dateTo ? new Date(dateTo).getTime() : Infinity;
            orders = orders.filter(o => {
                const t = new Date(o.created_at).getTime();
                return t >= fromTime && t <= toTime;
            });
        }

        const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
        
        const collectedCash = orders.reduce((s, o) => {
            if (o.status === "completed" || o.payment_method === "cash") {
                return s + (o.total || 0);
            } else if (o.deposit_amount && o.deposit_amount > 0) {
                return s + o.deposit_amount;
            }
            return s;
        }, 0);

        const avgTicket = orders.length > 0 ? revenue / orders.length : 0;
        const deliveryFees = orders.reduce((s, o) => s + (o.delivery_fee || 0), 0);
        const discounts = orders.reduce((s, o) => s + (o.discount || 0), 0);

        // All items & Top items
        let totalUnitsSold = 0;
        const itemMap: Record<string, { count: number; revenue: number; category?: string }> = {};
        orders.forEach(o => (o.items || []).forEach(i => {
            const title = i.title || "غير محدد";
            const qty = Number(i.qty) || 1;
            const price = Number(i.price) || 0;
            if (!itemMap[title]) itemMap[title] = { count: 0, revenue: 0, category: i.category };
            itemMap[title].count += qty;
            itemMap[title].revenue += price * qty;
            totalUnitsSold += qty;
        }));
        const allItems = Object.entries(itemMap).map(([title, v]) => ({ title, ...v }))
            .sort((a, b) => b.revenue - a.revenue);
        const topItems = allItems.slice(0, 15);

        // Category breakdown
        const catMap: Record<string, { items: number; revenue: number }> = {};
        orders.forEach(o => (o.items || []).forEach(i => {
            const cat = i.category || "بدون قسم";
            const qty = Number(i.qty) || 1;
            const price = Number(i.price) || 0;
            if (!catMap[cat]) catMap[cat] = { items: 0, revenue: 0 };
            catMap[cat].items += qty;
            catMap[cat].revenue += price * qty;
        }));
        const categoryBreakdown = Object.entries(catMap).map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.revenue - a.revenue);

        // Staff breakdown
        const staffMap: Record<string, { orders: number; revenue: number }> = {};
        orders.forEach(o => {
            const name = o.cashier_name || "غير محدد";
            if (!staffMap[name]) staffMap[name] = { orders: 0, revenue: 0 };
            staffMap[name].orders++;
            staffMap[name].revenue += o.total || 0;
        });
        const staffBreakdown = Object.entries(staffMap).map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.revenue - a.revenue);

        // Payment breakdown
        const payMap: Record<string, { count: number; revenue: number }> = {};
        orders.forEach(o => {
            const method = o.payment_method || "cash";
            if (!payMap[method]) payMap[method] = { count: 0, revenue: 0 };
            payMap[method].count++;
            payMap[method].revenue += o.total || 0;
        });
        const paymentBreakdown = Object.entries(payMap).map(([method, v]) => ({ method, ...v }))
            .sort((a, b) => b.revenue - a.revenue);

        // Hourly breakdown
        const hourMap: Record<number, { count: number; revenue: number }> = {};
        for (let h = 0; h < 24; h++) hourMap[h] = { count: 0, revenue: 0 };
        orders.forEach(o => {
            const h = new Date(o.created_at).getHours();
            hourMap[h].count++;
            hourMap[h].revenue += o.total || 0;
        });
        const hourlyBreakdown = Object.entries(hourMap)
            .map(([hour, v]) => ({ hour: +hour, ...v })).filter(h => h.count > 0);

        setStats({
            revenue,
            collectedCash,
            orders: orders.length,
            avgTicket,
            deliveryFees,
            discounts,
            totalUnitsSold,
            topItems,
            allItems,
            categoryBreakdown,
            staffBreakdown,
            paymentBreakdown,
            hourlyBreakdown
        });
        setLoading(false);
    }, [restaurantId, range, customStart, customEnd]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const exportCSV = () => {
        let headers: string[], rows: (string | number)[][];
        if (activeTab === "items") {
            headers = ["الصنف", "القسم", "الكمية", "الإيراد"];
            rows = stats.allItems.map(i => [i.title, i.category || "-", i.count, i.revenue]);
        } else if (activeTab === "categories") {
            headers = ["القسم", "الأصناف المباعة", "الإيراد"];
            rows = stats.categoryBreakdown.map(c => [c.name, c.items, c.revenue]);
        } else if (activeTab === "staff") {
            headers = ["الموظف", "الطلبات", "الإيراد"];
            rows = stats.staffBreakdown.map(s => [s.name, s.orders, s.revenue]);
        } else if (activeTab === "payments") {
            headers = ["طريقة الدفع", "الطلبات", "الإيراد"];
            rows = stats.paymentBreakdown.map(p => [p.method, p.count, p.revenue]);
        } else {
            headers = ["الساعة", "الطلبات", "الإيراد"];
            rows = stats.hourlyBreakdown.map(h => [`${h.hour}:00`, h.count, h.revenue]);
        }

        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `تقرير-${RANGE_LABELS[range]}-${activeTab}.csv`;
        a.click();
    };

    const tabs = [
        { key: "items", label: "الأصناف", icon: Package },
        { key: "categories", label: "الأقسام", icon: BarChart3 },
        { key: "staff", label: "الموظفين", icon: Users },
        { key: "payments", label: "طرق الدفع", icon: CreditCard },
        { key: "hourly", label: "التوقيت", icon: Calendar },
    ] as const;

    const filteredItems = stats.allItems.filter(item => {
        if (!itemSearch.trim()) return true;
        const q = itemSearch.trim().toLowerCase();
        return item.title.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
    });
    const displayedItems = itemSearch.trim() ? filteredItems : filteredItems.slice(0, itemLimit);

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />{isAr ? "تقارير المبيعات" : "Sales Reports"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "تحليل شامل لأداء المطعم من بيانات POS" : "Comprehensive restaurant performance from POS data"}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    {range === "custom" && (
                        <div className="flex items-center gap-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl px-3 py-2">
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-zinc-300 outline-none" />
                            <span className="text-slate-400 dark:text-zinc-600">–</span>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-zinc-300 outline-none" />
                        </div>
                    )}
                    {(["today", "yesterday", "week", "month", "all", "custom"] as DateRange[]).map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${range === r ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:text-slate-900 dark:hover:text-white"}`}>
                            {RANGE_LABELS[r]}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500 dark:text-zinc-500 animate-pulse">جاري التحميل...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                            { icon: DollarSign, label: isAr ? "إجمالي المبيعات" : "Total Revenue", val: formatCurrency(stats.revenue, restaurant?.currency), color: "text-slate-700 dark:text-zinc-300", bg: "bg-slate-50 dark:bg-zinc-800/20 border-slate-200 dark:border-zinc-700/30" },
                            { icon: Banknote, label: isAr ? "المحصلة النقدية" : "Cash Collected", val: formatCurrency(stats.collectedCash, restaurant?.currency), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-glass-border" },
                            { icon: ShoppingCart, label: isAr ? "الطلبات" : "Orders", val: stats.orders.toLocaleString(), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
                            { icon: Package, label: isAr ? "الأصناف المباعة" : "Items Sold", val: `${stats.totalUnitsSold.toLocaleString()} ${isAr ? "قطعة" : "pcs"}`, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20" },
                            { icon: ArrowUpRight, label: isAr ? "الخصومات" : "Discounts", val: formatCurrency(stats.discounts, restaurant?.currency), color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
                        ].map((card, i) => (
                            <div key={i} className={`bg-white dark:bg-card border ${card.bg} rounded-xl p-4 flex items-center gap-3`}>
                                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center ${card.color} flex-shrink-0`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-0.5">{card.label}</p>
                                    <p className={`text-xl font-extrabold ${card.color} tabular-nums truncate`}>{card.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main analysis panel */}
                    <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800/50 flex-wrap gap-2">
                            <div className="flex gap-2 flex-wrap">
                                {tabs.map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition ${activeTab === tab.key ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-slate-50 dark:bg-zinc-800/30 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30 hover:text-slate-900 dark:hover:text-white"}`}>
                                        <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-glass-border rounded-xl text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition">
                                <Download className="w-3.5 h-3.5" /> تصدير CSV
                            </button>
                        </div>

                        <div className="p-4">
                            {/* ── ITEMS TAB ── */}
                            {activeTab === "items" && (
                                stats.allItems.length === 0 ? <EmptyState /> :
                                    <div className="space-y-4">
                                        {/* Search & Summary Bar */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-slate-200 dark:border-zinc-700/30">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-300">
                                                <span>{isAr ? "إجمالي الأصناف المباعة:" : "Total items sold:"}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{stats.totalUnitsSold.toLocaleString()} {isAr ? "قطعة" : "items"}</span>
                                                <span className="text-slate-400 dark:text-zinc-500">({stats.allItems.length} {isAr ? "صنف مختلف" : "unique items"})</span>
                                            </div>
                                            <div className="relative min-w-[200px] max-w-xs flex-1">
                                                <input
                                                    type="text"
                                                    value={itemSearch}
                                                    onChange={e => setItemSearch(e.target.value)}
                                                    placeholder={isAr ? "بحث في الأصناف المباعة..." : "Search sold items..."}
                                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-emerald-500"
                                                />
                                                {itemSearch && (
                                                    <button
                                                        onClick={() => setItemSearch("")}
                                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {displayedItems.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 dark:text-zinc-600 text-sm">
                                                {isAr ? "لا توجد نتائج مطابقة للبحث" : "No matching items found"}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                                                <div className="min-w-[400px] space-y-1.5">
                                                    {displayedItems.map((item, i) => {
                                                        const maxRev = stats.allItems[0]?.revenue || 1;
                                                        return (
                                                            <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition group">
                                                                <span className="w-6 text-center text-xs font-bold text-slate-400 dark:text-zinc-600">{i + 1}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="text-base font-bold text-slate-700 dark:text-zinc-200 truncate">{item.title}</p>
                                                                        {item.category && <span className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-md font-bold flex-shrink-0">{item.category}</span>}
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5">
                                                                        <div className="bg-emerald-500/60 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(item.revenue / maxRev) * 100}%` }} />
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm text-slate-500 dark:text-zinc-500 font-bold w-20 text-center flex-shrink-0">{item.count.toLocaleString()} قطعة</span>
                                                                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums w-28 text-left flex-shrink-0">{formatCurrency(item.revenue, restaurant?.currency)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {!itemSearch && stats.allItems.length > itemLimit && (
                                            <div className="text-center pt-2">
                                                <button
                                                    onClick={() => setItemLimit(prev => prev + 50)}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition"
                                                >
                                                    {isAr ? `عرض المزيد (تم عرض ${itemLimit} من أصل ${stats.allItems.length})` : `Show More (${itemLimit} of ${stats.allItems.length})`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                            )}

                            {/* ── CATEGORIES TAB ── */}
                            {activeTab === "categories" && (
                                stats.categoryBreakdown.length === 0 ? <EmptyState /> :
                                    <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                                        <div className="min-w-[400px] space-y-1.5">
                                            {stats.categoryBreakdown.map((cat, i) => {
                                                const maxRev = stats.categoryBreakdown[0]?.revenue || 1;
                                                const pct = Math.round((cat.revenue / stats.revenue) * 100);
                                                return (
                                                    <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/[0.02] transition">
                                                        <span className="w-6 text-center text-xs font-bold text-slate-400 dark:text-zinc-600">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className="text-base font-bold text-slate-700 dark:text-zinc-200">{cat.name}</p>
                                                                <span className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{pct}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5">
                                                                <div className="bg-blue-500/60 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(cat.revenue / maxRev) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-slate-500 dark:text-zinc-500 font-bold w-16 text-center flex-shrink-0">{cat.items} صنف</span>
                                                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums w-24 text-left flex-shrink-0">{formatCurrency(cat.revenue, restaurant?.currency)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                            )}

                            {/* ── STAFF TAB ── */}
                            {activeTab === "staff" && (
                                stats.staffBreakdown.length === 0 ? <EmptyState /> :
                                    <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                                        <div className="min-w-[400px] space-y-1.5">
                                            {stats.staffBreakdown.map((s, i) => {
                                                const maxRev = stats.staffBreakdown[0]?.revenue || 1;
                                                return (
                                                    <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/[0.02] transition">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-200 dark:shadow-emerald-500/20 flex-shrink-0">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-base font-bold text-slate-700 dark:text-zinc-200 mb-1">{s.name}</p>
                                                            <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5">
                                                                <div className="bg-amber-500/60 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(s.revenue / maxRev) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-slate-500 dark:text-zinc-500 font-bold w-16 text-center flex-shrink-0">{s.orders} طلب</span>
                                                        <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums w-24 text-left flex-shrink-0">{formatCurrency(s.revenue, restaurant?.currency)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                            )}

                            {/* ── PAYMENTS TAB ── */}
                            {activeTab === "payments" && (
                                stats.paymentBreakdown.length === 0 ? <EmptyState /> :
                                    <div className="space-y-3">
                                        {stats.paymentBreakdown.map((p, i) => {
                                            const info = PAY_LABELS[p.method] || { label: p.method, icon: <CreditCard className="w-4 h-4" />, color: "text-slate-500 dark:text-zinc-400" };
                                            const pct = stats.orders > 0 ? Math.round((p.count / stats.orders) * 100) : 0;
                                            const revPct = stats.revenue > 0 ? Math.round((p.revenue / stats.revenue) * 100) : 0;
                                            return (
                                                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-zinc-800/20 border-slate-200 dark:border-zinc-700/30`}>
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${info.color} bg-slate-100 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/30 flex-shrink-0`}>
                                                        {info.icon}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className={`font-bold text-base ${info.color}`}>{info.label}</p>
                                                            <span className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{pct}% من الطلبات · {revPct}% من الإيراد</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 dark:bg-zinc-800/50 rounded-full h-1.5">
                                                            <div className={`h-1.5 rounded-full transition-all duration-500 ${p.method === "cash" ? "bg-emerald-500/60" : p.method === "card" ? "bg-blue-500/60" : "bg-violet-500/60"}`} style={{ width: `${revPct}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={`text-xl font-extrabold tabular-nums ${info.color}`}>{formatCurrency(p.revenue, restaurant?.currency)}</p>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{p.count} طلب</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                            )}

                            {/* ── HOURLY TAB ── */}
                            {activeTab === "hourly" && (
                                stats.hourlyBreakdown.length === 0 ? <EmptyState /> :
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-4 flex items-center gap-1"><Calendar className="w-4 h-4" /> توزيع الطلبات حسب الساعة</p>
                                        <div className="flex items-end gap-1.5 h-40">
                                            {Array.from({ length: 24 }, (_, h) => {
                                                const entry = stats.hourlyBreakdown.find(e => e.hour === h);
                                                const maxCount = Math.max(...stats.hourlyBreakdown.map(e => e.count), 1);
                                                const height = entry ? Math.max((entry.count / maxCount) * 100, 4) : 0;
                                                return (
                                                    <div key={h} className="flex-1 flex flex-col items-center gap-1" title={entry ? `${h}:00 — ${entry.count} طلب · ${formatCurrency(entry.revenue, restaurant?.currency)}` : `${h}:00 — لا توجد طلبات`}>
                                                        <div className="w-full relative" style={{ height: "120px" }}>
                                                            <div
                                                                className={`absolute bottom-0 left-0 right-0 rounded-t transition-all duration-500 ${entry && entry.count > 0 ? "bg-emerald-500/70 hover:bg-emerald-400/80" : "bg-slate-50 dark:bg-zinc-800/30"}`}
                                                                style={{ height: `${height}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 dark:text-zinc-600 font-bold">{h}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Hourly table for top hours */}
                                        <div className="mt-6 space-y-1.5">
                                            <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase mb-2">أكثر الساعات ازدحاماً</p>
                                            {[...stats.hourlyBreakdown].sort((a, b) => b.count - a.count).slice(0, 5).map((h, i) => (
                                                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.02] transition">
                                                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-600 w-6 text-center">{i + 1}</span>
                                                    <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-glass-border px-2.5 py-1 rounded-lg text-xs font-extrabold tabular-nums">{String(h.hour).padStart(2, "0")}:00</span>
                                                    <div className="flex-1" />
                                                    <span className="text-xs text-slate-500 dark:text-zinc-500 font-bold">{h.count} طلب</span>
                                                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums w-24 text-left">{formatCurrency(h.revenue, restaurant?.currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="text-center py-12 text-slate-400 dark:text-zinc-600">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold">لا توجد بيانات في هذه الفترة</p>
        </div>
    );
}
