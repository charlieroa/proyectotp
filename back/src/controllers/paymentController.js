// =============================================
// File: src/controllers/paymentController.js
// VERSIÓN FINAL CORREGIDA - Migrado a Prisma ORM
// =============================================
const prisma = require('../config/prisma');
const { getOrCreateOpenSession } = require('../utils/cashSession');

/**
 * Crea una factura, sus ítems (servicios y productos), actualiza el stock,
 * registra los pagos y los movimientos de caja. TODO en una transacción.
 */
exports.createInvoiceAndPayments = async (req, res) => {
  const { tenant_id: userTenantId, id: cashier_id } = req.user;
  const { client_id, services = [], products = [], payments = [], tip_amount: rawTipAmount = 0, target_tenant_id, tip_recipient_user_id: rawTipRecipientId = null } = req.body;

  // Usar target_tenant_id si viene (cross-branch), sino el del usuario
  let effectiveTenantId = target_tenant_id || userTenantId;

  if (!client_id || (services.length === 0 && products.length === 0) || payments.length === 0) {
    return res.status(400).json({ error: 'Faltan datos clave: cliente, items a facturar o información de pago.' });
  }

  // Validar acceso cross-branch si se usa target_tenant_id
  if (target_tenant_id && target_tenant_id !== userTenantId) {
    const { canAccessTenant } = require('./ficheroController');
    const canAccess = await canAccessTenant(userTenantId, target_tenant_id);
    if (!canAccess) {
      return res.status(403).json({ error: 'No tiene acceso a este negocio.' });
    }
  }

  const tipAmount = Number(rawTipAmount) || 0;
  const tipRecipientId = rawTipRecipientId && String(rawTipRecipientId).trim()
    ? String(rawTipRecipientId).trim()
    : null;

  // Normalizar services: acepta string[] (legacy) u objetos { id, price_override, override_reason }
  const serviceIds = services.map(s => (typeof s === 'string' ? s : s?.id)).filter(Boolean);
  const overrideMap = new Map();
  for (const s of services) {
    if (s && typeof s === 'object' && s.id && s.price_override != null && s.price_override !== '') {
      const n = Number(s.price_override);
      if (Number.isFinite(n) && n >= 0) {
        overrideMap.set(s.id, {
          override: n,
          reason: typeof s.override_reason === 'string' ? s.override_reason.trim().slice(0, 255) : null,
        });
      }
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {

      // 2) Calcular total - buscar appointments por ID sin filtrar por tenant
      //    (ya validamos acceso arriba, y la cita puede estar en otro tenant)
      let totalServices = 0;
      let totalProducts = 0;

      if (serviceIds.length > 0) {
        const svcPrices = await tx.$queryRawUnsafe(
          `SELECT a.id AS appointment_id, a.tenant_id AS appt_tenant_id, s.price::numeric AS price
           FROM appointments a JOIN services s ON a.service_id = s.id
           WHERE a.id = ANY($1::uuid[])`,
          serviceIds
        );
        totalServices = svcPrices.reduce((acc, r) => {
          const ov = overrideMap.get(r.appointment_id);
          return acc + (ov ? ov.override : Number(r.price || 0));
        }, 0);

        // Auto-detectar tenant de las citas si no se especificó target_tenant_id
        // Esto previene que facturas se creen bajo el tenant del cajero en vez del de la cita
        if (!target_tenant_id && svcPrices.length > 0) {
          const apptTenants = [...new Set(svcPrices.map(r => r.appt_tenant_id))];
          if (apptTenants.length === 1 && apptTenants[0] !== userTenantId) {
            effectiveTenantId = apptTenants[0];
          }
        }
      }

      // Si vienen precios modificados, validar que el negocio tenga habilitada la opcion
      if (overrideMap.size > 0) {
        const t = await tx.tenants.findUnique({
          where: { id: effectiveTenantId },
          select: { price_override_enabled: true }
        });
        if (!t?.price_override_enabled) {
          throw new Error('Modificacion de precio no habilitada para este negocio.');
        }
      }

      // 1) Sesion de caja del cajero (apertura automatica si no tiene una abierta)
      const openSession = await getOrCreateOpenSession(tx, effectiveTenantId, cashier_id);
      const cash_session_id = openSession.id;

      if (products.length > 0) {
        for (const p of products) {
          const prodRes = await tx.products.findFirst({
            where: { id: p.product_id, tenant_id: effectiveTenantId },
            select: { sale_price: true }
          });
          if (!prodRes) throw new Error('Producto no encontrado.');
          totalProducts += Number(prodRes.sale_price || 0) * Number(p.quantity || 0);
        }
      }

      const calculatedTotal = totalServices + totalProducts;
      if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
        throw new Error("El total de la factura no puede ser cero o negativo.");
      }

      // 3) Determinar contexto de estilistas
      let distinctStylists = [];
      if (serviceIds.length > 0) {
        const stylistsRes = await tx.$queryRawUnsafe(
          `SELECT DISTINCT a.stylist_id FROM appointments a WHERE a.id = ANY($1::uuid[])`,
          serviceIds
        );
        distinctStylists = stylistsRes.map(r => r.stylist_id);
      }

      // Validar que tip_recipient sea estilista de la factura (si se especificó)
      if (tipRecipientId && tipAmount > 0 && !distinctStylists.includes(tipRecipientId)) {
        throw new Error('El estilista designado para la propina no atiende ningún servicio en esta factura.');
      }

      // 4) Crear factura en el tenant efectivo
      const invoice = await tx.invoices.create({
        data: {
          tenant_id: effectiveTenantId,
          client_id,
          cash_session_id,
          total_amount: calculatedTotal,
          tip_amount: tipAmount,
          tip_recipient_user_id: tipAmount > 0 ? tipRecipientId : null,
          status: 'open',
        },
        select: { id: true }
      });
      const invoiceId = invoice.id;

      // 5) ITEMS DE SERVICIO (congelan precio Y CALCULAN COMISION)
      if (serviceIds.length > 0) {
        const svcRows = await tx.$queryRawUnsafe(
          `SELECT
              a.id AS appointment_id,
              a.tenant_id AS appt_tenant_id,
              a.stylist_id,
              s.name,
              s.price::numeric,
              u.commission_rate
           FROM appointments a
           JOIN services s ON a.service_id = s.id
           JOIN users u ON a.stylist_id = u.id
           WHERE a.id = ANY($1::uuid[])`,
          serviceIds
        );

        for (const row of svcRows) {
          const { appointment_id, appt_tenant_id, name, price, stylist_id, commission_rate } = row;

          const catalogPrice = Number(price || 0);
          const ov = overrideMap.get(appointment_id);
          const chargedPrice = ov ? ov.override : catalogPrice;
          const commissionRate = Number(commission_rate || 0);
          const calculatedCommissionValue = chargedPrice * commissionRate;

          await tx.invoice_items.create({
            data: {
              invoice_id: invoiceId,
              item_type: 'service',
              related_id: appointment_id,
              description: name,
              quantity: 1,
              unit_price: chargedPrice,
              total_price: chargedPrice,
              commission_value: calculatedCommissionValue,
              seller_id: stylist_id,
              tenant_id: effectiveTenantId,
              ...(ov ? {
                original_unit_price: catalogPrice,
                override_reason: ov.reason,
                overridden_by_user_id: cashier_id,
              } : {}),
            }
          });

          // Marcar appointment como completado (usar su propio tenant_id)
          await tx.$queryRawUnsafe(
            "UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1::uuid AND tenant_id = $2::uuid",
            appointment_id, appt_tenant_id
          );
        }
      }

      // 6) ITEMS DE PRODUCTO
      if (products.length > 0) {
        for (const p of products) {
          const { product_id, quantity, seller_id = null } = p;
          let sellerToUse = seller_id || null;
          if (!sellerToUse) {
            if (distinctStylists.length === 1) {
              sellerToUse = distinctStylists[0];
            } else {
              throw new Error('Falta "seller_id" en un producto y la factura tiene 0 o multiples estilistas.');
            }
          }
          const prodRes = await tx.products.findFirst({
            where: { id: product_id, tenant_id: effectiveTenantId },
            select: { name: true, sale_price: true }
          });
          if (!prodRes) throw new Error('Producto no encontrado.');
          const { name: prodName, sale_price } = prodRes;
          const unit = Number(sale_price || 0);
          const qty = Number(quantity || 0);
          const lineTotal = unit * qty;

          await tx.invoice_items.create({
            data: {
              invoice_id: invoiceId,
              item_type: 'product',
              related_id: product_id,
              description: prodName,
              quantity: qty,
              unit_price: unit,
              total_price: lineTotal,
              seller_id: sellerToUse,
              tenant_id: effectiveTenantId,
            }
          });

          // Stock update
          const stockUpdate = await tx.$queryRawUnsafe(
            "UPDATE products SET stock = stock - $1 WHERE id = $2::uuid AND tenant_id = $3::uuid AND stock >= $1 RETURNING id",
            qty, product_id, effectiveTenantId
          );
          if (!stockUpdate || stockUpdate.length === 0) {
            throw new Error(`Stock insuficiente para el producto: ${prodName}`);
          }
        }
      }

      // 7) Registrar Pagos
      for (const p of payments) {
        await tx.payments.create({
          data: {
            tenant_id: effectiveTenantId,
            invoice_id: invoiceId,
            amount: Number(p.amount || 0),
            payment_method: p.payment_method,
            cashier_id,
            cash_session_id,
          }
        });
        if (String(p.payment_method || '').toLowerCase() === 'cash') {
          await tx.cash_movements.create({
            data: {
              tenant_id: effectiveTenantId,
              user_id: cashier_id,
              invoice_id: invoiceId,
              type: 'income',
              description: `Ingreso por Factura #${String(invoiceId).slice(0, 8)}`,
              amount: Number(p.amount || 0),
              category: 'sale',
              payment_method: 'cash',
              cash_session_id,
            }
          });
        }
      }

      // 8) Registrar propina del salon como ingreso en caja
      if (tipAmount > 0) {
        const tenantInfo = await tx.tenants.findUnique({
          where: { id: effectiveTenantId },
          select: { tip_salon_percent: true }
        });
        const tipSalonPercent = Number(tenantInfo?.tip_salon_percent ?? 10);
        const salonTip = Math.round(tipAmount * (tipSalonPercent / 100));

        if (salonTip > 0) {
          await tx.cash_movements.create({
            data: {
              tenant_id: effectiveTenantId,
              user_id: cashier_id,
              invoice_id: invoiceId,
              type: 'income',
              description: `Propina salon (${tipSalonPercent}%) - Factura #${String(invoiceId).slice(0, 8)}`,
              amount: salonTip,
              category: 'propina_salon',
              payment_method: 'cash',
              cash_session_id,
            }
          });
        }
      }

      // 9) Poner factura en 'paid'
      await tx.invoices.update({
        where: { id: invoiceId },
        data: { status: 'paid' }
      });

      return { invoiceId, calculatedTotal, tipAmount };
    });

    return res.status(201).json({
      success: true,
      message: 'Pago y factura creados con éxito',
      invoiceId: result.invoiceId,
      total_amount: result.calculatedTotal,
      tip_amount: result.tipAmount,
    });
  } catch (error) {
    console.error('Error al crear la factura y el pago:', error);
    return res.status(400).json({ error: error.message || 'No se pudo crear la factura.' });
  }
};

/**
 * Envía factura electrónica por email al cliente.
 */
exports.sendElectronicInvoice = async (req, res) => {
  const { invoice_id, client_email } = req.body;
  const tenantId = req.user.tenant_id;

  if (!invoice_id || !client_email) {
    return res.status(400).json({ error: 'Se requiere invoice_id y client_email.' });
  }

  try {
    const invoice = await prisma.invoices.findFirst({
      where: { id: invoice_id, tenant_id: tenantId },
      select: {
        id: true,
        total_amount: true,
        tip_amount: true,
        client_name_adhoc: true,
        users: { select: { first_name: true, last_name: true } },
        tenants: { select: { name: true } },
        invoice_items: {
          select: { description: true, quantity: true, unit_price: true, total_price: true, item_type: true }
        },
        payments: {
          select: { payment_method: true },
          take: 1,
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada.' });
    }

    const clientName =
      `${invoice.users?.first_name || ''} ${invoice.users?.last_name || ''}`.trim() ||
      invoice.client_name_adhoc ||
      'Cliente';
    const paymentMethod = invoice.payments?.[0]?.payment_method || 'mixed';

    const { sendInvoiceEmail } = require('../services/emailService');
    await sendInvoiceEmail({
      to: client_email,
      clientName,
      invoiceId: invoice.id,
      items: invoice.invoice_items,
      totalAmount: Number(invoice.total_amount),
      tenantName: invoice.tenants?.name,
      paymentMethod,
    });

    return res.json({ success: true, message: 'Factura enviada por email.' });
  } catch (error) {
    console.error('Error enviando factura electrónica:', error);
    return res.status(500).json({ error: 'Error al enviar la factura.' });
  }
};

/**
 * (Legacy) Obtiene todos los pagos de un tenant.
 */
exports.getPaymentsByTenant = async (_req, res) => {
  res.status(200).json([]);
};
