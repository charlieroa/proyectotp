const prisma = require('../config/prisma');

// GET /api/fichero/tenant/:tenantId - Cola actual por categoria de servicio
exports.getQueues = async (req, res) => {
  const { tenant_id } = req.user;
  const { tenantId } = req.params;

  try {
    // Check if user can view this tenant's queues (same tenant or primary branch)
    const canView = await canAccessTenant(tenant_id, tenantId);
    if (!canView) {
      return res.status(403).json({ error: 'No autorizado para ver este tenant.' });
    }

    const queues = await prisma.stylist_queues.findMany({
      where: { tenant_id: tenantId },
      include: {
        users: {
          select: {
            id: true, first_name: true, last_name: true,
            is_inside_geofence: true, avatar_url: true
          }
        },
        service_categories: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { category_id: 'asc' },
        { position: 'asc' }
      ]
    });

    // Group by category
    const grouped = {};
    for (const q of queues) {
      const catId = q.category_id;
      if (!grouped[catId]) {
        grouped[catId] = {
          category_id: catId,
          category_name: q.service_categories?.name || 'Sin categoria',
          stylists: []
        };
      }
      grouped[catId].stylists.push({
        queue_id: q.id,
        stylist_id: q.stylist_id,
        first_name: q.users?.first_name,
        last_name: q.users?.last_name,
        avatar_url: q.users?.avatar_url,
        position: q.position,
        is_active: q.is_active,
        is_inside_geofence: q.users?.is_inside_geofence || false,
        last_served_at: q.last_served_at
      });
    }

    return res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.error('Error getting fichero queues:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/fichero/next/:categoryId - Get next available stylist and rotate to end
exports.getNextStylist = async (req, res) => {
  const { tenant_id } = req.user;
  const { categoryId } = req.params;
  const targetTenantId = req.body.tenant_id || tenant_id;

  try {
    const canView = await canAccessTenant(tenant_id, targetTenantId);
    if (!canView) {
      return res.status(403).json({ error: 'No autorizado.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the first active stylist inside geofence
      const nextStylist = await tx.stylist_queues.findFirst({
        where: {
          tenant_id: targetTenantId,
          category_id: categoryId,
          is_active: true,
          users: { is_inside_geofence: true }
        },
        include: {
          users: {
            select: { id: true, first_name: true, last_name: true }
          }
        },
        orderBy: { position: 'asc' }
      });

      if (!nextStylist) {
        // Fallback: get first active stylist (even if not in geofence)
        const fallback = await tx.stylist_queues.findFirst({
          where: {
            tenant_id: targetTenantId,
            category_id: categoryId,
            is_active: true
          },
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true }
            }
          },
          orderBy: { position: 'asc' }
        });

        if (!fallback) return null;
        return fallback;
      }

      return nextStylist;
    });

    if (!result) {
      return res.status(404).json({ message: 'No hay estilistas disponibles en esta cola.' });
    }

    // Rotate: move this stylist to the end
    await rotateToEnd(targetTenantId, categoryId, result.id);

    return res.status(200).json({
      stylist_id: result.stylist_id,
      first_name: result.users?.first_name,
      last_name: result.users?.last_name,
      queue_id: result.id
    });
  } catch (error) {
    console.error('Error getting next stylist:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/fichero/reset/:tenantId - Reset queues for the day
exports.resetQueues = async (req, res) => {
  const { tenant_id } = req.user;
  const { tenantId } = req.params;

  try {
    const canView = await canAccessTenant(tenant_id, tenantId);
    if (!canView) {
      return res.status(403).json({ error: 'No autorizado.' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing queues for this tenant
      await tx.stylist_queues.deleteMany({ where: { tenant_id: tenantId } });

      // Get all active stylists assigned to this tenant (or in branch assignments)
      const stylists = await tx.users.findMany({
        where: {
          role_id: 3,
          status: 'active',
          OR: [
            { tenant_id: tenantId },
            { stylist_branch_assignments: { some: { branch_tenant_id: tenantId } } }
          ]
        },
        select: {
          id: true,
          stylist_services: {
            include: {
              services: {
                select: { category_id: true }
              }
            }
          }
        }
      });

      // Build queue entries: each stylist gets a position in each category they serve
      const entries = [];
      const categoryPositions = {};

      for (const stylist of stylists) {
        const categoryIds = new Set();
        for (const ss of stylist.stylist_services) {
          if (ss.services?.category_id) {
            categoryIds.add(ss.services.category_id);
          }
        }

        for (const catId of categoryIds) {
          if (!categoryPositions[catId]) categoryPositions[catId] = 0;
          categoryPositions[catId]++;

          entries.push({
            tenant_id: tenantId,
            stylist_id: stylist.id,
            category_id: catId,
            position: categoryPositions[catId],
            is_active: true
          });
        }
      }

      if (entries.length > 0) {
        await tx.stylist_queues.createMany({ data: entries });
      }
    });

    return res.status(200).json({ message: 'Colas reseteadas exitosamente.' });
  } catch (error) {
    console.error('Error resetting queues:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/fichero/activate/:stylistId - Activate stylist in all queues
exports.activateStylist = async (req, res) => {
  const { stylistId } = req.params;
  const tenantId = req.body.tenant_id || req.user.tenant_id;

  try {
    await prisma.stylist_queues.updateMany({
      where: { stylist_id: stylistId, tenant_id: tenantId },
      data: { is_active: true, updated_at: new Date() }
    });

    return res.status(200).json({ message: 'Estilista activado en cola.' });
  } catch (error) {
    console.error('Error activating stylist:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/fichero/deactivate/:stylistId - Deactivate stylist in all queues
exports.deactivateStylist = async (req, res) => {
  const { stylistId } = req.params;
  const tenantId = req.body.tenant_id || req.user.tenant_id;

  try {
    await prisma.stylist_queues.updateMany({
      where: { stylist_id: stylistId, tenant_id: tenantId },
      data: { is_active: false, updated_at: new Date() }
    });

    return res.status(200).json({ message: 'Estilista desactivado en cola.' });
  } catch (error) {
    console.error('Error deactivating stylist:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// --- Helper: rotate a stylist to the end of the queue for a category ---
async function rotateToEnd(tenantId, categoryId, queueId) {
  await prisma.$transaction(async (tx) => {
    // Get current max position
    const maxResult = await tx.stylist_queues.aggregate({
      where: { tenant_id: tenantId, category_id: categoryId },
      _max: { position: true }
    });
    const maxPos = maxResult._max.position || 0;

    // Get the rotated entry's current position
    const entry = await tx.stylist_queues.findUnique({ where: { id: queueId } });
    if (!entry) return;

    const oldPos = entry.position;

    // Move everyone above down by 1
    await tx.$queryRawUnsafe(
      `UPDATE stylist_queues SET position = position - 1, updated_at = NOW()
       WHERE tenant_id = $1::uuid AND category_id = $2::uuid AND position > $3`,
      tenantId, categoryId, oldPos
    );

    // Put this stylist at the end
    await tx.stylist_queues.update({
      where: { id: queueId },
      data: {
        position: maxPos,
        last_served_at: new Date(),
        updated_at: new Date()
      }
    });
  });
}

// --- Helper: check if user can access a tenant (same tenant or primary branch parent) ---
async function canAccessTenant(userTenantId, targetTenantId) {
  if (userTenantId === targetTenantId) return true;

  // Check if user's tenant is the parent of target tenant
  const targetTenant = await prisma.tenants.findUnique({
    where: { id: targetTenantId },
    select: { parent_tenant_id: true }
  });

  if (targetTenant?.parent_tenant_id === userTenantId) return true;

  // Check if user's tenant is primary and target is a sibling
  const userTenant = await prisma.tenants.findUnique({
    where: { id: userTenantId },
    select: { is_primary_branch: true, parent_tenant_id: true }
  });

  if (userTenant?.is_primary_branch) {
    // Primary branch can also see sibling branches
    if (targetTenant?.parent_tenant_id === userTenant.parent_tenant_id) return true;
  }

  return false;
}

exports.canAccessTenant = canAccessTenant;
