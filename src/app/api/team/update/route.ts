import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { user_id, id, name, email, password, role } = body;

        if (!user_id && !id) {
            return NextResponse.json({ error: "Missing required field: user_id or id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Update Supabase Auth Details (if user_id is provided)
        if (user_id) {
            const updatePayload: any = {};
            if (email) updatePayload.email = email;
            if (password) updatePayload.password = password;
            if (role || name) {
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
                const currentMetadata = userData?.user?.user_metadata || {};
                updatePayload.user_metadata = {
                    ...currentMetadata,
                    ...(role ? { role } : {}),
                    ...(name ? { name } : {})
                };
            }

            if (Object.keys(updatePayload).length > 0) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updatePayload);
                if (authError) {
                    console.error("Auth Update Error:", authError);
                    return NextResponse.json({ error: authError.message }, { status: 400 });
                }
            }
        }

        // 2. Update team_members table
        const dbPayload: any = {};
        if (name) dbPayload.name = name;
        if (email) dbPayload.email = email;
        if (role) dbPayload.role = role;

        if (Object.keys(dbPayload).length > 0) {
            let query = supabaseAdmin.from('team_members').update(dbPayload);
            if (user_id) {
                query = query.eq('auth_id', user_id);
            } else if (id) {
                query = query.eq('id', id);
            }
            const { error: dbError } = await query;

            if (dbError) {
                console.error("DB Update Error:", dbError);
                return NextResponse.json({ error: dbError.message }, { status: 400 });
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        console.error("Team Update API Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: (err as Error).message }, { status: 500 });
    }
}
