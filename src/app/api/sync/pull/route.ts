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

        // Select only needed columns per table to reduce data transfer and log volume
        const tableSelects: Record<string, string> = {
            orders: 'id, restaurant_id, order_number, items, subtotal, discount, discount_type, total, payment_method, customer_name, customer_phone, customer_address, cashier_id, cashier_name, notes, deposit_amount, order_type, status, is_draft, source, branch_name, created_at, updated_at',
            order_items: 'id, order_id, item_id, item_name, quantity, price, total, notes, updated_at',
            customers: 'id, restaurant_id, name, phone, email, loyalty_points, total_spent, total_orders, last_order_date, notes, created_at, updated_at',
            inventory_items: 'id, restaurant_id, name, unit, quantity, min_quantity, cost_per_unit, updated_at',
            delivery_zones: 'id, restaurant_id, zone_name, delivery_fee, min_order, is_active, updated_at',
            branches: 'id, tenant_id, branch_name, is_active, updated_at',
            payments: 'id, order_id, amount, payment_method, created_at, updated_at',
        };
        const tables = Object.keys(tableSelects);
        const data: Record<string, any[]> = {};

        for (const table of tables) {
            const { data: records, error } = await supabaseAdmin
                .from(table)
                .select(tableSelects[table])
                .gt('updated_at', since)
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
