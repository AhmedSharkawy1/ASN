import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, restaurantId } = body;

        if (!username) {
            return NextResponse.json({ error: "Username is required" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Search by username first (supports multiple restaurants)
        let query = supabaseAdmin
            .from('team_members')
            .select('restaurant_id, username, auth_id, is_active')
            .eq('username', username)
            .order('created_at', { ascending: false });
            
        if (restaurantId) query = query.eq('restaurant_id', restaurantId);
        const { data: matches } = await query;

        let member = matches?.find(m => m.is_active) || matches?.[0];

        // Fallback 1: search by real email (staff page stores real email in email field)
        if (!member && (!matches || matches.length === 0)) {
            let emailQuery = supabaseAdmin
                .from('team_members')
                .select('restaurant_id, username, auth_id, is_active')
                .ilike('email', username)
                .not('auth_id', 'is', null)
                .order('created_at', { ascending: false });
                
            if (restaurantId) emailQuery = emailQuery.eq('restaurant_id', restaurantId);
            const { data: emailMatches } = await emailQuery;

            member = emailMatches?.find(m => m.is_active) || emailMatches?.[0];
        }

        // Fallback 2: search by name (legacy members without username)
        if (!member) {
            let nameQuery = supabaseAdmin
                .from('team_members')
                .select('restaurant_id, username, auth_id, is_active')
                .eq('name', username)
                .not('auth_id', 'is', null)
                .order('created_at', { ascending: false });
                
            if (restaurantId) nameQuery = nameQuery.eq('restaurant_id', restaurantId);
            const { data: nameMatches } = await nameQuery;

            member = nameMatches?.find(m => m.is_active) || nameMatches?.[0];
        }

        if (!member) {
            return NextResponse.json({ error: "اسم المستخدم غير صحيح أو غير موجود" }, { status: 404 });
        }

        if (!member.auth_id) {
            return NextResponse.json({ error: "هذا الحساب ليس لديه بيانات دخول. يرجى إعادة إنشاء الحساب من صفحة الفريق." }, { status: 400 });
        }

        if (!member.is_active) {
            return NextResponse.json({ error: "هذا الحساب غير مفعل حالياً" }, { status: 403 });
        }

        // Return the internally constructed email for Supabase Auth
        const loginUsername = member.username || username;
        const internalEmail = `${loginUsername}@${member.restaurant_id}.asn`;
        return NextResponse.json({ email: internalEmail });

    } catch (err: unknown) {
        console.error("Auth Lookup API Error:", err);
        return NextResponse.json({ error: "حدث خطأ غير متوقع", details: (err as Error).message }, { status: 500 });
    }
}
