'use strict';

const { stripe } = require('../config/stripePrices');

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
    { stripeAccount: connectedAccountId }
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
      { stripeAccount: connectedAccountId }
    );
    productId = product.id;
  }

  // Reusar precio si el monto coincide
  const existing = await stripe.prices.list(
    { product: productId, active: true, currency: 'cop', type: 'recurring', limit: 10 },
    { stripeAccount: connectedAccountId }
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
    { stripeAccount: connectedAccountId }
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
      const c = await stripe.customers.retrieve(existingCustomerId, {
        stripeAccount: connectedAccountId,
      });
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
    { stripeAccount: connectedAccountId }
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
    { stripeAccount: connectedAccountId }
  );
}

async function createDailySubscription({ connectedAccountId, customerId, priceId, renterId, tenantId }) {
  requireStripe();
  return stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: 'charge_automatically',
      metadata: {
        renter_id: renterId,
        tenant_id: tenantId,
        tpia_resource: 'chair_rental',
      },
    },
    { stripeAccount: connectedAccountId }
  );
}

async function cancelSubscription({ connectedAccountId, subscriptionId, immediately = false }) {
  requireStripe();
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId, { stripeAccount: connectedAccountId });
  }
  return stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true },
    { stripeAccount: connectedAccountId }
  );
}

async function createBillingPortalForRenter({ connectedAccountId, customerId }) {
  requireStripe();
  return stripe.billingPortal.sessions.create(
    {
      customer: customerId,
      return_url: `${FRONTEND_URL}/rental/portal-return`,
    },
    { stripeAccount: connectedAccountId }
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
  createDailySubscription,
  cancelSubscription,
  createBillingPortalForRenter,
};
