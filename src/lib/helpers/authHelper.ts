import { SupabaseClient } from '@supabase/supabase-js';

export async function getResolvedRestaurant(supabase: SupabaseClient, user: any, impersonatingTenant?: string | null) {
    if (!user) return null;

    if (impersonatingTenant) {
        const { data: rest } = await supabase
            .from('restaurants')
            .select('id, currency, name, parent_id')
            .eq('id', impersonatingTenant)
            .maybeSingle();
        if (rest) return rest;
    }

    // Try finding a direct restaurant match by email
    const { data: rest } = await supabase
        .from('restaurants')
        .select('id, currency, name, parent_id')
        .eq('email', user.email)
        .maybeSingle();
    
    if (rest) return rest;

    // Fallback: check if they are a team member
    const { data: staff } = await supabase
        .from('team_members')
        .select('restaurant_id, restaurants(id, currency, name, parent_id)')
        .eq('auth_id', user.id)
        .maybeSingle();
    
    if (staff && staff.restaurants) {
        // Because of Supabase join mapping, staff.restaurants is either an object or array. Usually object with single.
        const r = Array.isArray(staff.restaurants) ? staff.restaurants[0] : staff.restaurants;
        if (r) return r;
    }

    return null;
}
