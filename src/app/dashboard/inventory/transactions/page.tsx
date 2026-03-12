"use client";

import { useLanguage } from "@/lib/context/LanguageContext";
import { useRestaurant } from "@/lib/hooks/useRestaurant";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { ScrollText, Search, Filter, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

type Transaction = {
    id: string; item_name: string; quantity: number; action: string;
    source: string; reference_id: string | null; performed_by: string | null;
    notes: string | null; created_at: string;
};

export default function TransactionsPage() {
    const { language } = useLanguage();
    const { restaurantId } = useRestaurant();
    const isAr = language === "ar";

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [sourceFilter, setSourceFilter] = useState("all");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });

    const fetchTransactions = useCallback(async () => {
        if (!restaurantId) return;
        setLoading(true);
        let query = supabase.from('inventory_transactions').select('*')
            .eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(500);
        if (actionFilter !== 'all') query = query.eq('action', actionFilter);
        if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
        if (dateRange.from) query = query.gte('created_at', dateRange.from);
        if (dateRange.to) query = query.lte('created_at', dateRange.to + 'T23:59:59');
        const { data } = await query;
        setTransactions((data as Transaction[]) || []);
        setLoading(false);
    }, [restaurantId, actionFilter, sourceFilter, dateRange]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Realtime
    useEffect(() => {
        if (!restaurantId) return;
        const channel = supabase.channel(`inv-tx-${restaurantId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_transactions', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchTransactions())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [restaurantId, fetchTransactions]);

    const filtered = transactions.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.item_name.toLowerCase().includes(q) || t.performed_by?.toLowerCase().includes(q);
    });

    const sourceLabel = (s: string) => {
        const m: Record<string, [string, string]> = {
            order: ["طلب", "Order"], production: ["إنتاج", "Production"],
            manual: ["يدوي", "Manual"], production_consume: ["استهلاك إنتاج", "Prod. Consume"]
        };
        return isAr ? m[s]?.[0] || s : m[s]?.[1] || s;
    };

    if (loading && transactions.length === 0) return <div className="p-8 text-center text-slate-500 dark:text-zinc-500 animate-pulse">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

    return (
        <div className="flex flex-col gap-6 w-full mx-auto pb-20">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                    <ScrollText className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                    {isAr ? "حركات المخزون" : "Inventory Transactions"}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-base mt-1">{isAr ? "سجل كامل لجميع حركات المخزون" : "Full audit trail of all inventory movements"}</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isAr ? "بحث بالاسم..." : "Search by name..."}
                        className="w-full pe-10 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none" />
                </div>
                <div className="relative">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-zinc-500" />
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                        className="pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none appearance-none">
                        <option value="all">{isAr ? "كل الإجراءات" : "All Actions"}</option>
                        <option value="add">{isAr ? "إضافة" : "Add"}</option>
                        <option value="deduct">{isAr ? "خصم" : "Deduct"}</option>
                    </select>
                </div>
                <div className="relative">
                    <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                        className="pe-8 ps-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none appearance-none">
                        <option value="all">{isAr ? "كل المصادر" : "All Sources"}</option>
                        <option value="order">{isAr ? "طلب" : "Order"}</option>
                        <option value="production">{isAr ? "إنتاج" : "Production"}</option>
                        <option value="manual">{isAr ? "يدوي" : "Manual"}</option>
                        <option value="production_consume">{isAr ? "استهلاك إنتاج" : "Prod. Consume"}</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                        className="px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
                    <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                        className="px-3 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-zinc-800/50 rounded-xl text-sm text-slate-900 dark:text-white outline-none" />
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-zinc-500">
                    <ScrollText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">{isAr ? "لا توجد حركات" : "No transactions found"}</p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-zinc-800/50">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                                {[isAr ? "الصنف" : "Item", isAr ? "الكمية" : "Qty", isAr ? "الإجراء" : "Action", isAr ? "المصدر" : "Source", isAr ? "بواسطة" : "By", isAr ? "التاريخ" : "Date", isAr ? "ملاحظات" : "Notes"]
                                    .map((h, i) => <th key={i} className="px-4 py-3 text-start text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(tx => (
                                <tr key={tx.id} className="border-b border-slate-100 dark:border-zinc-800/30 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-zinc-200">{tx.item_name}</td>
                                    <td className={`px-4 py-3 font-extrabold ${tx.action === 'add' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {tx.action === 'add' ? '+' : '-'}{tx.quantity}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${tx.action === 'add' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                                            {tx.action === 'add' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                                            {tx.action === 'add' ? (isAr ? "إضافة" : "Add") : (isAr ? "خصم" : "Deduct")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{sourceLabel(tx.source)}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500">{tx.performed_by || "system"}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-500 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-400 dark:text-zinc-600 text-xs max-w-[200px] truncate">{tx.notes || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
