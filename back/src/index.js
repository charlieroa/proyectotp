require('dotenv').config();

// Módulos principales
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const http = require('http');

// Sockets
const { initSocket } = require('./socket');

// Configuración de la base de datos
const db = require('./config/db');

// Importación de todas las rutas
const tenantRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const productRoutes = require('./routes/productRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const stylistRoutes = require('./routes/stylistRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const cashRoutes = require('./routes/cashRoutes');
const productCategoryRoutes = require('./routes/productCategoryRoutes');
const staffPurchaseRoutes = require('./routes/staffPurchaseRoutes');
const staffLoanRoutes = require('./routes/staffLoanRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes'); // ✅ NUEVO: Importar rutas de WhatsApp
const aiChatRoutes = require('./routes/aiChatRoutes'); // ✅ Chat con IA (OpenAI)
const aiAdminChatRoutes = require('./routes/aiAdminChatRoutes'); // ✅ Chat IA Admin (18 funciones)
const superAdminRoutes = require('./routes/superAdminRoutes'); // ✅ Super Admin
const bulkImportRoutes = require('./routes/bulkImportRoutes'); // ✅ Bulk import Excel
const campaignRoutes = require('./routes/campaignRoutes'); // ✅ Campañas CRM
const whatsappConversationRoutes = require('./routes/whatsappConversationRoutes'); // ✅ WhatsApp Handoff
const ficheroRoutes = require('./routes/ficheroRoutes'); // ✅ Fichero digital (cola de turnos)
const stripeRoutes = require('./routes/stripeRoutes'); // ✅ Stripe Checkout
const { handleWebhook } = require('./controllers/stripeController'); // ✅ Stripe Webhook
const { uploadTenantLogo, uploadTenantBrochure, deleteTenantBrochure } = require('./controllers/tenantController');

// Inicialización de la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

/* =======================================
   🛡️ CONFIGURACIÓN DE CORS
======================================= */
const allowedOrigins = [
  'http://localhost:3001',
  'https://app.tupelukeria.com',
  'https://tpia.tupelukeria.com',
  'https://www.tupelukeria.com',
  'https://tupelukeria.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Permitir orígenes específicos
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // En desarrollo: permitir cualquier localhost (para Flutter Web, etc.)
    if (process.env.NODE_ENV !== 'production') {
      const localhostRegex = /^https?:\/\/localhost(:\d+)?$/;
      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }
    }
    
    callback(new Error('No permitido por la política de CORS.'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

/* =======================================
   💳 STRIPE WEBHOOK (raw body, ANTES de express.json)
======================================= */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);

/* =======================================
   🚀 MIDDLEWARES ESENCIALES
======================================= */
app.use(express.json());

/* =======================================
   🗂️ SERVICIO DE ARCHIVOS ESTÁTICOS
======================================= */
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const LOGOS_DIR = path.join(UPLOADS_DIR, 'logos');
const BROCHURES_DIR = path.join(UPLOADS_DIR, 'brochures');

fs.mkdirSync(LOGOS_DIR, { recursive: true });
fs.mkdirSync(BROCHURES_DIR, { recursive: true });
app.use(express.static(PUBLIC_DIR));

/* =======================================
   ⬆️ CONFIGURACIÓN DE SUBIDA DE ARCHIVOS (MULTER)
======================================= */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `logo-${req.params.tenantId}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

const brochureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BROCHURES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `brochure-${req.params.tenantId}-${Date.now()}${ext}`);
  },
});
const brochureUpload = multer({ storage: brochureStorage, limits: { fileSize: 5 * 1024 * 1024 } });

/* =======================================
   📡 RUTAS DE LA APLICACIÓN
======================================= */
app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'landing.html')));
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/stylists', stylistRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/product-categories', productCategoryRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/staff-purchases', staffPurchaseRoutes);
app.use('/api/staff-loans', staffLoanRoutes);
app.use('/api/whatsapp', whatsappRoutes); // ✅ NUEVO: Habilitar endpoints de WhatsApp
app.use('/api/whatsapp-booking', require('./routes/Whatsappbookingroutes')); // ✅ Endpoints booking WhatsApp
app.use('/api/ai-chat', aiChatRoutes); // ✅ Chat con IA (OpenAI + Orquestador)
app.use('/api/ai-admin-chat', aiAdminChatRoutes); // ✅ Chat IA Admin (18 funciones)
app.use('/api/super-admin', superAdminRoutes); // ✅ Super Admin panel
app.use('/api/bulk-import', bulkImportRoutes); // ✅ Bulk import Excel
app.use('/api/campaigns', campaignRoutes); // ✅ Campañas CRM
app.use('/api/whatsapp-conversations', whatsappConversationRoutes); // ✅ WhatsApp Handoff
app.use('/api/fichero', ficheroRoutes); // ✅ Fichero digital (cola de turnos)
app.use('/api/stripe', stripeRoutes); // ✅ Stripe Checkout (rutas protegidas)
app.post('/api/tenants/:tenantId/logo', upload.single('logo'), uploadTenantLogo);
app.post('/api/tenants/:tenantId/brochure', brochureUpload.single('brochure'), uploadTenantBrochure);
app.delete('/api/tenants/:tenantId/brochure', deleteTenantBrochure);

/* =======================================
   ❤️ HEALTHCHECK (VERIFICACIÓN DE ESTADO)
======================================= */
app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await db.healthCheck();
    res.status(200).json({ status: 'ok', app: 'up', db: 'up' });
  } catch (e) {
    res.status(503).json({ status: 'error', app: 'up', db: 'down', error: e.message });
  }
});

/* =======================================
   🧯 MANEJO DE ERRORES
======================================= */
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} - ${err.stack}`);

  if (err.message === 'No permitido por la política de CORS.') {
    return res.status(403).json({ error: 'Acceso denegado por CORS.' });
  }

  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' });
});

/* =======================================
   ▶️ INICIO DEL SERVIDOR (HTTP + WebSockets)
======================================= */
const server = http.createServer(app);

// Inicializa Socket.IO usando los mismos orígenes permitidos
const io = initSocket(server, allowedOrigins);

// Pass IO to campaign controller for real-time updates
const { setIO: setCampaignIO } = require('./controllers/campaignController');
setCampaignIO(io);

const { startReminderScheduler } = require('./services/appointmentReminder');
startReminderScheduler();

// Preload handoff cache from DB
const prismaClient = require('./config/prisma');
const { setHandoff: setHandoffCache } = require('./services/handoffCache');
prismaClient.whatsapp_conversations.findMany({ where: { status: 'handoff' }, select: { tenant_id: true, chat_id: true } })
  .then(rows => {
    rows.forEach(r => setHandoffCache(r.tenant_id, r.chat_id));
    if (rows.length > 0) console.log(`🤝 [HANDOFF] Precargadas ${rows.length} conversaciones en handoff`);
  })
  .catch(err => console.error('❌ [HANDOFF] Error precargando cache:', err.message));

// Preload Stripe prices
const { ensureStripePrices } = require('./config/stripePrices');
ensureStripePrices().catch(err => console.error('❌ [Stripe] Error cargando precios:', err.message));

server.listen(PORT, () => {
  console.log(`🚀 API + WebSockets escuchando en el puerto ${PORT}`);
});