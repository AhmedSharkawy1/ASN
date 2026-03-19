const { db } = require('../database/sqlite');

const logger = {
  log: (level, message, context = '') => {
    try {
      const stmt = db.prepare('INSERT INTO logs (level, message, context) VALUES (?, ?, ?)');
      stmt.run(level, message, typeof context === 'object' ? JSON.stringify(context) : context);
      console.log(`[${level.toUpperCase()}] ${message}`, context);
    } catch (err) {
      console.error('Logging failed:', err);
    }
  },
  info: (message, context) => logger.log('info', message, context),
  warn: (message, context) => logger.log('warn', message, context),
  error: (message, context) => logger.log('error', message, context),
  debug: (message, context) => logger.log('debug', message, context),
};

module.exports = logger;
