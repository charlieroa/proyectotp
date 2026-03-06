// src/config/stripePrices.js
'use strict';

const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Planes pagos con precios en centavos COP
const PLANS = [
  { key: 'pro',        name: 'Pro',        amount: 2990000  },  // $29.900 COP
  { key: 'business',   name: 'Business',   amount: 4990000  },  // $49.900 COP
  { key: 'enterprise', name: 'Enterprise', amount: 9990000  },  // $99.900 COP
];

// Cache en memoria: { pro: 'price_xxx', business: 'price_yyy', ... }
let priceCache = {};

/**
 * Crea productos y precios en Stripe de forma idempotente.
 * Usa metadata.plan_key para buscar si ya existen.
 */
async function ensureStripePrices() {
  if (!stripe) {
    console.warn('⚠️  STRIPE_SECRET_KEY no configurada – Stripe desactivado');
    return;
  }

  for (const plan of PLANS) {
    // Buscar producto existente por metadata
    const existingProducts = await stripe.products.search({
      query: `metadata["plan_key"]:"${plan.key}"`,
    });

    let productId;

    if (existingProducts.data.length > 0) {
      productId = existingProducts.data[0].id;
    } else {
      const product = await stripe.products.create({
        name: `Tupelukeria ${plan.name}`,
        metadata: { plan_key: plan.key },
      });
      productId = product.id;
    }

    // Buscar precio activo para este producto
    const existingPrices = await stripe.prices.list({
      product: productId,
      active: true,
      currency: 'cop',
      type: 'recurring',
      limit: 1,
    });

    if (existingPrices.data.length > 0) {
      priceCache[plan.key] = existingPrices.data[0].id;
    } else {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.amount,
        currency: 'cop',
        recurring: { interval: 'month' },
        metadata: { plan_key: plan.key },
      });
      priceCache[plan.key] = price.id;
    }
  }

  console.log('✅ Stripe Prices loaded:', priceCache);
}

/**
 * Retorna el price_id de Stripe para un plan dado.
 */
function getPriceId(planKey) {
  return priceCache[planKey] || null;
}

module.exports = { ensureStripePrices, getPriceId, stripe };
