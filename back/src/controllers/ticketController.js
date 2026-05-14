// src/controllers/ticketController.js
// Ticket Virtual: una invoice en status='open' que se va llenando de items
// (servicios o productos) con distintos estilistas, y al cerrarse se cobra.
'use strict';

const prisma = require('../config/prisma');
const { getIO } = require('../socket');

const OPEN_STATUS = 'open';
const PAID_STATUS = 'paid';
const CANCELLED_STATUS = 'cancelled';

function emit(tenantId, event, data) {
  try { getIO().to(`tenant:${tenantId}`).emit(event, data); }
  catch (e) { /* socket no crítico */ }
}

async function assertFeatureEnabled(tenant_id) {
  const t = await prisma.tenants.findUnique({
    where: { id: tenant_id },
    select: { ticket_virtual_enabled: true }
  });
  if (!t) { const e = new Error('Tenant no existe.'); e.status = 404; throw e; }
  if (!t.ticket_virtual_enabled) {
    const e = new Error('El ticket virtual no está habilitado para este negocio.');
    e.status = 403;
    throw e;
  }
}

async function recalcTotal(invoice_id) {
  const agg = await prisma.invoice_items.aggregate({
    where: { invoice_id },
    _sum: { total_price: true }
  });
  const total = Number(agg._sum.total_price || 0);
  await prisma.invoices.update({
    where: { id: invoice_id },
    data: { total_amount: total, updated_at: new Date() }
  });
  return total;
}

// Helper compartido: al hacer check-in de una cita, el peluquería "confirma"
// y aquí nace el ticket virtual con la línea del servicio. Si ya existe un
// ticket abierto para esa cita (reabre el mismo). Idempotente.
async function openTicketForAppointmentCheckin({ tenant_id, appointment_id, user_id }) {
  const t = await prisma.tenants.findUnique({
    where: { id: tenant_id },
    select: { ticket_virtual_enabled: true }
  });
  if (!t?.ticket_virtual_enabled) return null; // feature off → no ticket

  // Ya existe un ticket abierto para esta cita?
  const existing = await prisma.invoices.findFirst({
    where: { tenant_id, appointment_id, status: OPEN_STATUS },
    select: { id: true }
  });
  if (existing) return existing.id;

  // Traer la cita con servicio y estilista
  const appt = await prisma.appointments.findFirst({
    where: { id: appointment_id, tenant_id },
    include: {
      services: { select: { id: true, name: true, price: true, commission_percent: true } },
      users_appointments_client_idTousers: {
        select: { id: true, first_name: true, last_name: true, phone: true }
      },
    },
  });
  if (!appt) return null;

  const svc = appt.services;
  const unitPrice = Number(svc?.price || 0);

  // Comisión: par estilista+servicio tiene prioridad; si no, la del servicio
  let commissionPct = null;
  if (appt.stylist_id && svc?.id) {
    const styl = await prisma.stylist_services.findUnique({
      where: { user_id_service_id: { user_id: appt.stylist_id, service_id: svc.id } },
      select: { commission_percent: true }
    }).catch(() => null);
    if (styl?.commission_percent != null) commissionPct = Number(styl.commission_percent);
    else if (svc?.commission_percent != null) commissionPct = Number(svc.commission_percent);
  }
  const commissionValue = commissionPct != null
    ? Math.round((unitPrice * commissionPct / 100) * 100) / 100
    : null;

  const invoice = await prisma.invoices.create({
    data: {
      tenant_id,
      client_id: appt.client_id || null,
      appointment_id,
      opened_by_user_id: user_id,
      status: OPEN_STATUS,
      total_amount: unitPrice,
    },
    select: { id: true },
  });

  // Insertar línea del servicio vía SQL crudo (igual que addItem, para evitar
  // la serialización Decimal de Prisma contra columnas text).
  if (svc) {
    await prisma.$queryRaw`
      INSERT INTO invoice_items (
        invoice_id, tenant_id, item_type, related_id, description,
        quantity, unit_price, total_price, seller_id,
        commission_percent, commission_value, commission_source, commission_locked,
        original_unit_price
      ) VALUES (
        ${invoice.id}::uuid,
        ${tenant_id}::uuid,
        'service',
        ${svc.id}::uuid,
        ${svc.name},
        1,
        ${unitPrice},
        ${unitPrice},
        ${appt.stylist_id || null}::uuid,
        ${commissionPct != null ? String(commissionPct) : null},
        ${commissionValue}::numeric,
        ${commissionPct != null ? 'appointment' : null},
        false,
        ${unitPrice}
      )`;
  }

  try { getIO().to(`tenant:${tenant_id}`).emit('ticket:opened', { id: invoice.id, appointment_id }); }
  catch (_) {}

  return invoice.id;
}
exports.openTicketForAppointmentCheckin = openTicketForAppointmentCheckin;

async function loadTicket(invoice_id, tenant_id) {
  const inv = await prisma.invoices.findFirst({
    where: { id: invoice_id, tenant_id },
    include: {
      invoice_items: {
        include: {
          users: { select: { id: true, first_name: true, last_name: true } }
        },
        orderBy: { id: 'asc' }
      },
      users: { select: { id: true, first_name: true, last_name: true, phone: true } },
      opened_by_user: { select: { id: true, first_name: true, last_name: true } },
      appointment: { select: { id: true, start_time: true, stylist_id: true } }
    }
  });
  return inv;
}

// -----------------------------------------------------------------------------
// POST /tickets/open   Abrir un ticket virtual nuevo.
// Body: { client_id?, client_name_adhoc?, appointment_id? }
// -----------------------------------------------------------------------------
exports.openTicket = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const { client_id, client_name_adhoc, appointment_id } = req.body || {};

    if (!client_id && !client_name_adhoc) {
      return res.status(400).json({ error: 'Debes indicar client_id o client_name_adhoc.' });
    }

    // Si viene con appointment_id, evitar duplicar ticket abierto para la misma cita
    if (appointment_id) {
      const existing = await prisma.invoices.findFirst({
        where: { tenant_id, appointment_id, status: OPEN_STATUS },
        select: { id: true }
      });
      if (existing) {
        const full = await loadTicket(existing.id, tenant_id);
        return res.status(200).json(full);
      }
    }

    const inv = await prisma.invoices.create({
      data: {
        tenant_id,
        client_id: client_id || null,
        client_name_adhoc: client_id ? null : (client_name_adhoc || null),
        appointment_id: appointment_id || null,
        opened_by_user_id: user_id,
        status: OPEN_STATUS,
        total_amount: 0
      }
    });

    const full = await loadTicket(inv.id, tenant_id);
    emit(tenant_id, 'ticket:opened', full);
    return res.status(201).json(full);
  } catch (err) {
    console.error('openTicket error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// GET /tickets/active   Tickets abiertos del tenant.
// Query: ?stylist_id=<uuid>  (filtra por seller_id presente en algún item)
// -----------------------------------------------------------------------------
exports.listActive = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const where = { tenant_id, status: OPEN_STATUS };
    if (req.query.stylist_id) {
      where.invoice_items = { some: { seller_id: String(req.query.stylist_id) } };
    }

    const tickets = await prisma.invoices.findMany({
      where,
      include: {
        invoice_items: {
          include: { users: { select: { id: true, first_name: true, last_name: true } } }
        },
        users: { select: { id: true, first_name: true, last_name: true, phone: true } },
        opened_by_user: { select: { id: true, first_name: true, last_name: true } },
        appointment: { select: { id: true, start_time: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json(tickets);
  } catch (err) {
    console.error('listActive error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// GET /tickets/:id   Detalle.
// -----------------------------------------------------------------------------
exports.getTicket = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await assertFeatureEnabled(tenant_id);
    const t = await loadTicket(req.params.id, tenant_id);
    if (!t) return res.status(404).json({ error: 'Ticket no encontrado.' });
    return res.json(t);
  } catch (err) {
    console.error('getTicket error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// POST /tickets/:id/items   Agregar línea.
// Body: {
//   item_type: 'service'|'product'|'custom',
//   related_id?, description, quantity, unit_price,
//   seller_id, commission_percent?, override_reason?
// }
// -----------------------------------------------------------------------------
exports.addItem = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const invoice = await prisma.invoices.findFirst({
      where: { id: req.params.id, tenant_id },
      select: { id: true, status: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Ticket no encontrado.' });
    if (invoice.status !== OPEN_STATUS) {
      return res.status(409).json({ error: 'El ticket ya está cerrado o cancelado.' });
    }

    const {
      item_type, related_id, description, quantity, unit_price,
      seller_id, commission_percent, override_reason
    } = req.body || {};

    if (!item_type || !['service', 'product', 'custom'].includes(item_type)) {
      return res.status(400).json({ error: 'item_type inválido.' });
    }
    if (!description || String(description).trim() === '') {
      return res.status(400).json({ error: 'description es obligatorio.' });
    }
    const qty = Number(quantity);
    const price = Number(unit_price);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'quantity debe ser > 0.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: 'unit_price debe ser >= 0.' });
    }

    // Snapshot del precio de catálogo y comisión si es un servicio
    let originalUnitPrice = null;
    let resolvedCommissionPct = commission_percent != null ? Number(commission_percent) : null;

    if (item_type === 'service' && related_id) {
      const svc = await prisma.services.findFirst({
        where: { id: related_id, tenant_id },
        select: { price: true, commission_percent: true }
      });
      if (svc) {
        originalUnitPrice = Number(svc.price);
        if (resolvedCommissionPct == null && seller_id) {
          // Si no vino comisión, busco la del par estilista+servicio
          const styl = await prisma.stylist_services.findUnique({
            where: { user_id_service_id: { user_id: seller_id, service_id: related_id } },
            select: { commission_percent: true }
          }).catch(() => null);
          resolvedCommissionPct = styl?.commission_percent != null
            ? Number(styl.commission_percent)
            : (svc.commission_percent != null ? Number(svc.commission_percent) : null);
        }
      }
    }

    const total_price = Math.round(qty * price * 100) / 100;
    const isOverride = originalUnitPrice != null && originalUnitPrice !== price;
    if (isOverride) {
      const t = await prisma.tenants.findUnique({
        where: { id: tenant_id },
        select: { price_override_enabled: true },
      });
      if (!t?.price_override_enabled) {
        return res.status(403).json({
          error: 'La modificación de precios en tickets está deshabilitada. Actívala en Configuración > Datos del negocio.',
        });
      }
    }
    const commission_value = resolvedCommissionPct != null
      ? Math.round((total_price * Number(resolvedCommissionPct) / 100) * 100) / 100
      : null;

    // commission_percent/value/frozen_at/admin_fee_* son 'text' en la BD aunque
    // el schema Prisma los declare Decimal/DateTime. Usamos SQL crudo para evitar
    // la serialización Decimal de Prisma que inyecta bytes 0x00 contra columnas text.
    const commission_source = resolvedCommissionPct != null ? 'ticket' : null;
    const override_reason_val = isOverride ? (override_reason || null) : null;
    const overridden_by_val   = isOverride ? user_id : null;
    const itemRows = await prisma.$queryRaw`
      INSERT INTO invoice_items (
        invoice_id, tenant_id, item_type, related_id, description,
        quantity, unit_price, total_price, seller_id,
        commission_percent, commission_value, commission_source, commission_locked,
        original_unit_price, override_reason, overridden_by_user_id
      ) VALUES (
        ${invoice.id}::uuid,
        ${tenant_id}::uuid,
        ${item_type},
        ${related_id || null}::uuid,
        ${String(description).trim()},
        ${Math.trunc(qty)},
        ${price},
        ${total_price},
        ${seller_id || null}::uuid,
        ${resolvedCommissionPct != null ? String(resolvedCommissionPct) : null},
        ${commission_value}::numeric,
        ${commission_source},
        ${false},
        ${originalUnitPrice},
        ${override_reason_val},
        ${overridden_by_val}::uuid
      )
      RETURNING *`;
    const item = itemRows[0];

    await recalcTotal(invoice.id);
    const full = await loadTicket(invoice.id, tenant_id);
    emit(tenant_id, 'ticket:updated', full);
    return res.status(201).json({ item, ticket: full });
  } catch (err) {
    console.error('addItem error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// PATCH /tickets/:id/items/:itemId   Editar línea.
// -----------------------------------------------------------------------------
exports.patchItem = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const { id, itemId } = req.params;
    const invoice = await prisma.invoices.findFirst({
      where: { id, tenant_id }, select: { id: true, status: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Ticket no encontrado.' });
    if (invoice.status !== OPEN_STATUS) {
      return res.status(409).json({ error: 'Ticket cerrado.' });
    }

    const item = await prisma.invoice_items.findFirst({
      where: { id: itemId, invoice_id: invoice.id, tenant_id }
    });
    if (!item) return res.status(404).json({ error: 'Línea no encontrada.' });

    // Construyo los valores finales (si el body no trae algo, uso el valor actual)
    let qty = Number(item.quantity);
    let price = Number(item.unit_price);
    if (req.body.quantity !== undefined) {
      qty = Number(req.body.quantity);
      if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'quantity inválido.' });
    }
    if (req.body.unit_price !== undefined) {
      price = Number(req.body.unit_price);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'unit_price inválido.' });
      // Solo se permite modificar el precio si el tenant lo habilitó en Settings
      // y solo si el precio realmente cambia respecto al original del catálogo.
      const original = item.original_unit_price != null ? Number(item.original_unit_price) : null;
      if (original != null && price !== original) {
        const t = await prisma.tenants.findUnique({
          where: { id: tenant_id },
          select: { price_override_enabled: true },
        });
        if (!t?.price_override_enabled) {
          return res.status(403).json({
            error: 'La modificación de precios en tickets está deshabilitada. Actívala en Configuración > Datos del negocio.',
          });
        }
      }
    }
    const total_price = Math.round(qty * price * 100) / 100;

    const description = req.body.description !== undefined
      ? String(req.body.description).trim()
      : item.description;
    const seller_id = req.body.seller_id !== undefined
      ? (req.body.seller_id || null)
      : item.seller_id;

    // Override: solo se marca si el precio cambió respecto al original del catálogo
    const priceChanged = item.original_unit_price != null
      && Number(item.original_unit_price) !== price;
    const override_reason = priceChanged
      ? (req.body.override_reason ?? item.override_reason ?? null)
      : item.override_reason;
    const overridden_by_user_id = priceChanged ? user_id : item.overridden_by_user_id;

    // Comisión: recalculo según el nuevo total_price
    let commissionPct = item.commission_percent != null
      ? Number(item.commission_percent) : null;
    if (req.body.commission_percent !== undefined) {
      commissionPct = req.body.commission_percent === null
        ? null : Number(req.body.commission_percent);
    }
    const commissionValue = commissionPct != null
      ? Math.round((total_price * commissionPct / 100) * 100) / 100
      : null;

    // commission_percent / commission_frozen_at son TEXT en BD — usamos SQL crudo con casts.
    const updatedRows = await prisma.$queryRaw`
      UPDATE invoice_items SET
        description    = ${description},
        seller_id      = ${seller_id}::uuid,
        quantity       = ${Math.trunc(qty)},
        unit_price     = ${price}::numeric,
        total_price    = ${total_price}::numeric,
        commission_percent    = ${commissionPct != null ? String(commissionPct) : null},
        commission_value      = ${commissionValue}::numeric,
        override_reason       = ${override_reason},
        overridden_by_user_id = ${overridden_by_user_id}::uuid
      WHERE id = ${itemId}::uuid
      RETURNING *`;
    const updated = updatedRows[0];
    await recalcTotal(invoice.id);
    const full = await loadTicket(invoice.id, tenant_id);
    emit(tenant_id, 'ticket:updated', full);
    return res.json({ item: updated, ticket: full });
  } catch (err) {
    console.error('patchItem error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// DELETE /tickets/:id/items/:itemId
// -----------------------------------------------------------------------------
exports.deleteItem = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const { id, itemId } = req.params;
    const invoice = await prisma.invoices.findFirst({
      where: { id, tenant_id }, select: { id: true, status: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Ticket no encontrado.' });
    if (invoice.status !== OPEN_STATUS) {
      return res.status(409).json({ error: 'Ticket cerrado.' });
    }

    const del = await prisma.invoice_items.deleteMany({
      where: { id: itemId, invoice_id: invoice.id, tenant_id }
    });
    if (del.count === 0) return res.status(404).json({ error: 'Línea no encontrada.' });

    await recalcTotal(invoice.id);
    const full = await loadTicket(invoice.id, tenant_id);
    emit(tenant_id, 'ticket:updated', full);
    return res.json({ ok: true, ticket: full });
  } catch (err) {
    console.error('deleteItem error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// POST /tickets/:id/close   Cobrar: pasa a status 'paid', congela comisiones,
// vincula cash_session, registra payment + cash_movement + split propina salón.
// Body: { tip_amount?, payment_method? }  // cash_session_id se deriva del cajero
// -----------------------------------------------------------------------------
exports.closeTicket = async (req, res) => {
  try {
    const { tenant_id, id: user_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const invoice = await prisma.invoices.findFirst({
      where: { id: req.params.id, tenant_id },
      include: { invoice_items: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Ticket no encontrado.' });
    if (invoice.status !== OPEN_STATUS) {
      return res.status(409).json({ error: 'El ticket no está abierto.' });
    }
    if (invoice.invoice_items.length === 0) {
      return res.status(400).json({ error: 'No se puede cobrar un ticket sin líneas.' });
    }

    const { tip_amount, payment_method, tip_recipient_user_id } = req.body || {};
    const tip = Number.isFinite(Number(tip_amount)) ? Number(tip_amount) : 0;
    const method = String(payment_method || 'cash').toLowerCase();
    const tipRecipientId = tip_recipient_user_id && String(tip_recipient_user_id).trim()
      ? String(tip_recipient_user_id).trim()
      : null;

    // El destinatario de la propina puede ser cualquier estilista del salón
    // (no se restringe a sellers del ticket).

    // Caja: para método 'cash' es obligatorio que el cajero tenga sesión abierta.
    // Para tarjeta/transferencia se intenta vincular a la sesión abierta pero no es
    // bloqueante (el movimiento no entra a caja efectivo).
    const openSession = await prisma.cash_sessions.findFirst({
      where: { tenant_id, status: 'OPEN', opened_by_user_id: user_id },
      select: { id: true }
    });
    if (method === 'cash' && !openSession) {
      return res.status(400).json({
        error: 'No tienes una sesión de caja abierta. Abre tu caja antes de cobrar en efectivo.'
      });
    }
    const cash_session_id = openSession ? openSession.id : null;

    // Leer % propina del salón para el split
    const tenantRow = await prisma.tenants.findUnique({
      where: { id: tenant_id },
      select: { tip_salon_percent: true }
    });
    const tipSalonPercent = Number(tenantRow?.tip_salon_percent ?? 10);
    const salonTip = tip > 0 ? Math.round(tip * (tipSalonPercent / 100)) : 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1) Congelar comisiones en cada línea (commission_frozen_at es TEXT en BD)
      await tx.$executeRawUnsafe(
        `UPDATE invoice_items SET commission_locked = true, commission_frozen_at = $1 WHERE invoice_id = $2::uuid`,
        new Date().toISOString(),
        invoice.id
      );

      // 2) Recalcular total por si hubo cambios sin recalc
      const agg = await tx.invoice_items.aggregate({
        where: { invoice_id: invoice.id },
        _sum: { total_price: true }
      });
      const total = Number(agg._sum.total_price || 0);

      // 3) Marcar ticket como paid + vincular cash_session
      const updated = await tx.invoices.update({
        where: { id: invoice.id },
        data: {
          status: PAID_STATUS,
          total_amount: total,
          tip_amount: tip,
          tip_recipient_user_id: tip > 0 ? tipRecipientId : null,
          cash_session_id,
          closed_at: new Date(),
          updated_at: new Date()
        }
      });

      // 4) Registrar payment (amount incluye propina)
      await tx.payments.create({
        data: {
          tenant_id,
          invoice_id: invoice.id,
          amount: total + tip,
          payment_method: method,
          cashier_id: user_id,
          cash_session_id
        }
      });

      // 5) Si es efectivo, crear cash_movement de ingreso por la venta
      if (method === 'cash' && cash_session_id) {
        await tx.cash_movements.create({
          data: {
            tenant_id,
            user_id,
            invoice_id: invoice.id,
            type: 'income',
            description: `Ingreso por Ticket #${String(invoice.id).slice(0, 8)}`,
            amount: total,
            category: 'sale',
            payment_method: 'cash',
            cash_session_id
          }
        });

        // 6) Si hay propina, registrar la parte del salón como ingreso de caja
        //    (la parte del estilista no entra a caja — es del estilista)
        if (salonTip > 0) {
          await tx.cash_movements.create({
            data: {
              tenant_id,
              user_id,
              invoice_id: invoice.id,
              type: 'income',
              description: `Propina salón (${tipSalonPercent}%) - Ticket #${String(invoice.id).slice(0, 8)}`,
              amount: salonTip,
              category: 'propina_salon',
              payment_method: 'cash',
              cash_session_id
            }
          });
        }
      }

      return updated;
    });

    const full = await loadTicket(invoice.id, tenant_id);
    emit(tenant_id, 'ticket:closed', full);
    return res.json({ ok: true, invoice: result, ticket: full });
  } catch (err) {
    console.error('closeTicket error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};

// -----------------------------------------------------------------------------
// POST /tickets/:id/cancel   Anular ticket (sin cobro).
// -----------------------------------------------------------------------------
exports.cancelTicket = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    await assertFeatureEnabled(tenant_id);

    const invoice = await prisma.invoices.findFirst({
      where: { id: req.params.id, tenant_id },
      select: { id: true, status: true }
    });
    if (!invoice) return res.status(404).json({ error: 'Ticket no encontrado.' });
    if (invoice.status !== OPEN_STATUS) {
      return res.status(409).json({ error: 'Solo se pueden cancelar tickets abiertos.' });
    }

    const updated = await prisma.invoices.update({
      where: { id: invoice.id },
      data: { status: CANCELLED_STATUS, closed_at: new Date(), updated_at: new Date() }
    });
    emit(tenant_id, 'ticket:cancelled', updated);
    return res.json({ ok: true, invoice: updated });
  } catch (err) {
    console.error('cancelTicket error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno.' });
  }
};
