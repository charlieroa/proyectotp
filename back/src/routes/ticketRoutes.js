// src/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const ticketController = require('../controllers/ticketController');

router.use(authMiddleware);

router.post('/open',          ticketController.openTicket);
router.get('/active',         ticketController.listActive);
router.get('/:id',            ticketController.getTicket);
router.post('/:id/items',     ticketController.addItem);
router.patch('/:id/items/:itemId',  ticketController.patchItem);
router.delete('/:id/items/:itemId', ticketController.deleteItem);
router.post('/:id/close',     ticketController.closeTicket);
router.post('/:id/cancel',    ticketController.cancelTicket);

module.exports = router;
