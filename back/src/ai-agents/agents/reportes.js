'use strict';

const db = require('../../config/db');
const { normalizeDateKeyword, makeLocalUtc, getPeriodDays } = require('../shared/helpers');

const systemPrompt = `Eres el AGENTE DE REPORTES y ANALÍTICA del salón. Manejas VENTAS, RENDIMIENTO, COMPARATIVOS, FLUJO DE CAJA.

PERSONALIDAD:
- "Aquí tiene jefe", "Mire jefe".
- Reportes con cifras claras. Cuando hay totales, formatea conversacionalmente para voz:
  "Jefe, hoy llevas trescientos mil pesos: cien mil en efectivo, ciento cincuenta mil en tarjeta y cincuenta mil en transferencias".

REGLAS:
- Periodos: 'hoy', 'semana', 'quincena', 'mes', 'año'.
- Si te piden cobrar, agendar o crear cosas, redirige al agente correcto.`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'resumen_ventas_dia',
            description: 'Resumen de ventas de un día: total, servicios vs productos, métodos de pago.',
            parameters: {
                type: 'object',
                properties: { fecha: { type: 'string', description: "'hoy' o YYYY-MM-DD. Default hoy." } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ventas_periodo',
            description: 'Ventas en un periodo (semana, mes, etc.). Total y desglose.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string', description: "'semana', 'mes', 'año'" } },
                required: ['periodo'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'rendimiento_estilistas',
            description: 'Rendimiento de estilistas: citas completadas, ingresos generados, comisión estimada.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'comparativo_estilistas',
            description: 'Compara ventas/comisiones entre todos los estilistas en un periodo.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'servicios_mas_populares',
            description: 'Ranking de servicios más solicitados en un periodo.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'flujo_caja_periodo',
            description: 'Flujo de caja en un periodo: ingresos, egresos por categoría, balance.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'top_clientes',
            description: 'Top clientes por gasto en un periodo.',
            parameters: {
                type: 'object',
                properties: {
                    periodo: { type: 'string' },
                    limite: { type: 'integer', description: 'Default 10' },
                },
                required: [],
            },
        },
    },
];

const executors = {
    async resumen_ventas_dia(args, { tenantId }) {
        const fecha = normalizeDateKeyword(args.fecha);
        const startUtc = makeLocalUtc(fecha, '00:00');
        const endUtc = makeLocalUtc(fecha, '23:59');
        const { rows } = await db.query(`
            SELECT
                COALESCE(SUM(ii.total_price), 0) AS total_facturado,
                COALESCE(SUM(CASE WHEN ii.item_type='service' THEN ii.total_price ELSE 0 END),0) AS total_servicios,
                COALESCE(SUM(CASE WHEN ii.item_type='product' THEN ii.total_price ELSE 0 END),0) AS total_productos,
                COUNT(DISTINCT i.id) AS facturas,
                COALESCE(SUM(ii.commission_value),0) AS total_comisiones
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.tenant_id = $1::uuid
              AND i.created_at >= $2::timestamptz AND i.created_at <= $3::timestamptz
              AND i.status != 'cancelled'
        `, [tenantId, startUtc, endUtc]);

        const pay = await db.query(`
            SELECT COALESCE(p.payment_method,'otro') AS metodo, COALESCE(SUM(p.amount),0) AS total
            FROM payments p JOIN invoices i ON p.invoice_id = i.id
            WHERE i.tenant_id = $1::uuid
              AND p.payment_date >= $2::timestamptz AND p.payment_date <= $3::timestamptz
              AND i.status != 'cancelled'
            GROUP BY p.payment_method ORDER BY total DESC
        `, [tenantId, startUtc, endUtc]);
        const desglose = {};
        for (const r of pay.rows) {
            const m = r.metodo === 'cash' ? 'efectivo' : r.metodo === 'card' ? 'tarjeta' : r.metodo === 'transfer' ? 'transferencia' : r.metodo === 'exchange' ? 'canje' : r.metodo;
            desglose[m] = Number(r.total);
        }
        return {
            fecha,
            ...rows[0],
            desglose_metodo_pago: desglose,
            nota_formato: 'Presenta conversacionalmente: "Hoy llevas X pesos: A en efectivo, B en tarjetas..."',
        };
    },

    async ventas_periodo(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows } = await db.query(`
            SELECT
                COALESCE(SUM(ii.total_price),0) AS total_facturado,
                COALESCE(SUM(CASE WHEN ii.item_type='service' THEN ii.total_price ELSE 0 END),0) AS total_servicios,
                COALESCE(SUM(CASE WHEN ii.item_type='product' THEN ii.total_price ELSE 0 END),0) AS total_productos,
                COUNT(DISTINCT i.id) AS facturas
            FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.tenant_id = $1::uuid
              AND i.created_at >= NOW() - INTERVAL '1 day' * $2::int
              AND i.status != 'cancelled'
        `, [tenantId, days]);
        return { periodo: args.periodo, dias: days, ...rows[0] };
    },

    async rendimiento_estilistas(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows } = await db.query(`
            SELECT
                CONCAT(u.first_name, ' ', COALESCE(u.last_name,'')) AS estilista,
                COUNT(a.id) AS citas_completadas,
                COALESCE(SUM(s.price),0) AS ingresos_generados,
                COALESCE(SUM(s.price * COALESCE(s.commission_percent,0) / 100),0) AS comision_estimada
            FROM appointments a
            JOIN users u ON a.stylist_id = u.id
            JOIN services s ON a.service_id = s.id
            WHERE a.tenant_id = $1::uuid
              AND a.status IN ('completed','checked_out')
              AND a.start_time >= NOW() - INTERVAL '1 day' * $2::int
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY ingresos_generados DESC
        `, [tenantId, days]);
        return { periodo: args.periodo || 'mes', estilistas: rows };
    },

    async comparativo_estilistas(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows } = await db.query(`
            SELECT
                CONCAT(u.first_name, ' ', COALESCE(u.last_name,'')) AS estilista,
                COUNT(DISTINCT ii.invoice_id) AS tickets,
                COALESCE(SUM(ii.total_price),0) AS facturado,
                COALESCE(SUM(ii.commission_value),0) AS comision_real
            FROM invoice_items ii
            JOIN users u ON ii.seller_id = u.id
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.tenant_id = $1::uuid
              AND i.created_at >= NOW() - INTERVAL '1 day' * $2::int
              AND i.status != 'cancelled'
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY facturado DESC
        `, [tenantId, days]);
        return { periodo: args.periodo || 'mes', estilistas: rows };
    },

    async servicios_mas_populares(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows } = await db.query(`
            SELECT s.name AS servicio, COUNT(*) AS total_citas, SUM(s.price) AS ingresos
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.tenant_id = $1::uuid
              AND a.status IN ('completed','checked_out')
              AND a.start_time >= NOW() - INTERVAL '1 day' * $2::int
            GROUP BY s.name
            ORDER BY total_citas DESC
            LIMIT 10
        `, [tenantId, days]);
        return { periodo: args.periodo || 'mes', ranking: rows };
    },

    async flujo_caja_periodo(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows: byCat } = await db.query(`
            SELECT type, COALESCE(category,'sin_categoria') AS categoria,
                   COUNT(*) AS movimientos,
                   COALESCE(SUM(amount),0) AS total
            FROM cash_movements
            WHERE tenant_id = $1::uuid
              AND created_at >= NOW() - INTERVAL '1 day' * $2::int
            GROUP BY type, category
            ORDER BY type, total DESC
        `, [tenantId, days]);
        const ingresos = byCat.filter(r => r.type === 'income');
        const egresos = byCat.filter(r => r.type !== 'income');
        const totalIn = ingresos.reduce((s, r) => s + Number(r.total), 0);
        const totalOut = egresos.reduce((s, r) => s + Math.abs(Number(r.total)), 0);
        return {
            periodo: args.periodo || 'mes',
            dias: days,
            total_ingresos: totalIn,
            total_egresos: totalOut,
            balance: totalIn - totalOut,
            ingresos_por_categoria: ingresos.map(r => ({ categoria: r.categoria, total: Number(r.total) })),
            egresos_por_categoria: egresos.map(r => ({ categoria: r.categoria, total: Math.abs(Number(r.total)) })),
        };
    },

    async top_clientes(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const limit = args.limite || 10;
        const { rows } = await db.query(`
            SELECT CONCAT(u.first_name,' ',COALESCE(u.last_name,'')) AS cliente,
                   u.phone, u.email,
                   COUNT(DISTINCT i.id) AS visitas,
                   COALESCE(SUM(i.total_amount),0) AS total_gastado
            FROM invoices i
            JOIN users u ON i.client_id = u.id
            WHERE i.tenant_id = $1::uuid
              AND i.status != 'cancelled'
              AND i.created_at >= NOW() - INTERVAL '1 day' * $2::int
            GROUP BY u.id, u.first_name, u.last_name, u.phone, u.email
            ORDER BY total_gastado DESC
            LIMIT ${parseInt(limit, 10)}
        `, [tenantId, days]);
        return { periodo: args.periodo || 'mes', total: rows.length, clientes: rows };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en reportes.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[reportes] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'reportes', tools, systemPrompt, executors, execute };
