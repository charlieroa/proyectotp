// One-off de SOLO LECTURA: lista, por renter de Coworking, los cobros que
// toca devolver y que aún NO tienen reembolso en Stripe:
//   - "doble cobro": más de una invoice pagada el mismo día (Bogotá) → sobran n-1
//   - "día bloqueado": día en rental_blocked_days cobrado, con política saltar
// Uso (en el VPS): node /home/vps/tupelukeria/backend/scripts/find-pending-refunds.js
'use strict';

const path = require('path');
const BASE = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(BASE, '.env') });

const prisma = require(path.join(BASE, 'src/config/prisma'));
const { stripeConnect: stripe } = require(path.join(BASE, 'src/config/stripeConnect'));

const FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
});
const dayKey = (unixSec) => FMT.format(new Date(unixSec * 1000));
const cop = (n) => '$' + Math.round(n).toLocaleString('es-CO');

// Desde cuándo revisar (cubre toda la vida del coworking).
const SINCE = Math.floor(Date.parse('2026-05-01T00:00:00Z') / 1000);

// Customers del renter: el de la BD + duplicados históricos (mismo email o
// metadata.renter_id huérfano). Igual que listRenterCustomerIds del controller.
async function listRenterCustomerIds(renter, opts) {
  const ids = new Set();
  if (renter.rental_stripe_customer_id) ids.add(renter.rental_stripe_customer_id);
  const queries = [`metadata['renter_id']:'${renter.id}'`];
  if (renter.email) queries.push(`email:'${String(renter.email).replace(/'/g, '')}'`);
  const candidates = new Map();
  for (const query of queries) {
    try {
      const r = await stripe.customers.search({ query, limit: 20 }, opts);
      for (const c of r.data) {
        if (c.deleted) continue;
        if (c.metadata?.tpia_resource !== 'chair_rental') continue;
        candidates.set(c.id, c);
      }
    } catch {}
  }
  for (const c of candidates.values()) {
    if (ids.has(c.id)) continue;
    const metaRenterId = c.metadata?.renter_id;
    if (metaRenterId && metaRenterId !== renter.id) {
      let other = null;
      try {
        other = await prisma.users.findUnique({
          where: { id: metaRenterId },
          select: { id: true, email: true, tenant_id: true, employment_type: true },
        });
      } catch { continue; }
      if (other) {
        const samePerson =
          (other.email || '').toLowerCase() === (renter.email || '').toLowerCase() &&
          other.tenant_id === renter.tenant_id;
        if (!samePerson || other.employment_type === 'renter') continue;
      }
    }
    ids.add(c.id);
  }
  return [...ids];
}

async function listPaidInvoices(customerId, opts) {
  const out = [];
  let starting_after;
  for (;;) {
    const page = await stripe.invoices.list(
      {
        customer: customerId,
        created: { gte: SINCE },
        limit: 100,
        expand: ['data.charge'],
        ...(starting_after ? { starting_after } : {}),
      },
      opts
    );
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return out.filter((i) => i.status === 'paid' && (i.amount_paid || 0) > 0);
}

(async () => {
  const tenants = await prisma.tenants.findMany({
    where: { chair_rental_enabled: true },
    select: { id: true, name: true, chair_rental_direct_mode: true, stripe_connect_account_id: true },
  });

  let grandTotal = 0;
  let anyone = false;

  for (const t of tenants) {
    const acctId = t.chair_rental_direct_mode ? null : t.stripe_connect_account_id;
    const opts = acctId ? { stripeAccount: acctId } : undefined;

    const renters = await prisma.users.findMany({
      where: { tenant_id: t.id, employment_type: 'renter', rental_stripe_customer_id: { not: null } },
      select: {
        id: true, first_name: true, last_name: true, phone: true, email: true,
        tenant_id: true, rental_stripe_customer_id: true, rental_blocked_days: true,
        rental_readjust_blocked: true,
      },
    });
    if (renters.length === 0) continue;

    const lines = [];
    for (const r of renters) {
      let paid;
      try {
        const customerIds = await listRenterCustomerIds(r, opts);
        paid = [];
        for (const cid of customerIds) paid.push(...await listPaidInvoices(cid, opts));
      } catch (e) {
        lines.push(`  ⚠ ${r.first_name || ''} ${r.last_name || ''}: error Stripe (${e.message})`);
        continue;
      }

      const byDay = {};
      for (const inv of paid) {
        const k = dayKey(inv.status_transitions?.paid_at || inv.created);
        (byDay[k] = byDay[k] || []).push(inv);
      }

      const blocked = Array.isArray(r.rental_blocked_days) ? r.rental_blocked_days : [];
      const pend = [];
      for (const [k, invs] of Object.entries(byDay)) {
        const notRefunded = invs.filter(
          (i) => !(i.charge?.refunded === true || (i.charge?.amount_refunded || 0) > 0)
        );
        if (notRefunded.length === 0) continue;
        if (blocked.includes(k) && !r.rental_readjust_blocked) {
          // Día bloqueado con política "saltar": TODO cobro de ese día se devuelve.
          for (const e of notRefunded) {
            pend.push({ day: k, reason: 'día bloqueado', amount: e.amount_paid / 100, id: e.id });
          }
        } else if (notRefunded.length > 1) {
          // Día normal con más de un cobro pagado: sobran n-1 (se queda el primero).
          const extras = [...notRefunded].sort((a, b) => a.created - b.created).slice(1);
          for (const e of extras) {
            pend.push({ day: k, reason: 'doble cobro', amount: e.amount_paid / 100, id: e.id });
          }
        }
      }

      if (pend.length > 0) {
        anyone = true;
        pend.sort((a, b) => a.day.localeCompare(b.day));
        const total = pend.reduce((s, p) => s + p.amount, 0);
        grandTotal += total;
        const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.id;
        lines.push(`  • ${name}${r.phone ? ' (' + r.phone + ')' : ''} — devolver ${cop(total)} en ${pend.length} cobro(s):`);
        for (const p of pend) {
          lines.push(`      ${p.day}  ${cop(p.amount).padStart(10)}  ${p.reason}  ${p.id}`);
        }
      }
    }

    if (lines.length > 0) {
      console.log(`\n=== ${t.name} ===`);
      lines.forEach((l) => console.log(l));
    }
  }

  if (!anyone) {
    console.log('\n✔ No hay devoluciones pendientes: ningún doble cobro ni día bloqueado sin reembolsar.');
  } else {
    console.log(`\nTOTAL A DEVOLVER: ${cop(grandTotal)}`);
  }
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error('ERROR:', e.message);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
