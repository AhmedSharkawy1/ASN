"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { Users, Plus, Search, Edit3, Trash2, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Customer = { id: string; name: string; phone?: string; email?: string; loyalty_points: number; total_spent: number; total_orders: number; last_order_date?: string; notes?: string; created_at: string };

export default function CustomersPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [searchQ, setSearchQ] = useState("");
    const [form, setForm] = useState({ name: "", phone: "", email: "", loyalty_points: 0, notes: "" });

    const fetchCustomers = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('customers').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        setCustomers((data as Customer[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleSave = async () => {
        if (!restaurantId || !form.name.trim()) return;
        if (editId) {
            await supabase.from('customers').update(form).eq('id', editId);
        } else {
            await supabase.from('customers').insert({ ...form, restaurant_id: restaurantId });
        }
        resetForm(); fetchCustomers();
    };

    const handleDelete = async (id: string) => { await supabase.from('customers').delete().eq('id', id); fetchCustomers(); };
    const startEdit = (c: Customer) => { setForm({ name: c.name, phone: c.phone || "", email: c.email || "", loyalty_points: c.loyalty_points, notes: c.notes || "" }); setEditId(c.id); setShowForm(true); };
    const resetForm = () => { setForm({ name: "", phone: "", email: "", loyalty_points: 0, notes: "" }); setShowForm(false); setEditId(null); };

    const filtered = customers.filter(c => {
        if (!searchQ) return true;
        const q = searchQ.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
    });

    const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);
    const avgSpent = customers.length > 0 ? totalRevenue / customers.length : 0;

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><Users className="w-7 h-7 text-emerald-400" />{isAr ? "إدارة العملاء" : "Customers CRM"}</h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "تتبع العملاء ونقاط الولاء والإنفاق" : "Track customers, loyalty points, and spending"}</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95">
                    <Plus className="w-4 h-4" /> {isAr ? "إضافة عميل" : "Add Customer"}
                </button>
            </div>

            {/* Analytics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: isAr ? "إجمالي العملاء" : "Total", value: customers.length, color: "text-zinc-300" },
                    { label: isAr ? "إجمالي الإيرادات" : "Revenue", value: formatCurrency(totalRevenue), color: "text-emerald-400" },
                    { label: isAr ? "متوسط الإنفاق" : "Avg Spend", value: formatCurrency(avgSpent), color: "text-cyan-400" },
                    { label: isAr ? "نقاط الولاء" : "Total Points", value: customers.reduce((s, c) => s + c.loyalty_points, 0), color: "text-amber-400" },
                ].map((s, i) => (
                    <div key={i} className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{s.label}</p>
                        <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder={isAr ? "بحث بالاسم أو الهاتف..." : "Search by name or phone..."}
                    className="w-full pe-10 ps-4 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50" />
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-5 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الاسم" : "Name"}</label>
                                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الهاتف" : "Phone"}</label>
                                    <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "البريد" : "Email"}</label>
                                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} dir="ltr" className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "نقاط الولاء" : "Points"}</label>
                                    <input type="number" value={form.loyalty_points} onChange={e => setForm(p => ({ ...p, loyalty_points: +e.target.value }))} min={0} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "ملاحظات" : "Notes"}</label>
                                    <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">{editId ? (isAr ? "تحديث" : "Update") : (isAr ? "إضافة" : "Add")}</button>
                                <button onClick={resetForm} className="px-4 py-2 text-zinc-400 text-sm"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Customer List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-500"><Users className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">{isAr ? "لا يوجد عملاء" : "No customers"}</p></div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map(c => (
                        <div key={c.id} className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700/50 transition">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">{c.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm truncate">{c.name}</p>
                                <div className="flex gap-3 text-[10px] text-zinc-500 mt-0.5">
                                    {c.phone && <span dir="ltr">{c.phone}</span>}
                                    {c.email && <span>{c.email}</span>}
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-4 text-xs">
                                <div className="text-center"><p className="text-[9px] text-zinc-500">{isAr ? "الإنفاق" : "Spent"}</p><p className="font-bold text-emerald-400">{formatCurrency(c.total_spent)}</p></div>
                                <div className="text-center"><p className="text-[9px] text-zinc-500">{isAr ? "الطلبات" : "Orders"}</p><p className="font-bold text-zinc-300">{c.total_orders}</p></div>
                                <div className="text-center"><p className="text-[9px] text-zinc-500">{isAr ? "النقاط" : "Points"}</p><p className="font-bold text-amber-400 flex items-center gap-0.5"><Star className="w-3 h-3" />{c.loyalty_points}</p></div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => startEdit(c)} className="p-1.5 text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
