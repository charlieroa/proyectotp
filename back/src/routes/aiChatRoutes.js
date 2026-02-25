// src/routes/aiChatRoutes.js
const express = require('express');
const router = express.Router();

const aiChatController = require('../controllers/aiChatController');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePlan } = require('../middleware/planMiddleware');

// Endpoint principal del chat (requiere autenticación para agendar)
// El middleware es opcional para permitir consultas sin login
// Plan pro+ requerido para acceder al asistente IA
router.post('/', (req, res, next) => {
    // Intentar autenticar, pero no fallar si no hay token
    const authHeader = req.header('Authorization');
    if (authHeader) {
        return authMiddleware(req, res, next);
    }
    // Sin token, continuar sin usuario autenticado
    next();
}, (req, res, next) => {
    // Solo verificar plan si el usuario está autenticado
    if (req.user?.tenant_id) {
        return requirePlan('pro')(req, res, next);
    }
    next();
}, aiChatController.chat);

// Health check (público)
router.get('/health', aiChatController.health);

module.exports = router;
