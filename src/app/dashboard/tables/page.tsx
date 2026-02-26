"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { TableProperties, Plus, Edit3, Trash2, Merge, ArrowRightLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Table = { id: string; label: string; capacity: number; status: string; merged_with?: string; current_order_id?: string };

const statusMap: Record<string, { ar: string; en: string; color: string; bg: string }> = {
    available: { ar: "متاحة", en: "Available", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    occupied: { ar: "مشغولة", en: "Occupied", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    reserved: { ar: "محجوزة", en: "Reserved", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
    merged: { ar: "مدمجة", en: "Merged", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30" },
};

export default function TablesPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ label: "", capacity: 4 });
    const [merging, setMerging] = useState<string | null>(null);

    const fetchTables = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('label');
        setTables((data as Table[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchTables(); }, [fetchTables]);

    // Realtime
    useEffect(() => {
        if (!restaurantId) return;
        const ch = supabase.channel('tables-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchTables()).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [restaurantId, fetchTables]);

    const handleSave = async () => {
        if (!restaurantId || !form.label.trim()) return;
        if (editId) {
            await supabase.from('tables').update({ label: form.label, capacity: form.capacity }).eq('id', editId);
        } else {
            await supabase.from('tables').insert({ restaurant_id: restaurantId, label: form.label, capacity: form.capacity });
        }
        setForm({ label: "", capacity: 4 }); setShowForm(false); setEditId(null);
        fetchTables();
    };

    const handleDelete = async (id: string) => { await supabase.from('tables').delete().eq('id', id); fetchTables(); };

    const handleStatusToggle = async (table: Table) => {
        const next = table.status === "available" ? "reserved" : table.status === "reserved" ? "available" : table.status;
        await supabase.from('tables').update({ status: next }).eq('id', table.id);
        fetchTables();
    };

    const handleMerge = async (targetId: string) => {
        if (!merging) return;
        await supabase.from('tables').update({ status: 'merged', merged_with: targetId }).eq('id', merging);
        setMerging(null);
        fetchTables();
    };

    const handleUnmerge = async (id: string) => {
        await supabase.from('tables').update({ status: 'available', merged_with: null }).eq('id', id);
        fetchTables();
    };

    const startEdit = (t: Table) => { setForm({ label: t.label, capacity: t.capacity }); setEditId(t.id); setShowForm(true); };

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
                        <TableProperties className="w-7 h-7 text-emerald-400" />
                        {isAr ? "إدارة الطاولات" : "Tables Management"}
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "إدارة طاولات المطعم وحالاتها" : "Manage restaurant tables and their status"}</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ label: "", capacity: 4 }); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition active:scale-95">
                    <Plus className="w-4 h-4" /> {isAr ? "إضافة طاولة" : "Add Table"}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(statusMap).map(([key, val]) => (
                    <div key={key} className={`${val.bg} border rounded-xl p-3`}>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">{isAr ? val.ar : val.en}</p>
                        <p className={`text-xl font-extrabold ${val.color}`}>{tables.filter(t => t.status === key).length}</p>
                    </div>
                ))}
            </div>

            {/* Add/Edit Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4 flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "اسم الطاولة" : "Table Label"}</label>
                                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder={isAr ? "مثال: T1" : "e.g. T1"} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500/50" />
                            </div>
                            <div className="w-24">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "السعة" : "Capacity"}</label>
                                <input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: +e.target.value }))} min={1} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" />
                            </div>
                            <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 transition">{editId ? (isAr ? "تحديث" : "Update") : (isAr ? "إضافة" : "Add")}</button>
                            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 text-zinc-400 text-sm"><X className="w-4 h-4" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Merge mode banner */}
            {merging && (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-violet-400 font-bold">{isAr ? "اختر الطاولة المراد الدمج معها..." : "Select target table to merge with..."}</span>
                    <button onClick={() => setMerging(null)} className="text-xs text-zinc-400 hover:text-white">{isAr ? "إلغاء" : "Cancel"}</button>
                </div>
            )}

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.map(table => {
                    const st = statusMap[table.status] || statusMap.available;
                    return (
                        <div key={table.id} onClick={() => { if (merging && merging !== table.id) handleMerge(table.id); }}
                            className={`relative ${st.bg} border rounded-xl p-4 text-center transition-all hover:scale-105 ${merging && merging !== table.id ? "cursor-pointer ring-2 ring-violet-500/50" : ""}`}>
                            <h3 className="text-xl font-extrabold text-white mb-1">{table.label}</h3>
                            <p className={`text-[10px] font-bold ${st.color}`}>{isAr ? st.ar : st.en}</p>
                            <p className="text-[9px] text-zinc-500 mt-1">{table.capacity} {isAr ? "مقاعد" : "seats"}</p>
                            {table.status === "merged" && <p className="text-[8px] text-violet-400 mt-1">{isAr ? "مدمجة" : "Merged"}</p>}

                            <div className="flex gap-1 justify-center mt-3">
                                <button onClick={(e) => { e.stopPropagation(); handleStatusToggle(table); }} className="p-1 text-zinc-500 hover:text-white" title="Toggle"><ArrowRightLeft className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); startEdit(table); }} className="p-1 text-zinc-500 hover:text-white" title="Edit"><Edit3 className="w-3 h-3" /></button>
                                {table.status === 'merged' ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleUnmerge(table.id); }} className="p-1 text-violet-400 hover:text-white" title="Unmerge"><X className="w-3 h-3" /></button>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setMerging(table.id); }} className="p-1 text-zinc-500 hover:text-violet-400" title="Merge"><Merge className="w-3 h-3" /></button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(table.id); }} className="p-1 text-zinc-500 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
