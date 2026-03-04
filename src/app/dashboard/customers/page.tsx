"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/helpers/formatters";
import { posDb, generateId } from "@/lib/pos-db";
import type { PosCustomer } from "@/lib/pos-db";
import { Users, Plus, Search, Trash2, X, Download, Upload, Phone, ShoppingCart, FileSpreadsheet, CheckCircle2, AlertCircle, Crown } from "lucide-react";
import * as XLSX from "xlsx";

type EnrichedCustomer = PosCustomer & { orders: number; total: number; lastOrder: string; status: "VIP" | "نشط" | "خامل" };

export default function CustomersPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [searchQ, setSearchQ] = useState("");
    const [newCust, setNewCust] = useState({ name: "", phone: "", address: "", notes: "" });
    const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchCustomers = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);

        // Get customers from Supabase first, then sync to local
        const { data: sbCusts } = await supabase.from("customers").select("*").eq("restaurant_id", restaurantId);
        if (sbCusts) {
            for (const c of sbCusts) {
                const local = await posDb.customers.get(c.id);
                if (!local) await posDb.customers.put({ ...c, restaurant_id: restaurantId, _dirty: false } as PosCustomer);
            }
        }

        const allCustomers = await posDb.customers.where("restaurant_id").equals(restaurantId).toArray();
        const allOrders = await posDb.orders.where("restaurant_id").equals(restaurantId)
            .and(o => o.status !== "cancelled" && !o.is_draft).toArray();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

        const enriched: EnrichedCustomer[] = allCustomers.map(c => {
            const custOrders = allOrders.filter(o => o.customer_phone === c.phone || o.customer_name === c.name);
            let status: EnrichedCustomer["status"] = "خامل";
            if (custOrders.length >= 10) status = "VIP";
            else if (custOrders.some(o => o.created_at >= thirtyDaysAgoStr)) status = "نشط";
            const sorted = [...custOrders].sort((a, b) => b.created_at.localeCompare(a.created_at));
            return {
                ...c,
                orders: custOrders.length,
                total: custOrders.reduce((s, o) => s + (o.total || 0), 0),
                lastOrder: sorted[0]?.created_at || c.created_at,
                status,
            };
        });

        setCustomers(enriched.sort((a, b) => b.orders - a.orders));
        setLoading(false);
    }, [restaurantId]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const filtered = useMemo(() => {
        if (!searchQ) return customers;
        const q = searchQ.toLowerCase();
        return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
    }, [customers, searchQ]);

    const addCustomer = async () => {
        if (!newCust.name.trim() || !newCust.phone.trim() || !restaurantId) return;
        const id = generateId();
        const cust: PosCustomer = { id, restaurant_id: restaurantId, name: newCust.name.trim(), phone: newCust.phone.trim(), address: newCust.address.trim() || undefined, notes: newCust.notes.trim() || undefined, created_at: new Date().toISOString(), _dirty: true };
        await posDb.customers.put(cust);
        // Sync to online
        supabase.from("customers").upsert({ id, restaurant_id: restaurantId, name: cust.name, phone: cust.phone, address: cust.address || null, notes: cust.notes || null, created_at: cust.created_at }).then(() => posDb.customers.update(id, { _dirty: false }));
        setNewCust({ name: "", phone: "", address: "", notes: "" }); setShowAdd(false); fetchCustomers();
    };

    const deleteCustomer = async (id: string) => {
        await posDb.customers.delete(id);
        supabase.from("customers").delete().eq("id", id).then(() => { });
        setCustomers(prev => prev.filter(c => c.id !== id));
    };

    const exportCSV = () => {
        const rows = filtered.map(c => [c.name, c.phone, c.address || "", c.status, c.orders, formatCurrency(c.total)]);
        const csv = [["الاسم", "الهاتف", "العنوان", "التصنيف", "الطلبات", "إجمالي الإنفاق"], ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "customers.csv"; a.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !restaurantId) return;
        setImportStatus(null);
        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(data), { type: "array" });
            const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
            if (rows.length === 0) { setImportStatus({ type: "error", message: "الملف فارغ!" }); return; }

            const existing = await posDb.customers.where("restaurant_id").equals(restaurantId).toArray();
            const existingPhones = new Set(existing.map(c => c.phone));
            let count = 0;
            for (const row of rows) {
                const name = String(row["الاسم"] || row["Name"] || "").trim();
                const phone = String(row["الهاتف"] || row["Phone"] || "").trim();
                if (!name || !phone || existingPhones.has(phone)) continue;
                const id = generateId();
                const cust: PosCustomer = { id, restaurant_id: restaurantId, name, phone, address: String(row["العنوان"] || row["Address"] || "").trim() || undefined, created_at: new Date().toISOString(), _dirty: true };
                await posDb.customers.put(cust);
                supabase.from("customers").upsert({ id, restaurant_id: restaurantId, name, phone, address: cust.address || null, created_at: cust.created_at }).then(() => { });
                existingPhones.add(phone); count++;
            }
            setImportStatus({ type: "success", message: `تم استيراد ${count} عميل بنجاح!` });
            fetchCustomers();
        } catch { setImportStatus({ type: "error", message: "خطأ في قراءة الملف" }); }
        if (fileRef.current) fileRef.current.value = "";
    };

    const downloadTemplate = () => {
        const rows = [{ "الاسم": "أحمد", "الهاتف": "01001234567", "العنوان": "المعادي" }];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "Customers_Template.xlsx");
    };

    const vipCount = customers.filter(c => c.status === "VIP").length;
    const activeCount = customers.filter(c => c.status === "نشط").length;
    const totalSpend = customers.reduce((s, c) => s + c.total, 0);

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><Users className="w-7 h-7 text-emerald-400" />{isAr ? "إدارة العملاء" : "Customers CRM"}</h1>
                    <p className="text-zinc-400 text-sm mt-1">{isAr ? "تتبع العملاء وتصنيفهم حسب النشاط" : "Track and classify customers by activity"}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95"><Plus className="w-4 h-4" /> إضافة عميل</button>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2.5 bg-[#0d1117] border border-zinc-800/50 text-zinc-300 font-bold text-sm rounded-xl hover:border-emerald-500/30"><Download className="w-4 h-4" /> CSV</button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "إجمالي العملاء", val: customers.length, color: "text-zinc-300" },
                    { label: "VIP", val: vipCount, color: "text-amber-400" },
                    { label: "نشط", val: activeCount, color: "text-emerald-400" },
                    { label: "إجمالي الإنفاق", val: formatCurrency(totalSpend), color: "text-cyan-400" },
                ].map((s, i) => <div key={i} className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{s.label}</p><p className={`text-xl font-extrabold ${s.color}`}>{s.val}</p></div>)}
            </div>

            {/* Import/Export */}
            <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl p-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-3"><FileSpreadsheet className="w-4 h-4 text-emerald-400" /> استيراد من Excel</h3>
                <div className="flex flex-wrap gap-3 items-center">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg active:scale-95"><Upload className="w-4 h-4" /> استيراد Excel</button>
                    <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700"><FileSpreadsheet className="w-4 h-4" /> تحميل نموذج</button>
                </div>
                {importStatus && <div className={`mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${importStatus.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{importStatus.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {importStatus.message}</div>}
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="bg-[#0d1117] border border-emerald-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">إضافة عميل جديد</h3><button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button></div>
                    <div className="grid grid-cols-2 gap-3">
                        {[{ key: "name", label: "الاسم", dir: "rtl" }, { key: "phone", label: "الهاتف", dir: "ltr" }, { key: "address", label: "العنوان (اختياري)", dir: "rtl" }, { key: "notes", label: "ملاحظات (اختياري)", dir: "rtl" }].map(f => (
                            <input key={f.key} value={newCust[f.key as keyof typeof newCust]} onChange={e => setNewCust(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.label} dir={f.dir} className="px-3 py-2 bg-black/30 border border-zinc-800 rounded-lg text-sm text-white outline-none focus:border-emerald-500/40" />
                        ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-zinc-400 text-xs font-bold">إلغاء</button>
                        <button onClick={addCustomer} className="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">إضافة</button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث بالاسم أو الرقم..." className="w-full pe-10 ps-4 py-2.5 bg-[#0d1117] border border-zinc-800/50 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500/50" />
            </div>

            {/* Table */}
            {loading ? <div className="text-center py-12 text-zinc-500 animate-pulse">جاري التحميل...</div> : filtered.length === 0 ? (
                <div className="text-center py-16 text-zinc-600"><Users className="w-16 h-16 mx-auto mb-3 opacity-20" /><p className="font-bold">لا يوجد عملاء</p></div>
            ) : (
                <div className="bg-[#0d1117] border border-zinc-800/50 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-zinc-800/50">
                            {["العميل", "الهاتف", "التصنيف", "الطلبات", "إجمالي الإنفاق", ""].map((h, i) => <th key={i} className="text-right p-4 text-[10px] text-zinc-500 font-bold uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {filtered.map((c, i) => (
                                <tr key={i} className="border-b border-zinc-800/30 hover:bg-white/[0.02] transition">
                                    <td className="p-4 font-bold text-zinc-300">{c.name}</td>
                                    <td className="p-4 text-zinc-400 text-xs" dir="ltr"><Phone className="w-3 h-3 inline mr-1" />{c.phone}</td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${c.status === "VIP" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : c.status === "نشط" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"}`}>
                                            {c.status === "VIP" && <Crown className="w-3 h-3" />} {c.status}
                                        </span>
                                    </td>
                                    <td className="p-4"><span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-lg text-xs font-bold"><ShoppingCart className="w-3 h-3" /> {c.orders}</span></td>
                                    <td className="p-4 font-extrabold text-emerald-400">{formatCurrency(c.total)}</td>
                                    <td className="p-4"><button onClick={() => deleteCustomer(c.id)} className="text-zinc-600 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
