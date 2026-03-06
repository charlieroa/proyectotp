// src/routes/whatsappConversationRoutes.js
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const ctrl = require('../controllers/whatsappConversationController');

router.use(requireAuth);

// Role check: admin (1), cajero (2), super admin (5), recepcionista (6)
router.use((req, res, next) => {
  const roleId = req.user?.role_id;
  if (roleId !== 1 && roleId !== 2 && roleId !== 5 && roleId !== 6) {
    return res.status(403).json({ error: 'No tienes permisos para acceder a conversaciones WhatsApp' });
  }
  next();
});

router.get('/tenant/:tenantId', ctrl.listConversations);
router.get('/active-count', ctrl.getActiveCount);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/reply', ctrl.reply);
router.post('/:id/close', ctrl.closeConversation);
router.post('/:id/take', ctrl.takeConversation);
router.post('/:id/block', ctrl.blockConversation);
router.post('/:id/unblock', ctrl.unblockConversation);

module.exports = router;
