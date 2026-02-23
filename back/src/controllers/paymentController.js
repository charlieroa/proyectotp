// =============================================
// File: src/controllers/paymentController.js
// VERSIÓN FINAL CORREGIDA - Migrado a Prisma ORM
// =============================================
const prisma = require('../config/prisma');

/**
 * Crea una factura, sus ítems (servicios y productos), actualiza el stock,
 * registra los pagos y los movimientos de caja. TODO en una transacción.
 */
exports.createInvoiceAndPayments = async (req, res) => {
  const { tenant_id, id: cashier_id } = req.user;
  const { client_id, services = [], products = [], payments = [] } = req.body;

  if (!client_id || (services.length === 0 && products.length === 0) || payments.length === 0) {
    return res.status(400).json({ error: 'Faltan datos clave: cliente, items a facturar o información de pago.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1) Validar sesión de caja
      const openSession = await tx.cash_sessions.findFirst({
        where: { tenant_id, status: 'OPEN' },
        select: { id: true }
      });
      if (!openSession) {
        throw new Error("No hay una sesión de caja abierta. No se puede procesar el pago.");
      }
      const cash_session_id = openSession.id;

      // 2) Calcular total usando precios del momento
      let totalServices = 0;
      let totalProducts = 0;

      if (services.length > 0) {
        const svcPrices = await tx.$queryRawUnsafe(
          `SELECT a.id AS appointment_id, s.price::numeric AS price
           FROM appointments a JOIN services s ON a.service_id = s.id
           WHERE a.id = ANY($1::uuid[]) AND a.tenant_id = $2::uuid`,
          services, tenant_id
        );
        totalServices = svcPrices.reduce((acc, r) => acc + Number(r.price || 0), 0);
      }

      if (products.length > 0) {
        for (const p of products) {
          const prodRes = await tx.products.findFirst({
            where: { id: p.product_id, tenant_id },
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
      if (services.length > 0) {
        const stylistsRes = await tx.$queryRawUnsafe(
          `SELECT DISTINCT a.stylist_id FROM appointments a WHERE a.id = ANY($1::uuid[]) AND a.tenant_id = $2::uuid`,
          services, tenant_id
        );
        distinctStylists = stylistsRes.map(r => r.stylist_id);
      }

      // 4) Crear factura
      const invoice = await tx.invoices.create({
        data: {
          tenant_id,
          client_id,
          cash_session_id,
          total_amount: calculatedTotal,
          status: 'open',
        },
        select: { id: true }
      });
      const invoiceId = invoice.id;

      // 5) ÍTEMS DE SERVICIO (congelan precio Y CALCULAN COMISIÓN)
      if (services.length > 0) {
        const svcRows = await tx.$queryRawUnsafe(
          `SELECT
              a.id AS appointment_id,
              a.stylist_id,
              s.name,
              s.price::numeric,
              u.commission_rate
           FROM appointments a
           JOIN services s ON a.service_id = s.id
           JOIN users u ON a.stylist_id = u.id
           WHERE a.id = ANY($1::uuid[]) AND a.tenant_id = $2::uuid`,
          services, tenant_id
        );

        for (const row of svcRows) {
          const { appointment_id, name, price, stylist_id, commission_rate } = row;

          const servicePrice = Number(price || 0);
          const commissionRate = Number(commission_rate || 0);
          const calculatedCommissionValue = servicePrice * commissionRate;

          await tx.invoice_items.create({
            data: {
              invoice_id: invoiceId,
              item_type: 'service',
              related_id: appointment_id,
              description: name,
              quantity: 1,
              unit_price: servicePrice,
              total_price: servicePrice,
              commission_value: calculatedCommissionValue,
              seller_id: stylist_id,
              tenant_id,
            }
          });

          // Marcar appointment como completado
          await tx.$queryRawUnsafe(
            "UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1::uuid AND tenant_id = $2::uuid",
            appointment_id, tenant_id
          );
        }
      }

      // 6) ÍTEMS DE PRODUCTO (con su propia lógica de comisión, si la tuviera)
      if (products.length > 0) {
        for (const p of products) {
          const { product_id, quantity, seller_id = null } = p;
          let sellerToUse = seller_id || null;
          if (!sellerToUse) {
            if (distinctStylists.length === 1) {
              sellerToUse = distinctStylists[0];
            } else {
              throw new Error('Falta "seller_id" en un producto y la factura tiene 0 o múltiples estilistas.');
            }
          }
          const prodRes = await tx.products.findFirst({
            where: { id: product_id, tenant_id },
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
              tenant_id,
            }
          });

          // Stock update with guard: stock >= qty
          const stockUpdate = await tx.$queryRawUnsafe(
            "UPDATE products SET stock = stock - $1 WHERE id = $2::uuid AND tenant_id = $3::uuid AND stock >= $1 RETURNING id",
            qty, product_id, tenant_id
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
            tenant_id,
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
              tenant_id,
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

      // 8) Poner factura en 'paid'
      await tx.invoices.update({
        where: { id: invoiceId },
        data: { status: 'paid' }
      });

      return { invoiceId, calculatedTotal };
    });

    return res.status(201).json({
      success: true,
      message: 'Pago y factura creados con éxito',
      invoiceId: result.invoiceId,
      total_amount: result.calculatedTotal,
    });
  } catch (error) {
    console.error('Error al crear la factura y el pago:', error);
    return res.status(400).json({ error: error.message || 'No se pudo crear la factura.' });
  }
};

/**
 * (Legacy) Obtiene todos los pagos de un tenant.
 */
exports.getPaymentsByTenant = async (_req, res) => {
  res.status(200).json([]);
};
