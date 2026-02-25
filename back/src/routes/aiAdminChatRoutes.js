const express = require('express');
const router = express.Router();
const aiAdminChatController = require('../controllers/aiAdminChatController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionsMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');

// Auth obligatorio + solo admin (1) y recepcionista (2). Super admin (5) pasa por lógica del authorize.
router.use(authMiddleware);
router.use(authorize([1, 2]));
router.use(requirePlan('business'));

router.post('/', aiAdminChatController.chat);
router.get('/health', aiAdminChatController.health);

module.exports = router;
