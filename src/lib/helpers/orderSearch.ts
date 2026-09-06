/**
 * Helper utilities for logical, multi-faceted order search.
 * Supports:
 * - Exact / logical Order Number (e.g. "1", "#1", "١", "طلب 15")
 * - Phone numbers (e.g. "01012345678", "010", "+20...")
 * - Customer names with Arabic letter normalization (e.g. "أحمد" <-> "احمد", "فاطمة" <-> "فاطمه")
 * - Short UUID / order ID
 */

export function normalizeSearchDigits(input: string): string {
    return (input || '')
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .trim();
}

export function getArabicVariations(text: string): string[] {
    const s = text.trim();
    if (!s) return [];

    // Replace alef variations (أ, إ, آ) with plain alef (ا)
    const plainAlef = s.replace(/[أإآ]/g, 'ا');
    // Version with hamza on initial alef if it starts with alef
    const hamzaAlef = s.replace(/^ا/, 'أ');
    // Replace ta marbuta (ة) with ha (ه) and vice versa
    const haTa1 = s.replace(/ة/g, 'ه');
    const haTa2 = s.replace(/ه/g, 'ة');
    // Replace alef maksura (ى) with ya (ي) and vice versa
    const ya1 = s.replace(/ى/g, 'ي');
    const ya2 = s.replace(/ي/g, 'ى');

    const set = new Set([s, plainAlef, hamzaAlef, haTa1, haTa2, ya1, ya2]);
    return Array.from(set).filter(Boolean);
}

export interface ParsedOrderSearch {
    raw: string;
    normalized: string;
    cleanNumberStr: string;
    cleanPhoneDigits: string;
    isExplicitOrderPrefix: boolean;
    isDigits: boolean;
    isPhoneLike: boolean;
    orderNum: number | null;
}

export function parseOrderSearchQuery(query: string): ParsedOrderSearch | null {
    const raw = (query || '').trim();
    if (!raw) return null;

    const normalized = normalizeSearchDigits(raw);
    const isExplicitOrderPrefix = /^(#|طلب\s*#?|order\s*#?)/i.test(normalized);
    const cleanNumberStr = normalized.replace(/^(#|طلب\s*#?|order\s*#?)/i, '').trim();
    const isDigits = /^\d+$/.test(cleanNumberStr);

    const cleanPhoneDigits = normalized.replace(/[\s\-\(\)\+]/g, '');
    const isPhoneLike =
        cleanNumberStr.startsWith('0') ||
        cleanNumberStr.startsWith('+') ||
        cleanNumberStr.length >= 7 ||
        (cleanPhoneDigits.length >= 7 && /^\d+$/.test(cleanPhoneDigits));

    let orderNum: number | null = null;
    if (isDigits) {
        const parsed = parseInt(cleanNumberStr, 10);
        if (!isNaN(parsed) && parsed <= 2147483647) {
            orderNum = parsed;
        }
    }

    return {
        raw,
        normalized,
        cleanNumberStr,
        cleanPhoneDigits,
        isExplicitOrderPrefix,
        isDigits,
        isPhoneLike,
        orderNum,
    };
}

/**
 * Apply logical search filters to a Supabase PostgREST query builder.
 */
export function applyOrderSearchToSupabase(query: any, rawSearch: string) {
    const parsed = parseOrderSearchQuery(rawSearch);
    if (!parsed) return query;

    const { cleanNumberStr, cleanPhoneDigits, isExplicitOrderPrefix, isDigits, isPhoneLike, orderNum } = parsed;

    // 1. Explicit order prefix: e.g. '#12', 'طلب 12'
    if (isExplicitOrderPrefix && orderNum !== null) {
        return query.eq('order_number', orderNum);
    }

    // 2. Pure digits without explicit prefix
    if (isDigits) {
        if (isPhoneLike) {
            // Customer phone search (starts with 0, +, or 7+ digits)
            const phoneTerm = cleanPhoneDigits || cleanNumberStr;
            if (orderNum !== null && !cleanNumberStr.startsWith('0')) {
                return query.or(`customer_phone.ilike.%${phoneTerm}%,order_number.eq.${orderNum}`);
            }
            return query.ilike('customer_phone', `%${phoneTerm}%`);
        }

        // Short numbers (1 to 3 digits like 1, 15, 150) -> Treat strictly as order number!
        // Never match short digits against customer_phone because Egyptian phones (01...) all contain 1.
        if (cleanNumberStr.length < 4 && orderNum !== null) {
            return query.eq('order_number', orderNum);
        }

        // 4 to 6 digits (e.g. 1405): check order_number or phone ending
        if (orderNum !== null) {
            return query.or(`order_number.eq.${orderNum},customer_phone.ilike.%${cleanNumberStr}%`);
        }
    }

    // 3. Name, text, or mixed search
    const variations = getArabicVariations(parsed.normalized);
    const clauses: string[] = [];
    variations.forEach(v => {
        clauses.push(`customer_name.ilike.%${v}%`);
    });

    if (cleanPhoneDigits) {
        clauses.push(`customer_phone.ilike.%${cleanPhoneDigits}%`);
    }

    return query.or(clauses.join(','));
}

/**
 * In-memory search matching function for an order object.
 */
export function matchesOrderSearch(
    order: {
        id?: string;
        order_number?: number;
        customer_name?: string;
        customer_phone?: string;
    },
    rawSearch: string
): boolean {
    const parsed = parseOrderSearchQuery(rawSearch);
    if (!parsed) return true;

    const { cleanNumberStr, cleanPhoneDigits, isExplicitOrderPrefix, isDigits, isPhoneLike, orderNum } = parsed;

    // 1. Explicit order prefix
    if (isExplicitOrderPrefix && orderNum !== null) {
        return order.order_number === orderNum;
    }

    // 2. Pure digits
    if (isDigits) {
        if (isPhoneLike) {
            const phone = (order.customer_phone || '').replace(/[\s\-\(\)\+]/g, '');
            const targetPhone = cleanPhoneDigits || cleanNumberStr;
            if (phone.includes(targetPhone)) return true;
            if (orderNum !== null && order.order_number === orderNum) return true;
            return false;
        }

        // Short digits (< 4) -> strict order number
        if (orderNum !== null && cleanNumberStr.length < 4) {
            return order.order_number === orderNum;
        }

        // 4 to 6 digits -> order number or phone substring
        if (orderNum !== null && order.order_number === orderNum) return true;
        const phone = (order.customer_phone || '').replace(/[\s\-\(\)\+]/g, '');
        if (phone.includes(cleanNumberStr)) return true;
        return false;
    }

    // 3. Name or text search
    const name = (order.customer_name || '').toLowerCase();
    const variations = getArabicVariations(parsed.normalized.toLowerCase());
    if (variations.some(v => name.includes(v))) return true;

    const phone = (order.customer_phone || '').toLowerCase();
    if (cleanPhoneDigits && phone.includes(cleanPhoneDigits)) return true;

    if (order.id && order.id.toLowerCase().startsWith(parsed.normalized.toLowerCase())) return true;

    return false;
}

/**
 * Sorts orders so that any exact order_number match appears FIRST (at the top),
 * followed by descending created_at.
 */
export function sortOrdersForSearch<T extends { order_number?: number; created_at?: string }>(
    orders: T[],
    rawSearch: string
): T[] {
    const parsed = parseOrderSearchQuery(rawSearch);
    if (!parsed || parsed.orderNum === null) return orders;

    const targetNum = parsed.orderNum;
    return [...orders].sort((a, b) => {
        const aMatch = a.order_number === targetNum;
        const bMatch = b.order_number === targetNum;
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
    });
}
