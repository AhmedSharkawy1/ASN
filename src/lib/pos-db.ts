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
    image_data?: string;   // base64
    is_available: boolean;
    sell_by_weight?: boolean;
    weight_unit?: string;
    is_popular?: boolean;
    is_spicy?: boolean;
    _dirty?: boolean;
};

export type PosOrderItem = {
    title: string;
    qty: number;
    price: number;
    size?: string;
    category?: string;
    note?: string;
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
    status: string;
    is_draft?: boolean;
    created_at: string;
    updated_at?: string;
    _dirty?: boolean;
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
    restaurant_phone?: string;
    currency: string;
    language: string;
    theme?: 'dark' | 'light';
};

/* ── Database ── */
class PosOfflineDB extends Dexie {
    categories!: Table<PosCategory>;
    menu_items!: Table<PosMenuItem>;
    orders!: Table<PosOrder>;
    customers!: Table<PosCustomer>;
    pos_users!: Table<PosStaffUser>;
    settings!: Table<PosSettings>;

    constructor() {
        super('asn_pos_offline_db');

        this.version(1).stores({
            categories: 'id, restaurant_id, sort_order, _dirty',
            menu_items: 'id, restaurant_id, category_id, is_available, _dirty',
            orders: 'id, restaurant_id, order_number, status, customer_name, delivery_driver_id, created_at, is_draft, _dirty',
            customers: 'id, restaurant_id, name, phone, created_at, _dirty',
            pos_users: 'id, restaurant_id, username, role, is_active, _dirty',
            settings: 'id, restaurant_id',
        });
    }
}

export const posDb = new PosOfflineDB();

/* ── Helper: get next order number for a restaurant ── */
export async function getPosNextOrderNumber(restaurantId: string): Promise<number> {
    const last = await posDb.orders
        .where('restaurant_id').equals(restaurantId)
        .sortBy('order_number');
    const lastOrder = last[last.length - 1];
    return (lastOrder?.order_number || 0) + 1;
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
