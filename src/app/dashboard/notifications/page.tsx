"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/helpers/formatters";
import { Bell, Plus, Trash2, CheckCheck, X, Send, Eye, EyeOff, RefreshCw, ShoppingBag, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
    id: string;
    restaurant_id: string;
    title: string;
    body?: string;
    type: string;
    target: string;
    is_read: boolean;
    scheduled_at?: string;
    created_at: string;
};

const typeMap: Record<string, { color: string; icon: string; labelAr: string; labelEn: string }> = {
    order: {
        color: "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
        icon: "📦",
        labelAr: "طلب جديد",
        labelEn: "New Order"
    },
    info: {
        color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
        icon: "ℹ",
        labelAr: "معلومات",
        labelEn: "Info"
    },
    success: {
        color: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
        icon: "✓",
        labelAr: "نجاح",
        labelEn: "Success"
    },
    warning: {
        color: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
        icon: "⚠",
        labelAr: "تنبيه",
        labelEn: "Warning"
    },
    error: {
        color: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
        icon: "✕",
        labelAr: "خطأ",
        labelEn: "Error"
    },
};

const targetLabelsAr: Record<string, string> = {
    broadcast: "للجميع",
    admin: "الإدارة والمسؤولين",
    staff: "فريق العمل",
    team: "فريق العمل",
    kitchen: "المطبخ",
};

const targetLabelsEn: Record<string, string> = {
    broadcast: "Everyone",
    admin: "Admins & Management",
    staff: "Staff & Team",
    team: "Staff & Team",
    kitchen: "Kitchen",
};

export default function NotificationsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState<"all" | "unread" | "order" | "team">("all");
    const [form, setForm] = useState({ title: "", body: "", type: "info", target: "broadcast" });

    const fetchNotifications = useCallback(async (isManualRefresh = false) => {
        if (!restaurantId) return;
        if (isManualRefresh) setRefreshing(true);
        try {
            const res = await fetch(`/api/notifications?restaurant_id=${encodeURIComponent(restaurantId)}`);
            if (!res.ok) throw new Error("Failed to fetch notifications");
            const data = await res.json();
            if (data && Array.isArray(data.notifications)) {
                setNotifications(data.notifications as Notification[]);
            }
        } catch (err) {
            console.error("fetchNotifications error:", err);
        } finally {
            setLoading(false);
            if (isManualRefresh) setRefreshing(false);
        }
    }, [restaurantId]);

    // Initial fetch when restaurantId is ready
    useEffect(() => {
        if (restaurantId) {
            fetchNotifications();
        }
    }, [restaurantId, fetchNotifications]);

    // Supabase Realtime subscription + auto-polling fallback
    useEffect(() => {
        if (!restaurantId) return;

        const channel = supabase.channel(`notif-realtime-${restaurantId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `restaurant_id=eq.${restaurantId}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        // 20-second background poll fallback
        const pollInterval = setInterval(() => {
            fetchNotifications();
        }, 20000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [restaurantId, fetchNotifications]);

    const handleSend = async () => {
        if (!restaurantId || !form.title.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    title: form.title.trim(),
                    body: form.body.trim(),
                    type: form.type,
                    target: form.target,
                }),
            });
            if (res.ok) {
                setForm({ title: "", body: "", type: "info", target: "broadcast" });
                setShowForm(false);
                await fetchNotifications();
            }
        } catch (err) {
            console.error("handleSend error:", err);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        // Optimistic UI update
        setNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
        } catch (err) {
            console.error("handleDelete error:", err);
            fetchNotifications();
        }
    };

    const handleToggleRead = async (n: Notification) => {
        const nextState = !n.is_read;
        // Optimistic UI update
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: nextState } : item));
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: n.id, is_read: nextState }),
            });
        } catch (err) {
            console.error("handleToggleRead error:", err);
            fetchNotifications();
        }
    };

    const handleMarkAllRead = async () => {
        if (!restaurantId) return;
        // Optimistic UI update
        setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mark_all_read: true, restaurant_id: restaurantId }),
            });
        } catch (err) {
            console.error("handleMarkAllRead error:", err);
            fetchNotifications();
        }
    };

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
    const orderCount = useMemo(() => notifications.filter(n => n.type === 'order').length, [notifications]);
    const teamCount = useMemo(() => notifications.filter(n => n.target === 'staff' || n.target === 'team' || n.target === 'kitchen' || (n.type !== 'order' && n.target === 'broadcast')).length, [notifications]);

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            if (activeTab === "unread") return !n.is_read;
            if (activeTab === "order") return n.type === "order";
            if (activeTab === "team") return n.target === "staff" || n.target === "team" || n.target === "kitchen" || (n.type !== "order" && n.target === "broadcast");
            return true;
        });
    }, [notifications, activeTab]);

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500 dark:text-zinc-500 animate-pulse flex flex-col items-center gap-3">
                <Bell className="w-8 h-8 text-emerald-500 animate-bounce" />
                <p className="font-bold text-sm">{isAr ? "جاري تحميل إشعارات المطعم..." : "Loading restaurant notifications..."}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span>{isAr ? "مركز الإشعارات" : "Notification Center"}</span>
                        {unreadCount > 0 && (
                            <span className="text-xs font-black bg-red-500 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        {isAr ? "متابعة طلبات المطعم وإشعارات الإدارة وفريق العمل لحظياً" : "Real-time updates for restaurant orders, team announcements & alerts"}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => fetchNotifications(true)}
                        title={isAr ? "تحديث الآن" : "Refresh"}
                        disabled={refreshing}
                        className="p-2.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-card border border-slate-200 dark:border-zinc-800 rounded-xl transition hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-500" : ""}`} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-300 bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl transition active:scale-95 shadow-sm"
                        >
                            <CheckCheck className="w-4 h-4 text-emerald-500" />
                            <span>{isAr ? "تحديد الكل كمقروء" : "Mark all as read"}</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? "إشعار جديد" : "New Notification"}</span>
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-zinc-800/80 pb-3">
                <button
                    onClick={() => setActiveTab("all")}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center gap-2 ${
                        activeTab === "all"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm"
                            : "bg-white dark:bg-card text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{isAr ? "الكل" : "All"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                        {notifications.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("unread")}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center gap-2 ${
                        activeTab === "unread"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm"
                            : "bg-white dark:bg-card text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isAr ? "غير مقروءة" : "Unread"}</span>
                    {unreadCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500 text-white font-black">
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("order")}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center gap-2 ${
                        activeTab === "order"
                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 shadow-sm"
                            : "bg-white dark:bg-card text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <ShoppingBag className="w-3.5 h-3.5 text-violet-500" />
                    <span>{isAr ? "طلبات الزبائن" : "Orders"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                        {orderCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("team")}
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center gap-2 ${
                        activeTab === "team"
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-sm"
                            : "bg-white dark:bg-card text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isAr ? "فريق العمل والإدارة" : "Team & Staff"}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                        {teamCount}
                    </span>
                </button>
            </div>

            {/* Create Notification Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white dark:bg-card border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-emerald-500" />
                                    <span>{isAr ? "إرسال إشعار جديد لفريق العمل أو الإدارة" : "Create & Send Notification"}</span>
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <input
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                placeholder={isAr ? "عنوان الإشعار (مثال: تنبيه بخصوص الوردية، انتهاء صنف معين...)" : "Notification title..."}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-emerald-500"
                            />

                            <textarea
                                value={form.body}
                                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                                rows={3}
                                placeholder={isAr ? "اكتب نص الإشعار والتفاصيل التي تريد إيصالها..." : "Write notification content & details..."}
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-emerald-500 resize-none"
                            />

                            {/* Type selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5">
                                    {isAr ? "نوع الإشعار:" : "Notification Type:"}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(typeMap).map(([t, info]) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, type: t }))}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                                                form.type === t
                                                    ? `${info.color} shadow-sm ring-2 ring-emerald-500/20`
                                                    : "bg-slate-50 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800"
                                            }`}
                                        >
                                            <span>{info.icon}</span>
                                            <span>{isAr ? info.labelAr : info.labelEn}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target & Action */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">
                                        {isAr ? "الموجّه إليه:" : "Target:"}
                                    </label>
                                    <select
                                        value={form.target}
                                        onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                                        className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                                    >
                                        <option value="broadcast">{isAr ? "للجميع (عام)" : "Everyone (Broadcast)"}</option>
                                        <option value="staff">{isAr ? "فريق العمل والموظفين" : "Staff & Team"}</option>
                                        <option value="admin">{isAr ? "الإدارة والمسؤولين" : "Admins & Management"}</option>
                                        <option value="kitchen">{isAr ? "المطبخ" : "Kitchen"}</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
                                    >
                                        {isAr ? "إلغاء" : "Cancel"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSend}
                                        disabled={sending || !form.title.trim()}
                                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 active:scale-95"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{sending ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الإشعار" : "Send")}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/60 rounded-2xl p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                    </div>
                    <p className="font-bold text-slate-800 dark:text-white text-base">
                        {isAr ? "لا توجد إشعارات في هذا القسم حالياً" : "No notifications in this category"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-sm mx-auto">
                        {isAr
                            ? "أي طلب جديد من العملاء أو إشعار يتم إرساله لفريق العمل سيظهر هنا فوراً."
                            : "New customer orders and team notifications will appear here in real-time."}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {filteredNotifications.map(n => {
                        const tm = typeMap[n.type] || typeMap.info;
                        const targetLabel = isAr ? (targetLabelsAr[n.target] || n.target) : (targetLabelsEn[n.target] || n.target);

                        return (
                            <div
                                key={n.id}
                                className={`bg-white dark:bg-card border rounded-2xl p-4 flex items-start gap-3.5 transition-all shadow-sm hover:shadow ${
                                    n.is_read
                                        ? "border-slate-200 dark:border-zinc-800/40 opacity-70 bg-slate-50/50 dark:bg-zinc-900/20"
                                        : "border-slate-200 dark:border-zinc-800 ring-1 ring-emerald-500/10"
                                }`}
                            >
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base shrink-0 shadow-sm ${tm.color}`}>
                                    {tm.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                            {n.title}
                                        </p>
                                        {!n.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                        )}
                                    </div>

                                    {n.body && (
                                        <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap">
                                            {n.body}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                        <span>{timeAgo(n.created_at, isAr)}</span>
                                        <span>•</span>
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                            {targetLabel}
                                        </span>
                                        {n.type && (
                                            <>
                                                <span>•</span>
                                                <span className="capitalize">{isAr ? tm.labelAr : tm.labelEn}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleToggleRead(n)}
                                        title={n.is_read ? (isAr ? "تحديد كغير مقروء" : "Mark as unread") : (isAr ? "تحديد كمقروء" : "Mark as read")}
                                        className={`p-2 rounded-xl transition hover:bg-slate-100 dark:hover:bg-zinc-800 ${
                                            n.is_read
                                                ? "text-slate-400 dark:text-zinc-500 hover:text-slate-700"
                                                : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                        }`}
                                    >
                                        {n.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(n.id)}
                                        title={isAr ? "حذف" : "Delete"}
                                        className="p-2 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
