// src/controllers/aiAdminChatController.js
'use strict';

const prisma = require('../config/prisma');
const db = require('../config/db');
const { formatInTimeZone, zonedTimeToUtc } = require('date-fns-tz');
const { getGlobalOpenAIKey } = require('../services/openaiKeyService');
const { trackUsage } = require('../services/tokenTracker');

const TIME_ZONE = 'America/Bogota';

// ==================== HELPERS ====================

function normalizeDateKeyword(dateStr) {
    if (!dateStr) return formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const s = String(dateStr).toLowerCase();
    const now = new Date();
    const today = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    const tomorrow = formatInTimeZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    if (s.includes('mañana')) return tomorrow;
    if (s.includes('hoy')) return today;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return today;
}

function normalizeHumanTimeToHHMM(t) {
    if (!t) return null;
    let s = String(t).toLowerCase().replace(/\s+/g, '').replace(/dela|de|la/g, '');
    const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|mañana|tarde|noche)?$/);
    if (!m) {
        const basic = s.match(/^(\d{1,2}):?(\d{2})$/);
        if (basic) return `${String(basic[1]).padStart(2, '0')}:${basic[2]}`;
        return null;
    }
    let h = parseInt(m[1], 10);
    let mm = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3];
    if (!ampm && h >= 1 && h <= 6) h += 12;
    if ((ampm === 'pm' || ampm === 'tarde' || ampm === 'noche') && h < 12) h += 12;
    if ((ampm === 'am' || ampm === 'mañana') && h === 12) h = 0;
    return `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, mm)).padStart(2, '0')}`;
}

function makeLocalUtc(dateStr, timeStr) {
    const t = (timeStr && timeStr.length === 5) ? `${timeStr}:00` : (timeStr || '00:00:00');
    return zonedTimeToUtc(`${dateStr} ${t}`, TIME_ZONE);
}

function getPeriodDays(periodo) {
    const p = String(periodo || 'mes').toLowerCase();
    if (p.includes('semana')) return 7;
    if (p.includes('año') || p.includes('anual')) return 365;
    return 30; // mes por defecto
}

// ==================== SYSTEM PROMPT ====================

const ADMIN_SYSTEM_PROMPT = `Eres el asistente de inteligencia de negocio de TuPelukeria. Hablas con el dueño, administrador o recepcionista del salón.

ROL:
- Consultar y gestionar: agenda, fichero digital, estilistas, servicios, productos, ventas, promociones y geolocalización.
- Dar respuestas concisas con datos reales. Usa tablas o listas cuando haya varios registros.
- Si el usuario pide CREAR algo (cita, servicio, producto, estilista, promoción), SIEMPRE confirma los datos antes de ejecutar la función de creación. Ejemplo: "Voy a crear el servicio Corte Clásico a $25.000 (30 min). ¿Confirmo?"
- NUNCA inventes datos. Si una función devuelve resultados vacíos, dilo claramente.

ESTILO:
- Español colombiano profesional pero cercano.
- Respuestas directas con datos. Nada de relleno.
- Usa formato con negritas, listas y emojis moderados para claridad.
- Cuando muestres precios, usa formato colombiano: $25.000

CONTEXTO TEMPORAL:
- Zona horaria: America/Bogota (UTC-5).
- Fecha/hora actual las obtienes del sistema.`;

// ==================== 18 FUNCIONES (TOOLS) ====================

const ADMIN_TOOLS = [
    // 1. ver_citas_hoy
    {
        type: "function",
        function: {
            name: "ver_citas_hoy",
            description: "Muestra todas las citas programadas para hoy con detalle de servicio, estilista, cliente y hora.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 2. ver_agenda_fecha
    {
        type: "function",
        function: {
            name: "ver_agenda_fecha",
            description: "Muestra las citas para una fecha específica.",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD" }
                },
                required: ["fecha"]
            }
        }
    },
    // 3. crear_cita
    {
        type: "function",
        function: {
            name: "crear_cita",
            description: "Crea una nueva cita. Solo usar cuando el admin haya confirmado todos los datos.",
            parameters: {
                type: "object",
                properties: {
                    servicio: { type: "string", description: "Nombre del servicio" },
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD" },
                    hora: { type: "string", description: "Hora: '3pm', '15:00', '10am'" },
                    estilista: { type: "string", description: "Nombre del estilista (opcional)" },
                    cliente: { type: "string", description: "Nombre del cliente (opcional, busca por nombre)" }
                },
                required: ["servicio", "fecha", "hora"]
            }
        }
    },
    // 4. ver_fichero_digital
    {
        type: "function",
        function: {
            name: "ver_fichero_digital",
            description: "Muestra el fichero digital (digiturno): estilistas con sus servicios y conteo de atenciones completadas.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 5. clientes_atendidos_hoy
    {
        type: "function",
        function: {
            name: "clientes_atendidos_hoy",
            description: "Cuántos clientes se han atendido hoy y qué servicios se realizaron.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 6. ver_ubicacion_estilistas
    {
        type: "function",
        function: {
            name: "ver_ubicacion_estilistas",
            description: "Muestra qué estilistas están dentro del salón según geolocalización.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 7. listar_servicios
    {
        type: "function",
        function: {
            name: "listar_servicios",
            description: "Lista todos los servicios con precio, duración y comisión.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 8. servicios_mas_populares
    {
        type: "function",
        function: {
            name: "servicios_mas_populares",
            description: "Ranking de servicios más solicitados por citas completadas en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    },
    // 9. crear_servicio
    {
        type: "function",
        function: {
            name: "crear_servicio",
            description: "Crea un nuevo servicio. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre del servicio" },
                    precio: { type: "number", description: "Precio en COP (ej: 25000)" },
                    duracion_minutos: { type: "integer", description: "Duración en minutos (ej: 30)" },
                    comision: { type: "number", description: "Porcentaje de comisión 0-100 (opcional)" }
                },
                required: ["nombre", "precio", "duracion_minutos"]
            }
        }
    },
    // 10. listar_estilistas
    {
        type: "function",
        function: {
            name: "listar_estilistas",
            description: "Lista todos los estilistas activos del salón.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 11. crear_estilista
    {
        type: "function",
        function: {
            name: "crear_estilista",
            description: "Registra un nuevo estilista. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Primer nombre" },
                    apellido: { type: "string", description: "Apellido" },
                    email: { type: "string", description: "Email del estilista" },
                    telefono: { type: "string", description: "Teléfono (opcional)" }
                },
                required: ["nombre", "apellido", "email"]
            }
        }
    },
    // 12. listar_productos
    {
        type: "function",
        function: {
            name: "listar_productos",
            description: "Lista productos activos con stock y precio de venta.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 13. productos_mas_vendidos
    {
        type: "function",
        function: {
            name: "productos_mas_vendidos",
            description: "Ranking de productos más vendidos en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    },
    // 14. crear_producto
    {
        type: "function",
        function: {
            name: "crear_producto",
            description: "Crea un nuevo producto. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre del producto" },
                    precio_venta: { type: "number", description: "Precio de venta en COP" },
                    precio_costo: { type: "number", description: "Precio de costo (opcional)" },
                    stock: { type: "integer", description: "Stock inicial (opcional, default 0)" }
                },
                required: ["nombre", "precio_venta"]
            }
        }
    },
    // 15. listar_promociones
    {
        type: "function",
        function: {
            name: "listar_promociones",
            description: "Lista las promociones del salón (activas e inactivas).",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    // 16. crear_promocion
    {
        type: "function",
        function: {
            name: "crear_promocion",
            description: "Crea una nueva promoción. Solo usar cuando el admin haya confirmado los datos.",
            parameters: {
                type: "object",
                properties: {
                    nombre: { type: "string", description: "Nombre de la promoción" },
                    descripcion: { type: "string", description: "Descripción (opcional)" },
                    tipo_descuento: { type: "string", enum: ["percentage", "fixed_amount"], description: "'percentage' o 'fixed_amount'" },
                    valor: { type: "number", description: "Valor del descuento (porcentaje 0-100 o monto fijo en COP)" },
                    aplica_a: { type: "string", enum: ["all", "service", "product"], description: "'all', 'service' o 'product' (default: all)" },
                    fecha_inicio: { type: "string", description: "Fecha inicio YYYY-MM-DD (opcional)" },
                    fecha_fin: { type: "string", description: "Fecha fin YYYY-MM-DD (opcional)" }
                },
                required: ["nombre", "tipo_descuento", "valor"]
            }
        }
    },
    // 17. resumen_ventas_dia
    {
        type: "function",
        function: {
            name: "resumen_ventas_dia",
            description: "Resumen de ventas de hoy o una fecha: total facturado, desglose servicios vs productos.",
            parameters: {
                type: "object",
                properties: {
                    fecha: { type: "string", description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD. Default: hoy" }
                },
                required: []
            }
        }
    },
    // 18. rendimiento_estilistas
    {
        type: "function",
        function: {
            name: "rendimiento_estilistas",
            description: "Rendimiento de estilistas: citas completadas, ingresos generados y comisión en un periodo.",
            parameters: {
                type: "object",
                properties: {
                    periodo: { type: "string", description: "'semana', 'mes' o 'año'. Default: mes" }
                },
                required: []
            }
        }
    }
];

// ==================== EJECUTORES DE FUNCIONES ====================

async function executeFunction(fnName, args, tenantId) {
    switch (fnName) {

        // 1. ver_citas_hoy
        case 'ver_citas_hoy': {
            const today = normalizeDateKeyword('hoy');
            const startUtc = makeLocalUtc(today, '00:00');
            const endUtc = makeLocalUtc(today, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT a.id, a.start_time, a.end_time, a.status,
                       s.name AS servicio, s.price AS precio,
                       CONCAT(st.first_name, ' ', st.last_name) AS estilista,
                       CONCAT(cl.first_name, ' ', cl.last_name) AS cliente
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                LEFT JOIN users st ON a.stylist_id = st.id
                LEFT JOIN users cl ON a.client_id = cl.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2 AND a.start_time <= $3
                  AND a.status != 'cancelled'
                ORDER BY a.start_time
            `, tenantId, startUtc, endUtc);
            return {
                fecha: today,
                total_citas: rows.length,
                citas: rows.map(r => ({
                    hora: formatInTimeZone(r.start_time, TIME_ZONE, 'hh:mm a'),
                    servicio: r.servicio,
                    precio: r.precio,
                    estilista: r.estilista,
                    cliente: r.cliente || 'Sin asignar',
                    estado: r.status
                }))
            };
        }

        // 2. ver_agenda_fecha
        case 'ver_agenda_fecha': {
            const fecha = normalizeDateKeyword(args.fecha);
            const startUtc = makeLocalUtc(fecha, '00:00');
            const endUtc = makeLocalUtc(fecha, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT a.id, a.start_time, a.end_time, a.status,
                       s.name AS servicio, s.price AS precio,
                       CONCAT(st.first_name, ' ', st.last_name) AS estilista,
                       CONCAT(cl.first_name, ' ', cl.last_name) AS cliente
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                LEFT JOIN users st ON a.stylist_id = st.id
                LEFT JOIN users cl ON a.client_id = cl.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2 AND a.start_time <= $3
                  AND a.status != 'cancelled'
                ORDER BY a.start_time
            `, tenantId, startUtc, endUtc);
            return {
                fecha,
                total_citas: rows.length,
                citas: rows.map(r => ({
                    hora: formatInTimeZone(r.start_time, TIME_ZONE, 'hh:mm a'),
                    servicio: r.servicio,
                    precio: r.precio,
                    estilista: r.estilista,
                    cliente: r.cliente || 'Sin asignar',
                    estado: r.status
                }))
            };
        }

        // 3. crear_cita
        case 'crear_cita': {
            const fecha = normalizeDateKeyword(args.fecha);
            const hora = normalizeHumanTimeToHHMM(args.hora);
            if (!hora) return { error: 'No pude interpretar la hora. Usa formato como 3pm o 15:00.' };

            // Buscar servicio
            const svcRows = await prisma.$queryRawUnsafe(`
                SELECT id, name, duration_minutes FROM services
                WHERE tenant_id = $1::uuid AND LOWER(name) LIKE $2
                LIMIT 1
            `, tenantId, `%${args.servicio.toLowerCase()}%`);
            if (!svcRows.length) return { error: `No encontré el servicio "${args.servicio}".` };
            const svc = svcRows[0];

            // Buscar estilista (opcional)
            let stylistId = null;
            let stylistWorkingHours = null;
            let stylistName = null;
            if (args.estilista) {
                const stRows = await prisma.$queryRawUnsafe(`
                    SELECT id, first_name, last_name, working_hours FROM users
                    WHERE tenant_id = $1::uuid AND role_id = 3
                      AND COALESCE(NULLIF(status,''),'active') = 'active'
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.estilista.toLowerCase()}%`);
                if (stRows.length) {
                    stylistId = stRows[0].id;
                    stylistWorkingHours = stRows[0].working_hours;
                    stylistName = `${stRows[0].first_name} ${stRows[0].last_name || ''}`.trim();
                }
            }
            // Si no se especificó estilista, buscar uno que ofrezca el servicio
            if (!stylistId) {
                const anyStRows = await prisma.$queryRawUnsafe(`
                    SELECT u.id AS user_id, u.working_hours, u.first_name, u.last_name FROM stylist_services ss
                    JOIN users u ON ss.user_id = u.id
                    WHERE u.tenant_id = $1::uuid AND ss.service_id = $2::uuid
                      AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                    LIMIT 1
                `, tenantId, svc.id);
                if (anyStRows.length) {
                    stylistId = anyStRows[0].user_id;
                    stylistWorkingHours = anyStRows[0].working_hours;
                    stylistName = `${anyStRows[0].first_name} ${anyStRows[0].last_name || ''}`.trim();
                }
            }
            if (!stylistId) return { error: 'No hay estilista disponible para ese servicio.' };

            // Buscar cliente (opcional)
            let clientId = null;
            if (args.cliente) {
                const clRows = await prisma.$queryRawUnsafe(`
                    SELECT id FROM users
                    WHERE tenant_id = $1::uuid
                      AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2
                           OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2)
                    LIMIT 1
                `, tenantId, `%${args.cliente.toLowerCase()}%`);
                if (clRows.length) clientId = clRows[0].id;
            }

            const startTime = makeLocalUtc(fecha, hora);
            const endTime = new Date(startTime.getTime() + svc.duration_minutes * 60 * 1000);

            // Verificar horario laboral del estilista
            if (stylistWorkingHours) {
                try {
                    const wh = typeof stylistWorkingHours === 'string' ? JSON.parse(stylistWorkingHours) : stylistWorkingHours;
                    const isoDay = parseInt(formatInTimeZone(startTime, TIME_ZONE, 'i'), 10);
                    const dayOfWeek = isoDay === 7 ? 0 : isoDay;
                    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                    const dayKey = dayNames[dayOfWeek];
                    const horaNum = parseInt(hora.split(':')[0], 10);

                    if (!wh[dayKey]) {
                        return { error: `${stylistName || 'El estilista'} no trabaja los ${dayKey}. Elige otro día u otro estilista.` };
                    }
                    const { start, end } = wh[dayKey];
                    const startWork = parseInt(start, 10);
                    const endWork = parseInt(end, 10);
                    if (horaNum < startWork || horaNum >= endWork) {
                        return { error: `${stylistName || 'El estilista'} no trabaja a las ${hora}. Su horario los ${dayKey} es de ${start}:00 a ${end}:00.` };
                    }
                } catch (whErr) {
                    console.warn('⚠️ Error validando working_hours en crear_cita admin:', whErr.message);
                }
            }

            // Verificar conflictos
            const conflicts = await prisma.$queryRawUnsafe(`
                SELECT id FROM appointments
                WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid
                  AND status IN ('scheduled', 'rescheduled', 'checked_in')
                  AND (start_time, end_time) OVERLAPS ($3::timestamptz, $4::timestamptz)
                LIMIT 1
            `, tenantId, stylistId, startTime, endTime);
            if (conflicts.length) return { error: 'El estilista ya tiene una cita en ese horario.' };

            const newAppt = await prisma.$queryRawUnsafe(`
                INSERT INTO appointments (tenant_id, client_id, stylist_id, service_id, start_time, end_time, status)
                VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'scheduled')
                RETURNING id
            `, tenantId, clientId, stylistId, svc.id, startTime, endTime);

            return {
                success: true,
                cita_id: newAppt[0].id,
                servicio: svc.name,
                fecha,
                hora,
                mensaje: `Cita creada exitosamente para ${svc.name} el ${fecha} a las ${hora}.`
            };
        }

        // 4. ver_fichero_digital
        case 'ver_fichero_digital': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) AS estilista,
                       s.name AS servicio,
                       ss.total_completed,
                       ss.last_completed_at
                FROM stylist_services ss
                JOIN users u ON ss.user_id = u.id
                JOIN services s ON ss.service_id = s.id
                WHERE u.tenant_id = $1::uuid AND u.role_id = 3
                  AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                ORDER BY u.first_name, ss.total_completed DESC
            `, tenantId);
            return { fichero: rows };
        }

        // 5. clientes_atendidos_hoy
        case 'clientes_atendidos_hoy': {
            const today = normalizeDateKeyword('hoy');
            const startUtc = makeLocalUtc(today, '00:00');
            const endUtc = makeLocalUtc(today, '23:59');
            const rows = await prisma.$queryRawUnsafe(`
                SELECT COUNT(DISTINCT a.client_id) AS clientes,
                       COUNT(*) AS total_citas,
                       ARRAY_AGG(DISTINCT s.name) AS servicios
                FROM appointments a
                LEFT JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.start_time >= $2 AND a.start_time <= $3
                  AND a.status IN ('completed', 'checked_out')
            `, tenantId, startUtc, endUtc);
            const r = rows[0];
            return {
                fecha: today,
                clientes_atendidos: parseInt(r.clientes) || 0,
                citas_completadas: parseInt(r.total_citas) || 0,
                servicios_realizados: (r.servicios || []).filter(Boolean)
            };
        }

        // 6. ver_ubicacion_estilistas
        case 'ver_ubicacion_estilistas': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT CONCAT(first_name, ' ', last_name) AS estilista,
                       is_inside_geofence,
                       last_location_update
                FROM users
                WHERE tenant_id = $1::uuid AND role_id = 3
                  AND COALESCE(NULLIF(status,''),'active') = 'active'
                ORDER BY first_name
            `, tenantId);
            const dentro = rows.filter(r => r.is_inside_geofence === true);
            const fuera = rows.filter(r => r.is_inside_geofence !== true);
            return {
                en_salon: dentro.map(r => ({
                    estilista: r.estilista,
                    ultima_ubicacion: r.last_location_update
                        ? formatInTimeZone(r.last_location_update, TIME_ZONE, 'hh:mm a')
                        : 'Sin datos'
                })),
                fuera_salon: fuera.map(r => ({
                    estilista: r.estilista,
                    ultima_ubicacion: r.last_location_update
                        ? formatInTimeZone(r.last_location_update, TIME_ZONE, 'hh:mm a')
                        : 'Sin datos'
                })),
                total_dentro: dentro.length,
                total_fuera: fuera.length
            };
        }

        // 7. listar_servicios
        case 'listar_servicios': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT id, name, price, duration_minutes, commission_percent
                FROM services
                WHERE tenant_id = $1::uuid
                ORDER BY name
            `, tenantId);
            return { total: rows.length, servicios: rows };
        }

        // 8. servicios_mas_populares
        case 'servicios_mas_populares': {
            const days = getPeriodDays(args.periodo);
            const rows = await prisma.$queryRawUnsafe(`
                SELECT s.name AS servicio, COUNT(*) AS total_citas, SUM(s.price) AS ingresos
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.status IN ('completed', 'checked_out')
                  AND a.start_time >= NOW() - INTERVAL '1 day' * $2
                GROUP BY s.name
                ORDER BY total_citas DESC
                LIMIT 10
            `, tenantId, days);
            return { periodo: args.periodo || 'mes', ranking: rows };
        }

        // 9. crear_servicio
        case 'crear_servicio': {
            const rows = await prisma.$queryRawUnsafe(`
                INSERT INTO services (tenant_id, name, price, duration_minutes, commission_percent)
                VALUES ($1::uuid, $2, $3, $4, $5)
                RETURNING id, name, price, duration_minutes
            `, tenantId, args.nombre, args.precio, args.duracion_minutos, args.comision || 0);
            return { success: true, servicio: rows[0] };
        }

        // 10. listar_estilistas
        case 'listar_estilistas': {
            const rows = await prisma.$queryRawUnsafe(`
                SELECT id, first_name, last_name, email, phone,
                       commission_rate, is_inside_geofence
                FROM users
                WHERE tenant_id = $1::uuid AND role_id = 3
                  AND COALESCE(NULLIF(status,''),'active') = 'active'
                ORDER BY first_name
            `, tenantId);
            return {
                total: rows.length,
                estilistas: rows.map(r => ({
                    id: r.id,
                    nombre: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                    telefono: r.phone,
                    comision: r.commission_rate,
                    en_salon: r.is_inside_geofence || false
                }))
            };
        }

        // 11. crear_estilista
        case 'crear_estilista': {
            const bcrypt = require('bcryptjs');
            const tempPass = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
            const hashedPass = await bcrypt.hash(tempPass, 10);
            const rows = await prisma.$queryRawUnsafe(`
                INSERT INTO users (tenant_id, first_name, last_name, email, phone, password_hash, role_id, status)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, 3, 'active')
                RETURNING id, first_name, last_name, email
            `, tenantId, args.nombre, args.apellido, args.email, args.telefono || null, hashedPass);
            return {
                success: true,
                estilista: rows[0],
                password_temporal: tempPass,
                mensaje: `Estilista ${args.nombre} ${args.apellido} creado. Password temporal: ${tempPass}`
            };
        }

        // 12. listar_productos
        case 'listar_productos': {
            const { rows } = await db.query(`
                SELECT id, name, sale_price, cost_price, stock, is_active
                FROM products
                WHERE tenant_id = $1::uuid AND is_active = true
                ORDER BY name
            `, [tenantId]);
            return { total: rows.length, productos: rows };
        }

        // 13. productos_mas_vendidos
        case 'productos_mas_vendidos': {
            const days = getPeriodDays(args.periodo);
            const { rows } = await db.query(`
                SELECT ii.description AS producto,
                       SUM(ii.quantity) AS unidades_vendidas,
                       SUM(ii.total_price) AS ingresos
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE ii.tenant_id = $1::uuid
                  AND ii.item_type = 'product'
                  AND i.created_at >= NOW() - INTERVAL '1 day' * $2
                GROUP BY ii.description
                ORDER BY unidades_vendidas DESC
                LIMIT 10
            `, [tenantId, days]);
            return { periodo: args.periodo || 'mes', ranking: rows };
        }

        // 14. crear_producto
        case 'crear_producto': {
            const { rows } = await db.query(`
                INSERT INTO products (tenant_id, name, sale_price, cost_price, stock, is_active)
                VALUES ($1::uuid, $2, $3, $4, $5, true)
                RETURNING id, name, sale_price, stock
            `, [tenantId, args.nombre, args.precio_venta, args.precio_costo || 0, args.stock || 0]);
            return { success: true, producto: rows[0] };
        }

        // 15. listar_promociones
        case 'listar_promociones': {
            const { rows } = await db.query(`
                SELECT id, name, description, discount_type, discount_value,
                       applies_to, start_date, end_date, is_active
                FROM promotions
                WHERE tenant_id = $1::uuid
                ORDER BY is_active DESC, created_at DESC
            `, [tenantId]);
            return { total: rows.length, promociones: rows };
        }

        // 16. crear_promocion
        case 'crear_promocion': {
            const { rows } = await db.query(`
                INSERT INTO promotions (tenant_id, name, description, discount_type, discount_value, applies_to, start_date, end_date)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, discount_type, discount_value, applies_to, start_date, end_date
            `, [
                tenantId,
                args.nombre,
                args.descripcion || null,
                args.tipo_descuento,
                args.valor,
                args.aplica_a || 'all',
                args.fecha_inicio || null,
                args.fecha_fin || null
            ]);
            return { success: true, promocion: rows[0] };
        }

        // 17. resumen_ventas_dia
        case 'resumen_ventas_dia': {
            const fecha = normalizeDateKeyword(args.fecha);
            const startUtc = makeLocalUtc(fecha, '00:00');
            const endUtc = makeLocalUtc(fecha, '23:59');
            const { rows } = await db.query(`
                SELECT
                    COALESCE(SUM(ii.total_price), 0) AS total_facturado,
                    COALESCE(SUM(CASE WHEN ii.item_type = 'service' THEN ii.total_price ELSE 0 END), 0) AS total_servicios,
                    COALESCE(SUM(CASE WHEN ii.item_type = 'product' THEN ii.total_price ELSE 0 END), 0) AS total_productos,
                    COUNT(DISTINCT i.id) AS facturas,
                    COALESCE(SUM(ii.commission_value), 0) AS total_comisiones
                FROM invoice_items ii
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE ii.tenant_id = $1::uuid
                  AND i.created_at >= $2 AND i.created_at <= $3
            `, [tenantId, startUtc, endUtc]);
            return { fecha, ...rows[0] };
        }

        // 18. rendimiento_estilistas
        case 'rendimiento_estilistas': {
            const days = getPeriodDays(args.periodo);
            const { rows } = await db.query(`
                SELECT
                    CONCAT(u.first_name, ' ', u.last_name) AS estilista,
                    COUNT(a.id) AS citas_completadas,
                    COALESCE(SUM(s.price), 0) AS ingresos_generados,
                    COALESCE(SUM(s.price * COALESCE(s.commission_percent, 0) / 100), 0) AS comision_estimada
                FROM appointments a
                JOIN users u ON a.stylist_id = u.id
                JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = $1::uuid
                  AND a.status IN ('completed', 'checked_out')
                  AND a.start_time >= NOW() - INTERVAL '1 day' * $2
                GROUP BY u.id, u.first_name, u.last_name
                ORDER BY ingresos_generados DESC
            `, [tenantId, days]);
            return { periodo: args.periodo || 'mes', estilistas: rows };
        }

        default:
            return { error: `Función desconocida: ${fnName}` };
    }
}

// ==================== ENDPOINT PRINCIPAL ====================

exports.chat = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;
        const tenantId = req.user.tenant_id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }

        const apiKey = await getGlobalOpenAIKey();
        if (!apiKey) {
            return res.status(500).json({ error: 'No hay API key de OpenAI configurada.' });
        }

        // Construir mensajes
        const now = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd hh:mm a');
        const systemPrompt = `${ADMIN_SYSTEM_PROMPT}\n\nFecha/hora actual: ${now}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []).slice(-10),
            { role: 'user', content: message.trim() }
        ];

        // Primera llamada a OpenAI
        const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                tools: ADMIN_TOOLS,
                tool_choice: 'auto',
                temperature: 0.5,
                max_tokens: 800
            })
        });

        if (!firstResponse.ok) {
            const errBody = await firstResponse.text();
            console.error('[AI Admin] OpenAI error:', errBody);
            return res.status(502).json({ error: 'Error al comunicarse con OpenAI.' });
        }

        const firstData = await firstResponse.json();
        const assistantMessage = firstData.choices[0].message;

        // Track tokens
        if (firstData.usage) {
            trackUsage(tenantId, 'admin_chat', firstData.model || 'gpt-4o-mini',
                firstData.usage.prompt_tokens, firstData.usage.completion_tokens).catch(() => {});
        }

        // Si no hay tool_calls, devolver respuesta directa
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return res.json({
                response: assistantMessage.content || 'No tengo respuesta en este momento.',
                functionExecuted: null
            });
        }

        // Ejecutar TODAS las tool_calls en paralelo (mejora vs cliente que solo procesa [0])
        const toolResults = await Promise.all(
            assistantMessage.tool_calls.map(async (toolCall) => {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                let result;
                try {
                    result = await executeFunction(functionName, functionArgs, tenantId);
                } catch (err) {
                    console.error(`[AI Admin] Error en ${functionName}:`, err.message);
                    result = { error: `Error ejecutando ${functionName}: ${err.message}` };
                }
                return {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                };
            })
        );

        // Segunda llamada con resultados de las funciones
        const followUpMessages = [
            ...messages,
            assistantMessage,
            ...toolResults
        ];

        const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: followUpMessages,
                temperature: 0.5,
                max_tokens: 800
            })
        });

        if (!secondResponse.ok) {
            const errBody = await secondResponse.text();
            console.error('[AI Admin] OpenAI follow-up error:', errBody);
            return res.status(502).json({ error: 'Error al procesar la respuesta de las funciones.' });
        }

        const secondData = await secondResponse.json();

        if (secondData.usage) {
            trackUsage(tenantId, 'admin_chat', secondData.model || 'gpt-4o-mini',
                secondData.usage.prompt_tokens, secondData.usage.completion_tokens).catch(() => {});
        }

        const finalContent = secondData.choices[0].message.content || 'No pude generar una respuesta.';
        const executedFunctions = assistantMessage.tool_calls.map(tc => tc.function.name).join(', ');

        return res.json({
            response: finalContent,
            functionExecuted: executedFunctions
        });

    } catch (err) {
        console.error('[AI Admin Chat] Error:', err);
        return res.status(500).json({ error: 'Error interno del asistente admin.' });
    }
};

// ==================== HEALTH CHECK ====================

exports.health = async (req, res) => {
    try {
        const apiKey = await getGlobalOpenAIKey();
        res.json({ status: 'ok', endpoint: 'ai-admin-chat', hasApiKey: !!apiKey });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
};

// ==================== EXPORTS PARA WHATSAPP ADMIN ====================
exports.executeFunction = executeFunction;
exports.ADMIN_TOOLS = ADMIN_TOOLS;
exports.ADMIN_SYSTEM_PROMPT = ADMIN_SYSTEM_PROMPT;
