'use strict';

const db = require('../../config/db');
const { findService } = require('../shared/lookups');

const systemPrompt = `Eres el AGENTE DE CONFIGURACIÓN del salón. Manejas información del salón, horarios, servicios, categorías de servicio y promociones.

PERSONALIDAD:
- Trata al usuario como "jefe": "Listo jefe", "Como ordene jefe".
- Confirma antes de crear servicios o promociones (precios, % comisión, etc.)
- Cuando el jefe diga "mi horario es de lunes a viernes de 8 a 6" → configurar_horario_salon directo.
- Cuando diga "cambia el nombre" o "actualizar dirección" → actualizar_info_salon directo.

REGLAS:
- Servicios: nombre + precio + duración + comisión (opcional, default 0).
- Promociones: tipo (percentage/fixed_amount), valor, aplica_a (all/service/product).
- Si te piden ver ventas, agendar citas o cobrar, responde: "Jefe, eso pertenece a otro agente. Vuelva a pedirlo y lo redirijo."`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'ver_configuracion_salon',
            description: 'Muestra la configuración actual del salón.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'actualizar_info_salon',
            description: 'Actualiza información general del salón.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    direccion: { type: 'string' },
                    ciudad: { type: 'string' },
                    telefono: { type: 'string' },
                    email: { type: 'string' },
                    sitio_web: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'configurar_horario_salon',
            description: "Configura los días y horario de atención del salón. dias='lunes,martes,...' hora_inicio='8' hora_fin='18'.",
            parameters: {
                type: 'object',
                properties: {
                    dias: { type: 'string', description: "'lunes,martes,miercoles,jueves,viernes'" },
                    hora_inicio: { type: 'string' },
                    hora_fin: { type: 'string' },
                },
                required: ['dias', 'hora_inicio', 'hora_fin'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_servicios',
            description: 'Lista todos los servicios con precio, duración y comisión.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_servicio',
            description: 'Crea un nuevo servicio.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    precio: { type: 'number' },
                    duracion_minutos: { type: 'integer' },
                    comision: { type: 'number' },
                    categoria: { type: 'string', description: 'Nombre de categoría (opcional)' },
                },
                required: ['nombre', 'precio', 'duracion_minutos'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'editar_servicio',
            description: 'Edita un servicio existente. Pasa solo los campos a cambiar.',
            parameters: {
                type: 'object',
                properties: {
                    servicio: { type: 'string', description: 'Nombre del servicio actual' },
                    nuevo_nombre: { type: 'string' },
                    precio: { type: 'number' },
                    duracion_minutos: { type: 'integer' },
                    comision: { type: 'number' },
                },
                required: ['servicio'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'desactivar_servicio',
            description: 'Borra un servicio del catálogo.',
            parameters: {
                type: 'object',
                properties: { servicio: { type: 'string' } },
                required: ['servicio'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_categoria_servicio',
            description: 'Crea una categoría de servicio (ej: Cabello, Uñas, Spa).',
            parameters: {
                type: 'object',
                properties: { nombre: { type: 'string' } },
                required: ['nombre'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_categorias_servicio',
            description: 'Lista las categorías de servicio.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_promociones',
            description: 'Lista las promociones del salón.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_promocion',
            description: 'Crea una promoción.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    descripcion: { type: 'string' },
                    tipo_descuento: { type: 'string', enum: ['percentage', 'fixed_amount'] },
                    valor: { type: 'number' },
                    aplica_a: { type: 'string', enum: ['all', 'service', 'product'] },
                    fecha_inicio: { type: 'string' },
                    fecha_fin: { type: 'string' },
                },
                required: ['nombre', 'tipo_descuento', 'valor'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'desactivar_promocion',
            description: 'Desactiva una promoción.',
            parameters: {
                type: 'object',
                properties: { promocion: { type: 'string' } },
                required: ['promocion'],
            },
        },
    },
];

const executors = {
    async ver_configuracion_salon(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT name, address, city, phone, email, website, working_hours,
                   geofence_center_lat, geofence_center_lng, geofence_radius
            FROM tenants WHERE id = $1::uuid
        `, [tenantId]);
        if (!rows.length) return { error: 'No se encontró el salón.' };
        const t = rows[0];
        let horarioLegible = 'No configurado';
        if (t.working_hours) {
            const wh = typeof t.working_hours === 'string' ? JSON.parse(t.working_hours) : t.working_hours;
            const dayLabels = {
                monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
                lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', miércoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', sábado: 'Sábado', domingo: 'Domingo',
            };
            horarioLegible = Object.entries(wh).map(([dia, h]) => {
                const label = dayLabels[dia] || dia;
                if (typeof h === 'string') return `${label}: ${h === 'cerrado' ? 'Cerrado' : h.replace('-', ' - ')}`;
                if (h && h.start !== undefined) return `${label}: ${h.start}:00 - ${h.end}:00`;
                return `${label}: Cerrado`;
            }).join('\n');
        }
        return {
            nombre: t.name,
            direccion: t.address || 'No configurada',
            ciudad: t.city || 'No configurada',
            telefono: t.phone || 'No configurado',
            email: t.email || 'No configurado',
            sitio_web: t.website || 'No configurado',
            horario: horarioLegible,
        };
    },

    async actualizar_info_salon(args, { tenantId }) {
        const updates = [];
        const values = [];
        let p = 1;
        if (args.nombre)    { updates.push(`name = $${p++}`);    values.push(args.nombre); }
        if (args.direccion) { updates.push(`address = $${p++}`); values.push(args.direccion); }
        if (args.ciudad)    { updates.push(`city = $${p++}`);    values.push(args.ciudad); }
        if (args.telefono)  { updates.push(`phone = $${p++}`);   values.push(args.telefono); }
        if (args.email)     { updates.push(`email = $${p++}`);   values.push(args.email); }
        if (args.sitio_web) { updates.push(`website = $${p++}`); values.push(args.sitio_web); }
        if (!updates.length) return { error: 'No se proporcionaron datos para actualizar.' };
        updates.push(`updated_at = NOW()`);
        values.push(tenantId);
        await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${p}::uuid`, values);
        return { success: true, mensaje: 'Información del salón actualizada.' };
    },

    async configurar_horario_salon(args, { tenantId }) {
        if (!args.dias || !args.hora_inicio || !args.hora_fin) {
            return { error: 'Necesito: dias, hora_inicio, hora_fin.' };
        }
        const allDaysEs = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        const allDaysEn = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const diasInput = String(args.dias).toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .split(/[,\s]+/).map(d => d.trim()).filter(Boolean);
        const startH = String(parseInt(args.hora_inicio, 10)).padStart(2, '0');
        const endH = String(parseInt(args.hora_fin, 10)).padStart(2, '0');
        const finalHorario = {};
        for (let i = 0; i < allDaysEs.length; i++) {
            finalHorario[allDaysEn[i]] = diasInput.includes(allDaysEs[i]) ? `${startH}:00-${endH}:00` : 'cerrado';
        }
        await db.query(`UPDATE tenants SET working_hours = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, [JSON.stringify(finalHorario), tenantId]);
        return { success: true, horario: finalHorario, mensaje: 'Horario del salón actualizado.' };
    },

    async listar_servicios(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT id, name, price, duration_minutes, commission_percent
            FROM services WHERE tenant_id = $1::uuid ORDER BY name
        `, [tenantId]);
        return { total: rows.length, servicios: rows };
    },

    async crear_servicio(args, { tenantId }) {
        let categoryId = null;
        if (args.categoria) {
            const { rows } = await db.query(`SELECT id FROM service_categories WHERE tenant_id = $1::uuid AND LOWER(name) = LOWER($2) LIMIT 1`, [tenantId, args.categoria]);
            if (rows.length) categoryId = rows[0].id;
        }
        const { rows } = await db.query(`
            INSERT INTO services (tenant_id, name, price, duration_minutes, commission_percent, category_id)
            VALUES ($1::uuid, $2, $3, $4, $5, $6)
            RETURNING id, name, price, duration_minutes
        `, [tenantId, args.nombre, args.precio, args.duracion_minutos, args.comision || 0, categoryId]);
        return { success: true, servicio: rows[0] };
    },

    async editar_servicio(args, { tenantId }) {
        const services = await findService(tenantId, args.servicio);
        if (!services?.length) return { error: `No encontré el servicio "${args.servicio}".` };
        const svc = services[0];
        const updates = [];
        const values = [];
        let p = 1;
        if (args.nuevo_nombre) { updates.push(`name = $${p++}`); values.push(args.nuevo_nombre); }
        if (args.precio !== undefined) { updates.push(`price = $${p++}`); values.push(args.precio); }
        if (args.duracion_minutos !== undefined) { updates.push(`duration_minutes = $${p++}`); values.push(args.duracion_minutos); }
        if (args.comision !== undefined) { updates.push(`commission_percent = $${p++}`); values.push(args.comision); }
        if (!updates.length) return { error: 'No hay cambios.' };
        values.push(svc.id);
        await db.query(`UPDATE services SET ${updates.join(', ')} WHERE id = $${p}::uuid`, values);
        return { success: true, mensaje: `Servicio "${svc.name}" actualizado.` };
    },

    async desactivar_servicio(args, { tenantId }) {
        const services = await findService(tenantId, args.servicio);
        if (!services?.length) return { error: `No encontré el servicio "${args.servicio}".` };
        const svc = services[0];
        await db.query(`DELETE FROM services WHERE id = $1::uuid`, [svc.id]);
        return { success: true, mensaje: `Servicio "${svc.name}" eliminado.` };
    },

    async crear_categoria_servicio(args, { tenantId }) {
        try {
            const { rows } = await db.query(`
                INSERT INTO service_categories (tenant_id, name) VALUES ($1::uuid, $2)
                RETURNING id, name
            `, [tenantId, args.nombre]);
            return { success: true, categoria: rows[0] };
        } catch (err) {
            if (err.code === '23505') return { error: `Ya existe una categoría llamada "${args.nombre}".` };
            throw err;
        }
    },

    async listar_categorias_servicio(args, { tenantId }) {
        const { rows } = await db.query(`SELECT id, name FROM service_categories WHERE tenant_id = $1::uuid ORDER BY name`, [tenantId]);
        return { total: rows.length, categorias: rows };
    },

    async listar_promociones(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT id, name, description, discount_type, discount_value,
                   applies_to, start_date, end_date, is_active
            FROM promotions WHERE tenant_id = $1::uuid
            ORDER BY is_active DESC, created_at DESC
        `, [tenantId]);
        return { total: rows.length, promociones: rows };
    },

    async crear_promocion(args, { tenantId }) {
        const { rows } = await db.query(`
            INSERT INTO promotions (tenant_id, name, description, discount_type, discount_value, applies_to, start_date, end_date)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, discount_type, discount_value, applies_to
        `, [tenantId, args.nombre, args.descripcion || null, args.tipo_descuento, args.valor, args.aplica_a || 'all', args.fecha_inicio || null, args.fecha_fin || null]);
        return { success: true, promocion: rows[0] };
    },

    async desactivar_promocion(args, { tenantId }) {
        const { rows } = await db.query(`SELECT id, name FROM promotions WHERE tenant_id = $1::uuid AND LOWER(name) LIKE $2 LIMIT 1`, [tenantId, `%${args.promocion.toLowerCase()}%`]);
        if (!rows.length) return { error: `No encontré la promoción "${args.promocion}".` };
        await db.query(`UPDATE promotions SET is_active = false WHERE id = $1::uuid`, [rows[0].id]);
        return { success: true, mensaje: `Promoción "${rows[0].name}" desactivada.` };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en config.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[config] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'config', tools, systemPrompt, executors, execute };
