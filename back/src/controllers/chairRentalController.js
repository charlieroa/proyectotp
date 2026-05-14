'use strict';

const prisma = require('../config/prisma');
const { stripe } = require('../config/stripePrices');
const connect = require('../services/stripeConnectService');

async function tenantOrThrow(tenantId) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      chair_rental_enabled: true,
      stripe_connect_account_id: true,
      stripe_connect_charges_enabled: true,
      rental_block_grace_days: true,
    },
  });
  if (!tenant) {
    const err = new Error('Tenant no encontrado');
    err.status = 404;
    throw err;
  }
  return tenant;
}

function fail(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('[chairRental]', error);
  return res.status(status).json({ error: error.message || 'Error en arriendo de sillas' });
}

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/connect       (owner)
// Inicia / refresca onboarding Express
// ─────────────────────────────────────────────────────────────
exports.connectStripe = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);

    let accountId = tenant.stripe_connect_account_id;
    if (!accountId) {
      const acct = await connect.createExpressAccount({
        email: tenant.email,
        businessName: tenant.name,
      });
      accountId = acct.id;
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: { stripe_connect_account_id: accountId, updated_at: new Date() },
      });
    }

    const link = await connect.createOnboardingLink(accountId);
    return res.json({ url: link.url, account_id: accountId });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/status         (owner)
// ─────────────────────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (!tenant.stripe_connect_account_id) {
      return res.json({
        connected: false,
        charges_enabled: false,
        chair_rental_enabled: tenant.chair_rental_enabled,
        grace_days: tenant.rental_block_grace_days,
      });
    }
    const acct = await connect.getAccount(tenant.stripe_connect_account_id);
    const charges_enabled = !!acct.charges_enabled;

    if (charges_enabled !== tenant.stripe_connect_charges_enabled) {
      await prisma.tenants.update({
        where: { id: tenant.id },
        data: { stripe_connect_charges_enabled: charges_enabled, updated_at: new Date() },
      });
    }

    return res.json({
      connected: true,
      charges_enabled,
      payouts_enabled: !!acct.payouts_enabled,
      details_submitted: !!acct.details_submitted,
      chair_rental_enabled: tenant.chair_rental_enabled,
      grace_days: tenant.rental_block_grace_days,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/chair-rentals/settings       (owner)
// Toggle feature + grace days
// ─────────────────────────────────────────────────────────────
exports.updateSettings = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const { chair_rental_enabled, rental_block_grace_days } = req.body || {};

    const data = { updated_at: new Date() };
    if (typeof chair_rental_enabled === 'boolean') {
      if (chair_rental_enabled && !tenant.stripe_connect_charges_enabled) {
        return res.status(400).json({
          error: 'Conecta tu cuenta Stripe y completa el onboarding antes de activar el arriendo.',
        });
      }
      data.chair_rental_enabled = chair_rental_enabled;
    }
    if (Number.isInteger(rental_block_grace_days) && rental_block_grace_days >= 0) {
      data.rental_block_grace_days = rental_block_grace_days;
    }

    const updated = await prisma.tenants.update({
      where: { id: tenant.id },
      data,
      select: { chair_rental_enabled: true, rental_block_grace_days: true },
    });
    return res.json(updated);
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/renters        (owner)
// Lista de estilistas con employment_type=renter en este tenant
// ─────────────────────────────────────────────────────────────
exports.listRenters = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const renters = await prisma.users.findMany({
      where: { tenant_id: tenantId, employment_type: 'renter' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        monthly_rent_cop: true,
        rental_status: true,
        rental_past_due_since: true,
        rental_stripe_subscription_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ renters });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters       (owner)
// Crea/convierte estilista a renter y dispara onboarding de tarjeta
// Body: { user_id?, email?, first_name?, last_name?, phone?, monthly_rent_cop }
// ─────────────────────────────────────────────────────────────
exports.addRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (!tenant.stripe_connect_charges_enabled) {
      return res.status(400).json({ error: 'Tu Stripe Connect no está habilitado para cobros.' });
    }

    const {
      user_id,
      email,
      first_name,
      last_name,
      phone,
      monthly_rent_cop,
    } = req.body || {};

    const monthly = Number(monthly_rent_cop);
    if (!monthly || monthly <= 0) {
      return res.status(400).json({ error: 'monthly_rent_cop debe ser > 0' });
    }

    let renter;
    if (user_id) {
      renter = await prisma.users.findUnique({ where: { id: user_id } });
      if (!renter || renter.tenant_id !== tenant.id) {
        return res.status(404).json({ error: 'Estilista no pertenece a este tenant' });
      }
      if (renter.rental_stripe_subscription_id) {
        return res.status(409).json({ error: 'Este estilista ya tiene un arriendo activo' });
      }
    } else {
      if (!email || !first_name) {
        return res.status(400).json({ error: 'email y first_name son requeridos para crear un renter nuevo' });
      }
      const placeholderHash = require('bcryptjs').hashSync(require('crypto').randomBytes(16).toString('hex'), 8);
      renter = await prisma.users.create({
        data: {
          tenant_id: tenant.id,
          role_id: 3,
          first_name,
          last_name: last_name || null,
          email: String(email).trim().toLowerCase(),
          phone: phone || null,
          password_hash: placeholderHash,
          employment_type: 'renter',
        },
      });
    }

    const customerId = await connect.findOrCreateRenterCustomer({
      connectedAccountId: tenant.stripe_connect_account_id,
      renter,
      existingCustomerId: renter.rental_stripe_customer_id,
    });

    const priceId = await connect.findOrCreateDailyPrice({
      connectedAccountId: tenant.stripe_connect_account_id,
      monthlyCop: monthly,
      renterId: renter.id,
    });

    const setupSession = await connect.createCheckoutForCardSetup({
      connectedAccountId: tenant.stripe_connect_account_id,
      customerId,
      renterId: renter.id,
    });

    const updated = await prisma.users.update({
      where: { id: renter.id },
      data: {
        employment_type: 'renter',
        monthly_rent_cop: monthly,
        rental_stripe_customer_id: customerId,
        rental_status: 'past_due',
        rental_past_due_since: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true, first_name: true, last_name: true, email: true, phone: true,
        monthly_rent_cop: true, rental_status: true,
      },
    });

    return res.status(201).json({
      renter: updated,
      setup_url: setupSession.url,
      price_id: priceId,
      message: 'Renter creado. Envía setup_url al estilista para guardar tarjeta. La suscripción diaria se activa al completar el setup.',
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/start-subscription
// Llamado después del setup de tarjeta (también disparable manual)
// ─────────────────────────────────────────────────────────────
exports.startSubscription = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (renter.rental_stripe_subscription_id) {
      return res.status(409).json({ error: 'Ya tiene suscripción activa' });
    }
    if (!renter.rental_stripe_customer_id || !renter.monthly_rent_cop) {
      return res.status(400).json({ error: 'Renter sin customer o precio' });
    }

    const priceId = await connect.findOrCreateDailyPrice({
      connectedAccountId: tenant.stripe_connect_account_id,
      monthlyCop: Number(renter.monthly_rent_cop),
      renterId: renter.id,
    });

    const sub = await connect.createDailySubscription({
      connectedAccountId: tenant.stripe_connect_account_id,
      customerId: renter.rental_stripe_customer_id,
      priceId,
      renterId: renter.id,
      tenantId: tenant.id,
    });

    await prisma.users.update({
      where: { id: renter.id },
      data: {
        rental_stripe_subscription_id: sub.id,
        rental_status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'past_due',
        rental_past_due_since: sub.status === 'active' ? null : new Date(),
        updated_at: new Date(),
      },
    });

    return res.json({ subscription_id: sub.id, status: sub.status });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/chair-rentals/renters/:id    (owner)
// Cambiar precio mensual
// ─────────────────────────────────────────────────────────────
exports.updateRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const { monthly_rent_cop } = req.body || {};
    const monthly = Number(monthly_rent_cop);
    if (!monthly || monthly <= 0) {
      return res.status(400).json({ error: 'monthly_rent_cop debe ser > 0' });
    }
    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    const newPriceId = await connect.findOrCreateDailyPrice({
      connectedAccountId: tenant.stripe_connect_account_id,
      monthlyCop: monthly,
      renterId: renter.id,
    });

    if (renter.rental_stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(renter.rental_stripe_subscription_id, {
        stripeAccount: tenant.stripe_connect_account_id,
      });
      await stripe.subscriptions.update(
        renter.rental_stripe_subscription_id,
        {
          items: [{ id: sub.items.data[0].id, price: newPriceId }],
          proration_behavior: 'none',
        },
        { stripeAccount: tenant.stripe_connect_account_id }
      );
    }

    const updated = await prisma.users.update({
      where: { id: renter.id },
      data: { monthly_rent_cop: monthly, updated_at: new Date() },
      select: { id: true, monthly_rent_cop: true, rental_status: true },
    });
    return res.json(updated);
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/chair-rentals/renters/:id  (owner)
// Cancela suscripción + revierte a employee (o mantener renter sin sub)
// ─────────────────────────────────────────────────────────────
exports.removeRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const { immediately } = req.query;
    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (renter.rental_stripe_subscription_id) {
      await connect.cancelSubscription({
        connectedAccountId: tenant.stripe_connect_account_id,
        subscriptionId: renter.rental_stripe_subscription_id,
        immediately: immediately === '1' || immediately === 'true',
      });
    }
    await prisma.users.update({
      where: { id: renter.id },
      data: {
        employment_type: 'employee',
        rental_status: null,
        rental_past_due_since: null,
        rental_stripe_subscription_id: null,
        monthly_rent_cop: null,
        updated_at: new Date(),
      },
    });
    return res.json({ ok: true });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/payment-link
// Genera link para actualizar tarjeta (Customer Portal)
// Puede llamarse por owner o por el propio renter
// ─────────────────────────────────────────────────────────────
exports.getPaymentLink = async (req, res) => {
  try {
    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    const isOwner = req.user.tenant_id === renter.tenant_id && [1, 2].includes(req.user.role_id);
    const isSelf = req.user.id === renter.id;
    if (!isOwner && !isSelf) return res.status(403).json({ error: 'No autorizado' });

    const tenant = await tenantOrThrow(renter.tenant_id);
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'Renter sin customer en Stripe' });
    }

    const portal = await connect.createBillingPortalForRenter({
      connectedAccountId: tenant.stripe_connect_account_id,
      customerId: renter.rental_stripe_customer_id,
    });
    return res.json({ url: portal.url });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// PUBLIC: GET /api/chair-rentals/payment-link/:userId
// Para usuarios bloqueados (sin sesión). Por ID público.
// ─────────────────────────────────────────────────────────────
exports.getPublicPaymentLink = async (req, res) => {
  try {
    const renter = await prisma.users.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true, tenant_id: true, employment_type: true, rental_status: true,
        rental_stripe_customer_id: true,
      },
    });
    if (!renter || renter.employment_type !== 'renter' || renter.rental_status !== 'blocked') {
      return res.status(404).json({ error: 'No aplica' });
    }
    const tenant = await prisma.tenants.findUnique({
      where: { id: renter.tenant_id },
      select: { stripe_connect_account_id: true },
    });
    if (!tenant?.stripe_connect_account_id || !renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'Configuración incompleta' });
    }
    const portal = await connect.createBillingPortalForRenter({
      connectedAccountId: tenant.stripe_connect_account_id,
      customerId: renter.rental_stripe_customer_id,
    });
    return res.json({ url: portal.url });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// WEBHOOK: POST /api/chair-rentals/webhook
// Recibe eventos de Connected Accounts (Connect webhook secret).
// Maneja invoice.paid, invoice.payment_failed, subscription.deleted.
// ─────────────────────────────────────────────────────────────
exports.handleConnectWebhook = async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe disabled');
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[chairRental webhook] sig verify failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const connectedAccountId = event.account; // sólo presente en Connect events
  if (!connectedAccountId) return res.json({ received: true, ignored: 'platform-event' });

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const inv = event.data.object;
        const subId = inv.subscription;
        if (!subId) break;
        await markRenterPaidBySubscription(subId);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const subId = inv.subscription;
        if (!subId) break;
        await markRenterPastDueBySubscription(subId);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await markRenterUnsubscribedBySubscription(sub.id);
        break;
      }
      case 'account.updated': {
        const acct = event.data.object;
        await prisma.tenants.updateMany({
          where: { stripe_connect_account_id: acct.id },
          data: {
            stripe_connect_charges_enabled: !!acct.charges_enabled,
            updated_at: new Date(),
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error(`[chairRental webhook] error en ${event.type}:`, e);
  }
  return res.json({ received: true });
};

async function markRenterPaidBySubscription(subscriptionId) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: { id: true },
  });
  if (!renter) return;
  await prisma.users.update({
    where: { id: renter.id },
    data: { rental_status: 'active', rental_past_due_since: null, updated_at: new Date() },
  });
  console.log(`[chairRental] renter ${renter.id} → active (invoice.paid)`);
}

async function markRenterPastDueBySubscription(subscriptionId) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: { id: true, tenant_id: true, rental_past_due_since: true },
  });
  if (!renter) return;

  const tenant = await prisma.tenants.findUnique({
    where: { id: renter.tenant_id },
    select: { rental_block_grace_days: true },
  });
  const since = renter.rental_past_due_since || new Date();
  const graceMs = (tenant?.rental_block_grace_days ?? 3) * 24 * 60 * 60 * 1000;
  const shouldBlock = Date.now() - new Date(since).getTime() >= graceMs;

  await prisma.users.update({
    where: { id: renter.id },
    data: {
      rental_status: shouldBlock ? 'blocked' : 'past_due',
      rental_past_due_since: renter.rental_past_due_since || new Date(),
      updated_at: new Date(),
    },
  });
  console.log(`[chairRental] renter ${renter.id} → ${shouldBlock ? 'blocked' : 'past_due'}`);
}

async function markRenterUnsubscribedBySubscription(subscriptionId) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: { id: true },
  });
  if (!renter) return;
  await prisma.users.update({
    where: { id: renter.id },
    data: {
      rental_status: 'blocked',
      rental_stripe_subscription_id: null,
      updated_at: new Date(),
    },
  });
  console.log(`[chairRental] renter ${renter.id} → blocked (subscription.deleted)`);
}
