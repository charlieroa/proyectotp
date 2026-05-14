'use strict';

const { getGlobalOpenAIKey } = require('../../services/openaiKeyService');
const { trackUsage } = require('../../services/tokenTracker');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

async function chatCompletion({ messages, tools, toolChoice, model = 'gpt-4o-mini', temperature = 0.5, maxTokens = 800, tenantId, label = 'admin_chat' }) {
    const apiKey = await getGlobalOpenAIKey();
    if (!apiKey) {
        const e = new Error('OpenAI API key not configured');
        e.code = 'NO_API_KEY';
        throw e;
    }

    const body = { model, messages, temperature, max_tokens: maxTokens };
    if (tools && tools.length) {
        body.tools = tools;
        body.tool_choice = toolChoice || 'auto';
    }

    const r = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const txt = await r.text();
        console.error(`[ai-agents] OpenAI ${label} error:`, txt.slice(0, 500));
        const e = new Error(`OpenAI ${label} failed`);
        e.code = 'OPENAI_ERROR';
        e.detail = txt;
        throw e;
    }

    const data = await r.json();
    if (data.usage && tenantId) {
        trackUsage(tenantId, label, data.model || model, data.usage.prompt_tokens, data.usage.completion_tokens).catch(() => {});
    }
    return data;
}

module.exports = { chatCompletion };
