import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { backup_id } = body;

        if (!backup_id) {
            return NextResponse.json({ error: "Missing backup_id" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Get backup record to find the storage file path
        const { data: backup } = await supabaseAdmin
            .from('system_backups')
            .select('backup_file')
            .eq('id', backup_id)
            .single();

        // Delete the file from storage if it exists
        if (backup?.backup_file) {
            try {
                await supabaseAdmin.storage
                    .from('client-backups')
                    .remove([backup.backup_file]);
            } catch (storageErr) {
                console.warn("[Backup] Could not remove storage file (might not exist or invalid key):", storageErr);
            }
        }

        // Delete the database record
        const { error } = await supabaseAdmin
            .from('system_backups')
            .delete()
            .eq('id', backup_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("[Backup] Delete API Error:", err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: errMsg }, { status: 500 });
    }
}
