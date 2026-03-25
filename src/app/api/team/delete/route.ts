import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json({ error: "Missing required field: user_id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Delete user from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        
        // If the user is already deleted from Auth, we still want to proceed and clean up the database
        if (authError && !authError.message.includes("not found")) {
            console.error("Auth Delete Error:", authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 2. Delete from team_members (and cascade to permissions if foreign keys are set up)
        const { error: dbError } = await supabaseAdmin
            .from('team_members')
            .delete()
            .eq('auth_id', user_id);

        if (dbError) {
            console.error("DB Delete Error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        console.error("Team Delete API Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: (err as Error).message }, { status: 500 });
    }
}
