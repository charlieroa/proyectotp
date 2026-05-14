'use strict';

const prisma = require('../config/prisma');

const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // Every 6 hours

async function checkExpiredSubscriptions() {
  console.log('💳 [SUB] Checking expired subscriptions...');

  try {
    // Find tenants with paid plans whose period has ended and Stripe hasn't updated
    const now = new Date();
    const expired = await prisma.tenants.findMany({
      where: {
        plan: { not: 'free' },
        current_period_end: { lt: now },
        subscription_status: { notIn: ['active'] },
      },
      select: { id: true, name: true, plan: true, subscription_status: true, current_period_end: true },
    });

    if (expired.length === 0) {
      console.log('💳 [SUB] No expired subscriptions found.');
      return;
    }

    for (const tenant of expired) {
      console.log(`💳 [SUB] Downgrading tenant "${tenant.name}" (${tenant.id}): plan=${tenant.plan}, status=${tenant.subscription_status}, expired=${tenant.current_period_end}`);

      await prisma.tenants.update({
        where: { id: tenant.id },
        data: {
          plan: 'free',
          subscription_status: 'expired',
          stripe_subscription_id: null,
          current_period_end: null,
          updated_at: new Date(),
        },
      });
    }

    console.log(`💳 [SUB] Downgraded ${expired.length} expired subscription(s) to free.`);
  } catch (error) {
    console.error('❌ [SUB] Error checking expired subscriptions:', error.message);
  }
}

function startSubscriptionChecker() {
  // Run once at startup (after 30s delay to let everything initialize)
  setTimeout(checkExpiredSubscriptions, 30 * 1000);
  // Then run every 6 hours
  setInterval(checkExpiredSubscriptions, CHECK_INTERVAL);
  console.log('💳 [SUB] Subscription checker started (every 6h)');
}

module.exports = { startSubscriptionChecker };
