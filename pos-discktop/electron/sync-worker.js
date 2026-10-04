/* ═══════════════════════════════════════════════════════════════════
 *  ASN POS Desktop — Sync Worker
 *  Runs in the main process. Uses electron-store for a persistent action queue.
 *  When online, flushes queued actions to Supabase.
 * ═══════════════════════════════════════════════════════════════════ */

const path = require('path');
const { app } = require('electron');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');

class SyncWorker {
    constructor() {
        this.store = null;
        this.supabase = null;
        this.isSyncing = false;
        this.isOnline = true;
        this.lastSync = null;
        this.deviceId = this._getOrCreateDeviceId();
        this.syncInterval = null;

        this._initStore();
        this._initSupabase();
        this._startSyncLoop();
    }

    /* ── Store Init (JSON file-based persistent queue) ── */
    _initStore() {
        try {
            this.storeFilePath = path.join(app.getPath('userData'), 'sync_queue.json');
            
            if (fs.existsSync(this.storeFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.storeFilePath, 'utf8'));
                this.queue = data.queue || [];
                this.lastSync = data.lastSync || null;
            } else {
                this.queue = [];
                this.lastSync = null;
            }
            
            console.log(`[SyncWorker] Store initialized. ${this.queue.length} pending actions.`);
        } catch (err) {
            console.error('[SyncWorker] Store init error:', err);
            this.queue = [];
        }
    }

    _saveStore() {
        try {
            const data = {
                queue: this.queue,
                lastSync: this.lastSync,
            };
            fs.writeFileSync(this.storeFilePath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('[SyncWorker] Save store error:', err);
        }
    }

    /* ── Supabase Client ── */
    _initSupabase() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (url && key) {
            this.supabase = createClient(url, key);
            console.log('[SyncWorker] Supabase client initialized');
        } else {
            console.error('[SyncWorker] Missing Supabase credentials');
        }
    }

    /* ── Device ID ── */
    _getOrCreateDeviceId() {
        try {
            const configPath = path.join(app.getPath('userData'), 'device.json');
            if (fs.existsSync(configPath)) {
                const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return data.deviceId;
            }
            const deviceId = `desktop_${crypto.randomUUID().split('-')[0]}`;
            fs.writeFileSync(configPath, JSON.stringify({ deviceId }));
            return deviceId;
        } catch {
            return `desktop_${Date.now().toString(36)}`;
        }
    }

    /* ── Enqueue Action ── */
    enqueueAction(action) {
        try {
            const { action_type, table_name, record_id, payload } = action;

            this.queue.push({
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                action_type,
                table_name,
                record_id,
                payload,
                status: 'pending',
                retries: 0,
                created_at: new Date().toISOString(),
            });

            this._saveStore();
            console.log(`[SyncWorker] Enqueued: ${action_type} ${table_name}/${record_id}`);
            return { success: true };
        } catch (err) {
            console.error('[SyncWorker] Enqueue error:', err);
            return { success: false, error: err.message };
        }
    }

    /* ── Get Status ── */
    getStatus() {
        const pending = this.queue.filter(q => q.status === 'pending').length;
        return {
            isSyncing: this.isSyncing,
            pending,
            lastSync: this.lastSync,
            deviceId: this.deviceId,
        };
    }

    /* ── Set Online Status ── */
    setOnlineStatus(online) {
        this.isOnline = online;
        if (online && !this.isSyncing) {
            this._processQueue();
        }
    }

    /* ── Force Sync ── */
    async forceSync() {
        if (!this.isSyncing) {
            await this._processQueue();
        }
        return { success: true };
    }

    /* ── Sync Loop ── */
    _startSyncLoop() {
        // Process queue every 15 seconds
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this._processQueue();
            }
        }, 15000);
    }

    /* ── Process Queue ── */
    async _processQueue() {
        if (!this.supabase || this.isSyncing) return;

        const pendingItems = this.queue.filter(q => q.status === 'pending');
        if (pendingItems.length === 0) return;

        this.isSyncing = true;
        console.log(`[SyncWorker] Processing ${pendingItems.length} queued actions...`);

        // 1. Separate items by action type and table
        const upsertsByTable = {};
        const deletes = [];

        for (const item of pendingItems) {
            try {
                const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;

                if (item.action_type === 'upsert') {
                    const cleanPayload = { ...payload };
                    delete cleanPayload._dirty;
                    delete cleanPayload.deleted_at;

                    if (item.table_name === 'orders') {
                        delete cleanPayload.delivery_driver_id;
                        delete cleanPayload.delivery_driver_name;
                        delete cleanPayload.delivery_fee;
                        cleanPayload.customer_address = cleanPayload.customer_address || null;
                        cleanPayload.notes = cleanPayload.notes || null;
                        cleanPayload.deposit_amount = cleanPayload.deposit_amount || 0;
                        cleanPayload.source = cleanPayload.source || 'pos';
                    }

                    if (!upsertsByTable[item.table_name]) upsertsByTable[item.table_name] = [];
                    upsertsByTable[item.table_name].push({ item, payload: cleanPayload });
                } else if (item.action_type === 'delete') {
                    deletes.push(item);
                }
            } catch (err) {
                item.status = 'failed';
                item.error_message = err.message;
            }
        }

        // 2. Perform Batch Upserts
        for (const [tableName, records] of Object.entries(upsertsByTable)) {
            // Bulk upsert chunks of 50
            const CHUNK_SIZE = 50;
            for (let i = 0; i < records.length; i += CHUNK_SIZE) {
                const chunk = records.slice(i, i + CHUNK_SIZE);
                const payloads = chunk.map(r => r.payload);

                try {
                    const { error } = await this.supabase.from(tableName).upsert(payloads);
                    if (error) throw error;
                    
                    for (const r of chunk) {
                        r.item.status = 'completed';
                        console.log(`[SyncWorker] ✓ upsert ${tableName}/${r.item.record_id}`);
                    }
                } catch (err) {
                    console.error(`[SyncWorker] ✗ bulk upsert ${tableName} failed:`, err.message);
                    for (const r of chunk) {
                        r.item.retries = (r.item.retries || 0) + 1;
                        r.item.error_message = err.message;
                        if (r.item.retries >= 5) r.item.status = 'failed';
                    }
                }
            }
        }

        // 3. Perform Deletes (sequentially)
        for (const item of deletes) {
            try {
                const { error } = await this.supabase
                    .from(item.table_name)
                    .delete()
                    .eq('id', item.record_id);

                if (error) throw error;
                item.status = 'completed';
                console.log(`[SyncWorker] ✓ delete ${item.table_name}/${item.record_id}`);
            } catch (err) {
                console.error(`[SyncWorker] ✗ delete ${item.table_name}/${item.record_id}:`, err.message);
                item.retries = (item.retries || 0) + 1;
                item.error_message = err.message;
                if (item.retries >= 5) item.status = 'failed';
            }
        }



        // Update last sync time
        this.lastSync = new Date().toISOString();

        // Clean up completed items
        this.queue = this.queue.filter(q => q.status === 'pending' || q.status === 'failed');

        // Save state
        this._saveStore();

        this.isSyncing = false;
        console.log('[SyncWorker] Queue processing complete.');
    }

    /* ── Get Device ID ── */
    getDeviceId() {
        return this.deviceId;
    }

    /* ── Shutdown ── */
    shutdown() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this._saveStore();
        console.log('[SyncWorker] Shut down.');
    }
}

module.exports = { SyncWorker };
