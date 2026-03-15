"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CreditCard, Search, CheckCircle2, XCircle, AlertCircle, Edit, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminSubscriptionsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            // Join subscriptions with restaurants to get names
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*, restaurants(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubscriptions(data || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to load subscriptions");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            toast.success(`Subscription updated to ${newStatus}`);
            fetchSubscriptions();
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to update status");
        }
    };

    const filtered = subscriptions.filter(s => 
        (s.restaurants?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.plan_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'active': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'expired': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'suspended': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            default: return <AlertCircle className="w-4 h-4 text-stone-500" />;
        }
    };

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Subscriptions</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Manage active plans and billing cycles</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit">
                    <Plus className="w-4 h-4" />
                    Assign Plan
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by client or plan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Tenant</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Plan Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading subscriptions...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No subscriptions found.</td>
                                </tr>
                            ) : (
                                filtered.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{sub.restaurants?.name || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{sub.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{sub.plan_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-zinc-400 capitalize">{sub.subscription_type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize
                                                ${sub.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                  sub.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                                                  'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}
                                            `}>
                                                {getStatusIcon(sub.status)}
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                            <div>Start: {new Date(sub.start_date).toLocaleDateString()}</div>
                                            <div>End: {sub.is_lifetime ? 'Lifetime' : sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                                                    <Edit className="w-3.5 h-3.5" /> Edit Plan
                                                </button>
                                                {sub.status === 'active' ? (
                                                    <button onClick={() => handleUpdateStatus(sub.id, 'suspended')} className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">Suspend</button>
                                                ) : (
                                                    <button onClick={() => handleUpdateStatus(sub.id, 'active')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Activate</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
