// src/controllers/dashboardV2Controller.js
// Dashboard V2: vista por estilista para una fecha — agenda + tickets abiertos
// + posición en fichero + estado geo + ventas del día. Una sola query agregada.
'use strict';

const prisma = require('../config/prisma');

// GET /api/dashboard-v2/stylists-day?date=YYYY-MM-DD&tenant_id=<uuid>
// tenant_id opcional permite drill-down desde SuperCalendar a una sucursal del mismo grupo.
exports.getStylistsDay = async (req, res) => {
  try {
    const userTenantId = req.user.tenant_id;
    let tenant_id = userTenantId;
    const overrideId = req.query.tenant_id ? String(req.query.tenant_id) : null;
    if (overrideId && /^[0-9a-f-]{36}$/i.test(overrideId) && overrideId !== userTenantId) {
      // Validar que la sucursal pertenezca al mismo grupo
      const userT = await prisma.tenants.findUnique({
        where: { id: userTenantId },
        select: { id: true, parent_tenant_id: true },
      });
      const overrideT = await prisma.tenants.findUnique({
        where: { id: overrideId },
        select: { id: true, parent_tenant_id: true },
      });
      if (!overrideT) return res.status(404).json({ error: 'Sucursal no encontrada.' });
      const userGroupId = userT?.parent_tenant_id || userT?.id;
      const overrideGroupId = overrideT.parent_tenant_id || overrideT.id;
      if (userGroupId !== overrideGroupId) {
        return res.status(403).json({ error: 'Sucursal fuera del grupo.' });
      }
      tenant_id = overrideId;
    }
    const date = String(req.query.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Parametro date YYYY-MM-DD requerido.' });
    }

    // Ventana del día en hora local Colombia (UTC-5). Convertimos a timestamps UTC.
    // Día empieza 00:00:00 local (= 05:00:00 UTC) y termina 23:59:59 local (= 04:59:59 UTC del día siguiente).
    const dayStartUTC = new Date(`${date}T05:00:00.000Z`);
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);

    // 1) Estilistas locales activos
    const stylists = await prisma.users.findMany({
      where: { tenant_id, role_id: 3, status: 'active' },
      select: {
        id: true, first_name: true, last_name: true, avatar_url: true,
        is_inside_geofence: true, last_location_update: true,
        payment_type: true,
      },
      orderBy: [{ first_name: 'asc' }],
    });
    const stylistIds = stylists.map(s => s.id);

    // 2) Citas del día por estilista
    const appointments = stylistIds.length === 0 ? [] : await prisma.$queryRawUnsafe(
      `SELECT a.id, a.stylist_id, a.start_time, a.end_time, a.status, a.batch_id,
              s.name AS service_name, s.price::numeric AS price,
              c.first_name AS client_first_name, c.last_name AS client_last_name
         FROM appointments a
         LEFT JOIN services s ON a.service_id = s.id
         LEFT JOIN users c ON a.client_id = c.id
        WHERE a.tenant_id = $1::uuid
          AND a.stylist_id = ANY($2::uuid[])
          AND a.start_time >= $3::timestamptz
          AND a.start_time <  $4::timestamptz
        ORDER BY a.start_time ASC`,
      tenant_id, stylistIds, dayStartUTC.toISOString(), dayEndUTC.toISOString()
    );

    // 3) Tickets abiertos (invoice status='open') con suma por estilista (seller en items)
    const openTickets = stylistIds.length === 0 ? [] : await prisma.$queryRawUnsafe(
      `SELECT ii.seller_id AS stylist_id,
              COUNT(DISTINCT i.id) AS ticket_count,
              COALESCE(SUM(ii.total_price), 0) AS open_total
         FROM invoices i
         JOIN invoice_items ii ON ii.invoice_id = i.id
        WHERE i.tenant_id = $1::uuid
          AND i.status = 'open'
          AND ii.seller_id = ANY($2::uuid[])
        GROUP BY ii.seller_id`,
      tenant_id, stylistIds
    );

    // 4) Posición en fichero (todas las categorías donde está activa la estilista)
    const queueRows = stylistIds.length === 0 ? [] : await prisma.$queryRawUnsafe(
      `SELECT q.stylist_id, q.position, q.is_active, q.last_served_at,
              c.id AS category_id, c.name AS category_name
         FROM stylist_queues q
         LEFT JOIN service_categories c ON q.category_id = c.id
        WHERE q.tenant_id = $1::uuid
          AND q.stylist_id = ANY($2::uuid[])
        ORDER BY q.position ASC`,
      tenant_id, stylistIds
    );

    // 5) Ventas DEL DÍA por estilista (servicios cobrados + productos)
    const salesRows = stylistIds.length === 0 ? [] : await prisma.$queryRawUnsafe(
      `SELECT ii.seller_id AS stylist_id,
              COUNT(*) FILTER (WHERE ii.item_type = 'service') AS services_sold,
              COUNT(*) FILTER (WHERE ii.item_type = 'product') AS products_sold,
              COALESCE(SUM(ii.total_price), 0) AS revenue
         FROM invoice_items ii
         JOIN invoices i ON ii.invoice_id = i.id
        WHERE i.tenant_id = $1::uuid
          AND i.status IN ('paid','closed','completed')
          AND i.created_at >= $3::timestamptz
          AND i.created_at <  $4::timestamptz
          AND ii.seller_id = ANY($2::uuid[])
        GROUP BY ii.seller_id`,
      tenant_id, stylistIds, dayStartUTC.toISOString(), dayEndUTC.toISOString()
    );

    // Index helpers
    const apptByStylist = new Map();
    for (const a of appointments) {
      if (!apptByStylist.has(a.stylist_id)) apptByStylist.set(a.stylist_id, []);
      apptByStylist.get(a.stylist_id).push({
        id: a.id,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        service_name: a.service_name,
        price: Number(a.price || 0),
        client_name: `${a.client_first_name || ''} ${a.client_last_name || ''}`.trim() || 'Walk-in',
        batch_id: a.batch_id,
      });
    }

    const ticketByStylist = new Map();
    for (const t of openTickets) {
      ticketByStylist.set(t.stylist_id, {
        count: Number(t.ticket_count || 0),
        total: Number(t.open_total || 0),
      });
    }

    const queuesByStylist = new Map();
    for (const q of queueRows) {
      if (!queuesByStylist.has(q.stylist_id)) queuesByStylist.set(q.stylist_id, []);
      queuesByStylist.get(q.stylist_id).push({
        category_id: q.category_id,
        category_name: q.category_name || 'Sin categoria',
        position: Number(q.position || 0),
        is_active: !!q.is_active,
        last_served_at: q.last_served_at,
      });
    }

    const salesByStylist = new Map();
    for (const r of salesRows) {
      salesByStylist.set(r.stylist_id, {
        services_sold: Number(r.services_sold || 0),
        products_sold: Number(r.products_sold || 0),
        revenue: Number(r.revenue || 0),
      });
    }

    // Agregados a nivel salón
    const totalAppointments = appointments.length;
    const totalCompleted = appointments.filter(a =>
      ['completed', 'checked_out'].includes(a.status)
    ).length;
    const totalInProgress = appointments.filter(a => a.status === 'checked_in').length;
    const totalRevenue = salesRows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const totalOpenTickets = openTickets.reduce((s, t) => s + Number(t.ticket_count || 0), 0);
    const totalOpenTicketAmount = openTickets.reduce((s, t) => s + Number(t.open_total || 0), 0);
    const totalInSalon = stylists.filter(s => s.is_inside_geofence).length;

    const rows = stylists.map(s => ({
      stylist_id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      avatar_url: s.avatar_url,
      payment_type: s.payment_type,
      geo: {
        in_salon: !!s.is_inside_geofence,
        last_update: s.last_location_update,
      },
      appointments: apptByStylist.get(s.id) || [],
      open_tickets: ticketByStylist.get(s.id) || { count: 0, total: 0 },
      queues: queuesByStylist.get(s.id) || [],
      sales_today: salesByStylist.get(s.id) || { services_sold: 0, products_sold: 0, revenue: 0 },
    }));

    return res.json({
      date,
      summary: {
        stylists_total: stylists.length,
        stylists_in_salon: totalInSalon,
        appointments_total: totalAppointments,
        appointments_completed: totalCompleted,
        appointments_in_progress: totalInProgress,
        revenue_today: totalRevenue,
        open_tickets_count: totalOpenTickets,
        open_tickets_amount: totalOpenTicketAmount,
      },
      stylists: rows,
    });
  } catch (err) {
    console.error('dashboardV2.getStylistsDay error:', err);
    return res.status(500).json({ error: err.message || 'Error interno.' });
  }
};

// GET /api/dashboard-v2/branches-day?date=YYYY-MM-DD
// Vista comparativa multi-sucursal del día. Una columna por sucursal con KPIs,
// proximas 3 citas, proximo turno por categoria del fichero, tickets abiertos
// y revenue. Pensado para reemplazar el SuperCalendar.
exports.getBranchesDay = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    const date = String(req.query.date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Parametro date YYYY-MM-DD requerido.' });
    }

    // Misma ventana local Colombia (UTC-5) que getStylistsDay
    const dayStartUTC = new Date(`${date}T05:00:00.000Z`);
    const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000);
    const nowISO = new Date().toISOString();

    // 1) Resolver grupo de sucursales (mismo metodo que getSuperCalendar)
    const currentTenant = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { id: true, parent_tenant_id: true },
    });
    if (!currentTenant) return res.status(404).json({ error: 'Tenant no encontrado.' });

    let parentId;
    if (currentTenant.parent_tenant_id) {
      parentId = currentTenant.parent_tenant_id;
    } else {
      const hasChildren = await prisma.tenants.count({ where: { parent_tenant_id: currentTenant.id } });
      parentId = hasChildren > 0 ? currentTenant.id : null;
    }

    let branchTenants;
    if (parentId) {
      // Solo sucursales hijas; el padre es agrupador, no opera servicios.
      // Si no hay hijos (caso borde), caer al padre como tenant operativo único.
      const children = await prisma.tenants.findMany({
        where: { parent_tenant_id: parentId },
        select: { id: true, name: true, branch_color: true },
        orderBy: { name: 'asc' },
      });
      if (children.length > 0) {
        branchTenants = children;
      } else {
        const parent = await prisma.tenants.findUnique({
          where: { id: parentId },
          select: { id: true, name: true, branch_color: true },
        });
        branchTenants = parent ? [parent] : [];
      }
    } else {
      const t = await prisma.tenants.findUnique({
        where: { id: tenant_id },
        select: { id: true, name: true, branch_color: true },
      });
      branchTenants = t ? [t] : [];
    }
    const tenantIds = branchTenants.map(t => t.id);
    if (tenantIds.length === 0) {
      return res.json({ date, branches: [] });
    }

    // 2) Stylists por sucursal (totales + dentro de geocerca)
    const stylistAgg = await prisma.$queryRawUnsafe(
      `SELECT tenant_id,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_inside_geofence = true)::int AS in_salon
         FROM users
        WHERE tenant_id = ANY($1::uuid[])
          AND role_id = 3
          AND status = 'active'
        GROUP BY tenant_id`,
      tenantIds
    );

    // 3) Citas del dia por sucursal
    const appointments = await prisma.$queryRawUnsafe(
      `SELECT a.id, a.tenant_id, a.start_time, a.end_time, a.status,
              a.stylist_id, a.service_id, a.client_id,
              s.name AS service_name,
              s.price::numeric AS service_price,
              CONCAT(st.first_name, ' ', COALESCE(st.last_name, '')) AS stylist_name,
              CONCAT(COALESCE(cl.first_name, ''), ' ', COALESCE(cl.last_name, '')) AS client_name
         FROM appointments a
         LEFT JOIN services s ON a.service_id = s.id
         LEFT JOIN users st ON a.stylist_id = st.id
         LEFT JOIN users cl ON a.client_id = cl.id
        WHERE a.tenant_id = ANY($1::uuid[])
          AND a.start_time >= $2::timestamptz
          AND a.start_time <  $3::timestamptz
        ORDER BY a.start_time ASC`,
      tenantIds, dayStartUTC.toISOString(), dayEndUTC.toISOString()
    );

    // 4) Fichero: para cada (sucursal, categoria) tomar el de menor posicion activo.
    //    DISTINCT ON evita N+1 y trae solo el #1 por par.
    const queueRows = await prisma.$queryRawUnsafe(
      `SELECT DISTINCT ON (q.tenant_id, q.category_id)
              q.tenant_id, q.category_id, q.position,
              c.name AS category_name,
              u.id AS stylist_id, u.first_name, u.last_name,
              u.is_inside_geofence
         FROM stylist_queues q
         JOIN service_categories c ON q.category_id = c.id
         JOIN users u ON q.stylist_id = u.id
        WHERE q.tenant_id = ANY($1::uuid[])
          AND q.is_active = true
          AND u.status = 'active'
        ORDER BY q.tenant_id, q.category_id, q.position ASC`,
      tenantIds
    );

    // 5) Tickets abiertos por sucursal
    const openTickets = await prisma.$queryRawUnsafe(
      `SELECT i.tenant_id,
              COUNT(DISTINCT i.id)::int AS ticket_count,
              COALESCE(SUM(ii.total_price), 0) AS open_total
         FROM invoices i
         LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
        WHERE i.tenant_id = ANY($1::uuid[])
          AND i.status = 'open'
        GROUP BY i.tenant_id`,
      tenantIds
    );

    // 6) Revenue del dia (facturas cerradas en la ventana)
    const revenueRows = await prisma.$queryRawUnsafe(
      `SELECT tenant_id,
              COALESCE(SUM(total_amount), 0) AS revenue
         FROM invoices
        WHERE tenant_id = ANY($1::uuid[])
          AND status IN ('paid', 'closed', 'completed')
          AND created_at >= $2::timestamptz
          AND created_at <  $3::timestamptz
        GROUP BY tenant_id`,
      tenantIds, dayStartUTC.toISOString(), dayEndUTC.toISOString()
    );

    // 7) Productos con stock bajo (mismo umbral que SuperCalendar legacy)
    const lowStockRows = await prisma.$queryRawUnsafe(
      `SELECT p.id, p.tenant_id, p.name, p.stock
         FROM products p
        WHERE p.tenant_id = ANY($1::uuid[])
          AND p.stock <= 5
          AND p.is_active = true
        ORDER BY p.stock ASC`,
      tenantIds
    );

    // 8) Ventas DEL DÍA por estilista (servicios cobrados + productos)
    //    Misma fuente que getStylistsDay: invoice_items con status pagado/cerrado.
    const stylistSalesRows = await prisma.$queryRawUnsafe(
      `SELECT inv.tenant_id,
              ii.seller_id AS stylist_id,
              u.first_name, u.last_name,
              COUNT(*) FILTER (WHERE ii.item_type = 'service')::int AS services_sold,
              COUNT(*) FILTER (WHERE ii.item_type = 'product')::int AS products_sold,
              COALESCE(SUM(ii.total_price), 0) AS revenue
         FROM invoice_items ii
         JOIN invoices inv ON ii.invoice_id = inv.id
         LEFT JOIN users u ON ii.seller_id = u.id
        WHERE inv.tenant_id = ANY($1::uuid[])
          AND inv.status IN ('paid','closed','completed')
          AND inv.created_at >= $2::timestamptz
          AND inv.created_at <  $3::timestamptz
          AND ii.seller_id IS NOT NULL
        GROUP BY inv.tenant_id, ii.seller_id, u.first_name, u.last_name
        ORDER BY revenue DESC`,
      tenantIds, dayStartUTC.toISOString(), dayEndUTC.toISOString()
    );

    // Index helpers (todos por tenant_id)
    const stylistByTenant = new Map(stylistAgg.map(r => [r.tenant_id, r]));
    const ticketByTenant = new Map(openTickets.map(r => [r.tenant_id, r]));
    const revenueByTenant = new Map(revenueRows.map(r => [r.tenant_id, Number(r.revenue || 0)]));
    const lowStockByTenant = new Map();
    for (const p of lowStockRows) {
      if (!lowStockByTenant.has(p.tenant_id)) lowStockByTenant.set(p.tenant_id, []);
      lowStockByTenant.get(p.tenant_id).push({ id: p.id, name: p.name, stock: Number(p.stock || 0) });
    }
    const stylistRevByTenant = new Map();
    for (const r of stylistSalesRows) {
      if (!stylistRevByTenant.has(r.tenant_id)) stylistRevByTenant.set(r.tenant_id, []);
      stylistRevByTenant.get(r.tenant_id).push({
        stylist_id: r.stylist_id,
        stylist_name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Sin nombre',
        services_sold: Number(r.services_sold || 0),
        products_sold: Number(r.products_sold || 0),
        revenue: Number(r.revenue || 0),
      });
    }
    const queueByTenant = new Map();
    for (const q of queueRows) {
      if (!queueByTenant.has(q.tenant_id)) queueByTenant.set(q.tenant_id, []);
      queueByTenant.get(q.tenant_id).push({
        category_id: q.category_id,
        category_name: q.category_name,
        position: Number(q.position),
        stylist_id: q.stylist_id,
        stylist_name: `${q.first_name || ''} ${q.last_name || ''}`.trim(),
        in_salon: !!q.is_inside_geofence,
      });
    }

    const apptByTenant = new Map();
    for (const a of appointments) {
      if (!apptByTenant.has(a.tenant_id)) apptByTenant.set(a.tenant_id, []);
      apptByTenant.get(a.tenant_id).push(a);
    }

    // 8) Construir respuesta por sucursal
    const mapAppt = a => ({
      id: a.id,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      service_id: a.service_id,
      service_name: a.service_name || '',
      service_price: Number(a.service_price || 0),
      stylist_id: a.stylist_id,
      stylist_name: (a.stylist_name || '').trim(),
      client_id: a.client_id,
      client_name: (a.client_name || '').trim() || 'Walk-in',
    });

    const branches = branchTenants.map(b => {
      const apts = apptByTenant.get(b.id) || [];
      const completed = apts.filter(a => a.status === 'completed');
      const pendingPayment = apts.filter(a => a.status === 'checked_out');
      const inProgress = apts.filter(a => a.status === 'checked_in');
      const cancelled = apts.filter(a => a.status === 'cancelled');
      const upcoming = apts
        .filter(a => ['scheduled', 'rescheduled', 'pending_approval'].includes(a.status))
        .filter(a => new Date(a.start_time).toISOString() >= nowISO);

      const pendingAmount = pendingPayment.reduce((sum, a) => sum + Number(a.service_price || 0), 0);

      const stAgg = stylistByTenant.get(b.id) || { total: 0, in_salon: 0 };
      const tk = ticketByTenant.get(b.id) || { ticket_count: 0, open_total: 0 };
      const lowStock = lowStockByTenant.get(b.id) || [];

      return {
        id: b.id,
        name: b.name,
        color: b.branch_color || '#3788d8',
        stylists: { total: Number(stAgg.total || 0), in_salon: Number(stAgg.in_salon || 0) },
        appointments: {
          total: apts.length,
          in_progress: inProgress.length,
          completed: completed.length,
          cancelled: cancelled.length,
          upcoming_count: upcoming.length,
          current: inProgress.slice(0, 3).map(mapAppt),
          next: upcoming.slice(0, 8).map(mapAppt),
          pending_payment: pendingPayment.map(mapAppt),
        },
        pending_payment: {
          count: pendingPayment.length,
          amount: pendingAmount,
        },
        fichero: queueByTenant.get(b.id) || [],
        open_tickets: {
          count: Number(tk.ticket_count || 0),
          amount: Number(tk.open_total || 0),
        },
        revenue_today: revenueByTenant.get(b.id) || 0,
        low_stock: { count: lowStock.length, products: lowStock.slice(0, 5) },
        stylist_revenue: (stylistRevByTenant.get(b.id) || []).slice(0, 8),
      };
    });

    return res.json({ date, branches });
  } catch (err) {
    console.error('dashboardV2.getBranchesDay error:', err);
    return res.status(500).json({ error: err.message || 'Error interno.' });
  }
};

// GET /api/dashboard-v2/branch-tickets?tenant_id=<uuid>&date=YYYY-MM-DD
// Lista de tickets (invoices) reales de una sucursal:
//   - open: todas las invoices status='open' (sin filtro de fecha)
//   - paid_today: invoices status in ('paid','closed','completed') con created_at del día
// Validación: tenant_id debe pertenecer al mismo grupo que el usuario autenticado.
exports.getBranchTickets = async (req, res) => {
  try {
    const userTenantId = req.user.tenant_id;
    const overrideId = req.query.tenant_id ? String(req.query.tenant_id) : null;
    let tenant_id = userTenantId;

    if (overrideId && /^[0-9a-f-]{36}$/i.test(overrideId) && overrideId !== userTenantId) {
      const userT = await prisma.tenants.findUnique({
        where: { id: userTenantId },
        select: { id: true, parent_tenant_id: true },
      });
      const overrideT = await prisma.tenants.findUnique({
        where: { id: overrideId },
        select: { id: true, parent_tenant_id: true },
      });
      if (!overrideT) return res.status(404).json({ error: 'Sucursal no encontrada.' });
      const userGroupId = userT?.parent_tenant_id || userT?.id;
      const overrideGroupId = overrideT.parent_tenant_id || overrideT.id;
      if (userGroupId !== overrideGroupId) {
        return res.status(403).json({ error: 'Sucursal fuera del grupo.' });
      }
      tenant_id = overrideId;
    }

    const date = String(req.query.date || '').slice(0, 10);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    const dayStartUTC = validDate ? new Date(`${date}T05:00:00.000Z`) : null;
    const dayEndUTC = dayStartUTC ? new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000) : null;

    // Query open + recently paid invoices con sellers y client name
    const rows = await prisma.$queryRawUnsafe(
      `SELECT i.id, i.status, i.total_amount, i.created_at, i.appointment_id,
              i.client_name_adhoc,
              c.first_name AS client_first_name, c.last_name AS client_last_name,
              (SELECT COUNT(*)::int FROM invoice_items WHERE invoice_id = i.id) AS item_count,
              (SELECT json_agg(DISTINCT u.first_name) FROM invoice_items ii
                LEFT JOIN users u ON ii.seller_id = u.id
                WHERE ii.invoice_id = i.id AND u.id IS NOT NULL) AS seller_first_names,
              (SELECT json_agg(DISTINCT (u.first_name || ' ' || COALESCE(u.last_name, ''))) FROM invoice_items ii
                LEFT JOIN users u ON ii.seller_id = u.id
                WHERE ii.invoice_id = i.id AND u.id IS NOT NULL) AS seller_full_names
         FROM invoices i
         LEFT JOIN users c ON i.client_id = c.id
        WHERE i.tenant_id = $1::uuid
          AND (
            i.status = 'open'
            ${dayStartUTC ? 'OR (i.status IN (\'paid\',\'closed\',\'completed\') AND i.created_at >= $2::timestamptz AND i.created_at < $3::timestamptz)' : ''}
          )
        ORDER BY i.created_at DESC`,
      ...(dayStartUTC
        ? [tenant_id, dayStartUTC.toISOString(), dayEndUTC.toISOString()]
        : [tenant_id])
    );

    const mapTicket = (r) => ({
      id: r.id,
      ref: r.id.slice(0, 8).toUpperCase(),
      status: r.status,
      total_amount: Number(r.total_amount || 0),
      created_at: r.created_at,
      appointment_id: r.appointment_id,
      client_name:
        (`${r.client_first_name || ''} ${r.client_last_name || ''}`.trim()) ||
        r.client_name_adhoc ||
        'Walk-in',
      item_count: Number(r.item_count || 0),
      seller_first_names: Array.isArray(r.seller_first_names) ? r.seller_first_names.filter(Boolean) : [],
      seller_full_names: Array.isArray(r.seller_full_names) ? r.seller_full_names.filter(Boolean) : [],
    });

    const open = rows.filter(r => r.status === 'open').map(mapTicket);
    const paidToday = rows.filter(r => ['paid','closed','completed'].includes(r.status)).map(mapTicket);

    return res.json({
      tenant_id,
      date: validDate ? date : null,
      open,
      paid_today: paidToday,
      summary: {
        open_count: open.length,
        open_total: open.reduce((s, t) => s + t.total_amount, 0),
        paid_today_count: paidToday.length,
        paid_today_total: paidToday.reduce((s, t) => s + t.total_amount, 0),
      },
    });
  } catch (err) {
    console.error('dashboardV2.getBranchTickets error:', err);
    return res.status(500).json({ error: err.message || 'Error interno.' });
  }
};
