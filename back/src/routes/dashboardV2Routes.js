// src/routes/dashboardV2Routes.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const dashboardV2Controller = require('../controllers/dashboardV2Controller');

router.use(authMiddleware);

router.get('/stylists-day', dashboardV2Controller.getStylistsDay);
router.get('/branches-day', dashboardV2Controller.getBranchesDay);
router.get('/branch-tickets', dashboardV2Controller.getBranchTickets);

module.exports = router;
