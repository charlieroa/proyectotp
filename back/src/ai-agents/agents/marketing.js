'use strict';

const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { findClient, getDefaultAdmin } = require('../shared/lookups');

const systemPrompt = `Eres el AGENTE DE MARKETING y CLIENTES del salón. Manejas la BASE DE CLIENTES y CAMPAÑAS DE EMAIL.

PERSONALIDAD:
- "Listo jefe", "Como ordene jefe".
- Confirma antes de enviar campañas masivas.

REGLAS:
- Para campañas de inactivos: SIEMPRE primero envía prueba (enviar_prueba=true). Cuando confirme, envía con enviar_prueba=false.
- Plantillas: te_extranamos, descuento, nuevo_servicio.
- Para crear cliente: nombre + teléfono o email. Email opcional (se autogenera si falta).`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'listar_clientes',
            description: 'Lista los clientes recientes (paginado).',
            parameters: {
                type: 'object',
                properties: {
                    limite: { type: 'integer', description: 'Default 20' },
                    busqueda: { type: 'string', description: 'Filtrar por nombre o teléfono (opcional)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'buscar_cliente',
            description: 'Busca clientes por nombre o teléfono y devuelve hasta 5 coincidencias.',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_cliente',
            description: 'Registra un nuevo cliente.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    apellido: { type: 'string' },
                    telefono: { type: 'string' },
                    email: { type: 'string' },
                },
                required: ['nombre'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_historial_cliente',
            description: 'Muestra las visitas y gastos de un cliente.',
            parameters: {
                type: 'object',
                properties: {
                    cliente: { type: 'string', description: 'Nombre o teléfono' },
                    limite: { type: 'integer', description: 'Default 20 visitas' },
                },
                required: ['cliente'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'enviar_campana_inactivos',
            description: 'Crea y envía campaña a clientes inactivos. Por defecto envía prueba al admin.',
            parameters: {
                type: 'object',
                properties: {
                    dias_inactividad: { type: 'integer', description: 'Default 30' },
                    plantilla: { type: 'string', enum: ['te_extranamos', 'descuento', 'nuevo_servicio'] },
                    asunto: { type: 'string' },
                    enviar_prueba: { type: 'boolean', description: 'true=solo al admin, false=a todos' },
                },
                required: ['dias_inactividad'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'historial_campanas',
            description: 'Lista las campañas de email históricas.',
            parameters: {
                type: 'object',
                properties: { limite: { type: 'integer', description: 'Default 10' } },
                required: [],
            },
        },
    },
];

const TEMPLATES = {
    te_extranamos: {
        subject: '¡Te extrañamos! Vuelve a visitarnos',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><h2>¡Te extrañamos! 💇‍♀️</h2><p>Hola {{nombre}},</p><p>Hace tiempo que no te vemos por nuestro salón y queremos que sepas que <strong>te esperamos con los brazos abiertos</strong>.</p><p>Agenda tu próxima cita y déjanos consentirte.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
    },
    descuento: {
        subject: '¡Descuento especial solo para ti!',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><div style="text-align:center;background:linear-gradient(135deg,#438eff,#6366f1);border-radius:12px;padding:30px;margin-bottom:20px;"><h2 style="color:white;">🎉 ¡Descuento Especial!</h2><p style="color:rgba(255,255,255,0.9);font-size:18px;">Obtén un <strong style="font-size:24px;">15% OFF</strong> en tu próximo servicio</p></div><p>Hola {{nombre}},</p><p>Porque valoramos tu lealtad, tenemos un descuento exclusivo esperándote.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
    },
    nuevo_servicio: {
        subject: '¡Conoce nuestro nuevo servicio!',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#438eff;text-align:center;">Tupelukeria</h1><h2>✨ ¡Nuevo Servicio Disponible!</h2><p>Hola {{nombre}},</p><p>Estamos emocionados de anunciar que hemos incorporado un <strong>nuevo servicio</strong> a nuestro catálogo. Sé de los primeros en probarlo.</p><p><strong>Tu equipo de Tupelukeria</strong></p></div>`,
    },
};

const executors = {
    async listar_clientes(args, { tenantId }) {
        const limit = args.limite || 20;
        const params = [tenantId];
        let extra = '';
        if (args.busqueda) {
            params.push(`%${String(args.busqueda).toLowerCase()}%`);
            extra = `AND (LOWER(first_name) LIKE $2 OR LOWER(last_name) LIKE $2 OR phone LIKE $2)`;
        }
        const { rows } = await db.query(`
            SELECT id, first_name, last_name, phone, email, last_service_at
            FROM users
            WHERE tenant_id = $1::uuid AND role_id = 4
              AND COALESCE(NULLIF(status,''),'active') = 'active'
              ${extra}
            ORDER BY COALESCE(last_service_at, created_at) DESC
            LIMIT ${parseInt(limit, 10)}
        `, params);
        return { total: rows.length, clientes: rows };
    },

    async buscar_cliente(args, { tenantId }) {
        const found = await findClient(tenantId, args.query);
        return { total: found.length, coincidencias: found };
    },

    async crear_cliente(args, { tenantId }) {
        const slug = (args.nombre + (args.apellido ? args.apellido : '') + Date.now()).toLowerCase().replace(/\s+/g, '');
        const email = args.email || `${slug}@temp.local`;
        const bcrypt = require('bcryptjs');
        const password = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
        try {
            const { rows } = await db.query(`
                INSERT INTO users (tenant_id, first_name, last_name, email, phone, password_hash, role_id, status)
                VALUES ($1::uuid, $2, $3, $4, $5, $6, 4, 'active')
                RETURNING id, first_name, last_name, email, phone
            `, [tenantId, args.nombre, args.apellido || '', email, args.telefono || null, password]);
            return { success: true, cliente: rows[0], mensaje: `Cliente ${args.nombre} creado.` };
        } catch (err) {
            if (err.code === '23505') return { error: 'Ya existe un cliente con ese email.' };
            throw err;
        }
    },

    async ver_historial_cliente(args, { tenantId }) {
        const found = await findClient(tenantId, args.cliente);
        if (!found?.length) return { error: `No encontré "${args.cliente}".` };
        const c = found[0];
        const limit = args.limite || 20;
        const { rows: visits } = await db.query(`
            SELECT i.id, i.created_at, i.total_amount, i.tip_amount,
                   STRING_AGG(ii.description, ', ') AS items
            FROM invoices i
            LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
            WHERE i.tenant_id = $1::uuid AND i.client_id = $2::uuid
              AND i.status != 'cancelled'
            GROUP BY i.id
            ORDER BY i.created_at DESC
            LIMIT ${parseInt(limit, 10)}
        `, [tenantId, c.id]);
        const totalGastado = visits.reduce((s, v) => s + Number(v.total_amount || 0), 0);
        return {
            cliente: `${c.first_name} ${c.last_name || ''}`.trim(),
            telefono: c.phone,
            email: c.email,
            total_visitas: visits.length,
            total_gastado: totalGastado,
            visitas: visits,
        };
    },

    async enviar_campana_inactivos(args, { tenantId }) {
        const { getInactiveClients } = require('../../controllers/campaignController');
        const { sendCampaignEmail } = require('../../services/emailService');
        const { startCampaignQueue } = require('../../services/campaignQueueService');

        const days = args.dias_inactividad || 30;
        const sendTest = args.enviar_prueba !== false;
        const plantilla = args.plantilla || 'te_extranamos';
        const tpl = TEMPLATES[plantilla] || TEMPLATES.te_extranamos;
        const subject = args.asunto || tpl.subject;

        const clients = await getInactiveClients(tenantId, days);
        if (!clients.length) return { mensaje: `No hay clientes inactivos en los últimos ${days} días.` };

        const admin = await getDefaultAdmin(tenantId);

        if (sendTest) {
            const campaign = await prisma.campaigns.create({
                data: {
                    tenant_id: tenantId,
                    name: `Campaña inactivos (${days} días) - ${new Date().toLocaleDateString('es-CO')}`,
                    subject,
                    html_content: tpl.html,
                    target_criteria: { inactive_days: days },
                    total_recipients: clients.length,
                    created_by_user_id: admin?.id,
                },
            });
            if (clients.length) {
                await prisma.campaign_recipients.createMany({
                    data: clients.map(c => ({
                        campaign_id: campaign.id,
                        user_id: c.id,
                        email: c.email,
                        recipient_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
                    })),
                });
            }
            if (admin?.email) {
                await sendCampaignEmail({
                    to: admin.email,
                    subject: `[PRUEBA] ${subject}`,
                    html: tpl.html,
                    recipientName: admin.first_name || 'Admin',
                });
            }
            return {
                mensaje: `Encontré ${clients.length} clientes inactivos. Prueba enviada a ${admin?.email || 'tu email'}. Campaña guardada como borrador. ¿Envío a todos?`,
                clientes_inactivos: clients.length,
                campaign_id: campaign.id,
                prueba_enviada: true,
            };
        }

        let campaign = await prisma.campaigns.findFirst({
            where: { tenant_id: tenantId, status: 'draft' },
            orderBy: { created_at: 'desc' },
        });
        if (!campaign) {
            campaign = await prisma.campaigns.create({
                data: {
                    tenant_id: tenantId,
                    name: `Campaña inactivos (${days} días)`,
                    subject,
                    html_content: tpl.html,
                    target_criteria: { inactive_days: days },
                    total_recipients: clients.length,
                    created_by_user_id: admin?.id,
                },
            });
            if (clients.length) {
                await prisma.campaign_recipients.createMany({
                    data: clients.map(c => ({
                        campaign_id: campaign.id,
                        user_id: c.id,
                        email: c.email,
                        recipient_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
                    })),
                });
            }
        }
        await prisma.campaigns.update({
            where: { id: campaign.id },
            data: { status: 'sending', updated_at: new Date() },
        });
        startCampaignQueue(campaign.id, null);
        return {
            mensaje: `Inicié envío a ${campaign.total_recipients} clientes. Vea el progreso en CRM → Campañas.`,
            clientes: campaign.total_recipients,
            campaign_id: campaign.id,
            enviando: true,
        };
    },

    async historial_campanas(args, { tenantId }) {
        const limit = args.limite || 10;
        const { rows } = await db.query(`
            SELECT id, name, subject, status, total_recipients, sent_count, failed_count, created_at, completed_at
            FROM campaigns
            WHERE tenant_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT ${parseInt(limit, 10)}
        `, [tenantId]);
        return { total: rows.length, campanas: rows };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en marketing.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[marketing] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'marketing', tools, systemPrompt, executors, execute };
