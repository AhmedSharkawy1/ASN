import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username } = body;

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

        const { data, error } = await supabaseAdmin
            .from('team_members')
            .select('restaurant_id, is_active')
            .eq('username', username)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "اسم المستخدم غير صحيح أو غير موجود" }, { status: 404 });
        }

        if (!data.is_active) {
            return NextResponse.json({ error: "هذا الحساب غير مفعل حالياً" }, { status: 403 });
        }

        // Return the internally constructed email for Supabase Auth
        const internalEmail = `${username}@${data.restaurant_id}.asn`;
        return NextResponse.json({ email: internalEmail });

    } catch (err: any) {
        console.error("Auth Lookup API Error:", err);
        return NextResponse.json({ error: "حدث خطأ غير متوقع", details: err.message }, { status: 500 });
    }
}
