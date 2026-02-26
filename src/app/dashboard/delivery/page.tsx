"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { Truck, Plus, Edit3, Trash2, ToggleLeft, ToggleRight, X, Clock, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Zone = { id: string; name_ar: string; name_en?: string; fee: number; min_order: number; estimated_time: number; is_active: boolean };

export default function DeliveryPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ name_ar: "", name_en: "", fee: 0, min_order: 0, estimated_time: 30 });

    const fetchZones = useCallback(async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('delivery_zones').select('*').eq('restaurant_id', restaurantId).order('name_ar');
        setZones((data as Zone[]) || []);
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchZones(); }, [fetchZones]);

    const handleSave = async () => {
        if (!restaurantId || !form.name_ar.trim()) return;
        if (editId) {
            await supabase.from('delivery_zones').update(form).eq('id', editId);
        } else {
            await supabase.from('delivery_zones').insert({ ...form, restaurant_id: restaurantId });
        }
        resetForm(); fetchZones();
    };

    const handleDelete = async (id: string) => { await supabase.from('delivery_zones').delete().eq('id', id); fetchZones(); };
    const handleToggle = async (zone: Zone) => { await supabase.from('delivery_zones').update({ is_active: !zone.is_active }).eq('id', zone.id); fetchZones(); };
    const startEdit = (z: Zone) => { setForm({ name_ar: z.name_ar, name_en: z.name_en || "", fee: z.fee, min_order: z.min_order, estimated_time: z.estimated_time }); setEditId(z.id); setShowForm(true); };
    const resetForm = () => { setForm({ name_ar: "", name_en: "", fee: 0, min_order: 0, estimated_time: 30 }); setShowForm(false); setEditId(null); };

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
                        <Truck className="w-7 h-7 text-emerald-400" />
                        {isAr ? "مناطق التوصيل" : "Delivery Zones"}
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "حدد مناطق التوصيل ورسومها وأوقاتها" : "Define delivery areas, fees, and estimated times"}</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95">
                    <Plus className="w-4 h-4" /> {isAr ? "إضافة منطقة" : "Add Zone"}
                </button>
            </div>

            {/* Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الاسم بالعربي" : "Arabic Name"}</label>
                                    <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500/50" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الاسم بالإنجليزي" : "English Name"}</label>
                                    <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500/50" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "رسوم التوصيل" : "Delivery Fee"}</label>
                                    <input type="number" value={form.fee || ""} onChange={e => setForm(p => ({ ...p, fee: +e.target.value }))} min={0} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "الحد الأدنى" : "Min Order"}</label>
                                    <input type="number" value={form.min_order || ""} onChange={e => setForm(p => ({ ...p, min_order: +e.target.value }))} min={0} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                                <div><label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">{isAr ? "وقت التوصيل (دقيقة)" : "Est. Time (min)"}</label>
                                    <input type="number" value={form.estimated_time} onChange={e => setForm(p => ({ ...p, estimated_time: +e.target.value }))} min={1} className="w-full px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none" /></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleSave} className="px-6 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 transition">{editId ? (isAr ? "تحديث" : "Update") : (isAr ? "إضافة" : "Add")}</button>
                                <button onClick={resetForm} className="px-4 py-2 text-zinc-400 text-sm hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Zones List */}
            {zones.length === 0 ? (
                <div className="text-center py-16 text-zinc-500"><Truck className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">{isAr ? "لا توجد مناطق توصيل" : "No delivery zones"}</p></div>
            ) : (
                <div className="flex flex-col gap-3">
                    {zones.map(zone => (
                        <div key={zone.id} className={`bg-[#0d1117] border rounded-xl p-4 flex items-center gap-4 transition ${zone.is_active ? "border-zinc-800/50" : "border-zinc-800/30 opacity-50"}`}>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white">{isAr ? zone.name_ar : (zone.name_en || zone.name_ar)}</p>
                                <div className="flex gap-4 mt-1 text-xs text-zinc-400">
                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{isAr ? "رسوم:" : "Fee:"} {formatCurrency(zone.fee)}</span>
                                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{isAr ? "أقل طلب:" : "Min:"} {formatCurrency(zone.min_order)}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{zone.estimated_time} {isAr ? "دقيقة" : "min"}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleToggle(zone)} className={`p-1.5 rounded-lg ${zone.is_active ? "text-emerald-400" : "text-zinc-500"}`}>
                                    {zone.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                </button>
                                <button onClick={() => startEdit(zone)} className="p-1.5 text-zinc-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(zone.id)} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
