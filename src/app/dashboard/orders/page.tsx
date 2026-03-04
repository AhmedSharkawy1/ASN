"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { formatCurrency, formatDate, statusLabel, statusColor, nextStatuses, elapsedTime, timeAgo } from "@/lib/helpers/formatters";
import { ClipboardList, Search, Filter, Download, ChevronDown, ChevronUp, Clock, FileText, RefreshCw, Printer, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type OrderItem = {
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
};
type Order = {
    id: string; order_number: number; status: string; items: OrderItem[];
    subtotal: number; discount: number; total: number; payment_method: string;
    customer_name?: string; customer_phone?: string; table_id?: string; notes?: string;
    created_at: string; updated_at: string;
    _offline?: boolean; // from Dexie but not yet synced
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

        // 1️⃣ Load from Dexie (local, always available)
        const localOrders = await posDb.orders
            .where("restaurant_id").equals(restaurantId)
            .and(o => !o.is_draft && o.status !== "cancelled")
            .toArray();

        // Map Dexie orders to the Order shape
        const localMapped: Order[] = localOrders.map(o => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status || "completed",
            items: (o.items || []) as OrderItem[],
            subtotal: o.subtotal || 0,
            discount: o.discount || 0,
            total: o.total || 0,
            payment_method: o.payment_method || "cash",
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            notes: o.notes,
            created_at: o.created_at,
            updated_at: o.created_at,
            _offline: !!o._dirty,
        }));

        // 2️⃣ Also fetch from Supabase (online orders & synced records)
        let remoteOrders: Order[] = [];
        try {
            let query = supabase.from('orders').select('*').eq('restaurant_id', restaurantId).eq('is_draft', false).order('created_at', { ascending: false }).limit(500);
            if (statusFilter !== "all") query = query.eq('status', statusFilter);
            if (dateRange.from) query = query.gte('created_at', dateRange.from);
            if (dateRange.to) query = query.lte('created_at', dateRange.to + 'T23:59:59');
            const { data } = await query;
            remoteOrders = (data as Order[]) || [];
        } catch { /* offline - use local only */ }

        // 3️⃣ Merge: remote takes priority, local fills gaps
        const mergedMap = new Map<string, Order>();
        localMapped.forEach(o => mergedMap.set(o.id, o));
        remoteOrders.forEach(o => mergedMap.set(o.id, { ...o, _offline: false })); // remote wins

        let merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Apply status filter to merged list if needed
        if (statusFilter !== "all") merged = merged.filter(o => o.status === statusFilter);
        if (dateRange.from) merged = merged.filter(o => o.created_at >= dateRange.from);
        if (dateRange.to) merged = merged.filter(o => o.created_at <= dateRange.to + "T23:59:59");

        setOrders(merged);
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

    const printOrderReceipt = (order: Order) => {
        const itemsHtml = order.items.map(item =>
            `<tr><td style="padding:2px 0">${item.title}${item.size && item.size !== 'عادي' ? ` (${item.size})` : ''}</td><td style="text-align:center">${item.qty}</td><td style="text-align:left">${formatCurrency(item.price * item.qty)}</td></tr>`
        ).join('');
        const discountHtml = order.discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>${isAr ? 'الخصم' : 'Discount'}</span><span>-${formatCurrency(order.discount)}</span></div>` : '';
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (!printWindow) return;
        printWindow.document.write(`
            <html><head><title>Receipt #${order.order_number}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; font-size: 15px; width: 72mm; margin: 0 auto; padding: 10px; direction: rtl; color: #000; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } 
                td { padding: 4px 0; vertical-align: top; font-size: 15px; }
                .divider { border-top: 1.5px dashed #000; margin: 12px 0; }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .font-bold { font-weight: bold; }
                @media print { body { width: 72mm; margin: 0; padding: 0; } }
            </style></head><body>
            <div class="text-center" style="margin-bottom: 15px;">
                <p class="font-bold" style="font-size: 22px; margin: 0 0 5px 0;">${isAr ? 'فاتورة طلب' : 'Order Receipt'}</p>
                <p style="font-size: 14px; margin: 0 0 5px 0;">${new Date(order.created_at).toLocaleDateString('ar-EG')} - ${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                <p class="font-bold" style="font-size: 18px; margin: 0;">${isAr ? 'طلب رقم' : 'Order No'} #${order.order_number}</p>
                ${order.customer_name ? `<p class="font-bold" style="font-size: 15px; margin: 5px 0 0 0;">👤 ${order.customer_name}</p>` : ''}
            </div>
            <div class="divider"></div>
            <table><thead><tr>
                <td class="font-bold" style="padding-bottom: 8px;">${isAr ? 'الصنف' : 'Item'}</td>
                <td class="font-bold text-center" style="padding-bottom: 8px;">${isAr ? 'الكمية' : 'Qty'}</td>
                <td class="font-bold text-left" style="padding-bottom: 8px;">${isAr ? 'المبلغ' : 'Amt'}</td>
            </tr></thead><tbody>${itemsHtml}</tbody></table>
            <div class="divider"></div>
            ${discountHtml}
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px;margin-top:10px;">
                <span>${isAr ? 'الإجمالي' : 'Total'}</span><span>${formatCurrency(order.total)}</span>
            </div>
            <div class="divider"></div>
            <div class="text-center" style="font-size: 14px; margin-top: 20px; font-weight: bold;">
                <p style="margin: 0;">${isAr ? 'شكراً لزيارتكم' : 'Thank you for your visit'}</p>
            </div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
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
                                    {order._offline && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg border bg-orange-500/10 text-orange-400 border-orange-500/20 flex items-center gap-0.5">
                                            <WifiOff className="w-2.5 h-2.5" /> لم يُزامن
                                        </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-300 truncate">{order.customer_name || (isAr ? "عميل" : "Customer")}</p>
                                        <p className="text-[10px] text-zinc-500">{order.items.length} {isAr ? "أصناف" : "items"}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "text-red-400" : "text-zinc-500"}`}>
                                        <Clock className="w-3 h-3" /> {elapsed.text}
                                    </div>
                                    <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(order.total)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); printOrderReceipt(order); }}
                                        title={isAr ? "طباعة الفاتورة" : "Print Receipt"}
                                        className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                                        <Printer className="w-4 h-4" />
                                    </button>
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
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-zinc-300">{item.title} {item.size && item.size !== 'عادي' ? `(${item.size})` : ""} × {item.qty}</span>
                                                                {item.category && <span className="text-[10px] text-zinc-500">🗂️ {item.category}</span>}
                                                            </div>
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

                                                {/* Print Receipt Button */}
                                                <button onClick={(e) => { e.stopPropagation(); printOrderReceipt(order); }}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-500/20">
                                                    <Printer className="w-4 h-4" />
                                                    {isAr ? "طباعة الفاتورة" : "Print Receipt"}
                                                </button>

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
