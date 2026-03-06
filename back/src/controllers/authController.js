// src/controllers/authController.js

const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

// -----------------------------
// Helpers
// -----------------------------
const createSlug = (text) =>
  slugify(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });

/**
 * Intenta parsear JSON de forma segura.
 * Si ya es objeto, lo devuelve tal cual. Si falla, retorna {}.
 */
function safeParseJSON(maybeJSON) {
  if (!maybeJSON) return {};
  if (typeof maybeJSON === 'object') return maybeJSON;
  try {
    return JSON.parse(maybeJSON);
  } catch {
    return {};
  }
}

/**
 * Retorna true si algún día en working_hours está activo.
 * Soporta ambos formatos:
 *   - Objeto: { active: true, start: "09:00", end: "18:00" }
 *   - String: "09:00-18:00" (activo) o "cerrado"/"closed" (inactivo)
 */
function hasActiveWorkingHours(working_hours) {
  const hours = safeParseJSON(working_hours);
  if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return false;
  return Object.values(hours).some((day) => {
    if (!day) return false;
    // Formato string: "09:00-18:00" es activo, "cerrado"/"closed" es inactivo
    if (typeof day === 'string') {
      const lower = day.toLowerCase().trim();
      return lower !== 'cerrado' && lower !== 'closed' && lower.length > 0;
    }
    // Formato objeto: { active: true/false }
    if (typeof day === 'object') {
      return day.active === true;
    }
    return false;
  });
}

// -----------------------------
// LOGIN
// -----------------------------
exports.login = async (req, res) => {
  let { email, password } = req.body || {};

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'Por favor, ingrese email y contraseña.' });
  }

  email = String(email).trim().toLowerCase();

  try {
    const user = await prisma.users.findFirst({
      where: { email },
      orderBy: { role_id: 'asc' },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // ---------------- Super Admin: skip setup check ----------------
    if (user.role_id === 5) {
      const payload = {
        user: {
          id: user.id,
          role_id: user.role_id,
          tenant_id: null,
        },
      };

      return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '8h' },
        (err, token) => {
          if (err) throw err;
          return res.json({
            token,
            user: {
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              role_id: user.role_id,
              tenant_id: null,
            },
            setup_complete: true,
          });
        }
      );
    }

    // ---------------- Verificación avanzada de setup ----------------
    let isSetupComplete = false;

    if (user.tenant_id) {
      const [tenant, servicesCount, staffCount] = await Promise.all([
        prisma.tenants.findUnique({
          where: { id: user.tenant_id },
          select: { name: true, address: true, phone: true, working_hours: true },
        }),
        prisma.services.count({ where: { tenant_id: user.tenant_id } }),
        prisma.users.count({ where: { tenant_id: user.tenant_id, role_id: 3 } }),
      ]);

      if (tenant) {
        const hasBasicInfo = Boolean(
          (tenant.name || '').trim()
        );

        const hasHours = hasActiveWorkingHours(tenant.working_hours);
        const hasServices = servicesCount > 0;
        const hasStaff = staffCount > 0;

        isSetupComplete = hasBasicInfo && hasHours && hasServices && hasStaff;
      }
    }
    // ----------------------------------------------------------------

    // Obtener nombre del tenant y primary branch info para incluir en JWT
    let tenantName = null;
    let isPrimaryBranch = false;
    if (user.tenant_id) {
      const tenantForJwt = await prisma.tenants.findUnique({
        where: { id: user.tenant_id },
        select: { name: true, is_primary_branch: true, parent_tenant_id: true },
      });
      tenantName = tenantForJwt?.name || null;
      // is_primary if explicitly primary OR if it has no parent (standalone salon)
      isPrimaryBranch = !!tenantForJwt?.is_primary_branch || !tenantForJwt?.parent_tenant_id;
    }

    const payload = {
      user: {
        id: user.id,
        role_id: user.role_id,
        tenant_id: user.tenant_id,
        tenant_name: tenantName,
        is_primary_branch: isPrimaryBranch,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
      (err, token) => {
        if (err) throw err;

        const userForResponse = {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role_id: user.role_id,
          tenant_id: user.tenant_id,
          tenant_name: tenantName,
        };

        return res.json({
          token,
          user: userForResponse,
          setup_complete: isSetupComplete,
        });
      }
    );
  } catch (error) {
    console.error('Error en el login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// -----------------------------
// SWITCH TENANT (Multi-negocio)
// -----------------------------
exports.switchTenant = async (req, res) => {
  const { target_tenant_id } = req.body;
  const { id: userId, tenant_id: currentTenantId, role_id } = req.user;

  if (!target_tenant_id) {
    return res.status(400).json({ error: 'target_tenant_id es requerido.' });
  }

  try {
    // Obtener el tenant actual del usuario
    const currentTenant = await prisma.tenants.findUnique({
      where: { id: currentTenantId },
      select: { id: true, parent_tenant_id: true },
    });

    if (!currentTenant) {
      return res.status(404).json({ error: 'Tenant actual no encontrado.' });
    }

    // Determinar el parent_id del grupo
    const parentId = currentTenant.parent_tenant_id || currentTenant.id;

    // Verificar que el target pertenece al mismo grupo
    const targetTenant = await prisma.tenants.findUnique({
      where: { id: target_tenant_id },
      select: { id: true, parent_tenant_id: true, name: true, is_primary_branch: true },
    });

    if (!targetTenant) {
      return res.status(404).json({ error: 'Tenant destino no encontrado.' });
    }

    const targetParentId = targetTenant.parent_tenant_id || targetTenant.id;
    if (targetParentId !== parentId && targetTenant.id !== parentId) {
      return res.status(403).json({ error: 'No tiene acceso a ese negocio.' });
    }

    // Generar nuevo JWT con el tenant destino
    const isPrimary = !!targetTenant.is_primary_branch || !targetTenant.parent_tenant_id;
    const payload = {
      user: {
        id: userId,
        role_id,
        tenant_id: target_tenant_id,
        tenant_name: targetTenant.name,
        is_primary_branch: isPrimary,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.json({
      token,
      tenant: {
        id: targetTenant.id,
        name: targetTenant.name,
      },
    });
  } catch (error) {
    console.error('Error en switchTenant:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// -----------------------------
// Registro de Tenant + Admin
// -----------------------------
exports.registerTenantAndAdmin = async (req, res) => {
  const {
    tenantName,
    adminFirstName,
    adminEmail,
    adminPassword,
  } = req.body || {};

  if (!tenantName || !adminFirstName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const adminEmailNorm = String(adminEmail).trim().toLowerCase();

  try {
    const slug = createSlug(tenantName);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenants.create({
        data: { name: tenantName, email: adminEmailNorm, slug },
      });

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(adminPassword, salt);

      const admin = await tx.users.create({
        data: {
          tenant_id: tenant.id,
          role_id: 1,
          first_name: adminFirstName,
          last_name: '(Admin)',
          email: adminEmailNorm,
          password_hash,
        },
        select: { id: true, email: true, first_name: true, last_name: true, role_id: true, tenant_id: true },
      });

      return admin;
    });

    // Auto-login: generate JWT so frontend skips login
    const payload = {
      user: {
        id: result.id,
        role_id: result.role_id,
        tenant_id: result.tenant_id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.status(201).json({
      token,
      user: {
        id: result.id,
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
        role_id: result.role_id,
        tenant_id: result.tenant_id,
      },
      setup_complete: false,
    });
  } catch (error) {
    console.error('Error en el registro de tenant y admin:', error);

    if (error.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'Ya existe una peluquería o un usuario con ese nombre/email.' });
    }

    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// -----------------------------
// FORGOT PASSWORD
// -----------------------------
exports.forgotPassword = async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'El email es requerido.' });
  }

  const emailNorm = String(email).trim().toLowerCase();

  try {
    const user = await prisma.users.findFirst({
      where: { email: emailNorm },
      select: { id: true, first_name: true, email: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_reset_token: token,
        password_reset_expires: expires,
      },
    });

    // Send email (don't let email failure leak info)
    try {
      await sendPasswordResetEmail(user.email, token, user.first_name);
    } catch (emailErr) {
      console.error('[forgotPassword] Error enviando email:', emailErr.message);
    }

    return res.json({ message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// -----------------------------
// RESET PASSWORD
// -----------------------------
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const user = await prisma.users.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: { gte: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    return res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
