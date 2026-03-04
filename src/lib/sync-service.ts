"use client";

import { posDb } from './pos-db';
import type { PosCategory, PosMenuItem, PosOrder, PosCustomer, PosStaffUser } from './pos-db';
import { supabase } from './supabase/client';

/* ── Sync Service for Supabase ↔ Dexie ── */

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSynced?: string;
}

let _syncStatus: SyncStatus = { isOnline: true, isSyncing: false };
const _listeners = new Set<(s: SyncStatus) => void>();

function notify(update: Partial<SyncStatus>) {
    _syncStatus = { ..._syncStatus, ...update };
    _listeners.forEach(l => l(_syncStatus));
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
    _listeners.add(cb);
    cb(_syncStatus);
    return () => _listeners.delete(cb);
}

export function getSyncStatus(): SyncStatus {
    return _syncStatus;
}

/* ── Pull: Supabase → Dexie ── */
export async function pullFromSupabase(restaurantId: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    notify({ isSyncing: true });

    try {
        // Pull categories
        const { data: cats } = await supabase
            .from('categories').select('*')
            .eq('restaurant_id', restaurantId).order('sort_order');
        if (cats) {
            await posDb.categories.where('restaurant_id').equals(restaurantId).delete();
            await posDb.categories.bulkPut(
                cats.map(c => ({ ...c, _dirty: false } as PosCategory))
            );
        }

        // Pull items via category IDs
        const catIds = (cats || []).map(c => c.id as string);
        if (catIds.length > 0) {
            const { data: items } = await supabase.from('items').select('*').in('category_id', catIds);
            if (items) {
                // Remove old items for those categories
                for (const catId of catIds) {
                    await posDb.menu_items.where('category_id').equals(catId).delete();
                }
                await posDb.menu_items.bulkPut(
                    items.map(i => ({
                        ...i,
                        restaurant_id: restaurantId,
                        _dirty: false,
                    } as PosMenuItem))
                );
            }
        }

        // Pull recent orders (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: orders } = await supabase.from('orders').select('*')
            .eq('restaurant_id', restaurantId)
            .gte('created_at', weekAgo)
            .order('created_at', { ascending: false }).limit(500);
        if (orders) {
            // Only pull-replace orders we don't have dirty local versions of
            for (const order of orders) {
                const local = await posDb.orders.get(order.id);
                if (!local?._dirty) {
                    await posDb.orders.put({
                        ...order,
                        restaurant_id: restaurantId,
                        _dirty: false,
                        customer_address: order.customer_address || undefined,
                        delivery_driver_id: order.delivery_driver_id || undefined,
                        delivery_driver_name: order.delivery_driver_name || undefined,
                        delivery_fee: order.delivery_fee || undefined,
                    } as PosOrder);
                }
            }
        }

        // Pull customers
        const { data: customers } = await supabase.from('customers').select('*')
            .eq('restaurant_id', restaurantId);
        if (customers) {
            for (const c of customers) {
                const local = await posDb.customers.get(c.id);
                if (!local?._dirty) {
                    await posDb.customers.put({ ...c, _dirty: false } as PosCustomer);
                }
            }
        }

        // Pull staff / team  
        const { data: team } = await supabase.from('team_members').select('*')
            .eq('restaurant_id', restaurantId);
        if (team) {
            for (const t of team) {
                const local = await posDb.pos_users.get(t.id);
                if (!local?._dirty) {
                    await posDb.pos_users.put({
                        id: t.id,
                        restaurant_id: restaurantId,
                        name: t.name || t.full_name || '',
                        username: t.email || t.username || '',
                        password: local?.password || '',
                        role: (['admin', 'manager', 'cashier', 'kitchen', 'delivery', 'staff'].includes(t.role) ? t.role : 'staff') as PosStaffUser['role'],
                        is_active: typeof t.is_active === 'boolean' ? t.is_active : true,
                        _dirty: false,
                    } as PosStaffUser);
                }
            }
        }

        notify({ lastSynced: new Date().toISOString() });
    } catch (err) {
        console.error('[Sync] Pull failed', err);
    } finally {
        notify({ isSyncing: false });
    }
}

/* ── Push: Dexie dirty records → Supabase ── */
export async function pushDirtyToSupabase(restaurantId: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    notify({ isSyncing: true });

    try {
        // Push dirty orders
        const dirtyOrders = await posDb.orders
            .where('restaurant_id').equals(restaurantId)
            .and(o => !!o._dirty).toArray();

        for (const order of dirtyOrders) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _dirty, customer_address, delivery_driver_id, delivery_driver_name, delivery_fee, ...orderData } = order;
            const { error } = await supabase.from('orders').upsert({
                ...orderData,
                customer_address: customer_address || null,
                delivery_driver_id: delivery_driver_id || null,
                delivery_driver_name: delivery_driver_name || null,
                delivery_fee: delivery_fee || null,
            });
            if (!error) {
                await posDb.orders.update(order.id, { _dirty: false });
            }
        }

        // Push dirty customers
        const dirtyCusts = await posDb.customers
            .where('restaurant_id').equals(restaurantId)
            .and(c => !!c._dirty).toArray();

        for (const cust of dirtyCusts) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _dirty, ...custData } = cust;
            const { error } = await supabase.from('customers').upsert(custData);
            if (!error) {
                await posDb.customers.update(cust.id, { _dirty: false });
            }
        }

        notify({ lastSynced: new Date().toISOString() });
    } catch (err) {
        console.error('[Sync] Push failed', err);
    } finally {
        notify({ isSyncing: false });
    }
}

/* ── Initialize: set up online/offline listeners ── */
export function initSyncService(restaurantId: string): () => void {
    if (typeof window === 'undefined') return () => { };

    const handleOnline = async () => {
        notify({ isOnline: true });
        await pushDirtyToSupabase(restaurantId);
        await pullFromSupabase(restaurantId);
    };

    const handleOffline = () => {
        notify({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    notify({ isOnline: navigator.onLine });
    if (navigator.onLine) {
        pullFromSupabase(restaurantId).then(() => pushDirtyToSupabase(restaurantId));
    }

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}
