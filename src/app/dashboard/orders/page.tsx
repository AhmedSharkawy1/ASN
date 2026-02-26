"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency, formatDate, statusLabel, statusColor, nextStatuses, elapsedTime, timeAgo } from "@/lib/helpers/formatters";
import { ClipboardList, Search, Filter, Download, ChevronDown, ChevronUp, Clock, FileText, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type OrderItem = { title: string; qty: number; price: number; size?: string };
type Order = {
    id: string; order_number: number; status: string; items: OrderItem[];
    subtotal: number; discount: number; total: number; payment_method: string;
    customer_name?: string; customer_phone?: string; table_id?: string; notes?: string;
    created_at: string; updated_at: string;
};
type OrderLog = { id: string; action: string; old_status?: string; new_status?: string; performed_by?: string; created_at: string };

export default function OrdersPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [orderLogs, setOrderLogs] = useState<Record<string, OrderLog[]>>({});
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

    const fetchOrders = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        let query = supabase.from('orders').select('*').eq('restaurant_id', restaurantId).eq('is_draft', false).order('created_at', { ascending: false });
        if (statusFilter !== "all") query = query.eq('status', statusFilter);
        if (dateRange.from) query = query.gte('created_at', dateRange.from);
        if (dateRange.to) query = query.lte('created_at', dateRange.to + 'T23:59:59');
        const { data } = await query;
        setOrders((data as Order[]) || []);
        setLoading(false);
    }, [restaurantId, statusFilter, dateRange]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
        await supabase.from('order_logs').insert({ order_id: orderId, action: `status_change`, old_status: order.status, new_status: newStatus, performed_by: 'admin' });
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o));
    };

    const fetchLogs = async (orderId: string) => {
        if (orderLogs[orderId]) return;
        const { data } = await supabase.from('order_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
        setOrderLogs(prev => ({ ...prev, [orderId]: (data as OrderLog[]) || [] }));
    };

    const toggleExpand = (orderId: string) => {
        if (expandedOrder === orderId) { setExpandedOrder(null); return; }
        setExpandedOrder(orderId);
        fetchLogs(orderId);
    };

    const exportCSV = () => {
        const headers = ["Order #", "Status", "Total", "Customer", "Payment", "Date"];
        const rows = filteredOrders.map(o => [o.order_number, o.status, o.total, o.customer_name || "-", o.payment_method, o.created_at]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click();
    };

    const filteredOrders = orders.filter(o => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return o.order_number.toString().includes(q) || o.customer_name?.toLowerCase().includes(q) || o.customer_phone?.includes(q);
        }
        return true;
    });

    const statCounts = {
        total: orders.length,
        pending: orders.filter(o => o.status === "pending").length,
        active: orders.filter(o => ["accepted", "preparing", "ready"].includes(o.status)).length,
        completed: orders.filter(o => o.status === "completed").length,
    };

    if (loading && orders.length === 0) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري تحميل الطلبات..." : "Loading orders..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-emerald-400" />
                        {isAr ? "إدارة الطلبات" : "Orders Management"}
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "تتبع وإدارة جميع الطلبات في مكان واحد" : "Track and manage all orders in one place"}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchOrders} className="p-2.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-700/50 transition"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-300 font-medium text-sm rounded-xl border border-zinc-700/50 hover:border-emerald-500/30 transition">
                        <Download className="w-4 h-4" /> {isAr ? "تصدير CSV" : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Stat Mini Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي الطلبات" : "Total", value: statCounts.total, color: "text-zinc-300" },
                    { label: isAr ? "قيد الانتظار" : "Pending", value: statCounts.pending, color: "text-amber-400" },
                    { label: isAr ? "نشطة" : "Active", value: statCounts.active, color: "text-blue-400" },
                    { label: isAr ? "مكتملة" : "Completed", value: statCounts.completed, color: "text-emerald-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isAr ? "بحث برقم الطلب أو اسم العميل..." : "Search by order # or customer..."}
                        className="w-full pe-10 ps-4 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50" />
                </div>
                <div className="relative">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="pe-8 ps-4 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white outline-none focus:border-emerald-500/50 appearance-none cursor-pointer">
                        <option value="all">{isAr ? "كل الحالات" : "All"}</option>
                        {["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"].map(s => (
                            <option key={s} value={s}>{statusLabel(s, isAr)}</option>
                        ))}
                    </select>
                </div>
                <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                    className="px-3 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white outline-none" />
                <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                    className="px-3 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white outline-none" />
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-zinc-500">
                    <ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد طلبات" : "No orders found"}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredOrders.map(order => {
                        const elapsed = elapsedTime(order.created_at, isAr);
                        const isExpanded = expandedOrder === order.id;
                        const validNext = nextStatuses(order.status);
                        return (
                            <div key={order.id} className={`bg-[#0d1117] border rounded-xl overflow-hidden transition-colors ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "border-red-500/40" : "border-zinc-800/50"}`}>
                                {/* Order Row */}
                                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => toggleExpand(order.id)}>
                                    <div className="w-14 text-center">
                                        <span className="text-lg font-extrabold text-white">#{order.order_number}</span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusColor(order.status)}`}>
                                        {statusLabel(order.status, isAr)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-300 truncate">{order.customer_name || (isAr ? "عميل" : "Customer")}</p>
                                        <p className="text-[10px] text-zinc-500">{order.items.length} {isAr ? "أصناف" : "items"}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "text-red-400" : "text-zinc-500"}`}>
                                        <Clock className="w-3 h-3" /> {elapsed.text}
                                    </div>
                                    <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(order.total)}</span>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="border-t border-zinc-800/50 p-4 space-y-4">
                                                {/* Items Table */}
                                                <div className="bg-black/20 rounded-xl p-3">
                                                    <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase">{isAr ? "الأصناف" : "Items"}</h4>
                                                    {order.items.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-800/30 last:border-0 text-sm">
                                                            <span className="text-zinc-300">{item.title} {item.size ? `(${item.size})` : ""} × {item.qty}</span>
                                                            <span className="text-zinc-400 font-bold">{formatCurrency(item.price * item.qty)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between pt-2 mt-2 border-t border-zinc-700/50 text-sm font-extrabold">
                                                        <span className="text-zinc-400">{isAr ? "الإجمالي" : "Total"}</span>
                                                        <span className="text-emerald-400">{formatCurrency(order.total)}</span>
                                                    </div>
                                                </div>

                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                    {order.customer_phone && <div className="bg-black/20 p-2.5 rounded-lg"><span className="text-zinc-500 block mb-0.5">{isAr ? "الهاتف" : "Phone"}</span><span className="text-zinc-300 font-bold" dir="ltr">{order.customer_phone}</span></div>}
                                                    <div className="bg-black/20 p-2.5 rounded-lg"><span className="text-zinc-500 block mb-0.5">{isAr ? "الدفع" : "Payment"}</span><span className="text-zinc-300 font-bold">{order.payment_method}</span></div>
                                                    <div className="bg-black/20 p-2.5 rounded-lg"><span className="text-zinc-500 block mb-0.5">{isAr ? "التاريخ" : "Date"}</span><span className="text-zinc-300 font-bold">{formatDate(order.created_at)}</span></div>
                                                    {order.notes && <div className="bg-black/20 p-2.5 rounded-lg col-span-2"><span className="text-zinc-500 block mb-0.5">{isAr ? "ملاحظات" : "Notes"}</span><span className="text-zinc-300">{order.notes}</span></div>}
                                                </div>

                                                {/* Status Actions */}
                                                {validNext.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {validNext.map(ns => (
                                                            <button key={ns} onClick={(e) => { e.stopPropagation(); updateStatus(order.id, ns); }}
                                                                className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${statusColor(ns)}`}>
                                                                → {statusLabel(ns, isAr)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Activity Log */}
                                                {orderLogs[order.id] && orderLogs[order.id].length > 0 && (
                                                    <div className="bg-black/20 rounded-xl p-3">
                                                        <h4 className="text-xs font-bold text-zinc-400 mb-2 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> {isAr ? "سجل النشاط" : "Activity Log"}</h4>
                                                        {orderLogs[order.id].map(log => (
                                                            <div key={log.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-zinc-800/20 last:border-0">
                                                                <span className="text-zinc-500">{timeAgo(log.created_at, isAr)}</span>
                                                                {log.old_status && <span className={`px-1.5 py-0.5 rounded ${statusColor(log.old_status)}`}>{statusLabel(log.old_status, isAr)}</span>}
                                                                {log.new_status && <><span className="text-zinc-600">→</span><span className={`px-1.5 py-0.5 rounded ${statusColor(log.new_status)}`}>{statusLabel(log.new_status, isAr)}</span></>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
