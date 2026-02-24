/**
 * Global OpenAI API Key Service
 * Fetches the key from global_settings with a 5-minute in-memory cache.
 */
'use strict';

const prisma = require('../config/prisma');

let cachedKey = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns the global OpenAI API key, cached for 5 minutes.
 * @returns {Promise<string|null>}
 */
async function getGlobalOpenAIKey() {
  const now = Date.now();
  if (cachedKey !== null && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedKey;
  }

  const result = await prisma.$queryRaw`
    SELECT value FROM global_settings WHERE key = 'openai_api_key'
  `;

  cachedKey = result[0]?.value || null;
  cacheTimestamp = now;
  return cachedKey;
}

/**
 * Force-clear the cache (e.g. after the super admin updates the key).
 */
function invalidateCache() {
  cachedKey = null;
  cacheTimestamp = 0;
}

module.exports = { getGlobalOpenAIKey, invalidateCache };
