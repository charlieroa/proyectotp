// src/controllers/campaignController.js
const prisma = require('../config/prisma');
const { startCampaignQueue, stopCampaignQueue } = require('../services/campaignQueueService');
const { sendCampaignEmail } = require('../services/emailService');

let ioInstance = null;
function setIO(io) { ioInstance = io; }

/**
 * Get inactive clients for a tenant.
 * Clients (role_id=4) whose last completed appointment is > X days ago, or who have no appointments.
 */
async function getInactiveClients(tenantId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const clients = await prisma.$queryRaw`
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
           MAX(a.end_time) as last_appointment
    FROM users u
    LEFT JOIN appointments a ON a.client_id = u.id
      AND a.tenant_id = u.tenant_id
      AND a.status = 'completed'
    WHERE u.tenant_id = ${tenantId}::uuid
      AND u.role_id = 4
      AND u.email IS NOT NULL
      AND u.email != ''
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone
    HAVING MAX(a.end_time) IS NULL OR MAX(a.end_time) < ${cutoffDate}
    ORDER BY last_appointment ASC NULLS FIRST
  `;

  return clients;
}

// --- Preview inactive clients ---
exports.previewInactiveClients = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const days = parseInt(req.query.days) || 30;
    const clients = await getInactiveClients(tenantId, days);
    res.json({ count: clients.length, clients });
  } catch (err) {
    console.error('[Campaign] previewInactiveClients error:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes inactivos.' });
  }
};

// --- List campaigns ---
exports.listCampaigns = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const campaigns = await prisma.campaigns.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, name: true, subject: true, status: true,
        total_recipients: true, sent_count: true, failed_count: true,
        created_at: true, scheduled_at: true, completed_at: true,
      },
    });
    res.json(campaigns);
  } catch (err) {
    console.error('[Campaign] listCampaigns error:', err.message);
    res.status(500).json({ error: 'Error al listar campañas.' });
  }
};

// --- Get single campaign ---
exports.getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const campaign = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada.' });
    res.json(campaign);
  } catch (err) {
    console.error('[Campaign] getCampaign error:', err.message);
    res.status(500).json({ error: 'Error al obtener campaña.' });
  }
};

// --- Create campaign ---
exports.createCampaign = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { name, subject, html_content, inactive_days } = req.body;

    if (!name || !subject || !html_content) {
      return res.status(400).json({ error: 'Nombre, asunto y contenido son requeridos.' });
    }

    const days = parseInt(inactive_days) || 30;
    const clients = await getInactiveClients(tenantId, days);

    const campaign = await prisma.campaigns.create({
      data: {
        tenant_id: tenantId,
        name,
        subject,
        html_content,
        target_criteria: { inactive_days: days },
        total_recipients: clients.length,
        created_by_user_id: userId,
      },
    });

    // Create recipients
    if (clients.length > 0) {
      await prisma.campaign_recipients.createMany({
        data: clients.map(c => ({
          campaign_id: campaign.id,
          user_id: c.id,
          email: c.email,
          recipient_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        })),
      });
    }

    res.status(201).json(campaign);
  } catch (err) {
    console.error('[Campaign] createCampaign error:', err.message);
    res.status(500).json({ error: 'Error al crear campaña.' });
  }
};

// --- Update campaign (draft only) ---
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const { name, subject, html_content } = req.body;

    const existing = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Campaña no encontrada.' });
    if (existing.status !== 'draft') return res.status(400).json({ error: 'Solo se pueden editar campañas en borrador.' });

    const updated = await prisma.campaigns.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(html_content && { html_content }),
        updated_at: new Date(),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('[Campaign] updateCampaign error:', err.message);
    res.status(500).json({ error: 'Error al actualizar campaña.' });
  }
};

// --- Delete campaign ---
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const existing = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Campaña no encontrada.' });

    // Stop queue if running
    stopCampaignQueue(id);

    await prisma.campaigns.delete({ where: { id } });
    res.json({ message: 'Campaña eliminada.' });
  } catch (err) {
    console.error('[Campaign] deleteCampaign error:', err.message);
    res.status(500).json({ error: 'Error al eliminar campaña.' });
  }
};

// --- Start sending ---
exports.startSending = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const campaign = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada.' });
    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      return res.status(400).json({ error: 'Solo se pueden enviar campañas en borrador o pausadas.' });
    }

    await prisma.campaigns.update({
      where: { id },
      data: { status: 'sending', updated_at: new Date() },
    });

    startCampaignQueue(id, ioInstance);
    res.json({ message: 'Envío iniciado.' });
  } catch (err) {
    console.error('[Campaign] startSending error:', err.message);
    res.status(500).json({ error: 'Error al iniciar envío.' });
  }
};

// --- Pause sending ---
exports.pauseSending = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const campaign = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada.' });
    if (campaign.status !== 'sending') {
      return res.status(400).json({ error: 'Solo se pueden pausar campañas en envío.' });
    }

    stopCampaignQueue(id);
    await prisma.campaigns.update({
      where: { id },
      data: { status: 'paused', updated_at: new Date() },
    });

    res.json({ message: 'Envío pausado.' });
  } catch (err) {
    console.error('[Campaign] pauseSending error:', err.message);
    res.status(500).json({ error: 'Error al pausar envío.' });
  }
};

// --- Get recipients ---
exports.getRecipients = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Verify campaign belongs to tenant
    const campaign = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada.' });

    const [recipients, total] = await Promise.all([
      prisma.campaign_recipients.findMany({
        where: { campaign_id: id },
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaign_recipients.count({ where: { campaign_id: id } }),
    ]);

    res.json({ recipients, total, page, limit });
  } catch (err) {
    console.error('[Campaign] getRecipients error:', err.message);
    res.status(500).json({ error: 'Error al obtener destinatarios.' });
  }
};

// --- Send test email to admin ---
exports.sendTestEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const campaign = await prisma.campaigns.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada.' });

    // Get admin's email
    const admin = await prisma.users.findFirst({
      where: { id: req.user.id },
      select: { email: true, first_name: true },
    });
    if (!admin?.email) return res.status(400).json({ error: 'No se encontró email del admin.' });

    await sendCampaignEmail({
      to: admin.email,
      subject: `[PRUEBA] ${campaign.subject}`,
      html: campaign.html_content,
      recipientName: admin.first_name || 'Admin',
    });

    res.json({ message: `Email de prueba enviado a ${admin.email}` });
  } catch (err) {
    console.error('[Campaign] sendTestEmail error:', err.message);
    res.status(500).json({ error: 'Error al enviar email de prueba.' });
  }
};

exports.setIO = setIO;
exports.getInactiveClients = getInactiveClients;
