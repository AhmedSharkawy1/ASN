"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { formatCurrency, formatQuantity, formatDate, statusLabel, statusColor, nextStatuses, elapsedTime, timeAgo } from "@/lib/helpers/formatters";
import { ClipboardList, Search, Filter, Download, ChevronDown, ChevronUp, Clock, FileText, RefreshCw, Printer, WifiOff, Monitor, Globe, Edit2, Trash2, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getPrinterSettings } from "@/lib/helpers/printerSettings";
import { renderReceiptHtml } from "@/lib/helpers/receiptRenderer";
import { executePrint, triggerCashDrawerIfEnabled } from "@/lib/helpers/printEngine";
import { useRouter } from "next/navigation";
import { pullFromSupabase, pushDirtyToSupabase, subscribeSyncStatus } from "@/lib/sync-service";
import { toast } from "sonner";
import { applyOrderSearchToSupabase, matchesOrderSearch, sortOrdersForSearch } from "@/lib/helpers/orderSearch";

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

type Timeframe = "today" | "week" | "month" | "all" | "custom";

export default function OrdersPage() {
    const router = useRouter();
    const { language } = useLanguage();
    const { restaurantId, restaurant } = useRestaurant();
    const isAr = language === "ar";

    const formatOrderCurrency = useCallback((amount: number) => {
        return formatCurrency(amount, restaurant?.currency || "ج.م");
    }, [restaurant]);

    // Data State
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [timeframe, setTimeframe] = useState<Timeframe>("today");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Stats State (Lightweight server-side counts)
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
    });
    const [loadingStats, setLoadingStats] = useState(false);

    // UI state
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [orderLogs, setOrderLogs] = useState<Record<string, OrderLog[]>>({});
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Helper: Compute date bounds for timeframe
    const getDateBounds = useCallback(() => {
        const now = new Date();
        if (timeframe === "today") {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        if (timeframe === "week") {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        if (timeframe === "month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return { from: start.toISOString(), to: end.toISOString() };
        }
        if (timeframe === "custom") {
            return {
                from: customFrom ? new Date(customFrom + "T00:00:00").toISOString() : undefined,
                to: customTo ? new Date(customTo + "T23:59:59.999").toISOString() : undefined,
            };
        }
        return { from: undefined, to: undefined };
    }, [timeframe, customFrom, customTo]);

    // 1️⃣ Fetch Exact Server-side Stats via parallel lightweight HEAD requests
    const fetchStats = useCallback(async () => {
        if (!restaurantId) return;
        setLoadingStats(true);
        try {
            const { from, to } = getDateBounds();

            let qTotal = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_draft', false);
            let qPending = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_draft', false).eq('status', 'pending');
            let qInProg = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_draft', false).in('status', ['in_progress', 'accepted', 'preparing', 'ready', 'out_for_delivery']);
            let qCompleted = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_draft', false).eq('status', 'completed');

            if (from) {
                qTotal = qTotal.gte('created_at', from);
                qPending = qPending.gte('created_at', from);
                qInProg = qInProg.gte('created_at', from);
                qCompleted = qCompleted.gte('created_at', from);
            }
            if (to) {
                qTotal = qTotal.lte('created_at', to);
                qPending = qPending.lte('created_at', to);
                qInProg = qInProg.lte('created_at', to);
                qCompleted = qCompleted.lte('created_at', to);
            }

            const [
                { count: totalCount },
                { count: pendingCount },
                { count: inProgressCount },
                { count: completedCount },
            ] = await Promise.all([qTotal, qPending, qInProg, qCompleted]);

            setStats({
                total: totalCount ?? 0,
                pending: pendingCount ?? 0,
                in_progress: inProgressCount ?? 0,
                completed: completedCount ?? 0,
            });
        } catch (err) {
            console.warn("Could not fetch server stats:", err);
        } finally {
            setLoadingStats(false);
        }
    }, [restaurantId, getDateBounds]);

    // 2️⃣ Fetch Paginated Orders from Supabase / Dexie
    const fetchOrders = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);

        try {
            // Build Server-side Query
            let query = supabase
                .from('orders')
                .select('*', { count: 'exact' })
                .eq('restaurant_id', restaurantId)
                .eq('is_draft', false);

            // Search by order number, customer phone, or customer name
            if (debouncedSearch) {
                query = applyOrderSearchToSupabase(query, debouncedSearch);
            } else {
                // Apply timeframe date filter only if not specifically searching
                const { from, to } = getDateBounds();
                if (from) query = query.gte('created_at', from);
                if (to) query = query.lte('created_at', to);
            }

            // Status Filter
            if (statusFilter !== 'all') {
                if (statusFilter === 'in_progress') {
                    query = query.in('status', ['in_progress', 'accepted', 'preparing', 'ready', 'out_for_delivery']);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            // Source Filter
            if (sourceFilter === 'pos') {
                query = query.eq('source', 'pos');
            } else if (sourceFilter === 'website') {
                query = query.or('source.is.null,source.neq.pos');
            }

            // Server-side Pagination
            const fromIdx = (page - 1) * pageSize;
            const toIdx = fromIdx + pageSize - 1;

            query = query.order('created_at', { ascending: false }).range(fromIdx, toIdx);

            const { data, count, error } = await query;

            if (error) {
                throw error;
            }

            let remoteOrders = (data as Order[]) || [];
            if (debouncedSearch) {
                remoteOrders = sortOrdersForSearch(remoteOrders, debouncedSearch);
            }
            setTotalCount(count ?? 0);

            // On first page, also check for any local unsynced (dirty) orders in Dexie
            if (page === 1) {
                try {
                    const dirtyOrders = await posDb.orders
                        .where("restaurant_id").equals(restaurantId)
                        .and(o => !o.is_draft && !!o._dirty)
                        .toArray();

                    if (dirtyOrders.length > 0) {
                        const dirtyMapped: Order[] = dirtyOrders.map(o => ({
                            id: o.id,
                            order_number: o.order_number,
                            status: o.status || "pending",
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
                            source: o.source || 'pos',
                            cashier_name: o.cashier_name,
                            created_at: o.created_at,
                            updated_at: o.updated_at || o.created_at,
                            _offline: true,
                        }));

                        const map = new Map<string, Order>();
                        dirtyMapped.forEach(o => map.set(o.id, o));
                        remoteOrders.forEach(o => {
                            if (!map.has(o.id)) map.set(o.id, o);
                        });
                        remoteOrders = Array.from(map.values()).sort(
                            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );
                    }
                } catch { /* ignore dexie dirty merge err */ }
            }

            setOrders(remoteOrders);
        } catch (err) {
            console.error("Fetch orders failed, falling back to local Dexie:", err);
            // Offline fallback
            try {
                const local = await posDb.orders
                    .where("restaurant_id").equals(restaurantId)
                    .and(o => !o.is_draft)
                    .toArray();

                const mapped: Order[] = local.map(o => ({
                    id: o.id,
                    order_number: o.order_number,
                    status: o.status || "pending",
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
                    source: o.source || 'pos',
                    cashier_name: o.cashier_name,
                    created_at: o.created_at,
                    updated_at: o.updated_at || o.created_at,
                    _offline: !!o._dirty,
                })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                let filtered = mapped;
                if (debouncedSearch) {
                    filtered = sortOrdersForSearch(
                        mapped.filter(o => matchesOrderSearch(o, debouncedSearch)),
                        debouncedSearch
                    );
                }
                if (statusFilter !== 'all') {
                    if (statusFilter === 'in_progress') {
                        filtered = filtered.filter(o => ['in_progress', 'accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.status));
                    } else {
                        filtered = filtered.filter(o => o.status === statusFilter);
                    }
                }
                if (sourceFilter === 'pos') {
                    filtered = filtered.filter(o => o.source === 'pos');
                } else if (sourceFilter === 'website') {
                    filtered = filtered.filter(o => !o.source || o.source !== 'pos');
                }

                setTotalCount(filtered.length);
                const fromIdx = (page - 1) * pageSize;
                setOrders(filtered.slice(fromIdx, fromIdx + pageSize));
            } catch { /* offline fallback failed */ }
        } finally {
            setLoading(false);
        }
    }, [restaurantId, debouncedSearch, statusFilter, sourceFilter, page, pageSize, getDateBounds]);

    // Initial load and on parameter change
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Sync status listener
    useEffect(() => {
        return subscribeSyncStatus(s => {
            setIsOnline(s.isOnline);
            setIsSyncing(s.isSyncing);
            setPendingSyncCount(s.pendingCount);
            if (!s.isSyncing) {
                fetchStats();
                fetchOrders();
            }
        });
    }, [fetchStats, fetchOrders]);

    // Update order status
    const updateStatus = async (orderId: string, newStatus: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const oldStatus = order.status;
        const updatedTime = new Date().toISOString();

        // 1. Optimistic local update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updated_at: updatedTime } : o));

        setStats(prev => {
            const next = { ...prev };
            const isInProg = (s: string) => ["in_progress", "accepted", "preparing", "ready", "out_for_delivery"].includes(s);
            if (oldStatus === "pending") next.pending = Math.max(0, next.pending - 1);
            else if (isInProg(oldStatus)) next.in_progress = Math.max(0, next.in_progress - 1);
            else if (oldStatus === "completed") next.completed = Math.max(0, next.completed - 1);

            if (newStatus === "pending") next.pending += 1;
            else if (isInProg(newStatus)) next.in_progress += 1;
            else if (newStatus === "completed") next.completed += 1;

            return next;
        });

        // 2. Local Dexie update
        try {
            await posDb.orders.update(orderId, { status: newStatus, updated_at: updatedTime, _dirty: true });
        } catch (dexieErr) {
            console.warn("Could not update Dexie order:", dexieErr);
        }

        // 3. Remote Supabase update
        if (newStatus === 'completed') {
            try {
                const res = await fetch(`/api/orders/${orderId}/complete`, { method: 'POST' });
                if (res.ok) {
                    await posDb.orders.update(orderId, { _dirty: false }).catch(() => {});
                    fetchStats();
                    return;
                }
            } catch (err) {
                console.error(err);
            }
        }

        try {
            const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: updatedTime }).eq('id', orderId);
            if (!error) {
                await posDb.orders.update(orderId, { _dirty: false }).catch(() => {});
                await supabase.from('order_logs').insert({ order_id: orderId, action: `status_change`, old_status: oldStatus, new_status: newStatus, performed_by: 'admin' });
                fetchStats();
            }
        } catch (err) {
            console.error("Direct update failed:", err);
        }
    };

    // Delete order
    const deleteOrder = async (orderId: string) => {
        if (!confirm(isAr ? "هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to permanently delete this order? This cannot be undone.")) return;

        const orderToDelete = orders.find(o => o.id === orderId);
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setTotalCount(prev => Math.max(0, prev - 1));

        if (orderToDelete) {
            setStats(prev => {
                const next = { ...prev, total: Math.max(0, prev.total - 1) };
                const isInProg = (s: string) => ["in_progress", "accepted", "preparing", "ready", "out_for_delivery"].includes(s);
                if (orderToDelete.status === "pending") next.pending = Math.max(0, next.pending - 1);
                else if (isInProg(orderToDelete.status)) next.in_progress = Math.max(0, next.in_progress - 1);
                else if (orderToDelete.status === "completed") next.completed = Math.max(0, next.completed - 1);
                return next;
            });
        }

        try {
            await posDb.orders.delete(orderId).catch(() => {});
            await supabase.from('orders').delete().eq('id', orderId);
            fetchStats();
        } catch (err) {
            console.error(err);
            alert(isAr ? "تعذر حذف الطلب." : "Failed to delete order.");
        }
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

    const printOrderReceipt = async (order: Order) => {
        if (!restaurantId) return;
        const html = renderReceiptHtml(order, restaurant, isAr);
        const settings = getPrinterSettings();
        executePrint(html, settings);
        triggerCashDrawerIfEnabled(settings);
    };

    // On-demand CSV Export (Ultra light memory usage)
    const exportCSV = async () => {
        if (!restaurantId) return;
        const toastId = toast.loading(isAr ? "جاري تحضير ملف CSV..." : "Preparing CSV...");
        try {
            let q = supabase
                .from('orders')
                .select('order_number, status, total, deposit_amount, customer_name, customer_phone, payment_method, source, created_at')
                .eq('restaurant_id', restaurantId)
                .eq('is_draft', false);

            if (debouncedSearch) {
                q = applyOrderSearchToSupabase(q, debouncedSearch);
            } else {
                const { from, to } = getDateBounds();
                if (from) q = q.gte('created_at', from);
                if (to) q = q.lte('created_at', to);
            }

            if (statusFilter !== 'all') {
                if (statusFilter === 'in_progress') {
                    q = q.in('status', ['in_progress', 'accepted', 'preparing', 'ready', 'out_for_delivery']);
                } else {
                    q = q.eq('status', statusFilter);
                }
            }

            if (sourceFilter === 'pos') {
                q = q.eq('source', 'pos');
            } else if (sourceFilter === 'website') {
                q = q.or('source.is.null,source.neq.pos');
            }

            const { data, error } = await q.order('created_at', { ascending: false }).limit(5000);
            if (error || !data || data.length === 0) {
                toast.error(isAr ? "لا توجد طلبات للتصدير" : "No orders found to export", { id: toastId });
                return;
            }

            const headers = ["Order #", "Status", "Total", "Deposit", "Customer", "Phone", "Payment", "Source", "Date"];
            const rows = data.map(o => [
                o.order_number,
                statusLabel(o.status, isAr),
                o.total,
                o.deposit_amount || 0,
                `"${(o.customer_name || "-").replace(/"/g, '""')}"`,
                `"${(o.customer_phone || "-").replace(/"/g, '""')}"`,
                o.payment_method || "-",
                o.source === 'pos' ? 'POS' : 'Website',
                formatDate(o.created_at)
            ]);

            const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
            const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `orders_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            toast.success(isAr ? `تم تصدير ${data.length} طلب بنجاح` : `Exported ${data.length} orders successfully`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error(isAr ? "فشل تصدير ملف CSV" : "Failed to export CSV", { id: toastId });
        }
    };

    // Calculate Pagination Range
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginationRange = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages: (number | string)[] = [];
        if (page <= 4) {
            for (let i = 1; i <= 5; i++) pages.push(i);
            pages.push('...');
            pages.push(totalPages);
        } else if (page >= totalPages - 3) {
            pages.push(1);
            pages.push('...');
            for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            pages.push('...');
            pages.push(page - 1);
            pages.push(page);
            pages.push(page + 1);
            pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    }, [page, totalPages]);

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <ClipboardList className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        {isAr ? "إدارة الطلبات" : "Orders Management"}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">
                        {isAr ? "تتبع وإدارة جميع الطلبات في مكان واحد بسرعة وتوفير لموارد السيرفر" : "Track and manage all orders with ultra-fast server pagination"}
                    </p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                    <button 
                        onClick={async () => {
                            if (!restaurantId) return;
                            if (!navigator.onLine) {
                                toast.error(isAr ? "أنت غير متصل بالإنترنت" : "You are offline");
                                return;
                            }
                            const toastId = toast.loading(isAr ? "جاري المزامنة مع السيرفر..." : "Syncing with server...");
                            try {
                                const res = await pushDirtyToSupabase(restaurantId, true);
                                await pullFromSupabase(restaurantId);
                                await Promise.all([fetchStats(), fetchOrders()]);
                                if (res.success) {
                                    toast.success(isAr ? `تمت المزامنة بنجاح (${res.pushed} طلب)` : `Synced ${res.pushed} orders successfully`, { id: toastId });
                                } else {
                                    toast.error(isAr ? "حدث خطأ أثناء المزامنة" : "Sync error occurred", { id: toastId });
                                }
                            } catch (err) {
                                console.error(err);
                                toast.error(isAr ? "فشلت المزامنة" : "Sync failed", { id: toastId });
                            }
                        }}
                        className="flex-1 sm:flex-none p-2.5 rounded-xl border transition flex items-center justify-center gap-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border-slate-300 dark:border-zinc-700/50 hover:border-blue-400 focus:ring-2 active:scale-95 cursor-pointer shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-blue-500" : ""}`} />
                        <span className="text-sm font-bold">{isAr ? "مزامنة و تحديث" : "Sync & Refresh"}</span>
                        {pendingSyncCount > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md">({pendingSyncCount})</span>}
                    </button>
                    <button 
                        onClick={exportCSV} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-base rounded-xl border border-slate-300 dark:border-zinc-700/50 hover:border-emerald-500 transition cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-emerald-500" /> {isAr ? "تصدير CSV" : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Timeframe Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 p-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap ps-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        {isAr ? "فترة الإحصائيات:" : "Stats Period:"}
                    </span>
                    {[
                        { id: "today", label: isAr ? "اليوم" : "Today" },
                        { id: "week", label: isAr ? "الأسبوع" : "This Week" },
                        { id: "month", label: isAr ? "الشهر" : "This Month" },
                        { id: "all", label: isAr ? "الكل" : "All Time" },
                        { id: "custom", label: isAr ? "مخصص" : "Custom" },
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => {
                                setTimeframe(t.id as Timeframe);
                                setPage(1);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                timeframe === t.id
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105"
                                    : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {timeframe === "custom" && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-slate-400 font-bold">→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-emerald-500"
                        />
                    </div>
                )}
            </div>

            {/* Stat Mini Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي الطلبات" : "Total", value: stats.total, color: "text-slate-700 dark:text-zinc-300" },
                    { label: isAr ? "قيد الانتظار" : "Pending", value: stats.pending, color: "text-amber-600 dark:text-amber-400" },
                    { label: isAr ? "تحت التنفيذ" : "In Progress", value: stats.in_progress, color: "text-blue-600 dark:text-blue-400" },
                    { label: isAr ? "مكتملة" : "Completed", value: stats.completed, color: "text-emerald-600 dark:text-emerald-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-4 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase">{s.label}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 font-bold">
                                {timeframe === "today" ? (isAr ? "اليوم" : "Today") :
                                 timeframe === "week" ? (isAr ? "الأسبوع" : "Week") :
                                 timeframe === "month" ? (isAr ? "الشهر" : "Month") :
                                 timeframe === "custom" ? (isAr ? "مخصص" : "Custom") : (isAr ? "الكل" : "All")}
                            </span>
                        </div>
                        <p className={`text-3xl font-extrabold ${s.color} ${loadingStats ? "opacity-50" : ""}`}>
                            {s.value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-zinc-500" />
                    <input 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isAr ? "بحث برقم الطلب (مثال: 2677) أو اسم العميل أو الهاتف..." : "Search by order # (e.g. 2677), customer, or phone..."}
                        className="w-full pe-10 ps-10 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 transition shadow-sm" 
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="relative w-full sm:w-auto">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-zinc-500" />
                    <select 
                        value={statusFilter} 
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 appearance-none cursor-pointer font-bold shadow-sm"
                    >
                        <option value="all">{isAr ? "كل الحالات" : "All Statuses"}</option>
                        {["pending", "in_progress", "completed", "cancelled"].map(s => (
                            <option key={s} value={s}>{statusLabel(s, isAr)}</option>
                        ))}
                    </select>
                </div>

                <div className="relative w-full sm:w-auto">
                    <select 
                        value={sourceFilter} 
                        onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                        className="w-full sm:w-auto pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 appearance-none cursor-pointer font-bold shadow-sm"
                    >
                        <option value="all">{isAr ? "كل المصادر" : "All Sources"}</option>
                        <option value="pos">{isAr ? "🖥️ الكاشير (POS)" : "🖥️ POS (Cashier)"}</option>
                        <option value="website">{isAr ? "🌐 الويب (المنيو)" : "🌐 Website (Menu)"}</option>
                    </select>
                </div>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="p-12 text-center text-slate-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm">{isAr ? "جاري تحميل الطلبات بسرعة فائقة..." : "Loading orders from server..."}</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-2xl p-8">
                    <ClipboardList className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-base">{isAr ? "لا توجد طلبات مطابقة للبحث أو الفلتر" : "No matching orders found"}</p>
                    {debouncedSearch && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-3 text-xs text-blue-500 font-bold hover:underline"
                        >
                            {isAr ? "إلغاء البحث وإظهار كل الطلبات" : "Clear search and show all orders"}
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {orders.map(order => {
                        const elapsed = elapsedTime(order.created_at, isAr);
                        const isExpanded = expandedOrder === order.id;
                        const validNext = nextStatuses(order.status, order.source);

                        return (
                            <div key={order.id} className={`bg-white dark:bg-card border rounded-xl overflow-hidden transition-colors shadow-sm ${elapsed.isDelayed && !["completed", "cancelled"].includes(order.status) ? "border-red-500/40" : "border-slate-200 dark:border-zinc-800/50"}`}>
                                {/* Order Row */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition" onClick={() => toggleExpand(order.id)}>
                                    <div className="flex items-center justify-between sm:w-20 sm:block sm:text-center">
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
                                            <WifiOff className="w-3 h-3" /> {isAr ? "لم يُزامن" : "Offline"}
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
                                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatOrderCurrency(order.total)}</span>
                                            {order.total - order.deposit_amount > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-emerald-600">{isAr ? "عربون: " : "Dep: "}{formatOrderCurrency(order.deposit_amount)}</span>
                                                    <span className="text-[10px] font-bold text-red-500">{isAr ? "متبقي: " : "Rem: "}{formatOrderCurrency(order.total - order.deposit_amount)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-emerald-500 opacity-60">
                                                    {isAr ? "تم استلام المبلغ" : "Amount Received"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); printOrderReceipt(order); }}
                                                title={isAr ? "طباعة الفاتورة" : "Print Receipt"}
                                                className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/pos?edit=${order.id}`); }}
                                                title={isAr ? "تعديل الطلب" : "Edit Order"}
                                                className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition"
                                            >
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
                                                            <span className="text-slate-500 dark:text-zinc-400 font-bold">{formatOrderCurrency(item.price * item.qty)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between pt-2 mt-2 border-t border-slate-300 dark:border-zinc-700/50 text-base font-extrabold">
                                                        <span className="text-slate-500 dark:text-zinc-400">{isAr ? "الإجمالي" : "Total"}</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400">{formatOrderCurrency(order.total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs font-bold mt-1">
                                                        <span className="text-slate-500 dark:text-zinc-400">{isAr ? "المدفوع (العربون)" : "Paid (Deposit)"}</span>
                                                        <span className="text-blue-500">{formatOrderCurrency(order.deposit_amount)}</span>
                                                    </div>
                                                    {order.total - order.deposit_amount > 0 && (
                                                        <div className="flex justify-between text-xs font-bold mt-0.5">
                                                            <span className="text-slate-500 dark:text-zinc-400">{isAr ? "المتبقي" : "Remaining"}</span>
                                                            <span className="text-red-500">{formatOrderCurrency(order.total - order.deposit_amount)}</span>
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

                                                {/* Print / Edit / Delete */}
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
                                                    <button onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95 border border-red-200 dark:border-zinc-800/20">
                                                        <Trash2 className="w-4 h-4" />
                                                        {isAr ? "حذف نهائي" : "Delete"}
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

                    {/* Server-side Pagination Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 p-4 rounded-xl shadow-sm mt-2">
                        <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            {isAr ? (
                                <>عرض <span className="font-bold text-slate-800 dark:text-zinc-200">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> إلى <span className="font-bold text-slate-800 dark:text-zinc-200">{Math.min(page * pageSize, totalCount)}</span> من أصل <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalCount.toLocaleString()}</span> طلب</>
                            ) : (
                                <>Showing <span className="font-bold">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="font-bold">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-bold">{totalCount.toLocaleString()}</span> orders</>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            >
                                {isAr ? "السابق" : "Previous"}
                            </button>

                            {paginationRange.map((p, idx) => (
                                p === '...' ? (
                                    <span key={`dots-${idx}`} className="px-2 text-xs text-slate-400 select-none">...</span>
                                ) : (
                                    <button
                                        key={`p-${p}`}
                                        onClick={() => setPage(Number(p))}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            page === p
                                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                                : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}

                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            >
                                {isAr ? "التالي" : "Next"}
                            </button>

                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="ms-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-card text-xs font-bold text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
                            >
                                <option value={25}>25 {isAr ? "طلب" : "/ page"}</option>
                                <option value={50}>50 {isAr ? "طلب" : "/ page"}</option>
                                <option value={100}>100 {isAr ? "طلب" : "/ page"}</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
