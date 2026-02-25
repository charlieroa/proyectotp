// src/controllers/tenantController.js
'use strict';

const prisma = require('../config/prisma');
const slugify = require('slugify');

// --- Helpers ---
const createSlug = (text = '') =>
  slugify(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

const clean = (v) => (v === undefined || v === null ? null : v);
const fracToPct = (v) => (v === null || v === undefined ? null : Number(v) * 100);
const pctToFrac = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n / 100 : null;
};
const safeParseJSON = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

// Mapea la fila de la BD al objeto que espera el frontend
const dbToApiTenant = (row) => ({
  id: row.id,
  name: row.name,
  address: row.address,
  phone: row.phone,
  email: row.email,
  website: row.website,
  logo_url: row.logo_url,
  iva_rate: fracToPct(row.tax_rate),
  admin_fee_percent: fracToPct(row.admin_fee_rate),
  slug: row.slug,
  working_hours: typeof row.working_hours === 'string'
    ? safeParseJSON(row.working_hours)
    : row.working_hours,
  // Modulos
  products_for_staff_enabled: row.products_for_staff_enabled,
  admin_fee_enabled: row.admin_fee_enabled,
  loans_to_staff_enabled: row.loans_to_staff_enabled,
  // Flag para permitir citas en pasado
  allow_past_appointments: !!row.allow_past_appointments,
  // Payment plan
  plan: row.plan || 'free',
  // Saludo y brochure
  greeting_message: row.greeting_message || null,
  brochure_url: row.brochure_url || null,
  // ElevenLabs voice
  elevenlabs_voice_id: row.elevenlabs_voice_id || null,
  // Multi-negocio
  parent_tenant_id: row.parent_tenant_id || null,
  business_type: row.business_type || 'peluqueria',
  // Multi-sede & Propinas
  shared_stylists_enabled: !!row.shared_stylists_enabled,
  tip_salon_percent: row.tip_salon_percent != null ? Number(row.tip_salon_percent) : 10,
  branch_color: row.branch_color || '#3788d8',
  created_at: row.created_at,
  updated_at: row.updated_at,
});

// --- Controlador ---

// Crear Tenant
exports.createTenant = async (req, res) => {
  try {
    const {
      name, address, phone, working_hours, email, website, logo_url,
      iva_rate, admin_fee_percent,
      products_for_staff_enabled = true,
      admin_fee_enabled = false,
      loans_to_staff_enabled = false,
      allow_past_appointments = false,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const slug = createSlug(name);

    const tenant = await prisma.tenants.create({
      data: {
        name: clean(name),
        address: clean(address),
        phone: clean(phone),
        working_hours: working_hours || null,
        slug,
        email: clean(email),
        website: clean(website),
        logo_url: clean(logo_url),
        tax_rate: pctToFrac(iva_rate),
        admin_fee_rate: pctToFrac(admin_fee_percent),
        products_for_staff_enabled: !!products_for_staff_enabled,
        admin_fee_enabled: !!admin_fee_enabled,
        loans_to_staff_enabled: !!loans_to_staff_enabled,
        allow_past_appointments: !!allow_past_appointments,
      },
    });

    return res.status(201).json(dbToApiTenant(tenant));
  } catch (error) {
    console.error('Error al crear tenant:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe una peluqueria con un nombre similar.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Listar Tenants
exports.getAllTenants = async (req, res) => {
  const { slug } = req.query;
  try {
    if (slug) {
      const tenant = await prisma.tenants.findFirst({ where: { slug } });
      if (!tenant) return res.status(404).json({ message: 'Peluqueria no encontrada con ese slug.' });
      return res.status(200).json(dbToApiTenant(tenant));
    }
    const tenants = await prisma.tenants.findMany({ orderBy: { created_at: 'desc' } });
    return res.status(200).json(tenants.map(dbToApiTenant));
  } catch (error) {
    console.error('Error al obtener tenants:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener Tenant por ID
exports.getTenantById = async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await prisma.tenants.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ message: 'Tenant no encontrado' });
    return res.status(200).json(dbToApiTenant(tenant));
  } catch (error) {
    console.error('Error al obtener tenant por ID:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar (parcial) Tenant
exports.updateTenant = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const exists = await prisma.tenants.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      return res.status(404).json({ message: 'Tenant no encontrado para actualizar' });
    }

    const data = {};

    if (body.name !== undefined) {
      data.name = clean(body.name);
      data.slug = createSlug(body.name);
    }
    if (body.address !== undefined) data.address = clean(body.address);
    if (body.phone !== undefined) data.phone = clean(body.phone);
    if (body.email !== undefined) data.email = clean(body.email);
    if (body.website !== undefined) data.website = clean(body.website);
    if (body.logo_url !== undefined) data.logo_url = clean(body.logo_url);
    if (body.working_hours !== undefined) {
      data.working_hours = body.working_hours || null;
    }
    if (body.iva_rate !== undefined) data.tax_rate = pctToFrac(body.iva_rate);

    // Si deshabilitan admin_fee, anulamos la tasa
    if (body.admin_fee_enabled === false) {
      data.admin_fee_rate = null;
    } else if (body.admin_fee_percent !== undefined) {
      data.admin_fee_rate = pctToFrac(body.admin_fee_percent);
    }

    if (body.products_for_staff_enabled !== undefined)
      data.products_for_staff_enabled = !!body.products_for_staff_enabled;
    if (body.admin_fee_enabled !== undefined)
      data.admin_fee_enabled = !!body.admin_fee_enabled;
    if (body.loans_to_staff_enabled !== undefined)
      data.loans_to_staff_enabled = !!body.loans_to_staff_enabled;

    // Flag de citas en pasado
    if (body.allow_past_appointments !== undefined)
      data.allow_past_appointments = !!body.allow_past_appointments;

    // Payment plan (accept both "plan" and "payment_plan" for backwards compatibility)
    if (body.plan !== undefined)
      data.plan = body.plan;
    else if (body.payment_plan !== undefined)
      data.plan = body.payment_plan;

    // Saludo y brochure
    if (body.greeting_message !== undefined) data.greeting_message = clean(body.greeting_message);
    if (body.brochure_url !== undefined) data.brochure_url = clean(body.brochure_url);

    // ElevenLabs voice
    if (body.elevenlabs_voice_id !== undefined) data.elevenlabs_voice_id = clean(body.elevenlabs_voice_id);

    // Multi-sede & Propinas
    if (body.shared_stylists_enabled !== undefined)
      data.shared_stylists_enabled = !!body.shared_stylists_enabled;
    if (body.tip_salon_percent !== undefined) {
      const tipPct = Number(body.tip_salon_percent);
      data.tip_salon_percent = Number.isFinite(tipPct) ? tipPct : 10;
    }
    if (body.branch_color !== undefined)
      data.branch_color = clean(body.branch_color) || '#3788d8';

    if (Object.keys(data).length === 0) {
      const current = await prisma.tenants.findUnique({ where: { id } });
      return res.status(200).json(dbToApiTenant(current));
    }

    data.updated_at = new Date();

    const updated = await prisma.tenants.update({
      where: { id },
      data,
    });

    return res.status(200).json(dbToApiTenant(updated));
  } catch (error) {
    console.error('Error al actualizar tenant:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Subida de logo
exports.uploadTenantLogo = async (req, res) => {
  const { tenantId } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningun archivo.' });
    }
    const uploadedFileUrl = `/uploads/logos/${req.file.filename}`;
    const tenant = await prisma.tenants.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant no encontrado.' });
    }
    await prisma.tenants.update({
      where: { id: tenantId },
      data: { logo_url: uploadedFileUrl, updated_at: new Date() },
    });
    return res.status(200).json({ url: uploadedFileUrl });
  } catch (error) {
    console.error('Error al subir el logo:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Subida de brochure
exports.uploadTenantBrochure = async (req, res) => {
  const { tenantId } = req.params;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningun archivo.' });
    }
    const uploadedFileUrl = `/uploads/brochures/${req.file.filename}`;
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, brochure_url: true },
    });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant no encontrado.' });
    }

    // Eliminar brochure anterior del disco si existe
    const oldUrl = tenant.brochure_url;
    if (oldUrl) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(__dirname, '..', '..', 'public', oldUrl);
      try { fs.unlinkSync(oldPath); } catch (_) { /* ignorar si no existe */ }
    }

    await prisma.tenants.update({
      where: { id: tenantId },
      data: { brochure_url: uploadedFileUrl, updated_at: new Date() },
    });
    return res.status(200).json({ url: uploadedFileUrl });
  } catch (error) {
    console.error('Error al subir el brochure:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Eliminar brochure
exports.deleteTenantBrochure = async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, brochure_url: true },
    });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant no encontrado.' });
    }

    const oldUrl = tenant.brochure_url;
    if (oldUrl) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(__dirname, '..', '..', 'public', oldUrl);
      try { fs.unlinkSync(oldPath); } catch (_) { /* ignorar si no existe */ }
    }

    await prisma.tenants.update({
      where: { id: tenantId },
      data: { brochure_url: null, updated_at: new Date() },
    });
    return res.status(200).json({ message: 'Brochure eliminado.' });
  } catch (error) {
    console.error('Error al eliminar brochure:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Crear sucursal (branch) vinculada al tenant del admin
exports.createBranch = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    if (!tenant_id) return res.status(400).json({ error: 'No se encontró tenant del usuario.' });

    const { name, address, phone, email, business_type } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido.' });

    // Determinar el parent: si el tenant actual ya es hijo, usar su parent; si no, él mismo es el parent
    const currentTenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { id: true, parent_tenant_id: true, plan: true },
    });
    if (!currentTenant) return res.status(404).json({ error: 'Tenant actual no encontrado.' });

    const parentId = currentTenant.parent_tenant_id || currentTenant.id;

    // Si el tenant actual es hijo, obtener el plan del padre real
    let parentPlan = currentTenant.plan || 'free';
    if (currentTenant.parent_tenant_id) {
      const parentTenant = await prisma.tenants.findUnique({
        where: { id: currentTenant.parent_tenant_id },
        select: { plan: true },
      });
      parentPlan = parentTenant?.plan || parentPlan;
    }

    const slug = createSlug(name);

    const branch = await prisma.tenants.create({
      data: {
        name: clean(name),
        slug,
        address: clean(address),
        phone: clean(phone),
        email: clean(email),
        business_type: business_type || 'peluqueria',
        parent_tenant_id: parentId,
        plan: parentPlan, // Heredar plan del padre
      },
    });

    return res.status(201).json(dbToApiTenant(branch));
  } catch (error) {
    console.error('Error al crear sucursal:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un negocio con un nombre similar.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Listar negocios accesibles para el admin
exports.getMyBusinesses = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    if (!tenant_id) return res.status(400).json({ error: 'No se encontró tenant del usuario.' });

    const currentTenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { id: true, parent_tenant_id: true },
    });
    if (!currentTenant) return res.status(404).json({ error: 'Tenant no encontrado.' });

    let parentId;
    if (currentTenant.parent_tenant_id) {
      // Es hijo -> buscar parent y siblings
      parentId = currentTenant.parent_tenant_id;
    } else {
      // Verificar si tiene hijos
      const hasChildren = await prisma.tenants.count({ where: { parent_tenant_id: currentTenant.id } });
      if (hasChildren > 0) {
        parentId = currentTenant.id;
      } else {
        // Sin relación -> solo retornar self
        const self = await prisma.tenants.findUnique({ where: { id: tenant_id } });
        return res.status(200).json([dbToApiTenant(self)]);
      }
    }

    // Retornar parent + todos sus hijos
    const allTenants = await prisma.tenants.findMany({
      where: {
        OR: [
          { id: parentId },
          { parent_tenant_id: parentId },
        ],
      },
      orderBy: { created_at: 'asc' },
    });

    return res.status(200).json(allTenants.map(dbToApiTenant));
  } catch (error) {
    console.error('Error al obtener negocios:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// Eliminar Tenant
exports.deleteTenant = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.tenants.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Tenant no encontrado para eliminar' });
    }
    console.error('Error al eliminar tenant:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
