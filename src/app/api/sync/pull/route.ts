import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const since = searchParams.get("since") || "1970-01-01T00:00:00Z";
        const deviceId = searchParams.get("device_id");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const tables = ['orders', 'order_items', 'customers', 'inventory_items', 'delivery_zones', 'branches', 'payments'];
        const data: Record<string, any[]> = {};

        for (const table of tables) {
            const { data: records, error } = await supabaseAdmin
                .from(table)
                .select('*')
                .gt('updated_at', since)
                // Optionally filter by device_id if we want to avoid downloading our own changes
                // .neq('device_id', deviceId) 
                .limit(1000);

            if (error) {
                console.error(`[SyncPull] Error fetching ${table}:`, error);
                data[table] = [];
            } else {
                data[table] = records || [];
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (err: any) {
        console.error("[SyncPull] Fatal Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
