"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { formatCurrency, formatQuantity, formatDate, statusLabel, statusColor, nextStatuses, elapsedTime, timeAgo } from "@/lib/helpers/formatters";
import { ClipboardList, Search, Filter, Download, ChevronDown, ChevronUp, Clock, FileText, RefreshCw, Printer, WifiOff, Monitor, Globe, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getReceiptStyles } from "@/lib/helpers/printerSettings";
import { useRouter } from "next/navigation";

type OrderItem = {
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
    weight_unit?: string;
};
type Order = {
    id: string; order_number: number; status: string; items: OrderItem[];
    subtotal: number; discount: number; total: number; deposit_amount: number; payment_method: string;
    customer_name?: string; customer_phone?: string; customer_address?: string; table_id?: string; notes?: string;
    delivery_driver_id?: string; delivery_driver_name?: string; delivery_fee?: number;
    order_type?: string;
    created_at: string; updated_at: string;
    source?: string; // 'pos' for cashier, null/undefined for website
    cashier_name?: string;
    _offline?: boolean; // from Dexie but not yet synced
};
type OrderLog = { id: string; action: string; old_status?: string; new_status?: string; performed_by?: string; created_at: string };

export default function OrdersPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [orderLogs, setOrderLogs] = useState<Record<string, OrderLog[]>>({});
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
    const [sourceFilter, setSourceFilter] = useState<string>("all");

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
            deposit_amount: o.deposit_amount || 0,
            payment_method: o.payment_method || "cash",
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            customer_address: o.customer_address,
            delivery_driver_id: o.delivery_driver_id,
            delivery_driver_name: o.delivery_driver_name,
            delivery_fee: o.delivery_fee,
            order_type: o.order_type,
            notes: o.notes,
            source: 'pos',
            cashier_name: o.cashier_name,
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
        if (statusFilter !== "all") {
            if (statusFilter === "in_progress") {
                merged = merged.filter(o => ["in_progress", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status));
            } else {
                merged = merged.filter(o => o.status === statusFilter);
            }
        }
        if (dateRange.from) merged = merged.filter(o => o.created_at >= dateRange.from);
        if (dateRange.to) merged = merged.filter(o => o.created_at <= dateRange.to + "T23:59:59");

        // Apply source filter
        if (sourceFilter === 'pos') merged = merged.filter(o => o.source === 'pos');
        if (sourceFilter === 'website') merged = merged.filter(o => !o.source || o.source !== 'pos');

        setOrders(merged);
        setLoading(false);
    }, [restaurantId, statusFilter, dateRange, sourceFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        if (newStatus === 'completed') {
            try {
                const res = await fetch(`/api/orders/${orderId}/complete`, { method: 'POST' });
                if (!res.ok) throw new Error("Failed to complete order via API");
                // Optimistically update UI
                setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o));
            } catch (err) {
                console.error(err);
                alert("تعذر إكمال الطلب السحابي. يرجى المحاولة مرة أخرى.");
            }
            return;
        }

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

        const orderTypeLabel = order.order_type === 'dine_in' ? 'صالة' : order.order_type === 'delivery' ? 'دليفري' : 'تيك أواي';
        
        const itemsHtml = order.items.map(item => {
            const fmt = formatQuantity(item.qty, item.weight_unit || (isAr ? 'قطعة' : 'unit'), isAr);
            const title = item.weight_unit
                ? `(${fmt.qty} ${fmt.unit}) ${item.title}`
                : item.title + (item.size && item.size !== 'عادي' ? ` (${item.size})` : '');
            const qtyStr = item.weight_unit ? '1' : `${fmt.qty}`;
            return `<tr>
                <td style="padding:4px 0;font-size:14px">${item.category ? `<span style="font-size:12px;color:#0284c7;font-weight:bold">${item.category}<br/></span>` : ''}${title}</td>
                <td style="text-align:center;padding:4px 0;font-size:15px;font-weight:bold">${qtyStr}</td>
                <td style="text-align:left;padding:4px 0;font-size:15px;font-weight:bold">${formatCurrency(item.price * item.qty)}</td>
            </tr>`;
        }).join('');

        const pw = window.open('', '_blank', 'width=300,height=600');
        if (pw) {
            pw.document.write(`<html><head><title>Receipt</title><style>${getReceiptStyles()}</style></head><body>
                <div style="text-align:center;margin-bottom:15px">
                    ${(restaurant?.receipt_logo_url || restaurant?.logo_url) ? `<img src="${restaurant.receipt_logo_url || restaurant.logo_url}" alt="Logo" style="width:80px;height:80px;object-fit:contain;margin-bottom:10px;margin-left:auto;margin-right:auto;display:block" />` : ''}
                    <p style="font-weight:bold;font-size:22px;margin:0 0 5px 0">${restaurant?.name || 'Restaurant'}</p>
                    ${restaurant?.phone ? `<p style="font-size:14px;margin:0 0 5px 0" dir="ltr">${restaurant.phone}</p>` : ''}
                    ${restaurant?.phone_numbers?.map(p => `<p style="font-size:14px;margin:0 0 5px 0" dir="ltr">${p.number}</p>`).join('') || ''}
                    ${restaurant?.address ? `<p style="font-size:14px;margin:0 0 5px 0">${restaurant.address}</p>` : ''}
                    <p style="font-size:14px;margin:0 0 5px 0">${new Date(order.created_at).toLocaleDateString('ar-EG')} - ${new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p style="font-weight:bold;font-size:18px;margin:0 0 5px 0">فاتورة رقم #${order.order_number}</p>
                    <p style="font-size:16px;font-weight:bold;margin:0;display:inline-block;border:1px solid #000;padding:2px 6px;border-radius:4px">${orderTypeLabel}</p>
                </div>
                ${(order.customer_name || order.customer_phone) ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px">
                    ${order.customer_name ? `<p style="margin:2px 0">العميل: ${order.customer_name}</p>` : ''}
                    ${order.customer_phone ? `<p style="margin:2px 0" dir="ltr">${order.customer_phone}</p>` : ''}
                    ${order.customer_address ? `<p style="margin:2px 0">العنوان: ${order.customer_address}</p>` : ''}
                </div>` : ''}
                ${order.notes ? `<div style="border-top:1.5px dashed #000;margin:12px 0"></div><div style="font-size:14px"><p style="margin:2px 0">ملاحظات: <strong>${order.notes}</strong></p></div>` : ''}
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
                    <thead><tr>
                        <td style="font-weight:bold;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الصنف</td>
                        <td style="font-weight:bold;text-align:center;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">الكمية</td>
                        <td style="font-weight:bold;text-align:left;padding-bottom:8px;border-bottom:1.5px dashed #000;font-size:15px">المبلغ</td>
                    </tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;font-size:15px"><span>الخصم</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
                ${(order.delivery_fee || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#0891b2"><span>🚚 حساب الدليفري ${order.delivery_driver_name ? `(${order.delivery_driver_name})` : ''}</span><span>+${formatCurrency(order.delivery_fee || 0)}</span></div>` : ''}
                <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:20px;margin-top:10px"><span>الإجمالي</span><span>${formatCurrency(order.total)}</span></div>
                ${order.payment_method === 'deposit' && order.deposit_amount > 0 ? `
                    <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;color:#d97706;margin-top:8px"><span>المدفوع (عربون)</span><span>${formatCurrency(order.deposit_amount)}</span></div>
                    <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#dc2626;margin-top:4px"><span>الباقي</span><span>${formatCurrency(Math.max(0, order.total - order.deposit_amount))}</span></div>
                ` : ''}
                <div style="border-top:1.5px dashed #000;margin:12px 0"></div>
                <div style="font-size:13px;font-weight:bold;text-align:center">طريقة الدفع: <strong>${order.payment_method === 'cash' ? 'كاش' : order.payment_method === 'deposit' ? 'عربون' : order.payment_method}</strong></div>
                <div style="text-align:center;font-size:13px;margin-top:20px;font-weight:bold"><p style="margin:0">شكرا لطلبكم نتمنى ان ينال اعجابكم ❤️</p></div>
                <script>
                    window.onload = function() {
                        const imgs = document.getElementsByTagName('img');
                        if (imgs.length === 0) {
                            window.print();
                        } else {
                            let loaded = 0;
                            const finish = () => {
                                loaded++;
                                if (loaded >= imgs.length) {
                                    window.print();
                                }
                            };
                            for (let img of imgs) {
                                if (img.complete) finish();
                                else { img.onload = finish; img.onerror = finish; }
                            }
                        }
                    };
                </script>
            </body></html>`);
            pw.document.close(); pw.focus();
        }
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
        in_progress: orders.filter(o => ["in_progress", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status)).length,
        completed: orders.filter(o => o.status === "completed").length,
    };

    if (loading && orders.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري تحميل الطلبات..." : "Loading orders..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        {isAr ? "إدارة الطلبات" : "Orders Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "تتبع وإدارة جميع الطلبات في مكان واحد" : "Track and manage all orders in one place"}</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                    <button onClick={fetchOrders} className="flex-1 sm:flex-none p-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-300 dark:border-zinc-700/50 transition flex items-center justify-center"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={exportCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-base rounded-xl border border-slate-300 dark:border-zinc-700/50 -blue/30 transition">
                        <Download className="w-4 h-4" /> {isAr ? "تصدير CSV" : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Stat Mini Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي الطلبات" : "Total", value: statCounts.total, color: "text-slate-700 dark:text-zinc-300" },
                    { label: isAr ? "قيد الانتظار" : "Pending", value: statCounts.pending, color: "text-amber-600 dark:text-amber-400" },
                    { label: isAr ? "تحت التنفيذ" : "In Progress", value: statCounts.in_progress, color: "text-blue-600 dark:text-blue-400" },
                    { label: isAr ? "مكتملة" : "Completed", value: statCounts.completed, color: "text-emerald-600 dark:text-emerald-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-zinc-500" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isAr ? "بحث برقم الطلب أو اسم العميل..." : "Search by order # or customer..."}
                        className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none -blue/50" />
                </div>
                <div className="relative w-full sm:w-auto">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-zinc-500" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none -blue/50 appearance-none cursor-pointer">
                        <option value="all">{isAr ? "كل الحالات" : "All"}</option>
                        {["pending", "in_progress", "completed", "cancelled"].map(s => (
                            <option key={s} value={s}>{statusLabel(s, isAr)}</option>
                        ))}
                    </select>
                </div>
                <div className="relative w-full sm:w-auto">
                    <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                        className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none appearance-none cursor-pointer font-bold">
                        <option value="all">{isAr ? "كل المصادر" : "All Sources"}</option>
                        <option value="pos">{isAr ? "🖥️ الكاشير (POS)" : "🖥️ POS (Cashier)"}</option>
                        <option value="website">{isAr ? "🌐 الويب (المنيو)" : "🌐 Website (Menu)"}</option>
                    </select>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                        className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white outline-none" />
                    <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                        className="flex-1 sm:flex-none px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white outline-none" />
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد طلبات" : "No orders found"}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredOrders.map(order => {
                        const elapsed = elapsedTime(order.created_at, isAr);
                        const isExpanded = expandedOrder === order.id;
                        const validNext = nextStatuses(order.status, order.source);
                        return (
                            <div key={order.id} className={`bg-white dark:bg-card border rounded-xl overflow-hidden transition-colors ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "border-red-500/40" : "border-slate-200 dark:border-zinc-800/50"}`}>
                                {/* Order Row */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition" onClick={() => toggleExpand(order.id)}>
                                    <div className="flex items-center justify-between sm:w-16 sm:block sm:text-center">
                                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">#{order.order_number}</span>
                                        <span className={`sm:hidden text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor(order.status)}`}>
                                            {statusLabel(order.status, isAr)}
                                        </span>
                                    </div>
                                    {/* Source Badge */}
                                    {order.source === 'pos' ? (
                                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg border bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 flex items-center gap-1 shrink-0">
                                            <Monitor className="w-3.5 h-3.5" /> {isAr ? "كاشير" : "POS"}
                                        </span>
                                    ) : (
                                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg border bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20 flex items-center gap-1 shrink-0">
                                            <Globe className="w-3.5 h-3.5" /> {isAr ? "أونلاين" : "Online"}
                                        </span>
                                    )}
                                    <span className={`hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor(order.status)} shrink-0`}>
                                        {statusLabel(order.status, isAr)}
                                    </span>
                                    {order._offline && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg border bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 flex items-center gap-0.5 shrink-0">
                                            <WifiOff className="w-3 h-3" /> لم يُزامن
                                        </span>
                                    )}
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                        <p className="text-base font-bold text-slate-700 dark:text-zinc-300 truncate">{order.customer_name || (isAr ? "عميل" : "Customer")}</p>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-slate-500 dark:text-zinc-500">{order.items.length} {isAr ? "أصناف" : "items"}</p>
                                            <div className={`flex items-center gap-1 text-xs font-bold ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-zinc-500"}`}>
                                                <Clock className="w-3 h-3" /> {elapsed.text}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-zinc-800/20">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.total)}</span>
                                            {order.total - order.deposit_amount > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-emerald-600">{isAr ? "عربون: " : "Dep: "}{formatCurrency(order.deposit_amount)}</span>
                                                    <span className="text-[10px] font-bold text-red-500">{isAr ? "متبقي: " : "Rem: "}{formatCurrency(order.total - order.deposit_amount)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-500 opacity-60">
                                                    {isAr ? "تم استلام المبلغ" : "Amount Received"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); printOrderReceipt(order); }}
                                                title={isAr ? "طباعة الفاتورة" : "Print Receipt"}
                                                className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/pos?edit=${order.id}`); }}
                                                title={isAr ? "تعديل الطلب" : "Edit Order"}
                                                className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500 dark:text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-slate-500 dark:text-zinc-500" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                            <div className="border-t border-slate-200 dark:border-zinc-800/50 p-4 space-y-4">
                                                {/* Items Table */}
                                                <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-3">
                                                    <h4 className="text-sm font-bold text-slate-500 dark:text-zinc-400 mb-2 uppercase">{isAr ? "الأصناف" : "Items"}</h4>
                                                    {order.items.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-zinc-800/30 last:border-0 text-base">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-slate-700 dark:text-zinc-300">
                                                                    {(() => {
                                                                        const fmt = formatQuantity(item.qty, item.weight_unit || (isAr ? 'قطعة' : 'unit'), isAr);
                                                                        return (
                                                                            <>
                                                                                {item.title} {item.size && item.size !== 'عادي' ? `(${item.size})` : ""} 
                                                                                {item.weight_unit ? ` (${fmt.qty} ${fmt.unit})` : ""} × {item.weight_unit ? '1' : fmt.qty}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </span>
                                                                {item.category && <span className="text-xs text-slate-500 dark:text-zinc-500">🗂️ {item.category}</span>}
                                                            </div>
                                                            <span className="text-slate-500 dark:text-zinc-400 font-bold">{formatCurrency(item.price * item.qty)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-300 dark:border-zinc-700/50 text-base font-extrabold">
                                                        <span className="text-slate-500 dark:text-zinc-400">{isAr ? "الإجمالي" : "Total"}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(order.total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-bold mt-1">
                                                        <span className="text-slate-500 dark:text-zinc-400">{isAr ? "المدفوع (العربون)" : "Paid (Deposit)"}</span>
                                                        <span className="text-blue-500">{formatCurrency(order.deposit_amount)}</span>
                                                    </div>
                                                    {order.total - order.deposit_amount > 0 && (
                                                        <div className="flex justify-between text-xs font-bold mt-0.5">
                                                            <span className="text-slate-500 dark:text-zinc-400">{isAr ? "المتبقي" : "Remaining"}</span>
                                                            <span className="text-red-500">{formatCurrency(order.total - order.deposit_amount)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    {order.customer_phone && <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg"><span className="text-slate-500 dark:text-zinc-500 block mb-0.5">{isAr ? "الهاتف" : "Phone"}</span><span className="text-slate-700 dark:text-zinc-300 font-bold" dir="ltr">{order.customer_phone}</span></div>}
                                                    <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg">
                                                        <span className="text-slate-500 dark:text-zinc-500 block mb-0.5">{isAr ? "الدفع" : "Payment"}</span>
                                                        <span className="text-slate-700 dark:text-zinc-300 font-bold">
                                                            {((order.total - order.deposit_amount) <= 0 || order.payment_method === 'cash') 
                                                                ? (isAr ? "تم استلام المبلغ" : "Amount Received")
                                                                : (isAr ? `عربون: ${order.deposit_amount} - متبقي: ${order.total - order.deposit_amount}` : `Dep: ${order.deposit_amount} - Rem: ${order.total - order.deposit_amount}`)
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg"><span className="text-slate-500 dark:text-zinc-500 block mb-0.5">{isAr ? "التاريخ" : "Date"}</span><span className="text-slate-700 dark:text-zinc-300 font-bold">{formatDate(order.created_at)}</span></div>
                                                    {order.notes && <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-lg col-span-2"><span className="text-slate-500 dark:text-zinc-500 block mb-0.5">{isAr ? "ملاحظات" : "Notes"}</span><span className="text-slate-700 dark:text-zinc-300">{order.notes}</span></div>}
                                                </div>

                                                {/* Status Actions */}
                                                {validNext.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {validNext.map(ns => (
                                                            <button key={ns} onClick={(e) => { e.stopPropagation(); updateStatus(order.id, ns); }}
                                                                className={`text-sm font-bold px-4 py-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${statusColor(ns)}`}>
                                                                {ns === 'in_progress' && order.source !== 'pos' ? (isAr ? '✅ تأكيد الطلب' : '✅ Confirm') : `→ ${statusLabel(ns, isAr)}`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Print Receipt Button */}
                                                <div className="flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); printOrderReceipt(order); }}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-200 dark:border-glass-border">
                                                        <Printer className="w-4 h-4" />
                                                        {isAr ? "طباعة الفاتورة" : "Print Receipt"}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/pos?edit=${order.id}`); }}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 border border-blue-200 dark:border-zinc-800/20">
                                                        <Edit2 className="w-4 h-4" />
                                                        {isAr ? "تعديل الطلب" : "Edit Order"}
                                                    </button>
                                                </div>

                                                {/* Activity Log */}
                                                {orderLogs[order.id] && orderLogs[order.id].filter(l => l.action === 'status_change').length > 0 && (
                                                    <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-3">
                                                        <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-2 uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> {isAr ? "سجل النشاط" : "Activity Log"}</h4>
                                                        {orderLogs[order.id].filter(l => l.action === 'status_change').map(log => (
                                                            <div key={log.id} className="flex flex-col gap-1 text-[10px] py-1 border-b border-slate-100 dark:border-zinc-800/20 last:border-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-slate-500 dark:text-zinc-500">{timeAgo(log.created_at, isAr)}</span>
                                                                    {log.old_status && <span className={`px-1.5 py-0.5 rounded ${statusColor(log.old_status)}`}>{statusLabel(log.old_status, isAr)}</span>}
                                                                    {log.new_status && <><span className="text-slate-400 dark:text-zinc-600">→</span><span className={`px-1.5 py-0.5 rounded ${statusColor(log.new_status)}`}>{statusLabel(log.new_status, isAr)}</span></>}
                                                                </div>
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
