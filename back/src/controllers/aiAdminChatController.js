'use strict';

// =====================================================================
// AI Admin Chat Controller — multi-agent architecture
// Delegates to back/src/ai-agents/ which is split into 8 specialized agents.
// =====================================================================

const { runAdminChat } = require('../ai-agents');
const { getGlobalOpenAIKey } = require('../services/openaiKeyService');

// Back-compat exports for whatsappController (which still uses the monolithic
// ADMIN_TOOLS / executeFunction / ADMIN_SYSTEM_PROMPT shape)
const registry = require('../ai-agents/registry');

exports.ADMIN_TOOLS = registry.ADMIN_TOOLS;
exports.ADMIN_SYSTEM_PROMPT = registry.ADMIN_SYSTEM_PROMPT;
exports.executeFunction = registry.executeFunction;

exports.chat = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        const tenantId = req.user.tenant_id;
        const userId = req.user.id;

        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }

        const result = await runAdminChat({
            message,
            tenantId,
            userId,
            conversationHistory,
        });

        if (result.error) return res.status(400).json({ error: result.error });
        return res.json(result);
    } catch (err) {
        console.error('[AI Admin Chat] Error:', err);
        if (err.code === 'NO_API_KEY') {
            return res.status(500).json({ error: 'No hay API key de OpenAI configurada.' });
        }
        if (err.code === 'OPENAI_ERROR') {
            return res.status(502).json({ error: 'Error al comunicarse con OpenAI.' });
        }
        return res.status(500).json({ error: 'Error interno del asistente admin.' });
    }
};

exports.health = async (req, res) => {
    try {
        const apiKey = await getGlobalOpenAIKey();
        res.json({
            status: 'ok',
            endpoint: 'ai-admin-chat',
            architecture: 'multi-agent',
            hasApiKey: !!apiKey,
            agents: Object.keys(require('../ai-agents').AGENTS),
            totalTools: registry.ADMIN_TOOLS.length,
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
};
