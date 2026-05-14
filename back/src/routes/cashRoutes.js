// =============================================
// File: src/routes/cashRoutes.js
// =============================================
const express = require('express');
const router = express.Router();

const cashController = require('../controllers/cashController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionsMiddleware');

// Aplicamos autenticación a todas las rutas de este archivo
router.use(authMiddleware);

// --- Ruta multi-sucursal (ANTES de las rutas con params) ---
router.get('/all-branches', authorize([]), cashController.getAllBranchesCash);

// --- Rutas para GESTIÓN DE SESIONES de Caja ---
// Roles: 2=Owner, 6=Recepcionista (cajera de sede)
router.post('/open', authorize([2, 6]), cashController.openCashSession);
router.post('/close', authorize([2, 6]), cashController.closeCashSession);
router.get('/current', authorize([2, 6]), cashController.getCurrentSession);
router.get('/history', authorize([]), cashController.getSessionHistory);

// --- Ruta para DETALLE DE SESIÓN ---
router.get('/session/:id', authorize([2, 6]), cashController.getSessionDetail);

// --- Rutas para GESTIÓN DE MOVIMIENTOS de Caja (Anticipos, Facturas, etc.) ---
router.post('/movements', authorize([2, 6]), cashController.createCashMovement);
router.get('/movements', authorize([2, 6]), cashController.getCashMovements);
router.put('/movements/:id', authorize([2]), cashController.updateCashMovement);
router.delete('/movements/:id', authorize([2]), cashController.deleteCashMovement);

module.exports = router;