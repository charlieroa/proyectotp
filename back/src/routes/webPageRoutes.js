const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/authMiddleware');
const webPageController = require('../controllers/webPageController');

const ensureFn = (fn, name) => {
  if (typeof fn !== 'function') throw new Error(`${name} is not a function`);
  return fn;
};

// GET /api/web-pages/serve/:slug — public page by subdomain slug (no auth)
router.get('/serve/:slug', ensureFn(webPageController.serveBySlug, 'serveBySlug'));

// GET /api/web-pages/public/:tenantId — public page (no auth, no editor)
router.get('/public/:tenantId', ensureFn(webPageController.getPublicPage, 'getPublicPage'));

// GET /api/web-pages/tenant/:tenantId — get page for tenant
router.get('/tenant/:tenantId', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.getByTenant, 'getByTenant'));

// POST /api/web-pages/generate — start generation
router.post('/generate', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.generate, 'generate'));

// GET /api/web-pages/status/:generationId — poll status
router.get('/status/:generationId', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.getStatus, 'getStatus'));

// GET /api/web-pages/check-slug/:slug — check availability
router.get('/check-slug/:slug', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.checkSlug, 'checkSlug'));

// PUT /api/web-pages/slug — assign slug/subdomain
router.put('/slug', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.setSlug, 'setSlug'));

// PUT /api/web-pages/tenant/:tenantId — save edited HTML
router.put('/tenant/:tenantId', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.savePage, 'savePage'));

// DELETE /api/web-pages/tenant/:tenantId — delete page
router.delete('/tenant/:tenantId', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.deletePage, 'deletePage'));

// GET /api/web-pages/usage — Plury credits
router.get('/usage', ensureFn(requireAuth, 'requireAuth'), ensureFn(webPageController.getUsage, 'getUsage'));

module.exports = router;
