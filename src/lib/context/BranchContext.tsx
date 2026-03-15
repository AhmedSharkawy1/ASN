"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface BranchContextType {
    activeBranch: string;
    setActiveBranch: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [activeBranch, setActiveBranchState] = useState<string>('all');

    // Sync with localStorage to persist selection
    useEffect(() => {
        const saved = localStorage.getItem('active_branch');
        if (saved) setActiveBranchState(saved);
    }, []);

    const setActiveBranch = (id: string) => {
        setActiveBranchState(id);
        localStorage.setItem('active_branch', id);
    };

    return (
        <BranchContext.Provider value={{ activeBranch, setActiveBranch }}>
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
