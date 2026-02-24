// Contenido completo para: src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAuth = require('../middleware/authMiddleware');

// Ruta para iniciar sesión (ya la teníamos)
router.post('/login', authController.login);

// NUEVA RUTA para que un dueño de peluquería se registre
router.post('/register-tenant', authController.registerTenantAndAdmin);

// Cambiar de negocio activo (multi-negocio)
router.post('/switch-tenant', requireAuth, authController.switchTenant);

module.exports = router;