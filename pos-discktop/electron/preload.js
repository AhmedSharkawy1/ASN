/* ═══════════════════════════════════════════════════════════════════
 *  ASN POS Desktop — Preload Script
 *  Securely exposes Electron APIs to the renderer (Next.js) process.
 *  Implements the `window.electronAPI` interface already referenced
 *  throughout the existing web codebase.
 * ═══════════════════════════════════════════════════════════════════ */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /* ── Sync Operations ── */

    /**
     * Enqueue an action for background sync.
     * @param {Object} action - { action_type, table_name, record_id, payload }
     */
    enqueueAction: (action) => ipcRenderer.invoke('enqueue-action', action),

    /**
     * Get current sync status.
     * @returns {{ isSyncing: boolean, pending: number, lastSync: string|null, deviceId: string }}
     */
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),

    /**
     * Force an immediate sync attempt.
     */
    forceSync: () => ipcRenderer.invoke('force-sync'),

    /**
     * Notify main process about online/offline status change.
     * @param {boolean} isOnline
     */
    onlineStatusChanged: (isOnline) => ipcRenderer.invoke('online-status-changed', isOnline),

    /* ── Print Operations ── */

    /**
     * Enqueue a print job for the native printer.
     * @param {Object} printData - { data: string (HTML content) }
     * @returns {{ success: boolean }}
     */
    enqueuePrint: (printData) => ipcRenderer.invoke('enqueue-print', printData),

    /**
     * Get list of available system printers.
     */
    getPrinters: () => ipcRenderer.invoke('get-printers'),

    /* ── Device & App Info ── */

    /**
     * Get unique device identifier.
     */
    getDeviceId: () => ipcRenderer.invoke('get-device-id'),

    /**
     * Get app info (version, variant, name).
     */
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    /* ── Window Controls ── */
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    /* ── Auto Updates ── */
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (_, version) => callback(version));
    },
    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (_, percent) => callback(percent));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', () => callback());
    },

    /* ── Platform Info ── */
    platform: process.platform,
    isElectron: true,
});

// Log preload initialization
console.log('[Preload] electronAPI exposed to renderer');
