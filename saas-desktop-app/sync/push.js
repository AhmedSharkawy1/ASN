const { db } = require('../database/sqlite');
const api = require('../services/api');
const logger = require('../utils/logger');

async function pushChanges() {
  const tables = ['orders', 'customers', 'products', 'inventory', 'payments'];
  
  for (const table of tables) {
    const pendingChanges = db.prepare(`SELECT * FROM ${table} WHERE sync_status = 'pending' LIMIT 100`).all();
    
    if (pendingChanges.length === 0) continue;

    try {
      logger.info(`Pushing ${pendingChanges.length} records for ${table}`);
      
      const response = await api.post(`/sync/push/${table}`, { records: pendingChanges });
      
      if (response.status === 200) {
        const ids = pendingChanges.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`UPDATE ${table} SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
        logger.info(`Successfully synced ${pendingChanges.length} records for ${table}`);
      }
    } catch (error) {
      logger.error(`Error pushing ${table}:`, error.message);
      const ids = pendingChanges.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE ${table} SET sync_attempts = sync_attempts + 1 WHERE id IN (${placeholders})`).run(...ids);
    }
  }
}

module.exports = { pushChanges };
