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
};

export function useRestaurant() {
    const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const email = user.email || "";
                let rId = null;

                const impersonatingTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;

                if (impersonatingTenant) {
                    rId = impersonatingTenant;
                } else if (email.endsWith('.asn')) {
                    // Staff member with .asn email
                    const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', user.id).single();
                    if (staff) rId = staff.restaurant_id;
                } else {
                    // Owner
                    const { data: rest } = await supabase.from('restaurants').select('id').eq('email', email).single();
                    if (rest) {
                        rId = rest.id;
                    } else {
                        // Fallback: staff user with regular email
                        const { data: staff } = await supabase.from('team_members').select('restaurant_id').eq('auth_id', user.id).single();
                        if (staff) rId = staff.restaurant_id;
                    }
                }

                if (rId) {
                    // Try fetching with all fields
                    const { data: d1, error: e1 } = await supabase
                        .from('restaurants')
                        .select('id, name, email, currency, subscription_plan, subscription_expires_at, logo_url, phone, whatsapp_number, phone_numbers, address, receipt_logo_url')
                        .eq('id', rId)
                        .single();

                    if (!e1 && d1) {
                        setRestaurant(d1 as RestaurantData);
                    } else {
                        console.warn("Retrying restaurant fetch without receipt_logo_url...");
                        // Fallback: omit 'receipt_logo_url' if it doesn't exist
                        const { data: d2, error: e2 } = await supabase
                            .from('restaurants')
                            .select('id, name, email, currency, subscription_plan, subscription_expires_at, logo_url, phone, whatsapp_number, phone_numbers, address')
                            .eq('id', rId)
                            .single();
                        if (d2) {
                            setRestaurant(d2 as RestaurantData);
                        } else if (e2) {
                            console.error("Failed to fetch restaurant even on fallback:", e2);
                        }
                    }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    return { restaurant, loading, restaurantId: restaurant?.id || null };
}
