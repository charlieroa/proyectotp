// src/controllers/stylistController.js
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

/* ============================================================
   Utilidades compartidas
============================================================ */

const BLOCKING_STATUSES = [
  'scheduled',
  'rescheduled',
  'checked_in',
  'checked_out',
  'pending_approval',
];

// Obtiene la duración del servicio (minutos) por tenant; si no existe, usa fallback
async function getServiceDurationMinutes(service_id, tenant_id, fallback = 60) {
  if (!service_id) return fallback;
  const svc = await prisma.services.findFirst({
    where: { id: service_id, tenant_id },
    select: { duration_minutes: true },
  });
  if (!svc) return fallback;
  const n = Number(svc.duration_minutes);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Construye Date local (sin 'Z') a partir de YYYY-MM-DD + HH:mm (o HH:mm:ss)
function makeLocalDate(dateStr, timeStr) {
  const t = (timeStr || '').length === 5 ? `${timeStr}:00` : (timeStr || '00:00:00');
  return new Date(`${dateStr}T${t}`);
}

/* ============================================================
   1) Siguiente estilista disponible global (sin filtrar por servicio)
   GET /api/stylists/next-available
============================================================ */
exports.getNextAvailable = async (req, res) => {
  const { tenant_id } = req.user;
  try {
    const rows = await prisma.$queryRaw`
      SELECT id, first_name, last_name, last_service_at, last_turn_at
        FROM users
       WHERE tenant_id = ${tenant_id}::uuid
         AND role_id = 3
         AND status = 'active'
       ORDER BY COALESCE(last_turn_at, last_service_at) ASC NULLS FIRST
       LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay estilistas disponibles.' });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener el siguiente estilista:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   2) Sugerir estilista por turno (calificado + disponible)
   GET /api/stylists/suggest-by-turn?date=YYYY-MM-DD&start_time=HH:mm[:ss]&service_id=<id>
   - Ordena por COALESCE(last_turn_at, last_service_at)
   - Actualiza last_turn_at = NOW() al sugerir
============================================================ */
exports.suggestStylistByTurn = async (req, res) => {
  const { tenant_id } = req.user;
  const { date, start_time, service_id } = req.query;

  if (!date || !start_time || !service_id) {
    return res.status(400).json({ message: 'Se requiere fecha, hora de inicio y service_id.' });
  }

  try {
    const duration = await getServiceDurationMinutes(service_id, tenant_id, 60);
    const startLocal = makeLocalDate(date, start_time);
    const endLocal = new Date(startLocal.getTime() + duration * 60000);

    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT u.id, u.first_name, u.last_name
        FROM users u
       WHERE u.tenant_id = $1::uuid
         AND u.role_id = 3
         AND u.status = 'active'
         AND EXISTS (
               SELECT 1
                 FROM stylist_services ss
                WHERE ss.user_id = u.id
                  AND ss.service_id = $2::uuid
         )
         AND NOT EXISTS (
               SELECT 1
                 FROM appointments a
                WHERE a.tenant_id  = $1::uuid
                  AND a.stylist_id = u.id
                  AND a.status = ANY($5)
                  AND (a.start_time, a.end_time) OVERLAPS ($3, $4)
         )
       ORDER BY COALESCE(u.last_turn_at, u.last_service_at) ASC NULLS FIRST
       LIMIT 1
      `,
      tenant_id, service_id, startLocal, endLocal, BLOCKING_STATUSES
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron estilistas disponibles en ese horario.' });
    }

    const stylist = rows[0];
    await prisma.users.update({
      where: { id: stylist.id },
      data: { last_turn_at: new Date() },
    });

    return res.status(200).json(stylist);
  } catch (error) {
    console.error('Error al sugerir estilista por turno:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   3) Obtener servicios asignados a un estilista
   GET /api/stylists/:id/services
============================================================ */
exports.getStylistServices = async (req, res) => {
  const { tenant_id } = req.user;
  const { id: stylistId } = req.params;

  try {
    const stylist = await prisma.users.findFirst({
      where: { id: stylistId, tenant_id, role_id: 3 },
      select: { id: true },
    });
    if (!stylist) {
      return res.status(404).json({ message: 'Estilista no encontrado.' });
    }

    const rows = await prisma.stylist_services.findMany({
      where: {
        user_id: stylistId,
        services: { tenant_id },
      },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_minutes: true,
            category_id: true,
            service_categories: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { services: { service_categories: { name: 'asc' } } },
        { services: { name: 'asc' } },
      ],
    });

    // Aplanar la respuesta para mantener la misma estructura que antes
    const result = rows.map((ss) => ({
      id: ss.services.id,
      name: ss.services.name,
      price: ss.services.price,
      duration_minutes: ss.services.duration_minutes,
      category_id: ss.services.category_id,
      category_name: ss.services.service_categories?.name ?? null,
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener servicios del estilista:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   4) Asignar (reemplazar) servicios a un estilista
   POST /api/stylists/:id/services
   Body: { "service_ids": ["uuid1","uuid2", ...] }
   - Reemplaza todas las asignaciones actuales por las recibidas
   - Usa transacción Prisma
============================================================ */
exports.setStylistServices = async (req, res) => {
  const { tenant_id } = req.user;
  const { id: stylistId } = req.params;
  const { service_ids } = req.body;

  if (!Array.isArray(service_ids)) {
    return res.status(400).json({ message: 'service_ids debe ser un arreglo.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const stylist = await tx.users.findFirst({
        where: { id: stylistId, tenant_id, role_id: 3 },
        select: { id: true },
      });
      if (!stylist) {
        throw Object.assign(new Error('Estilista no encontrado.'), { statusCode: 404 });
      }

      if (service_ids.length > 0) {
        const valid = await tx.services.findMany({
          where: { tenant_id, id: { in: service_ids } },
          select: { id: true },
        });
        if (valid.length !== service_ids.length) {
          throw Object.assign(
            new Error('Uno o más servicios no pertenecen a tu tenant.'),
            { statusCode: 400 }
          );
        }
      }

      await tx.stylist_services.deleteMany({
        where: { user_id: stylistId },
      });

      if (service_ids.length > 0) {
        await tx.stylist_services.createMany({
          data: service_ids.map((sid) => ({
            user_id: stylistId,
            service_id: sid,
          })),
        });
      }
    });

    return res.status(200).json({ message: 'Servicios del estilista actualizados con éxito.' });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al asignar servicios al estilista:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

/* ============================================================
   5) Crear estilista (role_id = 3)
   POST /api/users
============================================================ */
exports.createStylist = async (req, res) => {
  const { tenant_id } = req.user;
  const {
    first_name,
    last_name,
    email,
    password,
    phone = null,
    payment_type = 'salary', // 'salary' | 'commission' | 'mixed'
    base_salary = 0,
    commission_rate = 0,
  } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'first_name, last_name, email y password son requeridos.' });
  }

  try {
    // Nota: si tu proyecto ya hashea en authController, aquí no lo repetimos.
    const created = await prisma.users.create({
      data: {
        tenant_id,
        role_id: 3,
        first_name,
        last_name,
        email,
        password,
        password_hash: password, // se mantiene el mismo valor; campo requerido en el schema
        phone,
        payment_type,
        base_salary,
        commission_rate,
        status: 'active',
      },
      select: {
        id: true,
        tenant_id: true,
        role_id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        payment_type: true,
        base_salary: true,
        commission_rate: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Error al crear estilista:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   6) Listar estilistas del tenant
   GET /api/users/tenant/:tenantId?role_id=3
============================================================ */
exports.listStylistsByTenant = async (req, res) => {
  const { tenant_id } = req.user;
  const { tenantId } = req.params;
  const roleId = Number(req.query.role_id || 3);

  if (tenantId !== tenant_id) {
    return res.status(403).json({ message: 'No autorizado para consultar este tenant.' });
  }

  try {
    const rows = await prisma.users.findMany({
      where: { tenant_id, role_id: roleId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        payment_type: true,
        base_salary: true,
        commission_rate: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: [
        { first_name: 'asc' },
        { last_name: 'asc' },
      ],
    });
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error al listar estilistas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   7) Actualizar estilista
   PUT /api/users/:id
============================================================ */
exports.updateStylist = async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  const allowed = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'payment_type',
    'base_salary',
    'commission_rate',
    'status',
  ];

  const data = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      data[key] = req.body[key];
    }
  }

  // Manejar actualización de contraseña si se proporciona
  if (req.body.password && req.body.password.trim()) {
    const salt = await bcrypt.genSalt(10);
    const passwordHashed = await bcrypt.hash(req.body.password.trim(), salt);
    data.password_hash = passwordHashed;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: 'No hay campos válidos para actualizar.' });
  }

  try {
    const stylist = await prisma.users.findFirst({
      where: { id, tenant_id, role_id: 3 },
      select: { id: true },
    });
    if (!stylist) {
      return res.status(404).json({ message: 'Estilista no encontrado.' });
    }

    data.updated_at = new Date();

    const updated = await prisma.users.update({
      where: { id },
      data,
      select: {
        id: true,
        tenant_id: true,
        role_id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        payment_type: true,
        base_salary: true,
        commission_rate: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error al actualizar estilista:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado.' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   8) Eliminar estilista
   DELETE /api/users/:id
============================================================ */
exports.deleteStylist = async (req, res) => {
  const { tenant_id } = req.user;
  const { id } = req.params;

  try {
    const stylist = await prisma.users.findFirst({
      where: { id, tenant_id, role_id: 3 },
      select: { id: true },
    });
    if (!stylist) {
      return res.status(404).json({ message: 'Estilista no encontrado.' });
    }

    await prisma.users.delete({
      where: { id },
    });
    return res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar estilista:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   9) Obtener sedes asignadas a un estilista
   GET /api/stylists/:id/branches
============================================================ */
exports.getStylistBranches = async (req, res) => {
  const { id: stylistId } = req.params;

  try {
    const rows = await prisma.stylist_branch_assignments.findMany({
      where: { stylist_id: stylistId },
      include: {
        tenants: {
          select: { id: true, name: true, address: true, branch_color: true },
        },
      },
    });

    const branches = rows.map((r) => ({
      id: r.tenants.id,
      name: r.tenants.name,
      address: r.tenants.address,
      branch_color: r.tenants.branch_color,
    }));

    return res.status(200).json(branches);
  } catch (error) {
    console.error('Error al obtener sedes del estilista:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   10) Asignar sedes a un estilista (reemplaza todas)
   POST /api/stylists/:id/branches
   Body: { "branch_ids": ["uuid1","uuid2", ...] }
============================================================ */
exports.setStylistBranches = async (req, res) => {
  const { id: stylistId } = req.params;
  const { branch_ids } = req.body;

  if (!Array.isArray(branch_ids)) {
    return res.status(400).json({ message: 'branch_ids debe ser un arreglo.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Verificar que el estilista existe
      const stylist = await tx.users.findFirst({
        where: { id: stylistId, role_id: 3 },
        select: { id: true },
      });
      if (!stylist) {
        throw Object.assign(new Error('Estilista no encontrado.'), { statusCode: 404 });
      }

      // Eliminar asignaciones existentes
      await tx.stylist_branch_assignments.deleteMany({
        where: { stylist_id: stylistId },
      });

      // Crear nuevas asignaciones
      if (branch_ids.length > 0) {
        await tx.stylist_branch_assignments.createMany({
          data: branch_ids.map((branchId) => ({
            stylist_id: stylistId,
            branch_tenant_id: branchId,
          })),
        });
      }
    });

    return res.status(200).json({ message: 'Sedes del estilista actualizadas con éxito.' });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    console.error('Error al asignar sedes al estilista:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
};

/* ============================================================
   Export util (opcional)
============================================================ */
exports.BLOCKING_STATUSES = BLOCKING_STATUSES;
