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

router.get('/renters', c.listRenters);
router.post('/renters', c.addRenter);
router.put('/renters/:id', c.updateRenter);
router.delete('/renters/:id', c.removeRenter);
router.post('/renters/:id/start-subscription', c.startSubscription);
router.post('/renters/:id/payment-link', c.getPaymentLink);

module.exports = router;
