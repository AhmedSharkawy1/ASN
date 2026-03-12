import Dexie, { type Table } from 'dexie';

/* ── Types ── */
export type Category = {
    id?: number;
    name_ar: string;
    name_en?: string;
    emoji?: string;
    image_data?: string;      // base64 image
    sort_order: number;
};

export type MenuItem = {
    id?: number;
    category_id: number;
    title_ar: string;
    title_en?: string;
    prices: number[];
    size_labels?: string[];
    image_data?: string;      // base64 image
    is_available: boolean;
    sell_by_weight?: boolean;
    weight_unit?: string;
    is_popular?: boolean;
};

export type OrderItem = { title: string; qty: number; price: number; size?: string; category?: string };

export type Order = {
    id?: number;
    order_number: number;
    items: OrderItem[];
    subtotal: number;
    discount: number;
    total: number;
    payment_method: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_driver_id?: number;
    delivery_driver_name?: string;
    delivery_fee?: number;
    cashier_id?: number;
    cashier_name?: string;
    notes?: string;
    status: string;
    created_at: string;
    updated_at?: string;
};

export type Customer = {
    id?: number;
    name: string;
    phone: string;
    address?: string;
    notes?: string;
    created_at: string;
};

export type PosUser = {
    id?: number;
    name: string;
    username: string;
    password: string;
    role: 'admin' | 'staff' | 'delivery';
    is_active: boolean;
};

export type AppSettings = {
    id?: number;
    restaurant_name: string;
    restaurant_phone?: string;
    restaurant_address?: string;
    currency: string;
    language: string;
    theme?: 'dark' | 'light';
};

/* ── Database ── */
class PosDB extends Dexie {
    categories!: Table<Category>;
    menu_items!: Table<MenuItem>;
    orders!: Table<Order>;
    pos_users!: Table<PosUser>;
    settings!: Table<AppSettings>;
    customers!: Table<Customer>;

    constructor() {
        super('pos_desktop_db');

        this.version(1).stores({
            categories: '++id, name_ar, sort_order',
            menu_items: '++id, category_id, title_ar, is_available',
            orders: '++id, order_number, status, customer_name, created_at',
            pos_users: '++id, username, role, is_active',
            settings: '++id',
        });

        // v2: add customers table, delivery_driver_id index
        this.version(2).stores({
            categories: '++id, name_ar, sort_order',
            menu_items: '++id, category_id, title_ar, is_available',
            orders: '++id, order_number, status, customer_name, delivery_driver_id, created_at',
            pos_users: '++id, username, role, is_active',
            settings: '++id',
            customers: '++id, name, phone, created_at',
        });
    }
}

export const db = new PosDB();

/* ── Seed default data on first run ── */
export async function seedIfEmpty() {
    const userCount = await db.pos_users.count();
    if (userCount > 0) return;

    await db.pos_users.add({ name: 'المدير', username: 'admin', password: 'admin', role: 'admin', is_active: true });
    await db.pos_users.add({ name: 'كاشير', username: 'cashier', password: '1234', role: 'staff', is_active: true });
    await db.pos_users.add({ name: 'سائق 1', username: 'driver1', password: '1234', role: 'delivery', is_active: true });

    await db.settings.add({ restaurant_name: 'مطعمي', currency: 'ج.م', language: 'ar' });

    const cat1 = await db.categories.add({ name_ar: 'ساندوتشات', emoji: '🥪', sort_order: 1 });
    const cat2 = await db.categories.add({ name_ar: 'بيتزا', emoji: '🍕', sort_order: 2 });
    const cat3 = await db.categories.add({ name_ar: 'مشروبات', emoji: '🥤', sort_order: 3 });
    const cat4 = await db.categories.add({ name_ar: 'حلويات', emoji: '🍰', sort_order: 4 });

    const items: Omit<MenuItem, 'id'>[] = [
        { category_id: cat1 as number, title_ar: 'شاورما لحمة', prices: [35, 55, 75], size_labels: ['صغير', 'وسط', 'كبير'], is_available: true, is_popular: true },
        { category_id: cat1 as number, title_ar: 'شاورما فراخ', prices: [30, 50, 70], size_labels: ['صغير', 'وسط', 'كبير'], is_available: true, is_popular: true },
        { category_id: cat1 as number, title_ar: 'برجر كلاسيك', prices: [45], is_available: true },
        { category_id: cat1 as number, title_ar: 'برجر تشيز', prices: [55], is_available: true },
        { category_id: cat1 as number, title_ar: 'هوت دوج', prices: [25], is_available: true },
        { category_id: cat2 as number, title_ar: 'بيتزا مارجريتا', prices: [50, 80, 120], size_labels: ['صغير', 'وسط', 'كبير'], is_available: true },
        { category_id: cat2 as number, title_ar: 'بيتزا خضار', prices: [55, 85, 130], size_labels: ['صغير', 'وسط', 'كبير'], is_available: true },
        { category_id: cat2 as number, title_ar: 'بيتزا بيبروني', prices: [60, 95, 140], size_labels: ['صغير', 'وسط', 'كبير'], is_available: true, is_popular: true },
        { category_id: cat3 as number, title_ar: 'كولا', prices: [10, 15], size_labels: ['صغير', 'كبير'], is_available: true },
        { category_id: cat3 as number, title_ar: 'عصير مانجو', prices: [15, 25], size_labels: ['صغير', 'كبير'], is_available: true },
        { category_id: cat3 as number, title_ar: 'شاي', prices: [8], is_available: true },
        { category_id: cat3 as number, title_ar: 'قهوة', prices: [12], is_available: true },
        { category_id: cat4 as number, title_ar: 'كنافة', prices: [30, 50], size_labels: ['قطعة', 'صينية'], is_available: true },
        { category_id: cat4 as number, title_ar: 'بسبوسة', prices: [20, 40], size_labels: ['قطعة', 'صينية'], is_available: true },
    ];
    await db.menu_items.bulkAdd(items);
}

/* ── Helpers ── */
export async function getNextOrderNumber(): Promise<number> {
    const last = await db.orders.orderBy('order_number').last();
    return (last?.order_number || 0) + 1;
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
