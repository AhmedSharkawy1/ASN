const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkNetwork: () => ipcRenderer.invoke('check-network'),
  onSyncStatus: (callback) => ipcRenderer.on('sync-status', (event, status) => callback(status)),
  manualSync: () => ipcRenderer.send('manual-sync'),
});
