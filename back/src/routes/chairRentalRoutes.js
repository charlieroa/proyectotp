'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const prisma = require('../config/prisma');
const c = require('../controllers/chairRentalController');

// Gestión de coworking. Regla:
//  - Super Admin (5): siempre.
//  - Si el tenant tiene chair_rental_manager_user_id: SOLO ese usuario
//    (los demás admins/owners del tenant quedan fuera).
//  - Sin encargado designado: Admin (1) u Owner (2) del tenant.
// Sin este guard, cualquier usuario autenticado del tenant (estilista/cliente)
// podía listar renters, ver ingresos e incluso cobrar/reembolsar.
async function requireManagerRole(req, res, next) {
  try {
    const { id, role_id, tenant_id } = req.user || {};
    if (role_id === 5) return next();
    if (![1, 2].includes(role_id) || !tenant_id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { chair_rental_manager_user_id: true },
    });
    if (tenant?.chair_rental_manager_user_id && tenant.chair_rental_manager_user_id !== id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    return next();
  } catch (e) {
    console.error('[chairRental] requireManagerRole:', e);
    return res.status(500).json({ error: 'Error de autorización' });
  }
}

// Público (renter bloqueado puede usarlo)
router.get('/payment-link/:userId', c.getPublicPaymentLink);

router.use(requireAuth);

// ¿Puede el usuario logueado gestionar el coworking de su tenant?
// (lo usa el front para mostrar/ocultar la pestaña; misma regla que el guard)
router.get('/access', c.getAccess);

// Self-service: estilista renter logueado (auto-escopeado por req.user.id)
router.get('/me', c.getMyRental);
router.post('/me/payment-link', c.getMyPaymentLink);
router.post('/me/setup-link', c.getMySetupLink);

// Owner / admin / super admin
router.use(requireManagerRole);
router.post('/connect', c.connectStripe);
router.get('/status', c.getStatus);
router.put('/settings', c.updateSettings);

router.get('/eligible-staff', c.listEligibleStaff);
router.get('/income-summary', c.getIncomeSummary);
router.get('/income-report', c.getIncomeReport);
router.get('/pending-refunds', c.getPendingRefunds);
router.get('/renters', c.listRenters);
router.post('/renters', c.addRenter);
router.get('/renters/:id', c.getRenter);
router.put('/renters/:id', c.updateRenter);
router.delete('/renters/:id', c.removeRenter);
router.post('/renters/:id/start-subscription', c.startSubscription);
router.post('/renters/:id/setup-link', c.regenerateSetupLink);
router.post('/renters/:id/setup-intent', c.createRenterSetupIntent);
router.post('/renters/:id/confirm-card', c.confirmRenterCard);
router.post('/renters/:id/payment-link', c.getPaymentLink);
router.post('/renters/:id/charge', c.chargeRenter);
router.post('/renters/:id/refund', c.refundRenterCharge);
router.get('/renters/:id/calendar', c.getRenterCalendar);
router.post('/renters/:id/toggle-block-day', c.toggleBlockDay);
router.post('/renters/:id/mark-day-paid', c.markDayPaid);
router.post('/renters/:id/unmark-day-paid', c.unmarkDayPaid);
router.post('/renters/:id/readjust-policy', c.setReadjustPolicy);
router.post('/renters/:id/charge-day', c.chargeRenterDay);
router.post('/renters/:id/pause', c.pauseRenter);
router.post('/renters/:id/resume', c.resumeRenter);
router.post('/renters/:id/invite', c.inviteRenter);

module.exports = router;
