const prisma = require('../config/prisma');

// Sanitiza strings para eliminar null bytes (0x00) que PostgreSQL no acepta en UTF-8
const sanitizeStr = (val) => (typeof val === 'string' ? val.replace(/\0/g, '') : val);

/**
 * Función centralizada para calcular el desglose de la nómina para un estilista.
 * (VERSIÓN CORREGIDA FINAL - Migrada a Prisma)
 */
const calculateStylistPayrollBreakdown = async (tenant_id, stylist, start_date, raw_end_date) => {
    // Hacer end_date inclusivo: si viene '2026-03-31', buscar hasta '2026-04-01 00:00:00'
    const endDateObj = new Date(raw_end_date);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const end_date = endDateObj.toISOString();

    const tenantRow = await prisma.tenants.findUnique({
        where: { id: tenant_id },
        select: { admin_fee_enabled: true, admin_fee_rate: true, tip_salon_percent: true }
    });
    const { admin_fee_enabled, admin_fee_rate, tip_salon_percent } = tenantRow || {};

    // 1. Obtener Ingresos (Servicios y Productos)
    // Servicios: filtrar por fecha de CITA (ap.start_time), no de factura
    // Productos: filtrar por fecha de factura (inv.created_at)
    const salesRows = await prisma.$queryRawUnsafe(
        `SELECT
            ii.item_type, ii.total_price, ii.commission_value,
            s.name as service_name, u_client.first_name || ' ' || u_client.last_name as client_name
         FROM invoice_items ii
         JOIN invoices inv ON ii.invoice_id = inv.id
         LEFT JOIN appointments ap ON ii.related_id = ap.id AND ii.item_type = 'service'
         LEFT JOIN services s ON ap.service_id = s.id
         LEFT JOIN users u_client ON inv.client_id = u_client.id
         WHERE inv.tenant_id = $1::uuid AND COALESCE(ap.stylist_id, ii.seller_id) = $4::uuid
           AND inv.status IN ('paid', 'closed', 'completed')
           AND (
             (ii.item_type = 'service' AND ap.start_time >= $2::timestamptz AND ap.start_time < $3::timestamptz)
             OR
             (ii.item_type = 'product' AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz)
           )`,
        tenant_id, start_date, end_date, stylist.id
    );

    // 2. Obtener Egresos (Anticipos, Cuotas de Préstamos, Compras)
    const expensesRows = await prisma.$queryRawUnsafe(
        `(SELECT 'advance' as type, amount, description FROM cash_movements WHERE type = 'payroll_advance' AND tenant_id = $1::uuid AND related_entity_id = $2::uuid AND created_at >= $3::timestamptz AND created_at < $4::timestamptz)
         UNION ALL
         (SELECT 'loan' as type, sli.total_amount as amount, 'Cuota #' || sli.installment_no || ' Préstamo ' || sl.id::text AS description
          FROM staff_loan_installments sli
          JOIN staff_loans sl ON sli.loan_id = sl.id
          WHERE sl.tenant_id = $1::uuid AND sl.stylist_id = $2::uuid AND sl.status = 'active'
            AND sli.status = 'pending' AND sli.due_date <= $4::date
         )
         UNION ALL
         (SELECT 'purchase' as type, total_amount as amount, 'Compra de Personal ID ' || id::text as description FROM staff_purchases WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid AND status = 'pendiente' AND purchase_date < $4::timestamptz)`,
        tenant_id, stylist.id, start_date, end_date
    );

    const details = { services: [], products: [], expenses: [] };
    let service_commissions_total = 0;

    // Calcular comisiones de servicios detalladamente
    salesRows.filter(item => item.item_type === 'service').forEach(service => {
        const gross_commission = Number(service.total_price) * Number(stylist.commission_rate || 0);
        const salon_share = Number(service.total_price) - gross_commission;
        const admin_fee = (admin_fee_enabled && admin_fee_rate) ? salon_share * Number(admin_fee_rate) : 0;
        const net_commission = gross_commission - admin_fee;

        service_commissions_total += net_commission;
        details.services.push({
            client_name: service.client_name,
            service_name: service.service_name,
            service_price: Number(service.total_price),
            net_commission,
            admin_fee
        });
    });

    const product_commissions_total = salesRows.filter(item => item.item_type === 'product').reduce((sum, p) => sum + Number(p.commission_value), 0);
    details.products = salesRows.filter(item => item.item_type === 'product');

    const expenses_total = expensesRows.reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
    details.expenses = expensesRows;

    // Propinas del estilista en el periodo. Si la factura tiene tip_recipient_user_id,
    // ese estilista recibe el 100% de la propina; si no, se reparte equitativamente
    // entre los estilistas únicos que tengan items de servicio en la factura.
    const tipsRows = await prisma.$queryRawUnsafe(
        `WITH inv AS (
           SELECT i.id, i.tip_amount, i.tip_recipient_user_id,
                  COALESCE(
                    (SELECT MIN(ap.start_time)
                     FROM invoice_items ii
                     LEFT JOIN appointments ap ON ii.related_id = ap.id
                     WHERE ii.invoice_id = i.id AND ii.item_type = 'service'),
                    i.created_at
                  ) AS event_date
           FROM invoices i
           WHERE i.tenant_id = $1::uuid
             AND i.tip_amount > 0
             AND i.status IN ('paid','closed','completed')
         ),
         sellers_per_inv AS (
           SELECT invoice_id, seller_id,
                  COUNT(*) OVER (PARTITION BY invoice_id) AS cnt
           FROM (
             SELECT DISTINCT invoice_id, seller_id
             FROM invoice_items
             WHERE item_type = 'service' AND seller_id IS NOT NULL
           ) x
         ),
         splits AS (
           SELECT inv.id AS invoice_id, inv.tip_recipient_user_id AS stylist_id,
                  inv.tip_amount AS share, inv.event_date
           FROM inv
           WHERE inv.tip_recipient_user_id IS NOT NULL
           UNION ALL
           SELECT inv.id, s.seller_id, inv.tip_amount / s.cnt, inv.event_date
           FROM inv
           JOIN sellers_per_inv s ON s.invoice_id = inv.id
           WHERE inv.tip_recipient_user_id IS NULL
         )
         SELECT COALESCE(SUM(share), 0) AS total_tips
         FROM splits
         WHERE stylist_id = $4::uuid
           AND event_date >= $2::timestamptz AND event_date < $3::timestamptz`,
        tenant_id, start_date, end_date, stylist.id
    );
    const totalTips = Number(tipsRows[0]?.total_tips || 0);
    const tipSalonPct = Number(tip_salon_percent ?? 10);
    const stylist_tips = Math.round(totalTips * (1 - tipSalonPct / 100));

    const base_salary = stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0;
    const gross_total = base_salary + service_commissions_total + product_commissions_total + stylist_tips;
    let net_paid = gross_total - expenses_total;

    // Regla de Negocio: Aplicar pago mínimo
    if (net_paid < 8000) {
        net_paid = 0;
    }

    return {
        stylist_id: stylist.id,
        stylist_name: `${stylist.first_name} ${stylist.last_name || ''}`.trim(),
        payment_type: stylist.payment_type,
        net_paid,
        stylist_tips,
        details
    };
};

// --- VISTA PREVIA DETALLADA (FUNCIÓN PRINCIPAL) ---
exports.getPayrollDetailedPreview = async (req, res) => {
    const { tenant_id } = req.user;
    const { start_date, end_date: raw_end_date } = req.query;

    if (!start_date || !raw_end_date) {
        return res.status(400).json({ error: 'Se requieren start_date y end_date.' });
    }

    // Hacer end_date inclusivo: si viene '2026-03-31', buscar hasta '2026-04-01 00:00:00'
    const endDateObj = new Date(raw_end_date);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const end_date = endDateObj.toISOString();

    try {
        const tenantRow = await prisma.tenants.findUnique({
            where: { id: tenant_id },
            select: { admin_fee_enabled: true, admin_fee_rate: true, tip_salon_percent: true }
        });
        const { admin_fee_enabled, admin_fee_rate, tip_salon_percent } = tenantRow || {};

        const localStylists = await prisma.users.findMany({
            where: { tenant_id, role_id: 3, status: 'active' },
            select: { id: true, first_name: true, last_name: true, payment_type: true, base_salary: true, commission_rate: true }
        });

        // Incluir estilistas cross-branch que tengan ventas en este tenant
        const crossBranchSellers = await prisma.$queryRawUnsafe(
            `SELECT DISTINCT u.id, u.first_name, u.last_name, u.payment_type, u.base_salary, u.commission_rate
             FROM invoice_items ii
             JOIN invoices inv ON ii.invoice_id = inv.id
             JOIN users u ON ii.seller_id = u.id
             LEFT JOIN appointments ap ON ii.related_id = ap.id AND ii.item_type = 'service'
             WHERE inv.tenant_id = $1::uuid
               AND inv.status IN ('paid','closed','completed')
               AND u.tenant_id != $1::uuid
               AND (
                 (ii.item_type = 'service' AND ap.start_time >= $2::timestamptz AND ap.start_time < $3::timestamptz)
                 OR
                 (ii.item_type = 'product' AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz)
               )`,
            tenant_id, start_date, end_date
        );

        const localIds = new Set(localStylists.map(s => s.id));
        const stylistsRows = [...localStylists];
        for (const seller of crossBranchSellers) {
            if (!localIds.has(seller.id)) {
                stylistsRows.push(seller);
            }
        }

        // Servicios: filtrar por fecha de CITA (ap.start_time)
        const servicesRows = await prisma.$queryRawUnsafe(
            `SELECT ap.stylist_id, u.first_name || ' ' || u.last_name as client_name, s.name as service_name, ii.total_price as service_price FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id JOIN appointments ap ON ii.related_id = ap.id JOIN services s ON ap.service_id = s.id JOIN users u ON inv.client_id = u.id WHERE ii.item_type = 'service' AND inv.tenant_id = $1::uuid AND ap.start_time >= $2::timestamptz AND ap.start_time < $3::timestamptz AND inv.status IN ('paid','closed','completed')`,
            tenant_id, start_date, end_date
        );

        const productsRows = await prisma.$queryRawUnsafe(
            `SELECT ii.seller_id as stylist_id, p.name as product_name, ii.commission_value FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id JOIN products p ON ii.related_id = p.id WHERE ii.item_type = 'product' AND inv.tenant_id = $1::uuid AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz`,
            tenant_id, start_date, end_date
        );

        // Propinas por estilista en el periodo. Si la factura tiene tip_recipient_user_id,
        // ese estilista recibe el 100% de la propina; si no, se reparte equitativamente
        // entre los estilistas únicos que tengan items de servicio en la factura.
        const tipsRows = await prisma.$queryRawUnsafe(
            `WITH inv AS (
               SELECT i.id, i.tip_amount, i.tip_recipient_user_id,
                      COALESCE(
                        (SELECT MIN(ap.start_time)
                         FROM invoice_items ii
                         LEFT JOIN appointments ap ON ii.related_id = ap.id
                         WHERE ii.invoice_id = i.id AND ii.item_type = 'service'),
                        i.created_at
                      ) AS event_date
               FROM invoices i
               WHERE i.tenant_id = $1::uuid
                 AND i.tip_amount > 0
                 AND i.status IN ('paid','closed','completed')
             ),
             sellers_per_inv AS (
               SELECT invoice_id, seller_id,
                      COUNT(*) OVER (PARTITION BY invoice_id) AS cnt
               FROM (
                 SELECT DISTINCT invoice_id, seller_id
                 FROM invoice_items
                 WHERE item_type = 'service' AND seller_id IS NOT NULL
               ) x
             ),
             splits AS (
               SELECT inv.id AS invoice_id, inv.tip_recipient_user_id AS stylist_id,
                      inv.tip_amount AS share, inv.event_date
               FROM inv
               WHERE inv.tip_recipient_user_id IS NOT NULL
               UNION ALL
               SELECT inv.id, s.seller_id, inv.tip_amount / s.cnt, inv.event_date
               FROM inv
               JOIN sellers_per_inv s ON s.invoice_id = inv.id
               WHERE inv.tip_recipient_user_id IS NULL
             )
             SELECT stylist_id, COALESCE(SUM(share), 0) AS total_tips
             FROM splits
             WHERE event_date >= $2::timestamptz AND event_date < $3::timestamptz
             GROUP BY stylist_id`,
            tenant_id, start_date, end_date
        );

        // Egresos filtrados por periodo para anticipos, cuotas de préstamos pendientes, compras pendientes
        const expensesRows = await prisma.$queryRawUnsafe(`
            (SELECT related_entity_id as stylist_id, amount, description FROM cash_movements WHERE type = 'payroll_advance' AND tenant_id = $1::uuid AND status = 'pending' AND created_at >= $2::timestamptz AND created_at < $3::timestamptz)
            UNION ALL
            (SELECT sl.stylist_id, sli.total_amount as amount, 'Cuota #' || sli.installment_no || ' Préstamo ' || sl.id::text AS description
             FROM staff_loan_installments sli
             JOIN staff_loans sl ON sli.loan_id = sl.id
             WHERE sl.tenant_id = $1::uuid AND sl.status = 'active'
               AND sli.status = 'pending' AND sli.due_date <= $3::date
            )
            UNION ALL
            (SELECT stylist_id, total_amount as amount, 'Compra de Personal ID ' || id::text as description FROM staff_purchases WHERE tenant_id = $1::uuid AND status = 'pendiente' AND purchase_date < $3::timestamptz)`,
            tenant_id, start_date, end_date
        );

        const tipSalonPct = Number(tip_salon_percent ?? 10);

        let stylist_breakdowns = stylistsRows.map(stylist => {
            const details = { services: [], products: [], expenses: [] };
            let service_commissions_total = 0;

            servicesRows.filter(s => s.stylist_id === stylist.id).forEach(service => {
                const gross_commission = Number(service.service_price) * Number(stylist.commission_rate || 0);
                const salon_share = Number(service.service_price) - gross_commission;
                const admin_fee = (admin_fee_enabled && admin_fee_rate) ? salon_share * Number(admin_fee_rate) : 0;
                const net_commission = gross_commission - admin_fee;
                service_commissions_total += net_commission;
                details.services.push({ ...service, net_commission, admin_fee });
            });

            const product_commissions_total = productsRows.filter(p => p.stylist_id === stylist.id).reduce((sum, p) => sum + Number(p.commission_value), 0);
            details.products = productsRows.filter(p => p.stylist_id === stylist.id);

            const expenses_total = expensesRows.filter(e => e.stylist_id === stylist.id).reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
            details.expenses = expensesRows.filter(e => e.stylist_id === stylist.id);

            // Propinas del estilista
            const stylistTipRow = tipsRows.find(t => t.stylist_id === stylist.id);
            const totalTips = Number(stylistTipRow?.total_tips || 0);
            const stylist_tips = Math.round(totalTips * (1 - tipSalonPct / 100));

            const base_salary = stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0;
            const gross_total = base_salary + service_commissions_total + product_commissions_total + stylist_tips;
            let net_paid = gross_total - expenses_total;

            if (net_paid < 8000) { net_paid = 0; }

            return {
                stylist_id: stylist.id, stylist_name: `${stylist.first_name} ${stylist.last_name || ''}`.trim(),
                net_paid, stylist_tips, details, payment_type: stylist.payment_type,
            };
        }).filter(s => {
            // Estilistas locales activos siempre aparecen (aunque no tengan ventas todavía).
            // Cross-branch solo aparecen si tienen actividad en este periodo.
            if (localIds.has(s.stylist_id)) return true;
            return s.net_paid > 0 || s.details.services.length > 0 || s.details.products.length > 0 || s.details.expenses.length > 0;
        }).sort((a, b) => b.net_paid - a.net_paid);

        // CÁLCULO DE WIDGETS CORREGIDO: Usamos los datos ya procesados
        const paymentTotalsRows = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'cash'), 0) AS cash, COALESCE(SUM(p.amount) FILTER (WHERE p.payment_method = 'credit_card'), 0) AS "creditCard" FROM payments p JOIN invoices inv ON p.invoice_id = inv.id WHERE p.tenant_id = $1::uuid AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz`,
            tenant_id, start_date, end_date
        );
        const inventorySoldRows = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(SUM(ii.total_price), 0) as sum FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE ii.item_type = 'product' AND i.tenant_id = $1::uuid AND i.created_at >= $2::timestamptz AND i.created_at < $3::timestamptz`,
            tenant_id, start_date, end_date
        );

        const totalExpensesFromBreakdown = stylist_breakdowns.reduce((sum, stylist) => {
            const stylistExpenses = stylist.details.expenses.reduce((subSum, expense) => subSum + Math.abs(Number(expense.amount)), 0);
            return sum + stylistExpenses;
        }, 0);

        const summary_widgets = {
            cash: Number(paymentTotalsRows[0]?.cash || 0),
            creditCard: Number(paymentTotalsRows[0]?.creditCard || 0),
            inventorySold: Number(inventorySoldRows[0]?.sum || 0),
            stylistExpenses: totalExpensesFromBreakdown
        };

        res.status(200).json({ summary_widgets, stylist_breakdowns });

    } catch (error) {
        console.error("Error en vista detallada:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// --- CREACIÓN DE NÓMINA INDIVIDUAL ---
exports.createPayroll = async (req, res) => {
    const tenant_id = sanitizeStr(req.user.tenant_id);
    const { stylist_id: raw_stylist_id, start_date, end_date, net_paid_override } = req.body;
    const stylist_id = sanitizeStr(raw_stylist_id);

    if (!stylist_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Se requieren stylist_id, start_date y end_date.' });
    }

    try {
        // Buscar estilista sin filtrar por tenant (puede ser cross-branch)
        const stylist = await prisma.users.findFirst({
            where: { id: stylist_id, role_id: 3 },
            select: { id: true, first_name: true, last_name: true, payment_type: true, base_salary: true, commission_rate: true, tenant_id: true }
        });
        if (!stylist) return res.status(404).json({ error: 'Estilista no encontrado.' });

        const breakdown = await calculateStylistPayrollBreakdown(tenant_id, stylist, start_date, end_date);

        // Si el admin ajustó la nómina desde la vista previa, usar el monto ajustado
        const finalPaid = (net_paid_override !== undefined && net_paid_override !== null)
            ? Number(net_paid_override)
            : breakdown.net_paid;

        // Sanitizar TODOS los valores para eliminar null bytes
        const cleanTenantId = String(tenant_id).replace(/\0/g, '');
        const cleanStylistId = String(stylist_id).replace(/\0/g, '');
        const cleanStartDate = new Date(String(start_date).replace(/\0/g, ''));
        const cleanEndDate = new Date(String(end_date).replace(/\0/g, ''));
        const cleanBaseSalary = stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0;
        const cleanCommissions = breakdown.details.services.reduce((s, srv) => s + srv.net_commission, 0) +
                                 breakdown.details.products.reduce((s, p) => s + Number(p.commission_value || 0), 0);
        const cleanTotalPaid = Number(finalPaid) || 0;
        const cleanCommRate = Number(stylist.commission_rate || 0);

        // Debug: detectar null bytes en cada campo
        const checkNull = (name, val) => {
            const str = String(val);
            if (str.includes('\0')) console.error(`⚠️ NULL BYTE en campo "${name}": ${JSON.stringify(str)}`);
        };
        checkNull('tenant_id', cleanTenantId);
        checkNull('stylist_id', cleanStylistId);
        checkNull('start_date', start_date);
        checkNull('end_date', end_date);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear registro de nómina usando raw SQL para evitar issues de Prisma con null bytes
            const [payroll] = await tx.$queryRawUnsafe(
                `INSERT INTO payrolls (id, tenant_id, stylist_id, start_date, end_date, base_salary, commissions, total_paid, payment_date, commission_rate_snapshot)
                 VALUES (uuid_generate_v4(), $1::uuid, $2::uuid, $3::date, $4::date, $5::numeric, $6::numeric, $7::numeric, NOW(), $8::numeric)
                 RETURNING *`,
                cleanTenantId, cleanStylistId,
                cleanStartDate.toISOString().split('T')[0],
                cleanEndDate.toISOString().split('T')[0],
                cleanBaseSalary, cleanCommissions, cleanTotalPaid, cleanCommRate
            );

            // 2. Marcar cuotas de préstamos como deducidas
            const loanExpenses = breakdown.details.expenses.filter(e => e.type === 'loan');
            for (const exp of loanExpenses) {
                const match = exp.description.match(/Cuota #(\d+) Préstamo (.+)/);
                if (match) {
                    const [, installmentNo, loanId] = match;
                    await tx.staff_loan_installments.updateMany({
                        where: { loan_id: sanitizeStr(loanId.trim()), installment_no: Number(installmentNo), status: 'pending' },
                        data: { status: 'deducted', deducted_at: new Date(), payroll_id: payroll.id }
                    });
                }
            }

            // 3. Marcar anticipos como deducidos
            const advanceExpenses = breakdown.details.expenses.filter(e => e.type === 'advance');
            if (advanceExpenses.length > 0) {
                await tx.$queryRawUnsafe(
                    `UPDATE cash_movements SET status = 'deducted'
                     WHERE type = 'payroll_advance' AND tenant_id = $1::uuid AND related_entity_id = $2::uuid
                       AND status = 'pending' AND created_at >= $3::timestamptz AND created_at < $4::timestamptz`,
                    tenant_id, stylist_id, start_date, end_date
                );
            }

            // 4. Marcar compras como deducidas
            const purchaseExpenses = breakdown.details.expenses.filter(e => e.type === 'purchase');
            if (purchaseExpenses.length > 0) {
                await tx.$queryRawUnsafe(
                    `UPDATE staff_purchases SET status = 'deducido'
                     WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid AND status = 'pendiente' AND purchase_date < $3::timestamptz`,
                    tenant_id, stylist_id, end_date
                );
            }

            return payroll;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error al crear nómina:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// --- ELIMINAR NÓMINA (REVERTIR DEDUCCIONES) ---
exports.deletePayroll = async (req, res) => {
    const { tenant_id } = req.user;
    const { id } = req.params;

    try {
        const payroll = await prisma.payrolls.findFirst({
            where: { id, tenant_id }
        });
        if (!payroll) return res.status(404).json({ error: 'Nómina no encontrada.' });

        await prisma.$transaction(async (tx) => {
            // 1. Revertir cuotas de préstamos: deducted → pending
            await tx.staff_loan_installments.updateMany({
                where: { payroll_id: id, status: 'deducted' },
                data: { status: 'pending', deducted_at: null, payroll_id: null }
            });

            // 2. Revertir anticipos: deducted → pending
            await tx.$queryRawUnsafe(
                `UPDATE cash_movements SET status = 'pending'
                 WHERE type = 'payroll_advance' AND tenant_id = $1::uuid
                   AND related_entity_id = $2::uuid AND status = 'deducted'
                   AND created_at >= $3::timestamptz AND created_at < ($4::date + interval '1 day')::timestamptz`,
                tenant_id, payroll.stylist_id, payroll.start_date, payroll.end_date
            );

            // 3. Revertir compras de personal: deducido → pendiente
            await tx.$queryRawUnsafe(
                `UPDATE staff_purchases SET status = 'pendiente'
                 WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid AND status = 'deducido'
                   AND purchase_date < ($3::date + interval '1 day')::timestamptz`,
                tenant_id, payroll.stylist_id, payroll.end_date
            );

            // 4. Eliminar la nómina
            await tx.payrolls.delete({ where: { id } });
        });

        res.status(200).json({ message: 'Nómina eliminada y deducciones revertidas.' });
    } catch (error) {
        console.error('Error al eliminar nómina:', error);
        res.status(500).json({ error: 'Error al eliminar la nómina.' });
    }
};

// --- ELIMINAR TODAS LAS NÓMINAS DE UN PERIODO ---
exports.deletePayrollPeriod = async (req, res) => {
    const { tenant_id } = req.user;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Se requieren start_date y end_date.' });
    }

    try {
        const payrolls = await prisma.payrolls.findMany({
            where: {
                tenant_id,
                start_date: new Date(start_date),
                end_date: new Date(end_date)
            }
        });

        if (payrolls.length === 0) {
            return res.status(404).json({ error: 'No se encontraron nóminas para este periodo.' });
        }

        await prisma.$transaction(async (tx) => {
            for (const payroll of payrolls) {
                // Revertir cuotas de préstamos
                await tx.staff_loan_installments.updateMany({
                    where: { payroll_id: payroll.id, status: 'deducted' },
                    data: { status: 'pending', deducted_at: null, payroll_id: null }
                });

                // Revertir anticipos
                await tx.$queryRawUnsafe(
                    `UPDATE cash_movements SET status = 'pending'
                     WHERE type = 'payroll_advance' AND tenant_id = $1::uuid
                       AND related_entity_id = $2::uuid AND status = 'deducted'
                       AND created_at >= $3::timestamptz AND created_at < ($4::date + interval '1 day')::timestamptz`,
                    tenant_id, payroll.stylist_id, payroll.start_date, payroll.end_date
                );

                // Revertir compras
                await tx.$queryRawUnsafe(
                    `UPDATE staff_purchases SET status = 'pendiente'
                     WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid AND status = 'deducido'
                       AND purchase_date < ($3::date + interval '1 day')::timestamptz`,
                    tenant_id, payroll.stylist_id, payroll.end_date
                );
            }

            // Eliminar todas las nóminas del periodo
            await tx.payrolls.deleteMany({
                where: {
                    tenant_id,
                    start_date: new Date(start_date),
                    end_date: new Date(end_date)
                }
            });
        });

        res.status(200).json({ message: `${payrolls.length} nómina(s) eliminada(s) y deducciones revertidas.` });
    } catch (error) {
        console.error('Error al eliminar periodo de nóminas:', error);
        res.status(500).json({ error: 'Error al eliminar el periodo de nóminas.' });
    }
};

// --- OBTENER HISTORIAL DE NÓMINAS ---
exports.getPayrollsByTenant = async (req, res) => {
    const { tenant_id } = req.user;
    try {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT p.*, u.first_name, u.last_name
             FROM payrolls p
             JOIN users u ON p.stylist_id = u.id
             WHERE p.tenant_id = $1::uuid ORDER BY p.payment_date DESC`,
            tenant_id
        );
        return res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener nóminas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// --- EXPORTAR NÓMINA A EXCEL ---
exports.exportPayrollExcel = async (req, res) => {
    const { tenant_id } = req.user;
    const { start_date, end_date: raw_end_date } = req.query;

    if (!start_date || !raw_end_date) {
        return res.status(400).json({ error: 'Se requieren start_date y end_date.' });
    }

    try {
        const XLSX = require('xlsx');

        const endDateObj = new Date(raw_end_date);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const end_date = endDateObj.toISOString();

        const stylists = await prisma.users.findMany({
            where: { tenant_id, role_id: 3, status: 'active' },
            select: { id: true, first_name: true, last_name: true, payment_type: true, base_salary: true, commission_rate: true }
        });

        const rows = [];
        for (const stylist of stylists) {
            const breakdown = await calculateStylistPayrollBreakdown(tenant_id, stylist, start_date, raw_end_date);
            if (breakdown.net_paid <= 0 && breakdown.details.services.length === 0) continue;

            const serviceCommissions = breakdown.details.services.reduce((s, srv) => s + srv.net_commission, 0);
            const productCommissions = breakdown.details.products.reduce((s, p) => s + Number(p.commission_value || 0), 0);
            const expenses = breakdown.details.expenses.reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

            rows.push({
                'Estilista': breakdown.stylist_name,
                'Tipo Pago': stylist.payment_type === 'salary' ? 'Salario' : 'Comisión',
                'Salario Base': stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0,
                'Comisión Servicios': Math.round(serviceCommissions),
                'Comisión Productos': Math.round(productCommissions),
                'Propinas': breakdown.stylist_tips,
                'Egresos': Math.round(expenses),
                'Total a Pagar': Math.round(breakdown.net_paid),
                'Servicios Realizados': breakdown.details.services.length,
            });
        }

        // Hoja de resumen
        const wb = XLSX.utils.book_new();
        const wsResumen = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // Hoja de detalle de servicios
        const detailRows = [];
        for (const stylist of stylists) {
            const breakdown = await calculateStylistPayrollBreakdown(tenant_id, stylist, start_date, raw_end_date);
            for (const srv of breakdown.details.services) {
                detailRows.push({
                    'Estilista': breakdown.stylist_name,
                    'Cliente': srv.client_name,
                    'Servicio': srv.service_name,
                    'Precio': Number(srv.service_price),
                    'Comisión Neta': Math.round(srv.net_commission),
                    'Cuota Admin': Math.round(srv.admin_fee || 0),
                });
            }
        }
        if (detailRows.length > 0) {
            const wsDetail = XLSX.utils.json_to_sheet(detailRows);
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Servicios');
        }

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `nomina_${start_date}_${raw_end_date}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        console.error('Error al exportar nómina a Excel:', error);
        res.status(500).json({ error: 'Error al generar el archivo Excel' });
    }
};

// Export shared function for AI assistant
exports.calculateStylistPayrollBreakdown = calculateStylistPayrollBreakdown;
