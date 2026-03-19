"use client";

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Smartphone, CheckCircle2 } from 'lucide-react';
import { subscribeSyncStatus, type SyncStatus as SyncStatusType } from '@/lib/sync-service';
import { cn } from '@/lib/utils';

export const SyncStatus: React.FC = () => {
    const [status, setStatus] = useState<SyncStatusType>({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0
    });

    useEffect(() => {
        return subscribeSyncStatus((s) => setStatus(s));
    }, []);

    const getStatusInfo = () => {
        if (!status.isOnline) return { icon: CloudOff, text: 'Offline', color: 'text-red-500', bg: 'bg-red-500/10' };
        if (status.isSyncing) return { icon: RefreshCw, text: 'Syncing...', color: 'text-yellow-500', bg: 'bg-yellow-500/10', animate: 'animate-spin' };
        if (status.pendingCount > 0) return { icon: Smartphone, text: `${status.pendingCount} Pending`, color: 'text-blue-500', bg: 'bg-blue-500/10' };
        return { icon: CheckCircle2, text: 'Synced', color: 'text-green-500', bg: 'bg-green-500/10' };
    };

    const info = getStatusInfo();
    const Icon = info.icon;

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
            info.bg,
            info.color
        )}>
            <Icon size={14} className={info.animate} />
            <span>{info.text}</span>
            {status.lastSynced && (
                <span className="opacity-50 text-[10px] hidden md:inline-block">
                    • {new Date(status.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
    );
};
