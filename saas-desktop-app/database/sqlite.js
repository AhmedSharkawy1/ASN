const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data.db');

// Ensure database directory exists if needed (though it's in the root here)
// const dbDir = path.dirname(dbPath);
// if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath, { verbose: console.log });

async function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_synced_at TEXT,
      version INTEGER DEFAULT 1,
      device_id TEXT,
      data JSON
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_synced_at TEXT,
      version INTEGER DEFAULT 1,
      device_id TEXT,
      data JSON
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_synced_at TEXT,
      version INTEGER DEFAULT 1,
      device_id TEXT,
      data JSON
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      product_id TEXT,
      quantity INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_synced_at TEXT,
      version INTEGER DEFAULT 1,
      device_id TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      amount REAL,
      method TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_synced_at TEXT,
      version INTEGER DEFAULT 1,
      device_id TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      level TEXT,
      message TEXT,
      context TEXT
    );
  `;

  db.exec(schema);
  console.log('SQLite tables initialized.');
}

module.exports = {
  db,
  initDatabase
};
