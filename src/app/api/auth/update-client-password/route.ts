import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        
        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Fetch users to find the matching email
        let targetUser = null;
        let page = 1;
        
        while (!targetUser) {
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: 1000
            });

            if (listError) {
                console.error("List users error:", listError);
                return NextResponse.json({ error: "Failed to query auth users." }, { status: 500 });
            }

            if (!usersData || !usersData.users || usersData.users.length === 0) {
                break; // No more users
            }

            targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            
            if (usersData.users.length < 1000) {
                break; // Last page
            }
            
            page++;
        }

        if (!targetUser) {
            return NextResponse.json({ error: "User not found in Authentication list with this email." }, { status: 404 });
        }

        // 2. Update the password
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: password
        });

        if (authError) {
            console.error("Auth Update Error:", authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // 3. Update offline cache entry if present in pos_users (Optional but good for fallback)
        try {
            await supabaseAdmin
                .from('pos_users')
                .update({ password: password })
                .eq('username', email); // or 'name', handle gracefully if fails
        } catch (e) {
            // IGNORE
        }

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (err: unknown) {
        console.error("Client Password Update API Error:", err);
        return NextResponse.json({ error: "Internal Server Error", details: (err as Error).message }, { status: 500 });
    }
}
