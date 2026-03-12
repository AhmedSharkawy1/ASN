import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { finalizeDeferredInventory } from "@/lib/helpers/inventoryService";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const orderId = params.id;
        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Fetch the order to get its items and restaurant ID
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, restaurant_id, items, status')
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Only finalize inventory if the order is currently 'preparing'
        // If it was already 'ready', everything was deducted instantly.
        if (order.status === 'preparing' && order.items && order.items.length > 0) {
            await finalizeDeferredInventory(order.restaurant_id, order.id, order.items, supabaseAdmin);
        }

        // Update the status to completed
        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Log the status change
        await supabaseAdmin.from('order_logs').insert({
            order_id: orderId,
            action: 'status_change',
            old_status: order.status,
            new_status: 'completed',
            performed_by: 'system_auto_complete',
            notes: 'Completed via API and finalized deferred inventory.'
        });

        return NextResponse.json({ success: true, orderId });
    } catch (err: unknown) {
        console.error("Complete Order API Error:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
    }
}
