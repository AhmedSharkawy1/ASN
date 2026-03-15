import { supabase } from '@/lib/supabase/client';

/**
 * Supply Service — manages supply creation, payments, and inventory integration.
 */

export type SupplyItemInput = {
    inventory_item_id: string;
    item_name: string;
    quantity: number;
    unit_cost: number;
};

/**
 * Create a full supply record with items, update inventory, and optionally record initial payment.
 */
export async function createSupply(
    restaurantId: string,
    supplierId: string,
    items: SupplyItemInput[],
    amountPaid: number,
    deliveryDate: string,
    notes?: string
): Promise<{ success: boolean; supplyId?: string; error?: string }> {
    try {
        // Calculate totals
        const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
        const remainingBalance = totalCost - amountPaid;

        // 1. Create supply record
        const { data: supply, error: supplyErr } = await supabase
            .from('supplies')
            .insert({
                restaurant_id: restaurantId,
                supplier_id: supplierId,
                total_cost: totalCost,
                amount_paid: amountPaid,
                remaining_balance: remainingBalance,
                delivery_date: deliveryDate,
                notes: notes || null,
            })
            .select('id')
            .single();

        if (supplyErr || !supply) {
            return { success: false, error: supplyErr?.message || 'Failed to create supply' };
        }

        // 2. Create supply items
        const supplyItems = items.map(item => ({
            supply_id: supply.id,
            inventory_item_id: item.inventory_item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            total_cost: item.quantity * item.unit_cost,
        }));

        const { error: itemsErr } = await supabase.from('supply_items').insert(supplyItems);
        if (itemsErr) {
            // Rollback supply
            await supabase.from('supplies').delete().eq('id', supply.id);
            return { success: false, error: itemsErr.message };
        }

        // 3. Update inventory quantities (increase stock)
        for (const item of items) {
            const { data: inv } = await supabase
                .from('inventory_items')
                .select('id, quantity, name')
                .eq('id', item.inventory_item_id)
                .single();

            if (inv) {
                await supabase.from('inventory_items')
                    .update({
                        quantity: inv.quantity + item.quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', inv.id);

                // Log inventory transaction
                await supabase.from('inventory_transactions').insert({
                    restaurant_id: restaurantId,
                    inventory_item_id: inv.id,
                    item_name: inv.name,
                    quantity: item.quantity,
                    action: 'add',
                    source: 'supply',
                    reference_id: supply.id,
                    performed_by: 'admin',
                    notes: `Supply delivery: +${item.quantity} of ${inv.name}`
                });
            }
        }

        // 4. Record initial payment if amount > 0
        if (amountPaid > 0) {
            // Get supplier_id from the supply
            await supabase.from('supply_payments').insert({
                restaurant_id: restaurantId,
                supplier_id: supplierId,
                supply_id: supply.id,
                amount: amountPaid,
                payment_date: deliveryDate,
                notes: 'دفعة أولية مع التوريد',
            });
        }

        return { success: true, supplyId: supply.id };
    } catch (err) {
        console.error('[Supply] createSupply error:', err);
        return { success: false, error: 'Unexpected error creating supply' };
    }
}

/**
 * Record a payment for an existing supply and recalculate balances.
 */
export async function recordSupplyPayment(
    restaurantId: string,
    supplyId: string,
    supplierId: string,
    amount: number,
    paymentDate: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Insert payment
        const { error: payErr } = await supabase.from('supply_payments').insert({
            restaurant_id: restaurantId,
            supplier_id: supplierId,
            supply_id: supplyId,
            amount,
            payment_date: paymentDate,
            notes: notes || null,
        });

        if (payErr) return { success: false, error: payErr.message };

        // 2. Recalculate supply totals
        const { data: payments } = await supabase
            .from('supply_payments')
            .select('amount')
            .eq('supply_id', supplyId);

        const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);

        const { data: supply } = await supabase
            .from('supplies')
            .select('total_cost')
            .eq('id', supplyId)
            .single();

        if (supply) {
            await supabase.from('supplies')
                .update({
                    amount_paid: totalPaid,
                    remaining_balance: supply.total_cost - totalPaid,
                })
                .eq('id', supplyId);
        }

        return { success: true };
    } catch (err) {
        console.error('[Supply] recordPayment error:', err);
        return { success: false, error: 'Unexpected error recording payment' };
    }
}

/**
 * Delete a supply and reverse inventory changes.
 */
export async function deleteSupply(
    restaurantId: string,
    supplyId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Get supply items to reverse inventory
        const { data: items } = await supabase
            .from('supply_items')
            .select('inventory_item_id, quantity, item_name')
            .eq('supply_id', supplyId);

        // 2. Reverse inventory quantities
        for (const item of items || []) {
            if (!item.inventory_item_id) continue;
            const { data: inv } = await supabase
                .from('inventory_items')
                .select('id, quantity, name')
                .eq('id', item.inventory_item_id)
                .single();

            if (inv) {
                const newQty = Math.max(0, inv.quantity - item.quantity);
                await supabase.from('inventory_items')
                    .update({ quantity: newQty, updated_at: new Date().toISOString() })
                    .eq('id', inv.id);

                await supabase.from('inventory_transactions').insert({
                    restaurant_id: restaurantId,
                    inventory_item_id: inv.id,
                    item_name: inv.name,
                    quantity: item.quantity,
                    action: 'deduct',
                    source: 'supply',
                    reference_id: supplyId,
                    performed_by: 'admin',
                    notes: `Supply deleted: reversed +${item.quantity} of ${inv.name}`
                });
            }
        }

        // 3. Delete supply (cascade deletes supply_items and supply_payments)
        const { error } = await supabase.from('supplies').delete().eq('id', supplyId);
        if (error) return { success: false, error: error.message };

        return { success: true };
    } catch (err) {
        console.error('[Supply] deleteSupply error:', err);
        return { success: false, error: 'Unexpected error deleting supply' };
    }
}
