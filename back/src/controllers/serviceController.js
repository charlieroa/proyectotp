// =========================================================
// File: src/controllers/serviceController.js
// =========================================================
const prisma = require('../config/prisma');

// --- Helper: valida/normaliza porcentaje (0–100) o null ---
function parsePercentOrNull(input, fieldName = 'commission_percent') {
  if (input === undefined || input === null || input === '') return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    const err = new Error(`${fieldName} debe estar entre 0 y 100.`);
    err.status = 400;
    throw err;
  }
  return Math.round(n * 100) / 100;
}

// =========================================================
// BUSCAR SERVICIOS POR NOMBRE (Para AI Agent - Público)
// =========================================================
exports.searchServices = async (req, res) => {
  const { tenantId } = req.params;
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Falta el parámetro de búsqueda (query)' });
  }

  try {
    const services = await prisma.services.findMany({
      where: {
        tenant_id: tenantId,
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        duration_minutes: true,
        price: true,
        description: true,
        category_id: true,
        commission_percent: true,
        max_concurrent_stylists: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    if (services.length === 0) {
      return res.status(404).json({
        message: `No se encontraron servicios que coincidan con "${query}"`,
        services: [],
      });
    }

    return res.status(200).json({ services });
  } catch (error) {
    console.error('Error al buscar servicios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear un nuevo Servicio
exports.createService = async (req, res) => {
  const { tenant_id } = req.user;
  const { name, description, price, duration_minutes, category_id, commission_percent, max_concurrent_stylists } = req.body;

  if (!name || price == null || duration_minutes == null) {
    return res.status(400).json({ error: 'Campos obligatorios: name, price, duration_minutes.' });
  }

  let pct = null;
  try {
    pct = parsePercentOrNull(commission_percent);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  try {
    const service = await prisma.services.create({
      data: {
        tenant_id,
        name,
        description: description ?? null,
        price,
        duration_minutes,
        category_id: category_id ?? null,
        commission_percent: pct,
        max_concurrent_stylists: max_concurrent_stylists ? Math.max(1, parseInt(max_concurrent_stylists)) : 1,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    console.error('Error al crear el servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los servicios del tenant (con filtro por categoría)
exports.getServicesByTenant = async (req, res) => {
  // Use URL param tenantId if provided (cross-branch), fallback to JWT tenant_id
  const tenant_id = req.params.tenantId || req.user.tenant_id;
  const { category_id } = req.query;

  try {
    const where = { tenant_id };
    if (category_id) where.category_id = category_id;

    const services = await prisma.services.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.status(200).json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener un servicio por su ID (valida pertenencia al tenant)
exports.getServiceById = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;

  try {
    const service = await prisma.services.findFirst({
      where: { id, tenant_id },
    });
    if (!service) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error('Error al obtener servicio por ID:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar un Servicio
exports.updateService = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;
  const { name, description, price, duration_minutes, category_id, commission_percent, max_concurrent_stylists } = req.body;

  let pct = undefined;
  try {
    if (commission_percent !== undefined) {
      pct = parsePercentOrNull(commission_percent);
    }
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  try {
    const current = await prisma.services.findFirst({
      where: { id, tenant_id },
    });
    if (!current) return res.status(404).json({ message: 'Servicio no encontrado para actualizar.' });

    const service = await prisma.services.update({
      where: { id },
      data: {
        name: name ?? current.name,
        description: description ?? current.description,
        price: price ?? current.price,
        duration_minutes: duration_minutes ?? current.duration_minutes,
        category_id: category_id ?? current.category_id,
        commission_percent: pct === undefined ? current.commission_percent : pct,
        max_concurrent_stylists: max_concurrent_stylists !== undefined ? Math.max(1, parseInt(max_concurrent_stylists)) : current.max_concurrent_stylists,
        updated_at: new Date(),
      },
    });

    res.status(200).json(service);
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar un Servicio
exports.deleteService = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;
  try {
    const existing = await prisma.services.findFirst({
      where: { id, tenant_id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Servicio no encontrado para eliminar' });
    }

    await prisma.services.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'No se puede eliminar: el servicio está en uso.' });
    }
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Lista estilistas cualificados para un servicio (acotado al tenant del token)
exports.getStylistsForService = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;

  try {
    const stylistServices = await prisma.stylist_services.findMany({
      where: { service_id: id },
      include: {
        users: {
          select: { id: true, first_name: true, last_name: true, status: true, tenant_id: true, role_id: true },
        },
      },
    });

    const stylists = stylistServices
      .map((ss) => ss.users)
      .filter((u) => u.tenant_id === tenant_id && u.role_id === 3)
      .map(({ id, first_name, last_name, status }) => ({ id, first_name, last_name, status }));

    stylists.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`;
      const nameB = `${b.first_name} ${b.last_name}`;
      return nameA.localeCompare(nameB);
    });

    res.status(200).json(stylists);
  } catch (error) {
    console.error("Error al obtener estilistas por servicio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
