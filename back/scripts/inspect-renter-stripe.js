// SOLO LECTURA: inspecciona TODO lo que existe en Stripe para un renter
// (customers duplicados, subs vivas, invoices pagadas) buscando por
// metadata.renter_id y por email — no solo el customer guardado en BD.
// Uso: node inspect-renter-stripe.js "<nombre o parte>"
'use strict';

const path = require('path');
const BASE = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(BASE, '.env') });

const prisma = require(path.join(BASE, 'src/config/prisma'));
const { stripeConnect: stripe } = require(path.join(BASE, 'src/config/stripeConnect'));

const FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayKey = (s) => FMT.format(new Date(s * 1000));
const cop = (cents) => '$' + Math.round(cents / 100).toLocaleString('es-CO');

(async () => {
  const q = process.argv[2] || 'nelly';
  const user = await prisma.users.findFirst({
    where: {
      employment_type: 'renter',
      OR: [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true, first_name: true, last_name: true, email: true, phone: true,
      tenant_id: true, rental_status: true, monthly_rent_cop: true,
      rental_stripe_customer_id: true, rental_stripe_subscription_id: true,
      rental_blocked_days: true, rental_readjust_blocked: true,
    },
  });
  if (!user) { console.log('No encontré renter con:', q); process.exit(0); }

  const tenant = await prisma.tenants.findUnique({
    where: { id: user.tenant_id },
    select: { name: true, chair_rental_direct_mode: true, stripe_connect_account_id: true },
  });
  const acctId = tenant.chair_rental_direct_mode ? null : tenant.stripe_connect_account_id;
  const opts = acctId ? { stripeAccount: acctId } : undefined;

  console.log(`\nRENTER: ${user.first_name} ${user.last_name} (${user.id})`);
  console.log(`  tenant: ${tenant.name} | status BD: ${user.rental_status} | mensualidad: ${user.monthly_rent_cop}`);
  console.log(`  customer BD: ${user.rental_stripe_customer_id} | sub BD: ${user.rental_stripe_subscription_id}`);
  console.log(`  blocked_days: ${JSON.stringify(user.rental_blocked_days)} | readjust: ${user.rental_readjust_blocked}`);

  // 1) Customers en Stripe ligados a este renter (metadata o email)
  const found = new Map();
  try {
    const byMeta = await stripe.customers.search(
      { query: `metadata['renter_id']:'${user.id}'`, limit: 20 }, opts
    );
    byMeta.data.forEach((c) => found.set(c.id, c));
  } catch (e) { console.log('  (search por metadata falló:', e.message + ')'); }
  if (user.email) {
    try {
      const byEmail = await stripe.customers.search(
        { query: `email:'${user.email}'`, limit: 20 }, opts
      );
      byEmail.data.forEach((c) => found.set(c.id, c));
    } catch (e) { console.log('  (search por email falló:', e.message + ')'); }
  }
  if (user.rental_stripe_customer_id && !found.has(user.rental_stripe_customer_id)) {
    try {
      const c = await stripe.customers.retrieve(user.rental_stripe_customer_id, opts);
      if (!c.deleted) found.set(c.id, c);
    } catch (e) { console.log('  (customer BD no se pudo leer:', e.message + ')'); }
  }

  console.log(`\nCUSTOMERS EN STRIPE: ${found.size}`);
  for (const c of found.values()) {
    const isDb = c.id === user.rental_stripe_customer_id ? '  ← el de la BD' : '  ⚠ NO está en BD';
    console.log(`\n  ${c.id} | email: ${c.email || '—'} | creado: ${dayKey(c.created)}${isDb}`);
    console.log(`    metadata: ${JSON.stringify(c.metadata || {})}`);

    // Subs de este customer
    const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 20 }, opts);
    for (const s of subs.data) {
      const interval = s.items?.data?.[0]?.price?.recurring?.interval;
      const amount = s.items?.data?.[0]?.price?.unit_amount || 0;
      console.log(`    sub ${s.id} | ${s.status} | ${interval} | ${cop(amount)}/día | creada ${dayKey(s.created)}${s.id === user.rental_stripe_subscription_id ? ' ← la de la BD' : ''}`);
    }

    // Invoices pagadas desde mayo
    const SINCE = Math.floor(Date.parse('2026-05-01T00:00:00Z') / 1000);
    const invs = await stripe.invoices.list(
      { customer: c.id, created: { gte: SINCE }, limit: 100, expand: ['data.charge'] }, opts
    );
    const paid = invs.data.filter((i) => i.status === 'paid' && (i.amount_paid || 0) > 0);
    let total = 0, refunded = 0;
    const days = {};
    for (const i of paid) {
      total += i.amount_paid;
      const r = i.charge?.refunded === true || (i.charge?.amount_refunded || 0) > 0;
      if (r) refunded += i.charge?.amount_refunded || i.amount_paid;
      const k = dayKey(i.status_transitions?.paid_at || i.created);
      (days[k] = days[k] || []).push(r ? 'R' : 'P');
    }
    console.log(`    invoices pagadas desde mayo: ${paid.length} | total ${cop(total)} | reembolsado ${cop(refunded)}`);
    const dup = Object.entries(days).filter(([, v]) => v.filter((x) => x === 'P').length > 1);
    if (dup.length) console.log(`    días con >1 cobro sin reembolso: ${dup.map(([k, v]) => `${k}(${v.join('')})`).join(', ')}`);
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERROR:', e.message);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
