import { supabase } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Inventory Service — ID-based inventory deduction with safe stock updates.
 * 
 * Flow:
 *   Order Item → items.inventory_item_id → direct deduction
 *   Order Item → items.recipe_id → recipe_ingredients → ingredient deduction
 *   If insufficient → aggregated production request
 */

type OrderItemForInventory = {
    id: string;
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extras?: any[];
    notes?: string;
    weight_unit?: string;
};

/**
 * Main entry point: process inventory after an order is placed.
 * Called non-blocking from submitOrder.
 * Returns an object indicating if ALL items were successfully deducted instantly.
 */
export async function processOrderInventory(
    restaurantId: string,
    orderItems: OrderItemForInventory[],
    orderId: string,
    supabaseClient?: SupabaseClient
): Promise<{ allDeducted: boolean; messages: string[] }> {
    const sb = supabaseClient || supabase;
    let allDeducted = true;
    const messages: string[] = [];


    for (const item of orderItems) {
        try {
            const result = await processOneOrderItem(restaurantId, item, orderId, sb);
            if (!result) {
                allDeducted = false;
                messages.push(`${item.title} requires production factory.`);
            }
        } catch (err) {
            console.error(`[Inventory] Error processing item "${item.title}":`, err);
            allDeducted = false;
        }
    }

    return { allDeducted, messages };
}

/**
 * Process a single order item through the inventory deduction pipeline.
 * Returns true if fully deducted, false if deferred (needs production).
 */
async function processOneOrderItem(
    restaurantId: string,
    item: OrderItemForInventory,
    orderId: string,
    sb: SupabaseClient
): Promise<boolean> {
    // 1. Look up the menu item to get inventory_item_id, recipe_id and item_type
    const { data: menuItem, error: menuErr } = await sb
        .from('items')
        .select(`
            id, inventory_item_id, recipe_id,
            inventory_items(item_type, name)
        `)
        .eq('id', item.id)
        .single();

    if (menuErr || !menuItem) {
        return true; 
    }

    const needed = item.qty;
    // Handle potential array or object from join (PostgREST standard is an object for single FK)
    const invData = Array.isArray(menuItem.inventory_items) ? menuItem.inventory_items[0] : menuItem.inventory_items;
    const isProduct = invData?.item_type === 'product';


    // 2. Try direct inventory deduction if item is linked to inventory
    if (menuItem.inventory_item_id) {
        const deducted = await tryDeductInventory(
            restaurantId,
            menuItem.inventory_item_id,
            needed,
            'order',
            orderId,
            item.title,
            sb
        );
        
        if (deducted) {
            return true; // Success — stock was sufficient
        }
        
    }

    // 3. Fallback: If not in stock (or no inventory link), but should be produced
    // Trigger factory if: it has a recipe OR it's a 'product' type item in inventory
    if (menuItem.recipe_id || isProduct) {
        // Map common Arabic units to standard if needed to avoid constraint errors
        let unit = item.weight_unit || 'unit';
        if (unit === 'كجم') unit = 'kg';
        if (unit === 'قطعة') unit = 'piece';

        await upsertProductionRequest(
            restaurantId,
            menuItem.recipe_id || null,
            item.title,
            needed,
            orderId,
            sb,
            unit
        );
        
        
        return false; // Item deferred for factory production
    }


    return false; // Could not deduct and not produceable
}

/**
 * Attempt to deduct stock from an inventory item.
 * Uses a safe UPDATE with quantity check to prevent negative stock.
 * Returns true if deduction succeeded.
 */
async function tryDeductInventory(
    restaurantId: string,
    inventoryItemId: string,
    quantity: number,
    source: 'order' | 'production' | 'manual' | 'production_consume',
    referenceId: string,
    itemName: string,
    sb: SupabaseClient = supabase
): Promise<boolean> {
    // Fetch current stock
    const { data: inv, error: invErr } = await sb
        .from('inventory_items')
        .select('id, name, quantity')
        .eq('id', inventoryItemId)
        .single();

    if (invErr || !inv) {
        return false;
    }

    if (inv.quantity < quantity) {
        return false;
    }

    // Safe deduction: only update if quantity is still sufficient
    const { error, data } = await sb
        .from('inventory_items')
        .update({
            quantity: inv.quantity - quantity,
            updated_at: new Date().toISOString()
        })
        .eq('id', inventoryItemId)
        .gte('quantity', quantity)
        .select('*');

    if (error) {
        return false;
    }
    
    // Fix for silent failure in postgrest
    if (!data || data.length === 0) {
        return false;
    }

    // if (source === 'order') await sb.from('order_logs').insert({ order_id: referenceId, action: `tryDeduct: SUCCESS. Deducted ${quantity} from ${inv.name}.`, performed_by: 'system' });

    // Log transaction
    await sb.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id: inventoryItemId,
        item_name: inv.name || itemName,
        quantity,
        action: 'deduct',
        source,
        reference_id: referenceId,
        performed_by: 'system',
        notes: `Auto-deducted from ${source}: ${referenceId}`
    });

    return true;
}

// Removed tryDeductRecipeIngredients function as it is unused

/**
 * Create a new production request explicitly linked to an order.
 * We no longer aggregate quantities by day so that the factory can see exact orders.
 */
async function upsertProductionRequest(
    restaurantId: string,
    recipeId: string | null,
    productName: string,
    quantity: number,
    orderId: string,
    sb: SupabaseClient = supabase,
    unit: string = 'unit'
): Promise<{ success: boolean; error?: string }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Insert new discrete request for the missing items on this order
    const { error } = await sb.from('production_requests').insert({
        restaurant_id: restaurantId,
        recipe_id: recipeId,
        product_name: productName,
        quantity,
        unit: unit,
        status: 'pending',
        production_date: today,
        order_id: orderId
    });

    if (error) {
        return { success: false, error: error.message };
    }
    
    return { success: true };
}

/**
 * Start a production batch explicitly: deduct ingredients, move to in_progress.
 * Called when the factory starts working on a request or prints the daily tickets.
 */
export async function startProduction(
    restaurantId: string,
    productionRequestId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: request } = await supabase
            .from('production_requests')
            .select('*, recipes(id, product_name, recipe_ingredients(inventory_item_id, quantity, unit))')
            .eq('id', productionRequestId)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = request as any;
        if (!req || req.status !== 'pending') return { success: false, error: 'Request is not pending.' };

        const recipe = req.recipes;
        const produceQty = req.quantity;

        // Deduct ingredients
        if (recipe && recipe.recipe_ingredients) {
            for (const ing of recipe.recipe_ingredients) {
                const needed = ing.quantity * produceQty;
                const deducted = await tryDeductInventory(
                    restaurantId,
                    ing.inventory_item_id,
                    needed,
                    'production_consume',
                    productionRequestId,
                    recipe.product_name
                );
                if (!deducted) {
                    return { success: false, error: `Insufficient ingredient stock to start production` };
                }
            }
        }

        // Update status
        await supabase.from('production_requests')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .eq('id', productionRequestId);

        return { success: true };
    } catch (err) {
        console.error('[Production] startProduction error:', err);
        return { success: false, error: 'Unexpected error starting production' };
    }
}

/**
 * Complete a production batch: add produced item to inventory, create batch record.
 * If the request was still 'pending', it will deduct ingredients first.
 * Called from the factory dashboard when a production request is marked complete.
 */
export async function completeProduction(
    restaurantId: string,
    productionRequestId: string,
    producedBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Load the production request
        const { data: request } = await supabase
            .from('production_requests')
            .select('*, recipes(id, product_name, inventory_item_id, recipe_ingredients(inventory_item_id, quantity, unit))')
            .eq('id', productionRequestId)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = request as any;
        if (!req || !req.recipes) return { success: false, error: 'Production request or recipe not found' };

        const recipe = req.recipes;
        const produceQty = req.quantity;

        // 2. Deduct ingredients ONLY if the request was still pending
        // If it was 'in_progress', we assume startProduction already deducted them reliably.
        if (req.status === 'pending') {
            for (const ing of recipe.recipe_ingredients || []) {
                const needed = ing.quantity * produceQty;
                const deducted = await tryDeductInventory(
                    restaurantId,
                    ing.inventory_item_id,
                    needed,
                    'production_consume',
                    productionRequestId,
                    recipe.product_name
                );
                if (!deducted) {
                    return { success: false, error: `Insufficient ingredient stock for production` };
                }
            }
        }

        // 3. Add produced items to inventory
        if (recipe.inventory_item_id) {
            const { data: inv } = await supabase
                .from('inventory_items')
                .select('id, quantity, name')
                .eq('id', recipe.inventory_item_id)
                .single();

            if (inv) {
                await supabase.from('inventory_items')
                    .update({
                        quantity: inv.quantity + produceQty,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id);

                await supabase.from('inventory_transactions').insert({
                    restaurant_id: restaurantId,
                    inventory_item_id: inv.id,
                    item_name: inv.name,
                    quantity: produceQty,
                    action: 'add',
                    source: 'production',
                    reference_id: productionRequestId,
                    performed_by: producedBy,
                    notes: `Produced ${produceQty} of ${recipe.product_name}`
                });
            }
        }

        // 4. Create production batch record
        await supabase.from('production_batches').insert({
            restaurant_id: restaurantId,
            recipe_id: recipe.id,
            product_name: recipe.product_name,
            quantity: produceQty,
            unit: req.unit || 'unit',
            produced_by: producedBy,
            produced_at: new Date().toISOString()
        });

        // 5. Update production request status
        await supabase.from('production_requests')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', productionRequestId);

        return { success: true };
    } catch (err) {
        console.error('[Production] completeProduction error:', err);
        return { success: false, error: 'Unexpected error during production completion' };
    }
}

/**
 * Cancel a production batch: refund ingredients if it was in_progress.
 */
export async function cancelProduction(
    restaurantId: string,
    productionRequestId: string,
    cancelledBy: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: request } = await supabase
            .from('production_requests')
            .select('*, recipes(id, product_name, recipe_ingredients(inventory_item_id, quantity, unit))')
            .eq('id', productionRequestId)
            .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const req = request as any;
        if (!req) return { success: false, error: 'Production request not found' };

        if (req.status === 'completed') {
            return { success: false, error: 'Cannot cancel a completed request' };
        }

        if (req.status === 'in_progress') {
            const recipe = req.recipes;
            const produceQty = req.quantity;

            if (recipe && recipe.recipe_ingredients) {
                for (const ing of recipe.recipe_ingredients) {
                    const needed = ing.quantity * produceQty;
                    
                    const { data: inv } = await supabase
                        .from('inventory_items')
                        .select('id, quantity, name')
                        .eq('id', ing.inventory_item_id)
                        .single();

                    if (inv) {
                        await supabase.from('inventory_items')
                            .update({
                                quantity: inv.quantity + needed,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', inv.id);

                        await supabase.from('inventory_transactions').insert({
                            restaurant_id: restaurantId,
                            inventory_item_id: inv.id,
                            item_name: inv.name,
                            quantity: needed,
                            action: 'add',
                            source: 'production_cancel',
                            reference_id: productionRequestId,
                            performed_by: cancelledBy,
                            notes: `Refunded ${needed} due to cancelled production of ${recipe.product_name}`
                        });
                    }
                }
            }
        }

        // Update status
        await supabase.from('production_requests')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', productionRequestId);

        return { success: true };
    } catch (err) {
        console.error('[Production] cancelProduction error:', err);
        return { success: false, error: 'Unexpected error cancelling production' };
    }
}

/**
 * Manually adjust inventory stock (add or deduct).
 * Used from the inventory dashboard for manual stock corrections.
 */
export async function manualStockAdjustment(
    restaurantId: string,
    inventoryItemId: string,
    quantity: number,
    action: 'add' | 'deduct',
    performedBy: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    const { data: inv } = await supabase
        .from('inventory_items')
        .select('id, name, quantity')
        .eq('id', inventoryItemId)
        .single();

    if (!inv) return { success: false, error: 'Item not found' };

    if (action === 'deduct' && inv.quantity < quantity) {
        return { success: false, error: 'Insufficient stock for deduction' };
    }

    const newQty = action === 'add' ? inv.quantity + quantity : inv.quantity - quantity;

    const { error } = await supabase.from('inventory_items')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', inventoryItemId);

    if (error) return { success: false, error: error.message };

    await supabase.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id: inventoryItemId,
        item_name: inv.name,
        quantity,
        action,
        source: 'manual',
        reference_id: null,
        performed_by: performedBy,
        notes: notes || `Manual ${action}: ${quantity}`
    });

    return { success: true };
}

/**
 * Finalize deferred inventory deductions.
 * Called when an order status changes to "completed".
 * Finds items in the order that have NOT been recorded in `inventory_transactions`
 * and deducts them from the newly available stock.
 */
export async function finalizeDeferredInventory(
    restaurantId: string,
    orderId: string,
    orderItems: OrderItemForInventory[],
    supabaseClient?: SupabaseClient 
): Promise<void> {
    const sb = supabaseClient || supabase;

    // Fetch existing transactions for this order
    const { data: txs } = await sb
        .from('inventory_transactions')
        .select('id, item_name')
        .eq('reference_id', orderId)
        .eq('action', 'deduct')
        .eq('source', 'order');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successfulTitles = new Set(txs?.map((t: any) => t.item_name) || []);

    // Filter items that were NOT successfully deducted originally
    // We assume the stored item.title matches transaction's item_name OR the recipe successfully deducted
    // Wait, tryDeductInventory logs the `itemName`.
    
    for (const item of orderItems) {
        if (!successfulTitles.has(item.title)) {
            // This item was omitted or failed. Try deducting it now.
            // (Often because it's a finished product that the factory just sent us)
            const { data: menuItem } = await sb
                .from('items')
                .select('id, inventory_item_id, recipe_id')
                .eq('id', item.id)
                .single();

            if (!menuItem) continue;

            // Direct deduction attempt (since factory completion puts finished goods into stock)
            if (menuItem.inventory_item_id) {
                await tryDeductInventory(
                    restaurantId,
                    menuItem.inventory_item_id,
                    item.qty,
                    'order',
                    orderId,
                    item.title,
                    sb
                );
            }
        }
    }
}

/**
 * Revert all inventory changes for an order.
 * Used when an order is edited or cancelled.
 */
export async function revertOrderInventory(
    restaurantId: string,
    orderId: string,
    supabaseClient?: SupabaseClient
): Promise<void> {
    const sb = supabaseClient || supabase;

    // 1. Find all deductions made for this order in transactions
    const { data: txs, error: txError } = await sb
        .from('inventory_transactions')
        .select('*')
        .eq('reference_id', orderId)
        .eq('action', 'deduct')
        .eq('source', 'order');

    if (txError) {
        console.error("[Inventory] Error fetching transactions to revert:", txError);
    } else if (txs && txs.length > 0) {
        for (const tx of txs) {
            // Restore stock
            const { data: inv } = await sb
                .from('inventory_items')
                .select('id, quantity, name')
                .eq('id', tx.inventory_item_id)
                .single();

            if (inv) {
                await sb.from('inventory_items')
                    .update({
                        quantity: inv.quantity + tx.quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id);

                // Log the restoration
                await sb.from('inventory_transactions').insert({
                    restaurant_id: restaurantId,
                    inventory_item_id: inv.id,
                    item_name: inv.name,
                    quantity: tx.quantity,
                    action: 'add',
                    source: 'order_revert',
                    reference_id: orderId,
                    performed_by: 'system',
                    notes: `Restored stock due to order edit/cancellation: ${orderId}`
                });
            }
        }
        
        // Delete the old deductions so they don't get double-reverted if edited again
        await sb.from('inventory_transactions').delete().eq('reference_id', orderId).eq('action', 'deduct').eq('source', 'order');
    }

    // 2. Cancel any pending production requests for this order
    const { data: reqs } = await sb
        .from('production_requests')
        .select('id, status')
        .eq('order_id', orderId)
        .neq('status', 'cancelled');

    if (reqs && reqs.length > 0) {
        for (const req of reqs) {
            if (req.status === 'pending') {
                await sb.from('production_requests').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', req.id);
            } else if (req.status === 'in_progress') {
                // If in progress, use existing cancelProduction to refund ingredients
                await cancelProduction(restaurantId, req.id, 'system');
            }
        }
    }
}
