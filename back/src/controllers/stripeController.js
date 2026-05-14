// src/controllers/stripeController.js
'use strict';

const prisma = require('../config/prisma');
const { stripe, getPriceId } = require('../config/stripePrices');
const { sendSubscriptionEmail } = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://app.tupelukeria.com';

// ─── POST /api/stripe/create-checkout-session ────────────────────────
exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    const tenantId = req.user.tenant_id;

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe no esta configurado en este servidor.' });
    }

    if (!plan || !['pro', 'business', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalido.' });
    }

    const priceId = getPriceId(plan);
    if (!priceId) {
      return res.status(500).json({ error: 'Precios de Stripe no disponibles. Intenta mas tarde.' });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, email: true, stripe_customer_id: true, stripe_subscription_id: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado.' });

    // Si ya tiene suscripcion activa, cancelarla primero
    if (tenant.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(tenant.stripe_subscription_id);
      } catch (e) {
        // Ignorar si ya estaba cancelada
        if (e.code !== 'resource_missing') console.warn('Aviso cancelando sub anterior:', e.message);
      }
      await prisma.tenants.update({
        where: { id: tenantId },
        data: { stripe_subscription_id: null, subscription_status: null },
      });
    }

    // Crear o reutilizar Stripe Customer
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name || undefined,
        email: tenant.email || undefined,
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
      await prisma.tenants.update({
        where: { id: tenantId },
        data: { stripe_customer_id: customerId },
      });
    }

    // Crear Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/settings?tab=6&stripe=success`,
      cancel_url: `${FRONTEND_URL}/settings?tab=6&stripe=cancel`,
      metadata: { tenant_id: tenantId, plan },
      subscription_data: {
        metadata: { tenant_id: tenantId, plan },
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creando checkout session:', error);
    return res.status(500).json({ error: 'Error al crear sesion de pago.' });
  }
};

// ─── POST /api/stripe/cancel-subscription ────────────────────────────
exports.cancelSubscription = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { confirm } = req.body || {}; // confirm=true means user rejected the 10% offer

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, stripe_subscription_id: true, stripe_customer_id: true, current_period_end: true, plan: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado.' });

    // Step 1: If not confirmed, offer 10% discount first
    if (!confirm) {
      return res.json({
        offer_discount: true,
        discount_percent: 10,
        message: 'Antes de irte, te ofrecemos un 10% de descuento en tu próxima factura. ¿Te quedas?',
      });
    }

    // Step 2: User rejected the offer, proceed with cancellation
    let periodEnd = tenant.current_period_end;

    if (tenant.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        periodEnd = new Date(sub.current_period_end * 1000);
      } catch (e) {
        if (e.code !== 'resource_missing') console.warn('Aviso cancelando sub:', e.message);
      }
    }

    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        subscription_status: 'cancel_at_period_end',
        current_period_end: periodEnd,
        updated_at: new Date(),
      },
    });

    const endDate = periodEnd ? new Date(periodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

    return res.json({
      message: `Suscripcion cancelada. Tu plan seguirá activo hasta el ${endDate}.`,
      current_period_end: periodEnd,
    });
  } catch (error) {
    console.error('Error cancelando suscripcion:', error);
    return res.status(500).json({ error: 'Error al cancelar suscripcion.' });
  }
};

// ─── POST /api/stripe/apply-discount ─────────────────────────────────
exports.applyRetentionDiscount = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!stripe) return res.status(503).json({ error: 'Stripe no configurado.' });

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, stripe_subscription_id: true, stripe_customer_id: true, retention_discount_used: true },
    });
    if (!tenant?.stripe_subscription_id) return res.status(400).json({ error: 'No hay suscripción activa.' });

    // Only allow once
    if (tenant.retention_discount_used) {
      return res.status(400).json({ error: 'Ya usaste tu descuento de retención.' });
    }

    // Create a one-time 10% coupon
    const coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: 'once',
      name: 'Descuento retención 10%',
      metadata: { tenant_id: tenantId },
    });

    // Apply to subscription (next invoice only)
    await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      coupon: coupon.id,
    });

    // Mark as used so it can't be used again
    await prisma.tenants.update({
      where: { id: tenantId },
      data: { retention_discount_used: true, updated_at: new Date() },
    });

    console.log(`🎁 [Stripe] Cupón 10% aplicado a tenant ${tenantId} (una sola vez)`);

    return res.json({
      success: true,
      message: '¡Descuento del 10% aplicado a tu próxima factura!',
    });
  } catch (error) {
    console.error('Error aplicando descuento:', error);
    return res.status(500).json({ error: 'Error al aplicar descuento.' });
  }
};

// ─── GET /api/stripe/subscription-status ─────────────────────────────
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        subscription_status: true,
        current_period_end: true,
        stripe_subscription_id: true,
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado.' });

    return res.json({
      plan: tenant.plan,
      subscription_status: tenant.subscription_status,
      current_period_end: tenant.current_period_end,
      has_stripe_subscription: !!tenant.stripe_subscription_id,
    });
  } catch (error) {
    console.error('Error obteniendo estado suscripcion:', error);
    return res.status(500).json({ error: 'Error al obtener estado de suscripcion.' });
  }
};

// ─── POST /api/stripe/billing-portal ─────────────────────────────────
exports.createBillingPortalSession = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe no esta configurado en este servidor.' });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { stripe_customer_id: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado.' });
    if (!tenant.stripe_customer_id) {
      return res.status(400).json({ error: 'No tienes una cuenta de pago asociada. Suscribete a un plan primero.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${FRONTEND_URL}/settings?tab=6`,
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creando billing portal session:', error);
    return res.status(500).json({ error: 'Error al abrir el portal de facturacion.' });
  }
};

// ─── GET /api/stripe/invoices ────────────────────────────────────────
exports.getInvoices = async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe no esta configurado en este servidor.' });
    }

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { stripe_customer_id: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado.' });
    if (!tenant.stripe_customer_id) {
      return res.json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: tenant.stripe_customer_id,
      limit: 20,
    });

    const formatted = invoices.data.map(inv => ({
      id: inv.id,
      date: new Date(inv.created * 1000),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      pdf_url: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
    }));

    return res.json({ invoices: formatted });
  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    return res.status(500).json({ error: 'Error al obtener facturas.' });
  }
};

// ─── POST /api/stripe/webhook (raw body, sin auth) ──────────────────
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        const plan = session.metadata?.plan;
        if (!tenantId || !plan) break;

        // Obtener la suscripcion para datos extra
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        const periodEnd = new Date(subscription.current_period_end * 1000);
        const updatedTenant = await prisma.tenants.update({
          where: { id: tenantId },
          data: {
            plan,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
            current_period_end: periodEnd,
            updated_at: new Date(),
          },
          select: { name: true, email: true },
        });
        console.log(`✅ [Stripe] Tenant ${tenantId} → plan ${plan} (checkout completed)`);

        // Enviar email de confirmación de suscripción
        if (updatedTenant.email) {
          try {
            await sendSubscriptionEmail(updatedTenant.email, updatedTenant.name, plan, periodEnd);
            console.log(`📧 [Stripe] Email de suscripción enviado a ${updatedTenant.email}`);
          } catch (emailErr) {
            console.error(`📧 [Stripe] Error enviando email de suscripción:`, emailErr.message);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const tenantId = subscription.metadata?.tenant_id;
        if (!tenantId) break;

        await prisma.tenants.update({
          where: { id: tenantId },
          data: {
            subscription_status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000),
            updated_at: new Date(),
          },
        });
        console.log(`✅ [Stripe] Tenant ${tenantId} → invoice paid, period renewed`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        // Buscar tenant por subscription_id
        const tenant = await prisma.tenants.findFirst({
          where: { stripe_subscription_id: subscriptionId },
          select: { id: true },
        });
        if (!tenant) break;

        await prisma.tenants.update({
          where: { id: tenant.id },
          data: { subscription_status: 'past_due', updated_at: new Date() },
        });
        console.log(`⚠️ [Stripe] Tenant ${tenant.id} → payment failed, status=past_due`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;

        // Buscar por metadata o por subscription_id
        let tenant;
        if (tenantId) {
          tenant = await prisma.tenants.findUnique({ where: { id: tenantId }, select: { id: true } });
        }
        if (!tenant) {
          tenant = await prisma.tenants.findFirst({
            where: { stripe_subscription_id: subscription.id },
            select: { id: true },
          });
        }
        if (!tenant) break;

        await prisma.tenants.update({
          where: { id: tenant.id },
          data: {
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            current_period_end: null,
            updated_at: new Date(),
          },
        });
        console.log(`🔴 [Stripe] Tenant ${tenant.id} → subscription deleted, plan=free`);
        break;
      }

      default:
        // Eventos no manejados
        break;
    }
  } catch (error) {
    console.error(`Error procesando webhook ${event.type}:`, error);
  }

  // Siempre retornar 200 para que Stripe no reintente
  return res.json({ received: true });
};
