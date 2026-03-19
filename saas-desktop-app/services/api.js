const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const api = axios.create({
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  // Add auth token if available (could be from local storage/sqlite)
  const token = await ipcRenderer.invoke('get-token'); // This won't work in node, need another way
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

module.exports = api;
