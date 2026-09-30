import { supabase } from '@/lib/supabase/client';

// ═══════════════════════════════════════════
// Promotion Engine — Auto-detect & apply offers
// ═══════════════════════════════════════════

export type RequiredItem = {
    item_id: string;
    item_title_ar: string;
    item_title_en?: string;
    qty?: number;
    buy_qty?: number;
    get_qty?: number;
};

/**
 * Marks a promotion as applying to the whole cart rather than to a list of
 * items. Stored as a normal entry inside `required_items`, so no schema change
 * is needed and older clients simply never match it — they fall back to "does
 * not apply", never to an unintended blanket discount.
 */
export const ALL_ITEMS_ID = '__all_items__';

/**
 * Marker for Buy X Get Y Free promotions.
 * Stored inside `required_items` so that even without a database schema/constraint
 * update, the engine and dashboard can flawlessly persist and parse BOGO rules.
 */
export const BOGO_MARKER = '__bogo__';

export const isAllItemsPromotion = (promotion: Pick<Promotion, 'required_items'>): boolean =>
    (promotion.required_items || []).some(ri => ri.item_id === ALL_ITEMS_ID);

/** An offer locked behind a coupon code. */
export const requiresPromoCode = (promotion: Pick<Promotion, 'promo_code'>): boolean =>
    typeof promotion.promo_code === 'string' && promotion.promo_code.trim().length > 0;

/**
 * Whether to show the coupon field at checkout at all. Hidden unless this
 * restaurant actually has an active coded offer, so customers are never
 * prompted for a code that cannot exist.
 */
export const hasPromoCodeOffers = (promotions: Promotion[]): boolean =>
    promotions.some(requiresPromoCode);

/** Codes are matched case-insensitively and ignoring surrounding spaces. */
const codeMatches = (promotion: Promotion, enteredCode?: string | null): boolean =>
    !!enteredCode &&
    !!promotion.promo_code &&
    promotion.promo_code.trim().toLowerCase() === enteredCode.trim().toLowerCase();

export type PromotionDiscountType = 'fixed_amount' | 'percentage' | 'free_shipping' | 'buy_x_get_y';

export type Promotion = {
    id: string;
    restaurant_id: string;
    name_ar: string;
    name_en?: string;
    description_ar?: string;
    description_en?: string;
    discount_type: PromotionDiscountType;
    discount_value: number;
    /** Coupon code required to unlock this offer. Null/empty = applies automatically. */
    promo_code?: string | null;
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
    isBogo?: boolean;
    bogoFreeItemsCount?: number;
};

export type BogoConfig = {
    buy_qty: number;
    get_qty: number;
};

/** Checks whether a promotion is a Buy X Get Y Free offer */
export const isBogoPromotion = (promotion: Pick<Promotion, 'discount_type' | 'required_items'>): boolean =>
    promotion.discount_type === 'buy_x_get_y' ||
    (promotion.required_items || []).some(ri => ri.item_id === BOGO_MARKER);

/** Retrieves the buy_qty and get_qty configuration for BOGO */
export const getBogoConfig = (promotion: Pick<Promotion, 'discount_type' | 'discount_value' | 'required_items'>): BogoConfig => {
    const marker = (promotion.required_items || []).find(ri => ri.item_id === BOGO_MARKER);
    if (marker && marker.buy_qty !== undefined && marker.buy_qty > 0) {
        return {
            buy_qty: Math.max(1, Number(marker.buy_qty) || 1),
            get_qty: Math.max(1, Number(marker.get_qty) || 1),
        };
    }
    const val = Number(promotion.discount_value) || 0;
    if (val > 0) {
        return { buy_qty: Math.max(1, Math.floor(val)), get_qty: 1 };
    }
    return { buy_qty: 1, get_qty: 1 };
};

/** Real target items, filtering out internal marker rows like __all_items__ and __bogo__ */
export const getTargetItems = (promotion: Pick<Promotion, 'required_items'>): RequiredItem[] =>
    (promotion.required_items || []).filter(ri => ri.item_id !== ALL_ITEMS_ID && ri.item_id !== BOGO_MARKER);

/**
 * Fetch all currently active promotions for a restaurant.
 * Fetches all active promos, then filters date range in JavaScript
 * to avoid complex Supabase .or() chaining issues.
 */
export async function fetchActivePromotions(restaurantId: string): Promise<Promotion[]> {
    const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[PROMO] Error fetching promotions:', error);
        return [];
    }

    if (!data || data.length === 0) {
        return [];
    }

    const now = new Date();
    const filtered = (data as Promotion[]).filter(p => {
        if (p.starts_at) {
            const startDate = new Date(p.starts_at);
            startDate.setHours(0, 0, 0, 0);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (startDate > todayStart) {
                return false;
            }
        }
        if (p.ends_at) {
            const endDate = new Date(p.ends_at);
            endDate.setHours(23, 59, 59, 999);
            if (endDate < now) {
                return false;
            }
        }
        return true;
    });

    return filtered;
}

/**
 * Check if a promotion applies to the current cart.
 */
function isPromotionApplicable(
    promotion: Promotion,
    cartItems: CartItemForPromo[],
    subtotal: number,
    enteredCode?: string | null
): boolean {
    if (requiresPromoCode(promotion) && !codeMatches(promotion, enteredCode)) {
        return false;
    }

    if (promotion.min_order_amount > 0 && subtotal < promotion.min_order_amount) {
        return false;
    }

    const allItems = isAllItemsPromotion(promotion);
    const targetItems = getTargetItems(promotion);

    // No target at all — incomplete offer, never fires
    if (!allItems && targetItems.length === 0) {
        return false;
    }

    if (isBogoPromotion(promotion)) {
        const { buy_qty, get_qty } = getBogoConfig(promotion);
        const setSize = buy_qty + get_qty;
        
        // Count total eligible items in the cart
        const eligibleUnits = cartItems.reduce((acc, ci) => {
            if (ci.qty <= 0) return acc;
            const eligible = allItems || targetItems.some(req => req.item_id === ci.id);
            return eligible ? acc + ci.qty : acc;
        }, 0);

        // BOGO produces a discount only when at least one full set (buy_qty + get_qty) exists in cart
        return eligibleUnits >= setSize;
    }

    if (allItems) {
        return cartItems.some(ci => ci.qty > 0);
    }

    // Check if ANY of the required items exist in the cart
    return targetItems.some(req => 
        cartItems.some(ci => ci.id === req.item_id && ci.qty > 0)
    );
}

/**
 * Calculate the discount amount for a matched promotion.
 */
function calculatePromotionDiscount(
    promotion: Promotion,
    cartItems: CartItemForPromo[],
    subtotal: number,
    deliveryFee: number
): { discountAmount: number; freeShipping: boolean; isBogo?: boolean; bogoFreeItemsCount?: number } {
    if (isBogoPromotion(promotion)) {
        const { buy_qty, get_qty } = getBogoConfig(promotion);
        const setSize = buy_qty + get_qty;
        const allItems = isAllItemsPromotion(promotion);
        const targetItems = getTargetItems(promotion);

        // Collect unit prices of all eligible items in cart
        const eligiblePrices: number[] = [];
        for (const ci of cartItems) {
            if (ci.qty <= 0) continue;
            const eligible = allItems || targetItems.some(req => req.item_id === ci.id);
            if (eligible) {
                for (let i = 0; i < ci.qty; i++) {
                    eligiblePrices.push(ci.price);
                }
            }
        }

        if (eligiblePrices.length < setSize) {
            return { discountAmount: 0, freeShipping: false, isBogo: true, bogoFreeItemsCount: 0 };
        }

        const sets = Math.floor(eligiblePrices.length / setSize);
        const freeCount = sets * get_qty;

        // Customer gets the lowest-priced eligible item(s) free (standard retail fairness)
        eligiblePrices.sort((a, b) => a - b);
        const discountAmount = eligiblePrices
            .slice(0, freeCount)
            .reduce((sum, p) => sum + p, 0);

        return {
            discountAmount: Math.min(Math.round(discountAmount * 100) / 100, subtotal),
            freeShipping: false,
            isBogo: true,
            bogoFreeItemsCount: freeCount,
        };
    }

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
    deliveryFee: number = 0,
    enteredCode?: string | null
): AppliedPromotion | null {
    let bestPromo: AppliedPromotion | null = null;

    for (const promo of promotions) {
        if (!isPromotionApplicable(promo, cartItems, subtotal, enteredCode)) continue;

        const { discountAmount, freeShipping, isBogo, bogoFreeItemsCount } = calculatePromotionDiscount(
            promo,
            cartItems,
            subtotal,
            deliveryFee
        );

        const effectiveDiscount = freeShipping ? deliveryFee : discountAmount;
        const currentBestEffective = bestPromo ? (bestPromo.freeShipping ? deliveryFee : bestPromo.discountAmount) : -1;

        if (!bestPromo || effectiveDiscount > currentBestEffective) {
            bestPromo = {
                promotion: promo,
                discountAmount,
                freeShipping,
                isBogo,
                bogoFreeItemsCount,
            };
        }
    }

    return bestPromo;
}

export type BogoSuggestion = {
    promotion: Promotion;
    eligibleCount: number;
    buyQty: number;
    getQty: number;
    neededQty: number;
    messageAr: string;
    messageEn: string;
};

/**
 * Suggests BOGO offer progress to customers in the cart/checkout when they
 * already have items in their cart and can unlock a free item by adding more.
 */
export function getBogoSuggestion(
    cartItems: CartItemForPromo[],
    promotions: Promotion[],
    enteredCode?: string | null
): BogoSuggestion | null {
    for (const promo of promotions) {
        if (!promo.is_active) continue;
        if (!isBogoPromotion(promo)) continue;
        if (requiresPromoCode(promo) && !codeMatches(promo, enteredCode)) continue;

        const { buy_qty, get_qty } = getBogoConfig(promo);
        const setSize = buy_qty + get_qty;
        const allItems = isAllItemsPromotion(promo);
        const targetItems = getTargetItems(promo);

        if (!allItems && targetItems.length === 0) continue;

        const eligibleUnits = cartItems.reduce((acc, ci) => {
            if (ci.qty <= 0) return acc;
            const eligible = allItems || targetItems.some(req => req.item_id === ci.id);
            return eligible ? acc + ci.qty : acc;
        }, 0);

        if (eligibleUnits > 0) {
            const remainder = eligibleUnits % setSize;
            if (remainder >= buy_qty) {
                const needed = setSize - remainder;
                const promoName = promo.name_ar;
                return {
                    promotion: promo,
                    eligibleCount: eligibleUnits,
                    buyQty: buy_qty,
                    getQty: get_qty,
                    neededQty: needed,
                    messageAr: `🎁 عرض "${promoName}": أضف ${needed === 1 ? 'صنفاً إضافياً' : `${needed} أصناف إضافية`} للحصول على الصنف المجاني!`,
                    messageEn: `🎁 Offer "${promo.name_en || promoName}": Add ${needed} more item${needed > 1 ? 's' : ''} to get it free!`,
                };
            }
        }
    }
    return null;
}
