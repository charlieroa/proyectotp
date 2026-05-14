'use strict';

const { chatCompletion } = require('./shared/openai');
const { nowBogota } = require('./shared/helpers');
const { routeMessage, AGENT_DESCRIPTIONS } = require('./director');
const { getTenantPlan } = require('../middleware/planMiddleware');

const recepcion = require('./agents/recepcion');
const pos = require('./agents/pos');
const inventario = require('./agents/inventario');
const personal = require('./agents/personal');
const reportes = require('./agents/reportes');
const config = require('./agents/config');
const marketing = require('./agents/marketing');
const onboarding = require('./agents/onboarding');

const AGENTS = { recepcion, pos, inventario, personal, reportes, config, marketing, onboarding };

const SCHEDULING_TOOL_NAMES = [
    'ver_citas_hoy', 'ver_agenda_fecha', 'crear_cita',
    'listar_servicios', 'listar_estilistas', 'ver_horario_estilista',
];

function buildBaseSystemPrompt() {
    return `Eres el asistente del salón TuPelukeria. Hablas con el JEFE — el dueño o administrador.

PERSONALIDAD GLOBAL:
- Trata SIEMPRE al usuario como "jefe": "Hola jefe", "Listo jefe", "Aquí tiene jefe".
- Eres leal, eficiente, respetuoso. Como un asistente de confianza.
- Respuestas concisas con datos reales. Listas/tablas cuando hay varios registros.
- NUNCA inventes datos. Si una función devuelve vacío, dilo claramente.
- Confirma antes de ejecutar acciones que crean/cobran/eliminan: "Jefe, voy a [...]. ¿Le doy?"
- Cuando el jefe diga "sí", "dale", "hazlo", "correcto" → EJECUTA inmediatamente. No pidas confirmación dos veces.

FORMATO PARA VOZ:
- Cifras conversacionales: "trescientos mil pesos" no "$300.000".
- Desglose de ventas: "jefe, hoy llevas X total: A en efectivo, B en tarjeta, C en transferencias".

PRECIOS COLOMBIANOS:
- $25.000 (con punto miles), $1.500.000

CONTEXTO TEMPORAL:
- Zona: America/Bogota.

Fecha/hora actual: ${nowBogota()}`;
}

async function runAdminChat({ message, tenantId, userId, conversationHistory = [] }) {
    if (!message || !String(message).trim()) {
        return { error: 'El mensaje no puede estar vacío.' };
    }

    // Setup status check (drives onboarding mode)
    const setupStatus = await onboarding.checkTenantSetup(tenantId);
    const tenantPlan = await getTenantPlan(tenantId);

    // Plan: Free + setup complete → block entirely
    if (tenantPlan === 'free' && setupStatus.isComplete) {
        return {
            response: `Jefe, en plan **Gratis** solo le ayudo a configurar el salón.\n\nPara **agendar** necesita plan **Pro**. Para el **asistente completo** (ventas, nómina, POS), plan **Business**. Ve a [Configuración → Planes](/settings).`,
            functionExecuted: null,
        };
    }

    let chosenAgent;
    let agentName;

    if (!setupStatus.isComplete) {
        // Onboarding mode — fixed agent
        chosenAgent = onboarding;
        agentName = 'onboarding';
    } else {
        // Route to specialist
        agentName = await routeMessage({ message, history: conversationHistory, tenantId });
        chosenAgent = AGENTS[agentName] || AGENTS.recepcion;
    }

    // Plan filter: Pro = scheduling-only
    let toolsForPlan = chosenAgent.tools;
    let proSystemNote = '';
    if (tenantPlan === 'pro' && setupStatus.isComplete) {
        // For pro plan, restrict to scheduling agents
        if (!['recepcion', 'config'].includes(agentName)) {
            return {
                response: `Jefe, en plan **Pro** solo le ayudo con **agendamiento**: ver citas, crear citas, ver agenda, consultar servicios y estilistas.\n\nPara ${agentName === 'pos' ? 'cobros y caja' : agentName === 'reportes' ? 'reportes' : 'esa función'}, necesita plan **Business** ($49.900/mes). Ve a [Configuración → Planes](/settings).`,
                functionExecuted: null,
            };
        }
        toolsForPlan = chosenAgent.tools.filter(t => SCHEDULING_TOOL_NAMES.includes(t.function.name));
        proSystemNote = '\n\nIMPORTANTE: plan PRO. Solo agendamiento.';
    }

    // System prompt
    const systemPrompt = setupStatus.isComplete
        ? `${buildBaseSystemPrompt()}\n\n${chosenAgent.systemPrompt}${proSystemNote}`
        : chosenAgent.buildSystemPrompt(setupStatus);

    const messages = [
        { role: 'system', content: systemPrompt },
        ...(conversationHistory || []).slice(-10),
        { role: 'user', content: String(message).trim() },
    ];

    // First call
    const first = await chatCompletion({
        messages,
        tools: toolsForPlan,
        toolChoice: 'auto',
        tenantId,
        label: `admin_chat:${agentName}`,
    });
    const assistantMsg = first.choices[0].message;

    if (!assistantMsg.tool_calls || !assistantMsg.tool_calls.length) {
        return {
            response: assistantMsg.content || 'No tengo respuesta en este momento.',
            functionExecuted: null,
            agent: agentName,
            setupStatus: setupStatus.isComplete ? undefined : setupStatus,
        };
    }

    // Execute tool calls in parallel
    const ctx = { tenantId, userId };
    const toolResults = await Promise.all(assistantMsg.tool_calls.map(async (tc) => {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments || '{}');
        let result;
        try {
            result = await chosenAgent.execute(fnName, fnArgs, ctx);
        } catch (err) {
            console.error(`[ai-agents:${agentName}] ${fnName}:`, err);
            result = { error: `Error ejecutando ${fnName}: ${err.message}` };
        }
        return { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) };
    }));

    // Second call with results
    const followUp = [...messages, assistantMsg, ...toolResults];
    const second = await chatCompletion({
        messages: followUp,
        tenantId,
        label: `admin_chat:${agentName}:followup`,
    });
    const finalContent = second.choices[0].message.content || 'No pude generar una respuesta.';
    const executedFunctions = assistantMsg.tool_calls.map(tc => tc.function.name).join(', ');

    const updatedSetup = await onboarding.checkTenantSetup(tenantId);

    return {
        response: finalContent,
        functionExecuted: executedFunctions,
        agent: agentName,
        setupStatus: updatedSetup.isComplete ? undefined : updatedSetup,
    };
}

module.exports = { runAdminChat, AGENTS };
