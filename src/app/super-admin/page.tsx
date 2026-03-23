"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, CreditCard, Activity, Database } from "lucide-react";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        totalClients: 0,
        activeSubscriptions: 0,
        totalBranches: 0,
        totalBackups: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [clientsReq, branchesReq, subsReq, backupsReq] = await Promise.all([
                    supabase.from('restaurants').select('id', { count: 'exact' }),
                    supabase.from('branches').select('id', { count: 'exact' }),
                    supabase.from('subscriptions').select('id', { count: 'exact' }).eq('status', 'active'),
                    supabase.from('system_backups').select('id', { count: 'exact' }).eq('status', 'completed')
                ]);

                setStats({
                    totalClients: clientsReq.count || 0,
                    totalBranches: branchesReq.count || 0,
                    activeSubscriptions: subsReq.count || 0,
                    totalBackups: backupsReq.count || 0
                });
            } catch (err) {
                console.error("Error fetching admin stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        { label: "Total Tenants", value: stats.totalClients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Active Subscriptions", value: stats.activeSubscriptions, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Total Branches", value: stats.totalBranches, icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: "System Backups", value: stats.totalBackups, icon: Database, color: "text-amber-500", bg: "bg-amber-500/10" },
    ];

    if(loading) return <div className="animate-pulse flex gap-4">Loading stats...</div>

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Platform Engine</h1>
                <p className="text-slate-500 dark:text-zinc-400 mt-1">Super Admin Overview and System Health</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-start justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-1">{card.label}</p>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{card.value}</h3>
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                            <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="bg-white dark:bg-[#131b26] p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm min-h-[400px]">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Recent Activity Logs</h3>
                <div className="text-sm text-slate-500 flex items-center justify-center h-full">
                    Activity stream will appear here...
                </div>
            </div>
        </div>
    );
}
