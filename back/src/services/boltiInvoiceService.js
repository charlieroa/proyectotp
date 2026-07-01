// =============================================
// File: src/services/boltiInvoiceService.js
// Emite la factura electrónica (DIAN) de una venta/ticket llamando a la API
// pública de Bolti (https://bolti.co/api/public/v1/invoices) con la API key del
// salón. Bolti recalcula totales en servidor y envía a la DIAN; devuelve CUFE.
//
// Las columnas nuevas (bolti_*, cufe, dian_status, document_*) se leen/escriben
// con SQL crudo para no depender de regenerar el cliente Prisma.
// =============================================
const prisma = require('../config/prisma');

const DEFAULT_BOLTI_URL = process.env.BOLTI_API_URL || 'https://bolti.co/api/public/v1';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Normaliza el tipo de documento al estándar que espera la DIAN/Bolti.
function mapDocType(raw) {
  const t = String(raw || '').trim().toUpperCase();
  const map = {
    CC: 'CC', CEDULA: 'CC', 'CÉDULA': 'CC',
    NIT: 'NIT',
    CE: 'CE', 'CEDULA EXTRANJERIA': 'CE',
    PP: 'PP', PASAPORTE: 'PP', PASSPORT: 'PP',
    TI: 'TI',
  };
  return map[t] || 'CC';
}

function mapPaymentMethod(raw) {
  const m = String(raw || 'cash').toLowerCase();
  if (m.includes('card') || m.includes('tarjeta') || m === 'credit_card') return 'TARJETA';
  if (m.includes('transfer') || m.includes('transferencia')) return 'TRANSFERENCIA';
  return 'EFECTIVO';
}

/**
 * Emite la FE de una factura ya cobrada. No lanza: devuelve un objeto con el
 * resultado y deja el estado en invoices.dian_status / fe_error.
 *
 * @param {string} tenantId
 * @param {string} invoiceId
 * @param {{documentType?:string, documentNumber?:string, name?:string, email?:string, paymentMethod?:string}} extra
 *        Datos del adquiriente capturados al cobrar (tienen prioridad sobre lo que ya esté en BD).
 */
async function emitElectronicInvoice(tenantId, invoiceId, extra = {}) {
  try {
    // 1) Config del salón.
    const cfgRows = await prisma.$queryRawUnsafe(
      `SELECT bolti_fe_enabled, bolti_api_key, bolti_api_url FROM tenants WHERE id = $1::uuid`,
      tenantId
    );
    const cfg = cfgRows[0] || {};
    if (!cfg.bolti_fe_enabled || !cfg.bolti_api_key) {
      return { skipped: true, reason: 'fe_not_configured' };
    }
    const baseUrl = (cfg.bolti_api_url && String(cfg.bolti_api_url).trim()) || DEFAULT_BOLTI_URL;

    // 2) Persistir el documento capturado en la factura (queda registrado aunque falle la emisión).
    if (extra.documentNumber || extra.documentType || extra.email) {
      await prisma.$executeRawUnsafe(
        `UPDATE invoices SET
           client_document_type   = COALESCE($1, client_document_type),
           client_document_number = COALESCE($2, client_document_number),
           client_email           = COALESCE($3, client_email)
         WHERE id = $4::uuid AND tenant_id = $5::uuid`,
        extra.documentType ? mapDocType(extra.documentType) : null,
        extra.documentNumber ? String(extra.documentNumber).trim() : null,
        extra.email ? String(extra.email).trim() : null,
        invoiceId, tenantId
      );
    }

    // 3) Leer factura + cliente + tenant.
    const invRows = await prisma.$queryRawUnsafe(
      `SELECT i.id, i.total_amount, i.client_name_adhoc,
              i.client_document_type, i.client_document_number, i.client_email,
              i.cufe AS existing_cufe,
              u.first_name, u.last_name, u.email AS user_email, u.phone AS user_phone,
              u.document_type AS user_doc_type, u.document_number AS user_doc_number,
              t.name AS tenant_name, t.tax_rate
         FROM invoices i
         LEFT JOIN users u ON u.id = i.client_id
         JOIN tenants t ON t.id = i.tenant_id
        WHERE i.id = $1::uuid AND i.tenant_id = $2::uuid`,
      invoiceId, tenantId
    );
    if (!invRows.length) return { skipped: true, reason: 'invoice_not_found' };
    const inv = invRows[0];

    // Idempotencia: si ya tiene CUFE, no re-emitir.
    if (inv.existing_cufe) return { skipped: true, reason: 'already_emitted', cufe: inv.existing_cufe };

    const itemRows = await prisma.$queryRawUnsafe(
      `SELECT description, quantity, unit_price FROM invoice_items WHERE invoice_id = $1::uuid`,
      invoiceId
    );
    if (!itemRows.length) return { skipped: true, reason: 'no_items' };

    // 4) Armar payload. Precios en Tupelukeria son finales (IVA incluido). Si el
    //    salón tiene tax_rate > 0, separamos el IVA para que el total coincida.
    const rate = Number(inv.tax_rate) || 0; // fracción (ej 0.19)
    const taxPct = round2(rate * 100);
    const items = itemRows.map((it) => {
      const gross = Number(it.unit_price) || 0;
      const unitPrice = rate > 0 ? round2(gross / (1 + rate)) : gross;
      return {
        description: it.description || 'Item',
        quantity: Number(it.quantity) || 1,
        unitPrice,
        discount: 0,
        taxRate: taxPct,
      };
    });

    // Adquiriente. Si se capturó un documento real (cédula/NIT del cliente) se factura
    // a su nombre. Si NO hay documento, es una venta a "consumidor final": la DIAN exige
    // el NIT genérico 222222222222 con el nombre literal "CONSUMIDOR FINAL". Mezclar el
    // nombre real de la persona con el documento genérico hace que la DIAN rechace la
    // factura por incoherencia con el RUT (regla FAJ43b y rechazo en cascada de tributos).
    const realDocNumber = String(inv.client_document_number || inv.user_doc_number || '').trim();
    const isFinalConsumer = !realDocNumber || realDocNumber === '222222222222';

    const realName =
      `${inv.first_name || ''} ${inv.last_name || ''}`.trim() ||
      inv.client_name_adhoc ||
      '';

    const docType = isFinalConsumer ? 'NIT' : mapDocType(inv.client_document_type || inv.user_doc_type);
    const docNumber = isFinalConsumer ? '222222222222' : realDocNumber;
    const name = isFinalConsumer ? 'CONSUMIDOR FINAL' : (realName || 'CONSUMIDOR FINAL');
    const email = inv.client_email || inv.user_email || extra.email || '';

    const payload = {
      invoiceClass: 'ELECTRONICA',
      date: new Date().toISOString().slice(0, 10),
      paymentForm: 'CONTADO',
      paymentMethod: mapPaymentMethod(extra.paymentMethod),
      customer: {
        name,
        identificationType: docType,
        identification: docNumber,
        email: email || undefined,
        phone: inv.user_phone || undefined,
      },
      items,
    };

    // 5) Llamar a Bolti (con timeout para no colgar el flujo).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let resp, data;
    try {
      resp = await fetch(`${baseUrl}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.bolti_api_key },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      data = await resp.json().catch(() => ({}));
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok || data?.success === false) {
      const errMsg = data?.error || `HTTP ${resp?.status}`;
      await prisma.$executeRawUnsafe(
        `UPDATE invoices SET dian_status = 'ERROR', fe_error = $1, fe_attempted_at = NOW() WHERE id = $2::uuid`,
        String(errMsg).slice(0, 500), invoiceId
      );
      return { success: false, error: errMsg };
    }

    const cufe = data?.dian?.cufe || null;
    const dianStatus = data?.dian?.dianStatus || (data?.dian?.sent ? 'ENVIADA' : 'BORRADOR');
    const boltiInvoiceId = data?.invoice?.id != null ? String(data.invoice.id) : null;
    const boltiInvoiceNumber = data?.invoice?.invoiceNumber || null;

    await prisma.$executeRawUnsafe(
      `UPDATE invoices SET
         cufe = $1, dian_status = $2, bolti_invoice_id = $3, bolti_invoice_number = $4,
         fe_error = NULL, fe_attempted_at = NOW()
       WHERE id = $5::uuid`,
      cufe, dianStatus, boltiInvoiceId, boltiInvoiceNumber, invoiceId
    );

    return { success: true, cufe, dian_status: dianStatus, bolti_invoice_id: boltiInvoiceId, bolti_invoice_number: boltiInvoiceNumber };
  } catch (e) {
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE invoices SET dian_status = 'ERROR', fe_error = $1, fe_attempted_at = NOW() WHERE id = $2::uuid`,
        String(e.message || e).slice(0, 500), invoiceId
      );
    } catch (_) { /* best-effort */ }
    return { success: false, error: e.message || String(e) };
  }
}

module.exports = { emitElectronicInvoice };
