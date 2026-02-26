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
};

export function useRestaurant() {
    const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('restaurants')
                    .select('id, name, email, currency, subscription_plan, subscription_expires_at')
                    .eq('email', user.email)
                    .single();

                if (data) setRestaurant(data as RestaurantData);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    return { restaurant, loading, restaurantId: restaurant?.id || null };
}
