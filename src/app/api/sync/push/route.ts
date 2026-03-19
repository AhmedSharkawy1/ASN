import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { processOrderInventory } from "@/lib/helpers/inventoryService";
import { calculateOrderCostServer } from "@/lib/helpers/costService";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { actions } = body; // Array of { action_type, table_name, record_id, payload }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: "Server missing SERVICE_ROLE_KEY." }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const results = { success: 0, failed: 0, errors: [] as any[] };

        for (const action of actions) {
            const { action_type, table_name, record_id, payload } = action;

            try {
                if (action_type === 'upsert' || action_type === 'create' || action_type === 'update') {
                    // Clean payload of sync metadata to avoid conflicts on server
                    const { sync_status, sync_attempts, last_synced_at, ...cleanPayload } = payload;
                    
                    const { error } = await supabaseAdmin.from(table_name).upsert(cleanPayload);
                    if (error) throw error;

                    // Specialized logic for POS orders
                    if (table_name === 'orders' && cleanPayload.source === 'pos') {
                        // Trigger inventory deduction if not already done
                        const { data: existingTx } = await supabaseAdmin
                            .from('inventory_transactions')
                            .select('id')
                            .eq('reference_id', record_id)
                            .limit(1);

                        if (!existingTx || existingTx.length === 0) {
                            await processOrderInventory(cleanPayload.restaurant_id, cleanPayload.items, record_id, supabaseAdmin);
                        }
                        await calculateOrderCostServer(record_id, supabaseAdmin);
                    }
                } else if (action_type === 'delete') {
                    const { error } = await supabaseAdmin.from(table_name).update({ deleted_at: new Date().toISOString() }).eq('id', record_id);
                    if (error) throw error;
                }

                results.success++;
            } catch (err: any) {
                console.error(`[SyncPush] Action failed for ${table_name}:${record_id}`, err);
                results.failed++;
                results.errors.push({ id: record_id, error: err.message });
            }
        }

        return NextResponse.json({ ...results });

    } catch (err: any) {
        console.error("[SyncPush] Fatal Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
