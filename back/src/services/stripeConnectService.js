'use strict';

const { stripeConnect: stripe } = require('../config/stripeConnect');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.tupelukeria.com';

// Stripe COP usa centavos (2 decimales). 1 peso colombiano = 100 unidades.
const COP_MULTIPLIER = 100;
const DAYS_PER_MONTH_FOR_DAILY = 30;

// Stripe COP minimum charge ~$2,000 COP. Below this we refuse to create.
const MIN_DAILY_COP = 2000;

function requireStripe() {
  if (!stripe) {
    const err = new Error('Stripe no esta configurado en este servidor.');
    err.status = 503;
    throw err;
  }
}

// Si connectedAccountId es falsy, omite el header stripeAccount → operación
// directa en la cuenta principal (modo pasarela, sin Connect).
function acctOpts(connectedAccountId) {
  return connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;
}

// ─────────────────────────────────────────────────────────────
// EXPRESS ACCOUNTS (peluquería como Connected Account)
// ─────────────────────────────────────────────────────────────
async function createExpressAccount({ email, businessName }) {
  requireStripe();
  return stripe.accounts.create({
    type: 'express',
    country: 'CO',
    email: email || undefined,
    business_profile: { name: businessName || undefined, mcc: '7230' },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

async function createOnboardingLink(accountId) {
  requireStripe();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${FRONTEND_URL}/settings?tab=7&onboarding=refresh`,
    return_url: `${FRONTEND_URL}/settings?tab=7&onboarding=done`,
    type: 'account_onboarding',
  });
}

async function getAccount(accountId) {
  requireStripe();
  return stripe.accounts.retrieve(accountId);
}

// ─────────────────────────────────────────────────────────────
// PRECIO DIARIO (creado en la Connected Account del owner)
// ─────────────────────────────────────────────────────────────
function calcDailyCentsFromMonthly(monthlyCop) {
  const monthlyCents = Math.round(Number(monthlyCop) * COP_MULTIPLIER);
  const dailyCents = Math.round(monthlyCents / DAYS_PER_MONTH_FOR_DAILY);
  return dailyCents;
}

async function findOrCreateDailyPrice({ connectedAccountId, monthlyCop, renterId }) {
  requireStripe();
  const dailyCents = calcDailyCentsFromMonthly(monthlyCop);
  if (dailyCents / COP_MULTIPLIER < MIN_DAILY_COP) {
    const err = new Error(
      `El precio diario (${Math.round(dailyCents / COP_MULTIPLIER)} COP) es menor al mínimo de Stripe (~${MIN_DAILY_COP} COP). Sube el precio mensual.`
    );
    err.status = 400;
    throw err;
  }

  // Producto idempotente por renter
  const products = await stripe.products.search(
    { query: `metadata["renter_id"]:"${renterId}"` },
    acctOpts(connectedAccountId)
  );

  let productId;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create(
      {
        name: `Arriendo cupo estilista ${renterId.slice(0, 8)}`,
        metadata: { renter_id: renterId, tpia_resource: 'chair_rental' },
      },
      acctOpts(connectedAccountId)
    );
    productId = product.id;
  }

  // Reusar precio si el monto coincide
  const existing = await stripe.prices.list(
    { product: productId, active: true, currency: 'cop', type: 'recurring', limit: 10 },
    acctOpts(connectedAccountId)
  );
  const match = existing.data.find(
    (p) => p.unit_amount === dailyCents && p.recurring?.interval === 'day'
  );
  if (match) return match.id;

  const price = await stripe.prices.create(
    {
      product: productId,
      unit_amount: dailyCents,
      currency: 'cop',
      recurring: { interval: 'day' },
      metadata: { renter_id: renterId, monthly_cop: String(monthlyCop) },
    },
    acctOpts(connectedAccountId)
  );
  return price.id;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER + SUBSCRIPTION del renter (en la cuenta del owner)
// ─────────────────────────────────────────────────────────────
async function findOrCreateRenterCustomer({ connectedAccountId, renter, existingCustomerId }) {
  requireStripe();
  if (existingCustomerId) {
    try {
      const c = await stripe.customers.retrieve(existingCustomerId, acctOpts(connectedAccountId));
      if (c && !c.deleted) return c.id;
    } catch (e) {
      if (e.code !== 'resource_missing') throw e;
    }
  }
  const customer = await stripe.customers.create(
    {
      name: `${renter.first_name || ''} ${renter.last_name || ''}`.trim() || undefined,
      email: renter.email || undefined,
      phone: renter.phone || undefined,
      metadata: { renter_id: renter.id, tpia_resource: 'chair_rental' },
    },
    acctOpts(connectedAccountId)
  );
  return customer.id;
}

async function createCheckoutForCardSetup({ connectedAccountId, customerId, renterId }) {
  requireStripe();
  return stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${FRONTEND_URL}/rental/onboarded?ok=1`,
      cancel_url: `${FRONTEND_URL}/rental/onboarded?ok=0`,
      metadata: { renter_id: renterId, tpia_resource: 'chair_rental_setup' },
    },
    acctOpts(connectedAccountId)
  );
}

// Crea un SetupIntent para capturar la tarjeta DENTRO de la app (Stripe Elements),
// sin redirigir a Checkout. Al confirmarlo desde el front, el payment_method queda
// adjunto al customer. La marca como default + arranque de suscripción los hace
// reconcileRenterCard al recargar el detalle.
async function createSetupIntent({ connectedAccountId, customerId, renterId }) {
  requireStripe();
  return stripe.setupIntents.create(
    {
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { renter_id: renterId, tpia_resource: 'chair_rental_setup' },
    },
    acctOpts(connectedAccountId)
  );
}

// Lista las tarjetas adjuntas al customer (fallback cuando el webhook no marcó
// default_payment_method). Devuelve la más reciente o null.
async function listCustomerCards({ connectedAccountId, customerId }) {
  requireStripe();
  const list = await stripe.paymentMethods.list(
    { customer: customerId, type: 'card', limit: 1 },
    acctOpts(connectedAccountId)
  );
  return list.data[0] || null;
}

// Suscripciones que ya están facturando (o a punto de) y que NO deben duplicarse.
// 'incomplete' se excluye a propósito: esa muere a las 23h si no se paga el 1er
// cobro, así que dejamos que se cree una nueva en ese caso.
const LIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

async function createDailySubscription({ connectedAccountId, customerId, priceId, renterId, tenantId }) {
  requireStripe();

  // IDEMPOTENCIA: si el customer ya tiene una suscripción diaria viva, reutilízala
  // en vez de crear otra. Sin esto, dos rutas concurrentes (webhook
  // checkout.session.completed + confirmRenterCard inline) creaban DOS subs que
  // facturaban el mismo día → doble cobro diario. La BD solo guardaba la última y
  // la otra quedaba huérfana cobrando para siempre.
  try {
    const existing = await stripe.subscriptions.list(
      { customer: customerId, status: 'all', limit: 100 },
      acctOpts(connectedAccountId)
    );
    const liveDaily = existing.data.find(
      (s) =>
        LIVE_SUB_STATUSES.includes(s.status) &&
        s.items?.data?.[0]?.price?.recurring?.interval === 'day'
    );
    if (liveDaily) {
      console.warn(
        `[stripeConnect] createDailySubscription: reusando sub viva ${liveDaily.id} ` +
          `(status=${liveDaily.status}) para renter ${renterId} — se evitó un duplicado.`
      );
      return liveDaily;
    }
  } catch (e) {
    // Si el listado falla no bloqueamos la creación (mejor una sub que ninguna);
    // el peor caso es el comportamiento anterior, no algo peor.
    console.warn('[stripeConnect] createDailySubscription: no se pudo verificar duplicados:', e.message);
  }

  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: 'charge_automatically',
      // El primer cobro se intenta off_session reutilizando la autenticación
      // del setup (la tarjeta se guardó con usage:off_session). Sin esto Stripe
      // trata el primer pago como on_session, las tarjetas COP piden 3DS y la
      // suscripción queda 'incomplete' → a las 23h muere (incomplete_expired).
      off_session: true,
      // OJO: NO usar payment_settings.save_default_payment_method:'on_subscription'.
      // Eso "clava" la suscripción a la tarjeta del primer cobro; luego, cuando el
      // estilista cambia de tarjeta por el portal de Stripe (que solo actualiza la
      // default del customer), la suscripción seguía cobrando la VIEJA. Sin clavarla,
      // la suscripción hereda siempre la default del customer (la tarjeta nueva).
      metadata: {
        renter_id: renterId,
        tenant_id: tenantId,
        tpia_resource: 'chair_rental',
      },
    },
    acctOpts(connectedAccountId)
  );
}

async function cancelSubscription({ connectedAccountId, subscriptionId, immediately = false }) {
  requireStripe();
  try {
    // Si la suscripción ya terminó (canceled / incomplete_expired) Stripe rechaza
    // cualquier update → la tratamos como idempotente y no hay nada que cancelar.
    const sub = await stripe.subscriptions.retrieve(subscriptionId, acctOpts(connectedAccountId));
    if (['canceled', 'incomplete_expired'].includes(sub.status)) {
      return sub;
    }
    if (immediately) {
      return stripe.subscriptions.cancel(subscriptionId, acctOpts(connectedAccountId));
    }
    return stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true },
      acctOpts(connectedAccountId)
    );
  } catch (e) {
    // Sub inexistente o ya cancelada → no bloquear el flujo (p.ej. quitar renter).
    if (e?.code === 'resource_missing' || /canceled subscription/i.test(e?.message || '')) {
      return null;
    }
    throw e;
  }
}

// Pausa el cobro de la suscripción diaria SIN cancelarla. behavior:'void' hace
// que las invoices que se generen durante la pausa se anulen (no se cobra nada).
// El cobro automático sigue "vivo" — solo deja de cobrar hasta reanudar.
async function pauseSubscription({ connectedAccountId, subscriptionId, behavior = 'void' }) {
  requireStripe();
  return stripe.subscriptions.update(
    subscriptionId,
    { pause_collection: { behavior } },
    acctOpts(connectedAccountId)
  );
}

// Reanuda el cobro automático: quita pause_collection (string vacío = unset).
async function resumeSubscription({ connectedAccountId, subscriptionId }) {
  requireStripe();
  return stripe.subscriptions.update(
    subscriptionId,
    { pause_collection: '' },
    acctOpts(connectedAccountId)
  );
}

// Lista invoices del customer dentro de un rango [gte, lte] (unix segundos).
// Para pintar el calendario de qué días se cobró/pagó el arriendo.
async function listInvoicesInRange({ connectedAccountId, customerId, gte, lte, limit = 100 }) {
  requireStripe();
  const out = [];
  let startingAfter;
  // pagina hasta agotar (un mes = ~31 invoices del sub diario, holgado en 100).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await stripe.invoices.list(
      {
        customer: customerId,
        created: { gte, lte },
        limit,
        // charge expandido para saber si el cobro fue reembolsado (días bloqueados,
        // reembolsos manuales) y por cuánto.
        expand: ['data.charge'],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      },
      acctOpts(connectedAccountId)
    );
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

// Lista cobros manuales ad-hoc del customer: PaymentIntents sueltos que NO están
// ligados a una invoice (los crea el botón "Cobrar" → chargeRenter). Como no son
// invoices, no aparecen en invoices.list y el historial los ignoraba. Devuelve
// solo los exitosos, normalizados al mismo shape que las invoices del historial.
async function listAdhocCharges({ connectedAccountId, customerId, limit = 20 }) {
  requireStripe();
  const pis = await stripe.paymentIntents.list(
    { customer: customerId, limit, expand: ['data.latest_charge'] },
    acctOpts(connectedAccountId)
  );
  return pis.data
    .filter((p) => !p.invoice && p.status === 'succeeded')
    .map((p) => ({
      id: p.id,
      number: null,
      status: 'paid',
      amount_paid: p.amount_received || p.amount,
      amount_due: p.amount,
      currency: p.currency,
      created: p.created,
      hosted_invoice_url: p.latest_charge?.receipt_url || null,
      description: p.description || 'Cobro manual',
      adhoc: true,
      refunded:
        p.latest_charge?.refunded === true ||
        (p.latest_charge?.amount_refunded || 0) > 0,
      amount_refunded: p.latest_charge?.amount_refunded || 0,
    }));
}

// Estado real de la tarjeta del renter según su último intento de cobro:
//   'activa'     → el intento más reciente fue exitoso
//   'sin_fondos' → declinada por fondos insuficientes
//   'rechazada'  → cualquier otro decline, o la tarjeta ya venció
// Devuelve null si el customer aún no tiene intentos de cobro.
async function getCardStatus({ connectedAccountId, customerId, card }) {
  requireStripe();
  if (card?.exp_year) {
    const now = new Date();
    const expired =
      card.exp_year < now.getFullYear() ||
      (card.exp_year === now.getFullYear() && card.exp_month < now.getMonth() + 1);
    if (expired) return { status: 'rechazada', reason: 'Tarjeta vencida' };
  }
  const charges = await stripe.charges.list(
    { customer: customerId, limit: 5 },
    acctOpts(connectedAccountId)
  );
  const last = charges.data[0]; // más reciente primero
  if (!last) return null;
  if (last.status === 'succeeded') return { status: 'activa', reason: null };
  const declineReason = last.outcome?.reason || last.failure_code || '';
  if (declineReason === 'insufficient_funds') {
    return { status: 'sin_fondos', reason: last.failure_message || 'Fondos insuficientes' };
  }
  return { status: 'rechazada', reason: last.failure_message || declineReason || 'Cobro rechazado' };
}

async function createBillingPortalForRenter({ connectedAccountId, customerId }) {
  requireStripe();
  return stripe.billingPortal.sessions.create(
    {
      customer: customerId,
      return_url: `${FRONTEND_URL}/rental/portal-return`,
    },
    acctOpts(connectedAccountId)
  );
}

// Setea un payment_method como default en el customer (para que las invoices
// recurrentes lo cobren automáticamente). Se llama después de un setup Checkout.
async function setDefaultPaymentMethod({ connectedAccountId, customerId, paymentMethodId }) {
  requireStripe();
  return stripe.customers.update(
    customerId,
    { invoice_settings: { default_payment_method: paymentMethodId } },
    acctOpts(connectedAccountId)
  );
}

// Lee un Checkout Session expandido (incluye setup_intent.payment_method).
async function retrieveCheckoutSession({ connectedAccountId, sessionId }) {
  requireStripe();
  return stripe.checkout.sessions.retrieve(
    sessionId,
    { expand: ['setup_intent'] },
    acctOpts(connectedAccountId)
  );
}

module.exports = {
  // accounts
  createExpressAccount,
  createOnboardingLink,
  getAccount,
  // prices
  calcDailyCentsFromMonthly,
  findOrCreateDailyPrice,
  // customers/subs
  findOrCreateRenterCustomer,
  createCheckoutForCardSetup,
  createSetupIntent,
  listCustomerCards,
  createDailySubscription,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  listInvoicesInRange,
  listAdhocCharges,
  getCardStatus,
  createBillingPortalForRenter,
  setDefaultPaymentMethod,
  retrieveCheckoutSession,
};
