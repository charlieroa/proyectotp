// src/middleware/planMiddleware.js
const prisma = require('../config/prisma');

const PLAN_ORDER = ['free', 'pro', 'business', 'enterprise'];

// Cache en memoria para planes de tenants (evita consultas repetidas)
const planCache = new Map(); // key: tenantId → { plan, cachedAt }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Compara si el plan actual es al menos el plan requerido.
 * @param {string} currentPlan
 * @param {string} requiredPlan
 * @returns {boolean}
 */
function isPlanAtLeast(currentPlan, requiredPlan) {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const requiredIdx = PLAN_ORDER.indexOf(requiredPlan);
  if (currentIdx === -1 || requiredIdx === -1) return false;
  return currentIdx >= requiredIdx;
}

/**
 * Obtiene el plan de un tenant (con cache).
 * @param {string} tenantId
 * @returns {Promise<string>}
 */
async function getTenantPlan(tenantId) {
  const cached = planCache.get(tenantId);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL)) {
    return cached.plan;
  }

  const tenant = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });

  const plan = tenant?.plan || 'free';
  planCache.set(tenantId, { plan, cachedAt: Date.now() });
  return plan;
}

/**
 * Middleware factory: restringe acceso según el plan mínimo requerido.
 * Uso: router.use(requirePlan('pro'))
 * @param {string} minPlan - Plan mínimo requerido ('free' | 'pro' | 'business' | 'enterprise')
 */
function requirePlan(minPlan) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({ error: 'No se encontró tenant del usuario.' });
      }

      const currentPlan = await getTenantPlan(tenantId);

      if (!isPlanAtLeast(currentPlan, minPlan)) {
        const planNames = { free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };
        return res.status(403).json({
          error: `Esta función requiere el plan ${planNames[minPlan] || minPlan}. Tu plan actual es ${planNames[currentPlan] || currentPlan}.`,
          requiredPlan: minPlan,
          currentPlan,
        });
      }

      next();
    } catch (err) {
      console.error('[planMiddleware] Error:', err.message);
      return res.status(500).json({ error: 'Error verificando plan del tenant.' });
    }
  };
}

module.exports = { requirePlan, isPlanAtLeast, getTenantPlan, PLAN_ORDER };
