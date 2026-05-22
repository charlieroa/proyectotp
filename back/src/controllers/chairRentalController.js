'use strict';

const prisma = require('../config/prisma');
const { stripeConnect: stripe } = require('../config/stripeConnect');
const connect = require('../services/stripeConnectService');

async function tenantOrThrow(tenantId) {
  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      chair_rental_enabled: true,
      chair_rental_direct_mode: true,
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

// En modo pasarela directa (chair_rental_direct_mode=true), las operaciones
// Stripe NO usan stripeAccount header → caen en la cuenta de plataforma directo.
function acctIdFor(tenant) {
  return tenant.chair_rental_direct_mode ? null : tenant.stripe_connect_account_id;
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

    if (tenant.chair_rental_direct_mode) {
      return res.json({
        direct_mode: true,
        message: 'Modo pasarela directa activo. No requiere onboarding — los cobros van a la cuenta de plataforma.',
      });
    }

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
    // Caso: la cuenta plataforma de Stripe aún no tiene Connect activado.
    // Stripe responde con un StripeInvalidRequestError mencionando "signed up for Connect".
    const msg = String(e?.message || '');
    if (/sign(ed)? up for Connect/i.test(msg)) {
      return res.status(409).json({
        error: 'La plataforma de Stripe de Tupelukeria aún no tiene Connect habilitado. Activa Connect en tu dashboard para empezar a aceptar peluquerías como Connected Accounts.',
        action: 'enable_platform_connect',
        platform_setup_url: 'https://dashboard.stripe.com/connect',
      });
    }
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/status         (owner)
// ─────────────────────────────────────────────────────────────
exports.getStatus = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);

    if (tenant.chair_rental_direct_mode) {
      return res.json({
        connected: true,
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        direct_mode: true,
        chair_rental_enabled: tenant.chair_rental_enabled,
        grace_days: tenant.rental_block_grace_days,
      });
    }

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
      if (chair_rental_enabled && !tenant.chair_rental_direct_mode && !tenant.stripe_connect_charges_enabled) {
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
// GET /api/chair-rentals/eligible-staff (owner)
// Estilistas del tenant (role_id=3) que aún NO son renter activo.
// Para popular el selector "Agregar al coworking" desde el personal existente.
// ─────────────────────────────────────────────────────────────
exports.listEligibleStaff = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const staff = await prisma.users.findMany({
      where: {
        tenant_id: tenantId,
        role_id: 3,
        OR: [
          { employment_type: { not: 'renter' } },
          { employment_type: null },
          { rental_stripe_subscription_id: null },
        ],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        employment_type: true,
        rental_status: true,
        rental_stripe_subscription_id: true,
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
    const available = staff.filter((s) => !s.rental_stripe_subscription_id);
    return res.json({ staff: available });
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
    if (!tenant.chair_rental_direct_mode && !tenant.stripe_connect_charges_enabled) {
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
      connectedAccountId: acctIdFor(tenant),
      renter,
      existingCustomerId: renter.rental_stripe_customer_id,
    });

    const priceId = await connect.findOrCreateDailyPrice({
      connectedAccountId: acctIdFor(tenant),
      monthlyCop: monthly,
      renterId: renter.id,
    });

    const setupSession = await connect.createCheckoutForCardSetup({
      connectedAccountId: acctIdFor(tenant),
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
      connectedAccountId: acctIdFor(tenant),
      monthlyCop: Number(renter.monthly_rent_cop),
      renterId: renter.id,
    });

    const sub = await connect.createDailySubscription({
      connectedAccountId: acctIdFor(tenant),
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
// GET /api/chair-rentals/renters/:id   (owner)
// Detalle: info personal + subscription + tarjeta + últimos invoices
// ─────────────────────────────────────────────────────────────
exports.getRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, first_name: true, last_name: true, email: true, phone: true,
        employment_type: true, monthly_rent_cop: true, rental_status: true,
        rental_past_due_since: true, rental_stripe_customer_id: true,
        rental_stripe_subscription_id: true, tenant_id: true, created_at: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    let subscription = null;
    let defaultCard = null;
    let invoices = [];

    if (renter.rental_stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(
          renter.rental_stripe_customer_id,
          acctOpts
        );
        const pmId = customer?.invoice_settings?.default_payment_method;
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId, acctOpts);
          if (pm?.card) {
            defaultCard = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        }
      } catch (e) {
        console.warn('[chairRental] no se pudo leer customer/pm:', e.message);
      }

      try {
        const list = await stripe.invoices.list(
          { customer: renter.rental_stripe_customer_id, limit: 10 },
          acctOpts
        );
        invoices = list.data.map((i) => ({
          id: i.id,
          number: i.number,
          status: i.status,
          amount_paid: i.amount_paid,
          amount_due: i.amount_due,
          currency: i.currency,
          created: i.created,
          hosted_invoice_url: i.hosted_invoice_url,
          description: i.description,
        }));
      } catch (e) {
        console.warn('[chairRental] no se pudieron listar invoices:', e.message);
      }
    }

    if (renter.rental_stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(
          renter.rental_stripe_subscription_id,
          acctOpts
        );
        subscription = {
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          current_period_start: sub.current_period_start,
          cancel_at_period_end: sub.cancel_at_period_end,
        };
      } catch (e) {
        console.warn('[chairRental] no se pudo leer subscription:', e.message);
      }
    }

    return res.json({
      renter: {
        id: renter.id,
        first_name: renter.first_name,
        last_name: renter.last_name,
        email: renter.email,
        phone: renter.phone,
        monthly_rent_cop: renter.monthly_rent_cop,
        rental_status: renter.rental_status,
        rental_past_due_since: renter.rental_past_due_since,
        created_at: renter.created_at,
        has_subscription: !!renter.rental_stripe_subscription_id,
        has_customer: !!renter.rental_stripe_customer_id,
      },
      subscription,
      default_card: defaultCard,
      invoices,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/charge   (owner)
// Cobro ad-hoc off-session a la tarjeta default del renter.
// Body: { amount_cop: number > 0, description: string (obligatorio) }
// ─────────────────────────────────────────────────────────────
exports.chargeRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const { amount_cop, description } = req.body || {};
    const amount = Number(amount_cop);
    const desc = typeof description === 'string' ? description.trim() : '';

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount_cop debe ser > 0' });
    }
    if (!desc) {
      return res.status(400).json({ error: 'description es obligatoria' });
    }
    // Stripe COP mínimo ~2000 COP
    if (amount < 2000) {
      return res.status(400).json({ error: 'El monto mínimo es 2.000 COP' });
    }

    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true,
        rental_stripe_customer_id: true, first_name: true, last_name: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'Renter aún no ha guardado tarjeta' });
    }

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    // Verificar que tenga payment method default antes de intentar el cobro.
    const customer = await stripe.customers.retrieve(renter.rental_stripe_customer_id, acctOpts);
    const pmId = customer?.invoice_settings?.default_payment_method;
    if (!pmId) {
      return res.status(400).json({
        error: 'El estilista aún no tiene tarjeta predeterminada. Pídele que complete el setup primero.',
      });
    }

    const amountCents = Math.round(amount * 100);

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: 'cop',
          customer: renter.rental_stripe_customer_id,
          payment_method: pmId,
          off_session: true,
          confirm: true,
          description: desc,
          metadata: {
            tpia_resource: 'chair_rental_adhoc',
            renter_id: renter.id,
            tenant_id: tenant.id,
            charged_by_user_id: req.user.id,
          },
        },
        acctOpts
      );

      return res.json({
        ok: true,
        payment_intent_id: pi.id,
        status: pi.status,
        amount_cop: amount,
        description: desc,
      });
    } catch (e) {
      // Errores típicos off-session: authentication_required (3DS), card_declined, etc.
      const code = e?.code || e?.raw?.code;
      const declineCode = e?.decline_code || e?.raw?.decline_code;
      const piId = e?.payment_intent?.id || e?.raw?.payment_intent?.id;
      console.error('[chairRental] adhoc charge failed:', { code, declineCode, msg: e.message });

      if (code === 'authentication_required') {
        return res.status(402).json({
          error: 'La tarjeta requiere autenticación (3DS). Pide al estilista actualizar la tarjeta o usar el portal de pago.',
          code,
          payment_intent_id: piId,
        });
      }
      return res.status(402).json({
        error: e?.message || 'No se pudo cobrar la tarjeta',
        code: code || 'charge_failed',
        decline_code: declineCode || null,
        payment_intent_id: piId,
      });
    }
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
      connectedAccountId: acctIdFor(tenant),
      monthlyCop: monthly,
      renterId: renter.id,
    });

    if (renter.rental_stripe_subscription_id) {
      const acctId = acctIdFor(tenant);
      const subOpts = acctId ? { stripeAccount: acctId } : undefined;
      const sub = await stripe.subscriptions.retrieve(renter.rental_stripe_subscription_id, subOpts);
      await stripe.subscriptions.update(
        renter.rental_stripe_subscription_id,
        {
          items: [{ id: sub.items.data[0].id, price: newPriceId }],
          proration_behavior: 'none',
        },
        subOpts
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
        connectedAccountId: acctIdFor(tenant),
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
      connectedAccountId: acctIdFor(tenant),
      customerId: renter.rental_stripe_customer_id,
    });
    return res.json({ url: portal.url });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/setup-link    (owner)
// Regenera Checkout Setup para renter SIN subscription activa.
// Útil cuando el setup_url original se perdió o expiró.
// ─────────────────────────────────────────────────────────────
exports.regenerateSetupLink = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (!tenant.chair_rental_direct_mode && !tenant.stripe_connect_charges_enabled) {
      return res.status(400).json({ error: 'Tu Stripe Connect no está habilitado para cobros.' });
    }

    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (renter.rental_stripe_subscription_id) {
      return res.status(409).json({
        error: 'Este renter ya tiene una suscripción. Usa payment-link para actualizar tarjeta.',
      });
    }

    const customerId = await connect.findOrCreateRenterCustomer({
      connectedAccountId: acctIdFor(tenant),
      renter,
      existingCustomerId: renter.rental_stripe_customer_id,
    });

    if (customerId !== renter.rental_stripe_customer_id) {
      await prisma.users.update({
        where: { id: renter.id },
        data: { rental_stripe_customer_id: customerId, updated_at: new Date() },
      });
    }

    const setupSession = await connect.createCheckoutForCardSetup({
      connectedAccountId: acctIdFor(tenant),
      customerId,
      renterId: renter.id,
    });

    return res.json({
      setup_url: setupSession.url,
      message: 'Envíaselo al estilista. La suscripción diaria se activa cuando guarde la tarjeta.',
    });
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
      select: { stripe_connect_account_id: true, chair_rental_direct_mode: true },
    });
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'Configuración incompleta' });
    }
    if (!tenant?.chair_rental_direct_mode && !tenant?.stripe_connect_account_id) {
      return res.status(400).json({ error: 'Configuración incompleta' });
    }
    const portal = await connect.createBillingPortalForRenter({
      connectedAccountId: acctIdFor(tenant),
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

  // event.account está en Connect events; ausente en platform events (modo pasarela).
  // Procesamos ambos: las handlers matchean por subscription_id en DB y son no-op si no hay match.
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
      case 'checkout.session.completed': {
        const session = event.data.object;
        // Solo nos interesa el setup de tarjeta del flujo chair_rental.
        if (session.mode !== 'setup') break;
        if (session.metadata?.tpia_resource !== 'chair_rental_setup') break;
        const renterId = session.metadata?.renter_id;
        if (!renterId) break;
        await finalizeRenterSetupAndStartSub({
          renterId,
          sessionId: session.id,
          connectedAccountId: event.account || null,
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

// Llamado desde el webhook checkout.session.completed (mode=setup): el estilista
// terminó de guardar su tarjeta vía el Checkout Setup. Extrae el payment_method
// del setup_intent, lo deja como default del customer, y dispara la suscripción
// diaria. Si el renter ya tenía subscription_id, no-op.
async function finalizeRenterSetupAndStartSub({ renterId, sessionId, connectedAccountId }) {
  const renter = await prisma.users.findUnique({
    where: { id: renterId },
    select: {
      id: true, tenant_id: true, monthly_rent_cop: true,
      rental_stripe_customer_id: true, rental_stripe_subscription_id: true,
    },
  });
  if (!renter) return;
  if (renter.rental_stripe_subscription_id) {
    console.log(`[chairRental] renter ${renterId} ya tiene sub, ignorando setup completed`);
    return;
  }
  if (!renter.rental_stripe_customer_id || !renter.monthly_rent_cop) {
    console.warn(`[chairRental] renter ${renterId} sin customer o monthly_rent_cop, abort setup finalize`);
    return;
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: renter.tenant_id },
    select: { stripe_connect_account_id: true, chair_rental_direct_mode: true },
  });
  // Si llega event.account (Connect) usar ése; sino respetar direct_mode del tenant.
  const acctId = connectedAccountId
    || (tenant?.chair_rental_direct_mode ? null : tenant?.stripe_connect_account_id);

  // 1) Recuperar el Checkout Session con setup_intent expandido para obtener el PM.
  const session = await connect.retrieveCheckoutSession({
    connectedAccountId: acctId,
    sessionId,
  });
  const paymentMethodId = session.setup_intent?.payment_method;
  if (!paymentMethodId) {
    console.warn(`[chairRental] setup ${sessionId} sin payment_method, abort`);
    return;
  }

  // 2) Set como default en el customer.
  await connect.setDefaultPaymentMethod({
    connectedAccountId: acctId,
    customerId: renter.rental_stripe_customer_id,
    paymentMethodId,
  });

  // 3) Crear (o re-obtener) el price diario.
  const priceId = await connect.findOrCreateDailyPrice({
    connectedAccountId: acctId,
    monthlyCop: Number(renter.monthly_rent_cop),
    renterId: renter.id,
  });

  // 4) Crear la subscription diaria.
  const sub = await connect.createDailySubscription({
    connectedAccountId: acctId,
    customerId: renter.rental_stripe_customer_id,
    priceId,
    renterId: renter.id,
    tenantId: renter.tenant_id,
  });

  await prisma.users.update({
    where: { id: renter.id },
    data: {
      rental_stripe_subscription_id: sub.id,
      rental_status: ['active', 'trialing'].includes(sub.status) ? 'active' : 'past_due',
      rental_past_due_since: sub.status === 'active' ? null : new Date(),
      updated_at: new Date(),
    },
  });

  console.log(`[chairRental] renter ${renterId} setup OK → sub ${sub.id} status=${sub.status}`);
}

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
