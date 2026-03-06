// =============================================
// File: src/controllers/cashController.js
// =============================================
const prisma = require('../config/prisma');
const { canAccessTenant } = require('./ficheroController');

// =============================================
// ===          FUNCIONES DE SESIONES          ===
// =============================================

exports.openCashSession = async (req, res) => {
    const { initial_amount } = req.body;
    const { tenant_id, id: user_id } = req.user;

    const numericAmount = Number(initial_amount);
    if (initial_amount == null || !Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ error: 'El monto inicial es obligatorio y debe ser un n\u00famero positivo.' });
    }
    try {
        const existingOpenSession = await prisma.cash_sessions.findFirst({
            where: { tenant_id, status: 'OPEN' },
            select: { id: true }
        });
        if (existingOpenSession) {
            return res.status(409).json({ error: 'Ya existe una sesi\u00f3n de caja abierta para este negocio.' });
        }
        const newSession = await prisma.cash_sessions.create({
            data: {
                tenant_id,
                opened_by_user_id: user_id,
                initial_amount: numericAmount,
                status: 'OPEN',
                opened_at: new Date()
            }
        });
        res.status(201).json(newSession);
    } catch (error) {
        console.error('Error al abrir la sesi\u00f3n de caja:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.getCurrentSession = async (req, res) => {
    const { tenant_id } = req.user;
    try {
        // --- MEJORA: Se busca la sesi\u00f3n abierta por tenant_id, no por user_id ---
        // Esto permite que un admin pueda ver/cerrar la caja de otro usuario.
        const sessionRows = await prisma.$queryRawUnsafe(
            `SELECT s.id, s.initial_amount, s.opened_at, u.first_name || ' ' || u.last_name as opener_name
             FROM cash_sessions s
             JOIN users u ON s.opened_by_user_id = u.id
             WHERE s.tenant_id = $1::uuid AND s.status = 'OPEN'`,
            tenant_id
        );

        if (!sessionRows || sessionRows.length === 0) {
            return res.status(200).json(null);
        }

        const session = sessionRows[0];
        const sessionId = session.id;

        const summaryQuery = `
            WITH movements AS (
                SELECT * FROM cash_movements WHERE cash_session_id = $1::uuid
            ),
            incomes AS (
                SELECT
                    payment_method,
                    COUNT(*)::int,
                    SUM(amount) as total
                FROM movements
                WHERE type = 'income' AND payment_method IS NOT NULL
                GROUP BY payment_method
            ),
            expenses AS (
                SELECT
                    category,
                    COUNT(*)::int,
                    SUM(amount) as total
                FROM movements
                -- --- AJUSTE CLAVE: Se asegura que solo los egresos EN EFECTIVO afecten el resumen de caja ---
                WHERE type IN ('expense', 'payroll_advance') AND payment_method = 'cash'
                GROUP BY category
            )
            SELECT
                (SELECT json_agg(t) FROM incomes t) as incomes_by_payment_method,
                (SELECT json_agg(t) FROM expenses t) as expenses_by_category,
                (SELECT COUNT(DISTINCT invoice_id)::int FROM movements WHERE invoice_id IS NOT NULL) as attended_appointments_count,
                COALESCE((SELECT SUM(amount) FROM movements WHERE category = 'propina_salon'), 0) as total_propinas
        `;

        const summaryRows = await prisma.$queryRawUnsafe(summaryQuery, sessionId);
        const summary = summaryRows[0] || {};

        const totalCashIncomes = (summary.incomes_by_payment_method || []).find(inc => inc.payment_method === 'cash')?.total || 0;
        // El total de egresos ahora es correcto porque la consulta ya filtr\u00f3 por 'cash'
        const totalCashExpenses = (summary.expenses_by_category || []).reduce((acc, exp) => acc + Number(exp.total), 0);

        // El `totalCashExpenses` ya es negativo, por eso se suma.
        const expected_cash_amount = Number(session.initial_amount) + Number(totalCashIncomes) + totalCashExpenses;

        res.status(200).json({
            session_details: session,
            expected_cash_amount,
            summary: {
                incomes_by_payment_method: summary.incomes_by_payment_method || [],
                expenses_by_category: summary.expenses_by_category || [],
                attended_appointments_count: summary.attended_appointments_count || 0,
                total_propinas: Number(summary.total_propinas || 0)
            }
        });

    } catch (error) {
        console.error('Error al obtener la sesi\u00f3n de caja actual:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.closeCashSession = async (req, res) => {
    const { final_amount_counted = null } = req.body;
    const { tenant_id, id: user_id } = req.user;

    let numericFinalAmount = null;
    let difference = null;

    if (final_amount_counted != null) {
        numericFinalAmount = Number(final_amount_counted);
        if (!Number.isFinite(numericFinalAmount) || numericFinalAmount < 0) {
            return res.status(400).json({ error: 'Si se proporciona, el monto final debe ser un n\u00famero positivo.' });
        }
    }
    try {
        const updatedSession = await prisma.$transaction(async (tx) => {
            const session = await tx.cash_sessions.findFirst({
                where: { tenant_id, status: 'OPEN' }
            });
            if (!session) throw new Error('NO_OPEN_SESSION');

            // Mismo c\u00e1lculo que getCurrentSession: ingresos cash + egresos cash (ya negativos)
            const cashTotalsRows = await tx.$queryRawUnsafe(
                `SELECT
                    COALESCE(SUM(amount) FILTER (WHERE type = 'income' AND payment_method = 'cash'), 0) as cash_incomes,
                    COALESCE(SUM(amount) FILTER (WHERE type IN ('expense', 'payroll_advance') AND payment_method = 'cash'), 0) as cash_expenses
                 FROM cash_movements WHERE cash_session_id = $1::uuid`,
                session.id
            );
            const expected_cash_amount = Number(session.initial_amount) + Number(cashTotalsRows[0].cash_incomes) + Number(cashTotalsRows[0].cash_expenses);

            if (numericFinalAmount !== null) {
                difference = numericFinalAmount - expected_cash_amount;
            }

            return tx.cash_sessions.update({
                where: { id: session.id },
                data: {
                    status: 'CLOSED',
                    closed_at: new Date(),
                    closed_by_user_id: user_id,
                    final_amount_counted: numericFinalAmount,
                    expected_cash_amount,
                    difference
                }
            });
        });
        res.status(200).json(updatedSession);
    } catch (error) {
        if (error.message === 'NO_OPEN_SESSION') {
            return res.status(404).json({ error: 'No hay una sesi\u00f3n de caja abierta para cerrar.' });
        }
        console.error('Error al cerrar la sesi\u00f3n de caja:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- El resto de las funciones no necesitan cambios ---
exports.getSessionHistory = async (req, res) => {
    const { tenant_id } = req.user;
    try {
        const rows = await prisma.$queryRawUnsafe(
            `SELECT
                s.*, opener.first_name as opened_by_name, closer.first_name as closed_by_name
            FROM cash_sessions s
            LEFT JOIN users opener ON s.opened_by_user_id = opener.id
            LEFT JOIN users closer ON s.closed_by_user_id = closer.id
            WHERE s.tenant_id = $1::uuid AND s.status = 'CLOSED'
            ORDER BY s.closed_at DESC`,
            tenant_id
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener el historial de cajas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.createCashMovement = async (req, res) => {
    const {
        type, description, amount, related_user_id = null, category = null,
        payment_method = null, invoice_ref = null, related_entity_type = null,
        related_entity_id = null
    } = req.body;
    const { tenant_id, id: user_id } = req.user;
    if (!type || !description || amount == null) { return res.status(400).json({ error: 'Los campos type, description y amount son obligatorios.' }); }
    let numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) { return res.status(400).json({ error: 'El monto (amount) debe ser un n\u00famero.' }); }
    if ((type === 'payroll_advance' || type === 'expense') && numericAmount > 0) { numericAmount = -Math.abs(numericAmount); }
    if (type === 'income' && numericAmount < 0) { numericAmount = Math.abs(numericAmount); }
    try {
        const openSession = await prisma.cash_sessions.findFirst({
            where: { tenant_id, status: 'OPEN' },
            select: { id: true }
        });
        const cash_session_id = openSession ? openSession.id : null;
        if (!cash_session_id && (payment_method === 'cash')) {
            return res.status(400).json({ error: 'No se puede registrar un movimiento en efectivo porque no hay una sesi\u00f3n de caja abierta.' });
        }
        const newMovement = await prisma.cash_movements.create({
            data: {
                tenant_id,
                user_id,
                related_user_id: related_user_id || related_entity_id || null,
                type,
                description,
                amount: numericAmount,
                category,
                payment_method,
                invoice_ref,
                related_entity_type,
                related_entity_id: related_entity_id || related_user_id || null,
                cash_session_id
            }
        });
        res.status(201).json(newMovement);
    } catch (error) {
        console.error('Error al crear el movimiento de caja:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.getCashMovements = async (req, res) => {
    const { tenant_id } = req.user;
    const { startDate, endDate } = req.query;
    try {
        let query = `
            SELECT cm.*, u.first_name as registered_by, ru.first_name as related_to
            FROM cash_movements cm
            LEFT JOIN users u ON cm.user_id = u.id
            LEFT JOIN users ru ON cm.related_user_id = ru.id
            WHERE cm.tenant_id = $1::uuid
        `;
        const queryParams = [tenant_id];
        if (startDate && endDate) {
            query += ' AND cm.created_at BETWEEN $2::timestamptz AND $3::timestamptz';
            queryParams.push(startDate, endDate);
        }
        query += ' ORDER BY cm.created_at DESC';
        const rows = await prisma.$queryRawUnsafe(query, ...queryParams);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener movimientos de caja:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// GET /api/cash/all-branches - Summary of cash sessions across all branches (primary only)
exports.getAllBranchesCash = async (req, res) => {
    const { tenant_id } = req.user;

    try {
        // Verify this tenant has manage_all_branches_cash enabled
        const tenant = await prisma.tenants.findUnique({
            where: { id: tenant_id },
            select: { manage_all_branches_cash: true, is_primary_branch: true, parent_tenant_id: true }
        });

        if (!tenant?.manage_all_branches_cash) {
            return res.status(403).json({ error: 'No tienes habilitada la gestion de caja multi-sucursal.' });
        }

        // Get all related branches (children of same parent, or children of this tenant)
        const parentId = tenant.parent_tenant_id || tenant_id;
        const branches = await prisma.tenants.findMany({
            where: {
                OR: [
                    { id: parentId },
                    { parent_tenant_id: parentId }
                ]
            },
            select: { id: true, name: true, branch_color: true }
        });

        const branchIds = branches.map(b => b.id);

        // Get current open sessions for all branches
        const sessions = await prisma.$queryRawUnsafe(
            `SELECT s.id, s.tenant_id, s.status, s.opened_at, s.initial_amount,
                    u.first_name || ' ' || u.last_name as opener_name,
                    COALESCE(
                        (SELECT SUM(amount) FROM cash_movements WHERE cash_session_id = s.id AND type = 'income' AND payment_method = 'cash'), 0
                    ) as cash_incomes,
                    COALESCE(
                        (SELECT SUM(amount) FROM cash_movements WHERE cash_session_id = s.id AND type IN ('expense', 'payroll_advance') AND payment_method = 'cash'), 0
                    ) as cash_expenses,
                    (SELECT COUNT(DISTINCT invoice_id) FROM cash_movements WHERE cash_session_id = s.id AND invoice_id IS NOT NULL)::int as invoice_count
             FROM cash_sessions s
             JOIN users u ON s.opened_by_user_id = u.id
             WHERE s.tenant_id = ANY($1::uuid[]) AND s.status = 'OPEN'`,
            branchIds
        );

        const result = branches.map(branch => {
            const session = sessions.find(s => s.tenant_id === branch.id);
            if (!session) {
                return {
                    tenant_id: branch.id,
                    branch_name: branch.name,
                    branch_color: branch.branch_color,
                    status: 'CLOSED',
                    session: null
                };
            }

            const expectedCash = Number(session.initial_amount) + Number(session.cash_incomes) + Number(session.cash_expenses);

            return {
                tenant_id: branch.id,
                branch_name: branch.name,
                branch_color: branch.branch_color,
                status: 'OPEN',
                session: {
                    id: session.id,
                    opened_at: session.opened_at,
                    opener_name: session.opener_name,
                    initial_amount: Number(session.initial_amount),
                    expected_cash_amount: expectedCash,
                    invoice_count: session.invoice_count
                }
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error getting all branches cash:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
