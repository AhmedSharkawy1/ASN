import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orders, customers } = body;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const results = { orders: 0, customers: 0, errors: [] as string[] };

        // Upsert orders
        if (orders && orders.length > 0) {
            for (const order of orders) {
                const { error } = await supabaseAdmin.from('orders').upsert(order);
                if (error) {
                    require('fs').appendFileSync('sync_errors.log', `\nOrder Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(order)}\n`);
                    results.errors.push(`Order ${order.id}: ${error.message}`);
                } else {
                    results.orders++;
                }
            }
        }

        // Upsert customers
        if (customers && customers.length > 0) {
            for (const cust of customers) {
                const { error } = await supabaseAdmin.from('customers').upsert(cust);
                if (error) {
                    require('fs').appendFileSync('sync_errors.log', `\nCustomer Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(cust)}\n`);
                    results.errors.push(`Customer ${cust.id}: ${error.message}`);
                } else {
                    results.customers++;
                }
            }
        }

        return NextResponse.json({ success: true, ...results });
    } catch (err: any) {
        require('fs').appendFileSync('sync_errors.log', `\nFatal Exception: ${err.message}\n${err.stack}\n`);
        console.error("Orders Sync API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
