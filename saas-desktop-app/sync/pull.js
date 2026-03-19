const { db } = require('../database/sqlite');
const api = require('../services/api');
const logger = require('../utils/logger');
const { resolveConflict } = require('./conflict');

async function pullChanges() {
  const tables = ['orders', 'customers', 'products', 'inventory', 'payments'];
  
  for (const table of tables) {
    const lastSyncRow = db.prepare(`SELECT MAX(last_synced_at) as last_sync FROM ${table} WHERE sync_status = 'synced'`).get();
    const lastSync = lastSyncRow ? lastSyncRow.last_sync : '1970-01-01T00:00:00Z';

    try {
      logger.info(`Pulling updates for ${table} since ${lastSync}`);
      const response = await api.get(`/sync/pull/${table}?since=${lastSync}`);
      
      if (response.status === 200 && response.data.records) {
        const records = response.data.records;
        for (const remoteRecord of records) {
          const localRecord = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(remoteRecord.id);
          
          if (!localRecord) {
            // New record from server
            const keys = Object.keys(remoteRecord);
            const placeholders = keys.map(() => '?').join(',');
            db.prepare(`INSERT INTO ${table} (${keys.join(',')}, sync_status) VALUES (${placeholders}, 'synced')`).run(...Object.values(remoteRecord));
          } else {
            // Conflict resolution
            const winner = resolveConflict(localRecord, remoteRecord);
            if (winner === 'remote') {
              const keys = Object.keys(remoteRecord);
              const setClause = keys.map(k => `${k} = ?`).join(',');
              db.prepare(`UPDATE ${table} SET ${setClause}, sync_status = 'synced' WHERE id = ?`).run(...Object.values(remoteRecord), remoteRecord.id);
            }
          }
        }
        logger.info(`Successfully pulled ${records.length} records for ${table}`);
      }
    } catch (error) {
      logger.error(`Error pulling ${table}:`, error.message);
    }
  }
}

module.exports = { pullChanges };
