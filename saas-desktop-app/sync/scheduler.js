const { pushChanges } = require('./push');
const { pullChanges } = require('./pull');
const { checkConnection } = require('../utils/network');
const logger = require('../utils/logger');

let syncInterval;

async function startSyncScheduler() {
  if (syncInterval) clearInterval(syncInterval);

  syncInterval = setInterval(async () => {
    const isOnline = await checkConnection();
    if (isOnline) {
      logger.info('Starting scheduled sync');
      await pushChanges();
      await pullChanges();
    } else {
      logger.debug('Skipping scheduled sync: Offline');
    }
  }, 30000); // 30 seconds
}

module.exports = { startSyncScheduler };
