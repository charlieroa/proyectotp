// =============================================
// File: src/controllers/staffLoanController.js
// (Préstamos a estilistas con calendario semanal e interés plano)
// Migrado a Prisma ORM
// =============================================
const prisma = require('../config/prisma');

// Helpers
const isUUID = (v) => typeof v === 'string' && v.length >= 10;
const toNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const assert = (cond, msg, code = 400) => {
  if (!cond) {
    const err = new Error(msg);
    err.status = code;
    throw err;
  }
};

// Genera fechas semanales desde startDate (YYYY-MM-DD o Date)
function genWeeklyDates(startDate, weeks) {
  const base = new Date(startDate || new Date());
  base.setHours(0, 0, 0, 0);
  const dates = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Crea un préstamo a un estilista:
 * body: { stylist_id, principal_amount, weeks, interest_percent, start_date? (YYYY-MM-DD), disburse_from_cash?: boolean }
 * - Interés plano total = principal * interest_percent/100
 * - Interés semanal = interes_total / weeks
 * - Capital semanal = principal / weeks
 * - Cuota semanal = capital_sem + interes_sem
 * - Si disburse_from_cash=true: crea movimiento de caja (egreso) "loan_disbursement"
 */
exports.createLoan = async (req, res) => {
    const { tenant_id, id: cashier_id } = req.user;
    const {
        stylist_id,
        principal_amount,
        weeks,
        interest_percent,
        start_date,
        disburse_from_cash = true,
    } = req.body;

    try {
        // Validaciones
        assert(isUUID(stylist_id), 'stylist_id inválido.');
        const principal = toNumber(principal_amount);
        const nTermWeeks = parseInt(weeks, 10);
        const ratePct = toNumber(interest_percent);
        assert(principal && principal > 0, 'principal_amount debe ser > 0.');
        assert(Number.isInteger(nTermWeeks) && nTermWeeks > 0, 'weeks debe ser entero > 0.');
        assert(ratePct !== null && ratePct >= 0 && ratePct <= 100, 'interest_percent debe estar entre 0 y 100.');

        // Verificar estilista
        const u = await prisma.users.findFirst({
            where: { id: stylist_id, tenant_id: tenant_id, role_id: 3 },
            select: { id: true }
        });
        assert(u, 'Estilista no encontrado en tu negocio.', 404);

        // Cálculos
        const totalInterest = Math.round(principal * (ratePct / 100) * 100) / 100;
        const capitalPerWeek = Math.round((principal / nTermWeeks) * 100) / 100;
        const interestPerWeek = Math.round((totalInterest / nTermWeeks) * 100) / 100;
        const installmentPerWeek = Math.round((capitalPerWeek + interestPerWeek) * 100) / 100;

        const scheduleDates = genWeeklyDates(start_date, nTermWeeks);

        const loan = await prisma.$transaction(async (tx) => {
            // 1) Crear préstamo
            const loan = await tx.staff_loans.create({
                data: {
                    tenant_id,
                    stylist_id,
                    principal,
                    interest_rate_percent: ratePct,
                    term_weeks: nTermWeeks,
                    start_date: new Date(scheduleDates[0]),
                    status: 'active',
                }
            });

            // 2) Generar calendario (cuotas) — bulk INSERT via $queryRawUnsafe
            const values = [];
            const placeholders = [];
            let idx = 1;
            for (let i = 0; i < nTermWeeks; i++) {
                values.push(loan.id, i + 1, scheduleDates[i], capitalPerWeek, interestPerWeek, installmentPerWeek);
                placeholders.push(`($${idx}::uuid, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, 'pending')`);
                idx += 6;
            }
            await tx.$queryRawUnsafe(
                `INSERT INTO staff_loan_installments
                    (loan_id, installment_no, due_date, principal_amount, interest_amount, total_amount, status)
                VALUES ${placeholders.join(',')}`,
                ...values
            );

            // 3) Desembolso (caja) opcional
            if (disburse_from_cash) {
                const openSession = await tx.cash_sessions.findFirst({
                    where: { tenant_id, status: 'OPEN' },
                    select: { id: true }
                });
                const cash_session_id = openSession ? openSession.id : null;
                assert(cash_session_id, 'No hay una sesión de caja abierta para desembolsar el préstamo.');

                await tx.cash_movements.create({
                    data: {
                        tenant_id,
                        user_id: cashier_id,
                        related_user_id: stylist_id,
                        type: 'expense',
                        description: `Desembolso préstamo #${String(loan.id).slice(0, 8)} al estilista`,
                        amount: -Math.abs(principal),
                        category: 'loan_to_staff',
                        payment_method: 'cash',
                        related_entity_type: 'stylist',
                        related_entity_id: stylist_id,
                        cash_session_id,
                    }
                });
            }

            return loan;
        });

        res.status(201).json({
            loan: { ...loan, total_interest: totalInterest, weekly: { capital: capitalPerWeek, interest: interestPerWeek, installment: installmentPerWeek } },
            schedule_preview: scheduleDates.map((d, i) => ({ installment_no: i + 1, due_date: d, principal: capitalPerWeek, interest: interestPerWeek, total: installmentPerWeek })),
        });
    } catch (error) {
        console.error('Error al crear préstamo:', error);
        res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
    }
};

/**
 * Lista préstamos del tenant (con saldo pendiente).
 */
exports.getLoansByTenant = async (req, res) => {
  const { tenant_id } = req.user;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT l.*,
             COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'pending'), 0) AS pending_total,
             COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('deducted','paid')), 0) AS paid_total
        FROM staff_loans l
   LEFT JOIN staff_loan_installments i ON i.loan_id = l.id
       WHERE l.tenant_id = $1::uuid
       GROUP BY l.id
       ORDER BY l.created_at DESC
      `,
      tenant_id
    );
    res.status(200).json(rows);
  } catch (e) {
    console.error('Error al listar préstamos:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Préstamos por estilista (histórico + estado).
 */
exports.getLoansByStylist = async (req, res) => {
  const { tenant_id } = req.user;
  const { stylistId } = req.params;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT l.*,
             COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'pending'), 0) AS pending_total,
             COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('deducted','paid')), 0) AS paid_total
        FROM staff_loans l
   LEFT JOIN staff_loan_installments i ON i.loan_id = l.id
       WHERE l.tenant_id = $1::uuid AND l.stylist_id = $2::uuid
       GROUP BY l.id
       ORDER BY l.created_at DESC
      `,
      tenant_id, stylistId
    );
    res.status(200).json(rows);
  } catch (e) {
    console.error('Error al listar préstamos del estilista:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Detalle de préstamo + calendario.
 */
exports.getLoanDetail = async (req, res) => {
  const { tenant_id } = req.user;
  const { loanId } = req.params;
  try {
    const loan = await prisma.staff_loans.findFirst({
      where: { id: loanId, tenant_id }
    });
    if (!loan) return res.status(404).json({ message: 'Préstamo no encontrado.' });

    const installments = await prisma.staff_loan_installments.findMany({
      where: { loan_id: loanId },
      orderBy: { installment_no: 'asc' }
    });
    res.status(200).json({ loan, installments });
  } catch (e) {
    console.error('Error al obtener detalle de préstamo:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Marca una cuota como DEDUCIDA (vía nómina) o PAGADA manualmente.
 * body: { status: 'deducted' | 'paid', payroll_id? }
 */
exports.updateInstallmentStatus = async (req, res) => {
  const { tenant_id } = req.user;
  const { loanId, installmentNo } = req.params;
  const { status, payroll_id = null } = req.body;

  try {
    assert(['deducted', 'paid'].includes(status), 'status inválido (deducted|paid).');

    // Validar pertenencia del préstamo
    const loan = await prisma.staff_loans.findFirst({
      where: { id: loanId, tenant_id },
      select: { id: true }
    });
    assert(loan, 'Préstamo no encontrado.', 404);

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE staff_loan_installments
          SET status = $1,
              deducted_at = CASE WHEN $1 = 'deducted' THEN NOW() ELSE deducted_at END,
              payroll_id = COALESCE($2, payroll_id)
        WHERE loan_id = $3::uuid AND installment_no = $4 AND status = 'pending'
      RETURNING *`,
      status, payroll_id, loanId, Number(installmentNo)
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Cuota no encontrada o ya procesada.' });
    }
    res.status(200).json(rows[0]);
  } catch (e) {
    console.error('Error al actualizar cuota de préstamo:', e);
    res.status(e.status || 500).json({ error: e.message || 'Error interno del servidor' });
  }
};
