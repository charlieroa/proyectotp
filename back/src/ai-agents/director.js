'use strict';

const { chatCompletion } = require('./shared/openai');

const AGENT_DESCRIPTIONS = {
    recepcion: 'AGENDA: ver/crear/cancelar/reagendar citas, fichero digital, ubicación de estilistas, clientes atendidos hoy',
    pos: 'COBROS Y CAJA: cobrar tickets, vender productos/servicios, abrir/cerrar caja, registrar movimientos de caja, anular tickets',
    inventario: 'PRODUCTOS: crear/editar productos, ajustar stock, ver stock bajo, productos más vendidos, categorías de productos',
    personal: 'ESTILISTAS: crear/editar/desactivar estilistas, horarios laborales, nómina, préstamos a personal, compras de personal',
    reportes: 'REPORTES: ventas del día/periodo, rendimiento de estilistas, comparativos, flujo de caja, top clientes, servicios más populares',
    config: 'CONFIGURACIÓN: info del salón, horario del salón, servicios (crear/editar/listar), categorías de servicio, promociones',
    marketing: 'CLIENTES Y CAMPAÑAS: listar/buscar/crear clientes, historial de cliente, campañas de email a inactivos',
};

const ROUTER_PROMPT = `Eres el ENRUTADOR del asistente de un salón. Decides QUÉ AGENTE ESPECIALIZADO atiende el mensaje.

AGENTES:
${Object.entries(AGENT_DESCRIPTIONS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

PALABRAS CLAVE (usa estas pistas):
- pos: caja, cobrar, cobro, cobra, ticket, venta, factura, vender, cobranza, anular, pago, propina, "como esta la caja", "ver caja", "abrir caja", "cerrar caja", efectivo, tarjeta, transferencia, registro de caja
- inventario: producto, productos, stock, inventario, shampoo, gel, crema, "stock bajo", categoría producto, mas vendido
- personal: estilista, estilistas, empleado, nómina, comision, prestamo, salario, despedir, contratar, "horario de [nombre]", compra estilista
- reportes: ventas, vendí, vendi, facturé, ingresos, rendimiento, comparativo, top clientes, flujo de caja, balance, "cuánto vendi", popular
- config: salón, configuración, configurar, info del salón, servicio, servicios, dirección, teléfono del salón, horario del salón, promoción, categoría servicio
- marketing: cliente, clientes, base de datos, campaña, email, inactivos, historial cliente, contactar
- recepcion: cita, citas, agenda, agendar, reagendar, cancelar cita, fichero, digiturno, ubicación estilista, atendidos hoy

REGLAS:
- Responde SOLO con el nombre del agente en minúsculas, sin nada más.
- Saludos puros ("hola", "buenas") → recepcion.
- Preguntas sobre "el salón" o "configuración" → config.
- Preguntas sobre "la caja", "ventas en efectivo", "cuánto hay en caja" → pos.
- Preguntas sobre "cuánto vendí", "ingresos", reportes financieros → reportes.

EJEMPLOS:
- "cobra un corte de 25 mil a Juan en efectivo" → pos
- "abre la caja con 50 mil" → pos
- "como esta la caja" → pos
- "ver caja actual" → pos
- "agenda cita para mañana 3pm" → recepcion
- "cancela la cita de las 4" → recepcion
- "cuanto vendi hoy" → reportes
- "ranking de estilistas" → reportes
- "comparativo del mes" → reportes
- "crea un producto shampoo a 30 mil" → inventario
- "cuanto stock me queda de gel" → inventario
- "genera nomina de Carlos" → personal
- "presta 200 mil a Carlos" → personal
- "cambia horario de Carlos" → personal
- "envia campaña a inactivos" → marketing
- "lista mis clientes" → marketing
- "como esta configurado el salon" → config
- "cambia la direccion del salon" → config
- "lista mis servicios" → config
- "crea promocion 15% en cortes" → config

Responde SOLO con el nombre.`;

async function routeMessage({ message, history = [], tenantId }) {
    const messages = [
        { role: 'system', content: ROUTER_PROMPT },
        ...history.slice(-4).map(h => ({ role: h.role, content: String(h.content || '').slice(0, 300) })),
        { role: 'user', content: message },
    ];

    try {
        const data = await chatCompletion({
            messages,
            temperature: 0,
            maxTokens: 10,
            tenantId,
            label: 'admin_router',
        });
        const raw = (data.choices?.[0]?.message?.content || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        if (AGENT_DESCRIPTIONS[raw]) return raw;
    } catch (err) {
        console.warn('[director] routing failed, defaulting to recepcion:', err.message);
    }
    return 'recepcion';
}

module.exports = { routeMessage, AGENT_DESCRIPTIONS };
