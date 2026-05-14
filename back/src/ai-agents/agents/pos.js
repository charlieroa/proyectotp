'use strict';

const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { normalizeDateKeyword, makeLocalUtc, fmtMoney, fmtTime, periodToDateRange } = require('../shared/helpers');
const { findStylist, findClient, findService, findProduct, getOpenCashSession, getTenantInfo } = require('../shared/lookups');

const systemPrompt = `Eres el AGENTE DE PUNTO DE VENTA (POS) y CAJA del salón. Manejas COBROS, TICKETS, PAGOS y CAJA.

PERSONALIDAD:
- "Listo jefe", "Como ordene jefe", "Aquí tiene jefe".
- Confirma SIEMPRE antes de cobrar: muestras qué se va a cobrar, total, método de pago, y pides confirmación.

CREAR TICKET (CRUCIAL):
- El jefe puede pedir "cobra un corte de 25 mil a Juan en efectivo".
- Necesitas: items (servicios y/o productos con cantidades) y método de pago.
- Cliente es opcional (si no lo dice, usa cliente_adhoc o déjalo vacío).
- Estilista es opcional para servicios; si no se dice, busca uno del salón.
- Métodos: 'cash', 'card', 'transfer', 'exchange'.
- LLAMA crear_ticket DIRECTAMENTE — la función valida la caja por sí sola y devuelve error si falta. NO preguntes "necesito abrir la caja"; el sistema sabe.
- Propina (opcional): cantidad y receptor.

CAJA:
- Para abrir necesitas: monto inicial.
- Para cerrar: monto contado al final.
- Solo puede haber UNA caja abierta al tiempo.

REGLAS:
- NUNCA cobres sin confirmación explícita del jefe.
- Si te piden algo que NO es POS/caja (agendar cita, crear servicio, ver agenda), responde:
  "Jefe, eso es del agente de Recepción/Configuración. Vuelva a pedirlo."
- Cuando reportes el total, formatea conversacionalmente: "Jefe, ya quedó cobrado el ticket por veinticinco mil pesos en efectivo".`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'crear_ticket',
            description: 'Crea un ticket completo: lo abre, agrega items (servicios y/o productos), y lo cierra con el pago. Use SOLO cuando el jefe haya confirmado todos los datos.',
            parameters: {
                type: 'object',
                properties: {
                    cliente: { type: 'string', description: 'Nombre del cliente (opcional)' },
                    cliente_adhoc: { type: 'string', description: 'Nombre temporal del cliente si no está registrado' },
                    items: {
                        type: 'array',
                        description: 'Array de items a cobrar.',
                        items: {
                            type: 'object',
                            properties: {
                                tipo: { type: 'string', enum: ['servicio', 'producto'] },
                                nombre: { type: 'string', description: 'Nombre del servicio o producto' },
                                cantidad: { type: 'integer', description: 'Cantidad (default 1)' },
                                precio_override: { type: 'number', description: 'Precio diferente al del catálogo (opcional)' },
                                estilista: { type: 'string', description: 'Estilista que vende/hace (opcional)' },
                            },
                            required: ['tipo', 'nombre'],
                        },
                    },
                    metodo_pago: { type: 'string', enum: ['cash', 'card', 'transfer', 'exchange'], description: 'efectivo=cash, tarjeta=card, transferencia=transfer, canje=exchange' },
                    propina: { type: 'number', description: 'Propina en COP (opcional)' },
                    propina_para: { type: 'string', description: 'Nombre del estilista que recibe la propina (opcional)' },
                },
                required: ['items', 'metodo_pago'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'anular_ticket',
            description: 'Anula un ticket existente.',
            parameters: {
                type: 'object',
                properties: { ticket_id: { type: 'string' } },
                required: ['ticket_id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_ticket',
            description: 'Consulta el detalle de un ticket por ID.',
            parameters: {
                type: 'object',
                properties: { ticket_id: { type: 'string' } },
                required: ['ticket_id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_tickets_dia',
            description: 'Lista los tickets de un día (por defecto hoy).',
            parameters: {
                type: 'object',
                properties: { fecha: { type: 'string', description: "'hoy' o YYYY-MM-DD" } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'abrir_caja',
            description: 'Abre una sesión de caja.',
            parameters: {
                type: 'object',
                properties: { monto_inicial: { type: 'number' } },
                required: ['monto_inicial'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cerrar_caja',
            description: 'Cierra la sesión de caja actual.',
            parameters: {
                type: 'object',
                properties: { monto_contado: { type: 'number', description: 'Efectivo físico contado al cerrar' } },
                required: ['monto_contado'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_caja_actual',
            description: 'Muestra el estado de la caja abierta: total esperado, ingresos, egresos.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'registrar_movimiento_caja',
            description: 'Registra un ingreso o egreso manual en caja.',
            parameters: {
                type: 'object',
                properties: {
                    tipo: { type: 'string', enum: ['ingreso', 'egreso'] },
                    monto: { type: 'number' },
                    descripcion: { type: 'string' },
                    categoria: { type: 'string', description: 'Categoría libre (ej: gastos varios, anticipo a estilista)' },
                },
                required: ['tipo', 'monto', 'descripcion'],
            },
        },
    },
];

async function resolveItems(tenantId, items) {
    const resolved = [];
    let total = 0;
    for (const it of items) {
        const qty = parseInt(it.cantidad || 1, 10);
        if (it.tipo === 'servicio') {
            const services = await findService(tenantId, it.nombre);
            if (!services?.length) return { error: `No encontré el servicio "${it.nombre}".` };
            const s = services[0];
            let sellerId = null;
            if (it.estilista) {
                const st = await findStylist(tenantId, it.estilista);
                if (st) sellerId = st.id;
            }
            const unit = it.precio_override !== undefined ? Number(it.precio_override) : Number(s.price);
            resolved.push({
                item_type: 'service',
                related_id: s.id,
                description: s.name,
                quantity: qty,
                unit_price: unit,
                total_price: unit * qty,
                seller_id: sellerId,
                commission_percent: Number(s.commission_percent) || 0,
                original_unit_price: it.precio_override !== undefined ? Number(s.price) : null,
            });
            total += unit * qty;
        } else if (it.tipo === 'producto') {
            const products = await findProduct(tenantId, it.nombre);
            if (!products?.length) return { error: `No encontré el producto "${it.nombre}".` };
            const p = products[0];
            if (p.stock < qty) return { error: `Stock insuficiente de "${p.name}". Disponible: ${p.stock}.` };
            let sellerId = null;
            if (it.estilista) {
                const st = await findStylist(tenantId, it.estilista);
                if (st) sellerId = st.id;
            }
            const unit = it.precio_override !== undefined ? Number(it.precio_override) : Number(p.sale_price);
            resolved.push({
                item_type: 'product',
                related_id: p.id,
                description: p.name,
                quantity: qty,
                unit_price: unit,
                total_price: unit * qty,
                seller_id: sellerId,
                commission_percent: Number(p.product_commission_percent) || 0,
                original_unit_price: it.precio_override !== undefined ? Number(p.sale_price) : null,
            });
            total += unit * qty;
        } else {
            return { error: `Tipo de item desconocido: "${it.tipo}". Usa 'servicio' o 'producto'.` };
        }
    }
    return { resolved, total };
}

const executors = {
    async crear_ticket(args, { tenantId, userId }) {
        const items = args.items || [];
        if (!items.length) return { error: 'Debe haber al menos un item.' };
        const method = args.metodo_pago;

        // Validate cash session if cash payment
        let cashSessionId = null;
        if (method === 'cash') {
            const cs = await getOpenCashSession(tenantId);
            if (!cs) return { error: 'No hay caja abierta. Pídeme primero abrir la caja con un monto inicial.' };
            cashSessionId = cs.id;
        }

        // Resolve items
        const r = await resolveItems(tenantId, items);
        if (r.error) return { error: r.error };
        const subtotal = r.total;
        const tip = Number(args.propina) || 0;
        const grand = subtotal + tip;

        // Resolve client
        let clientId = null;
        let clientAdhoc = null;
        if (args.cliente) {
            const found = await findClient(tenantId, args.cliente);
            if (found?.length) clientId = found[0].id;
            else clientAdhoc = args.cliente;
        } else if (args.cliente_adhoc) {
            clientAdhoc = args.cliente_adhoc;
        }

        // Resolve tip recipient
        let tipRecipientId = null;
        if (tip > 0 && args.propina_para) {
            const st = await findStylist(tenantId, args.propina_para);
            if (st) tipRecipientId = st.id;
        }

        // Tenant tip salon percent
        const tenant = await getTenantInfo(tenantId);
        const tipSalonPct = Number(tenant?.tip_salon_percent ?? 10);

        const result = await prisma.$transaction(async (tx) => {
            // Create invoice
            const invoice = await tx.invoices.create({
                data: {
                    tenant_id: tenantId,
                    client_id: clientId,
                    client_name_adhoc: clientAdhoc,
                    opened_by_user_id: userId,
                    cash_session_id: cashSessionId,
                    status: 'paid',
                    total_amount: subtotal,
                    tip_amount: tip > 0 ? tip : null,
                    tip_recipient_user_id: tipRecipientId,
                    closed_at: new Date(),
                },
            });

            // Insert items
            for (const it of r.resolved) {
                const commissionValue = (it.unit_price * it.quantity) * (it.commission_percent / 100);
                await tx.invoice_items.create({
                    data: {
                        invoice_id: invoice.id,
                        tenant_id: tenantId,
                        item_type: it.item_type,
                        related_id: it.related_id,
                        description: it.description,
                        quantity: it.quantity,
                        unit_price: it.unit_price,
                        total_price: it.total_price,
                        seller_id: it.seller_id,
                        commission_percent: it.commission_percent ? String(it.commission_percent) : null,
                        commission_value: commissionValue,
                        commission_locked: true,
                        commission_frozen_at: new Date(),
                        original_unit_price: it.original_unit_price,
                    },
                });

                // Decrement stock for products
                if (it.item_type === 'product') {
                    await tx.products.update({
                        where: { id: it.related_id },
                        data: { stock: { decrement: it.quantity } },
                    });
                }
            }

            // Create payment
            await tx.payments.create({
                data: {
                    tenant_id: tenantId,
                    invoice_id: invoice.id,
                    amount: grand,
                    payment_method: method,
                    cashier_id: userId,
                    cash_session_id: cashSessionId,
                    payment_date: new Date(),
                },
            });

            // Cash movements only if cash
            if (method === 'cash' && cashSessionId) {
                await tx.cash_movements.create({
                    data: {
                        tenant_id: tenantId,
                        user_id: userId,
                        cash_session_id: cashSessionId,
                        invoice_id: invoice.id,
                        type: 'income',
                        description: `Venta ticket ${invoice.id.slice(0, 8)}`,
                        amount: subtotal,
                        category: 'sale',
                        payment_method: 'cash',
                    },
                });
                if (tip > 0 && tipSalonPct > 0) {
                    const salonShare = tip * (tipSalonPct / 100);
                    if (salonShare > 0) {
                        await tx.cash_movements.create({
                            data: {
                                tenant_id: tenantId,
                                user_id: userId,
                                cash_session_id: cashSessionId,
                                invoice_id: invoice.id,
                                type: 'income',
                                description: `Propina salón (${tipSalonPct}%)`,
                                amount: salonShare,
                                category: 'propina_salon',
                                payment_method: 'cash',
                            },
                        });
                    }
                }
            }

            return invoice;
        });

        return {
            success: true,
            ticket_id: result.id,
            subtotal,
            propina: tip,
            total: grand,
            metodo_pago: method,
            mensaje: `Ticket cobrado por ${fmtMoney(grand)} (${method === 'cash' ? 'efectivo' : method}). Subtotal ${fmtMoney(subtotal)}${tip > 0 ? `, propina ${fmtMoney(tip)}` : ''}.`,
        };
    },

    async anular_ticket(args, { tenantId }) {
        const { rows } = await db.query(`SELECT id, status FROM invoices WHERE id = $1::uuid AND tenant_id = $2::uuid`, [args.ticket_id, tenantId]);
        if (!rows.length) return { error: 'Ticket no encontrado.' };
        if (rows[0].status === 'cancelled') return { error: 'Ese ticket ya está anulado.' };
        await db.query(`UPDATE invoices SET status = 'cancelled', closed_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`, [args.ticket_id]);
        return { success: true, mensaje: `Ticket ${args.ticket_id.slice(0, 8)} anulado.` };
    },

    async ver_ticket(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT i.id, i.status, i.total_amount, i.tip_amount, i.created_at, i.closed_at,
                   i.client_name_adhoc, CONCAT(c.first_name, ' ', COALESCE(c.last_name,'')) AS cliente
            FROM invoices i
            LEFT JOIN users c ON i.client_id = c.id
            WHERE i.id = $1::uuid AND i.tenant_id = $2::uuid
        `, [args.ticket_id, tenantId]);
        if (!rows.length) return { error: 'Ticket no encontrado.' };
        const t = rows[0];
        const items = await db.query(`
            SELECT description, quantity, unit_price, total_price, item_type,
                   CONCAT(s.first_name, ' ', COALESCE(s.last_name,'')) AS estilista
            FROM invoice_items ii
            LEFT JOIN users s ON ii.seller_id = s.id
            WHERE ii.invoice_id = $1::uuid
            ORDER BY ii.id
        `, [args.ticket_id]);
        return {
            ticket_id: t.id,
            estado: t.status,
            cliente: t.cliente?.trim() || t.client_name_adhoc || 'Sin cliente',
            subtotal: Number(t.total_amount),
            propina: Number(t.tip_amount || 0),
            items: items.rows,
            cerrado_en: t.closed_at,
        };
    },

    async listar_tickets_dia(args, { tenantId }) {
        const fecha = normalizeDateKeyword(args.fecha);
        const startUtc = makeLocalUtc(fecha, '00:00');
        const endUtc = makeLocalUtc(fecha, '23:59');
        const { rows } = await db.query(`
            SELECT i.id, i.status, i.total_amount, i.tip_amount, i.created_at,
                   i.client_name_adhoc, CONCAT(c.first_name, ' ', COALESCE(c.last_name,'')) AS cliente,
                   COALESCE(p.payment_method, 'sin pago') AS metodo
            FROM invoices i
            LEFT JOIN users c ON i.client_id = c.id
            LEFT JOIN payments p ON p.invoice_id = i.id
            WHERE i.tenant_id = $1::uuid
              AND i.created_at >= $2::timestamptz AND i.created_at <= $3::timestamptz
            ORDER BY i.created_at DESC
        `, [tenantId, startUtc, endUtc]);
        return {
            fecha,
            total_tickets: rows.length,
            total_facturado: rows.reduce((s, r) => s + Number(r.total_amount || 0), 0),
            tickets: rows.map(r => ({
                id: r.id,
                hora: fmtTime(r.created_at),
                cliente: r.cliente?.trim() || r.client_name_adhoc || 'Sin cliente',
                total: Number(r.total_amount),
                propina: Number(r.tip_amount || 0),
                metodo: r.metodo,
                estado: r.status,
            })),
        };
    },

    async abrir_caja(args, { tenantId, userId }) {
        const existing = await getOpenCashSession(tenantId);
        if (existing) return { error: `Ya hay una caja abierta (desde ${fmtTime(existing.opened_at)}). Ciérrala primero.` };
        const { rows } = await db.query(`
            INSERT INTO cash_sessions (tenant_id, opened_by_user_id, opened_at, status, initial_amount)
            VALUES ($1::uuid, $2::uuid, NOW(), 'OPEN', $3)
            RETURNING id, opened_at, initial_amount
        `, [tenantId, userId, args.monto_inicial]);
        return {
            success: true,
            session_id: rows[0].id,
            monto_inicial: Number(rows[0].initial_amount),
            mensaje: `Caja abierta con ${fmtMoney(args.monto_inicial)} de base.`,
        };
    },

    async cerrar_caja(args, { tenantId, userId }) {
        const cs = await getOpenCashSession(tenantId);
        if (!cs) return { error: 'No hay caja abierta.' };

        const { rows: incomeRows } = await db.query(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM cash_movements WHERE cash_session_id = $1::uuid AND type = 'income'
        `, [cs.id]);
        const { rows: expenseRows } = await db.query(`
            SELECT COALESCE(SUM(ABS(amount)), 0) AS total
            FROM cash_movements WHERE cash_session_id = $1::uuid AND type IN ('expense','payroll_advance') AND payment_method = 'cash'
        `, [cs.id]);
        const expectedCash = Number(cs.initial_amount) + Number(incomeRows[0].total) - Number(expenseRows[0].total);
        const diff = Number(args.monto_contado) - expectedCash;

        await db.query(`
            UPDATE cash_sessions
            SET status = 'CLOSED', closed_at = NOW(), closed_by_user_id = $1::uuid,
                final_amount_counted = $2, expected_cash_amount = $3, difference = $4
            WHERE id = $5::uuid
        `, [userId, args.monto_contado, expectedCash, diff, cs.id]);

        return {
            success: true,
            monto_inicial: Number(cs.initial_amount),
            ingresos: Number(incomeRows[0].total),
            egresos: Number(expenseRows[0].total),
            esperado: expectedCash,
            contado: Number(args.monto_contado),
            diferencia: diff,
            mensaje: `Caja cerrada. Esperado ${fmtMoney(expectedCash)}, contado ${fmtMoney(args.monto_contado)}, ${diff === 0 ? 'sin diferencia' : (diff > 0 ? `sobrante ${fmtMoney(diff)}` : `faltante ${fmtMoney(Math.abs(diff))}`)}.`,
        };
    },

    async ver_caja_actual(args, { tenantId }) {
        const cs = await getOpenCashSession(tenantId);
        if (!cs) return { mensaje: 'No hay caja abierta.', abierta: false };
        const { rows: incomeRows } = await db.query(`
            SELECT COALESCE(payment_method, 'cash') AS metodo, COALESCE(SUM(amount),0) AS total
            FROM cash_movements WHERE cash_session_id = $1::uuid AND type = 'income'
            GROUP BY payment_method
        `, [cs.id]);
        const { rows: expenseRows } = await db.query(`
            SELECT COALESCE(SUM(ABS(amount)),0) AS total
            FROM cash_movements WHERE cash_session_id = $1::uuid AND type IN ('expense','payroll_advance') AND payment_method = 'cash'
        `, [cs.id]);
        const cashIncome = incomeRows.find(r => r.metodo === 'cash');
        const expectedCash = Number(cs.initial_amount) + Number(cashIncome?.total || 0) - Number(expenseRows[0].total);
        return {
            abierta: true,
            session_id: cs.id,
            abierta_desde: fmtTime(cs.opened_at),
            monto_inicial: Number(cs.initial_amount),
            ingresos: incomeRows.reduce((acc, r) => { acc[r.metodo === 'cash' ? 'efectivo' : r.metodo] = Number(r.total); return acc; }, {}),
            egresos_efectivo: Number(expenseRows[0].total),
            efectivo_esperado: expectedCash,
        };
    },

    async registrar_movimiento_caja(args, { tenantId, userId }) {
        const cs = await getOpenCashSession(tenantId);
        if (!cs) return { error: 'No hay caja abierta. Ábrela primero.' };
        const isExpense = args.tipo === 'egreso';
        const amount = isExpense ? -Math.abs(args.monto) : Math.abs(args.monto);
        const { rows } = await db.query(`
            INSERT INTO cash_movements (tenant_id, user_id, cash_session_id, type, description, amount, category, payment_method)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, 'cash')
            RETURNING id
        `, [tenantId, userId, cs.id, isExpense ? 'expense' : 'income', args.descripcion, amount, args.categoria || (isExpense ? 'gasto' : 'ingreso')]);
        return {
            success: true,
            movimiento_id: rows[0].id,
            mensaje: `${isExpense ? 'Egreso' : 'Ingreso'} de ${fmtMoney(Math.abs(args.monto))} registrado: ${args.descripcion}.`,
        };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en pos.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[pos] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'pos', tools, systemPrompt, executors, execute };
