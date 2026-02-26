"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { UserCog, Plus, Edit3, Trash2, Shield, X, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TeamMember = { id: string; name: string; email?: string; phone?: string; role: string; permissions: Record<string, boolean>; is_active: boolean; created_at: string };

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
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
    manager: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    kitchen: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    cashier: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    delivery: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    staff: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
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
    const [form, setForm] = useState<{ name: string; email: string; phone: string; role: string; permissions: Record<string, boolean> }>({ name: "", email: "", phone: "", role: "staff", permissions: { ...defaultPerms } });

    const fetchMembers = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('team_members').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        setMembers((data as TeamMember[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleSave = async () => {
        if (!restaurantId || !form.name.trim()) return;
        if (editId) {
            await supabase.from('team_members').update(form).eq('id', editId);
        } else {
            await supabase.from('team_members').insert({ ...form, restaurant_id: restaurantId });
        }
        resetForm(); fetchMembers();
    };

    const handleDelete = async (id: string) => { await supabase.from('team_members').delete().eq('id', id); fetchMembers(); };
    const handleToggleActive = async (m: TeamMember) => { await supabase.from('team_members').update({ is_active: !m.is_active }).eq('id', m.id); fetchMembers(); };
    const startEdit = (m: TeamMember) => { setForm({ name: m.name, email: m.email || "", phone: m.phone || "", role: m.role, permissions: m.permissions }); setEditId(m.id); setShowForm(true); };
    const resetForm = () => { setForm({ name: "", email: "", phone: "", role: "staff", permissions: { ...defaultPerms } }); setShowForm(false); setEditId(null); };
    const togglePerm = (key: string) => setForm(p => ({ ...p, permissions: { ...p.permissions, [key]: !p.permissions[key] } }));

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><UserCog className="w-7 h-7 text-emerald-400" />{isAr ? "إدارة الفريق" : "Team & Roles"}</h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "أضف أعضاء الفريق وحدد صلاحياتهم" : "Add team members and define their permissions"}</p>
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
                        <p className="text-lg font-extrabold">{members.filter(m => m.role === r.value).length}</p>
                        <p className="text-[9px] font-bold uppercase">{isAr ? r.labelAr : r.labelEn}</p>
                    </div>
                ))}
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الاسم" : "Name"}</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "البريد" : "Email"}</label>
                                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الهاتف" : "Phone"}</label>
                                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الدور" : "Role"}</label>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(r => (
                                        <button key={r.value} onClick={() => setForm(p => ({ ...p, role: r.value }))}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${form.role === r.value ? roleColors[r.value] : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30"}`}>
                                            {isAr ? r.labelAr : r.labelEn}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-2 flex items-center gap-1"><Shield className="w-3 h-3" />{isAr ? "الصلاحيات" : "Permissions"}</label>
                                <div className="flex flex-wrap gap-2">
                                    {permKeys.map(p => (
                                        <button key={p.key} onClick={() => togglePerm(p.key)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${form.permissions[p.key] ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/30"}`}>
                                            {form.permissions[p.key] ? "✓" : ""} {isAr ? p.ar : p.en}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">{editId ? (isAr ? "تحديث" : "Update") : (isAr ? "إضافة" : "Add")}</button>
                                <button onClick={resetForm} className="px-4 py-2 text-zinc-400 text-sm"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="text-center py-16 text-zinc-500"><UserCog className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">{isAr ? "لا يوجد أعضاء" : "No team members"}</p></div>
            ) : (
                <div className="flex flex-col gap-2">
                    {members.map(m => (
                        <div key={m.id} className={`bg-[#0d1117] border rounded-xl p-4 flex items-center gap-4 transition ${m.is_active ? "border-zinc-800/50" : "border-zinc-800/30 opacity-50"}`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">{m.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm truncate">{m.name}</p>
                                <p className="text-[10px] text-zinc-500">{m.email || m.phone || ""}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${roleColors[m.role]}`}>{roles.find(r => r.value === m.role)?.[isAr ? "labelAr" : "labelEn"] || m.role}</span>
                            <div className="flex gap-1">
                                <button onClick={() => handleToggleActive(m)} className={`p-1.5 ${m.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
                                    {m.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                </button>
                                <button onClick={() => startEdit(m)} className="p-1.5 text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
