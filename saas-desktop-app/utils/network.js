const isOnline = require('is-online');

async function checkConnection() {
  try {
    return await isOnline();
  } catch (error) {
    return false;
  }
}

module.exports = { checkConnection };
