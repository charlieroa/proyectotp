// src/controllers/whatsappStylistController.js
// Tools y prompt para el bot de WhatsApp del estilista (role_id = 3).
// El estilista se identifica automáticamente por su número de WhatsApp; no requiere usuario/contraseña.
'use strict';

const prisma = require('../config/prisma');
const { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');
const { formatInTimeZone, utcToZonedTime } = require('date-fns-tz');

const TIME_ZONE = 'America/Bogota';

// ─── Helpers ───────────────────────────────────────────────────────────
const fmtCO = (n) => {
    const num = Math.round(Number(n) || 0);
    return `$${num.toLocaleString('es-CO')}`;
};

const startOfDayBogota = (d = new Date()) => {
    const zoned = utcToZonedTime(d, TIME_ZONE);
    zoned.setHours(0, 0, 0, 0);
    return zoned;
};

const endOfDayBogota = (d = new Date()) => {
    const zoned = utcToZonedTime(d, TIME_ZONE);
    zoned.setHours(23, 59, 59, 999);
    return zoned;
};

// ─── Tools (definiciones para OpenAI) ──────────────────────────────────
const STYLIST_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'mi_agenda_hoy',
            description: 'Lista las citas del estilista para HOY (próximas y completadas). Incluye hora, cliente, servicio y estado.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mi_agenda',
            description: 'Lista las citas del estilista para los próximos N días (default 7).',
            parameters: {
                type: 'object',
                properties: {
                    dias: { type: 'integer', description: 'Cantidad de días a partir de hoy (1-30)', minimum: 1, maximum: 30 }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_servicios_hoy',
            description: 'Cuántos servicios y productos llevó el estilista HOY (cobrados/cerrados). Incluye desglose por tipo.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_ganancias_hoy',
            description: 'Cuánto facturó el estilista HOY en bruto (suma de invoice_items que él vendió, ya cobrados).',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_comisiones_periodo',
            description: 'Comisiones acumuladas en un período (semana, mes, o rango personalizado). Útil para que el estilista sepa cuánto va ganando.',
            parameters: {
                type: 'object',
                properties: {
                    periodo: { type: 'string', enum: ['hoy', 'semana', 'mes'], description: 'Período predefinido' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mi_fichero',
            description: 'Posición actual del estilista en cada cola del fichero digital (por categoría de servicio).',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_anticipos_pendientes',
            description: 'Anticipos (cash_movements type=payroll_advance) que se le han dado al estilista y aún no se descontaron del próximo pago.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_prestamos_activos',
            description: 'Préstamos activos del estilista con cuotas pendientes y al día.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mi_resumen_dia',
            description: 'Resumen completo del día del estilista: servicios, ganancias, comisiones, próxima cita.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    // ─── ESCRITURA: armar tickets ────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'abrir_ticket',
            description: 'Abrir un ticket virtual nuevo para un cliente que llegó. Si el cliente está registrado lo busca por nombre o teléfono; si es walk-in (sin registro) usa solo el nombre.',
            parameters: {
                type: 'object',
                properties: {
                    cliente_nombre: { type: 'string', description: 'Nombre del cliente (registrado o walk-in)' },
                    cliente_telefono: { type: 'string', description: 'Teléfono del cliente (opcional, ayuda a encontrarlo si está registrado)' }
                },
                required: ['cliente_nombre']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'buscar_ticket',
            description: 'Busca tickets ABIERTOS por nombre del cliente para que el estilista pueda sumarse y agregar sus servicios/productos.',
            parameters: {
                type: 'object',
                properties: {
                    cliente_nombre: { type: 'string', description: 'Nombre del cliente (parcial OK)' }
                },
                required: ['cliente_nombre']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mi_ticket_actual',
            description: 'Devuelve el ticket abierto más reciente del estilista (donde él tenga ya items o haya abierto). Útil cuando dice "agrega un corte al ticket de María".',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'agregar_servicio_a_ticket',
            description: 'Agrega un servicio al ticket. La comisión se calcula automáticamente. El estilista queda como seller del item.',
            parameters: {
                type: 'object',
                properties: {
                    ticket_id: { type: 'string', description: 'UUID del ticket (devuelto por abrir_ticket o buscar_ticket)' },
                    servicio_nombre: { type: 'string', description: 'Nombre del servicio (parcial OK, el sistema lo encuentra)' },
                    precio: { type: 'number', description: 'Precio personalizado (opcional, si no se da usa el del catálogo). Solo se permite cambiar si el setting Modificar precio en caja está ON.' },
                    motivo_precio: { type: 'string', description: 'Motivo del cambio de precio (obligatorio si precio difiere del catálogo)' }
                },
                required: ['ticket_id', 'servicio_nombre']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'agregar_producto_a_ticket',
            description: 'Agrega un producto al ticket. El estilista queda como vendedor (para comisión por producto).',
            parameters: {
                type: 'object',
                properties: {
                    ticket_id: { type: 'string', description: 'UUID del ticket' },
                    producto_nombre: { type: 'string', description: 'Nombre del producto (parcial OK)' },
                    cantidad: { type: 'integer', description: 'Cantidad (default 1)', minimum: 1 }
                },
                required: ['ticket_id', 'producto_nombre']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'listar_servicios_disponibles',
            description: 'Lista los servicios disponibles en la peluquería (catálogo). Útil cuando el estilista no recuerda el nombre exacto de un servicio o quiere ver opciones. Si el estilista tiene servicios asignados específicamente, devuelve esos; si no, todos los del salón.',
            parameters: {
                type: 'object',
                properties: {
                    filtro: { type: 'string', description: 'Texto para filtrar servicios por nombre (opcional, ej: "corte", "color")' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'listar_productos_disponibles',
            description: 'Lista los productos vendibles a clientes. Útil cuando el estilista no recuerda el nombre exacto.',
            parameters: {
                type: 'object',
                properties: {
                    filtro: { type: 'string', description: 'Texto para filtrar productos por nombre (opcional)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'crear_cliente',
            description: 'Crea un cliente nuevo (registrado) en el salón. Útil cuando llega alguien que no estaba en el sistema y se le va a abrir un ticket.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string', description: 'Primer nombre del cliente' },
                    apellido: { type: 'string', description: 'Apellido del cliente (opcional)' },
                    telefono: { type: 'string', description: 'Teléfono del cliente (opcional pero recomendado)' }
                },
                required: ['nombre']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'mis_sucursales',
            description: 'Lista las sucursales (peluquerías) donde el estilista tiene acceso para trabajar. El estilista puede operar en su sucursal principal y en otras donde esté asignado.',
            parameters: { type: 'object', properties: {}, required: [] }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cambiar_sucursal',
            description: 'Cambia la sucursal activa donde el estilista está trabajando ahora. Las próximas operaciones (abrir ticket, agregar servicios, ver agenda) se harán en esa sucursal.',
            parameters: {
                type: 'object',
                properties: {
                    sucursal_id: { type: 'string', description: 'UUID de la sucursal (devuelto por mis_sucursales)' }
                },
                required: ['sucursal_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'modificar_precio_servicio',
            description: 'Modifica el precio de un servicio ya agregado al ticket. SOLO funciona si el dueño activó "Modificar precio en caja" en Settings. Requiere motivo obligatorio.',
            parameters: {
                type: 'object',
                properties: {
                    ticket_id: { type: 'string', description: 'UUID del ticket' },
                    item_id: { type: 'string', description: 'UUID del invoice_item (línea del servicio)' },
                    nuevo_precio: { type: 'number', description: 'Nuevo precio a cobrar' },
                    motivo: { type: 'string', description: 'Motivo del cambio (obligatorio, queda auditado)' }
                },
                required: ['ticket_id', 'item_id', 'nuevo_precio', 'motivo']
            }
        }
    }
];

const STYLIST_SYSTEM_PROMPT = `Eres el asistente personal del estilista en una peluquería. Hablas en español, tono cercano y profesional, como un compañero de trabajo.

REGLAS GENERALES:
- Responde con datos REALES llamando las funciones disponibles. Nunca inventes números.
- Sé directo y conciso: una respuesta corta vale más que un párrafo.
- Para WhatsApp: usa emojis con mesura, formato simple.
- TÚ NO COBRAS — el cobro lo hace el cajero/admin desde el sistema. Tú solo armas el ticket.

ARMAR TICKETS (flujo importante):
1. Cuando llega un cliente y no hay ticket abierto: usa "abrir_ticket" con el nombre del cliente.
2. Si otro estilista ya abrió ticket para ese cliente: usa "buscar_ticket" por nombre y agrégate al ticket existente con el mismo ticket_id.
3. Para agregar servicio: "agregar_servicio_a_ticket" — la comisión se calcula automáticamente y quedas como seller.
4. Para agregar producto: "agregar_producto_a_ticket" con nombre y cantidad.
5. SI EL SERVICIO/PRODUCTO NO SE ENCUENTRA (campo "no_encontrado": true en la respuesta): NO te disculpes ni cierres. Pregunta: "¿Quieres que revise tus servicios disponibles?" y si dice sí, llama "listar_servicios_disponibles" (con filtro si tienes pista) y muestra las opciones para que elija.
6. Si la peluquería tiene activado "Modificar precio en caja", puedes pasar precio personalizado al agregar servicio (con motivo obligatorio). Si está OFF, el sistema lo bloqueará.
7. Para ver tu ticket actual y ver el item_id de cada línea: "mi_ticket_actual".
8. Para cambiar el precio de un item ya agregado: "modificar_precio_servicio" — solo de TUS items.

CLIENTES NUEVOS:
- Si el cliente no existe en el sistema, usa "crear_cliente" con nombre y teléfono. Después abres su ticket normalmente.
- Si el cliente ya existe (por teléfono), "crear_cliente" lo detecta y lo devuelve sin duplicar.

MULTI-SUCURSAL:
- Si el estilista trabaja en varias peluquerías, usa "mis_sucursales" para listar a cuáles tiene acceso.
- Para cambiar la sucursal donde está trabajando ahora: "cambiar_sucursal" con el id. Las próximas operaciones (abrir ticket, agregar items, ver agenda) se harán ahí.

QUÉ NO HACES:
- NO cobras (no cierras tickets, no recibes pagos, no haces vueltas).
- NO agendas citas nuevas, no cancelas, no reprogramas.
- NO modificas el precio de items de OTROS estilistas.

EJEMPLOS:
- "Hoy llevas 5 servicios y has facturado $250.000. Te toca aprox $87.500 en comisiones 💪"
- "Listo, abrí el ticket para María Paula. Ticket: abc-123. ¿Qué servicio le hiciste?"
- "Encontré 2 productos que coinciden con 'shampoo': 1) Shampoo Loreal $25.000  2) Shampoo Pantene $18.000. ¿Cuál?"
- "Necesitas un motivo para cambiar el precio (queda auditado). ¿Por qué cambiaste de $50k a $30k?"`;

// ─── Implementación de tools ───────────────────────────────────────────

async function miAgendaHoy({ stylist_id, tenant_id }) {
    const start = startOfDayBogota();
    const end = endOfDayBogota();
    const rows = await prisma.appointments.findMany({
        where: {
            tenant_id,
            stylist_id,
            start_time: { gte: start, lte: end },
            status: { notIn: ['cancelled'] }
        },
        include: {
            services: { select: { name: true } },
            users_appointments_client_idTousers: { select: { first_name: true, last_name: true } }
        },
        orderBy: { start_time: 'asc' }
    });
    return {
        total: rows.length,
        citas: rows.map(a => ({
            hora: formatInTimeZone(a.start_time, TIME_ZONE, 'HH:mm'),
            cliente: `${a.users_appointments_client_idTousers?.first_name || ''} ${a.users_appointments_client_idTousers?.last_name || ''}`.trim() || 'Walk-in',
            servicio: a.services?.name || 'Servicio',
            estado: a.status
        }))
    };
}

async function miAgenda({ stylist_id, tenant_id, dias = 7 }) {
    const start = startOfDayBogota();
    const end = new Date(start.getTime() + dias * 86400000);
    const rows = await prisma.appointments.findMany({
        where: {
            tenant_id,
            stylist_id,
            start_time: { gte: start, lte: end },
            status: { notIn: ['cancelled'] }
        },
        include: {
            services: { select: { name: true } },
            users_appointments_client_idTousers: { select: { first_name: true, last_name: true } }
        },
        orderBy: { start_time: 'asc' }
    });
    return {
        total: rows.length,
        dias,
        citas: rows.map(a => ({
            fecha: formatInTimeZone(a.start_time, TIME_ZONE, 'yyyy-MM-dd'),
            hora: formatInTimeZone(a.start_time, TIME_ZONE, 'HH:mm'),
            cliente: `${a.users_appointments_client_idTousers?.first_name || ''} ${a.users_appointments_client_idTousers?.last_name || ''}`.trim() || 'Walk-in',
            servicio: a.services?.name || 'Servicio',
            estado: a.status
        }))
    };
}

async function misServiciosHoy({ stylist_id, tenant_id }) {
    const start = startOfDayBogota();
    const end = endOfDayBogota();
    const rows = await prisma.invoice_items.findMany({
        where: {
            tenant_id,
            seller_id: stylist_id,
            invoices: {
                status: { in: ['paid', 'closed', 'completed'] },
                created_at: { gte: start, lte: end }
            }
        },
        select: { item_type: true, quantity: true, total_price: true }
    });
    const servicios = rows.filter(r => r.item_type === 'service' || r.item_type === 'custom');
    const productos = rows.filter(r => r.item_type === 'product');
    return {
        total_items: rows.length,
        servicios: { count: servicios.length, total: servicios.reduce((s, r) => s + Number(r.total_price || 0), 0) },
        productos: { count: productos.length, total: productos.reduce((s, r) => s + Number(r.total_price || 0), 0) }
    };
}

async function misGananciasHoy({ stylist_id, tenant_id }) {
    const start = startOfDayBogota();
    const end = endOfDayBogota();
    const rows = await prisma.invoice_items.findMany({
        where: {
            tenant_id,
            seller_id: stylist_id,
            invoices: {
                status: { in: ['paid', 'closed', 'completed'] },
                created_at: { gte: start, lte: end }
            }
        },
        select: { total_price: true, commission_value: true }
    });
    const facturado = rows.reduce((s, r) => s + Number(r.total_price || 0), 0);
    const comisiones = rows.reduce((s, r) => s + Number(r.commission_value || 0), 0);
    return {
        total_facturado: facturado,
        total_comisiones: comisiones,
        items: rows.length,
        formato: { facturado: fmtCO(facturado), comisiones: fmtCO(comisiones) }
    };
}

async function misComisionesPeriodo({ stylist_id, tenant_id, periodo = 'mes' }) {
    let start, end;
    const now = new Date();
    if (periodo === 'hoy') { start = startOfDayBogota(now); end = endOfDayBogota(now); }
    else if (periodo === 'semana') { start = startOfWeek(utcToZonedTime(now, TIME_ZONE), { weekStartsOn: 1 }); end = endOfWeek(utcToZonedTime(now, TIME_ZONE), { weekStartsOn: 1 }); }
    else { start = startOfMonth(utcToZonedTime(now, TIME_ZONE)); end = endOfMonth(utcToZonedTime(now, TIME_ZONE)); }
    const rows = await prisma.invoice_items.findMany({
        where: {
            tenant_id,
            seller_id: stylist_id,
            invoices: {
                status: { in: ['paid', 'closed', 'completed'] },
                created_at: { gte: start, lte: end }
            }
        },
        select: { total_price: true, commission_value: true, item_type: true }
    });
    const total = rows.reduce((s, r) => s + Number(r.commission_value || 0), 0);
    const facturado = rows.reduce((s, r) => s + Number(r.total_price || 0), 0);
    return {
        periodo,
        desde: format(start, 'yyyy-MM-dd'),
        hasta: format(end, 'yyyy-MM-dd'),
        items: rows.length,
        comisiones_total: total,
        facturado_total: facturado,
        formato: { comisiones: fmtCO(total), facturado: fmtCO(facturado) }
    };
}

async function miFichero({ stylist_id, tenant_id }) {
    const rows = await prisma.stylist_queues.findMany({
        where: { tenant_id, stylist_id, is_active: true },
        include: { service_categories: { select: { name: true } } },
        orderBy: { position: 'asc' }
    });
    return {
        total_categorias: rows.length,
        colas: rows.map(q => ({
            categoria: q.service_categories?.name || 'Sin categoría',
            posicion: q.position,
            ultima_atencion: q.last_served_at ? formatInTimeZone(q.last_served_at, TIME_ZONE, 'HH:mm') : null
        }))
    };
}

async function misAnticiposPendientes({ stylist_id, tenant_id }) {
    // Anticipos (payroll_advance) en status='pending' (aún no descontados por un payroll cerrado).
    // Se relacionan al estilista vía related_entity_id (igual que en payrollController).
    const rows = await prisma.cash_movements.findMany({
        where: {
            tenant_id,
            related_entity_id: stylist_id,
            type: 'payroll_advance',
            status: 'pending'
        },
        select: { id: true, amount: true, description: true, created_at: true },
        orderBy: { created_at: 'desc' }
    });
    const total = rows.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
    return {
        total: rows.length,
        total_pendiente: total,
        formato_total: fmtCO(total),
        anticipos: rows.map(r => ({
            fecha: formatInTimeZone(r.created_at, TIME_ZONE, 'yyyy-MM-dd'),
            monto: Math.abs(Number(r.amount || 0)),
            descripcion: r.description
        }))
    };
}

async function misPrestamosActivos({ stylist_id, tenant_id }) {
    const loans = await prisma.staff_loans.findMany({
        where: { tenant_id, stylist_id, status: 'active' },
        include: {
            staff_loan_installments: {
                select: { installment_no: true, due_date: true, total_amount: true, status: true },
                orderBy: { installment_no: 'asc' }
            }
        }
    });
    return {
        total_prestamos: loans.length,
        prestamos: loans.map(l => {
            const cuotas = l.staff_loan_installments || [];
            const pendientes = cuotas.filter(c => c.status === 'pending');
            const pagadas = cuotas.filter(c => c.status === 'paid');
            const proximaCuota = pendientes[0] || null;
            const saldoPendiente = pendientes.reduce((s, c) => s + Number(c.total_amount || 0), 0);
            return {
                principal: Number(l.principal),
                interes_pct: Number(l.interest_rate_percent),
                semanas: l.term_weeks,
                cuotas_pagadas: pagadas.length,
                cuotas_pendientes: pendientes.length,
                saldo_pendiente: saldoPendiente,
                proxima_cuota: proximaCuota ? {
                    numero: proximaCuota.installment_no,
                    fecha: format(proximaCuota.due_date, 'yyyy-MM-dd'),
                    monto: Number(proximaCuota.total_amount)
                } : null
            };
        })
    };
}

async function miResumenDia({ stylist_id, tenant_id }) {
    const [agenda, servicios, ganancias, anticipos] = await Promise.all([
        miAgendaHoy({ stylist_id, tenant_id }),
        misServiciosHoy({ stylist_id, tenant_id }),
        misGananciasHoy({ stylist_id, tenant_id }),
        misAnticiposPendientes({ stylist_id, tenant_id })
    ]);
    const proxima = agenda.citas.find(c => ['scheduled', 'rescheduled', 'pending_approval'].includes(c.estado));
    return {
        agenda: { total_hoy: agenda.total, proxima_cita: proxima || null },
        ventas: servicios,
        ganancias_hoy: ganancias,
        anticipos_pendientes: { total: anticipos.total, monto: anticipos.total_pendiente }
    };
}

// ─── Escritura: armar tickets ──────────────────────────────────────────

async function assertTicketEnabled(tenant_id) {
    const t = await prisma.tenants.findUnique({
        where: { id: tenant_id },
        select: { ticket_virtual_enabled: true, price_override_enabled: true }
    });
    if (!t) throw new Error('Tenant no encontrado.');
    if (!t.ticket_virtual_enabled) throw new Error('El ticket virtual no está habilitado para este negocio.');
    return t;
}

async function recalcTicketTotal(invoice_id) {
    const agg = await prisma.invoice_items.aggregate({
        where: { invoice_id },
        _sum: { total_price: true }
    });
    const total = Number(agg._sum.total_price || 0);
    await prisma.invoices.update({
        where: { id: invoice_id },
        data: { total_amount: total, updated_at: new Date() }
    });
    return total;
}

async function abrirTicket({ stylist_id, tenant_id, cliente_nombre, cliente_telefono }) {
    await assertTicketEnabled(tenant_id);
    if (!cliente_nombre || cliente_nombre.trim().length < 2) {
        throw new Error('Necesito el nombre del cliente para abrir el ticket.');
    }
    let client_id = null;
    let resolved_name = cliente_nombre.trim();
    // 1) Buscar por teléfono primero (más preciso)
    if (cliente_telefono) {
        const phoneClean = cliente_telefono.replace(/[^\d]/g, '');
        const byPhone = await prisma.users.findFirst({
            where: { tenant_id, role_id: 4, phone: phoneClean },
            select: { id: true, first_name: true, last_name: true }
        });
        if (byPhone) {
            client_id = byPhone.id;
            resolved_name = `${byPhone.first_name || ''} ${byPhone.last_name || ''}`.trim();
        }
    }
    // 2) Si no hay match por teléfono, buscar por nombre
    if (!client_id) {
        const byName = await prisma.users.findMany({
            where: {
                tenant_id, role_id: 4,
                OR: [
                    { first_name: { contains: cliente_nombre.split(' ')[0], mode: 'insensitive' } },
                    { last_name: { contains: cliente_nombre.split(' ').slice(-1)[0], mode: 'insensitive' } }
                ]
            },
            select: { id: true, first_name: true, last_name: true, phone: true },
            take: 5
        });
        if (byName.length === 1) {
            client_id = byName[0].id;
            resolved_name = `${byName[0].first_name || ''} ${byName[0].last_name || ''}`.trim();
        }
        // Si hay múltiples matches, lo dejamos walk-in y avisamos al estilista
    }
    // 3) Crear invoice
    const invoice = await prisma.invoices.create({
        data: {
            tenant_id,
            client_id: client_id || null,
            client_name_adhoc: client_id ? null : cliente_nombre.trim(),
            opened_by_user_id: stylist_id,
            status: 'open',
            total_amount: 0
        }
    });
    return {
        ok: true,
        ticket_id: invoice.id,
        cliente: resolved_name,
        modo: client_id ? 'cliente_registrado' : 'walk-in',
        mensaje: `Ticket abierto para ${resolved_name}. Ahora puedes agregar servicios o productos con este ticket_id.`
    };
}

async function buscarTicket({ tenant_id, cliente_nombre }) {
    if (!cliente_nombre || cliente_nombre.trim().length < 2) {
        throw new Error('Dime el nombre del cliente para buscar.');
    }
    const term = cliente_nombre.trim().split(' ')[0];
    const rows = await prisma.invoices.findMany({
        where: {
            tenant_id,
            status: 'open',
            OR: [
                { client_name_adhoc: { contains: term, mode: 'insensitive' } },
                { users: { OR: [
                    { first_name: { contains: term, mode: 'insensitive' } },
                    { last_name: { contains: term, mode: 'insensitive' } }
                ] } }
            ]
        },
        include: {
            users: { select: { first_name: true, last_name: true } },
            invoice_items: { select: { description: true, total_price: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
    });
    return {
        total: rows.length,
        tickets: rows.map(t => ({
            ticket_id: t.id,
            cliente: t.client_name_adhoc || `${t.users?.first_name || ''} ${t.users?.last_name || ''}`.trim(),
            items_count: t.invoice_items.length,
            total_actual: Number(t.total_amount),
            abierto_hace: formatInTimeZone(t.created_at, TIME_ZONE, 'HH:mm')
        }))
    };
}

async function miTicketActual({ stylist_id, tenant_id }) {
    // 1) Tickets abiertos donde él haya abierto o tenga items
    const opened = await prisma.invoices.findMany({
        where: {
            tenant_id,
            status: 'open',
            OR: [
                { opened_by_user_id: stylist_id },
                { invoice_items: { some: { seller_id: stylist_id } } }
            ]
        },
        include: {
            users: { select: { first_name: true, last_name: true } },
            invoice_items: {
                select: { id: true, description: true, item_type: true, quantity: true, total_price: true, seller_id: true }
            }
        },
        orderBy: { updated_at: 'desc' },
        take: 1
    });
    if (opened.length === 0) {
        return { ok: false, mensaje: 'No tienes ningún ticket abierto en este momento.' };
    }
    const t = opened[0];
    return {
        ok: true,
        ticket_id: t.id,
        cliente: t.client_name_adhoc || `${t.users?.first_name || ''} ${t.users?.last_name || ''}`.trim() || 'Walk-in',
        total_actual: Number(t.total_amount),
        items: t.invoice_items.map(it => ({
            item_id: it.id,
            tipo: it.item_type,
            descripcion: it.description,
            cantidad: it.quantity,
            total: Number(it.total_price),
            es_mio: it.seller_id === stylist_id
        }))
    };
}

async function agregarServicioATicket({ stylist_id, tenant_id, ticket_id, servicio_nombre, precio, motivo_precio }) {
    const tenantSettings = await assertTicketEnabled(tenant_id);
    const inv = await prisma.invoices.findFirst({
        where: { id: ticket_id, tenant_id },
        select: { id: true, status: true }
    });
    if (!inv) throw new Error('Ticket no encontrado.');
    if (inv.status !== 'open') throw new Error('Este ticket ya está cerrado.');
    // Buscar servicio por nombre
    const term = (servicio_nombre || '').trim();
    if (term.length < 2) throw new Error('Dime el nombre del servicio.');
    const servicios = await prisma.services.findMany({
        where: { tenant_id, name: { contains: term, mode: 'insensitive' } },
        select: { id: true, name: true, price: true, commission_percent: true },
        take: 5
    });
    if (servicios.length === 0) {
        return {
            ok: false,
            no_encontrado: true,
            buscado: term,
            mensaje: `No encontré servicios que coincidan con "${term}". Puedo listarte tus servicios disponibles si quieres.`,
            sugerencia: 'Llama listar_servicios_disponibles para ver el catálogo y dile al estilista que elija.'
        };
    }
    if (servicios.length > 1) {
        return { ok: false, multiple_matches: true, opciones: servicios.map(s => ({ id: s.id, nombre: s.name, precio: Number(s.price) })) };
    }
    const svc = servicios[0];
    const catalogPrice = Number(svc.price);
    const finalPrice = (precio != null && Number.isFinite(Number(precio))) ? Number(precio) : catalogPrice;
    const isOverride = finalPrice !== catalogPrice;
    if (isOverride && !tenantSettings.price_override_enabled) {
        throw new Error('No puedes cambiar el precio: el dueño tiene desactivada la opción "Modificar precio en caja".');
    }
    if (isOverride && (!motivo_precio || motivo_precio.trim().length < 3)) {
        throw new Error('Si cambias el precio necesitas dar un motivo (queda auditado).');
    }
    // Calcular comisión: stylist_services > service.commission_percent
    let commissionPct = null;
    const styl = await prisma.stylist_services.findUnique({
        where: { user_id_service_id: { user_id: stylist_id, service_id: svc.id } },
        select: { commission_percent: true }
    }).catch(() => null);
    if (styl?.commission_percent != null) commissionPct = Number(styl.commission_percent);
    else if (svc.commission_percent != null) commissionPct = Number(svc.commission_percent);
    const total_price = finalPrice;
    const commission_value = commissionPct != null
        ? Math.round((total_price * Number(commissionPct) / 100) * 100) / 100
        : null;
    // Insertar (igual que ticketController.addItem — SQL crudo para evitar issues de Decimal)
    const itemRows = await prisma.$queryRaw`
        INSERT INTO invoice_items (
          invoice_id, tenant_id, item_type, related_id, description,
          quantity, unit_price, total_price, seller_id,
          commission_percent, commission_value, commission_source, commission_locked,
          original_unit_price, override_reason, overridden_by_user_id
        ) VALUES (
          ${ticket_id}::uuid,
          ${tenant_id}::uuid,
          'service',
          ${svc.id}::uuid,
          ${svc.name},
          1,
          ${finalPrice},
          ${total_price},
          ${stylist_id}::uuid,
          ${commissionPct != null ? String(commissionPct) : null},
          ${commission_value}::numeric,
          ${commissionPct != null ? 'ticket' : null},
          false,
          ${catalogPrice},
          ${isOverride ? motivo_precio.trim() : null},
          ${isOverride ? stylist_id : null}::uuid
        )
        RETURNING id`;
    await recalcTicketTotal(ticket_id);
    return {
        ok: true,
        item_id: itemRows[0].id,
        servicio: svc.name,
        precio_cobrado: finalPrice,
        precio_catalogo: catalogPrice,
        precio_modificado: isOverride,
        comision_estimada: commission_value
    };
}

async function agregarProductoATicket({ stylist_id, tenant_id, ticket_id, producto_nombre, cantidad = 1 }) {
    await assertTicketEnabled(tenant_id);
    const inv = await prisma.invoices.findFirst({
        where: { id: ticket_id, tenant_id },
        select: { id: true, status: true }
    });
    if (!inv) throw new Error('Ticket no encontrado.');
    if (inv.status !== 'open') throw new Error('Este ticket ya está cerrado.');
    const qty = Math.max(1, Math.trunc(Number(cantidad) || 1));
    const term = (producto_nombre || '').trim();
    if (term.length < 2) throw new Error('Dime el nombre del producto.');
    const productos = await prisma.products.findMany({
        where: {
            tenant_id,
            is_active: true,
            audience_type: { in: ['cliente', 'ambos'] },
            name: { contains: term, mode: 'insensitive' }
        },
        select: { id: true, name: true, sale_price: true, stock: true, product_commission_percent: true, commission_percent_stylist: true },
        take: 5
    });
    if (productos.length === 0) {
        return {
            ok: false,
            no_encontrado: true,
            buscado: term,
            mensaje: `No encontré productos que coincidan con "${term}". Puedo listarte los disponibles.`,
            sugerencia: 'Llama listar_productos_disponibles para ver el catálogo.'
        };
    }
    if (productos.length > 1) {
        return { ok: false, multiple_matches: true, opciones: productos.map(p => ({ id: p.id, nombre: p.name, precio: Number(p.sale_price) })) };
    }
    const p = productos[0];
    if (p.stock != null && qty > p.stock) {
        throw new Error(`Stock insuficiente: solo hay ${p.stock} unidades de ${p.name}.`);
    }
    const unit = Number(p.sale_price || 0);
    const total_price = Math.round(qty * unit * 100) / 100;
    // Comisión por producto: commission_percent_stylist > product_commission_percent
    let commissionPct = null;
    if (p.commission_percent_stylist != null) commissionPct = Number(p.commission_percent_stylist);
    else if (p.product_commission_percent != null) commissionPct = Number(p.product_commission_percent);
    const commission_value = commissionPct != null
        ? Math.round((total_price * Number(commissionPct) / 100) * 100) / 100
        : null;
    const itemRows = await prisma.$queryRaw`
        INSERT INTO invoice_items (
          invoice_id, tenant_id, item_type, related_id, description,
          quantity, unit_price, total_price, seller_id,
          commission_percent, commission_value, commission_source, commission_locked,
          original_unit_price
        ) VALUES (
          ${ticket_id}::uuid,
          ${tenant_id}::uuid,
          'product',
          ${p.id}::uuid,
          ${p.name},
          ${qty},
          ${unit},
          ${total_price},
          ${stylist_id}::uuid,
          ${commissionPct != null ? String(commissionPct) : null},
          ${commission_value}::numeric,
          ${commissionPct != null ? 'ticket' : null},
          false,
          ${unit}
        )
        RETURNING id`;
    await recalcTicketTotal(ticket_id);
    return {
        ok: true,
        item_id: itemRows[0].id,
        producto: p.name,
        cantidad: qty,
        total: total_price,
        comision_estimada: commission_value
    };
}

async function listarServiciosDisponibles({ stylist_id, tenant_id, filtro }) {
    const where = { tenant_id };
    if (filtro && filtro.trim().length >= 2) {
        where.name = { contains: filtro.trim(), mode: 'insensitive' };
    }
    // 1) Si tiene servicios asignados explícitamente, priorizar esos
    let assigned = [];
    try {
        assigned = await prisma.$queryRawUnsafe(
            `SELECT s.id, s.name, s.price, ss.commission_percent AS my_commission
             FROM stylist_services ss
             JOIN services s ON s.id = ss.service_id
             WHERE ss.user_id = $1::uuid AND s.tenant_id = $2::uuid
             ${filtro && filtro.trim().length >= 2 ? `AND s.name ILIKE '%' || $3 || '%'` : ''}
             ORDER BY s.name
             LIMIT 25`,
            ...(filtro && filtro.trim().length >= 2 ? [stylist_id, tenant_id, filtro.trim()] : [stylist_id, tenant_id])
        );
    } catch (e) { /* tabla no existe */ }
    if (assigned.length > 0) {
        return {
            ok: true,
            tipo: 'asignados',
            total: assigned.length,
            servicios: assigned.map(s => ({
                id: s.id,
                nombre: s.name,
                precio: Number(s.price),
                tu_comision_pct: s.my_commission != null ? Number(s.my_commission) : null
            }))
        };
    }
    // 2) Fallback: todos los servicios del salón
    const all = await prisma.services.findMany({
        where,
        select: { id: true, name: true, price: true, commission_percent: true },
        orderBy: { name: 'asc' },
        take: 25
    });
    return {
        ok: true,
        tipo: 'catalogo_completo',
        total: all.length,
        servicios: all.map(s => ({
            id: s.id,
            nombre: s.name,
            precio: Number(s.price),
            comision_default_pct: s.commission_percent != null ? Number(s.commission_percent) : null
        }))
    };
}

async function listarProductosDisponibles({ tenant_id, filtro }) {
    const where = {
        tenant_id,
        is_active: true,
        audience_type: { in: ['cliente', 'ambos'] }
    };
    if (filtro && filtro.trim().length >= 2) {
        where.name = { contains: filtro.trim(), mode: 'insensitive' };
    }
    const all = await prisma.products.findMany({
        where,
        select: { id: true, name: true, sale_price: true, stock: true },
        orderBy: { name: 'asc' },
        take: 25
    });
    return {
        ok: true,
        total: all.length,
        productos: all.map(p => ({
            id: p.id,
            nombre: p.name,
            precio: Number(p.sale_price),
            stock: p.stock
        }))
    };
}

async function crearCliente({ tenant_id, nombre, apellido, telefono }) {
    if (!nombre || nombre.trim().length < 2) throw new Error('Necesito al menos el nombre del cliente.');
    const phoneClean = telefono ? String(telefono).replace(/[^\d]/g, '') : null;
    // Si tiene teléfono, verificar que no exista ya
    if (phoneClean) {
        const existing = await prisma.users.findFirst({
            where: { tenant_id, role_id: 4, phone: phoneClean },
            select: { id: true, first_name: true, last_name: true }
        });
        if (existing) {
            return {
                ok: true,
                ya_existia: true,
                client_id: existing.id,
                cliente: `${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
                mensaje: 'Este cliente ya estaba registrado, te lo devuelvo para abrir el ticket.'
            };
        }
    }
    const created = await prisma.users.create({
        data: {
            tenant_id,
            role_id: 4,
            first_name: nombre.trim(),
            last_name: (apellido || '').trim() || null,
            phone: phoneClean,
            email: null,
            password_hash: null,
            status: 'active'
        },
        select: { id: true, first_name: true, last_name: true, phone: true }
    });
    return {
        ok: true,
        ya_existia: false,
        client_id: created.id,
        cliente: `${created.first_name} ${created.last_name || ''}`.trim(),
        telefono: created.phone,
        mensaje: 'Cliente creado. Ya puedes abrir su ticket.'
    };
}

async function misSucursales({ stylist_id, home_tenant_id }) {
    // Sucursales accesibles: la home + las asignadas vía stylist_branches.
    // Si no hay tabla stylist_branches o no tiene asignaciones, retorna solo la home + hermanas (si hay parent).
    const home = await prisma.tenants.findUnique({
        where: { id: home_tenant_id },
        select: { id: true, name: true, parent_tenant_id: true }
    });
    const branches = [];
    if (home) branches.push({ id: home.id, name: home.name, es_principal: true });
    // Buscar asignaciones explícitas en stylist_branches (si la tabla existe)
    try {
        const assigned = await prisma.$queryRawUnsafe(
            `SELECT t.id, t.name FROM stylist_branches sb
             JOIN tenants t ON t.id = sb.tenant_id
             WHERE sb.user_id = $1::uuid AND t.id != $2::uuid`,
            stylist_id, home_tenant_id
        );
        for (const t of (assigned || [])) {
            branches.push({ id: t.id, name: t.name, es_principal: false });
        }
    } catch (e) { /* tabla no existe o sin asignaciones */ }
    return { total: branches.length, sucursales: branches };
}

async function cambiarSucursal({ stylist_id, home_tenant_id, sucursal_id, sessionRef }) {
    if (!sucursal_id) throw new Error('Necesito el id de la sucursal.');
    // Validar acceso (igual que misSucursales)
    const accesibles = await misSucursales({ stylist_id, home_tenant_id });
    const target = accesibles.sucursales.find(s => s.id === sucursal_id);
    if (!target) throw new Error('No tienes acceso a esa sucursal o no existe.');
    if (sessionRef) sessionRef.activeTenantId = sucursal_id;
    return {
        ok: true,
        sucursal_actual: target.name,
        sucursal_id: target.id,
        mensaje: `Listo, ahora estás trabajando en ${target.name}. Las próximas acciones se harán acá.`
    };
}

async function modificarPrecioServicio({ stylist_id, tenant_id, ticket_id, item_id, nuevo_precio, motivo }) {
    const tenantSettings = await assertTicketEnabled(tenant_id);
    if (!tenantSettings.price_override_enabled) {
        throw new Error('No puedes cambiar el precio: el dueño tiene desactivada la opción "Modificar precio en caja".');
    }
    if (!motivo || motivo.trim().length < 3) {
        throw new Error('Necesitas dar un motivo para cambiar el precio (queda auditado).');
    }
    const price = Number(nuevo_precio);
    if (!Number.isFinite(price) || price < 0) throw new Error('Precio inválido.');
    const inv = await prisma.invoices.findFirst({
        where: { id: ticket_id, tenant_id },
        select: { id: true, status: true }
    });
    if (!inv) throw new Error('Ticket no encontrado.');
    if (inv.status !== 'open') throw new Error('Este ticket ya está cerrado.');
    const item = await prisma.invoice_items.findFirst({
        where: { id: item_id, invoice_id: ticket_id, tenant_id },
        select: { id: true, item_type: true, original_unit_price: true, quantity: true, commission_percent: true, seller_id: true }
    });
    if (!item) throw new Error('Línea no encontrada en este ticket.');
    if (item.seller_id !== stylist_id) {
        throw new Error('Solo puedes modificar el precio de TUS propios servicios. Pídele al cajero que lo cambie.');
    }
    const qty = Number(item.quantity || 1);
    const total_price = Math.round(qty * price * 100) / 100;
    const commission_value = item.commission_percent != null
        ? Math.round((total_price * Number(item.commission_percent) / 100) * 100) / 100
        : null;
    await prisma.$queryRaw`
        UPDATE invoice_items SET
          unit_price = ${price}::numeric,
          total_price = ${total_price}::numeric,
          commission_value = ${commission_value}::numeric,
          override_reason = ${motivo.trim()},
          overridden_by_user_id = ${stylist_id}::uuid
        WHERE id = ${item_id}::uuid`;
    await recalcTicketTotal(ticket_id);
    return {
        ok: true,
        item_id,
        precio_anterior: Number(item.original_unit_price),
        precio_nuevo: price,
        total: total_price,
        motivo: motivo.trim(),
        comision_recalculada: commission_value
    };
}

// ─── Dispatcher ────────────────────────────────────────────────────────
// `session` permite a tools como cambiar_sucursal mutar la sesión en memoria.
async function executeFunction(name, args, stylistId, homeTenantId, session) {
    // tenant_id efectivo: el del session.activeTenantId (si cambió de sucursal) o el home.
    const activeTenantId = session?.activeTenantId || homeTenantId;
    const ctx = {
        stylist_id: stylistId,
        tenant_id: activeTenantId,
        home_tenant_id: homeTenantId,
        sessionRef: session,
        ...args
    };
    switch (name) {
        case 'mi_agenda_hoy': return miAgendaHoy(ctx);
        case 'mi_agenda': return miAgenda(ctx);
        case 'mis_servicios_hoy': return misServiciosHoy(ctx);
        case 'mis_ganancias_hoy': return misGananciasHoy(ctx);
        case 'mis_comisiones_periodo': return misComisionesPeriodo(ctx);
        case 'mi_fichero': return miFichero(ctx);
        case 'mis_anticipos_pendientes': return misAnticiposPendientes(ctx);
        case 'mis_prestamos_activos': return misPrestamosActivos(ctx);
        case 'mi_resumen_dia': return miResumenDia(ctx);
        case 'abrir_ticket': return abrirTicket(ctx);
        case 'buscar_ticket': return buscarTicket(ctx);
        case 'mi_ticket_actual': return miTicketActual(ctx);
        case 'agregar_servicio_a_ticket': return agregarServicioATicket(ctx);
        case 'agregar_producto_a_ticket': return agregarProductoATicket(ctx);
        case 'modificar_precio_servicio': return modificarPrecioServicio(ctx);
        case 'crear_cliente': return crearCliente(ctx);
        case 'mis_sucursales': return misSucursales(ctx);
        case 'cambiar_sucursal': return cambiarSucursal(ctx);
        case 'listar_servicios_disponibles': return listarServiciosDisponibles(ctx);
        case 'listar_productos_disponibles': return listarProductosDisponibles(ctx);
        default: throw new Error(`Función desconocida: ${name}`);
    }
}

module.exports = {
    STYLIST_TOOLS,
    STYLIST_SYSTEM_PROMPT,
    executeFunction
};
