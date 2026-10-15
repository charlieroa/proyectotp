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
// Lee la tarjeta default del renter y AUTO-REPARA cuando el webhook no disparó.
// Caso típico: el estilista guarda la tarjeta vía link (Checkout Setup) pero el
// evento checkout.session.completed no llega → la tarjeta queda ADJUNTA al
// customer pero sin marcarse como default, así que el detalle mostraba "Sin
// tarjeta guardada" para siempre y la suscripción nunca arrancaba.
// Aquí: si no hay default pero sí una tarjeta adjunta, la marcamos default y
// arrancamos la suscripción diaria si falta. Idempotente con el webhook.
// renter: { id, tenant_id, monthly_rent_cop, rental_stripe_customer_id, rental_stripe_subscription_id }
async function reconcileRenterCard({ acctId, renter, startSubIfMissing = false }) {
  const opts = acctId ? { stripeAccount: acctId } : undefined;
  let card = null;
  let subscriptionId = renter.rental_stripe_subscription_id || null;

  if (!renter.rental_stripe_customer_id) return { card, subscriptionId };

  // Si la sub guardada ya murió (canceled / incomplete_expired), descártala para
  // poder arrancar una nueva al re-vincular tarjeta. Sin esto el renter queda
  // apuntando a una suscripción muerta para siempre y nunca se le vuelve a cobrar.
  if (subscriptionId) {
    try {
      const existing = await stripe.subscriptions.retrieve(subscriptionId, opts);
      if (['canceled', 'incomplete_expired'].includes(existing.status)) {
        subscriptionId = null;
      }
    } catch (e) {
      if (e?.code === 'resource_missing') subscriptionId = null;
    }
  }

  // ANTI-DOBLE-COBRO: si el customer tiene VARIAS suscripciones diarias vivas
  // (pasó cuando el webhook checkout.session.completed y el flujo inline crearon
  // cada uno la suya), se conserva UNA sola — la de la BD si sigue viva, si no la
  // más reciente — y las demás se cancelan ya para que dejen de cobrar. También
  // adopta la sub viva huérfana cuando la BD apuntaba a una muerta/ninguna.
  try {
    const LIVE = ['active', 'trialing', 'past_due', 'unpaid'];
    const subsList = await stripe.subscriptions.list(
      { customer: renter.rental_stripe_customer_id, status: 'all', limit: 100 },
      opts
    );
    const liveDaily = subsList.data.filter(
      (s) => LIVE.includes(s.status) && s.items?.data?.[0]?.price?.recurring?.interval === 'day'
    );
    if (liveDaily.length > 0) {
      const keep =
        liveDaily.find((s) => s.id === subscriptionId) ||
        [...liveDaily].sort((a, b) => (b.created || 0) - (a.created || 0))[0];
      for (const s of liveDaily) {
        if (s.id === keep.id) continue;
        try {
          await stripe.subscriptions.cancel(s.id, opts);
          console.warn(
            `[chairRental] reconcile: sub diaria DUPLICADA ${s.id} cancelada (renter ${renter.id}); se mantiene ${keep.id}.`
          );
        } catch (e) {
          console.warn(`[chairRental] reconcile: no se pudo cancelar sub duplicada ${s.id}:`, e.message);
        }
      }
      if (subscriptionId !== keep.id) {
        subscriptionId = keep.id;
        await prisma.users.update({
          where: { id: renter.id },
          data: { rental_stripe_subscription_id: keep.id, updated_at: new Date() },
        });
        console.log(`[chairRental] reconcile: renter ${renter.id} adoptó la sub viva ${keep.id}.`);
      }
    }
  } catch (e) {
    console.warn('[chairRental] reconcile: no se pudieron verificar subs duplicadas:', e.message);
  }

  let pm = null;
  try {
    const customer = await stripe.customers.retrieve(renter.rental_stripe_customer_id, opts);
    const pmId = customer?.invoice_settings?.default_payment_method;
    if (pmId) {
      pm = await stripe.paymentMethods.retrieve(pmId, opts);
    } else {
      // Sin default → buscar tarjeta adjunta y repararla.
      pm = await connect.listCustomerCards({
        connectedAccountId: acctId,
        customerId: renter.rental_stripe_customer_id,
      });
      if (pm) {
        try {
          await connect.setDefaultPaymentMethod({
            connectedAccountId: acctId,
            customerId: renter.rental_stripe_customer_id,
            paymentMethodId: pm.id,
          });
          console.log(`[chairRental] reconcile: PM ${pm.id} marcado default (renter ${renter.id})`);
        } catch (e) {
          console.warn('[chairRental] reconcile: no se pudo marcar default PM:', e.message);
        }
      }
    }
  } catch (e) {
    console.warn('[chairRental] reconcile: no se pudo leer customer/pm:', e.message);
  }

  if (pm?.card) {
    card = {
      brand: pm.card.brand, last4: pm.card.last4,
      exp_month: pm.card.exp_month, exp_year: pm.card.exp_year,
    };
  }

  // AUTO-CURA: si la suscripción quedó "clavada" a una tarjeta distinta de la default
  // actual del customer (pasa cuando el estilista cambia la tarjeta por el portal de
  // Stripe, que solo actualiza la default del customer — no la de la suscripción),
  // limpiamos el default_payment_method de la suscripción para que herede SIEMPRE la
  // tarjeta actual del customer (la nueva). También cubre el caso de que apunte a una
  // tarjeta ya borrada. Idempotente: si ya coinciden, no hace nada.
  const custDefaultPmId = pm?.id || null;
  if (subscriptionId && custDefaultPmId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, opts);
      if (sub.default_payment_method && sub.default_payment_method !== custDefaultPmId) {
        await stripe.subscriptions.update(subscriptionId, { default_payment_method: '' }, opts);
        console.log(
          `[chairRental] reconcile: sub ${subscriptionId} estaba clavada a tarjeta vieja ` +
            `(${sub.default_payment_method}); limpiada para heredar la del customer (${custDefaultPmId}).`
        );
      }
    } catch (e) {
      console.warn('[chairRental] reconcile: no se pudo sincronizar default de la sub:', e.message);
    }
  }

  // Hay tarjeta pero no hay suscripción → arrancarla SOLO en flujos explícitos de
  // vinculación de tarjeta (startSubIfMissing). En lecturas pasivas (abrir el ojo)
  // NO se recrea la sub: muchos renters se cobran a mano y recrearla los
  // dobletearía con el cobro automático diario.
  if (startSubIfMissing && pm && !subscriptionId && renter.monthly_rent_cop) {
    try {
      const priceId = await connect.findOrCreateDailyPrice({
        connectedAccountId: acctId,
        monthlyCop: Number(renter.monthly_rent_cop),
        renterId: renter.id,
      });
      const sub = await connect.createDailySubscription({
        connectedAccountId: acctId,
        customerId: renter.rental_stripe_customer_id,
        priceId,
        renterId: renter.id,
        tenantId: renter.tenant_id,
      });
      subscriptionId = sub.id;
      await prisma.users.update({
        where: { id: renter.id },
        data: {
          rental_stripe_subscription_id: sub.id,
          rental_status: ['active', 'trialing'].includes(sub.status) ? 'active' : 'past_due',
          rental_past_due_since: sub.status === 'active' ? null : new Date(),
          updated_at: new Date(),
        },
      });
      console.log(`[chairRental] reconcile: sub ${sub.id} arrancada (renter ${renter.id}, ${sub.status})`);
    } catch (e) {
      console.warn('[chairRental] reconcile: no se pudo arrancar sub:', e.message);
    }
  }

  return { card, subscriptionId };
}

// ─────────────────────────────────────────────────────────────
// Todos los customer ids de Stripe que pertenecen al renter: el de la BD MÁS
// duplicados históricos (mismo email o metadata.renter_id). Caso real: el renter
// se eliminó y recreó con otro user id → el customer viejo quedó huérfano con
// cobros que no aparecían en el detalle ni en devoluciones pendientes.
// Guarda anti-mezcla: un customer extra cuyo metadata.renter_id apunte a OTRO
// usuario que SÍ existe en la BD se descarta (es de otra persona/salón).
// ─────────────────────────────────────────────────────────────
// La Search API de Stripe tiene rate limit BAJO: con varios renters en paralelo
// las búsquedas devolvían 429 y los customers ocultos desaparecían del resultado
// de forma intermitente. Por eso: caché en memoria (los duplicados históricos no
// cambian) + reintentos con backoff.
const renterCustomerIdsCache = new Map(); // renterId -> { ids: string[], expires: number }
const CUSTOMER_IDS_TTL_MS = 10 * 60 * 1000;

async function searchCustomersWithRetry(params, opts, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      return await stripe.customers.search(params, opts);
    } catch (e) {
      const rateLimited =
        e?.statusCode === 429 || e?.code === 'rate_limit' || /rate limit/i.test(e?.message || '');
      if (!rateLimited || i >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1) + Math.floor(Math.random() * 250)));
    }
  }
}

async function listRenterCustomerIds({ acctId, renter }) {
  const cached = renterCustomerIdsCache.get(renter.id);
  if (cached && cached.expires > Date.now()) return cached.ids;

  const opts = acctId ? { stripeAccount: acctId } : undefined;
  const ids = new Set();
  if (renter.rental_stripe_customer_id) ids.add(renter.rental_stripe_customer_id);

  const queries = [`metadata['renter_id']:'${renter.id}'`];
  if (renter.email) queries.push(`email:'${String(renter.email).replace(/'/g, '')}'`);

  let searchFailed = false;
  const candidates = new Map();
  for (const query of queries) {
    try {
      const r = await searchCustomersWithRetry({ query, limit: 20 }, opts);
      for (const c of r.data) {
        if (c.deleted) continue;
        if (c.metadata?.tpia_resource !== 'chair_rental') continue; // solo coworking
        candidates.set(c.id, c);
      }
    } catch (e) {
      searchFailed = true;
      console.warn('[chairRental] customer search falló:', e.message);
    }
  }

  for (const c of candidates.values()) {
    if (ids.has(c.id)) continue;
    const metaRenterId = c.metadata?.renter_id;
    if (metaRenterId && metaRenterId !== renter.id) {
      // ¿Ese renter_id es de otro usuario vivo? Solo lo incluimos si es la MISMA
      // persona (mismo email y tenant — caso real: la quitaron del coworking y la
      // volvieron a agregar como un user nuevo, el registro viejo quedó como
      // employee con el customer viejo colgando). Si el otro user sigue siendo
      // renter activo, ese customer se muestra en SU propia ficha, no aquí.
      let other = null;
      try {
        other = await prisma.users.findUnique({
          where: { id: metaRenterId },
          select: { id: true, email: true, tenant_id: true, employment_type: true },
        });
      } catch {
        continue; // id raro → mejor no incluirlo
      }
      if (other) {
        const samePerson =
          (other.email || '').toLowerCase() === (renter.email || '').toLowerCase() &&
          other.tenant_id === renter.tenant_id;
        if (!samePerson || other.employment_type === 'renter') continue;
      }
    }
    ids.add(c.id);
  }

  const result = [...ids];
  // Solo cachear resultados completos: un resultado parcial (search caída) se
  // quedaría 10 min escondiendo customers.
  if (!searchFailed) {
    renterCustomerIdsCache.set(renter.id, { ids: result, expires: Date.now() + CUSTOMER_IDS_TTL_MS });
  }
  return result;
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
        rental_stripe_customer_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
    // No exponer el id del customer de Stripe al front: solo si ya existe.
    return res.json({
      renters: renters.map(({ rental_stripe_customer_id, ...r }) => ({
        ...r,
        has_customer: !!rental_stripe_customer_id,
      })),
    });
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
        rental_stripe_subscription_id: null,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        employment_type: true,
        rental_status: true,
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
    return res.json({ staff });
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
    let invoices = [];
    let cardStatus = null;

    // Lee/auto-repara la tarjeta (y arranca la sub si falta) sin depender del webhook.
    const { card: defaultCard, subscriptionId } = await reconcileRenterCard({ acctId, renter });

    // Las lecturas a Stripe son independientes: se lanzan en paralelo (antes iban
    // una tras otra y el detalle tardaba varios segundos).
    const invoicesTask = (async () => {
      if (!renter.rental_stripe_customer_id) return [];
      // Incluye customers duplicados históricos del renter (mismo email) para que
      // los cobros "ocultos" del customer viejo aparezcan en el historial.
      const customerIds = await listRenterCustomerIds({ acctId, renter });
      const perCustomer = await Promise.all(customerIds.map(async (customerId) => {
        const [list, adhoc] = await Promise.all([
          stripe.invoices.list(
            { customer: customerId, limit: 100, expand: ['data.charge'] },
            acctOpts
          ).then((l) => l.data.map((i) => ({
            id: i.id,
            number: i.number,
            status: i.status,
            amount_paid: i.amount_paid,
            amount_due: i.amount_due,
            currency: i.currency,
            created: i.created,
            hosted_invoice_url: i.hosted_invoice_url,
            description: i.description,
            // Cobros duplicados que ya se reembolsaron por fuera de Stripe (efectivo).
            // Se marcan con metadata tpia_refund_cash='1' para mostrarlos como
            // "Reembolsado" en el listado en vez de "Pagada".
            refunded_cash: i.metadata?.tpia_refund_cash === '1',
            // Reembolso real en Stripe (devuelto a la tarjeta).
            refunded: i.charge?.refunded === true || (i.charge?.amount_refunded || 0) > 0,
          }))).catch((e) => {
            console.warn(`[chairRental] no se pudieron listar invoices de ${customerId}:`, e.message);
            return [];
          }),
          // Cobros manuales ad-hoc (PaymentIntents sin invoice).
          connect.listAdhocCharges({ connectedAccountId: acctId, customerId }).catch((e) => {
            console.warn(`[chairRental] no se pudieron listar ad-hoc de ${customerId}:`, e.message);
            return [];
          }),
        ]);
        return [...list, ...adhoc];
      }));
      return perCustomer.flat().sort((a, b) => (b.created || 0) - (a.created || 0));
    })();

    const subscriptionTask = subscriptionId
      ? stripe.subscriptions.retrieve(subscriptionId, acctOpts).then((sub) => ({
          id: sub.id,
          status: sub.status,
          paused: !!sub.pause_collection,
          pause_behavior: sub.pause_collection?.behavior || null,
          current_period_end: sub.current_period_end,
          current_period_start: sub.current_period_start,
          cancel_at_period_end: sub.cancel_at_period_end,
        })).catch((e) => {
          console.warn('[chairRental] no se pudo leer subscription:', e.message);
          return null;
        })
      : Promise.resolve(null);

    // Estado real de la tarjeta (activa / sin_fondos / rechazada) según el
    // último intento de cobro en Stripe.
    const cardStatusTask = defaultCard && renter.rental_stripe_customer_id
      ? connect.getCardStatus({
          connectedAccountId: acctId,
          customerId: renter.rental_stripe_customer_id,
          card: defaultCard,
        }).catch((e) => {
          console.warn('[chairRental] no se pudo leer estado de tarjeta:', e.message);
          return null;
        })
      : Promise.resolve(null);

    [invoices, subscription, cardStatus] = await Promise.all([invoicesTask, subscriptionTask, cardStatusTask]);

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
        has_subscription: !!subscriptionId,
        has_customer: !!renter.rental_stripe_customer_id,
      },
      subscription,
      default_card: defaultCard,
      card_status: cardStatus,
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
// Helper: clave de día YYYY-MM-DD en zona horaria de Colombia a partir de un
// timestamp unix (segundos). Garantiza que las invoices caen en el día correcto
// independientemente de la zona del servidor.
// ─────────────────────────────────────────────────────────────
const BOGOTA_DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
// Día de renta al que pertenece una invoice. Las de suscripción pertenecen al día en
// que se generaron (created), AUNQUE se paguen días después por un reintento: antes
// se ubicaban por fecha de pago, y un día cobrado tarde quedaba "sin pago" en el
// calendario mientras el día del reintento acumulaba varios cobros (falsos dobles).
function rentDayTs(inv) {
  return /^subscription/.test(inv.billing_reason || '')
    ? inv.created
    : (inv.status_transitions?.paid_at || inv.created);
}

function bogotaDayKey(unixSeconds) {
  return BOGOTA_DAY_FMT.format(new Date(unixSeconds * 1000)); // → "YYYY-MM-DD"
}

// "YYYY-MM-DD" → "DD/MM/AAAA" para mostrar en los mensajes del bot (recibos).
function fmtDayDMY(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(dayKey || '');
}

// Monto COP → "$40.000" (sin decimales, separador de miles).
function fmtCop(amountCop) {
  const n = Math.round(Number(amountCop) || 0);
  return `$${n.toLocaleString('es-CO')}`;
}

// Los teléfonos de los renters se guardan sin código de país (p.ej. "3197125045").
// WhatsApp/Evolution exige el número internacional: sin el "57" el envío falla con
// 400 (el número "no existe"). Normaliza a E.164 sin '+': default Colombia (57).
function toWaNumber(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  // Móvil colombiano local: 10 dígitos empezando en 3 → anteponer 57.
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  return digits; // ya trae código de país (57..., 1..., etc.)
}

// rental_blocked_days es un JSON con arreglo de strings "YYYY-MM-DD". Lo
// normaliza a un arreglo de strings válidas, único y ordenado.
function normalizeBlockedDays(raw) {
  if (!Array.isArray(raw)) return [];
  const set = new Set(
    raw.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  );
  return Array.from(set).sort();
}

// rental_manual_paid_days: arreglo de objetos { date, amount_cop, note, marked_by, at }.
// Son días que el dueño marcó como pagados manualmente (cobró en efectivo o vía un
// cobro extra) cuando la tarjeta no tenía fondos. Normaliza descartando entradas
// inválidas y dejando una sola por fecha (la última gana). Devuelve un Map por fecha.
function normalizeManualPaidDays(raw) {
  const map = new Map();
  if (!Array.isArray(raw)) return map;
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const date = String(e.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    map.set(date, {
      date,
      amount_cop: Number(e.amount_cop) || 0,
      note: typeof e.note === 'string' ? e.note.slice(0, 200) : '',
      marked_by: e.marked_by || null,
      at: e.at || null,
    });
  }
  return map;
}

// Mapea el status crudo de la invoice a uno simple para el calendario.
function calendarDayStatus(inv) {
  if (inv.status === 'paid') return 'paid';
  if (inv.status === 'uncollectible') return 'failed';
  if (inv.status === 'void') return 'void';
  // 'open' con intento fallido = mora; sin intento = pendiente. Distinguimos por
  // si hubo un pago fallido registrado en la invoice.
  if (inv.status === 'open') {
    const failed = (inv.attempt_count || 0) > 0 && (inv.amount_paid || 0) === 0;
    return failed ? 'failed' : 'open';
  }
  return inv.status || 'open';
}

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/renters/:id/calendar?month=YYYY-MM   (owner)
// Devuelve, para el mes pedido, qué días se cobró el arriendo y su estado,
// más el estado de la suscripción (incl. si está pausada) y la tarifa diaria.
// ─────────────────────────────────────────────────────────────
exports.getRenterCalendar = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true, email: true,
        monthly_rent_cop: true, rental_stripe_customer_id: true,
        rental_stripe_subscription_id: true, rental_blocked_days: true,
        rental_readjust_blocked: true, rental_manual_paid_days: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    // month=YYYY-MM (default: mes actual en Bogotá)
    const monthParam = String(req.query.month || '').trim();
    const m = /^(\d{4})-(\d{2})$/.exec(monthParam);
    const now = new Date();
    const year = m ? Number(m[1]) : now.getUTCFullYear();
    const month = m ? Number(m[2]) : now.getUTCMonth() + 1; // 1-12
    // Rango del mes en UTC con margen de ±1 día para cubrir el offset de Bogotá.
    const gte = Math.floor(Date.UTC(year, month - 1, 1) / 1000) - 24 * 3600;
    const lte = Math.floor(Date.UTC(year, month, 1) / 1000) + 24 * 3600; // primer día del mes siguiente + margen

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    const days = {};
    if (renter.rental_stripe_customer_id) {
      try {
        // Incluye customers duplicados históricos del renter (cobros "ocultos").
        const customerIds = await listRenterCustomerIds({ acctId, renter });
        const invoices = [];
        for (const customerId of customerIds) {
          invoices.push(...await connect.listInvoicesInRange({
            connectedAccountId: acctId,
            customerId,
            gte,
            lte,
          }));
        }
        for (const inv of invoices) {
          // Solo invoices del arriendo (suscripción). Ad-hoc no genera invoice.
          const key = bogotaDayKey(rentDayTs(inv));
          const paidAt = inv.status_transitions?.paid_at;
          if (!key.startsWith(`${year}-${String(month).padStart(2, '0')}`)) continue;
          const existing = days[key];
          // Si ya hay un 'paid' ese día, no lo degrades.
          if (existing && existing.status === 'paid') continue;
          // Cobro devuelto a la tarjeta (día bloqueado auto-reembolsado o reembolso
          // manual) → se pinta como 'refunded', no como pagado.
          const refunded =
            inv.charge?.refunded === true || (inv.charge?.amount_refunded || 0) > 0;
          days[key] = {
            status: refunded ? 'refunded' : calendarDayStatus(inv),
            refunded,
            amount_cop: Math.round((inv.amount_paid || inv.amount_due || 0) / 100),
            currency: inv.currency,
            invoice_id: inv.id,
            hosted_invoice_url: inv.hosted_invoice_url,
            // Día real del pago si fue distinto (reintento posterior a un rechazo).
            paid_on: paidAt && bogotaDayKey(paidAt) !== key ? bogotaDayKey(paidAt) : null,
          };
        }

        // Cobros manuales ("Cobro extra"): son PaymentIntents sin invoice, por eso el
        // calendario no los veía. Se unen al día: si el día no estaba pagado queda
        // pagado (con marca de cobro manual); si la suscripción ya lo había cobrado,
        // es un posible doble cobro (duplicate) y se suma aparte en extra_cop.
        const monthKeyAdhoc = `${year}-${String(month).padStart(2, '0')}`;
        for (const customerId of customerIds) {
          let adhoc = [];
          try {
            adhoc = await connect.listAdhocCharges({ connectedAccountId: acctId, customerId, limit: 100 });
          } catch (e) {
            console.warn('[chairRental] calendar adhoc error:', e.message);
          }
          for (const a of adhoc) {
            if (a.refunded) continue;
            const key = bogotaDayKey(a.created);
            if (!key.startsWith(monthKeyAdhoc)) continue;
            const amt = Math.round((a.amount_paid || 0) / 100);
            const cur = days[key];
            if (cur && cur.status === 'paid' && cur.adhoc) {
              // Varios cobros manuales el mismo día (p. ej. 2 días cobrados juntos).
              cur.amount_cop += amt;
              cur.adhoc_count = (cur.adhoc_count || 1) + 1;
            } else if (cur && cur.status === 'paid') {
              cur.extra_cop = (cur.extra_cop || 0) + amt;
              cur.adhoc_count = (cur.adhoc_count || 0) + 1;
              cur.duplicate = true;
            } else {
              days[key] = {
                status: 'paid',
                adhoc: true,
                adhoc_count: 1,
                amount_cop: amt,
                currency: a.currency,
                invoice_id: a.id,
                hosted_invoice_url: a.hosted_invoice_url,
                note: a.description || '',
              };
            }
          }
        }
      } catch (e) {
        console.warn('[chairRental] calendar invoices error:', e.message);
      }
    }

    let subscription = null;
    if (renter.rental_stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(renter.rental_stripe_subscription_id, acctOpts);
        subscription = {
          id: sub.id,
          status: sub.status,
          paused: !!sub.pause_collection,
          pause_behavior: sub.pause_collection?.behavior || null,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end,
        };
      } catch (e) {
        console.warn('[chairRental] calendar sub error:', e.message);
      }
    }

    const dailyCop = renter.monthly_rent_cop
      ? Math.round(connect.calcDailyCentsFromMonthly(Number(renter.monthly_rent_cop)) / 100)
      : 0;

    // Días bloqueados del mes: no se cobran (si Stripe llega a cobrarlos por la
    // suscripción diaria, el webhook invoice.paid los reembolsa). Tienen prioridad
    // visual sobre cualquier estado de invoice.
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const blockedAll = normalizeBlockedDays(renter.rental_blocked_days);
    const blockedThisMonth = blockedAll.filter((d) => d.startsWith(monthPrefix));
    for (const d of blockedThisMonth) {
      const prev = days[d];
      days[d] = {
        status: 'blocked',
        // Conserva la marca de reembolso para que el owner vea que ese día
        // bloqueado ya se devolvió a la tarjeta.
        refunded: !!prev?.refunded,
        amount_cop: 0,
        currency: prev?.currency || 'cop',
        invoice_id: prev?.invoice_id || null,
        hosted_invoice_url: prev?.hosted_invoice_url || null,
      };
    }

    // Días pagados manualmente (override del dueño cuando no hubo fondos y cobró por
    // otro medio). Marcan el día como pagado SIN cobro real a la tarjeta. Tienen
    // prioridad sobre el estado de invoice; no aplican sobre un día bloqueado.
    const manualMap = normalizeManualPaidDays(renter.rental_manual_paid_days);
    const manualThisMonth = [];
    for (const [d, entry] of manualMap) {
      if (!d.startsWith(monthPrefix)) continue;
      if (days[d]?.status === 'blocked') continue; // bloqueado manda
      const prev = days[d];
      days[d] = {
        status: 'paid_manual',
        manual: true,
        note: entry.note || '',
        amount_cop: entry.amount_cop || prev?.amount_cop || 0,
        currency: prev?.currency || 'cop',
        invoice_id: prev?.invoice_id || null,
        hosted_invoice_url: prev?.hosted_invoice_url || null,
      };
      manualThisMonth.push(d);
    }

    return res.json({
      month: monthPrefix,
      daily_cop: dailyCop,
      monthly_rent_cop: renter.monthly_rent_cop,
      has_customer: !!renter.rental_stripe_customer_id,
      subscription,
      days,
      blocked_days: blockedThisMonth,
      manual_paid_days: manualThisMonth,
      readjust_blocked: !!renter.rental_readjust_blocked,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/mark-day-paid   (owner)
// body: { date: "YYYY-MM-DD", amount_cop?, note? }
// Marca un día como PAGADO manualmente, sin cobrar la tarjeta. Es para cuando el
// cobro diario falló por falta de fondos y el dueño cobró por otro medio (efectivo
// o un cobro extra). Anula la invoice abierta de ese día (para que Stripe deje de
// reintentar y no cuente como mora) y deja al renter al día.
// ─────────────────────────────────────────────────────────────
exports.markDayPaid = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const date = String(req.body?.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date debe ser YYYY-MM-DD' });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : '';
    let amountCop = Number(req.body?.amount_cop);

    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true,
        monthly_rent_cop: true, rental_stripe_customer_id: true,
        rental_manual_paid_days: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!amountCop || amountCop <= 0) {
      amountCop = renter.monthly_rent_cop
        ? Math.round(connect.calcDailyCentsFromMonthly(Number(renter.monthly_rent_cop)) / 100)
        : 0;
    }

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    // Anular la invoice del arriendo de ese día si está abierta/fallida (así Stripe
    // deja de reintentarla y no sigue contando como mora). Las pagadas NO se tocan.
    let voided = 0;
    if (renter.rental_stripe_customer_id) {
      try {
        const gte = Math.floor(Date.UTC(
          Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))
        ) / 1000) - 24 * 3600;
        const lte = gte + 3 * 24 * 3600;
        const customerIds = await listRenterCustomerIds({ acctId, renter });
        for (const customerId of customerIds) {
          const invs = await connect.listInvoicesInRange({ connectedAccountId: acctId, customerId, gte, lte });
          for (const inv of invs) {
            const ts = inv.status_transitions?.paid_at || inv.created;
            if (bogotaDayKey(ts) !== date) continue;
            if (inv.status === 'open') {
              try { await stripe.invoices.voidInvoice(inv.id, acctOpts); voided++; }
              catch (e) { console.warn('[chairRental] mark-day-paid void error:', e.message); }
            }
          }
        }
      } catch (e) {
        console.warn('[chairRental] mark-day-paid lookup error:', e.message);
      }
    }

    // Registrar (o actualizar) el día en rental_manual_paid_days.
    const map = normalizeManualPaidDays(renter.rental_manual_paid_days);
    map.set(date, {
      date,
      amount_cop: amountCop || 0,
      note,
      marked_by: req.user.id,
      at: new Date().toISOString(),
    });
    const arr = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    // El cobro manual deja al renter al día (no bloqueado, sin mora pendiente).
    await prisma.users.update({
      where: { id: renter.id },
      data: {
        rental_manual_paid_days: arr,
        rental_status: 'active',
        rental_past_due_since: null,
        updated_at: new Date(),
      },
    });

    return res.json({ ok: true, date, amount_cop: amountCop || 0, voided });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/unmark-day-paid   (owner)
// body: { date: "YYYY-MM-DD" }
// Deshace el "marcar pagado" manual de un día.
// ─────────────────────────────────────────────────────────────
exports.unmarkDayPaid = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const date = String(req.body?.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date debe ser YYYY-MM-DD' });
    }
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: { id: true, tenant_id: true, employment_type: true, rental_manual_paid_days: true },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    const map = normalizeManualPaidDays(renter.rental_manual_paid_days);
    map.delete(date);
    const arr = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    await prisma.users.update({
      where: { id: renter.id },
      data: { rental_manual_paid_days: arr, updated_at: new Date() },
    });
    return res.json({ ok: true, date });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/set-status   (owner)
// body: { status: 'active' | 'past_due' | 'blocked', note? }
// Cambio MANUAL del estado del renter (override del dueño). Caso principal:
// pasarlo a 'active' ("pagado") cuando cobró por otro medio (efectivo o un
// cobro extra). Al activar, anula las invoices de arriendo abiertas (para que
// Stripe deje de reintentarlas y el webhook no lo devuelva a mora) y registra
// esos días como pagados manualmente en el calendario (auditoría).
// ─────────────────────────────────────────────────────────────
exports.setRenterStatus = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const status = String(req.body?.status || '').trim();
    if (!['active', 'past_due', 'blocked'].includes(status)) {
      return res.status(400).json({ error: "status debe ser 'active', 'past_due' o 'blocked'" });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : '';

    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true, email: true,
        monthly_rent_cop: true, rental_status: true, rental_past_due_since: true,
        rental_stripe_customer_id: true, rental_manual_paid_days: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    const data = { rental_status: status, updated_at: new Date() };
    let voided = 0;
    const manualDays = [];

    if (status === 'active') {
      data.rental_past_due_since = null;

      // Anular las invoices del arriendo que sigan abiertas (últimos 60 días).
      // Sin esto, el siguiente reintento fallido de Stripe dispara el webhook de
      // mora y el estado vuelve a past_due solo. Cada día anulado queda como
      // pagado manual en el calendario, con la nota del dueño.
      if (renter.rental_stripe_customer_id) {
        const acctId = acctIdFor(tenant);
        const acctOpts = acctId ? { stripeAccount: acctId } : undefined;
        const dailyCop = renter.monthly_rent_cop
          ? Math.round(connect.calcDailyCentsFromMonthly(Number(renter.monthly_rent_cop)) / 100)
          : 0;
        try {
          const nowSec = Math.floor(Date.now() / 1000);
          const map = normalizeManualPaidDays(renter.rental_manual_paid_days);
          const customerIds = await listRenterCustomerIds({ acctId, renter });
          for (const customerId of customerIds) {
            const invs = await connect.listInvoicesInRange({
              connectedAccountId: acctId,
              customerId,
              gte: nowSec - 60 * 24 * 3600,
              lte: nowSec + 24 * 3600,
            });
            for (const inv of invs) {
              if (inv.status !== 'open') continue;
              try {
                await stripe.invoices.voidInvoice(inv.id, acctOpts);
                voided++;
                const day = bogotaDayKey(inv.created);
                map.set(day, {
                  date: day,
                  amount_cop: Math.round((inv.amount_due || 0) / 100) || dailyCop,
                  note: note || 'Pagado por otro medio (cambio de estado manual)',
                  marked_by: req.user.id,
                  at: new Date().toISOString(),
                });
                manualDays.push(day);
              } catch (e) {
                console.warn('[chairRental] set-status void error:', e.message);
              }
            }
          }
          if (manualDays.length) {
            data.rental_manual_paid_days = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch (e) {
          console.warn('[chairRental] set-status invoices lookup error:', e.message);
        }
      }
    } else if (status === 'past_due') {
      data.rental_past_due_since = renter.rental_past_due_since || new Date();
    }
    // 'blocked' conserva rental_past_due_since (la deuda sigue vigente).

    await prisma.users.update({ where: { id: renter.id }, data });

    console.log(`[chairRental] renter ${renter.id} → ${status} (cambio manual por ${req.user.id}${note ? `: ${note}` : ''}, ${voided} invoices anuladas)`);
    return res.json({ ok: true, status, voided, manual_paid_days: manualDays.sort() });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/toggle-block-day   (owner)
// body: { date: "YYYY-MM-DD" }
// Alterna un día como "bloqueado" (no se cobra). Si la suscripción diaria
// alcanza a cobrarlo, el webhook invoice.paid lo reembolsa automáticamente.
// ─────────────────────────────────────────────────────────────
exports.toggleBlockDay = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const date = String(req.body?.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida (use YYYY-MM-DD)' });
    }
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: { id: true, tenant_id: true, employment_type: true, rental_blocked_days: true },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    const current = normalizeBlockedDays(renter.rental_blocked_days);
    const isBlocked = current.includes(date);
    const next = isBlocked ? current.filter((d) => d !== date) : [...current, date].sort();

    await prisma.users.update({
      where: { id: renter.id },
      data: { rental_blocked_days: next, updated_at: new Date() },
    });

    return res.json({ blocked: !isBlocked, date, blocked_days: next });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/readjust-policy   (owner)
// body: { readjust: boolean }
// Política de los días bloqueados:
//   false (default, "saltar")  → el día bloqueado se reembolsa; el renter paga menos.
//   true ("reajustar")         → el día bloqueado NO se reembolsa; paga el mes completo.
// ─────────────────────────────────────────────────────────────
exports.setReadjustPolicy = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const readjust = !!req.body?.readjust;
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: { id: true, tenant_id: true, employment_type: true },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    await prisma.users.update({
      where: { id: renter.id },
      data: { rental_readjust_blocked: readjust, updated_at: new Date() },
    });

    return res.json({ readjust_blocked: readjust });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/refund   (owner)
// body: { id } — id de invoice ("in_...") o de PaymentIntent ad-hoc ("pi_...")
// Reembolsa un cobro a la tarjeta del renter (cobros dobles, días que no
// debían cobrarse, etc.). Idempotente: si ya estaba reembolsado responde 409.
// ─────────────────────────────────────────────────────────────
exports.refundRenterCharge = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const chargeRef = String(req.body?.id || '').trim();
    if (!chargeRef) return res.status(400).json({ error: 'Falta el id del cobro a reembolsar.' });

    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: { id: true, tenant_id: true, employment_type: true, email: true, rental_stripe_customer_id: true },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'El renter no tiene customer de Stripe.' });
    }

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    // El cobro puede vivir en un customer duplicado histórico del renter
    // (cobros "ocultos") — se acepta cualquiera de sus customers.
    const customerIds = await listRenterCustomerIds({ acctId, renter });

    // Resolver el cobro y verificar que pertenece a ESTE renter.
    let refundParams = null;
    if (chargeRef.startsWith('in_')) {
      const inv = await stripe.invoices.retrieve(chargeRef, acctOpts);
      if (!customerIds.includes(typeof inv.customer === 'string' ? inv.customer : inv.customer?.id)) {
        return res.status(403).json({ error: 'La factura no pertenece a este renter.' });
      }
      if ((inv.amount_paid || 0) <= 0) {
        return res.status(400).json({ error: 'La factura no tiene un pago que reembolsar.' });
      }
      refundParams = inv.payment_intent
        ? { payment_intent: inv.payment_intent }
        : inv.charge
          ? { charge: typeof inv.charge === 'string' ? inv.charge : inv.charge.id }
          : null;
    } else if (chargeRef.startsWith('pi_')) {
      const pi = await stripe.paymentIntents.retrieve(chargeRef, acctOpts);
      if (!customerIds.includes(typeof pi.customer === 'string' ? pi.customer : pi.customer?.id)) {
        return res.status(403).json({ error: 'El cobro no pertenece a este renter.' });
      }
      refundParams = { payment_intent: pi.id };
    } else {
      return res.status(400).json({ error: 'Id de cobro inválido (se espera in_... o pi_...).' });
    }
    if (!refundParams) {
      return res.status(400).json({ error: 'El cobro no tiene un cargo asociado para reembolsar.' });
    }

    try {
      const refund = await stripe.refunds.create(
        {
          ...refundParams,
          reason: 'requested_by_customer',
          metadata: {
            tpia_resource: 'chair_rental_manual_refund',
            renter_id: renter.id,
            tenant_id: tenant.id,
            refunded_by_user_id: req.user.id,
          },
        },
        acctOpts
      );
      console.log(`[chairRental] reembolso manual ${refund.id} (${chargeRef}) renter ${renter.id}`);
      return res.json({ ok: true, refund_id: refund.id });
    } catch (e) {
      if (e?.code === 'charge_already_refunded') {
        return res.status(409).json({ error: 'Ese cobro ya estaba reembolsado.' });
      }
      throw e;
    }
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/income-summary?month=YYYY-MM   (owner)
// Acumulado REAL del mes a la fecha en todo el coworking del tenant:
// suma de cobros pagados (subs diarias + días sueltos + ad-hoc) menos
// reembolsos. Es lo efectivamente recibido, no la proyección mensual/30.
// ─────────────────────────────────────────────────────────────
exports.getIncomeSummary = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);

    const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || '').trim());
    const nowSec = Math.floor(Date.now() / 1000);
    const todayKey = bogotaDayKey(nowSec); // "YYYY-MM-DD" en Bogotá
    const year = m ? Number(m[1]) : Number(todayKey.slice(0, 4));
    const month = m ? Number(m[2]) : Number(todayKey.slice(5, 7));
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const gte = Math.floor(Date.UTC(year, month - 1, 1) / 1000) - 24 * 3600;
    const lte = Math.floor(Date.UTC(year, month, 1) / 1000) + 24 * 3600;

    const renters = await prisma.users.findMany({
      where: {
        tenant_id: tenant.id,
        employment_type: 'renter',
        rental_stripe_customer_id: { not: null },
      },
      select: { id: true, email: true, tenant_id: true, rental_stripe_customer_id: true },
    });

    const acctId = acctIdFor(tenant);
    let grossCents = 0;
    let refundedCents = 0;
    let charges = 0;

    // De a pocos: la Search API de Stripe se satura con todos en paralelo.
    const CONCURRENCY = 3;
    for (let i = 0; i < renters.length; i += CONCURRENCY) {
      await Promise.all(
      renters.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          // Incluye customers duplicados históricos del renter (cobros "ocultos").
          const customerIds = await listRenterCustomerIds({ acctId, renter: r });
          for (const customerId of customerIds) {
            const invoices = await connect.listInvoicesInRange({
              connectedAccountId: acctId,
              customerId,
              gte,
              lte,
            });
            for (const inv of invoices) {
              if ((inv.amount_paid || 0) <= 0) continue;
              const key = bogotaDayKey(inv.status_transitions?.paid_at || inv.created);
              if (!key.startsWith(monthPrefix)) continue;
              grossCents += inv.amount_paid;
              refundedCents += inv.charge?.amount_refunded || 0;
              charges++;
            }
            const adhoc = await connect.listAdhocCharges({
              connectedAccountId: acctId,
              customerId,
              limit: 100,
            });
            for (const p of adhoc) {
              const key = bogotaDayKey(p.created);
              if (!key.startsWith(monthPrefix)) continue;
              grossCents += p.amount_paid || 0;
              refundedCents += p.amount_refunded || 0;
              charges++;
            }
          }
        } catch (e) {
          console.warn(`[chairRental] income-summary: renter ${r.id} omitido:`, e.message);
        }
      })
      );
    }

    return res.json({
      month: monthPrefix,
      gross_cop: Math.round(grossCents / 100),
      refunded_cop: Math.round(refundedCents / 100),
      net_cop: Math.round((grossCents - refundedCents) / 100),
      charges,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/income-report?from=YYYY-MM-DD&to=YYYY-MM-DD   (owner)
//   (también acepta ?month=YYYY-MM por compatibilidad => todo el mes)
// Igual base que income-summary pero devuelve el DETALLE de cada cobro del mes
// (por persona y por fecha) para el reporte clickeable del KPI "Acumulado".
// Cada cobro: { renter_id, renter_name, date (YYYY-MM-DD Bogotá), ts, amount_cop,
// refunded_cop, net_cop, type (arriendo|extra), status (paid|refunded), id, url }.
// También un resumen por persona (by_person) y los totales del mes.
// ─────────────────────────────────────────────────────────────
exports.getIncomeReport = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);

    // Rango de fechas. Soporta ?from=YYYY-MM-DD&to=YYYY-MM-DD (un día => from=to)
    // y, por compatibilidad, ?month=YYYY-MM (todo el mes).
    const todayKey = bogotaDayKey(Math.floor(Date.now() / 1000));
    const dayRe = /^\d{4}-\d{2}-\d{2}$/;
    const fromQ = String(req.query.from || '').trim();
    const toQ = String(req.query.to || '').trim();

    let fromKey, toKey;
    if (dayRe.test(fromQ) && dayRe.test(toQ)) {
      // Normaliza el orden por si llegan invertidas.
      fromKey = fromQ <= toQ ? fromQ : toQ;
      toKey = fromQ <= toQ ? toQ : fromQ;
    } else {
      const m = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || '').trim());
      const y = m ? Number(m[1]) : Number(todayKey.slice(0, 4));
      const mo = m ? Number(m[2]) : Number(todayKey.slice(5, 7));
      const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      fromKey = `${y}-${String(mo).padStart(2, '0')}-01`;
      toKey = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    // Ventana UTC con padding ±24h para cubrir el desfase de Bogotá; el filtro
    // fino por día (key dentro de [fromKey, toKey]) se aplica más abajo.
    const [fy, fm, fd] = fromKey.split('-').map(Number);
    const [ty, tm, td] = toKey.split('-').map(Number);
    const gte = Math.floor(Date.UTC(fy, fm - 1, fd) / 1000) - 24 * 3600;
    const lte = Math.floor(Date.UTC(ty, tm - 1, td + 1) / 1000) + 24 * 3600;

    const renters = await prisma.users.findMany({
      where: {
        tenant_id: tenant.id,
        employment_type: 'renter',
        rental_stripe_customer_id: { not: null },
      },
      select: { id: true, first_name: true, last_name: true, email: true, tenant_id: true, rental_stripe_customer_id: true },
    });

    const acctId = acctIdFor(tenant);
    const charges = [];
    let grossCents = 0;
    let refundedCents = 0;

    // De a pocos: la Search API de Stripe se satura con todos en paralelo.
    const CONCURRENCY = 3;
    for (let i = 0; i < renters.length; i += CONCURRENCY) {
      await Promise.all(
        renters.slice(i, i + CONCURRENCY).map(async (r) => {
          const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || r.email || 'Sin nombre';
          try {
            const customerIds = await listRenterCustomerIds({ acctId, renter: r });
            for (const customerId of customerIds) {
              const invoices = await connect.listInvoicesInRange({
                connectedAccountId: acctId, customerId, gte, lte,
              });
              for (const inv of invoices) {
                if ((inv.amount_paid || 0) <= 0) continue;
                const ts = inv.status_transitions?.paid_at || inv.created;
                const key = bogotaDayKey(ts);
                if (key < fromKey || key > toKey) continue;
                const refunded = inv.charge?.amount_refunded || 0;
                grossCents += inv.amount_paid;
                refundedCents += refunded;
                charges.push({
                  renter_id: r.id,
                  renter_name: name,
                  date: key,
                  ts,
                  amount_cop: Math.round(inv.amount_paid / 100),
                  refunded_cop: Math.round(refunded / 100),
                  net_cop: Math.round((inv.amount_paid - refunded) / 100),
                  type: 'arriendo',
                  status: refunded > 0 ? 'refunded' : 'paid',
                  id: inv.id,
                  url: inv.hosted_invoice_url || null,
                });
              }
              const adhoc = await connect.listAdhocCharges({ connectedAccountId: acctId, customerId, limit: 100 });
              for (const p of adhoc) {
                const key = bogotaDayKey(p.created);
                if (key < fromKey || key > toKey) continue;
                const refunded = p.amount_refunded || 0;
                grossCents += p.amount_paid || 0;
                refundedCents += refunded;
                charges.push({
                  renter_id: r.id,
                  renter_name: name,
                  date: key,
                  ts: p.created,
                  amount_cop: Math.round((p.amount_paid || 0) / 100),
                  refunded_cop: Math.round(refunded / 100),
                  net_cop: Math.round(((p.amount_paid || 0) - refunded) / 100),
                  type: 'extra',
                  status: refunded > 0 ? 'refunded' : 'paid',
                  id: p.id,
                  url: p.hosted_invoice_url || null,
                });
              }
            }
          } catch (e) {
            console.warn(`[chairRental] income-report: renter ${r.id} omitido:`, e.message);
          }
        })
      );
    }

    charges.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // Resumen por persona (totales del mes).
    const byPersonMap = new Map();
    for (const ch of charges) {
      const p = byPersonMap.get(ch.renter_id) || {
        renter_id: ch.renter_id, renter_name: ch.renter_name,
        charges: 0, gross_cop: 0, refunded_cop: 0, net_cop: 0,
      };
      p.charges += 1;
      p.gross_cop += ch.amount_cop;
      p.refunded_cop += ch.refunded_cop;
      p.net_cop += ch.net_cop;
      byPersonMap.set(ch.renter_id, p);
    }

    return res.json({
      from: fromKey,
      to: toKey,
      month: fromKey.slice(0, 7),
      gross_cop: Math.round(grossCents / 100),
      refunded_cop: Math.round(refundedCents / 100),
      net_cop: Math.round((grossCents - refundedCents) / 100),
      count: charges.length,
      charges,
      by_person: [...byPersonMap.values()].sort((a, b) => b.net_cop - a.net_cop),
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/chair-rentals/pending-refunds   (owner)
// Cobros que toca devolver y que aún NO tienen reembolso en Stripe
// (últimos 60 días, zona Bogotá):
//   - "double_charge": más de una invoice pagada el mismo día → sobran n-1
//   - "blocked_day":   día bloqueado cobrado, con política "saltar"
// Para que el owner llame al estilista y le devuelva desde el mismo modal.
// ─────────────────────────────────────────────────────────────
exports.getPendingRefunds = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const acctId = acctIdFor(tenant);
    const nowSec = Math.floor(Date.now() / 1000);
    // Ventana configurable (?days=, 7–365). Por defecto 60 días.
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 60));
    const gte = nowSec - days * 24 * 3600;
    const lte = nowSec + 24 * 3600;

    const renters = await prisma.users.findMany({
      where: {
        tenant_id: tenant.id,
        employment_type: 'renter',
        rental_stripe_customer_id: { not: null },
      },
      select: {
        id: true, first_name: true, last_name: true, phone: true, email: true,
        tenant_id: true, rental_stripe_customer_id: true, rental_blocked_days: true,
        rental_readjust_blocked: true,
      },
    });

    const out = [];
    let totalCop = 0;

    // De a pocos (no Promise.all de todos): la Search API de Stripe se satura
    // y los renters caídos desaparecían del listado de forma intermitente.
    const CONCURRENCY = 3;
    for (let i = 0; i < renters.length; i += CONCURRENCY) {
      await Promise.all(
      renters.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          // Incluye customers duplicados históricos: los dobles cobros pueden estar
          // repartidos ENTRE dos customers del mismo renter (mismo día, distinta cuenta).
          const customerIds = await listRenterCustomerIds({ acctId, renter: r });
          const invoices = [];
          for (const customerId of customerIds) {
            invoices.push(...await connect.listInvoicesInRange({
              connectedAccountId: acctId,
              customerId,
              gte,
              lte,
            }));
            // Cobros manuales ("Cobro extra"): no generan invoice, así que antes nunca
            // se detectaban como doble cobro aunque el día ya estuviera pagado.
            try {
              const adhoc = await connect.listAdhocCharges({ connectedAccountId: acctId, customerId, limit: 100 });
              invoices.push(...adhoc.filter((p) => p.created >= gte));
            } catch (e) {
              console.warn(`[chairRental] pending-refunds: ad-hoc de ${customerId} omitidos:`, e.message);
            }
          }
          const paid = invoices.filter((i) => i.status === 'paid' && (i.amount_paid || 0) > 0);
          const isRefunded = (i) =>
            i.refunded === true || i.charge?.refunded === true || (i.charge?.amount_refunded || 0) > 0;
          const itemOf = (day, reason, e) => ({
            day,
            reason,
            amount_cop: Math.round(e.amount_paid / 100),
            invoice_id: e.id,
            source: e.adhoc ? 'manual' : 'subscription',
            description: e.description || null,
            paid_at: e.status_transitions?.paid_at || e.created,
          });

          const byDay = {};
          for (const inv of paid) {
            const k = bogotaDayKey(rentDayTs(inv));
            (byDay[k] = byDay[k] || []).push(inv);
          }

          const blocked = normalizeBlockedDays(r.rental_blocked_days);
          const items = [];
          for (const [k, invs] of Object.entries(byDay)) {
            const notRefunded = invs.filter((i) => !isRefunded(i));
            if (notRefunded.length === 0) continue;
            if (blocked.includes(k) && !r.rental_readjust_blocked) {
              // Día bloqueado con política "saltar": TODO cobro de ese día se devuelve.
              for (const e of notRefunded) items.push(itemOf(k, 'blocked_day', e));
            } else if (notRefunded.length > 1) {
              // Día normal con varios cobros: se queda el de la suscripción (o el primero)
              // y sobran n-1; los cobros manuales son los primeros en sobrar.
              const extras = [...notRefunded]
                .sort((a, b) => (!!a.adhoc - !!b.adhoc) || (a.created - b.created))
                .slice(1);
              for (const e of extras) items.push(itemOf(k, 'double_charge', e));
            }
          }

          if (items.length > 0) {
            items.sort((a, b) => a.day.localeCompare(b.day));
            const total = items.reduce((s, i) => s + i.amount_cop, 0);
            totalCop += total;
            out.push({
              id: r.id,
              first_name: r.first_name,
              last_name: r.last_name,
              phone: r.phone,
              email: r.email,
              total_cop: total,
              items,
            });
          }
        } catch (e) {
          console.warn(`[chairRental] pending-refunds: renter ${r.id} omitido:`, e.message);
        }
      })
      );
    }

    out.sort((a, b) => b.total_cop - a.total_cop);
    return res.json({ renters: out, total_cop: totalCop });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/pause    (owner)
// Pausa el cobro automático diario (no cancela la suscripción).
// ─────────────────────────────────────────────────────────────
exports.pauseRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: { id: true, tenant_id: true, employment_type: true, rental_stripe_subscription_id: true },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!renter.rental_stripe_subscription_id) {
      return res.status(400).json({ error: 'El renter no tiene una suscripción activa para pausar.' });
    }
    const sub = await connect.pauseSubscription({
      connectedAccountId: acctIdFor(tenant),
      subscriptionId: renter.rental_stripe_subscription_id,
    });
    return res.json({ ok: true, paused: !!sub.pause_collection, status: sub.status });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/resume    (owner)
// Reanuda el cobro automático diario.
// ─────────────────────────────────────────────────────────────
exports.resumeRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true, monthly_rent_cop: true,
        rental_stripe_customer_id: true, rental_stripe_subscription_id: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    // Una suscripción cancelada / expirada (o inexistente) NO se puede reanudar en
    // Stripe: solo admite cambios de metadata. En ese caso se crea una NUEVA con la
    // tarjeta ya guardada (mismo flujo que "vincular tarjeta"); reconcile descarta
    // la muerta y evita duplicados.
    let dead = !renter.rental_stripe_subscription_id;
    if (!dead) {
      try {
        const current = await stripe.subscriptions.retrieve(renter.rental_stripe_subscription_id, acctOpts);
        dead = ['canceled', 'incomplete_expired'].includes(current.status);
      } catch (e) {
        if (e?.code === 'resource_missing') dead = true; else throw e;
      }
    }
    if (dead) {
      if (!renter.rental_stripe_customer_id || !renter.monthly_rent_cop) {
        return res.status(409).json({
          error: 'La suscripción expiró y no hay tarjeta guardada o tarifa mensual para crear una nueva. Vincula la tarjeta del estilista.',
        });
      }
      const { card, subscriptionId } = await reconcileRenterCard({ acctId, renter, startSubIfMissing: true });
      if (!card) {
        return res.status(409).json({
          error: 'La suscripción expiró y el estilista no tiene una tarjeta guardada. Vincula su tarjeta para crear una nueva.',
        });
      }
      if (!subscriptionId) {
        return res.status(502).json({ error: 'No se pudo crear la nueva suscripción en Stripe. Intenta de nuevo o revisa el log.' });
      }
      const fresh = await stripe.subscriptions.retrieve(subscriptionId, acctOpts);
      const updated = await prisma.users.findUnique({ where: { id: renter.id }, select: { rental_status: true } });
      return res.json({
        ok: true, recreated: true, paused: !!fresh.pause_collection,
        status: fresh.status, rental_status: updated?.rental_status || null,
      });
    }
    const sub = await connect.resumeSubscription({
      connectedAccountId: acctIdFor(tenant),
      subscriptionId: renter.rental_stripe_subscription_id,
    });
    // Al reactivar el cobro, el estado del renter pasa a "al día" (sigue siendo
    // editable a mano desde el badge del detalle).
    await prisma.users.update({
      where: { id: renter.id },
      data: { rental_status: 'active', rental_past_due_since: null, updated_at: new Date() },
    });
    return res.json({ ok: true, paused: !!sub.pause_collection, status: sub.status, rental_status: 'active' });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/charge-day    (owner)
// Cobra UN día de arriendo de forma puntual creando una invoice (para que el
// día quede registrado y aparezca en verde en el calendario). Útil cuando la
// suscripción está pausada y el owner solo quiere cobrar días sueltos.
// Body: { date?: 'YYYY-MM-DD', amount_cop?: number }  (por defecto = tarifa diaria)
// ─────────────────────────────────────────────────────────────
exports.chargeRenterDay = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true,
        monthly_rent_cop: true, rental_stripe_customer_id: true,
        first_name: true, last_name: true,
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

    // Monto: por defecto la tarifa diaria (mensualidad / 30).
    let amount = Number(req.body?.amount_cop);
    if (!amount || amount <= 0) {
      amount = renter.monthly_rent_cop
        ? Math.round(connect.calcDailyCentsFromMonthly(Number(renter.monthly_rent_cop)) / 100)
        : 0;
    }
    if (!amount || amount < 2000) {
      return res.status(400).json({ error: 'El monto mínimo es 2.000 COP' });
    }
    const dateLabel =
      typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
        ? req.body.date
        : null;

    const customer = await stripe.customers.retrieve(renter.rental_stripe_customer_id, acctOpts);
    const pmId = customer?.invoice_settings?.default_payment_method;
    if (!pmId) {
      return res.status(400).json({
        error: 'El estilista aún no tiene tarjeta predeterminada. Pídele que complete el setup primero.',
      });
    }

    const amountCents = Math.round(amount * 100);
    const desc = `Arriendo de cupo${dateLabel ? ` · ${dateLabel}` : ''}`;
    const meta = {
      tpia_resource: 'chair_rental_day',
      renter_id: renter.id,
      tenant_id: tenant.id,
      day: dateLabel || '',
      charged_by_user_id: req.user.id,
    };

    try {
      // 1) Crear la invoice (draft) PRIMERO. Stripe ya NO incluye los pending
      //    invoice items automáticamente al crear la invoice (el default cambió
      //    a 'exclude'): crear el item suelto y luego la invoice la dejaba en $0
      //    → finalize la marcaba 'paid' (nada que cobrar) y pay() reventaba con
      //    "You can only pass in open invoices. This invoice isn't open." Por eso
      //    el calendario tiraba error al cobrar un día.
      const invoice = await stripe.invoices.create(
        {
          customer: renter.rental_stripe_customer_id,
          collection_method: 'charge_automatically',
          default_payment_method: pmId,
          auto_advance: false,
          description: desc,
          metadata: meta,
        },
        acctOpts
      );
      // 2) Adjuntar el item A ESTA invoice por id (no como pending suelto).
      await stripe.invoiceItems.create(
        {
          customer: renter.rental_stripe_customer_id,
          invoice: invoice.id,
          amount: amountCents,
          currency: 'cop',
          description: desc,
          metadata: meta,
        },
        acctOpts
      );
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id, acctOpts);
      const paid = await stripe.invoices.pay(finalized.id, acctOpts);

      return res.json({
        ok: true,
        invoice_id: paid.id,
        status: paid.status,
        amount_cop: amount,
        hosted_invoice_url: paid.hosted_invoice_url,
      });
    } catch (e) {
      const code = e?.code || e?.raw?.code;
      const declineCode = e?.decline_code || e?.raw?.decline_code;
      console.error('[chairRental] charge-day failed:', { code, declineCode, msg: e.message });
      if (code === 'authentication_required') {
        return res.status(402).json({
          error: 'La tarjeta requiere autenticación (3DS). Pide al estilista actualizar la tarjeta.',
          code,
        });
      }
      return res.status(402).json({
        error: e?.message || 'No se pudo cobrar el día',
        code: code || 'charge_failed',
        decline_code: declineCode || null,
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
      try {
        const sub = await stripe.subscriptions.retrieve(renter.rental_stripe_subscription_id, subOpts);
        // Solo actualizamos el precio en Stripe si la sub sigue viva. Si murió
        // (canceled/incomplete_expired) basta con guardar el nuevo precio en BD;
        // reconcileRenterCard arrancará una sub nueva con la tarifa correcta.
        if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
          await stripe.subscriptions.update(
            renter.rental_stripe_subscription_id,
            {
              items: [{ id: sub.items.data[0].id, price: newPriceId }],
              proration_behavior: 'none',
            },
            subOpts
          );
        }
      } catch (e) {
        if (e?.code !== 'resource_missing') {
          console.warn('[chairRental] updateRenter: no se pudo actualizar precio de la sub:', e.message);
        }
      }
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
      // Nunca dejar que un error de Stripe (p.ej. sub ya cancelada) bloquee el
      // quitar al renter. cancelSubscription ya es idempotente, pero por si acaso.
      try {
        await connect.cancelSubscription({
          connectedAccountId: acctIdFor(tenant),
          subscriptionId: renter.rental_stripe_subscription_id,
          immediately: immediately === '1' || immediately === 'true',
        });
      } catch (e) {
        console.warn('[chairRental] removeRenter: no se pudo cancelar sub:', e.message);
      }
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
// POST /api/chair-rentals/renters/:id/setup-intent    (owner / admin)
// Crea un SetupIntent para capturar la tarjeta DENTRO de la app (Stripe
// Elements), sin redirigir a Checkout. Devuelve el client_secret + la
// publishable key + el connected account para inicializar Stripe.js. Al
// confirmarlo desde el front, el PM queda adjunto; reconcileRenterCard
// (al recargar el detalle) lo marca default y arranca la suscripción.
// ─────────────────────────────────────────────────────────────
exports.createRenterSetupIntent = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (![1, 2].includes(req.user.role_id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    if (!tenant.chair_rental_direct_mode && !tenant.stripe_connect_charges_enabled) {
      return res.status(400).json({ error: 'Tu Stripe Connect no está habilitado para cobros.' });
    }
    const publishableKey = process.env.STRIPE_CONNECT_PUBLISHABLE_KEY;
    if (!publishableKey) {
      return res.status(503).json({ error: 'Falta STRIPE_CONNECT_PUBLISHABLE_KEY en el servidor.' });
    }

    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }

    const acctId = acctIdFor(tenant);
    const customerId = await connect.findOrCreateRenterCustomer({
      connectedAccountId: acctId,
      renter,
      existingCustomerId: renter.rental_stripe_customer_id,
    });
    if (customerId !== renter.rental_stripe_customer_id) {
      await prisma.users.update({
        where: { id: renter.id },
        data: { rental_stripe_customer_id: customerId, updated_at: new Date() },
      });
    }

    const intent = await connect.createSetupIntent({
      connectedAccountId: acctId,
      customerId,
      renterId: renter.id,
    });

    return res.json({
      client_secret: intent.client_secret,
      publishable_key: publishableKey,
      stripe_account: acctId || null,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/chair-rentals/renters/:id/confirm-card    (owner)
// body: { payment_method }
// Tras confirmar un SetupIntent inline, fuerza la tarjeta NUEVA como default del
// customer y de la suscripción. Sin esto, si ya existía una tarjeta default, la
// suscripción seguía cobrando la vieja (reconcile no la sobreescribe).
// ─────────────────────────────────────────────────────────────
exports.confirmRenterCard = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (![1, 2].includes(req.user.role_id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const pmId = String(req.body?.payment_method || '').trim();
    if (!pmId) return res.status(400).json({ error: 'Falta payment_method' });

    const renter = await prisma.users.findUnique({ where: { id: req.params.id } });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'El renter no tiene customer de Stripe aún.' });
    }

    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    // 1) Marcar la tarjeta nueva como default del customer.
    await connect.setDefaultPaymentMethod({
      connectedAccountId: acctId,
      customerId: renter.rental_stripe_customer_id,
      paymentMethodId: pmId,
    });

    // 2) Si ya hay suscripción, actualizar su default_payment_method para que el
    //    próximo cobro use la tarjeta nueva (override de cualquier default previo).
    if (renter.rental_stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(
          renter.rental_stripe_subscription_id,
          { default_payment_method: pmId },
          acctOpts
        );
      } catch (e) {
        console.warn('[chairRental] confirm-card: no se pudo actualizar default de la sub:', e.message);
      }
    }

    // 3) Reconciliar: arranca la suscripción si faltaba y devuelve la tarjeta actual.
    //    Aquí SÍ arrancamos la sub: es una vinculación de tarjeta explícita.
    const { card, subscriptionId } = await reconcileRenterCard({ acctId, renter, startSubIfMissing: true });

    return res.json({ ok: true, card, subscription_id: subscriptionId });
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
// SELF-SERVICE (estilista renter logueado) — scope = req.user.id
// ─────────────────────────────────────────────────────────────

// Resuelve al renter logueado o devuelve null si no aplica.
async function selfRenterOrNull(userId) {
  const renter = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true, first_name: true, last_name: true, email: true, phone: true,
      tenant_id: true, employment_type: true, monthly_rent_cop: true,
      rental_status: true, rental_past_due_since: true, created_at: true,
      rental_stripe_customer_id: true, rental_stripe_subscription_id: true,
    },
  });
  if (!renter || renter.employment_type !== 'renter') return null;
  return renter;
}

// GET /api/chair-rentals/access
// Misma regla que requireManagerRole en las rutas: rol 5 siempre; si el
// tenant tiene encargado designado, solo ese usuario; si no, roles 1/2.
exports.getAccess = async (req, res) => {
  try {
    const { id, role_id, tenant_id } = req.user || {};
    if (role_id === 5) return res.json({ can_manage: true });
    if (![1, 2].includes(role_id) || !tenant_id) return res.json({ can_manage: false });
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { chair_rental_manager_user_id: true },
    });
    const managerId = tenant?.chair_rental_manager_user_id;
    return res.json({ can_manage: !managerId || managerId === id });
  } catch (e) {
    return fail(res, e);
  }
};

// GET /api/chair-rentals/me
// Estado de Coworking del estilista logueado: mensualidad, cobro diario,
// mora, días de gracia, tarjeta, suscripción e historial de pagos.
exports.getMyRental = async (req, res) => {
  try {
    const renter = await selfRenterOrNull(req.user.id);
    if (!renter) {
      return res.status(404).json({ error: 'No tienes un espacio de Coworking activo.' });
    }

    const tenant = await tenantOrThrow(renter.tenant_id);
    const acctId = acctIdFor(tenant);
    const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

    let subscription = null;
    let invoices = [];

    // Lee/auto-repara la tarjeta (y arranca la sub si falta) sin depender del webhook.
    const { card: defaultCard, subscriptionId } = await reconcileRenterCard({ acctId, renter });

    if (renter.rental_stripe_customer_id) {
      try {
        const list = await stripe.invoices.list(
          { customer: renter.rental_stripe_customer_id, limit: 10, expand: ['data.charge'] },
          acctOpts
        );
        invoices = list.data.map((i) => ({
          id: i.id, number: i.number, status: i.status,
          amount_paid: i.amount_paid, amount_due: i.amount_due,
          currency: i.currency, created: i.created,
          hosted_invoice_url: i.hosted_invoice_url, description: i.description,
          refunded_cash: i.metadata?.tpia_refund_cash === '1',
          refunded: i.charge?.refunded === true || (i.charge?.amount_refunded || 0) > 0,
        }));
      } catch (e) {
        console.warn('[chairRental/me] no se pudieron listar invoices:', e.message);
      }
      // Sumar los cobros manuales ad-hoc (PaymentIntents sin invoice) al historial.
      try {
        const adhoc = await connect.listAdhocCharges({
          connectedAccountId: acctId,
          customerId: renter.rental_stripe_customer_id,
        });
        invoices = [...invoices, ...adhoc].sort((a, b) => (b.created || 0) - (a.created || 0));
      } catch (e) {
        console.warn('[chairRental/me] no se pudieron listar cobros ad-hoc:', e.message);
      }
    }

    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId, acctOpts);
        subscription = {
          status: sub.status,
          paused: !!sub.pause_collection,
          pause_behavior: sub.pause_collection?.behavior || null,
          current_period_end: sub.current_period_end,
          current_period_start: sub.current_period_start,
          cancel_at_period_end: sub.cancel_at_period_end,
        };
      } catch (e) {
        console.warn('[chairRental/me] no se pudo leer subscription:', e.message);
      }
    }

    let cardStatus = null;
    if (defaultCard && renter.rental_stripe_customer_id) {
      try {
        cardStatus = await connect.getCardStatus({
          connectedAccountId: acctId,
          customerId: renter.rental_stripe_customer_id,
          card: defaultCard,
        });
      } catch (e) {
        console.warn('[chairRental/me] no se pudo leer estado de tarjeta:', e.message);
      }
    }

    const graceDays = tenant.rental_block_grace_days ?? 3;
    let daysPastDue = 0;
    if (renter.rental_past_due_since) {
      const ms = Date.now() - new Date(renter.rental_past_due_since).getTime();
      daysPastDue = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
    }
    const dailyCents = renter.monthly_rent_cop
      ? connect.calcDailyCentsFromMonthly(Number(renter.monthly_rent_cop))
      : 0;

    return res.json({
      renter: {
        id: renter.id,
        first_name: renter.first_name,
        last_name: renter.last_name,
        email: renter.email,
        rental_status: renter.rental_status,
        rental_past_due_since: renter.rental_past_due_since,
        monthly_rent_cop: renter.monthly_rent_cop,
        daily_cop: Math.round(dailyCents / 100),
        days_past_due: daysPastDue,
        grace_days: graceDays,
        has_subscription: !!subscriptionId,
        has_customer: !!renter.rental_stripe_customer_id,
        created_at: renter.created_at,
      },
      tenant_name: tenant.name,
      subscription,
      default_card: defaultCard,
      card_status: cardStatus,
      invoices,
    });
  } catch (e) {
    return fail(res, e);
  }
};

// POST /api/chair-rentals/me/payment-link
// Customer Portal del propio renter para actualizar tarjeta.
exports.getMyPaymentLink = async (req, res) => {
  try {
    const renter = await selfRenterOrNull(req.user.id);
    if (!renter) return res.status(404).json({ error: 'No tienes un espacio de Coworking activo.' });
    if (!renter.rental_stripe_customer_id) {
      return res.status(400).json({ error: 'Aún no tienes método de pago configurado.' });
    }
    const tenant = await tenantOrThrow(renter.tenant_id);
    const portal = await connect.createBillingPortalForRenter({
      connectedAccountId: acctIdFor(tenant),
      customerId: renter.rental_stripe_customer_id,
    });
    return res.json({ url: portal.url });
  } catch (e) {
    return fail(res, e);
  }
};

// POST /api/chair-rentals/me/setup-link
// Checkout Setup para registrar la PRIMERA tarjeta (renter sin suscripción).
exports.getMySetupLink = async (req, res) => {
  try {
    const renter = await selfRenterOrNull(req.user.id);
    if (!renter) return res.status(404).json({ error: 'No tienes un espacio de Coworking activo.' });
    if (renter.rental_stripe_subscription_id) {
      return res.status(409).json({
        error: 'Ya tienes una suscripción activa. Usa "Actualizar tarjeta" para cambiar tu método de pago.',
      });
    }
    const tenant = await tenantOrThrow(renter.tenant_id);
    if (!tenant.chair_rental_direct_mode && !tenant.stripe_connect_charges_enabled) {
      return res.status(400).json({ error: 'El salón aún no tiene los cobros habilitados.' });
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
    return res.json({ url: setupSession.url });
  } catch (e) {
    return fail(res, e);
  }
};

// POST /api/chair-rentals/renters/:id/invite   (owner / admin)
// Envía email de activación de cuenta reusando el flujo de reset-password.
exports.inviteRenter = async (req, res) => {
  try {
    const tenant = await tenantOrThrow(req.user.tenant_id);
    if (![1, 2].includes(req.user.role_id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const renter = await prisma.users.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, tenant_id: true, employment_type: true,
        email: true, first_name: true,
      },
    });
    if (!renter || renter.tenant_id !== tenant.id || renter.employment_type !== 'renter') {
      return res.status(404).json({ error: 'Renter no encontrado' });
    }
    if (!renter.email || renter.email.endsWith('@temp.tupelukeria.com')) {
      return res.status(400).json({ error: 'El estilista no tiene un email válido para enviar la invitación.' });
    }

    const crypto = require('crypto');
    const { sendCoworkingInviteEmail } = require('../services/emailService');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h para activar
    await prisma.users.update({
      where: { id: renter.id },
      data: { password_reset_token: token, password_reset_expires: expires },
    });

    try {
      await sendCoworkingInviteEmail({
        email: renter.email,
        token,
        firstName: renter.first_name,
        tenantName: tenant.name,
      });
    } catch (emailErr) {
      console.error('[chairRental] error enviando invitación:', emailErr.message);
      return res.status(502).json({ error: 'No se pudo enviar el email de invitación. Intenta de nuevo.' });
    }

    return res.json({ ok: true, message: `Invitación enviada a ${renter.email}` });
  } catch (e) {
    return fail(res, e);
  }
};

// ─────────────────────────────────────────────────────────────
// WEBHOOK: POST /api/chair-rentals/webhook
// Recibe eventos de Connected Accounts (Connect webhook secret).
// Maneja invoice.paid, invoice.payment_failed, subscription.deleted.
// ─────────────────────────────────────────────────────────────
// Extrae el subscription id de una invoice de forma compatible con varias
// versiones de la API de Stripe. En API ≥ 2025 (p.ej. clover) el campo
// top-level `invoice.subscription` desapareció y se movió a
// `invoice.parent.subscription_details.subscription` (o dentro de las líneas).
function invoiceSubscriptionId(inv) {
  return (
    inv?.subscription ||
    inv?.parent?.subscription_details?.subscription ||
    inv?.lines?.data?.[0]?.subscription ||
    inv?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription ||
    null
  );
}

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
        const subId = invoiceSubscriptionId(inv);
        if (!subId) break;
        // Si el día cobrado estaba bloqueado, reembolsamos y no notificamos "pago OK".
        const refunded = await maybeRefundBlockedDay(inv, subId, event.account || null);
        if (!refunded) await markRenterPaidBySubscription(subId, inv);
        break;
      }
      case 'invoice.payment_failed': {
        const failedInv = event.data.object;
        const subId = invoiceSubscriptionId(failedInv);
        if (!subId) break;
        await markRenterPastDueBySubscription(subId, failedInv);
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

async function markRenterPaidBySubscription(subscriptionId, invoice = null) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: {
      id: true, tenant_id: true, phone: true, first_name: true,
      rental_status: true,
    },
  });
  if (!renter) return;
  // ¿Venía atrasado? Solo en ese caso le avisamos que se regularizó (evita un
  // WhatsApp diario, ya que el cobro automático es diario).
  const wasBehind = renter.rental_status === 'past_due' || renter.rental_status === 'blocked';
  await prisma.users.update({
    where: { id: renter.id },
    data: { rental_status: 'active', rental_past_due_since: null, updated_at: new Date() },
  });
  console.log(`[chairRental] renter ${renter.id} → active (invoice.paid)`);

  if (wasBehind) {
    const tenant = await prisma.tenants.findUnique({
      where: { id: renter.tenant_id },
      select: { name: true },
    });
    const ts = invoice?.status_transitions?.paid_at || invoice?.created || Math.floor(Date.now() / 1000);
    const info = {
      amount_cop: Math.round((invoice?.amount_paid || invoice?.amount_due || 0) / 100),
      dateKey: bogotaDayKey(ts),
    };
    notifyRenterPaid(renter, tenant, info).catch((e) => {
      console.error('[chairRental] notifyRenterPaid error:', e.message);
    });
  }
}

// Si la invoice diaria corresponde a un día marcado como bloqueado por el dueño,
// reembolsa el cobro al instante (el día NO debía cobrarse) y deja al renter al
// día. Devuelve true si reembolsó (para no enviar la notif de "pago OK").
async function maybeRefundBlockedDay(invoice, subscriptionId, eventAccount) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: { id: true, tenant_id: true, rental_blocked_days: true, rental_readjust_blocked: true },
  });
  if (!renter) return false;

  const blocked = normalizeBlockedDays(renter.rental_blocked_days);
  if (blocked.length === 0) return false;

  const ts = invoice.status_transitions?.paid_at || invoice.created;
  const dayKey = bogotaDayKey(ts);
  if (!blocked.includes(dayKey)) return false;

  // Política "reajustar": el día bloqueado NO se reembolsa — el renter paga el
  // mes completo aunque ese día no use el cupo. Se procesa como pago normal.
  if (renter.rental_readjust_blocked) return false;

  // Resolver la cuenta donde vive el cobro (Connect event trae event.account;
  // en modo pasarela directa cae en la plataforma).
  let acctId = eventAccount;
  if (!acctId) {
    const tenant = await prisma.tenants.findUnique({
      where: { id: renter.tenant_id },
      select: { chair_rental_direct_mode: true, stripe_connect_account_id: true },
    });
    acctId = acctIdFor(tenant || {});
  }
  const acctOpts = acctId ? { stripeAccount: acctId } : undefined;

  try {
    const refundParams = invoice.payment_intent
      ? { payment_intent: invoice.payment_intent }
      : invoice.charge
        ? { charge: invoice.charge }
        : null;
    if (refundParams) {
      await stripe.refunds.create(
        { ...refundParams, reason: 'requested_by_customer', metadata: { tpia_resource: 'chair_rental_blocked_day', day: dayKey } },
        acctOpts
      );
      console.log(`[chairRental] día bloqueado ${dayKey} reembolsado a renter ${renter.id}`);
    } else {
      console.warn(`[chairRental] invoice ${invoice.id} bloqueada pero sin charge/PI para reembolsar`);
    }
  } catch (e) {
    console.error('[chairRental] error reembolsando día bloqueado:', e.message);
  }

  // El renter sigue al día (el cobro no debía contar). No enviamos "pago OK".
  await prisma.users.update({
    where: { id: renter.id },
    data: { rental_status: 'active', rental_past_due_since: null, updated_at: new Date() },
  });
  return true;
}

// Notificación WhatsApp al renter cuando su pago se procesa y queda al día tras
// haber estado en mora. NO se manda en cada cobro diario, solo al regularizarse.
async function notifyRenterPaid(renter, tenant, info = {}) {
  if (!renter.phone) return;
  try {
    const wahaService = require('../services/wahaService');
    const cleanPhone = toWaNumber(renter.phone);
    if (!cleanPhone) return;
    const chatId = `${cleanPhone}@s.whatsapp.net`;
    const firstName = (renter.first_name || '').split(' ')[0] || '';
    const salonName = tenant?.name || 'tu salón';
    // Recibo: fecha + monto. Si no llegó info de la invoice, cae al mensaje simple.
    const fecha = info.dateKey ? fmtDayDMY(info.dateKey) : '';
    const monto = info.amount_cop ? fmtCop(info.amount_cop) : '';
    const recibo = (fecha && monto)
      ? `🧾 Recibo: pago de ${monto} el ${fecha}.\n`
      : (fecha ? `🧾 Recibo: pago recibido el ${fecha}.\n` : '');
    const message = `Hola${firstName ? ' ' + firstName : ''} ✅ Tu pago fue efectuado con éxito y tu arriendo en ${salonName} quedó al día.\n${recibo}¡Gracias!`;
    await wahaService.sendMessage(renter.tenant_id, chatId, message);
    console.log(`[chairRental] notif pago/regularizado enviada a renter ${renter.id}`);
  } catch (e) {
    console.warn('[chairRental] no se pudo enviar notif pago WA al renter:', e.message);
  }
}

async function markRenterPastDueBySubscription(subscriptionId, invoice = null) {
  const renter = await prisma.users.findFirst({
    where: { rental_stripe_subscription_id: subscriptionId },
    select: {
      id: true, tenant_id: true, rental_past_due_since: true,
      phone: true, first_name: true, rental_stripe_customer_id: true,
      rental_status: true, rental_last_dunning_at: true,
    },
  });
  if (!renter) return;

  const tenant = await prisma.tenants.findUnique({
    where: { id: renter.tenant_id },
    select: {
      name: true, rental_block_grace_days: true,
      stripe_connect_account_id: true, chair_rental_direct_mode: true,
    },
  });
  const since = renter.rental_past_due_since || new Date();
  // Política: NO se bloquea por mora. El cobro diario sigue intentándose y el dueño
  // cobra/marca los días manualmente. Solo dejamos registro de mora + aviso al renter.
  const daysPastDue = Math.max(1, Math.floor((Date.now() - new Date(since).getTime()) / (24 * 60 * 60 * 1000)));

  // Stripe reintenta el cobro diario varias veces y antes reenviábamos el WhatsApp
  // en cada intento. Ahora avisamos máximo UNA vez por día (zona Bogotá).
  const nowSec = Math.floor(Date.now() / 1000);
  const notifiedToday =
    renter.rental_last_dunning_at &&
    bogotaDayKey(Math.floor(new Date(renter.rental_last_dunning_at).getTime() / 1000)) === bogotaDayKey(nowSec);
  const shouldNotify = !notifiedToday;

  await prisma.users.update({
    where: { id: renter.id },
    data: {
      rental_status: 'past_due', // nunca 'blocked' (cobro manual)
      rental_past_due_since: renter.rental_past_due_since || new Date(),
      ...(shouldNotify ? { rental_last_dunning_at: new Date() } : {}),
      updated_at: new Date(),
    },
  });
  console.log(`[chairRental] renter ${renter.id} → past_due (${daysPastDue}d, sin bloqueo)${shouldNotify ? '' : ' [notif mora omitida: ya avisado hoy]'}`);

  if (shouldNotify) {
    const ts = invoice?.created || nowSec;
    const info = {
      amount_cop: Math.round((invoice?.amount_due || invoice?.amount_remaining || 0) / 100),
      dateKey: bogotaDayKey(ts),
    };
    notifyRenterPastDue(renter, tenant, daysPastDue, info).catch((e) => {
      console.error('[chairRental] notifyRenterPastDue error:', e.message);
    });
  }
}

// Notificación WhatsApp al renter cuando un cobro de arriendo no se pudo procesar
// (sin fondos). Incluye fecha y monto del día pendiente (tipo recibo) + link al
// portal para actualizar tarjeta. No bloquea el acceso (política de cobro manual).
async function notifyRenterPastDue(renter, tenant, daysPastDue = 1, info = {}) {
  if (!renter.phone || !renter.rental_stripe_customer_id) return;
  try {
    const acctId = tenant?.chair_rental_direct_mode ? null : tenant?.stripe_connect_account_id;
    const portal = await connect.createBillingPortalForRenter({
      connectedAccountId: acctId,
      customerId: renter.rental_stripe_customer_id,
    });
    const wahaService = require('../services/wahaService');
    const cleanPhone = toWaNumber(renter.phone);
    if (!cleanPhone) return;
    const chatId = `${cleanPhone}@s.whatsapp.net`;
    const firstName = (renter.first_name || '').split(' ')[0] || '';
    const salonName = tenant?.name || 'tu salón';
    const fecha = info.dateKey ? fmtDayDMY(info.dateKey) : '';
    const monto = info.amount_cop ? fmtCop(info.amount_cop) : '';
    // Detalle de lo que se debe, con fecha (tipo recibo de pendiente).
    const pendiente = (fecha && monto)
      ? `Pendiente: ${monto} del ${fecha}.\n`
      : (fecha ? `Pendiente del ${fecha}.\n` : '');
    const message = `Hola${firstName ? ' ' + firstName : ''} ⚠️ No pudimos procesar el cobro de tu arriendo en ${salonName}.\n${pendiente}Puedes ponerte al día actualizando tu método de pago aquí (privado): ${portal.url}`;
    await wahaService.sendMessage(renter.tenant_id, chatId, message);
    console.log(`[chairRental] notif mora enviada a renter ${renter.id} (past_due, ${daysPastDue}d)`);
  } catch (e) {
    console.warn('[chairRental] no se pudo enviar notif WA al renter:', e.message);
  }
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
