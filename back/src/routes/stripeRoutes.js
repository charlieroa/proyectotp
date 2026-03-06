// src/routes/stripeRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const stripeController = require('../controllers/stripeController');

// Rutas protegidas (requieren JWT)
router.post('/create-checkout-session', requireAuth, stripeController.createCheckoutSession);
router.post('/cancel-subscription', requireAuth, stripeController.cancelSubscription);
router.get('/subscription-status', requireAuth, stripeController.getSubscriptionStatus);

// NOTA: El webhook se registra directamente en index.js con express.raw()

module.exports = router;
