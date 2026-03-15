import { supabase } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cost Engine Service — auto-calculates recipe cost, order cost, and profit.
 * 
 * product_cost = sum(ingredient.qty × inventory_item.cost_per_unit)
 * order_cost   = sum(product_cost_snapshot × item_qty)
 * order_profit = order_total - order_cost
 * profit_margin = order_profit / order_total
 */

/**
 * Calculate and update the cost for a single recipe.
 * Returns the calculated cost.
 */
export async function calculateRecipeCost(recipeId: string): Promise<number> {
    // Load ingredients with their inventory cost, and also get the linked inventory item for this recipe
    const { data: recipeData } = await supabase
        .from('recipes')
        .select(`
            inventory_item_id,
            recipe_ingredients(quantity, inventory_items(cost_per_unit))
        `)
        .eq('id', recipeId)
        .single();
    
    const ingredients = recipeData?.recipe_ingredients;
    const linkedInventoryId = recipeData?.inventory_item_id;

    if (!ingredients || (Array.isArray(ingredients) && ingredients.length === 0)) {
        // If recipe has no ingredients, but is linked to inventory, maybe cost should be 0 or stay same?
        // Usually, we set to 0 if recipe is intended but empty.
        if (linkedInventoryId) {
            await supabase.from('inventory_items').update({ cost_per_unit: 0 }).eq('id', linkedInventoryId);
        }
        return 0;
    }

    let totalCost = 0;
    const ingList = Array.isArray(ingredients) ? ingredients : [ingredients];
    for (const ing of ingList) {
        const invItem = (ing as unknown as { inventory_items: { cost_per_unit: number } }).inventory_items;
        const costPerUnit = invItem?.cost_per_unit || 0;
        totalCost += (ing as unknown as { quantity: number }).quantity * costPerUnit;
    }

    // Round to 2 decimal places for storage
    totalCost = Math.round(totalCost * 100) / 100;

    // Update recipe with calculated cost
    await supabase.from('recipes')
        .update({ product_cost: totalCost, updated_at: new Date().toISOString() })
        .eq('id', recipeId);

    // CRITICAL: Sync with linked inventory item
    if (linkedInventoryId) {
        await supabase.from('inventory_items')
            .update({ cost_per_unit: totalCost, updated_at: new Date().toISOString() })
            .eq('id', linkedInventoryId);
    }

    return totalCost;
}

/**
 * Recalculate all recipe costs for a restaurant.
 * Called when ingredient costs change.
 */
export async function recalculateAllRecipeCosts(restaurantId: string): Promise<void> {
    const { data: recipes } = await supabase
        .from('recipes')
        .select('id')
        .eq('restaurant_id', restaurantId);

    if (!recipes) return;
    for (const recipe of recipes) {
        await calculateRecipeCost(recipe.id);
    }
}

/**
 * Calculate and store cost/profit for a given order.
 * Called non-blocking after order creation.
 */
export async function calculateOrderCost(orderId: string): Promise<void> {
    try {
        // Load order
        const { data: order } = await supabase
            .from('orders')
            .select('id, restaurant_id, items, total')
            .eq('id', orderId)
            .single();

        if (!order) return;

        await _calculateAndStoreOrderCost(order, supabase);
    } catch (err) {
        console.error('[CostEngine] calculateOrderCost error:', err);
    }
}

/**
 * Server-side variant that accepts a supabaseAdmin client (for use in API routes).
 */
export async function calculateOrderCostServer(orderId: string, supabaseAdmin: SupabaseClient): Promise<void> {
    try {
        const { data: order } = await supabaseAdmin
            .from('orders')
            .select('id, restaurant_id, items, total')
            .eq('id', orderId)
            .single();

        if (!order) return;

        await _calculateAndStoreOrderCost(order, supabaseAdmin);
    } catch (err) {
        console.error('[CostEngine] calculateOrderCostServer error:', err);
    }
}

/**
 * Internal: calculate cost for an order and store it.
 * Supports matching by item.id (website) OR item.title (POS).
 */
async function _calculateAndStoreOrderCost(order: { id: string, restaurant_id: string, total: number, items: unknown[] }, sb: SupabaseClient): Promise<void> {
    const orderItems = (order.items || []) as { id?: string, title?: string, qty?: number }[];
    let orderCost = 0;

    // Fetch menu items with their linked recipes (via recipe_id) for this restaurant
    const { data: cats } = await sb.from('categories').select('id').eq('restaurant_id', order.restaurant_id);
    const catIds = (cats || []).map((c: { id: string }) => c.id);
    
    interface MenuItemWithRecipe {
        id: string;
        title_ar: string | null;
        title_en: string | null;
        recipe_id: string | null;
        recipes: { product_cost: number } | { product_cost: number }[] | null;
    }

    let allMenuItems: MenuItemWithRecipe[] = [];
    if (catIds.length > 0) {
        const { data } = await sb.from('items').select('id, title_ar, title_en, recipe_id, recipes(product_cost)').in('category_id', catIds);
        allMenuItems = data || [];
    }

    // Also fetch recipes directly for title-based matching
    const { data: allRecipes } = await sb.from('recipes').select('id, product_name, product_cost').eq('restaurant_id', order.restaurant_id);

    // Build lookup maps
    // 1. item_id → cost (from items.recipe_id join)
    const itemIdCostMap = new Map<string, number>();
    // 2. title (lowercase) → cost (from item title → recipe)
    const titleCostMap = new Map<string, number>();
    
    if (allMenuItems) {
        allMenuItems.forEach((mi: MenuItemWithRecipe) => {
            // mi.recipes could be an object or an array depending on Supabase version/config
            const recipeData = Array.isArray(mi.recipes) ? mi.recipes[0] : mi.recipes;
            const cost = recipeData?.product_cost || 0;
            if (mi.recipe_id && cost > 0) {
                itemIdCostMap.set(mi.id, cost);
                if (mi.title_ar) titleCostMap.set(mi.title_ar.trim().toLowerCase(), cost);
                if (mi.title_en) titleCostMap.set(mi.title_en.trim().toLowerCase(), cost);
            }
        });
    }

    // 3. recipe product_name → cost (fallback)
    if (allRecipes) {
        (allRecipes as { product_name: string | null, product_cost: number }[]).forEach((r) => {
            if (r.product_name && r.product_cost > 0) {
                const key = r.product_name.trim().toLowerCase();
                if (!titleCostMap.has(key)) {
                    titleCostMap.set(key, r.product_cost);
                }
            }
        });
    }

    for (const item of orderItems) {
        let productCost = 0;
        const itemTitle = (item.title || "").trim().toLowerCase();
        const itemId = item.id;

        // 1. Try matching by ID (website orders usually have this)
        if (itemId && itemIdCostMap.has(itemId)) {
            productCost = itemIdCostMap.get(itemId) || 0;
        }
        // 2. Match by title directly (POS orders use titles)
        else if (itemTitle && titleCostMap.has(itemTitle)) {
            productCost = titleCostMap.get(itemTitle) || 0;
        }

        orderCost += productCost * (item.qty || 1);
    }

    const profit = (order.total || 0) - orderCost;
    const margin = order.total > 0 ? profit / order.total : 0;

    await sb.from('orders').update({
        order_cost: Math.round(orderCost * 100) / 100,
        order_profit: Math.round(profit * 100) / 100,
        profit_margin: Math.round(margin * 10000) / 10000,
    }).eq('id', order.id);
}

/**
 * Get cost analytics summary for a restaurant within a date range.
 */
export async function getCostAnalytics(
    restaurantId: string,
    dateFrom?: string,
    dateTo?: string
): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
    orderCount: number;
}> {
    let query = supabase
        .from('orders')
        .select('total, order_cost, order_profit, profit_margin')
        .eq('restaurant_id', restaurantId)
        .eq('is_draft', false)
        .not('order_cost', 'is', null);

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data: orders } = await query;

    if (!orders || orders.length === 0) {
        return { totalRevenue: 0, totalCost: 0, totalProfit: 0, avgMargin: 0, orderCount: 0 };
    }

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalCost = orders.reduce((s, o) => s + (o.order_cost || 0), 0);
    const totalProfit = orders.reduce((s, o) => s + (o.order_profit || 0), 0);
    const avgMargin = orders.length > 0
        ? orders.reduce((s, o) => s + (o.profit_margin || 0), 0) / orders.length
        : 0;

    return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgMargin: Math.round(avgMargin * 10000) / 10000,
        orderCount: orders.length
    };
}
