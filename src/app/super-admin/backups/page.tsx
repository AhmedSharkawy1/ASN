"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
    Database, Download, RotateCcw, Search, Clock, Trash2, CheckCircle2,
    AlertCircle, HardDrive, RefreshCw, Shield, Building2, FileJson, X, ChevronDown, Upload, Copy, Timer, Settings
} from "lucide-react";
import { toast } from "sonner";

interface BackupRecord {
    id: string;
    tenant_id: string | null;
    backup_name: string;
    backup_type: string;
    backup_file: string | null;
    file_size_bytes: number;
    tables_included: string[];
    record_counts: Record<string, number>;
    status: string;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
    restaurants?: { name: string } | null;
}

interface Restaurant {
    id: string;
    name: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatRecordCounts(counts: Record<string, number>): string {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return `${total.toLocaleString()} records`;
}

export default function SuperAdminBackupsPage() {
    const [backups, setBackups] = useState<BackupRecord[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTenant, setFilterTenant] = useState<string>("all");
    const [isCreatingAll, setIsCreatingAll] = useState(false);
    const [isCreatingSingle, setIsCreatingSingle] = useState<string | null>(null);
    const [isRunningAuto, setIsRunningAuto] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState<string | null>(null);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cloneFileInputRef = useRef<HTMLInputElement>(null);

    // Auto-Backup Schedule State
    const [scheduleEnabled, setScheduleEnabled] = useState(true);
    const [scheduleInterval, setScheduleInterval] = useState(168);
    const [lastAutoRun, setLastAutoRun] = useState<string | null>(null);
    const [savingSchedule, setSavingSchedule] = useState(false);

    // Clone Client Modal State
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneFile, setCloneFile] = useState<File | null>(null);
    const [cloneTarget, setCloneTarget] = useState<string>('');
    const [cloneModules, setCloneModules] = useState({
        menu: true, orders: false, kitchen: true, factory: true,
        inventory: true, supplies: true, tables: true, delivery: true,
        customers: true, team: false, branches: false, finance: false,
        notifications: false, settings: true
    });
    const [isCloning, setIsCloning] = useState(false);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_backups')
                .select('*, restaurants(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBackups((data as BackupRecord[]) || []);
        } catch (err: unknown) {
            console.error(err);
            toast.error("Failed to load backups");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRestaurants = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('restaurants')
                .select('id, name')
                .order('name');
            setRestaurants((data as Restaurant[]) || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Load schedule settings
    const fetchScheduleSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/backup/settings');
            const data = await res.json();
            if (data.success && data.settings) {
                setScheduleEnabled(data.settings.enabled ?? true);
                setScheduleInterval(data.settings.interval_hours ?? 168);
                setLastAutoRun(data.settings.last_auto_run ?? null);

                // Auto-trigger: check if it's time for a new auto-backup
                if (data.settings.enabled) {
                    const lastRun = data.settings.last_auto_run ? new Date(data.settings.last_auto_run).getTime() : 0;
                    const hoursSinceRun = (Date.now() - lastRun) / (1000 * 60 * 60);
                    const interval = data.settings.interval_hours ?? 168;
                    if (hoursSinceRun >= interval) {
                        // Silently trigger auto-backup
                        fetch('/api/backup/auto', { method: 'POST' })
                            .then(r => r.json())
                            .then(result => {
                                if (result.success) {
                                    const created = result.results?.filter((r: { status: string }) => r.status === 'created').length || 0;
                                    if (created > 0) {
                                        toast.success(`🕐 Auto-backup triggered: ${created} client(s) backed up`);
                                        fetchBackups();
                                        setLastAutoRun(new Date().toISOString());
                                    }
                                }
                            })
                            .catch(console.error);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchBackups();
        fetchRestaurants();
        fetchScheduleSettings();
    }, [fetchBackups, fetchRestaurants, fetchScheduleSettings]);

    const handleSaveSchedule = async (enabled: boolean, interval: number) => {
        setSavingSchedule(true);
        try {
            const res = await fetch('/api/backup/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled, interval_hours: interval }),
            });
            const data = await res.json();
            if (data.success) {
                setScheduleEnabled(enabled);
                setScheduleInterval(interval);
                toast.success('✅ Schedule settings saved!');
            } else {
                toast.error('Failed to save schedule');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to save schedule');
        } finally {
            setSavingSchedule(false);
        }
    };

    // ── Create backup for ALL clients ──
    const handleBackupAll = async () => {
        setIsCreatingAll(true);
        try {
            const res = await fetch('/api/backup/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const result = await res.json();
            if (result.success) {
                toast.success(`✅ Backed up ${result.backups_created} client(s) successfully!`);
                fetchBackups();
            } else {
                toast.error(`Backup failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to trigger full backup");
        } finally {
            setIsCreatingAll(false);
        }
    };

    // ── Create backup for a single client ──
    const handleBackupSingle = async (tenantId: string, restaurantName: string) => {
        setIsCreatingSingle(tenantId);
        setShowClientPicker(false);
        try {
            const res = await fetch('/api/backup/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            });
            const result = await res.json();
            if (result.success) {
                toast.success(`✅ Backup created for "${restaurantName}"`);
                fetchBackups();
            } else {
                toast.error(`Backup failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to trigger client backup");
        } finally {
            setIsCreatingSingle(null);
        }
    };

    // ── Run auto backup ──
    const handleAutoBackup = async () => {
        setIsRunningAuto(true);
        try {
            const res = await fetch('/api/backup/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await res.json();
            if (result.success) {
                const created = result.results.filter((r: { status: string }) => r.status === 'created').length;
                const skipped = result.results.filter((r: { status: string }) => r.status === 'skipped').length;
                toast.success(`Auto backup: ${created} created, ${skipped} skipped (recent enough)`);
                fetchBackups();
            } else {
                toast.error(`Auto backup failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to run auto backup");
        } finally {
            setIsRunningAuto(false);
        }
    };

    // ── Upload & Restore Local Backup ──
    const handleUploadClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm(`⚠️ Are you sure you want to restore data from the file "${file.name}"?\n\nThis will overwrite your current data with the contents of this file. This action cannot be undone.`)) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch('/api/backup/upload-restore', {
                method: 'POST',
                body: formData, // No content-type so browser sets multipart boundary
            });
            const result = await res.json();
            
            if (result.success) {
                toast.success(`✅ Backup restored successfully from file!`);
                fetchBackups();
            } else {
                toast.error(`Restore failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // ── Clone Client ──
    const handleCloneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCloneFile(file);
        }
    };

    const handleCloneSubmit = async () => {
        if (!cloneFile || !cloneTarget) {
            toast.error("Please select a file and a destination client.");
            return;
        }

        const selectedModules = Object.keys(cloneModules).filter(k => cloneModules[k as keyof typeof cloneModules]);
        if (selectedModules.length === 0) {
            toast.error("Please select at least one module to clone.");
            return;
        }

        setIsCloning(true);
        const formData = new FormData();
        formData.append("file", cloneFile);
        formData.append("target_tenant_id", cloneTarget);
        formData.append("modules", JSON.stringify(selectedModules));

        try {
            const res = await fetch('/api/backup/clone', {
                method: 'POST',
                body: formData,
            });
            const result = await res.json();
            
            if (result.success) {
                toast.success(`✅ Client data cloned successfully!`);
                setShowCloneModal(false);
                setCloneFile(null);
                setCloneTarget('');
                if (cloneFileInputRef.current) cloneFileInputRef.current.value = "";
                fetchBackups();
            } else {
                toast.error(`Clone failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Clone failed");
        } finally {
            setIsCloning(false);
        }
    };

    // Helper: build client-name filename from the restaurants state
    const getClientFileName = (backup: BackupRecord) => {
        const restaurant = restaurants.find(r => r.id === backup.tenant_id);
        const clientName = restaurant?.name || 'backup';
        const date = new Date(backup.created_at).toISOString().split('T')[0];
        return `${clientName}_backup_${date}.json`;
    };

    // ── Download backup locally ──
    const handleDownload = async (backup: BackupRecord) => {
        setDownloadingId(backup.id);
        try {
            // Use mode=save to get file on disk, then re-fetch as blob
            const saveRes = await fetch(`/api/backup/download?backup_id=${backup.id}&mode=save`);
            const saveResult = await saveRes.json();
            if (!saveResult.success) throw new Error(saveResult.error || 'Failed');

            // Re-fetch the static file as raw text
            const fileRes = await fetch(saveResult.file_url);
            const text = await fileRes.text();

            // Build filename from client data on the frontend
            const fileName = getClientFileName(backup);

            // Create a new blob and force download
            const blob = new Blob([text], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`📥 Downloaded: ${fileName}`);
        } catch (err) {
            console.error(err);
            toast.error(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setTimeout(() => setDownloadingId(null), 2000);
        }
    };

    // ── Download latest backup for EACH client ──
    const handleDownloadAllRecent = async () => {
        setIsDownloadingAll(true);
        try {
            const latestPerClient: Record<string, BackupRecord> = {};
            for (const b of backups) {
                if (b.status !== 'completed' || !b.tenant_id || b.backup_name === 'BACKUP_SCHEDULE_SETTINGS') continue;
                if (!latestPerClient[b.tenant_id] || new Date(b.created_at) > new Date(latestPerClient[b.tenant_id].created_at)) {
                    latestPerClient[b.tenant_id] = b;
                }
            }

            const toDownload = Object.values(latestPerClient);
            if (toDownload.length === 0) {
                toast.error('No completed backups found to download.');
                setIsDownloadingAll(false);
                return;
            }

            toast.info(`📦 Downloading ${toDownload.length} backup(s)...`);

            let downloaded = 0;
            for (const backup of toDownload) {
                try {
                    const saveRes = await fetch(`/api/backup/download?backup_id=${backup.id}&mode=save`);
                    const saveResult = await saveRes.json();
                    if (!saveResult.success) continue;

                    const fileRes = await fetch(saveResult.file_url);
                    const text = await fileRes.text();

                    const fileName = getClientFileName(backup);
                    const blob = new Blob([text], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    downloaded++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (err) {
                    console.error(`Failed: ${backup.backup_name}`, err);
                }
            }

            toast.success(`✅ Downloaded ${downloaded}/${toDownload.length} backup(s)`);
        } catch (err) {
            console.error(err);
            toast.error('Bulk download failed');
        } finally {
            setIsDownloadingAll(false);
        }
    };

    // ── Restore backup ──
    const handleRestore = async (backup: BackupRecord) => {
        if (!confirm(`⚠️ Are you sure you want to restore "${backup.backup_name}"?\n\nThis will overwrite existing data for this client with the backup data. This action cannot be undone.`)) return;
        setRestoringId(backup.id);
        try {
            const res = await fetch('/api/backup/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backup_id: backup.id }),
            });
            const result = await res.json();
            if (result.success) {
                toast.success(`✅ Backup restored successfully!`);
            } else {
                toast.error(`Restore failed: ${result.error}`);
            }
        } catch (err) {
            console.error(err);
            toast.error("Restore failed");
        } finally {
            setRestoringId(null);
        }
    };

    // ── Delete backup ──
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this backup record?")) return;
        try {
            const res = await fetch('/api/backup/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ backup_id: id }),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            toast.success("Backup deleted");
            fetchBackups();
        } catch (err: unknown) {
            console.error(err);
            toast.error(`Failed to delete backup: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
    };

    // ── Filtering ──
    const filtered = backups.filter(b => {
        const matchesSearch =
            (b.restaurants?.name || 'System').toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.backup_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTenant = filterTenant === 'all' || b.tenant_id === filterTenant;
        return matchesSearch && matchesTenant;
    });

    // ── Stats ──
    const totalBackups = backups.length;
    const completedBackups = backups.filter(b => b.status === 'completed').length;
    const totalSize = backups.reduce((a, b) => a + (b.file_size_bytes || 0), 0);
    const uniqueClients = new Set(backups.filter(b => b.tenant_id).map(b => b.tenant_id)).size;

    const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
        completed: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10', icon: CheckCircle2 },
        in_progress: { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10', icon: RefreshCw },
        pending: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/10', icon: Clock },
        failed: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/10', icon: AlertCircle },
    };

    return (
        <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                        System Backups
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1">
                        Full data backups for all clients — server & local storage
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Hidden file input for uploading backup */}
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
                    
                    {/* Upload Backup */}
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-stone-600 hover:bg-stone-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                        {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Backup
                    </button>

                    {/* Auto Backup */}
                    <button
                        onClick={handleAutoBackup}
                        disabled={isRunningAuto}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                        {isRunningAuto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        Auto Backup
                    </button>

                    {/* Clone Client */}
                    <button
                        onClick={() => setShowCloneModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
                    >
                        <Copy className="w-4 h-4" />
                        Clone Client
                    </button>

                    {/* Per-Client Backup */}
                    <div className="relative">
                        <button
                            onClick={() => setShowClientPicker(!showClientPicker)}
                            disabled={!!isCreatingSingle}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
                        >
                            {isCreatingSingle ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                            Client Backup
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showClientPicker && (
                            <div className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto bg-white dark:bg-[#131b26] border border-stone-200 dark:border-stone-700 rounded-xl shadow-2xl z-50">
                                <div className="p-2 border-b border-stone-100 dark:border-stone-800">
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold px-2 py-1">Select client to back up:</p>
                                </div>
                                {restaurants.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleBackupSingle(r.id, r.name)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2"
                                    >
                                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                        {r.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Full System Backup */}
                    <button
                        onClick={handleBackupAll}
                        disabled={isCreatingAll}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                        {isCreatingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        {isCreatingAll ? "Backing up..." : "Backup All Clients"}
                    </button>

                    {/* Download All Recent */}
                    <button
                        onClick={handleDownloadAllRecent}
                        disabled={isDownloadingAll}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 text-sm"
                    >
                        {isDownloadingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isDownloadingAll ? "Downloading..." : "Download All Recent"}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Backups", value: totalBackups, icon: Database, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                    { label: "Completed", value: completedBackups, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Total Size", value: formatBytes(totalSize), icon: HardDrive, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Clients Backed Up", value: uniqueClients, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((card, i) => (
                    <div key={i} className="bg-white dark:bg-[#131b26] p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.bg} shrink-0`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{card.label}</p>
                            <p className="text-xl font-black text-slate-800 dark:text-white">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Auto-Backup Schedule Panel ── */}
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Timer className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Auto-Backup Schedule</h3>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                                {lastAutoRun
                                    ? `Last auto-run: ${new Date(lastAutoRun).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                    : 'No auto-backup has run yet'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={scheduleEnabled}
                            onChange={(e) => handleSaveSchedule(e.target.checked, scheduleInterval)}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] rtl:after:left-auto rtl:after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 shadow-inner" />
                        <span className="ml-3 text-sm font-bold text-slate-700 dark:text-zinc-300">
                            {scheduleEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </label>
                </div>

                {scheduleEnabled && (
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-bold text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Backup Interval:
                        </span>
                        {[
                            { hours: 24, label: 'يومي (Daily)' },
                            { hours: 72, label: 'كل 3 أيام' },
                            { hours: 168, label: 'أسبوعي (Weekly)' },
                            { hours: 336, label: 'كل أسبوعين' },
                            { hours: 720, label: 'شهري (Monthly)' },
                        ].map(opt => (
                            <button
                                key={opt.hours}
                                onClick={() => handleSaveSchedule(true, opt.hours)}
                                disabled={savingSchedule}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    scheduleInterval === opt.hours
                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md scale-105'
                                        : 'bg-stone-50 dark:bg-[#0a0f16] text-slate-600 dark:text-slate-300 border-stone-200 dark:border-stone-700 hover:border-emerald-400 hover:text-emerald-600'
                                } disabled:opacity-50`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#131b26] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden flex flex-col">
                {/* Search & Filter */}
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
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
                    <select
                        value={filterTenant}
                        onChange={(e) => setFilterTenant(e.target.value)}
                        className="px-3 py-2 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">All Clients</option>
                        {restaurants.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-[#0a0f16] border-b border-stone-200 dark:border-stone-800">
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Size</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Backup Name</th>
                                <th className="px-4 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Client</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Loading backups...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        <Database className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
                                        No backups found. Click &quot;Backup All Clients&quot; to create your first backup.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((backup) => {
                                    const sc = statusConfig[backup.status] || statusConfig.pending;
                                    const StatusIcon = sc.icon;
                                    return (
                                        <React.Fragment key={backup.id}>
                                            <tr className="hover:bg-stone-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                                                {/* ACTIONS — first column so it's always visible */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-1">
                                                        {/* Download */}
                                                        <button
                                                            onClick={() => handleDownload(backup)}
                                                            disabled={backup.status !== 'completed' || downloadingId === backup.id}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Download locally"
                                                        >
                                                            {downloadingId === backup.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                                        </button>
                                                        {/* Restore */}
                                                        <button
                                                            onClick={() => handleRestore(backup)}
                                                            disabled={backup.status !== 'completed' || restoringId === backup.id}
                                                            className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Restore this backup"
                                                        >
                                                            {restoringId === backup.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                                        </button>
                                                        {/* Details */}
                                                        <button
                                                            onClick={() => setShowDetails(showDetails === backup.id ? null : backup.id)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                                            title="View details"
                                                        >
                                                            <FileJson className="w-4 h-4" />
                                                        </button>
                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDelete(backup.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Delete record"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.color} capitalize`}>
                                                        <StatusIcon className={`w-3.5 h-3.5 ${backup.status === 'in_progress' ? 'animate-spin' : ''}`} />
                                                        {backup.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-500 dark:text-zinc-400">
                                                    <div>{new Date(backup.created_at).toLocaleDateString()}</div>
                                                    <div className="text-xs mt-0.5">{new Date(backup.created_at).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-zinc-300">
                                                    <div>{formatBytes(backup.file_size_bytes || 0)}</div>
                                                    {backup.record_counts && Object.keys(backup.record_counts).length > 0 && (
                                                        <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                                                            {formatRecordCounts(backup.record_counts)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider
                                                        ${backup.backup_type === 'auto' ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' :
                                                            backup.backup_type === 'full' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                                                        {backup.backup_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm font-mono text-slate-600 dark:text-zinc-300 truncate max-w-[200px]">
                                                        {backup.backup_name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                            {backup.tenant_id ? <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                                {backup.tenant_id ? backup.restaurants?.name || 'Unknown' : 'Entire System'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                                {backup.tenant_id ? 'Client Level' : 'System Level'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Details Row */}
                                            {showDetails === backup.id && (
                                                <tr key={`${backup.id}-details`} className="bg-stone-50/70 dark:bg-[#0a0f16]/50">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-3 flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <FileJson className="w-4 h-4 text-indigo-500" />
                                                                    <span className="text-sm font-bold text-slate-700 dark:text-white">Backup Details</span>
                                                                </div>
                                                                {backup.tables_included && backup.tables_included.length > 0 && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tables Included ({backup.tables_included.length})</p>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {backup.tables_included.map(t => (
                                                                                <span key={t} className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded text-[11px] font-mono font-bold">
                                                                                    {t}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {backup.record_counts && Object.keys(backup.record_counts).length > 0 && (
                                                                    <div>
                                                                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Record Counts</p>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                            {Object.entries(backup.record_counts)
                                                                                .filter(([, v]) => v > 0)
                                                                                .sort(([, a], [, b]) => b - a)
                                                                                .map(([table, count]) => (
                                                                                    <div key={table} className="flex items-center justify-between px-2.5 py-1.5 bg-white dark:bg-[#131b26] rounded-lg border border-stone-100 dark:border-stone-800">
                                                                                        <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">{table}</span>
                                                                                        <span className="text-xs font-black text-slate-800 dark:text-white ml-2">{count}</span>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {backup.error_message && (
                                                                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
                                                                        <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">Error</p>
                                                                        <p className="text-xs text-red-700 dark:text-red-300 font-mono">{backup.error_message}</p>
                                                                    </div>
                                                                )}
                                                                {backup.backup_file && (
                                                                    <div className="text-xs text-slate-400 dark:text-zinc-500 font-mono break-all">
                                                                        📁 {backup.backup_file}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button onClick={() => setShowDetails(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Click outside to close client picker */}
            {showClientPicker && (
                <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowClientPicker(false)}
                />
            )}

            {/* Clone Client Modal */}
            {showCloneModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#131b26] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800">
                        <div className="p-6 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Copy className="w-5 h-5 text-fuchsia-500" />
                                    Clone Client Data
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Extract template configurations into a new client account.</p>
                            </div>
                            <button onClick={() => setShowCloneModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* File Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">1. Select Master Backup (.json)</label>
                                <div 
                                    onClick={() => cloneFileInputRef.current?.click()}
                                    className={`w-full border-2 border-dashed ${cloneFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-[#0a0f16] hover:bg-stone-100 dark:hover:bg-stone-800'} rounded-xl p-4 text-center cursor-pointer transition-colors`}
                                >
                                    <input type="file" ref={cloneFileInputRef} className="hidden" accept=".json" onChange={handleCloneFileChange} />
                                    {cloneFile ? (
                                        <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-2">
                                            <FileJson className="w-5 h-5" /> {cloneFile.name}
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 dark:text-zinc-400 text-sm">Click to browse your computer...</div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Target Client */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">2. Destination Client</label>
                                <select
                                    value={cloneTarget}
                                    onChange={(e) => setCloneTarget(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 dark:bg-[#0a0f16] border border-stone-200 dark:border-stone-700 rounded-xl text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none dark:text-white"
                                >
                                    <option value="" disabled>Select a destination restaurant...</option>
                                    {restaurants.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Modules */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3">3. البيانات المراد نسخها</label>
                                <div className="flex items-center gap-2 mb-3">
                                    <button type="button" onClick={() => setCloneModules(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])) as typeof prev)} className="text-xs px-3 py-1 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 font-bold hover:bg-fuchsia-200 transition-colors">تحديد الكل</button>
                                    <button type="button" onClick={() => setCloneModules(prev => Object.fromEntries(Object.keys(prev).map(k => [k, false])) as typeof prev)} className="text-xs px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold hover:bg-stone-200 transition-colors">إلغاء الكل</button>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto space-y-2 pe-1">
                                    {[
                                        { key: 'menu', label: 'القائمة', desc: 'الأقسام والمنتجات' },
                                        { key: 'orders', label: 'الطلبات', desc: 'الطلبات وسجلات الطلبات والتكاليف' },
                                        { key: 'kitchen', label: 'الوصفات', desc: 'وصفات المطبخ ومكونات الوصفات' },
                                        { key: 'factory', label: 'المصنع', desc: 'طلبات الإنتاج' },
                                        { key: 'inventory', label: 'المخزون', desc: 'أصناف المخزون وحركات المخزون' },
                                        { key: 'supplies', label: 'التوريدات', desc: 'الموردين وأصناف التوريد والمدفوعات' },
                                        { key: 'tables', label: 'الطاولات', desc: 'طاولات الصالة' },
                                        { key: 'delivery', label: 'الدليفري', desc: 'مناطق التوصيل' },
                                        { key: 'customers', label: 'العملاء', desc: 'قاعدة بيانات العملاء' },
                                        { key: 'team', label: 'الفريق', desc: 'أعضاء الفريق (بدون بيانات تسجيل الدخول)' },
                                        { key: 'branches', label: 'الفروع', desc: 'بيانات الفروع' },
                                        { key: 'finance', label: 'المالية', desc: 'الحسابات المالية والمعاملات' },
                                        { key: 'notifications', label: 'الإشعارات', desc: 'إشعارات العملاء' },
                                        { key: 'settings', label: 'الإعدادات', desc: 'إعدادات الطابعة وصلاحيات الصفحات' },
                                    ].map(mod => (
                                        <label key={mod.key} className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-[#0a0f16] rounded-xl cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-900 border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={cloneModules[mod.key as keyof typeof cloneModules]}
                                                onChange={(e) => setCloneModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                                                className="mt-0.5 w-4 h-4 rounded text-fuchsia-600 focus:ring-fuchsia-500 border-stone-300 dark:border-stone-600 bg-white dark:bg-[#131b26]"
                                            />
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-white leading-none">{mod.label}</div>
                                                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{mod.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-[#0a0f16] flex justify-end gap-3">
                            <button onClick={() => setShowCloneModal(false)} disabled={isCloning} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button 
                                onClick={handleCloneSubmit}
                                disabled={isCloning}
                                className={`flex items-center gap-2 px-6 py-2.5 ${isCloning ? 'bg-fuchsia-400 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-700'} text-white font-bold rounded-xl shadow-sm transition-colors text-sm`}
                            >
                                {isCloning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                {isCloning ? 'Extracting Template...' : 'Start Cloning'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
