/* eslint-disable @next/next/no-img-element */
"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { posDb } from "@/lib/pos-db";
import type { PosStaffUser, PosOrder } from "@/lib/pos-db";
import {
    Truck, Plus, Edit3, Trash2, ToggleLeft, ToggleRight, X,
    Clock, DollarSign, Package, Wallet, User, Calendar,
    ChevronDown, ChevronUp, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Zone = { id: string; name_ar: string; name_en?: string; fee: number; min_order: number; estimated_time: number; is_active: boolean };
type DateRange = "today" | "week" | "month" | "all" | "custom";

export default function DeliveryPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    /* ── Zones state ── */
    const [zones, setZones] = useState<Zone[]>([]);
    const [zonesLoading, setZonesLoading] = useState(true);
    const [showZoneForm, setShowZoneForm] = useState(false);
    const [editZoneId, setEditZoneId] = useState<string | null>(null);
    const [zoneForm, setZoneForm] = useState({ name_ar: "", name_en: "", fee: 0, min_order: 0, estimated_time: 30 });

    /* ── Driver stats state ── */
    const [drivers, setDrivers] = useState<PosStaffUser[]>([]);
    const [orders, setOrders] = useState<PosOrder[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [range, setRange] = useState<DateRange>("today");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"stats" | "zones">("stats");

    /* ─────────── ZONES ─────────── */
    const fetchZones = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from("delivery_zones").select("*").eq("restaurant_id", restaurantId).order("name_ar");
        setZones((data as Zone[]) || []);
        setZonesLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchZones(); }, [fetchZones]);

    const handleZoneSave = async () => {
        if (!restaurantId || !zoneForm.name_ar.trim()) return;
        if (editZoneId) await supabase.from("delivery_zones").update(zoneForm).eq("id", editZoneId);
        else await supabase.from("delivery_zones").insert({ ...zoneForm, restaurant_id: restaurantId });
        resetZoneForm(); fetchZones();
    };
    const handleZoneDelete = async (id: string) => { await supabase.from("delivery_zones").delete().eq("id", id); fetchZones(); };
    const handleZoneToggle = async (z: Zone) => { await supabase.from("delivery_zones").update({ is_active: !z.is_active }).eq("id", z.id); fetchZones(); };
    const startEditZone = (z: Zone) => { setZoneForm({ name_ar: z.name_ar, name_en: z.name_en || "", fee: z.fee, min_order: z.min_order, estimated_time: z.estimated_time }); setEditZoneId(z.id); setShowZoneForm(true); };
    const resetZoneForm = () => { setZoneForm({ name_ar: "", name_en: "", fee: 0, min_order: 0, estimated_time: 30 }); setShowZoneForm(false); setEditZoneId(null); };

    /* ─────────── DRIVER STATS ─────────── */
    const fetchDriverData = useCallback(async () => {
        if (!restaurantId) return;
        setStatsLoading(true);

        const allDrivers = await posDb.pos_users.where("restaurant_id").equals(restaurantId).and(u => u.role === "delivery").toArray();
        setDrivers(allDrivers);

        let allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId)
            .and(o => o.status !== "cancelled" && !o.is_draft && !!o.delivery_driver_id).toArray();

        const now = new Date();
        if (range === "today") {
            const ts = now.toISOString().split("T")[0];
            allOrders = allOrders.filter(o => o.created_at.startsWith(ts));
        } else if (range === "week") {
            const w = new Date(now); w.setDate(w.getDate() - 7);
            allOrders = allOrders.filter(o => new Date(o.created_at) >= w);
        } else if (range === "month") {
            const m = new Date(now); m.setMonth(m.getMonth() - 1);
            allOrders = allOrders.filter(o => new Date(o.created_at) >= m);
        } else if (range === "custom" && customStart && customEnd) {
            const start = new Date(customStart); start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd); end.setHours(23, 59, 59, 999);
            allOrders = allOrders.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; });
        }
        setOrders(allOrders);
        setStatsLoading(false);
    }, [restaurantId, range, customStart, customEnd]);

    useEffect(() => { fetchDriverData(); }, [fetchDriverData]);

    const getDriverStats = (driverId: string) => {
        const driverOrders = orders.filter(o => o.delivery_driver_id === driverId);
        return {
            count: driverOrders.length,
            revenue: driverOrders.reduce((s, o) => s + o.total, 0),
            fees: driverOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0),
            orders: [...driverOrders].sort((a, b) => b.created_at.localeCompare(a.created_at)),
        };
    };

    const summaryStats = useMemo(() => ({
        drivers: drivers.length,
        orders: orders.length,
        revenue: orders.reduce((s, o) => s + o.total, 0),
        fees: orders.reduce((s, o) => s + (o.delivery_fee || 0), 0),
    }), [orders, drivers]);

    const rangeLabels: Record<DateRange, string> = { today: "اليوم", week: "الأسبوع", month: "الشهر", all: "الكل", custom: "مخصص" };

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <Truck className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />{isAr ? "الدليفري" : "Delivery"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">{isAr ? "إحصائيات السائقين ومناطق التوصيل" : "Driver stats and delivery zones"}</p>
                </div>
                {/* Tab switcher */}
                <div className="flex gap-2">
                    {([["stats", "📊 إحصائيات السائقين"], ["zones", "📍 مناطق التوصيل"]] as const).map(([tab, label]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${activeTab === tab ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800/50 hover:text-slate-900 dark:hover:text-white"}`}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ═══════════ DRIVER STATS TAB ═══════════ */}
            {activeTab === "stats" && (
                <>
                    {/* Date range */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {(["today", "week", "month", "all", "custom"] as DateRange[]).map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${range === r ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" : "bg-white dark:bg-card text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-800/50 hover:text-slate-900 dark:hover:text-white"}`}>
                                {rangeLabels[r]}
                            </button>
                        ))}
                        {range === "custom" && (
                            <div className="flex items-center gap-2 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl px-3 py-2">
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent text-xs text-slate-700 dark:text-zinc-300 outline-none" />
                                <span className="text-slate-400 dark:text-zinc-600">–</span>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent text-xs text-slate-700 dark:text-zinc-300 outline-none" />
                            </div>
                        )}
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { icon: Truck, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20", label: "السائقين", val: summaryStats.drivers },
                            { icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", label: "طلبات الدليفري", val: summaryStats.orders },
                            { icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-glass-border", label: "إيرادات الدليفري", val: formatCurrency(summaryStats.revenue) },
                            { icon: Wallet, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", label: "حساب الدليفري (إجمالي)", val: formatCurrency(summaryStats.fees) },
                        ].map((card, i) => (
                            <div key={i} className={`bg-white dark:bg-card border ${card.bg} rounded-xl p-5 flex items-center gap-3`}>
                                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center ${card.color} flex-shrink-0`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase mb-0.5">{card.label}</p>
                                    <p className={`text-lg font-extrabold ${card.color}`}>{card.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Driver cards */}
                    {statsLoading ? (
                        <div className="text-center py-12 text-slate-500 dark:text-zinc-500 animate-pulse">جاري التحميل...</div>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-zinc-600">
                            <Truck className="w-16 h-16 mx-auto mb-3 opacity-20" />
                            <p className="font-bold text-sm">لا يوجد سائقين دليفري</p>
                            <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">أضف سائقين من صفحة إدارة الفريق بدور &ldquo;توصيل&rdquo;</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {drivers.map(driver => {
                                const stats = getDriverStats(driver.id);
                                const isExpanded = expandedDriver === driver.id;
                                return (
                                    <div key={driver.id} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden">
                                        {/* Driver header row */}
                                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 flex-wrap text-center sm:text-right">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-900 dark:text-white font-bold text-xl shadow-lg shadow-cyan-500/20 flex-shrink-0">
                                                {driver.name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start">
                                                <p className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-500 dark:text-zinc-500" /> {driver.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold mt-0.5">@{driver.username}</p>
                                            </div>
                                            {/* Stats chips */}
                                            <div className="flex items-center justify-center gap-4 flex-wrap w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/20">
                                                <div className="text-center">
                                                    <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-bold uppercase">الطلبات</p>
                                                    <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">{stats.count}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-bold uppercase">الإيراد</p>
                                                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.revenue)}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-bold uppercase">حساب الدليفري</p>
                                                    <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(stats.fees)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border ${driver.is_active ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                                                    {driver.is_active ? "نشط" : "موقوف"}
                                                </span>
                                                <button onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
                                                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-zinc-700/30 transition">
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    {isExpanded ? "إخفاء" : "الطلبات"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable orders table */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-zinc-800/50">
                                                    {stats.orders.length === 0 ? (
                                                        <div className="p-8 text-center text-slate-400 dark:text-zinc-600">
                                                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                            <p className="text-xs font-bold">لا توجد طلبات في هذه الفترة</p>
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto max-h-72" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
                                                            <table className="w-full text-xs">
                                                                <thead className="sticky top-0 bg-slate-50 dark:bg-background">
                                                                    <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                                                        {["رقم الطلب", "العميل", "العنوان", "الأصناف", "المبلغ", "حساب الدليفري", "التاريخ"].map(h => (
                                                                            <th key={h} className="text-right p-3 text-[10px] text-slate-500 dark:text-zinc-500 font-bold whitespace-nowrap">{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {stats.orders.map(o => (
                                                                        <tr key={o.id} className="border-b border-slate-100 dark:border-zinc-800/20 hover:bg-white/[0.02] transition">
                                                                            <td className="p-3 font-bold text-slate-500 dark:text-zinc-400">#{o.order_number}</td>
                                                                            <td className="p-3 text-slate-700 dark:text-zinc-300 font-bold">{o.customer_name || "—"}</td>
                                                                            <td className="p-3 text-slate-500 dark:text-zinc-500 max-w-[140px] truncate">{o.customer_address ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{o.customer_address}</span> : "—"}</td>
                                                                            <td className="p-3 text-center"><span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded font-bold">{o.items.reduce((s, i) => s + i.qty, 0)}</span></td>
                                                                            <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(o.total)}</td>
                                                                            <td className="p-3 font-extrabold text-amber-600 dark:text-amber-400">{o.delivery_fee ? formatCurrency(o.delivery_fee) : "—"}</td>
                                                                            <td className="p-3 text-slate-500 dark:text-zinc-500 whitespace-nowrap">
                                                                                {new Date(o.created_at).toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ═══════════ ZONES TAB ═══════════ */}
            {activeTab === "zones" && (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> مناطق التوصيل</h2>
                            <p className="text-slate-500 dark:text-zinc-500 text-xs mt-0.5">حدد المناطق ورسومها وأوقاتها</p>
                        </div>
                        <button onClick={() => { resetZoneForm(); setShowZoneForm(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-900 dark:text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95">
                            <Plus className="w-4 h-4" /> إضافة منطقة
                        </button>
                    </div>

                    {/* Zone form */}
                    <AnimatePresence>
                        {showZoneForm && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="bg-white dark:bg-card border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div><label className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">الاسم بالعربي</label>
                                            <input value={zoneForm.name_ar} onChange={e => setZoneForm(p => ({ ...p, name_ar: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500/50" /></div>
                                        <div><label className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">الاسم بالإنجليزي</label>
                                            <input value={zoneForm.name_en} onChange={e => setZoneForm(p => ({ ...p, name_en: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500/50" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[{ key: "fee", label: "رسوم التوصيل (ج.م)", min: 0 }, { key: "min_order", label: "الحد الأدنى للطلب (ج.م)", min: 0 }, { key: "estimated_time", label: "وقت التوصيل (دقيقة)", min: 1 }].map(f => (
                                            <div key={f.key}><label className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{f.label}</label>
                                                <input type="number" value={zoneForm[f.key as keyof typeof zoneForm] || ""} onChange={e => setZoneForm(p => ({ ...p, [f.key]: +e.target.value }))} min={f.min} className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none" /></div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleZoneSave} className="px-6 py-2 bg-cyan-500 text-white font-bold text-sm rounded-lg hover:bg-cyan-600 transition active:scale-95">{editZoneId ? "تحديث" : "إضافة"}</button>
                                        <button onClick={resetZoneForm} className="px-4 py-2 text-slate-500 dark:text-zinc-400 text-sm hover:text-slate-900 dark:hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Zones list */}
                    {zonesLoading ? (
                        <div className="text-center py-12 text-slate-500 dark:text-zinc-500 animate-pulse">جاري التحميل...</div>
                    ) : zones.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 dark:text-zinc-600"><MapPin className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold text-sm">لا توجد مناطق توصيل</p></div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {zones.map(zone => (
                                <div key={zone.id} className={`bg-white dark:bg-card border rounded-xl p-4 flex items-center gap-4 transition ${zone.is_active ? "border-slate-200 dark:border-zinc-800/50" : "border-slate-200 dark:border-zinc-800/30 opacity-50"}`}>
                                    <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 dark:text-white">{isAr ? zone.name_ar : (zone.name_en || zone.name_ar)}</p>
                                        <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                                            <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-glass-border px-2 py-0.5 rounded-lg">
                                                <DollarSign className="w-3 h-3" /> رسوم: <strong>{formatCurrency(zone.fee)}</strong>
                                            </span>
                                            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2 py-0.5 rounded-lg">
                                                <DollarSign className="w-3 h-3" /> أقل طلب: <strong>{formatCurrency(zone.min_order)}</strong>
                                            </span>
                                            <span className="flex items-center gap-1 bg-zinc-500/10 text-slate-500 dark:text-zinc-400 border border-zinc-500/20 px-2 py-0.5 rounded-lg">
                                                <Clock className="w-3 h-3" /> {zone.estimated_time} دقيقة
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border hidden sm:block ${zone.is_active ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                                            {zone.is_active ? "نشط" : "موقوف"}
                                        </span>
                                        <button onClick={() => handleZoneToggle(zone)} className={`p-1.5 rounded-lg ${zone.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-500"}`}>
                                            {zone.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                        </button>
                                        <button onClick={() => startEditZone(zone)} className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => handleZoneDelete(zone.id)} className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
