const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isOnline = require('is-online');
const { initDatabase } = require('./database/sqlite');
const logger = require('./utils/logger');
const { startSyncScheduler } = require('./sync/scheduler');
const { pushChanges } = require('./sync/push');
const { pullChanges } = require('./sync/pull');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the renderer (for sync status/controls) or the SaaS URL
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    await startSyncScheduler();
    createWindow();
    logger.info('Application started and database initialized');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    dialog.showErrorBox('Initialization Error', 'Failed to initialize the local database: ' + error.message);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Listeners for Network Status
ipcMain.handle('check-network', async () => {
  return await isOnline();
});

ipcMain.on('manual-sync', async () => {
  logger.info('Manual sync triggered');
  await pushChanges();
  await pullChanges();
  if (mainWindow) {
    mainWindow.webContents.send('sync-status', 'completed');
  }
});
