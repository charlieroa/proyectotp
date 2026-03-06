// src/services/handoffCache.js
// In-memory cache to avoid DB queries on every WhatsApp message
// Key: "tenantId:chatId" → true (if conversation is in handoff)

const handoffSet = new Set();

function key(tenantId, chatId) {
  return `${tenantId}:${chatId}`;
}

function isInHandoff(tenantId, chatId) {
  return handoffSet.has(key(tenantId, chatId));
}

function setHandoff(tenantId, chatId) {
  handoffSet.add(key(tenantId, chatId));
}

function clearHandoff(tenantId, chatId) {
  handoffSet.delete(key(tenantId, chatId));
}

module.exports = { isInHandoff, setHandoff, clearHandoff };
