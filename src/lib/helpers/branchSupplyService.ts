import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface BranchSupplyPayload {
    restaurant_id: string;
    customer_id: string;
    customer_name: string;
    customer_phone?: string;
    items: {
        inventory_item_id: string;
        title: string;
        qty: number;
        price: number; // the price the factory is charging the branch
        unit: string;
    }[];
    notes?: string;
    deposit_amount: number;
}

export async function createBranchSupply(payload: BranchSupplyPayload) {
    try {
        const { restaurant_id, customer_name, customer_phone, items, notes, deposit_amount } = payload;
        
        let subtotal = 0;
        const orderItems = items.map(item => {
            subtotal += item.price * item.qty;
            return {
                id: item.inventory_item_id, // Important: we store the inventory item id to deduct it later
                title: item.title,
                qty: item.qty,
                price: item.price,
                unit: item.unit
            };
        });

        const total = subtotal;

        // 1. Get next order number
        const { data: lastOrder } = await supabaseAdmin
            .from('orders')
            .select('order_number')
            .eq('restaurant_id', restaurant_id)
            .order('order_number', { ascending: false })
            .limit(1)
            .single();

        const nextOrderNumber = (lastOrder?.order_number || 0) + 1;

        // 2. Create the order row (representing the outbound supply)
        // payment_method: 'credit' represents an unpaid/partially paid branch transfer
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                restaurant_id,
                order_number: nextOrderNumber,
                customer_name,
                customer_phone,
                items: orderItems,
                subtotal,
                total,
                discount: 0,
                deposit_amount,
                payment_method: deposit_amount >= total ? 'cash' : 'deposit',
                status: 'completed', // pre-completed since it's an outbound supply
                source: 'branch_supply',
                notes,
                is_draft: false
            })
            .select()
            .single();

        if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

        // 3. Deduct from Inventory directly (since these are inventory items, not menu items)
        for (const item of orderItems) {
            // Get current stock
            const { data: currentInv } = await supabaseAdmin
                .from('inventory_items')
                .select('stock_quantity')
                .eq('id', item.id)
                .single();

            const currentStock = currentInv?.stock_quantity || 0;
            const newStock = Math.max(0, currentStock - item.qty);

            // Update stock
            await supabaseAdmin
                .from('inventory_items')
                .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
                .eq('id', item.id);

            // Log transaction
            await supabaseAdmin
                .from('inventory_transactions')
                .insert({
                    restaurant_id,
                    item_id: item.id,
                    type: 'subtract',
                    quantity: item.qty,
                    source: 'branch_supply',
                    reference_id: order.id,
                    notes: `Outbound supply to ${customer_name}`
                });
        }

        return { success: true, order };
    } catch (err: unknown) {
        console.error("createBranchSupply error:", err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}
