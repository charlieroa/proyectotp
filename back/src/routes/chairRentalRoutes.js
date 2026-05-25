'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const c = require('../controllers/chairRentalController');

// Público (renter bloqueado puede usarlo)
router.get('/payment-link/:userId', c.getPublicPaymentLink);

// Owner / admin
router.use(requireAuth);
router.post('/connect', c.connectStripe);
router.get('/status', c.getStatus);
router.put('/settings', c.updateSettings);

// Self-service: estilista renter logueado
router.get('/me', c.getMyRental);
router.post('/me/payment-link', c.getMyPaymentLink);
router.post('/me/setup-link', c.getMySetupLink);

router.get('/eligible-staff', c.listEligibleStaff);
router.get('/renters', c.listRenters);
router.post('/renters', c.addRenter);
router.get('/renters/:id', c.getRenter);
router.put('/renters/:id', c.updateRenter);
router.delete('/renters/:id', c.removeRenter);
router.post('/renters/:id/start-subscription', c.startSubscription);
router.post('/renters/:id/setup-link', c.regenerateSetupLink);
router.post('/renters/:id/payment-link', c.getPaymentLink);
router.post('/renters/:id/charge', c.chargeRenter);
router.post('/renters/:id/invite', c.inviteRenter);

module.exports = router;
