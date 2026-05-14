/**
 * Super Admin Controller
 * CRUD for tenants, global settings, token usage stats, and dashboard.
 */
'use strict';

const prisma = require('../config/prisma');
const { invalidateCache } = require('../services/openaiKeyService');

// ─── Dashboard ───────────────────────────────────────────────
exports.getDashboard = async (_req, res) => {
  try {
    const [totalTenants, totalUsers, tokensResult] = await Promise.all([
      prisma.tenants.count(),
      prisma.users.count({ where: { role_id: { not: 5 } } }),
      prisma.$queryRaw`
        SELECT COALESCE(SUM(total_tokens), 0)::bigint AS total
        FROM token_usage
        WHERE created_at >= date_trunc('month', NOW())
      `,
    ]);

    return res.json({
      total_tenants: totalTenants,
      total_users: totalUsers,
      tokens_this_month: Number(tokensResult[0].total),
    });
  } catch (err) {
    console.error('[SuperAdmin] getDashboard error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── Tenants CRUD ────────────────────────────────────────────
exports.listTenants = async (_req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT t.id, t.name, t.slug, t.email, t.phone,
              t.plan, t.subscription_status, t.current_period_end,
              t.stripe_subscription_id, t.stripe_customer_id,
              t.created_at,
              (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) AS user_count,
              (SELECT COALESCE(SUM(tu.total_tokens), 0)::bigint
               FROM token_usage tu
               WHERE tu.tenant_id = t.id
                 AND tu.created_at >= date_trunc('month', NOW())) AS tokens_this_month
       FROM tenants t
       ORDER BY t.created_at DESC`
    );

    const tenants = rows.map(r => ({
      ...r,
      tokens_this_month: Number(r.tokens_this_month),
    }));

    return res.json(tenants);
  } catch (err) {
    console.error('[SuperAdmin] listTenants error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateTenant = async (req, res) => {
  const { id } = req.params;
  const { payment_plan, plan, name, subscription_status } = req.body;

  try {
    const data = {};

    // Support both old payment_plan and new plan field
    if (plan !== undefined) {
      data.plan = plan;
    } else if (payment_plan !== undefined) {
      data.plan = payment_plan;
    }
    if (name !== undefined) {
      data.name = name;
    }
    if (subscription_status !== undefined) {
      data.subscription_status = subscription_status;
    }

    // If changing to free, clear Stripe fields
    if (data.plan === 'free') {
      data.stripe_subscription_id = null;
      data.subscription_status = 'canceled';
      data.current_period_end = null;
    }

    // If upgrading manually (no Stripe), set status
    if (data.plan && data.plan !== 'free' && !data.subscription_status) {
      data.subscription_status = 'active';
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar.' });
    }

    data.updated_at = new Date();

    const updated = await prisma.tenants.update({
      where: { id },
      data,
      select: { id: true, name: true, plan: true, subscription_status: true },
    });

    return res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant no encontrado.' });
    }
    console.error('[SuperAdmin] updateTenant error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.deleteTenant = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tenants.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant no encontrado.' });
    }
    console.error('[SuperAdmin] deleteTenant error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── Global Settings ─────────────────────────────────────────
exports.getSettings = async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT key, value, updated_at FROM global_settings`;
    const settings = {};
    for (const row of rows) {
      // Mask the OpenAI key for safety
      if (row.key === 'openai_api_key' && row.value) {
        settings[row.key] = '****' + row.value.slice(-4);
      } else {
        settings[row.key] = row.value;
      }
    }
    return res.json(settings);
  } catch (err) {
    console.error('[SuperAdmin] getSettings error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateSettings = async (req, res) => {
  const { openai_api_key } = req.body;
  try {
    if (openai_api_key !== undefined && !openai_api_key.startsWith('****')) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO global_settings (key, value, updated_at) VALUES ('openai_api_key', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        openai_api_key.trim() || null
      );
      invalidateCache();
    }
    // Re-fetch masked
    return exports.getSettings(req, res);
  } catch (err) {
    console.error('[SuperAdmin] updateSettings error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ─── Token Usage Stats ──────────────────────────────────────
exports.getTokenUsage = async (req, res) => {
  const { tenant_id, from, to } = req.query;

  try {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let i = 1;

    if (tenant_id) {
      whereClause += ` AND tu.tenant_id = $${i++}::uuid`;
      values.push(tenant_id);
    }
    if (from) {
      whereClause += ` AND tu.created_at >= $${i++}`;
      values.push(from);
    }
    if (to) {
      whereClause += ` AND tu.created_at <= $${i++}`;
      values.push(to);
    }

    const sql = `SELECT tu.tenant_id,
            t.name AS tenant_name,
            tu.call_type,
            tu.model,
            SUM(tu.prompt_tokens)::bigint     AS prompt_tokens,
            SUM(tu.completion_tokens)::bigint  AS completion_tokens,
            SUM(tu.total_tokens)::bigint       AS total_tokens,
            COUNT(*)::int                      AS call_count
     FROM token_usage tu
     LEFT JOIN tenants t ON t.id = tu.tenant_id
     ${whereClause}
     GROUP BY tu.tenant_id, t.name, tu.call_type, tu.model
     ORDER BY total_tokens DESC`;

    const result = await prisma.$queryRawUnsafe(sql, ...values);

    const rows = result.map(r => ({
      ...r,
      prompt_tokens: Number(r.prompt_tokens),
      completion_tokens: Number(r.completion_tokens),
      total_tokens: Number(r.total_tokens),
    }));

    return res.json(rows);
  } catch (err) {
    console.error('[SuperAdmin] getTokenUsage error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
