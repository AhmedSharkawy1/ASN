"use client";

import { posDb } from './pos-db';
import type { PosCategory, PosMenuItem, PosOrder, PosCustomer, PosStaffUser } from './pos-db';
import { supabase } from './supabase/client';

/* ── Sync Service for Supabase ↔ Dexie ── */

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSynced?: string;
    pendingCount: number;
    deviceId?: string;
}

let _syncStatus: SyncStatus = { isOnline: true, isSyncing: false, pendingCount: 0 };
const _listeners = new Set<(s: SyncStatus) => void>();

// Helper to check for Electron
const isElectron = () => typeof window !== 'undefined' && 'electronAPI' in window;

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

// Poll Electron for detailed sync status if applicable
if (isElectron()) {
    setInterval(async () => {
        try {
            const status = await (window as any).electronAPI.getSyncStatus();
            notify({
                isSyncing: status.isSyncing,
                pendingCount: status.pending,
                lastSynced: status.lastSync,
                deviceId: status.deviceId
            });
        } catch (err) {
            console.error('[SyncService] Failed to get sync status:', err);
        }
    }, 5000);
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

        // Pull ALL orders
        const { data: orders } = await supabase.from('orders').select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false }).limit(5000);
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
                        deposit_amount: order.deposit_amount || 0,
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

        // Pull inventory items
        const { data: inv } = await supabase.from('inventory_items').select('*')
            .eq('restaurant_id', restaurantId);
        if (inv) {
            await posDb.inventory_items.where('restaurant_id').equals(restaurantId).delete();
            await posDb.inventory_items.bulkPut(
                inv.map(i => ({ ...i, _dirty: false }))
            );
        }

        // Pull delivery zones
        const { data: zones } = await supabase.from('delivery_zones').select('*')
            .eq('restaurant_id', restaurantId).eq('is_active', true);
        if (zones) {
            await posDb.delivery_zones.where('restaurant_id').equals(restaurantId).delete();
            await posDb.delivery_zones.bulkPut(
                zones.map(z => ({ ...z }))
            );
        }

        // Pull branches
        const { data: bData } = await supabase.from('branches').select('id, branch_name').eq('tenant_id', restaurantId).eq('is_active', true);
        if (bData) {
            await posDb.branches.where('restaurant_id').equals(restaurantId).delete();
            await posDb.branches.bulkPut(
                bData.map(b => ({ ...b, restaurant_id: restaurantId, is_active: true } as any))
            );
        }

        notify({ lastSynced: new Date().toISOString() });
    } catch (err) {
        console.error('[Sync] Pull failed', err);
    } finally {
        notify({ isSyncing: false });
    }
}

/* ── Push: Dexie dirty records → Server API → Supabase ── */
export async function pushDirtyToSupabase(restaurantId: string): Promise<void> {
    if (isElectron()) {
        // In Electron, we follow the "Enqeue First" rule.
        // We'll gather dirty items and send them to the Electron Action Queue.
        try {
            const dirtyOrders = await posDb.orders.where('restaurant_id').equals(restaurantId).and(o => !!o._dirty).toArray();
            const dirtyCusts = await posDb.customers.where('restaurant_id').equals(restaurantId).and(c => !!c._dirty).toArray();

            for (const order of dirtyOrders) {
                await (window as any).electronAPI.enqueueAction({
                    action_type: 'upsert',
                    table_name: 'orders',
                    record_id: order.id,
                    payload: order
                });
                await posDb.orders.update(order.id, { _dirty: false });
            }

            for (const cust of dirtyCusts) {
                await (window as any).electronAPI.enqueueAction({
                    action_type: 'upsert',
                    table_name: 'customers',
                    record_id: cust.id,
                    payload: cust
                });
                await posDb.customers.update(cust.id, { _dirty: false });
            }
            
            return;
        } catch (err) {
            console.error('[Sync] Electron Enqueue failed', err);
        }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    notify({ isSyncing: true });

    try {
        // Gather dirty orders
        const dirtyOrders = await posDb.orders
            .where('restaurant_id').equals(restaurantId)
            .and(o => !!o._dirty).toArray();

        const ordersToSync = dirtyOrders.map(order => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _dirty, ...rest } = order;
            delete (rest as PosOrder & { delivery_driver_id?: number }).delivery_driver_id;
            delete (rest as PosOrder & { delivery_driver_name?: string }).delivery_driver_name;
            delete (rest as PosOrder & { delivery_fee?: number }).delivery_fee;
            
            return {
                ...rest,
                customer_address: rest.customer_address || null,
                notes: (rest as { notes?: string }).notes || null,
                deposit_amount: (rest as { deposit_amount?: number }).deposit_amount || 0,
                source: (rest as { source?: string }).source || 'pos',
            };
        });

        // Gather dirty customers
        const dirtyCusts = await posDb.customers
            .where('restaurant_id').equals(restaurantId)
            .and(c => !!c._dirty).toArray();

        const custsToSync = dirtyCusts.map(cust => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { _dirty, ...rest } = cust;
            return rest;
        });

        if (ordersToSync.length === 0 && custsToSync.length === 0) {
            notify({ isSyncing: false });
            return;
        }

        // Push via server-side API (uses SERVICE_ROLE_KEY, bypasses RLS)
        const res = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: ordersToSync, customers: custsToSync }),
        });

        const result = await res.json();

        if (res.ok && result.success) {
            // Mark synced orders as clean
            for (const order of dirtyOrders) {
                await posDb.orders.update(order.id, { _dirty: false });
            }
            for (const cust of dirtyCusts) {
                await posDb.customers.update(cust.id, { _dirty: false });
            }
            console.log(`[Sync] Pushed ${result.orders} orders, ${result.customers} customers`);
            if (result.errors?.length > 0) {
                console.warn('[Sync] Some items had errors:', result.errors);
            }
        } else {
            console.error('[Sync] Push API failed:', result.error || result);
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
        if (isElectron()) {
            (window as any).electronAPI.onlineStatusChanged(true);
        }
        await pushDirtyToSupabase(restaurantId);
        await pullFromSupabase(restaurantId);
    };

    const handleOffline = () => {
        notify({ isOnline: false });
        if (isElectron()) {
            (window as any).electronAPI.onlineStatusChanged(false);
        }
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
