"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { posDb } from "@/lib/pos-db";
import { UserCog, Plus, Edit3, Trash2, Shield, X, ToggleLeft, ToggleRight, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/helpers/formatters";

type TeamMember = { id: string; name: string; username?: string; email?: string; phone?: string; role: string; permissions: Record<string, boolean>; is_active: boolean; created_at: string };

const roles = [
    { value: "admin", labelAr: "مسؤول", labelEn: "Admin" },
    { value: "manager", labelAr: "مدير", labelEn: "Manager" },
    { value: "kitchen", labelAr: "مطبخ", labelEn: "Kitchen" },
    { value: "cashier", labelAr: "كاشير", labelEn: "Cashier" },
    { value: "delivery", labelAr: "توصيل", labelEn: "Delivery" },
    { value: "staff", labelAr: "موظف", labelEn: "Staff" },
];

const permKeys = [
    { key: "orders", ar: "الطلبات", en: "Orders" },
    { key: "products", ar: "المنتجات", en: "Products" },
    { key: "settings", ar: "الإعدادات", en: "Settings" },
    { key: "team", ar: "الفريق", en: "Team" },
    { key: "customers", ar: "العملاء", en: "Customers" },
    { key: "reports", ar: "التقارير", en: "Reports" },
];

const roleColors: Record<string, string> = {
    admin: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30",
    manager: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
    kitchen: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    cashier: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border",
    delivery: "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    staff: "bg-zinc-500/20 text-slate-500 dark:text-zinc-400 border-zinc-500/30",
};

export default function TeamPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const defaultPerms: Record<string, boolean> = { orders: true, products: false, settings: false, team: false, customers: false, reports: false };
    const [form, setForm] = useState<{ name: string; username?: string; password?: string; email: string; phone: string; role: string; permissions: Record<string, boolean> }>({ name: "", username: "", password: "", email: "", phone: "", role: "staff", permissions: { ...defaultPerms } });

    const fetchMembers = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('team_members').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        setMembers((data as TeamMember[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleSave = async () => {
        if (!restaurantId || !form.name.trim()) return;
        
        try {
            if (editId) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { username, password, ...restForm } = form; // Do not update auth credentials here natively yet
                await supabase.from('team_members').update(restForm).eq('id', editId);
            } else {
                if (!form.username || !form.password) {
                    alert(isAr ? "يرجى إدخال اسم المستخدم وكلمة المرور" : "Please provide a username and password");
                    return;
                }
                const res = await fetch("/api/team/create", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, restaurant_id: restaurantId })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Failed to create user");
                }
            }
            resetForm(); 
            fetchMembers();
        } catch (e: unknown) {
            console.error(e);
            alert((e as Error).message);
        }
    };

    const handleDelete = async (id: string) => { await supabase.from('team_members').delete().eq('id', id); fetchMembers(); };
    const handleToggleActive = async (m: TeamMember) => { await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id); fetchMembers(); };
    const startEdit = (m: TeamMember) => { setForm({ name: m.name, username: m.username || "", password: "", email: m.email || "", phone: m.phone || "", role: m.role, permissions: m.permissions }); setEditId(m.id); setShowForm(true); };
    const resetForm = () => { setForm({ name: "", username: "", password: "", email: "", phone: "", role: "staff", permissions: { ...defaultPerms } }); setShowForm(false); setEditId(null); };
    const togglePerm = (key: string) => setForm(p => ({ ...p, permissions: { ...p.permissions, [key]: !p.permissions[key] } }));

    if (loading) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3"><UserCog className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />{isAr ? "إدارة الفريق" : "Team & Roles"}</h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">{isAr ? "أضف أعضاء الفريق وحدد صلاحياتهم" : "Add team members and define their permissions"}</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95">
                    <Plus className="w-4 h-4" /> {isAr ? "إضافة عضو" : "Add Member"}
                </button>
            </div>

            {/* Role Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {roles.map(r => (
                    <div key={r.value} className={`${roleColors[r.value]} border rounded-xl p-3 text-center`}>
                        <p className="text-2xl font-extrabold">{members.filter(m => m.role === r.value).length}</p>
                        <p className="text-[10px] font-bold uppercase">{isAr ? r.labelAr : r.labelEn}</p>
                    </div>
                ))}
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div><label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الاسم" : "Name"}</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none" /></div>
                                <div><label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{isAr ? "اسم المستخدم للموظف" : "Username"}</label>
                                    <input disabled={!!editId} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none disabled:opacity-50" /></div>
                                <div><label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{isAr ? "كلمة المرور" : "Password"}</label>
                                    <input type="password" disabled={!!editId} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none disabled:opacity-50" placeholder={editId ? (isAr ? "لا يمكن تعديله هنا" : "Cannot edit here") : ""} /></div>
                                <div><label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الهاتف" : "Phone"}</label>
                                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-900 dark:text-white outline-none" /></div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الدور" : "Role"}</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(r => (
                                        <button key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-lg border transition ${form.role === r.value ? roleColors[r.value] : "bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30"}`}>
                                            {isAr ? r.labelAr : r.labelEn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-zinc-500 font-bold uppercase block mb-2 flex items-center gap-1"><Shield className="w-4 h-4" />{isAr ? "الصلاحيات" : "Permissions"}</label>
                                <div className="flex flex-wrap gap-2">
                                    {permKeys.map(p => (
                                        <button key={p.key} onClick={() => togglePerm(p.key)}
                                            className={`text-sm font-bold px-3 py-1.5 rounded-lg border transition ${form.permissions[p.key] ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30"}`}>
                                            {form.permissions[p.key] ? "✓" : ""} {isAr ? p.ar : p.en}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">{editId ? (isAr ? "تحديث" : "Update") : (isAr ? "إضافة" : "Add")}</button>
                                <button onClick={resetForm} className="px-4 py-2 text-slate-500 dark:text-zinc-400 text-sm"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500"><UserCog className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">{isAr ? "لا يوجد أعضاء" : "No team members"}</p></div>
            ) : (
                <div className="flex flex-col gap-2">
                    {members.map(m => (
                        <div key={m.id} className={`bg-white dark:bg-card border rounded-xl p-4 flex items-center gap-4 transition ${m.is_active ? "border-slate-200 dark:border-zinc-800/50" : "border-slate-200 dark:border-zinc-800/30 opacity-50"}`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-200 dark:border-glass-border flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">{m.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white text-base truncate">{m.name}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-500" dir="ltr">{m.username ? `@${m.username}` : m.phone || ""}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${roleColors[m.role]}`}>{roles.find(r => r.value === m.role)?.[isAr ? "labelAr" : "labelEn"] || m.role}</span>
                            <div className="flex gap-1">
                                <button onClick={() => handleToggleActive(m)} className={`p-1.5 ${m.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-500"}`}>
                                    {m.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => startEdit(m)} className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-500 dark:text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Per-Employee Performance Reports */}
            {members.length > 0 && <EmployeeReports restaurantId={restaurantId || ""} members={members} />}
        </div>
    );
}

function EmployeeReports({ restaurantId, members }: { restaurantId: string; members: { id: string; name: string; is_active: boolean }[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState("month");
    const [stats, setStats] = useState<Record<string, { count: number; revenue: number }>>({});

    const dateFrom = useMemo(() => {
        const d = new Date();
        if (dateRange === "today") d.setHours(0, 0, 0, 0);
        else if (dateRange === "week") d.setDate(d.getDate() - 7);
        else if (dateRange === "month") d.setDate(d.getDate() - 30);
        else return null;
        return d.toISOString();
    }, [dateRange]);

    useEffect(() => {
        if (!restaurantId) return;
        posDb.orders.where("restaurant_id").equals(restaurantId)
            .and(o => o.status !== "cancelled" && !o.is_draft && (!dateFrom || o.created_at >= dateFrom))
            .toArray().then(orders => {
                const map: Record<string, { count: number; revenue: number }> = {};
                for (const o of orders) {
                    if (o.cashier_name) {
                        if (!map[o.cashier_name]) map[o.cashier_name] = { count: 0, revenue: 0 };
                        map[o.cashier_name].count++;
                        map[o.cashier_name].revenue += o.total;
                    }
                    if (o.delivery_driver_name) {
                        if (!map[o.delivery_driver_name]) map[o.delivery_driver_name] = { count: 0, revenue: 0 };
                        map[o.delivery_driver_name].count++;
                        map[o.delivery_driver_name].revenue += o.delivery_fee || 0;
                    }
                }
                setStats(map);
            });
    }, [restaurantId, dateFrom]);

    return (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><BarChart2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> تقريري أداء الموظفين</h2>
                <div className="flex gap-2">
                    {["today", "week", "month"].map(r => (
                        <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${dateRange === r ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-glass-border" : "bg-slate-100 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700/30"}`}>
                            {r === "today" ? "اليوم" : r === "week" ? "الأسبوع" : "الشهر"}
                        </button>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                {members.filter(m => m.is_active).map(m => {
                    const s = stats[m.name] || { count: 0, revenue: 0 };
                    return (
                        <div key={m.id} className="bg-slate-50 dark:bg-black/20 rounded-xl overflow-hidden">
                            <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] transition">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-glass-border flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">{m.name.charAt(0)}</div>
                                <span className="flex-1 text-base font-bold text-slate-700 dark:text-zinc-300 text-right">{m.name}</span>
                                <span className="text-sm text-slate-500 dark:text-zinc-500 font-bold">{s.count} طلب</span>
                                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 w-24 text-left">{formatCurrency(s.revenue)}</span>
                                {expanded === m.id ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-500" />}
                            </button>
                            {expanded === m.id && (
                                <div className="px-4 pb-3 pt-1 border-t border-slate-200 dark:border-zinc-800/30 grid grid-cols-3 gap-3 text-center">
                                    {[{ label: "الطلبات", val: s.count, color: "text-slate-700 dark:text-zinc-300" }, { label: "الإيرادات", val: formatCurrency(s.revenue), color: "text-emerald-600 dark:text-emerald-400" }, { label: "متوسط الفاتورة", val: s.count > 0 ? formatCurrency(s.revenue / s.count) : "—", color: "text-cyan-600 dark:text-cyan-400" }].map((item, i) => (
                                        <div key={i}><p className="text-xs text-slate-500 dark:text-zinc-500 uppercase mb-1">{item.label}</p><p className={`text-base font-extrabold ${item.color}`}>{item.val}</p></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {members.filter(m => m.is_active).length === 0 && <p className="text-center text-slate-400 dark:text-zinc-600 text-sm py-4">لا يوجد موظفون نشطون</p>}
            </div>
        </div>
    );
}
