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

        // Allowed columns in Supabase schema
        const ALLOWED_ORDER_COLUMNS = new Set([
            'id', 'restaurant_id', 'order_number', 'items', 'subtotal', 'discount', 
            'discount_type', 'total', 'payment_method', 'customer_name', 'customer_phone', 
            'customer_address', 'cashier_id', 'cashier_name', 'notes', 'deposit_amount', 
            'order_type', 'status', 'is_draft', 'source', 'branch_name', 
            'created_at', 'updated_at'
        ]);

        const ALLOWED_CUSTOMER_COLUMNS = new Set([
            'id', 'restaurant_id', 'name', 'phone', 'email', 'loyalty_points', 
            'total_spent', 'total_orders', 'last_order_date', 'notes', 'created_at'
        ]);

        const sanitizeRecord = (record: any, allowedSet: Set<string>) => {
            const clean: Record<string, any> = {};
            for (const key of Object.keys(record)) {
                if (allowedSet.has(key) && record[key] !== undefined) {
                    clean[key] = record[key];
                }
            }
            return clean;
        };

        // Cache restaurant settings across batch
        // Cache restaurant settings across batch
        const restSettingsCache = new Map<string, { auto_approve_cashier_orders?: boolean; auto_approve_website_orders?: boolean }>();

        const cleanOrders: any[] = [];
        if (orders && orders.length > 0) {
            for (const order of orders) {
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
                        if (restSetting.auto_approve_website_orders === true) {
                            order.status = 'completed';
                        }
                    }
                }

                cleanOrders.push(sanitizeRecord(order, ALLOWED_ORDER_COLUMNS));
            }
        }

        // 1. Bulk Upsert Orders
        if (cleanOrders.length > 0) {
            const { error: bulkOrderError } = await supabaseAdmin.from('orders').upsert(cleanOrders);
            if (!bulkOrderError) {
                results.orders = cleanOrders.length;
                for (const o of cleanOrders) {
                    results.updatedOrders[o.id] = { status: o.status };
                }
            } else {
                console.warn('[Sync] Bulk order upsert failed, falling back to individual:', bulkOrderError.message);
                // Fallback to individual
                for (const cleanOrder of cleanOrders) {
                    const { error } = await supabaseAdmin.from('orders').upsert(cleanOrder);
                    if (error) {
                        appendFileSync('sync_errors.log', `\nOrder Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(cleanOrder)}\n`);
                        results.errors.push(`Order ${cleanOrder.id}: ${error.message}`);
                    } else {
                        results.orders++;
                        results.updatedOrders[cleanOrder.id] = { status: cleanOrder.status };
                    }
                }
            }
        }

        // 2. Bulk Upsert Customers
        if (customers && customers.length > 0) {
            const cleanCusts = customers.map((c: any) => sanitizeRecord(c, ALLOWED_CUSTOMER_COLUMNS));
            const { error: bulkCustError } = await supabaseAdmin.from('customers').upsert(cleanCusts);
            if (!bulkCustError) {
                results.customers = cleanCusts.length;
            } else {
                for (const cleanCust of cleanCusts) {
                    const { error } = await supabaseAdmin.from('customers').upsert(cleanCust);
                    if (error) {
                        appendFileSync('sync_errors.log', `\nCustomer Error: ${JSON.stringify(error)}\nPayload: ${JSON.stringify(cleanCust)}\n`);
                        results.errors.push(`Customer ${cleanCust.id}: ${error.message}`);
                    } else {
                        results.customers++;
                    }
                }
            }
        }

        // 3. Process inventory / cost asynchronously in the background for recent orders
        if (results.orders > 0) {
            (async () => {
                for (const order of cleanOrders.slice(0, 10)) {
                    if (order.items && order.items.length > 0) {
                        try {
                            await processOrderInventory(order.restaurant_id, order.items, order.id, supabaseAdmin);
                            await calculateOrderCostServer(order.id, supabaseAdmin);
                        } catch (e) {
                            console.error('[Sync] Background inventory/cost calc error:', e);
                        }
                    }
                }
            })().catch(e => console.error('[Sync] Background task error:', e));
        }

        // Trigger auto-backup check (will skip if last backup < 24h ago)
        if (results.orders > 0 || results.customers > 0) {
            try {
                const firstOrder = orders?.[0];
                const tenantId = firstOrder?.restaurant_id;
                if (tenantId) {
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
