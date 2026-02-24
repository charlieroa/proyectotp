const prisma = require('../config/prisma');

/**
 * Función centralizada para calcular el desglose de la nómina para un estilista.
 * (VERSIÓN CORREGIDA FINAL - Migrada a Prisma)
 */
const calculateStylistPayrollBreakdown = async (tenant_id, stylist, start_date, end_date) => {
    const tenantRow = await prisma.tenants.findUnique({
        where: { id: tenant_id },
        select: { admin_fee_enabled: true, admin_fee_rate: true, tip_salon_percent: true }
    });
    const { admin_fee_enabled, admin_fee_rate, tip_salon_percent } = tenantRow || {};

    // 1. Obtener Ingresos (Servicios y Productos)
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
           AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz
           AND inv.status IN ('paid', 'closed', 'completed')`,
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

    // Propinas del estilista en el periodo
    const tipsRows = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(i.tip_amount), 0) AS total_tips
         FROM invoices i
         JOIN invoice_items ii ON ii.invoice_id = i.id
         WHERE ii.seller_id = $1::uuid
           AND ii.item_type = 'service'
           AND i.created_at >= $2::timestamptz AND i.created_at < $3::timestamptz
           AND i.tip_amount > 0`,
        stylist.id, start_date, end_date
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
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Se requieren start_date y end_date.' });
    }

    try {
        const tenantRow = await prisma.tenants.findUnique({
            where: { id: tenant_id },
            select: { admin_fee_enabled: true, admin_fee_rate: true, tip_salon_percent: true }
        });
        const { admin_fee_enabled, admin_fee_rate, tip_salon_percent } = tenantRow || {};

        const stylistsRows = await prisma.users.findMany({
            where: { tenant_id, role_id: 3, status: 'active' },
            select: { id: true, first_name: true, last_name: true, payment_type: true, base_salary: true, commission_rate: true }
        });

        const servicesRows = await prisma.$queryRawUnsafe(
            `SELECT ap.stylist_id, u.first_name || ' ' || u.last_name as client_name, s.name as service_name, ii.total_price as service_price FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id JOIN appointments ap ON ii.related_id = ap.id JOIN services s ON ap.service_id = s.id JOIN users u ON inv.client_id = u.id WHERE ii.item_type = 'service' AND inv.tenant_id = $1::uuid AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz AND inv.status IN ('paid','closed','completed')`,
            tenant_id, start_date, end_date
        );

        const productsRows = await prisma.$queryRawUnsafe(
            `SELECT ii.seller_id as stylist_id, p.name as product_name, ii.commission_value FROM invoice_items ii JOIN invoices inv ON ii.invoice_id = inv.id JOIN products p ON ii.related_id = p.id WHERE ii.item_type = 'product' AND inv.tenant_id = $1::uuid AND inv.created_at >= $2::timestamptz AND inv.created_at < $3::timestamptz`,
            tenant_id, start_date, end_date
        );

        // Propinas por estilista en el periodo
        const tipsRows = await prisma.$queryRawUnsafe(
            `SELECT ii.seller_id as stylist_id, COALESCE(SUM(i.tip_amount), 0) AS total_tips
             FROM invoices i
             JOIN invoice_items ii ON ii.invoice_id = i.id
             WHERE ii.item_type = 'service'
               AND i.tenant_id = $1::uuid
               AND i.created_at >= $2::timestamptz AND i.created_at < $3::timestamptz
               AND i.tip_amount > 0
             GROUP BY ii.seller_id`,
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
        }).filter(s => s.net_paid > 0 || s.details.services.length > 0 || s.details.products.length > 0 || s.details.expenses.length > 0 || s.payment_type === 'commission');

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
    const { tenant_id } = req.user;
    const { stylist_id, start_date, end_date } = req.body;

    if (!stylist_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Se requieren stylist_id, start_date y end_date.' });
    }

    try {
        const stylist = await prisma.users.findFirst({
            where: { id: stylist_id, tenant_id, role_id: 3 },
            select: { id: true, first_name: true, last_name: true, payment_type: true, base_salary: true, commission_rate: true }
        });
        if (!stylist) return res.status(404).json({ error: 'Estilista no encontrado.' });

        const breakdown = await calculateStylistPayrollBreakdown(tenant_id, stylist, start_date, end_date);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear registro de nómina
            const payroll = await tx.payrolls.create({
                data: {
                    tenant_id,
                    stylist_id,
                    start_date: new Date(start_date),
                    end_date: new Date(end_date),
                    base_salary: stylist.payment_type === 'salary' ? Number(stylist.base_salary || 0) : 0,
                    commissions: breakdown.details.services.reduce((s, srv) => s + srv.net_commission, 0) +
                                 breakdown.details.products.reduce((s, p) => s + Number(p.commission_value || 0), 0),
                    total_paid: breakdown.net_paid,
                    commission_rate_snapshot: Number(stylist.commission_rate || 0)
                }
            });

            // 2. Marcar cuotas de préstamos como deducidas
            const loanExpenses = breakdown.details.expenses.filter(e => e.type === 'loan');
            for (const exp of loanExpenses) {
                const match = exp.description.match(/Cuota #(\d+) Préstamo (.+)/);
                if (match) {
                    const [, installmentNo, loanId] = match;
                    await tx.staff_loan_installments.updateMany({
                        where: { loan_id: loanId.trim(), installment_no: Number(installmentNo), status: 'pending' },
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
