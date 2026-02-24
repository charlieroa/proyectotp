/**
 * Token Usage Tracker
 * Logs OpenAI token consumption per tenant per call.
 */
'use strict';

const prisma = require('../config/prisma');

/**
 * Record token usage for a tenant.
 *
 * @param {string}  tenantId         - UUID of the tenant
 * @param {string}  callType         - 'chat' | 'whisper' | 'tts'
 * @param {string}  model            - e.g. 'gpt-4o-mini', 'whisper-1', 'tts-1-hd'
 * @param {number}  promptTokens     - prompt / input tokens
 * @param {number}  completionTokens - completion / output tokens
 * @param {number}  totalTokens      - total tokens (prompt + completion)
 */
async function trackUsage(tenantId, callType, model, promptTokens = 0, completionTokens = 0, totalTokens = 0) {
  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO token_usage (tenant_id, call_type, model, prompt_tokens, completion_tokens, total_tokens)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
      tenantId, callType, model, promptTokens, completionTokens, totalTokens
    );
  } catch (err) {
    // Non-blocking: log and continue – never break the bot flow because of tracking
    console.error('[TokenTracker] Error recording usage:', err.message);
  }
}

module.exports = { trackUsage };
