'use strict';

// Aggregates tools and executors from all agents into a single flat registry.
// Used as a back-compat shim for whatsappController which expects ADMIN_TOOLS / executeFunction in monolithic style.

const { AGENTS } = require('./index');

const allAgents = Object.values(AGENTS);

// Aggregate tools (de-duplicated by function name; first wins)
const seenNames = new Set();
const ALL_TOOLS = [];
for (const a of allAgents) {
    for (const t of a.tools) {
        const n = t.function.name;
        if (seenNames.has(n)) continue;
        seenNames.add(n);
        ALL_TOOLS.push(t);
    }
}

// Build a name → agent map so executeFunction can dispatch
const FN_OWNER = {};
for (const a of allAgents) {
    for (const t of a.tools) {
        const n = t.function.name;
        if (!(n in FN_OWNER)) FN_OWNER[n] = a;
    }
}

const { getDefaultAdmin } = require('./shared/lookups');

const NEEDS_USER_ID = new Set([
    'crear_ticket', 'abrir_caja', 'cerrar_caja', 'registrar_movimiento_caja',
    'ajustar_stock', 'registrar_prestamo', 'registrar_compra_staff',
]);

async function executeFunction(fnName, args, tenantId, userId) {
    const owner = FN_OWNER[fnName];
    if (!owner) return { error: `Función desconocida: ${fnName}` };
    let uid = userId;
    if (!uid && NEEDS_USER_ID.has(fnName)) {
        const admin = await getDefaultAdmin(tenantId);
        uid = admin?.id;
    }
    return owner.execute(fnName, args, { tenantId, userId: uid });
}

const ALL_SYSTEM_PROMPT = `Eres el asistente integral del salón. Tienes acceso a TODAS las funciones (agenda, POS, caja, inventario, personal, nómina, reportes, configuración, marketing).

PERSONALIDAD:
- Trata SIEMPRE al jefe como "jefe": "Hola jefe", "Listo jefe", "Aquí tiene jefe".
- Confirma antes de cobrar/crear/eliminar.
- Respuestas concisas, conversacionales para voz.
- Cifras: "trescientos mil pesos", no "$300.000" (en voz).

REGLAS:
- NUNCA inventes datos. Si vacío, dilo.
- Cuando el jefe confirme ("sí", "dale", "hazlo"), ejecuta de inmediato.
- Para POS con efectivo, requiere caja abierta.
- Zona horaria: America/Bogota.`;

module.exports = {
    ADMIN_TOOLS: ALL_TOOLS,
    ADMIN_SYSTEM_PROMPT: ALL_SYSTEM_PROMPT,
    executeFunction,
};
