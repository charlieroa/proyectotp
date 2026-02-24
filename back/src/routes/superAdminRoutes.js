/**
 * Super Admin Routes
 * All routes require JWT auth + role_id = 5.
 */
'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const ctrl = require('../controllers/superAdminController');

// All routes behind auth + superadmin check
router.use(authMiddleware, requireSuperAdmin);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Tenants
router.get('/tenants', ctrl.listTenants);
router.put('/tenants/:id', ctrl.updateTenant);
router.delete('/tenants/:id', ctrl.deleteTenant);

// Global settings
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);

// Token usage
router.get('/token-usage', ctrl.getTokenUsage);

module.exports = router;
