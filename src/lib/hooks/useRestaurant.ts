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

                const impersonatingTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;

                if (impersonatingTenant) {
                    rId = impersonatingTenant;
                } else if (email.endsWith('.asn')) {
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', user.id).maybeSingle();
                    if (staff) rId = staff.restaurant_id;
                } else {
                    const { data: rest } = await supabase.from('restaurants').select('id').eq('email', email).maybeSingle();
                    if (rest) {
                        rId = rest.id;
                    } else {
                        const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', user.id).maybeSingle();
                        if (staff) rId = staff.restaurant_id;
                    }
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

    return { restaurant, loading, restaurantId: restaurant?.id || null, slug: restaurant?.slug || null };
}
