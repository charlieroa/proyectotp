// src/routes/bulkImportRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/permissionsMiddleware');
const bulkImportController = require('../controllers/bulkImportController');

// Memory storage (no need to write to disk)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV.'));
        }
    },
});

// Auth + Admin/Owner only
router.use(authMiddleware);
router.use(authorize([1, 2]));

router.post('/clients', upload.single('file'), bulkImportController.importClients);
router.post('/stylists', upload.single('file'), bulkImportController.importStylists);
router.post('/products', upload.single('file'), bulkImportController.importProducts);
router.post('/services', upload.single('file'), bulkImportController.importServices);
router.post('/smart', upload.single('file'), bulkImportController.smartImport);

module.exports = router;
