"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/helpers/formatters";
import { Bell, Plus, Trash2, CheckCheck, X, Send, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Notification = { id: string; title: string; body?: string; type: string; target: string; is_read: boolean; scheduled_at?: string; created_at: string };

const typeMap: Record<string, { color: string; icon: string }> = {
    info: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: "ℹ" },
    success: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: "✓" },
    warning: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: "⚠" },
    error: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: "✕" },
    order: { color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: "📦" },
};

export default function NotificationsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [form, setForm] = useState({ title: "", body: "", type: "info", target: "broadcast" });

    const fetchNotifications = useCallback(async () => {
        if (!restaurantId) return;
        let query = supabase.from('notifications').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        if (filter === "unread") query = query.eq('is_read', false);
        const { data } = await query;
        setNotifications((data as Notification[]) || []);
        setLoading(false);
    }, [restaurantId, filter]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // Realtime
    useEffect(() => {
        if (!restaurantId) return;
        const ch = supabase.channel('notif-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchNotifications()).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [restaurantId, fetchNotifications]);

    const handleSend = async () => {
        if (!restaurantId || !form.title.trim()) return;
        await supabase.from('notifications').insert({ ...form, restaurant_id: restaurantId });
        setForm({ title: "", body: "", type: "info", target: "broadcast" }); setShowForm(false);
        fetchNotifications();
    };

    const handleDelete = async (id: string) => { await supabase.from('notifications').delete().eq('id', id); fetchNotifications(); };
    const handleToggleRead = async (n: Notification) => { await supabase.from('notifications').update({ is_read: !n.is_read }).eq('id', n.id); fetchNotifications(); };
    const handleMarkAllRead = async () => { if (!restaurantId) return; await supabase.from('notifications').update({ is_read: true }).eq('restaurant_id', restaurantId).eq('is_read', false); fetchNotifications(); };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
                        <Bell className="w-7 h-7 text-emerald-400" />
                        {isAr ? "مركز الإشعارات" : "Notification Center"}
                        {unreadCount > 0 && <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="flex items-center gap-1 px-3 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-700/50 rounded-xl transition">
                            <CheckCheck className="w-3.5 h-3.5" /> {isAr ? "قراءة الكل" : "Mark all read"}
                        </button>
                    )}
                    <button onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95">
                        <Plus className="w-4 h-4" /> {isAr ? "إشعار جديد" : "New Notification"}
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {(["all", "unread"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`text-xs font-bold px-4 py-2 rounded-xl border transition ${filter === f ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30 hover:text-white"}`}>
                        {f === "all" ? (isAr ? "الكل" : "All") : (isAr ? "غير مقروءة" : "Unread")}
                    </button>
                ))}
            </div>

            {/* Create Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-5 space-y-3">
                            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={isAr ? "عنوان الإشعار" : "Notification title"} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none" />
                            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={2} placeholder={isAr ? "محتوى الإشعار..." : "Notification body..."} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 outline-none resize-none" />
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(typeMap).map(t => (
                                    <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${form.type === t ? typeMap[t].color : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30"}`}>
                                        {typeMap[t].icon} {t}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                                    className="px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-xs text-white outline-none appearance-none cursor-pointer">
                                    <option value="broadcast">{isAr ? "للجميع" : "Broadcast"}</option>
                                    <option value="admin">{isAr ? "المسؤولين" : "Admins"}</option>
                                    <option value="kitchen">{isAr ? "المطبخ" : "Kitchen"}</option>
                                    <option value="staff">{isAr ? "الموظفين" : "Staff"}</option>
                                </select>
                                <button onClick={handleSend} className="flex items-center gap-1 px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 transition">
                                    <Send className="w-4 h-4" /> {isAr ? "إرسال" : "Send"}
                                </button>
                                <button onClick={() => setShowForm(false)} className="px-3 py-2 text-zinc-400"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="text-center py-16 text-zinc-500"><Bell className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">{isAr ? "لا توجد إشعارات" : "No notifications"}</p></div>
            ) : (
                <div className="flex flex-col gap-2">
                    {notifications.map(n => {
                        const tm = typeMap[n.type] || typeMap.info;
                        return (
                            <div key={n.id} className={`bg-[#0d1117] border rounded-xl p-4 flex items-start gap-3 transition ${n.is_read ? "border-zinc-800/30 opacity-60" : "border-zinc-800/50"}`}>
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm shrink-0 ${tm.color}`}>{tm.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm">{n.title}</p>
                                    {n.body && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.body}</p>}
                                    <div className="flex gap-2 mt-1 text-[9px] text-zinc-500">
                                        <span>{timeAgo(n.created_at, isAr)}</span>
                                        <span>• {n.target}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handleToggleRead(n)} className={`p-1 ${n.is_read ? "text-zinc-500" : "text-emerald-400"}`}>
                                        {n.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => handleDelete(n.id)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
