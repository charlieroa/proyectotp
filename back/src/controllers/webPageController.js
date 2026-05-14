const prisma = require('../config/prisma');

const PLURY_BASE = 'https://plury.co/api/v1';
const PLURY_API_KEY = process.env.PLURY_API_KEY;
const GENERATION_TIMEOUT_MS = 15 * 60 * 1000;

// Strip Plury editor overlay divs and contenteditable artifacts from HTML
function cleanHtml(html) {
  if (!html) return html;
  // Remove overlay divs injected by Plury editor (z-index 99998, 99999, 100000)
  html = html.replace(/<div\s+style="[^"]*z-index:\s*(?:99998|99999|100000)[^"]*"[^>]*>.*?<\/div>/gs, '');
  // Remove contenteditable="false" left on elements
  html = html.replace(/\s+contenteditable="false"/g, '');
  return html;
}

// Strip the Plury editor script entirely (for public serving)
function stripEditorScript(html) {
  if (!html) return html;
  html = cleanHtml(html);
  // Remove the second <script> block that contains editMode
  html = html.replace(/<script>\s*\(function\(\)\s*\{\s*var editMode[\s\S]*?<\/script>/g, '');
  return html;
}

async function pluryFetch(path, options = {}) {
  const res = await fetch(`${PLURY_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': PLURY_API_KEY,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || `Plury API error ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// GET /api/web-pages/tenant/:tenantId — get page for tenant
exports.getByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const page = await prisma.$queryRaw`
      SELECT * FROM web_pages WHERE tenant_id = ${tenantId}::uuid LIMIT 1
    `;
    const result = page[0] || null;
    // Clean overlay artifacts from stored HTML before sending to frontend
    if (result && result.html) {
      result.html = cleanHtml(result.html);
    }
    return res.json(result);
  } catch (err) {
    console.error('Error getting web page:', err);
    return res.status(500).json({ error: 'Error al obtener la página web.' });
  }
};

// POST /api/web-pages/generate — start generation
exports.generate = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const { prompt, slug: rawSlug } = req.body;

    if (!prompt || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'El prompt debe tener al menos 3 caracteres.' });
    }

    // Validate and reserve slug if provided
    let slug = null;
    if (rawSlug) {
      slug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
      if (slug.length < 3 || slug.length > 50) {
        return res.status(400).json({ error: 'El subdominio debe tener entre 3 y 50 caracteres.' });
      }
      const reserved = ['app', 'api', 'www', 'admin', 'mail', 'ftp', 'test', 'staging', 'dev'];
      if (reserved.includes(slug)) {
        return res.status(400).json({ error: 'Ese subdominio está reservado.' });
      }
      const existing = await prisma.$queryRaw`
        SELECT tenant_id FROM web_pages WHERE slug = ${slug} AND tenant_id != ${tenant_id}::uuid LIMIT 1
      `;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Ese subdominio ya está en uso. Elige otro.' });
      }
    }

    // Get tenant info to enrich the prompt
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { name: true, address: true, phone: true, city: true, business_type: true, working_hours: true },
    });

    // Get WhatsApp bot number from tenant_numbers (the connected appointment bot)
    const botNumber = await prisma.tenant_numbers.findFirst({
      where: { tenant_id, provider: { not: 'disconnected' } },
      select: { phone_number_id: true, display_phone_number: true },
    });

    // Prefer bot number (appointment bot), fallback to tenant phone
    const waPhone = botNumber?.phone_number_id || tenant?.phone?.replace(/\D/g, '');
    const waLink = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent('Hola, quiero agendar una cita')}`
      : '#';

    // Build schedule text from working_hours JSON
    const dayNames = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
    let scheduleText = '';
    if (tenant?.working_hours && typeof tenant.working_hours === 'object') {
      const wh = tenant.working_hours;
      const lines = Object.entries(dayNames).map(([key, name]) => {
        const val = wh[key];
        if (!val || val === 'cerrado') return `${name}: Cerrado`;
        return `${name}: ${val}`;
      });
      scheduleText = lines.join('\n');
    }

    // Build full address for map
    const fullAddress = [tenant?.address, tenant?.city].filter(Boolean).join(', ');

    const enrichedPrompt = `GENERA UNA LANDING PAGE HTML ESTÁTICA DE UNA SOLA PÁGINA (un solo archivo index.html con todo el CSS y JS inline).
NO uses React, NO uses frameworks, NO generes múltiples archivos. Solo HTML puro con CSS y JavaScript embebido.

Página para: "${tenant?.name || 'Mi Negocio'}".
Tipo de negocio: ${tenant?.business_type || 'barberia'} - usa un estilo visual refinado y elegante acorde al tipo de negocio.
${fullAddress ? `Dirección completa: ${fullAddress}.` : ''}
${tenant?.phone ? `Teléfono: ${tenant.phone}.` : ''}
${scheduleText ? `HORARIOS REALES del negocio (usa EXACTAMENTE estos horarios en la sección de horarios, NO inventes horarios):
${scheduleText}` : ''}
${fullAddress ? `MAPA DE UBICACIÓN: Incluye un iframe de Google Maps embebido buscando la dirección "${fullAddress}" usando la URL: https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed` : ''}
IMPORTANTE - Enlaces de acción:
- Todos los botones de "Reservar Cita", "Agendar" o similares deben usar este enlace exacto: ${waLink}
- Todos los botones e iconos de WhatsApp deben usar este enlace exacto: ${waLink}
- El botón flotante de WhatsApp también debe usar: ${waLink}
- Todos estos enlaces deben abrirse en una nueva pestaña (target="_blank").
${botNumber ? `- El negocio tiene un asistente virtual por WhatsApp que gestiona citas automaticamente. Menciona en la pagina que los clientes pueden agendar citas directamente por WhatsApp con el asistente virtual 24/7.` : ''}
Instrucciones adicionales del usuario: ${prompt.trim()}`;

    // Call Plury API
    console.log('[WebPage] Generating with agent=web, prompt length:', enrichedPrompt.length);
    const generation = await pluryFetch('/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: enrichedPrompt, agent: 'web' }),
    });
    console.log('[WebPage] Generation started:', generation.id);

    // Upsert web_pages record
    await prisma.$executeRaw`
      INSERT INTO web_pages (tenant_id, plury_generation_id, prompt, slug, status, created_at, updated_at)
      VALUES (${tenant_id}::uuid, ${generation.id}, ${prompt.trim()}, ${slug}, 'processing', NOW(), NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        plury_generation_id = ${generation.id},
        prompt = ${prompt.trim()},
        slug = COALESCE(${slug}, web_pages.slug),
        status = 'processing',
        published_url = NULL,
        html = NULL,
        title = NULL,
        plury_deliverable_id = NULL,
        credits_used = 0,
        created_at = NOW(),
        updated_at = NOW()
    `;

    return res.status(202).json({
      id: generation.id,
      status: 'processing',
      message: 'Generación iniciada. Consulta el estado periódicamente.',
    });
  } catch (err) {
    console.error('Error generating web page:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error al generar la página.' });
  }
};

// GET /api/web-pages/status/:generationId — poll generation status
exports.getStatus = async (req, res) => {
  try {
    const { generationId } = req.params;
    const { tenant_id } = req.user;

    // Check if this generation has been stuck too long.
    const pageRows = await prisma.$queryRaw`
      SELECT created_at FROM web_pages
      WHERE tenant_id = ${tenant_id}::uuid AND plury_generation_id = ${generationId} AND status = 'processing'
      LIMIT 1
    `;
    if (pageRows[0]) {
      const ageMs = Date.now() - new Date(pageRows[0].created_at).getTime();
      if (ageMs > GENERATION_TIMEOUT_MS) {
        await prisma.$executeRaw`
          UPDATE web_pages SET status = 'failed', updated_at = NOW()
          WHERE tenant_id = ${tenant_id}::uuid AND status = 'processing'
        `;
        console.log('[WebPage] Generation timed out after', Math.round(ageMs / 1000), 'seconds');
        return res.json({ status: 'failed', message: 'La generación tardó demasiado. Intenta de nuevo.' });
      }
    }

    let result;
    try {
      result = await pluryFetch(`/generations/${generationId}`);
    } catch (pluryErr) {
      // If Plury says generation not found or returns 502/404, mark as failed
      const isFatal = /not found/i.test(pluryErr.message) || pluryErr.status === 404 || pluryErr.status === 502;
      if (isFatal) {
        await prisma.$executeRaw`
          UPDATE web_pages SET status = 'failed', updated_at = NOW()
          WHERE tenant_id = ${tenant_id}::uuid AND plury_generation_id = ${generationId} AND status = 'processing'
        `;
        console.log('[WebPage] Plury generation failed/not found, marked as failed:', pluryErr.message);
        return res.json({ status: 'failed', message: 'La generación falló en el servidor. Intenta de nuevo.' });
      }
      // Transient error — let frontend retry
      throw pluryErr;
    }

    if (result.status === 'completed' && result.results && result.results.length > 0) {
      const deliverable = result.results[0];

      console.log('[WebPage] Plury deliverable keys:', Object.keys(deliverable));
      console.log('[WebPage] published_url:', deliverable.published_url);
      console.log('[WebPage] html type:', typeof deliverable.html, 'starts with:', String(deliverable.html || '').substring(0, 50));

      // Handle case where html is a JSON array of files instead of raw HTML
      let htmlContent = deliverable.html || null;
      if (htmlContent && typeof htmlContent === 'string' && htmlContent.trim().startsWith('[')) {
        try {
          const files = JSON.parse(htmlContent);
          // Look for index.html or main HTML file
          const htmlFile = files.find(f => f.path === 'index.html' || f.path === 'src/index.html' || (f.path && f.path.endsWith('.html')));
          if (htmlFile && htmlFile.content) {
            htmlContent = htmlFile.content;
          }
        } catch { /* not JSON, use as-is */ }
      }

      // Update our record with the result
      await prisma.$executeRaw`
        UPDATE web_pages SET
          status = 'completed',
          title = ${deliverable.title || 'Mi Página Web'},
          published_url = ${deliverable.published_url || null},
          html = ${htmlContent},
          plury_deliverable_id = ${deliverable.id || null},
          credits_used = ${result.credits_used || 0},
          updated_at = NOW()
        WHERE tenant_id = ${tenant_id}::uuid
      `;

      return res.json({
        status: 'completed',
        title: deliverable.title,
        published_url: deliverable.published_url,
        credits_used: result.credits_used,
      });
    }

    if (result.status === 'failed' || result.status === 'error') {
      await prisma.$executeRaw`
        UPDATE web_pages SET status = 'failed', updated_at = NOW()
        WHERE tenant_id = ${tenant_id}::uuid AND plury_generation_id = ${generationId}
      `;
      return res.json({ status: 'failed', message: 'La generación falló. Intenta de nuevo.' });
    }

    return res.json({
      status: result.status || 'processing',
      message: 'Aún se está generando la página...',
    });
  } catch (err) {
    console.error('Error polling generation status:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error al consultar el estado.' });
  }
};

// PUT /api/web-pages/tenant/:tenantId — save edited HTML
exports.savePage = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML es requerido.' });
    }

    const cleaned = cleanHtml(html);

    await prisma.$executeRaw`
      UPDATE web_pages SET
        html = ${cleaned},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
    `;

    return res.json({ message: 'Página guardada correctamente.' });
  } catch (err) {
    console.error('Error saving web page:', err);
    return res.status(500).json({ error: 'Error al guardar la página.' });
  }
};

// GET /api/web-pages/public/:tenantId — serve public page (no editor, links work)
exports.getPublicPage = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const page = await prisma.$queryRaw`
      SELECT html, title FROM web_pages WHERE tenant_id = ${tenantId}::uuid AND status = 'completed' LIMIT 1
    `;

    if (!page[0] || !page[0].html) {
      return res.status(404).send('<h1>Página no encontrada</h1>');
    }

    const publicHtml = stripEditorScript(page[0].html);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(publicHtml);
  } catch (err) {
    console.error('Error serving public page:', err);
    return res.status(500).send('<h1>Error interno</h1>');
  }
};

// GET /api/web-pages/serve/:slug — serve public page by subdomain/slug
exports.serveBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await prisma.$queryRaw`
      SELECT html, title FROM web_pages
      WHERE slug = ${slug.toLowerCase()} AND status = 'completed'
      LIMIT 1
    `;

    if (!page[0] || !page[0].html) {
      return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Página no encontrada</title>
        <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa}
        .c{text-align:center}h1{font-size:3rem;color:#6c757d}p{color:#adb5bd}</style></head>
        <body><div class="c"><h1>404</h1><p>Esta página aún no existe.</p></div></body></html>`);
    }

    const publicHtml = stripEditorScript(page[0].html);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(publicHtml);
  } catch (err) {
    console.error('Error serving page by slug:', err);
    return res.status(500).send('<h1>Error interno</h1>');
  }
};

// PUT /api/web-pages/slug — assign slug to tenant's page
exports.setSlug = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    let { slug } = req.body;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'El subdominio es requerido.' });
    }

    // Sanitize: lowercase, only alphanumeric and hyphens, no leading/trailing hyphens
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

    if (slug.length < 3 || slug.length > 50) {
      return res.status(400).json({ error: 'El subdominio debe tener entre 3 y 50 caracteres.' });
    }

    const reserved = ['app', 'api', 'www', 'admin', 'mail', 'ftp', 'test', 'staging', 'dev'];
    if (reserved.includes(slug)) {
      return res.status(400).json({ error: 'Ese subdominio está reservado.' });
    }

    // Check uniqueness (excluding own tenant)
    const existing = await prisma.$queryRaw`
      SELECT tenant_id FROM web_pages WHERE slug = ${slug} AND tenant_id != ${tenant_id}::uuid LIMIT 1
    `;
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ese subdominio ya está en uso.' });
    }

    await prisma.$executeRaw`
      UPDATE web_pages SET slug = ${slug}, updated_at = NOW()
      WHERE tenant_id = ${tenant_id}::uuid
    `;

    return res.json({ slug, url: `https://${slug}.tupelukeria.com` });
  } catch (err) {
    console.error('Error setting slug:', err);
    return res.status(500).json({ error: 'Error al asignar subdominio.' });
  }
};

// GET /api/web-pages/check-slug/:slug — check if slug is available
exports.checkSlug = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    let { slug } = req.params;

    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');

    if (slug.length < 3 || slug.length > 50) {
      return res.json({ available: false, reason: 'El subdominio debe tener entre 3 y 50 caracteres.' });
    }

    const reserved = ['app', 'api', 'www', 'admin', 'mail', 'ftp', 'test', 'staging', 'dev'];
    if (reserved.includes(slug)) {
      return res.json({ available: false, reason: 'Ese subdominio está reservado.' });
    }

    const existing = await prisma.$queryRaw`
      SELECT tenant_id FROM web_pages WHERE slug = ${slug} AND tenant_id != ${tenant_id}::uuid LIMIT 1
    `;

    return res.json({ available: existing.length === 0, reason: existing.length > 0 ? 'Ese subdominio ya está en uso.' : null });
  } catch (err) {
    console.error('Error checking slug:', err);
    return res.status(500).json({ available: false, reason: 'Error al verificar disponibilidad.' });
  }
};

// DELETE /api/web-pages/tenant/:tenantId — delete page record
exports.deletePage = async (req, res) => {
  try {
    const { tenantId } = req.params;
    await prisma.$executeRaw`DELETE FROM web_pages WHERE tenant_id = ${tenantId}::uuid`;
    return res.json({ message: 'Página eliminada.' });
  } catch (err) {
    console.error('Error deleting web page:', err);
    return res.status(500).json({ error: 'Error al eliminar la página.' });
  }
};

// GET /api/web-pages/usage — check Plury credits
exports.getUsage = async (_req, res) => {
  try {
    const usage = await pluryFetch('/usage');
    return res.json(usage);
  } catch (err) {
    console.error('Error getting Plury usage:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error al consultar créditos.' });
  }
};
