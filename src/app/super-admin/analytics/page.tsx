"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { LineChart, BarChart3, TrendingUp, Users } from "lucide-react";
export default function SuperAdminAnalyticsPage() {
    const [stats, setStats] = useState({ clients: 0, branches: 0, subscriptions: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { count: clientCount } = await supabase.from('restaurants').select('*', { count: 'exact', head: true });
                const { count: branchCount } = await supabase.from('branches').select('*', { count: 'exact', head: true });
                const { count: subCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true });
                
                setStats({
                    clients: clientCount || 0,
                    branches: branchCount || 0,
                    subscriptions: subCount || 0
                });
            } catch (err) {
                console.error("Analytics fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">System Analytics</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Platform growth and usage metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Total Clients</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{loading ? '...' : stats.clients}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <LineChart className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Total Branches</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{loading ? '...' : stats.branches}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Active Subs</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">{loading ? '...' : stats.subscriptions}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
                <BarChart3 className="w-16 h-16 text-slate-200 dark:text-stone-800 mb-4" />
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Detailed Analytics Chart Coming Soon</h3>
                <p className="text-sm text-slate-500 max-w-md mt-2">More granular metrics including revenue tracking, daily active users, and API usage will be available in the next release.</p>
            </div>
        </div>
    );
}
