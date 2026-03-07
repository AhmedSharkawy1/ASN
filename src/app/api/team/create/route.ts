import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, role, name, phone, email, permissions, restaurant_id } = body;

        if (!username || !password || !restaurant_id) {
            return NextResponse.json({ error: "Missing required fields: username, password, restaurant_id" }, { status: 400 });
        }

        // 1. Initialize Supabase Admin Client
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

        // 2. We use the username + restaurant_id combination to create a unique fake email.
        const internalEmail = `${username}@${restaurant_id}.asn`;

        // 3. Create the user in Supabase Auth (Admin so it doesn't log out current user)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: internalEmail,
            password: password,
            email_confirm: true,
            user_metadata: {
                username,
                role,
                restaurant_id,
                name
            }
        });

        if (authError) {
            console.error("Auth Creation Error:", authError);
            if (authError.message.includes("already registered")) {
                return NextResponse.json({ error: "اسم المستخدم هذا موجود بالفعل." }, { status: 400 });
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const auth_id = authData.user.id;

        // 4. Inject the new user into the team_members table
        const { data: insertData, error: dbError } = await supabaseAdmin
            .from('team_members')
            .insert({
                restaurant_id,
                auth_id,
                name,
                username,
                email: email || internalEmail,
                phone: phone || null,
                role,
                permissions,
                is_active: true
            })
            .select()
            .single();

        if (dbError) {
            // Rollback auth
            await supabaseAdmin.auth.admin.deleteUser(auth_id);
            console.error("DB Insert Error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, member: insertData });

    } catch (err: unknown) {
        console.error("Team API Error:", err);
        return NextResponse.json({ error: "حدث خطأ غير متوقع", details: (err as Error).message }, { status: 500 });
    }
}
