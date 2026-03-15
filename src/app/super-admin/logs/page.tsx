"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Activity, Clock, Search, AlertCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/context/LanguageContext";

interface ActivityLog {
    id: string;
    action: string;
    target_id: string;
    details: string;
    created_at: string;
}

export default function SuperAdminLogsPage() {
    const { language } = useLanguage();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(language === "ar" ? `خطأ: ${message}` : `Error: ${message}`);
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(l => 
        l.action?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.details?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">System Logs</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Audit trail and system activity history</p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading system logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <AlertCircle className="w-8 h-8 text-slate-400" />
                                            <p>No activity logs found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                    {log.action?.includes('security') ? (
                                                        <Shield className="w-4 h-4 text-indigo-500" />
                                                    ) : (
                                                        <Activity className="w-4 h-4 text-blue-500" />
                                                    )}
                                                </div>
                                                <div className="font-bold text-slate-900 dark:text-white capitalize">{log.action?.replace(/_/g, ' ')}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-zinc-400">
                                            {log.target_id ? log.target_id.split('-')[0] + '...' : 'System'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-zinc-300 max-w-xs truncate">
                                            {log.details || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(log.created_at).toLocaleString()}
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
