"use client";

import { createContext, useContext } from "react";

/**
 * Data the dashboard layout already fetches on mount.
 *
 * Providing it here lets child pages skip their own getUser() + restaurant
 * lookup chain, which otherwise fires 2-4 Supabase API-gateway requests per
 * page navigation (each logged at ~2.9 KB).
 */
export interface DashboardData {
    restaurantId: string | null;
    userEmail: string | null;
    userId: string | null;
    permissions: Record<string, unknown> | null;
}

const DashboardContext = createContext<DashboardData>({
    restaurantId: null,
    userEmail: null,
    userId: null,
    permissions: null,
});

export const DashboardProvider = DashboardContext.Provider;

export function useDashboardContext() {
    return useContext(DashboardContext);
}
