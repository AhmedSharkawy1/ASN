"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type RestaurantData = {
    id: string;
    name: string;
    email: string;
    currency: string;
    subscription_plan: string;
    subscription_expires_at: string | null;
    logo_url?: string;
    phone?: string;
    whatsapp_number?: string;
    phone_numbers?: { label: string; number: string }[];
    address?: string;
    receipt_logo_url?: string;
    slug?: string;
    starting_order_number?: number;
    auto_approve_website_orders?: boolean;
    auto_approve_cashier_orders?: boolean;
};

export function useRestaurant() {
    const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        const loadCachedFirst = async () => {
            try {
                const { posDb } = await import('@/lib/pos-db');
                const cached = await posDb.settings.get('current_config');
                if (cached && cached.restaurant_id && isMounted) {
                    setRestaurant(prev => prev || {
                        id: cached.restaurant_id,
                        name: cached.restaurant_name,
                        email: '',
                        currency: cached.currency || 'EGP',
                        subscription_plan: 'pro',
                        subscription_expires_at: null,
                        logo_url: cached.restaurant_logo || undefined,
                        theme: cached.theme || undefined,
                    } as RestaurantData);

                    if (cached.permissions_json) {
                        try {
                            const p = JSON.parse(cached.permissions_json);
                            if (p._role) setUserRole(p._role);
                            if (p._isOwner !== undefined) setIsOwner(Boolean(p._isOwner));
                            else if (p._isAdmin) setIsOwner(true);
                        } catch {}
                    }
                    setLoading(false);
                }
            } catch {}

            try {
                const offlineSession = typeof window !== 'undefined' ? localStorage.getItem('offline_session') : null;
                if (offlineSession && isMounted) {
                    const parsed = JSON.parse(offlineSession);
                    if (parsed.restaurant_id) {
                        setRestaurant(prev => prev || {
                            id: parsed.restaurant_id,
                            name: parsed.restaurant_name || 'Restaurant',
                            email: parsed.email || '',
                            currency: 'EGP',
                            subscription_plan: 'pro',
                            subscription_expires_at: null,
                        } as RestaurantData);
                        if (parsed.user?.role) {
                            setUserRole(parsed.user.role);
                            if (parsed.user.role === 'admin' && !parsed.user.email?.endsWith('.asn')) {
                                setIsOwner(true);
                            }
                        }
                        setLoading(false);
                    }
                }
            } catch {}
        };

        loadCachedFirst();

        const fetchRemote = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                if (!user) return;

                const email = user.email || "";
                let rId: string | null = null;
                let resolvedRole: string | null = null;
                let resolvedIsOwner = false;

                const impersonatingTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;

                if (impersonatingTenant) {
                    rId = impersonatingTenant;
                    resolvedRole = 'owner';
                    resolvedIsOwner = true;
                } else if (email.endsWith('.asn')) {
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id, role').eq('auth_id', user.id).maybeSingle();
                    if (staff) {
                        rId = staff.restaurant_id;
                        resolvedRole = staff.role || 'staff';
                        resolvedIsOwner = false;
                    }
                } else {
                    const { data: rest } = await supabase.from('restaurants').select('id').eq('email', email).maybeSingle();
                    if (rest) {
                        rId = rest.id;
                        resolvedRole = 'owner';
                        resolvedIsOwner = true;
                    } else {
                        const { data: staff } = await supabase.from('team_members').select('restaurant_id, role').eq('auth_id', user.id).maybeSingle();
                        if (staff) {
                            rId = staff.restaurant_id;
                            resolvedRole = staff.role || 'staff';
                            resolvedIsOwner = false;
                        } else {
                            const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
                            if (roleData?.role === 'super_admin') {
                                resolvedRole = 'owner';
                                resolvedIsOwner = true;
                            }
                        }
                    }
                }

                if (isMounted && resolvedRole) {
                    setUserRole(resolvedRole);
                    setIsOwner(resolvedIsOwner);
                }

                if (rId && isMounted) {
                    const { data: d1, error: e1 } = await supabase
                        .from('restaurants')
                        .select('id, name, email, currency, subscription_plan, subscription_expires_at, logo_url, phone, whatsapp_number, phone_numbers, address, receipt_logo_url, slug, starting_order_number, auto_approve_website_orders, auto_approve_cashier_orders')
                        .eq('id', rId)
                        .maybeSingle();

                    if (!e1 && d1) {
                        setRestaurant(d1 as RestaurantData);
                    } else {
                        const { data: d2 } = await supabase
                            .from('restaurants')
                            .select('id, name, email, currency, subscription_plan, subscription_expires_at, logo_url, phone, whatsapp_number, phone_numbers, address, slug, starting_order_number')
                            .eq('id', rId)
                            .maybeSingle();
                        if (d2) {
                            setRestaurant(d2 as RestaurantData);
                        }
                    }
                }
            } catch (e) {
                console.error("useRestaurant fetch error:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchRemote();

        return () => {
            isMounted = false;
        };
    }, []);

    const isManager = isOwner || userRole === 'admin' || userRole === 'manager';
    const isRestrictedRole = userRole === 'cashier' || userRole === 'staff' || userRole === 'delivery' || userRole === 'kitchen';
    const canEditOrders = isManager && !isRestrictedRole;
    const canDeleteOrders = isManager && !isRestrictedRole;

    return { 
        restaurant, 
        loading, 
        restaurantId: restaurant?.id || null, 
        slug: restaurant?.slug || null,
        userRole,
        isOwner,
        isManager,
        canEditOrders,
        canDeleteOrders,
    };
}
