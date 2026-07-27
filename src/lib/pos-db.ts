import Dexie, { type Table } from 'dexie';

/* ── Types ── */
export type PosCategory = {
    id: string;
    restaurant_id: string;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_data?: string;   // base64 for offline; synced to Supabase as URL
    image_url?: string;    // Supabase storage URL
    sort_order: number;
    _dirty?: boolean;       // needs sync to Supabase
    deleted_at?: string;    // soft delete
};

export type PosMenuItem = {
    id: string;
    restaurant_id: string;
    category_id: string;
    title_ar: string;
    title_en?: string;
    desc_ar?: string;
    desc_en?: string;
    prices: number[];
    size_labels?: string[];
    image_data?: string;
    is_available: boolean;
    sell_by_weight?: boolean;
    weight_unit?: string;
    is_popular?: boolean;
    is_spicy?: boolean;
    inventory_item_id?: string;
    recipe_id?: string;
    _dirty?: boolean;
    deleted_at?: string;
};

export type PosOrderItem = {
    id?: string;
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
    note?: string;
    weight_unit?: string;
};

export type PosOrder = {
    id: string;
    restaurant_id: string;
    order_number: number;
    items: PosOrderItem[];
    subtotal: number;
    discount: number;
    discount_type?: 'fixed' | 'percent';
    total: number;
    payment_method: string;
    customer_name?: string;
    customer_phone?: string;
    customer_address?: string;
    table_id?: string;
    delivery_driver_id?: string;
    delivery_driver_name?: string;
    delivery_fee?: number;
    cashier_id?: string;
    cashier_name?: string;
    notes?: string;
    deposit_amount?: number;
    order_type?: string;
    status: string;
    is_draft?: boolean;
    created_at: string;
    updated_at?: string;
    _dirty?: boolean;
    deleted_at?: string;
};

export type PosCustomer = {
    id: string;
    restaurant_id: string;
    name: string;
    phone: string;
    address?: string;
    notes?: string;
    created_at: string;
    _dirty?: boolean;
    deleted_at?: string;
};

export type PosStaffUser = {
    id: string;
    restaurant_id: string;
    name: string;
    username: string;
    password: string;        // stored locally only; NOT synced
    role: 'admin' | 'staff' | 'delivery';
    is_active: boolean;
    _dirty?: boolean;
};

export type PosSettings = {
    id: string;
    restaurant_id: string;
    restaurant_name: string;
    restaurant_logo?: string | null;
    restaurant_phone?: string;
    currency: string;
    language: string;
    // The restaurant's menu theme name ("theme18", "vicino", ...), not a
    // colour mode — both writers store a theme id here.
    theme?: string;
    permissions_json?: string; // Cached JSON permissions
};

export type PosInventoryItem = {
    id: string;
    restaurant_id: string;
    name: string;
    quantity: number;
    unit: string;
    min_quantity?: number;
    item_type: 'ingredient' | 'product';
    _dirty?: boolean;
    updated_at: string;
};

export type PosDeliveryZone = {
    id: string;
    restaurant_id: string;
    name_ar: string;
    name_en?: string;
    fee: number;
    estimated_time?: string;
    is_active: boolean;
};

export type PosBranch = {
    id: string;
    restaurant_id: string;
    branch_name: string;
    is_active: boolean;
};

/**
 * A range of order numbers the server has granted to THIS device.
 * `next` is the one to issue; `end` is the last one owned, inclusive.
 */
export type PosNumberRange = { next: number; end: number };
export type PosNumberBlock = {
    restaurant_id: string;
    /** Ranges owned by this device, issued from front to back. */
    ranges: PosNumberRange[];
};

/* ── Database ── */
class PosOfflineDB extends Dexie {
    categories!: Table<PosCategory>;
    menu_items!: Table<PosMenuItem>;
    orders!: Table<PosOrder>;
    customers!: Table<PosCustomer>;
    pos_users!: Table<PosStaffUser>;
    settings!: Table<PosSettings>;
    inventory_items!: Table<PosInventoryItem>;
    delivery_zones!: Table<PosDeliveryZone>;
    branches!: Table<PosBranch>;
    number_blocks!: Table<PosNumberBlock>;

    constructor() {
        super('asn_pos_offline_db');

        this.version(5).stores({
            categories: 'id, restaurant_id, sort_order, _dirty, deleted_at',
            menu_items: 'id, restaurant_id, category_id, is_available, _dirty, deleted_at',
            orders: 'id, restaurant_id, order_number, status, customer_name, delivery_driver_id, created_at, is_draft, _dirty, deleted_at',
            customers: 'id, restaurant_id, name, phone, created_at, _dirty, deleted_at',
            pos_users: 'id, restaurant_id, username, role, is_active, _dirty, deleted_at',
            settings: 'id, restaurant_id',
            inventory_items: 'id, restaurant_id, name, item_type, _dirty',
            delivery_zones: 'id, restaurant_id, name_ar, is_active',
            branches: 'id, restaurant_id, is_active',
        });

        // v6 adds number_blocks: the ranges of order numbers the server has
        // granted to THIS device, which it may issue from with no connection.
        // Only the new store is listed — Dexie carries the rest forward, and
        // existing offline orders on a till are untouched by the upgrade.
        this.version(6).stores({
            number_blocks: 'restaurant_id',
        });
    }
}

export const posDb = new PosOfflineDB();

/** How many numbers a till takes at a time, and when it tops up. */
const BLOCK_SIZE = 100;
const TOP_UP_WHEN_BELOW = 25;

/**
 * Ask the server for a fresh range. Returns null when offline or when the
 * function does not exist yet — not fatal on its own, since the caller only
 * needs one once the ranges it already holds are spent.
 */
async function reserveRange(restaurantId: string): Promise<PosNumberRange | null> {
    try {
        const { supabase } = await import('@/lib/supabase/client');
        const { data, error } = await supabase.rpc('reserve_order_numbers', {
            p_restaurant_id: restaurantId,
            p_count: BLOCK_SIZE,
        });
        if (error || typeof data !== 'number') return null;
        return { next: data, end: data + BLOCK_SIZE - 1 };
    } catch {
        return null;
    }
}

async function loadBlock(restaurantId: string): Promise<PosNumberBlock> {
    const rec = await posDb.number_blocks.get(restaurantId);
    return rec ?? { restaurant_id: restaurantId, ranges: [] };
}

const remainingIn = (b: PosNumberBlock) =>
    b.ranges.reduce((n, r) => n + (r.end - r.next + 1), 0);

/**
 * Next order number for this till.
 *
 * This used to be `max(order_number in THIS DEVICE'S IndexedDB) + 1`, which is
 * only correct on a single-device restaurant: two tablets each counted their
 * own orders and both reached the same next number, and neither could tell.
 *
 * Now the server hands each device a private block and the till issues from
 * it, so no two devices are ever offered the same number, offline or not.
 * Because the server counter only moves forward, a deleted order's number is
 * retired rather than handed out again.
 *
 * Returns null when the block is spent and the server cannot be reached — the
 * caller must surface that rather than invent a number, since inventing one is
 * exactly how duplicates got created before.
 */
export async function getPosNextOrderNumber(restaurantId: string): Promise<number | null> {
    const block = await loadBlock(restaurantId);
    block.ranges = block.ranges.filter((r) => r.next <= r.end);

    if (block.ranges.length === 0) {
        const fresh = await reserveRange(restaurantId);
        if (!fresh) return null;
        block.ranges.push(fresh);
    }

    const issued = block.ranges[0].next;
    block.ranges[0].next = issued + 1;
    if (block.ranges[0].next > block.ranges[0].end) block.ranges.shift();
    await posDb.number_blocks.put(block);

    // Top up early, while a connection is still available, so the till does not
    // discover it is out of numbers in the middle of service. Ranges queue up,
    // so a top-up never discards numbers the device already owns.
    if (remainingIn(block) < TOP_UP_WHEN_BELOW) {
        void reserveRange(restaurantId).then(async (fresh) => {
            if (!fresh) return;
            const current = await loadBlock(restaurantId);
            current.ranges.push(fresh);
            await posDb.number_blocks.put(current);
        });
    }

    return issued;
}

/** Convert File to base64 data URL */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Generate a simple UUID v4 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/** Helper for offline stock deduction */
export async function decrementPosStock(restaurantId: string, itemId: string, qty: number): Promise<void> {
    const item = await posDb.inventory_items.get(itemId);
    if (item) {
        await posDb.inventory_items.update(itemId, {
            quantity: Math.max(0, item.quantity - qty),
            _dirty: true,
            updated_at: new Date().toISOString()
        });
    }
}
