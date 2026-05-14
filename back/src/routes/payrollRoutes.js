// src/routes/payrollRoutes.js (Versión Corregida Final)

const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// 🔄 CORRECCIÓN: Importamos el middleware directamente
const authMiddleware = require('../middleware/authMiddleware'); 

// 🔄 CORRECCIÓN: Usamos la variable importada
router.use(authMiddleware);

// --- RUTA PRINCIPAL ---
// GET /api/payrolls/detailed-preview -> Para la vista previa que usa el frontend.
router.get(
    '/detailed-preview',
    payrollController.getPayrollDetailedPreview
);

// GET /api/payrolls/export-excel -> Descargar nómina en formato Excel.
router.get(
    '/export-excel',
    payrollController.exportPayrollExcel
);

// --- OTRAS RUTAS ---

// POST /api/payrolls -> Generar y guardar un pago de nómina para un estilista.
router.post(
    '/', 
    payrollController.createPayroll
);

// DELETE /api/payrolls/period -> Eliminar todas las nóminas de un periodo (revertir deducciones).
router.delete(
    '/period',
    payrollController.deletePayrollPeriod
);

// DELETE /api/payrolls/:id -> Eliminar una nómina individual (revertir deducciones).
router.delete(
    '/:id',
    payrollController.deletePayroll
);

// GET /api/payrolls -> Obtener todos los registros de nómina ya guardados para el historial.
router.get(
    '/',
    payrollController.getPayrollsByTenant
);

module.exports = router;