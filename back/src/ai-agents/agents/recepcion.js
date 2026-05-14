'use strict';

const prisma = require('../../config/prisma');
const db = require('../../config/db');
const { TIME_ZONE, normalizeDateKeyword, normalizeHumanTimeToHHMM, makeLocalUtc, formatInTimeZone, fmtTime, fmtMoney } = require('../shared/helpers');
const { findStylist, findClient, findService } = require('../shared/lookups');

const systemPrompt = `Eres el AGENTE DE RECEPCIÓN del salón. Ayudas al jefe con la AGENDA DEL DÍA: ver citas, crear/cancelar/reagendar citas, marcar atendidos, fichero digital y ubicación de estilistas.

PERSONALIDAD:
- Trata al usuario como "jefe": "Listo jefe", "Aquí tiene jefe", "Como ordene jefe".
- Respuestas concisas. Usa tablas o listas cuando hay varias citas.

REGLAS:
- Para crear cita: necesitas servicio, fecha y hora. Estilista y cliente son opcionales.
- Si el jefe dice "cancela la cita de Juan a las 3pm hoy", busca primero la cita y CONFIRMA antes de cancelar.
- Para reagendar: necesitas la cita actual y la nueva hora.
- Si te piden algo que NO es agenda (ventas, cobros, productos, nómina), responde:
  "Jefe, eso no es lo mío. Déjeme pasarle al agente de [POS/Inventario/Personal]. Vuelva a pedirlo y lo redirijo."

FORMATO DE FECHAS/HORAS:
- Acepta: "hoy", "mañana", "ayer", "3pm", "15:00", "10am"
- Zona horaria: America/Bogota`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'ver_citas_hoy',
            description: 'Muestra todas las citas programadas para hoy con servicio, estilista, cliente y hora.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_agenda_fecha',
            description: 'Muestra las citas de una fecha específica.',
            parameters: {
                type: 'object',
                properties: {
                    fecha: { type: 'string', description: "Fecha: 'hoy', 'mañana', 'ayer' o YYYY-MM-DD" },
                },
                required: ['fecha'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_cita',
            description: 'Crea una cita. El estilista y el cliente son opcionales.',
            parameters: {
                type: 'object',
                properties: {
                    servicio: { type: 'string' },
                    fecha: { type: 'string', description: "Fecha: 'hoy', 'mañana' o YYYY-MM-DD" },
                    hora: { type: 'string', description: "Hora: '3pm', '15:00', '10am'" },
                    estilista: { type: 'string', description: 'Nombre del estilista (opcional)' },
                    cliente: { type: 'string', description: 'Nombre del cliente (opcional)' },
                },
                required: ['servicio', 'fecha', 'hora'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cancelar_cita',
            description: 'Cancela una cita. Requiere identificar la cita por hora + (cliente o estilista) + fecha.',
            parameters: {
                type: 'object',
                properties: {
                    fecha: { type: 'string', description: "Fecha de la cita: 'hoy', 'mañana' o YYYY-MM-DD" },
                    hora: { type: 'string', description: 'Hora de la cita (ej: 3pm, 15:00)' },
                    cliente: { type: 'string', description: 'Nombre del cliente (opcional, para desambiguar)' },
                    estilista: { type: 'string', description: 'Nombre del estilista (opcional, para desambiguar)' },
                },
                required: ['fecha', 'hora'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reagendar_cita',
            description: 'Mueve una cita a una nueva fecha/hora.',
            parameters: {
                type: 'object',
                properties: {
                    fecha_actual: { type: 'string' },
                    hora_actual: { type: 'string' },
                    nueva_fecha: { type: 'string' },
                    nueva_hora: { type: 'string' },
                    cliente: { type: 'string', description: 'Para desambiguar (opcional)' },
                    estilista: { type: 'string', description: 'Para desambiguar (opcional)' },
                },
                required: ['fecha_actual', 'hora_actual', 'nueva_fecha', 'nueva_hora'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'marcar_cita_completada',
            description: 'Marca una cita como completada (atendida).',
            parameters: {
                type: 'object',
                properties: {
                    fecha: { type: 'string' },
                    hora: { type: 'string' },
                    cliente: { type: 'string' },
                    estilista: { type: 'string' },
                },
                required: ['fecha', 'hora'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_fichero_digital',
            description: 'Muestra el fichero digital (digiturno): estilistas con sus servicios y conteo de atenciones completadas.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'clientes_atendidos_hoy',
            description: 'Cuántos clientes se han atendido hoy y qué servicios se realizaron.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_ubicacion_estilistas',
            description: 'Muestra qué estilistas están dentro del salón según geolocalización.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
];

async function findAppointmentByDateTime(tenantId, fechaStr, horaStr, clienteHint, estilistaHint) {
    const fecha = normalizeDateKeyword(fechaStr);
    const hora = normalizeHumanTimeToHHMM(horaStr);
    if (!hora) return { error: 'Hora inválida.' };

    const startUtc = makeLocalUtc(fecha, '00:00');
    const endUtc = makeLocalUtc(fecha, '23:59');
    const targetUtc = makeLocalUtc(fecha, hora);
    const windowMs = 30 * 60 * 1000;

    const params = [tenantId, startUtc, endUtc];
    let where = `a.tenant_id = $1::uuid AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz AND a.status NOT IN ('cancelled','completed','checked_out')`;

    if (clienteHint) {
        params.push(`%${String(clienteHint).toLowerCase()}%`);
        where += ` AND (LOWER(cl.first_name) LIKE $${params.length} OR LOWER(cl.last_name) LIKE $${params.length} OR LOWER(CONCAT(cl.first_name,' ',cl.last_name)) LIKE $${params.length})`;
    }
    if (estilistaHint) {
        params.push(`%${String(estilistaHint).toLowerCase()}%`);
        where += ` AND (LOWER(st.first_name) LIKE $${params.length} OR LOWER(st.last_name) LIKE $${params.length} OR LOWER(CONCAT(st.first_name,' ',st.last_name)) LIKE $${params.length})`;
    }

    const { rows } = await db.query(`
        SELECT a.id, a.start_time, a.end_time, a.status, a.service_id, a.stylist_id, a.client_id,
               s.name AS servicio, s.duration_minutes,
               CONCAT(st.first_name, ' ', COALESCE(st.last_name,'')) AS estilista,
               CONCAT(COALESCE(cl.first_name,''), ' ', COALESCE(cl.last_name,'')) AS cliente
        FROM appointments a
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN users st ON a.stylist_id = st.id
        LEFT JOIN users cl ON a.client_id = cl.id
        WHERE ${where}
        ORDER BY ABS(EXTRACT(EPOCH FROM (a.start_time - $${params.length + 1}::timestamptz)))
        LIMIT 5
    `, [...params, targetUtc]);

    if (!rows.length) return { error: `No encontré citas el ${fecha} cerca de las ${hora}.` };
    const closest = rows[0];
    const diff = Math.abs(new Date(closest.start_time).getTime() - targetUtc.getTime());
    if (diff > windowMs) {
        return { error: `No encontré una cita el ${fecha} a las ${hora}. La más cercana es ${fmtTime(closest.start_time)} (${closest.servicio} con ${closest.estilista}).` };
    }
    return { appointment: closest };
}

const executors = {
    async ver_citas_hoy(args, { tenantId }) {
        return executors.ver_agenda_fecha({ fecha: 'hoy' }, { tenantId });
    },

    async ver_agenda_fecha({ fecha }, { tenantId }) {
        const f = normalizeDateKeyword(fecha);
        const startUtc = makeLocalUtc(f, '00:00');
        const endUtc = makeLocalUtc(f, '23:59');
        const { rows } = await db.query(`
            SELECT a.id, a.start_time, a.end_time, a.status,
                   s.name AS servicio, s.price AS precio,
                   CONCAT(st.first_name, ' ', COALESCE(st.last_name,'')) AS estilista,
                   CONCAT(COALESCE(cl.first_name,''), ' ', COALESCE(cl.last_name,'')) AS cliente
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN users st ON a.stylist_id = st.id
            LEFT JOIN users cl ON a.client_id = cl.id
            WHERE a.tenant_id = $1::uuid
              AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz
              AND a.status != 'cancelled'
            ORDER BY a.start_time
        `, [tenantId, startUtc, endUtc]);
        return {
            fecha: f,
            total_citas: rows.length,
            citas: rows.map(r => ({
                hora: fmtTime(r.start_time),
                servicio: r.servicio,
                precio: r.precio,
                estilista: r.estilista?.trim(),
                cliente: r.cliente?.trim() || 'Sin asignar',
                estado: r.status,
            })),
        };
    },

    async crear_cita(args, { tenantId }) {
        const fecha = normalizeDateKeyword(args.fecha);
        const hora = normalizeHumanTimeToHHMM(args.hora);
        if (!hora) return { error: 'No pude interpretar la hora. Usa formato 3pm o 15:00.' };

        const services = await findService(tenantId, args.servicio);
        if (!services?.length) return { error: `No encontré el servicio "${args.servicio}".` };
        const svc = services[0];

        let stylistId = null, stylistWh = null, stylistName = null;
        if (args.estilista) {
            const st = await findStylist(tenantId, args.estilista);
            if (st) { stylistId = st.id; stylistWh = st.working_hours; stylistName = `${st.first_name} ${st.last_name || ''}`.trim(); }
        }
        if (!stylistId) {
            const { rows: anyRows } = await db.query(`
                SELECT u.id, u.working_hours, u.first_name, u.last_name FROM stylist_services ss
                JOIN users u ON ss.user_id = u.id
                WHERE u.tenant_id = $1::uuid AND ss.service_id = $2::uuid
                  AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                LIMIT 1
            `, [tenantId, svc.id]);
            if (anyRows.length) {
                stylistId = anyRows[0].id; stylistWh = anyRows[0].working_hours;
                stylistName = `${anyRows[0].first_name} ${anyRows[0].last_name || ''}`.trim();
            }
        }
        if (!stylistId) return { error: 'No hay estilista disponible para ese servicio.' };

        let clientId = null;
        if (args.cliente) {
            const found = await findClient(tenantId, args.cliente);
            if (found?.length) clientId = found[0].id;
        }

        const startTime = makeLocalUtc(fecha, hora);
        const endTime = new Date(startTime.getTime() + svc.duration_minutes * 60 * 1000);

        if (stylistWh) {
            try {
                const wh = typeof stylistWh === 'string' ? JSON.parse(stylistWh) : stylistWh;
                const isoDay = parseInt(formatInTimeZone(startTime, TIME_ZONE, 'i'), 10);
                const dayOfWeek = isoDay === 7 ? 0 : isoDay;
                const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const dayKey = dayNames[dayOfWeek];
                const horaNum = parseInt(hora.split(':')[0], 10);
                if (wh[dayKey]) {
                    const { start, end } = wh[dayKey];
                    if (start && end) {
                        const startWork = parseInt(start, 10);
                        const endWork = parseInt(end, 10);
                        if (horaNum < startWork || horaNum >= endWork) {
                            return { error: `${stylistName || 'El estilista'} no trabaja a las ${hora}. Horario los ${dayKey}: ${start}:00 a ${end}:00.` };
                        }
                    }
                }
            } catch { /* ignore parse errors */ }
        }

        const { rows: conflicts } = await db.query(`
            SELECT id FROM appointments
            WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid
              AND status IN ('scheduled', 'rescheduled', 'checked_in')
              AND (start_time, end_time) OVERLAPS ($3::timestamptz, $4::timestamptz)
            LIMIT 1
        `, [tenantId, stylistId, startTime, endTime]);
        if (conflicts.length) return { error: 'El estilista ya tiene una cita en ese horario.' };

        const { rows: newAppt } = await db.query(`
            INSERT INTO appointments (tenant_id, client_id, stylist_id, service_id, start_time, end_time, status)
            VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, 'scheduled')
            RETURNING id
        `, [tenantId, clientId, stylistId, svc.id, startTime, endTime]);

        return {
            success: true,
            cita_id: newAppt[0].id,
            servicio: svc.name,
            estilista: stylistName,
            fecha, hora,
            mensaje: `Cita creada para ${svc.name} con ${stylistName || 'estilista'} el ${fecha} a las ${hora}.`,
        };
    },

    async cancelar_cita(args, { tenantId }) {
        const found = await findAppointmentByDateTime(tenantId, args.fecha, args.hora, args.cliente, args.estilista);
        if (found.error) return { error: found.error };
        const a = found.appointment;
        await db.query(`UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1::uuid`, [a.id]);
        return {
            success: true,
            cita_id: a.id,
            mensaje: `Cita cancelada: ${a.servicio} con ${a.estilista?.trim()} el ${normalizeDateKeyword(args.fecha)} a las ${fmtTime(a.start_time)}.`,
        };
    },

    async reagendar_cita(args, { tenantId }) {
        const found = await findAppointmentByDateTime(tenantId, args.fecha_actual, args.hora_actual, args.cliente, args.estilista);
        if (found.error) return { error: found.error };
        const a = found.appointment;
        const newDate = normalizeDateKeyword(args.nueva_fecha);
        const newTime = normalizeHumanTimeToHHMM(args.nueva_hora);
        if (!newTime) return { error: 'Nueva hora inválida.' };
        const newStart = makeLocalUtc(newDate, newTime);
        const newEnd = new Date(newStart.getTime() + (a.duration_minutes || 60) * 60 * 1000);

        const { rows: conflicts } = await db.query(`
            SELECT id FROM appointments
            WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid AND id != $3::uuid
              AND status IN ('scheduled','rescheduled','checked_in')
              AND (start_time, end_time) OVERLAPS ($4::timestamptz, $5::timestamptz)
            LIMIT 1
        `, [tenantId, a.stylist_id, a.id, newStart, newEnd]);
        if (conflicts.length) return { error: 'Conflicto: el estilista ya tiene otra cita en ese horario.' };

        await db.query(`UPDATE appointments SET start_time=$1, end_time=$2, status='rescheduled', updated_at=NOW() WHERE id=$3::uuid`, [newStart, newEnd, a.id]);
        return {
            success: true,
            cita_id: a.id,
            mensaje: `Cita reagendada: ${a.servicio} con ${a.estilista?.trim()} → ${newDate} a las ${newTime}.`,
        };
    },

    async marcar_cita_completada(args, { tenantId }) {
        const found = await findAppointmentByDateTime(tenantId, args.fecha, args.hora, args.cliente, args.estilista);
        if (found.error) return { error: found.error };
        const a = found.appointment;
        await db.query(`UPDATE appointments SET status='completed', updated_at=NOW() WHERE id=$1::uuid`, [a.id]);
        return {
            success: true,
            cita_id: a.id,
            mensaje: `Marqué como completada la cita de ${a.cliente?.trim() || 'cliente'} (${a.servicio}) con ${a.estilista?.trim()}.`,
        };
    },

    async ver_fichero_digital(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT u.id, CONCAT(u.first_name, ' ', COALESCE(u.last_name,'')) AS estilista,
                   s.name AS servicio,
                   ss.total_completed,
                   ss.last_completed_at
            FROM stylist_services ss
            JOIN users u ON ss.user_id = u.id
            JOIN services s ON ss.service_id = s.id
            WHERE u.tenant_id = $1::uuid AND u.role_id = 3
              AND COALESCE(NULLIF(u.status,''),'active') = 'active'
            ORDER BY u.first_name, ss.total_completed DESC
        `, [tenantId]);
        return { fichero: rows };
    },

    async clientes_atendidos_hoy(args, { tenantId }) {
        const today = normalizeDateKeyword('hoy');
        const startUtc = makeLocalUtc(today, '00:00');
        const endUtc = makeLocalUtc(today, '23:59');
        const { rows } = await db.query(`
            SELECT COUNT(DISTINCT a.client_id) AS clientes,
                   COUNT(*) AS total_citas,
                   ARRAY_AGG(DISTINCT s.name) AS servicios
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            WHERE a.tenant_id = $1::uuid
              AND a.start_time >= $2::timestamptz AND a.start_time <= $3::timestamptz
              AND a.status IN ('completed', 'checked_out')
        `, [tenantId, startUtc, endUtc]);
        const r = rows[0];
        return {
            fecha: today,
            clientes_atendidos: parseInt(r.clientes) || 0,
            citas_completadas: parseInt(r.total_citas) || 0,
            servicios_realizados: (r.servicios || []).filter(Boolean),
        };
    },

    async ver_ubicacion_estilistas(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT CONCAT(first_name, ' ', COALESCE(last_name,'')) AS estilista,
                   is_inside_geofence, last_location_update
            FROM users
            WHERE tenant_id = $1::uuid AND role_id = 3
              AND COALESCE(NULLIF(status,''),'active') = 'active'
            ORDER BY first_name
        `, [tenantId]);
        const dentro = rows.filter(r => r.is_inside_geofence === true);
        const fuera = rows.filter(r => r.is_inside_geofence !== true);
        return {
            en_salon: dentro.map(r => ({
                estilista: r.estilista?.trim(),
                ultima_ubicacion: r.last_location_update ? fmtTime(r.last_location_update) : 'Sin datos',
            })),
            fuera_salon: fuera.map(r => ({
                estilista: r.estilista?.trim(),
                ultima_ubicacion: r.last_location_update ? fmtTime(r.last_location_update) : 'Sin datos',
            })),
            total_dentro: dentro.length,
            total_fuera: fuera.length,
        };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en recepcion.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[recepcion] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'recepcion', tools, systemPrompt, executors, execute };
