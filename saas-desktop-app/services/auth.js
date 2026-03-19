const api = require('./api');
const { db } = require('../database/sqlite');
const logger = require('../utils/logger');

async function login(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      // Store token locally (e.g., in a settings table or simple file)
      // For now, let's assume a settings table exists or use a simple JSON file
      saveToken(response.data.token);
      return { success: true, token: response.data.token };
    }
  } catch (error) {
    logger.error('Login failed:', error.message);
    return { success: false, error: error.message };
  }
}

function saveToken(token) {
  // Simple implementation: could be a dedicated table
  db.prepare('CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY, token TEXT)').run();
  db.prepare('DELETE FROM auth').run();
  db.prepare('INSERT INTO auth (token) VALUES (?)').run(token);
}

function getToken() {
  const row = db.prepare('SELECT token FROM auth LIMIT 1').get();
  return row ? row.token : null;
}

module.exports = { login, getToken };
