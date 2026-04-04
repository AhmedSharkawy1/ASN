/* ═══════════════════════════════════════════════════════════════════
 *  ASN POS Desktop — Electron Main Process
 *  Wraps the Next.js standalone server in a native desktop window.
 *  Provides: system tray, offline sync, native printing, auto-update.
 * ═══════════════════════════════════════════════════════════════════ */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Auto-updater
const { autoUpdater } = require('electron-updater');

// Internal modules
const { SyncWorker } = require('./sync-worker');
const { PrintService } = require('./print-service');

/* ── Globals ── */
let mainWindow = null;
let tray = null;
let nextServer = null;
let syncWorker = null;
let printService = null;

const isDev = process.env.ELECTRON_IS_DEV === 'true' || !app.isPackaged;
const PORT = 3456;
const APP_URL = `http://localhost:${PORT}`;

/* ── Determine app variant from env or build flag ── */
const APP_VARIANT = process.env.APP_VARIANT || 'asn'; // 'asn' or 'atyab'

/* ═══════════════════════════ WINDOW ═══════════════════════════ */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: APP_VARIANT === 'atyab' ? 'حلوانى اطياب - نظام نقاط البيع' : 'ASN POS',
        icon: getIconPath(),
        backgroundColor: '#0f1628',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        // Frameless with custom title bar feel on Windows
        frame: true,
        autoHideMenuBar: true,
    });

    // Remove native menu bar
    mainWindow.setMenuBarVisibility(false);

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http') && !url.includes('localhost')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/* ═══════════════════════════ NEXT.JS SERVER ═══════════════════════════ */
function getNextServerPath() {
    if (isDev) {
        // In dev, use the local app/ directory (built by build-desktop.js)
        // which includes .next/static and public/ already copied in
        const localApp = path.join(__dirname, '..', 'app');
        if (fs.existsSync(path.join(localApp, 'server.js'))) {
            return localApp;
        }
        // Fallback to raw standalone (won't have static files)
        return path.join(__dirname, '..', '..', '.next', 'standalone');
    }
    // In production, server is in resources/app
    return path.join(process.resourcesPath, 'app');
}

function startNextServer() {
    return new Promise((resolve, reject) => {
        const serverPath = getNextServerPath();
        const serverFile = path.join(serverPath, 'server.js');

        if (!fs.existsSync(serverFile)) {
            console.error(`[Main] Next.js server not found at: ${serverFile}`);
            reject(new Error(`Server not found: ${serverFile}`));
            return;
        }

        console.log(`[Main] Starting Next.js server from: ${serverFile}`);

        // Set environment variables for the Next.js server
        const env = {
            ...process.env,
            PORT: PORT.toString(),
            HOSTNAME: 'localhost',
            NODE_ENV: 'production',
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };

        nextServer = spawn(process.execPath, [serverFile], {
            cwd: serverPath,
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        nextServer.stdout.on('data', (data) => {
            const msg = data.toString().trim();
            console.log(`[Next] ${msg}`);
            if (msg.includes('Ready') || msg.includes('started') || msg.includes('listening')) {
                resolve();
            }
        });

        nextServer.stderr.on('data', (data) => {
            console.error(`[Next:err] ${data.toString().trim()}`);
        });

        nextServer.on('error', (err) => {
            console.error('[Main] Failed to start Next.js server:', err);
            reject(err);
        });

        nextServer.on('exit', (code) => {
            console.log(`[Main] Next.js server exited with code ${code}`);
        });

        // Fallback: poll the server to check if it's ready
        const pollInterval = setInterval(() => {
            http.get(`${APP_URL}/login`, (res) => {
                if (res.statusCode === 200 || res.statusCode === 304 || res.statusCode === 302) {
                    clearInterval(pollInterval);
                    resolve();
                }
            }).on('error', () => {
                // Server not ready yet
            });
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(pollInterval);
            reject(new Error('Next.js server startup timeout'));
        }, 30000);
    });
}

/* ═══════════════════════════ SYSTEM TRAY ═══════════════════════════ */
function createTray() {
    const iconPath = getIconPath();
    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) {
            icon = nativeImage.createEmpty();
        } else {
            icon = icon.resize({ width: 16, height: 16 });
        }
    } catch {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip(APP_VARIANT === 'atyab' ? 'حلوانى اطياب POS' : 'ASN POS');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'فتح التطبيق',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'مزامنة الآن',
            click: () => {
                if (syncWorker) syncWorker.forceSync();
            }
        },
        { type: 'separator' },
        {
            label: 'إعادة تشغيل',
            click: () => {
                app.isQuitting = true;
                app.relaunch();
                app.quit();
            }
        },
        {
            label: 'إغلاق',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.focus();
            } else {
                mainWindow.show();
            }
        }
    });
}

/* ═══════════════════════════ ICON ═══════════════════════════ */
function getIconPath() {
    const assetsDir = isDev
        ? path.join(__dirname, '..', 'assets')
        : path.join(process.resourcesPath, '..', 'assets');

    // Try .ico first, then .png
    const icoPath = path.join(assetsDir, 'icon.ico');
    const pngPath = path.join(assetsDir, 'icon.png');

    if (fs.existsSync(icoPath)) return icoPath;
    if (fs.existsSync(pngPath)) return pngPath;

    // Fallback to the app directory
    const fallbackPng = path.join(__dirname, '..', 'assets', 'icon.png');
    if (fs.existsSync(fallbackPng)) return fallbackPng;

    return '';
}

/* ═══════════════════════════ AUTO UPDATER ═══════════════════════════ */
function setupAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Update available:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('update-available', info.version);
        }
    });

    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] No updates available.');
    });

    autoUpdater.on('download-progress', (progressObj) => {
        console.log(`[Updater] Download progress: ${Math.round(progressObj.percent)}%`);
        if (mainWindow) {
            mainWindow.webContents.send('update-progress', progressObj.percent);
        }
    });

    autoUpdater.on('update-downloaded', () => {
        console.log('[Updater] Update downloaded. Will install on quit.');
        if (mainWindow) {
            mainWindow.webContents.send('update-downloaded');
        }
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'تحديث جديد',
            message: 'تم تحميل تحديث جديد. سيتم تثبيته عند إعادة تشغيل التطبيق.',
            buttons: ['إعادة التشغيل الآن', 'لاحقاً'],
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err);
    });

    // Check for updates every 30 minutes
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => {});
    }, 30 * 60 * 1000);

    // Initial check
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {});
    }, 5000);
}

/* ═══════════════════════════ IPC HANDLERS ═══════════════════════════ */
function setupIPC() {
    // Sync operations
    ipcMain.handle('enqueue-action', async (_, action) => {
        if (syncWorker) {
            return syncWorker.enqueueAction(action);
        }
        return { success: false, error: 'Sync worker not initialized' };
    });

    ipcMain.handle('get-sync-status', async () => {
        if (syncWorker) {
            return syncWorker.getStatus();
        }
        return { isSyncing: false, pending: 0, lastSync: null, deviceId: null };
    });

    ipcMain.handle('force-sync', async () => {
        if (syncWorker) {
            return syncWorker.forceSync();
        }
        return { success: false };
    });

    ipcMain.handle('online-status-changed', async (_, isOnline) => {
        if (syncWorker) {
            syncWorker.setOnlineStatus(isOnline);
        }
    });

    // Print operations
    ipcMain.handle('enqueue-print', async (_, printData) => {
        if (printService) {
            return printService.print(printData, mainWindow);
        }
        return { success: false, error: 'Print service not initialized' };
    });

    ipcMain.handle('get-printers', async () => {
        if (mainWindow) {
            return mainWindow.webContents.getPrintersAsync();
        }
        return [];
    });

    // Device ID
    ipcMain.handle('get-device-id', async () => {
        if (syncWorker) {
            return syncWorker.getDeviceId();
        }
        return 'unknown';
    });

    // App info
    ipcMain.handle('get-app-info', async () => {
        return {
            version: app.getVersion(),
            variant: APP_VARIANT,
            name: APP_VARIANT === 'atyab' ? 'حلوانى اطياب' : 'ASN POS',
        };
    });

    // Window controls
    ipcMain.on('window-minimize', () => mainWindow?.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.on('window-close', () => mainWindow?.hide());

    // Check for updates
    ipcMain.handle('check-for-updates', async () => {
        try {
            await autoUpdater.checkForUpdates();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });
}

/* ═══════════════════════════ APP LIFECYCLE ═══════════════════════════ */
app.whenReady().then(async () => {
    console.log(`[Main] ASN POS Desktop starting... (variant: ${APP_VARIANT})`);

    // Initialize services
    syncWorker = new SyncWorker();
    printService = new PrintService();

    // Setup IPC handlers
    setupIPC();

    // Create window (but don't show yet)
    createMainWindow();

    // Show loading state
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #0f1628;
                    font-family: 'Segoe UI', Tahoma, sans-serif;
                    color: white;
                    flex-direction: column;
                    gap: 24px;
                }
                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: #10b981;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .text { font-size: 18px; font-weight: 600; opacity: 0.8; }
                .subtext { font-size: 13px; opacity: 0.4; margin-top: -12px; }
            </style>
        </head>
        <body>
            <div class="spinner"></div>
            <div class="text">جاري تحميل النظام...</div>
            <div class="subtext">ASN POS Desktop</div>
        </body>
        </html>
    `)}`);
    mainWindow.show();

    try {
        // Start Next.js server
        await startNextServer();
        console.log('[Main] Next.js server is ready!');

        // Navigate to the app
        await mainWindow.loadURL(`${APP_URL}/login?desktop=true`);
    } catch (err) {
        console.error('[Main] Failed to start server:', err);
        dialog.showErrorBox(
            'خطأ في التشغيل',
            `فشل في تشغيل السيرفر المحلي.\n\n${err.message}\n\nيرجى إعادة تشغيل التطبيق.`
        );
    }

    // Create system tray
    createTray();

    // Setup auto-updater (only in production)
    if (!isDev) {
        setupAutoUpdater();
    }
});

// macOS: re-create window when dock icon is clicked
app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    } else {
        mainWindow.show();
    }
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// Cleanup on quit
app.on('before-quit', () => {
    app.isQuitting = true;
    if (nextServer) {
        nextServer.kill('SIGTERM');
        nextServer = null;
    }
    if (syncWorker) {
        syncWorker.shutdown();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit — we run in the tray
    }
});
