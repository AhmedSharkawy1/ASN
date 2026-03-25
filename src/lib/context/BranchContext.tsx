"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface BranchInfo {
    id: string;
    branch_name: string;
    is_main?: boolean;
    is_active?: boolean;
}

interface BranchContextType {
    activeBranch: string; // 'all' or a specific branch ID
    setActiveBranch: (id: string) => void;
    branches: BranchInfo[];
    setBranches: (branches: BranchInfo[]) => void;
    activeBranchName: string;
    /** Returns true if activeBranch is a specific branch (not 'all') */
    isBranchSelected: boolean;
    /** Loads branches for a given restaurant from Supabase */
    loadBranches: (restaurantId: string) => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [activeBranch, setActiveBranchState] = useState<string>('all');
    const [branches, setBranches] = useState<BranchInfo[]>([]);

    // Sync with localStorage to persist selection
    useEffect(() => {
        const saved = localStorage.getItem('active_branch');
        if (saved) setActiveBranchState(saved);
    }, []);

    const setActiveBranch = (id: string) => {
        setActiveBranchState(id);
        localStorage.setItem('active_branch', id);
    };

    const activeBranchName = activeBranch === 'all'
        ? 'كل الفروع'
        : branches.find(b => b.id === activeBranch)?.branch_name || '';

    const isBranchSelected = activeBranch !== 'all';

    const loadBranches = useCallback(async (restaurantId: string) => {
        try {
            const { data } = await supabase
                .from('branches')
                .select('id, branch_name, is_main, is_active')
                .eq('tenant_id', restaurantId)
                .eq('is_active', true)
                .order('is_main', { ascending: false });
            if (data) setBranches(data);
        } catch (err) {
            console.error('[BranchContext] Failed to load branches:', err);
        }
    }, []);

    return (
        <BranchContext.Provider value={{
            activeBranch, setActiveBranch,
            branches, setBranches,
            activeBranchName, isBranchSelected,
            loadBranches,
        }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error("useBranch must be used within a BranchProvider");
    }
    return context;
}
