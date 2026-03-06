// src/routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');
const campaignController = require('../controllers/campaignController');

// All routes require auth + enterprise plan
router.use(requireAuth);
router.use(requirePlan('enterprise'));

router.get('/inactive-clients', campaignController.previewInactiveClients);
router.get('/', campaignController.listCampaigns);
router.get('/:id', campaignController.getCampaign);
router.post('/', campaignController.createCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);
router.post('/:id/test', campaignController.sendTestEmail);
router.post('/:id/send', campaignController.startSending);
router.post('/:id/pause', campaignController.pauseSending);
router.get('/:id/recipients', campaignController.getRecipients);

module.exports = router;
