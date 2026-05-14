import { supabase } from '@/lib/supabase/client';

// ═══════════════════════════════════════════
// Promotion Engine — Auto-detect & apply offers
// ═══════════════════════════════════════════

export type RequiredItem = {
    item_id: string;
    item_title_ar: string;
    item_title_en?: string;
    qty: number;
};

export type Promotion = {
    id: string;
    restaurant_id: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    discount_type: 'fixed_amount' | 'percentage' | 'free_shipping';
    discount_value: number;
    required_items: RequiredItem[];
    bundle_price?: number;
    min_order_amount: number;
    is_active: boolean;
    starts_at?: string;
    ends_at?: string;
    created_at: string;
};

export type CartItemForPromo = {
    id: string;
    title: string;
    qty: number;
    price: number;
};

export type AppliedPromotion = {
    promotion: Promotion;
    discountAmount: number;
    freeShipping: boolean;
};

/**
 * Fetch all currently active promotions for a restaurant.
 * Filters by is_active, and date range (starts_at / ends_at).
 */
export async function fetchActivePromotions(restaurantId: string): Promise<Promotion[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching promotions:', error);
        return [];
    }

    return (data as Promotion[]) || [];
}

/**
 * Check if a promotion applies to the current cart.
 * Logic: at least ONE of the required items must be in the cart (any qty),
 * AND the subtotal must meet min_order_amount.
 * If no required items specified, only min_order_amount is checked.
 */
function isPromotionApplicable(
    promotion: Promotion,
    cartItems: CartItemForPromo[],
    subtotal: number
): boolean {
    // Check minimum order amount
    if (promotion.min_order_amount > 0 && subtotal < promotion.min_order_amount) {
        return false;
    }

    // Check required items — at least ONE must be in the cart
    const requiredItems = promotion.required_items || [];
    if (requiredItems.length === 0) {
        // No specific items required — applies if min_order_amount is met (or no min)
        return true;
    }

    // Check if ANY of the required items exist in the cart
    const hasAtLeastOne = requiredItems.some(req => 
        cartItems.some(ci => ci.id === req.item_id && ci.qty > 0)
    );

    return hasAtLeastOne;
}

/**
 * Calculate the discount amount for a matched promotion.
 */
function calculatePromotionDiscount(
    promotion: Promotion,
    cartItems: CartItemForPromo[],
    subtotal: number,
    deliveryFee: number
): { discountAmount: number; freeShipping: boolean } {
    switch (promotion.discount_type) {
        case 'fixed_amount':
            return {
                discountAmount: Math.min(promotion.discount_value, subtotal),
                freeShipping: false,
            };

        case 'percentage': {
            const pctDiscount = (subtotal * promotion.discount_value) / 100;
            return {
                discountAmount: Math.round(pctDiscount * 100) / 100,
                freeShipping: false,
            };
        }

        case 'free_shipping':
            return {
                discountAmount: deliveryFee,
                freeShipping: true,
            };

        default:
            return { discountAmount: 0, freeShipping: false };
    }
}

/**
 * Evaluate all active promotions against the current cart.
 * Returns the BEST applicable promotion (highest discount).
 */
export function evaluatePromotions(
    cartItems: CartItemForPromo[],
    promotions: Promotion[],
    subtotal: number,
    deliveryFee: number = 0
): AppliedPromotion | null {
    let bestPromo: AppliedPromotion | null = null;

    for (const promo of promotions) {
        if (!isPromotionApplicable(promo, cartItems, subtotal)) continue;

        const { discountAmount, freeShipping } = calculatePromotionDiscount(
            promo,
            cartItems,
            subtotal,
            deliveryFee
        );

        const effectiveDiscount = freeShipping ? deliveryFee : discountAmount;

        if (!bestPromo || effectiveDiscount > (bestPromo.freeShipping ? deliveryFee : bestPromo.discountAmount)) {
            bestPromo = {
                promotion: promo,
                discountAmount,
                freeShipping,
            };
        }
    }

    return bestPromo;
}
