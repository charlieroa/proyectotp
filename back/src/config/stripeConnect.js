// src/config/stripeConnect.js
'use strict';

// Cliente Stripe dedicado al flujo Coworking (Stripe Connect Express).
// Cuenta de plataforma SEPARADA de la cuenta SaaS (Pro/Business/Enterprise),
// por eso usa STRIPE_CONNECT_SECRET_KEY en vez de STRIPE_SECRET_KEY.
//
// Si STRIPE_CONNECT_SECRET_KEY no está definida, el cliente queda nulo
// y los endpoints de coworking devuelven 503 ("Stripe disabled").

const Stripe = require('stripe');

const stripeConnect = process.env.STRIPE_CONNECT_SECRET_KEY
  ? new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY)
  : null;

if (!stripeConnect) {
  console.warn('⚠️  STRIPE_CONNECT_SECRET_KEY no configurada – flujo Coworking desactivado');
}

module.exports = { stripeConnect };
