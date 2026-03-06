const express = require('express');
const router = express.Router();
const ficheroController = require('../controllers/ficheroController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/tenant/:tenantId', ficheroController.getQueues);
router.post('/next/:categoryId', ficheroController.getNextStylist);
router.post('/reset/:tenantId', ficheroController.resetQueues);
router.post('/activate/:stylistId', ficheroController.activateStylist);
router.post('/deactivate/:stylistId', ficheroController.deactivateStylist);

module.exports = router;
