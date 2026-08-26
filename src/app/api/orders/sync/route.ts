import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { appendFileSync } from "fs";
import { processOrderInventory } from "@/lib/helpers/inventoryService";
import { calculateOrderCostServer } from "@/lib/helpers/costService";

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

        const results = { orders: 0, customers: 0, updatedOrders: {} as Record<string, { status: string }>, errors: [] as string[] };

        // Cache restaurant settings across batch
        const restSettingsCache = new Map<string, { auto_approve_cashier_orders?: boolean; auto_approve_website_orders?: boolean }>();

        // Upsert orders
        if (orders && orders.length > 0) {
            for (const order of orders) {
                // Fetch restaurant auto-approve options if not already cached
                let restSetting = restSettingsCache.get(order.restaurant_id);
                if (!restSetting) {
                    const { data: rData } = await supabaseAdmin
                        .from('restaurants')
                        .select('auto_approve_cashier_orders, auto_approve_website_orders')
                        .eq('id', order.restaurant_id)
                        .maybeSingle();
                    restSetting = rData || {};
                    restSettingsCache.set(order.restaurant_id, restSetting);
                }

                // Enforce auto_approve setting based on source
                if (!order.is_draft) {
                    const isCashier = order.source === 'pos' || (!order.source && order.cashier_id);
                    if (isCashier) {
                        if (restSetting.auto_approve_cashier_orders === true) {
                            order.status = 'completed';
                        } else if (restSetting.auto_approve_cashier_orders === false && order.status !== 'completed' && order.status !== 'in_progress' && order.status !== 'cancelled') {
                            order.status = 'pending';
                        }
                    } else {
                        // Website orders
                        if (restSetting.auto_approve_website_orders === true) {
                            order.status = 'completed';
                        }
                    }
                }

                // Check if this order was already processed for inventory
                const { data: existingTx } = await supabaseAdmin
                    .from('inventory_transactions')
                    .select('id')
                    .eq('reference_id', order.id)
                    .limit(1);

                const isAlreadyDeducted = existingTx && existingTx.length > 0;

                const { error } = await supabaseAdmin.from('orders').upsert(order);
                if (error) {
                    appendFileSync('sync_errors.log', `\nOrder Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(order)}\n`);
                    results.errors.push(`Order ${order.id}: ${error.message}`);
                } else {
                    results.orders++;
                    results.updatedOrders[order.id] = { status: order.status };
                    
                    // Deduct from inventory if new POS order
                    if (!isAlreadyDeducted && order.items && order.items.length > 0) {
                        try {
                            const invResult = await processOrderInventory(order.restaurant_id, order.items, order.id, supabaseAdmin);
                            
                            // If status is not already set on order, assign based on inventory deduction
                            if (!order.status) {
                                const finalStatus = invResult.allDeducted ? 'completed' : 'pending';
                                
                                await supabaseAdmin.from('orders').update({
                                    status: finalStatus,
                                    updated_at: new Date().toISOString()
                                }).eq('id', order.id);

                                await supabaseAdmin.from('order_logs').insert({
                                    order_id: order.id,
                                    action: 'status_assigned_auto_sync',
                                    old_status: 'pending',
                                    new_status: finalStatus,
                                    performed_by: 'system_sync'
                                });
                                results.updatedOrders[order.id] = { status: finalStatus };
                            }
                        } catch (invErr) {
                            console.error(`[Sync] Inventory deduction failed for order ${order.id}:`, invErr);
                        }
                    }

                    // Calculate order cost & profit (matches items by title for POS)
                    try {
                        await calculateOrderCostServer(order.id, supabaseAdmin);
                    } catch (costErr) {
                        console.error(`[Sync] Cost calculation failed for order ${order.id}:`, costErr);
                    }
                }
            }
        }

        // Upsert customers
        if (customers && customers.length > 0) {
            for (const cust of customers) {
                const { error } = await supabaseAdmin.from('customers').upsert(cust);
                if (error) {
                    appendFileSync('sync_errors.log', `\nCustomer Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(cust)}\n`);
                    results.errors.push(`Customer ${cust.id}: ${error.message}`);
                } else {
                    results.customers++;
                }
            }
        }

        // Trigger auto-backup check (will skip if last backup < 24h ago)
        if (results.orders > 0 || results.customers > 0) {
            try {
                const firstOrder = orders?.[0];
                const tenantId = firstOrder?.restaurant_id;
                if (tenantId) {
                    // Fire-and-forget: don't block the sync response
                    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/backup/create`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenant_id: tenantId, backup_type: 'auto' }),
                    }).catch(err => console.error('[Sync] Auto-backup trigger failed:', err));
                }
            } catch (backupErr) {
                console.error('[Sync] Auto-backup trigger error:', backupErr);
            }
        }

        return NextResponse.json({ success: true, ...results });
    } catch (err: unknown) {
        const error = err as Error;
        appendFileSync('sync_errors.log', `\nFatal Exception: ${error.message}\n${error.stack}\n`);
        console.error("Orders Sync API Error:", err);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
