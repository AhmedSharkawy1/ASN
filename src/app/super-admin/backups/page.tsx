"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Database, Download, RotateCcw, Search, Clock, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminBackupsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_backups')
                .select('*, restaurants(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBackups(data || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to load backups");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setIsCreating(true);
        try {
            // For now, this is a mock insertion representing a backup engine trigger
            const { error } = await supabase.from('system_backups').insert([
                {
                    tenant_id: null, // Full system backup
                    backup_name: `System_Full_${new Date().toISOString().split('T')[0]}`,
                    backup_file: `s3://asn-backups/system_full_${Date.now()}.sql.gz`,
                    status: 'completed'
                }
            ]);

            if (error) throw error;
            toast.success("System backup initiated successfully.");
            fetchBackups();
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to trigger backup");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this backup record?")) return;
        try {
            const { error } = await supabase.from('system_backups').delete().eq('id', id);
            if (error) throw error;
            toast.success("Backup deleted");
            fetchBackups();
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to delete backup");
        }
    };

    const filtered = backups.filter(b => 
        (b.restaurants?.name || 'System').toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.backup_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">System Backups</h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">Manage database snapshots and configurations</p>
                </div>
                <button 
                    onClick={handleCreateBackup}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit disabled:opacity-50"
                >
                    {isCreating ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isCreating ? "Creating..." : "Run Manual Backup"}
                </button>
            </div>

            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search backups..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Backup Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading backups...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No recent backups found.</td>
                                </tr>
                            ) : (
                                filtered.map((backup) => (
                                    <tr key={backup.id} className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                    <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {backup.tenant_id ? backup.restaurants?.name : 'Entire System'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                        {backup.tenant_id ? 'Tenant Level' : 'Global Level'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-zinc-300">
                                            {backup.backup_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                            {new Date(backup.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 capitalize">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {backup.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Download SQL Dump">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button className="text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors" title="Restore this Backup">
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(backup.id)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete record">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
