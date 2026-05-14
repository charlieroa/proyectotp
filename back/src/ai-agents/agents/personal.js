'use strict';

const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { findStylist, getOpenCashSession } = require('../shared/lookups');
const { fmtMoney } = require('../shared/helpers');
const { calculateStylistPayrollBreakdown } = require('../../controllers/payrollController');

const systemPrompt = `Eres el AGENTE DE PERSONAL del salón. Manejas ESTILISTAS, NÓMINA, PRÉSTAMOS y COMPRAS DE STAFF.

PERSONALIDAD:
- "Listo jefe", "Como ordene jefe", "Aquí tiene jefe".
- Confirma datos críticos antes de crear estilistas, generar nómina o registrar préstamos.

CREACIÓN DE ESTILISTAS - DATOS REQUERIDOS:
1. Nombre + apellido
2. Email
3. Porcentaje de comisión (40%, 50%)
4. Tipo de pago: 'commission', 'salary', 'mixed'
Si falta algo, PREGUNTA antes de crear.

NÓMINA:
- Generar nómina REQUIERE confirmación. Genera = guarda en DB.
- Preview = muestra sin guardar.

PRÉSTAMOS:
- Necesitas: estilista, monto, semanas, % de interés.
- Por defecto, sale de caja (disburse_from_cash=true). Si no hay caja abierta, avisa.

HORARIOS:
- "Carlos ya no trabaja los lunes" → modificar_horario_estilista accion='quitar_dia' dias='lunes'.
- "María trabaja martes de 2 a 5" → accion='agregar_dia' dias='martes' hora_inicio='14' hora_fin='17'.`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'listar_estilistas',
            description: 'Lista todos los estilistas activos.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_estilista',
            description: 'Registra un nuevo estilista.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    apellido: { type: 'string' },
                    email: { type: 'string' },
                    telefono: { type: 'string' },
                    porcentaje_comision: { type: 'number' },
                    tipo_pago: { type: 'string', enum: ['commission', 'salary', 'mixed'] },
                    salario_base: { type: 'number' },
                    horario: { type: 'object', description: 'Horario laboral. Ej: {"lunes":{"start":"8","end":"18"}}' },
                },
                required: ['nombre', 'apellido', 'email'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'editar_estilista',
            description: 'Edita datos del estilista. Pasa solo campos a cambiar.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    nuevo_email: { type: 'string' },
                    telefono: { type: 'string' },
                    porcentaje_comision: { type: 'number' },
                    tipo_pago: { type: 'string', enum: ['commission', 'salary', 'mixed'] },
                    salario_base: { type: 'number' },
                },
                required: ['estilista'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'desactivar_estilista',
            description: 'Desactiva (status=inactive) a un estilista.',
            parameters: {
                type: 'object',
                properties: { estilista: { type: 'string' } },
                required: ['estilista'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'modificar_horario_estilista',
            description: 'Cambia el horario laboral de un estilista. accion=actualizar/quitar_dia/agregar_dia.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    dias: { type: 'string', description: "'lunes,martes,miercoles' separado por coma" },
                    hora_inicio: { type: 'string' },
                    hora_fin: { type: 'string' },
                    accion: { type: 'string', enum: ['actualizar', 'quitar_dia', 'agregar_dia'] },
                },
                required: ['estilista', 'dias', 'accion'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_horario_estilista',
            description: 'Muestra el horario actual de un estilista.',
            parameters: {
                type: 'object',
                properties: { estilista: { type: 'string' } },
                required: ['estilista'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generar_nomina',
            description: 'Genera y GUARDA la nómina de un estilista en un período. Confirma antes de usar.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    fecha_inicio: { type: 'string', description: 'YYYY-MM-DD' },
                    fecha_fin: { type: 'string', description: 'YYYY-MM-DD' },
                },
                required: ['estilista', 'fecha_inicio', 'fecha_fin'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_preview_nomina',
            description: 'Vista previa de nómina SIN guardar. Usa "todos" para ver todos los estilistas.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    fecha_inicio: { type: 'string' },
                    fecha_fin: { type: 'string' },
                },
                required: ['fecha_inicio', 'fecha_fin'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'historial_nominas',
            description: 'Lista las nóminas generadas históricamente para un estilista o todos.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string', description: "Nombre o 'todos'" },
                    limite: { type: 'integer', description: 'Default 10' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'registrar_prestamo',
            description: 'Registra un préstamo a un estilista (descontado de nómina). Si hay caja abierta, sale de ahí.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    monto: { type: 'number' },
                    semanas: { type: 'integer', description: 'Plazo en semanas' },
                    interes_porcentaje: { type: 'number', description: 'Interés total %, default 0' },
                    fecha_inicio: { type: 'string', description: 'YYYY-MM-DD, default hoy' },
                },
                required: ['estilista', 'monto', 'semanas'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_prestamos_estilista',
            description: 'Lista los préstamos activos de un estilista.',
            parameters: {
                type: 'object',
                properties: { estilista: { type: 'string' } },
                required: ['estilista'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'registrar_compra_staff',
            description: 'Registra una compra de productos por parte de un estilista (descontada de nómina). Reduce stock.',
            parameters: {
                type: 'object',
                properties: {
                    estilista: { type: 'string' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                producto: { type: 'string' },
                                cantidad: { type: 'integer' },
                                precio: { type: 'number', description: 'Si no se da, usa staff_price o sale_price' },
                            },
                            required: ['producto'],
                        },
                    },
                },
                required: ['estilista', 'items'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_compras_estilista',
            description: 'Lista las compras pendientes de un estilista (descuentos pendientes en nómina).',
            parameters: {
                type: 'object',
                properties: { estilista: { type: 'string' } },
                required: ['estilista'],
            },
        },
    },
];

const allDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const diasEs = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };

const executors = {
    async listar_estilistas(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT id, first_name, last_name, email, phone, commission_rate, payment_type, base_salary, is_inside_geofence
            FROM users
            WHERE tenant_id = $1::uuid AND role_id = 3
              AND COALESCE(NULLIF(status,''),'active') = 'active'
            ORDER BY first_name
        `, [tenantId]);
        return {
            total: rows.length,
            estilistas: rows.map(r => ({
                id: r.id,
                nombre: `${r.first_name} ${r.last_name || ''}`.trim(),
                email: r.email,
                telefono: r.phone,
                tipo_pago: r.payment_type,
                comision_pct: Math.round(Number(r.commission_rate) * 100),
                salario_base: Number(r.base_salary),
                en_salon: r.is_inside_geofence || false,
            })),
        };
    },

    async crear_estilista(args, { tenantId }) {
        const bcrypt = require('bcryptjs');
        const tempPass = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
        const hashedPass = await bcrypt.hash(tempPass, 10);
        const commissionRate = args.porcentaje_comision ? (args.porcentaje_comision / 100) : 0;
        const paymentType = args.tipo_pago || 'commission';
        const baseSalary = args.salario_base || 0;
        const workingHoursJson = args.horario ? JSON.stringify(args.horario) : null;
        const { rows } = await db.query(`
            INSERT INTO users (tenant_id, first_name, last_name, email, phone, password_hash, role_id, status, commission_rate, payment_type, base_salary, working_hours)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, 3, 'active', $7, $8, $9, $10::jsonb)
            RETURNING id, first_name, last_name, email
        `, [tenantId, args.nombre, args.apellido, args.email, args.telefono || null, hashedPass, commissionRate, paymentType, baseSalary, workingHoursJson]);
        return {
            success: true,
            estilista: rows[0],
            comision: `${args.porcentaje_comision || 0}%`,
            tipo_pago: paymentType,
            password_temporal: tempPass,
            mensaje: `Estilista ${args.nombre} ${args.apellido} creado. Comisión ${args.porcentaje_comision || 0}%. Password temporal: ${tempPass}`,
        };
    },

    async editar_estilista(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré al estilista "${args.estilista}".` };
        const updates = [];
        const values = [];
        let i = 1;
        if (args.nuevo_email) { updates.push(`email = $${i++}`); values.push(args.nuevo_email); }
        if (args.telefono) { updates.push(`phone = $${i++}`); values.push(args.telefono); }
        if (args.porcentaje_comision !== undefined) { updates.push(`commission_rate = $${i++}`); values.push(args.porcentaje_comision / 100); }
        if (args.tipo_pago) { updates.push(`payment_type = $${i++}`); values.push(args.tipo_pago); }
        if (args.salario_base !== undefined) { updates.push(`base_salary = $${i++}`); values.push(args.salario_base); }
        if (!updates.length) return { error: 'No hay cambios.' };
        values.push(st.id);
        await db.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i}::uuid`, values);
        return { success: true, mensaje: `Datos de ${st.first_name} actualizados.` };
    },

    async desactivar_estilista(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré al estilista "${args.estilista}".` };
        await db.query(`UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = $1::uuid`, [st.id]);
        return { success: true, mensaje: `${st.first_name} ${st.last_name || ''} desactivado.` };
    },

    async modificar_horario_estilista(args, { tenantId }) {
        if (!args.estilista) return { error: 'Indica el nombre del estilista.' };
        if (!args.dias) return { error: 'Indica los días.' };
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        let currentHours = st.working_hours || {};
        if (typeof currentHours === 'string') currentHours = JSON.parse(currentHours);
        const accion = args.accion || 'actualizar';
        const diasInput = String(args.dias).toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .split(/[,\s]+/).map(d => d.trim()).filter(Boolean);
        let finalHorario;
        if (accion === 'quitar_dia') {
            finalHorario = { ...currentHours };
            for (const d of diasInput) delete finalHorario[d];
        } else if (accion === 'agregar_dia') {
            if (!args.hora_inicio || !args.hora_fin) return { error: 'Necesito hora_inicio y hora_fin para agregar.' };
            finalHorario = { ...currentHours };
            for (const d of diasInput) finalHorario[d] = { start: String(parseInt(args.hora_inicio, 10)), end: String(parseInt(args.hora_fin, 10)) };
        } else {
            if (!args.hora_inicio || !args.hora_fin) return { error: 'Necesito hora_inicio y hora_fin.' };
            finalHorario = {};
            for (const d of allDays) {
                if (diasInput.includes(d)) finalHorario[d] = { start: String(parseInt(args.hora_inicio, 10)), end: String(parseInt(args.hora_fin, 10)) };
            }
        }
        await db.query(`UPDATE users SET working_hours = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`, [JSON.stringify(finalHorario), st.id]);
        const horarioLegible = allDays.filter(d => finalHorario[d])
            .map(d => `${diasEs[d] || d}: ${finalHorario[d].start}:00 - ${finalHorario[d].end}:00`).join('\n');
        return {
            success: true,
            estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
            horario_legible: horarioLegible || 'Sin horario',
            mensaje: `Horario de ${st.first_name} actualizado.`,
        };
    },

    async ver_horario_estilista(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        let wh = st.working_hours || {};
        if (typeof wh === 'string') wh = JSON.parse(wh);
        const hasCustom = Object.keys(wh).length > 0;
        const horarioLegible = allDays.map(d => {
            const h = wh[d];
            if (!h) return `${diasEs[d] || d}: No trabaja`;
            if (typeof h === 'string') return `${diasEs[d] || d}: ${h}`;
            return `${diasEs[d] || d}: ${h.start}:00 - ${h.end}:00`;
        }).join('\n');
        return {
            estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
            tiene_horario_personalizado: hasCustom,
            horario_legible: hasCustom ? horarioLegible : 'Usa el horario del salón',
        };
    },

    async generar_nomina(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        const startDate = new Date(args.fecha_inicio);
        const endDate = new Date(args.fecha_fin);
        endDate.setHours(23, 59, 59, 999);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Fechas inválidas (YYYY-MM-DD).' };

        const breakdown = await calculateStylistPayrollBreakdown(tenantId, st, startDate, endDate);
        const totalCommissions = (breakdown.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0)
            + (breakdown.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0);

        await prisma.payrolls.create({
            data: {
                tenant_id: tenantId,
                stylist_id: st.id,
                start_date: startDate,
                end_date: endDate,
                base_salary: st.payment_type === 'salary' ? Number(st.base_salary || 0) : 0,
                commissions: totalCommissions,
                total_paid: breakdown.net_paid || 0,
                commission_rate_snapshot: Number(st.commission_rate || 0),
            },
        });

        return {
            exito: true,
            estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
            periodo: `${args.fecha_inicio} a ${args.fecha_fin}`,
            comisiones_servicios: (breakdown.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0),
            comisiones_productos: (breakdown.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0),
            propinas: breakdown.stylist_tips || 0,
            egresos_total: (breakdown.details?.expenses || []).reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0),
            neto_a_pagar: breakdown.net_paid || 0,
            mensaje: `Nómina guardada. Neto a pagar: ${fmtMoney(breakdown.net_paid || 0)}`,
        };
    },

    async ver_preview_nomina(args, { tenantId }) {
        const startDate = new Date(args.fecha_inicio);
        const endDate = new Date(args.fecha_fin);
        endDate.setHours(23, 59, 59, 999);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return { error: 'Fechas inválidas.' };

        let stylists;
        if (!args.estilista || args.estilista.toLowerCase() === 'todos') {
            const { rows } = await db.query(`
                SELECT id, first_name, last_name, payment_type, base_salary, commission_rate
                FROM users WHERE tenant_id = $1::uuid AND role_id = 3
                  AND COALESCE(NULLIF(status,''),'active') = 'active'
                ORDER BY first_name
            `, [tenantId]);
            stylists = rows;
        } else {
            const st = await findStylist(tenantId, args.estilista);
            if (!st) return { error: `No encontré "${args.estilista}".` };
            stylists = [st];
        }
        if (!stylists.length) return { error: 'No hay estilistas.' };

        const previews = [];
        for (const st of stylists) {
            const b = await calculateStylistPayrollBreakdown(tenantId, st, startDate, endDate);
            previews.push({
                estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
                servicios_realizados: (b.details?.services || []).length,
                comisiones: (b.details?.services || []).reduce((s, srv) => s + (srv.net_commission || 0), 0)
                    + (b.details?.products || []).reduce((s, p) => s + Number(p.commission_value || 0), 0),
                propinas: b.stylist_tips || 0,
                egresos: (b.details?.expenses || []).reduce((s, e) => s + Math.abs(Number(e.amount || 0)), 0),
                neto_a_pagar: b.net_paid || 0,
            });
        }
        return {
            periodo: `${args.fecha_inicio} a ${args.fecha_fin}`,
            nota: 'VISTA PREVIA, no guardada.',
            estilistas: previews,
            total_general: previews.reduce((s, p) => s + p.neto_a_pagar, 0),
        };
    },

    async historial_nominas(args, { tenantId }) {
        const limit = args.limite || 10;
        let where = `p.tenant_id = $1::uuid`;
        const params = [tenantId];
        if (args.estilista && args.estilista.toLowerCase() !== 'todos') {
            const st = await findStylist(tenantId, args.estilista);
            if (!st) return { error: `No encontré "${args.estilista}".` };
            where += ` AND p.stylist_id = $2::uuid`;
            params.push(st.id);
        }
        const { rows } = await db.query(`
            SELECT p.id, p.start_date, p.end_date, p.base_salary, p.commissions, p.total_paid, p.created_at,
                   CONCAT(u.first_name, ' ', COALESCE(u.last_name,'')) AS estilista
            FROM payrolls p
            JOIN users u ON p.stylist_id = u.id
            WHERE ${where}
            ORDER BY p.created_at DESC
            LIMIT ${parseInt(limit, 10)}
        `, params);
        return { total: rows.length, nominas: rows };
    },

    async registrar_prestamo(args, { tenantId, userId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        const principal = Number(args.monto);
        const weeks = parseInt(args.semanas, 10);
        const interestPct = Number(args.interes_porcentaje) || 0;
        const startDate = args.fecha_inicio ? new Date(args.fecha_inicio) : new Date();
        const totalInterest = principal * (interestPct / 100);
        const weeklyPrincipal = principal / weeks;
        const weeklyInterest = totalInterest / weeks;
        const weeklyPayment = weeklyPrincipal + weeklyInterest;

        const cs = await getOpenCashSession(tenantId);

        const result = await prisma.$transaction(async (tx) => {
            const loan = await tx.staff_loans.create({
                data: {
                    tenant_id: tenantId,
                    stylist_id: st.id,
                    principal,
                    interest_rate_percent: interestPct,
                    term_weeks: weeks,
                    start_date: startDate,
                    status: 'active',
                },
            });
            for (let i = 1; i <= weeks; i++) {
                const due = new Date(startDate);
                due.setDate(due.getDate() + 7 * i);
                await tx.staff_loan_installments.create({
                    data: {
                        loan_id: loan.id,
                        installment_no: i,
                        due_date: due,
                        principal_amount: weeklyPrincipal,
                        interest_amount: weeklyInterest,
                        total_amount: weeklyPayment,
                        status: 'pending',
                    },
                });
            }
            if (cs) {
                await tx.cash_movements.create({
                    data: {
                        tenant_id: tenantId,
                        user_id: userId,
                        related_user_id: st.id,
                        cash_session_id: cs.id,
                        type: 'expense',
                        description: `Préstamo a ${st.first_name} ${st.last_name || ''}`.trim(),
                        amount: -Math.abs(principal),
                        category: 'loan_to_staff',
                        payment_method: 'cash',
                    },
                });
            }
            return loan;
        });

        return {
            success: true,
            prestamo_id: result.id,
            principal,
            interes_total: totalInterest,
            cuota_semanal: weeklyPayment,
            mensaje: `Préstamo de ${fmtMoney(principal)} a ${st.first_name} en ${weeks} semanas. Cuota semanal ${fmtMoney(weeklyPayment)}. ${cs ? 'Salió de caja.' : 'Sin caja abierta — registrado solo el préstamo.'}`,
        };
    },

    async ver_prestamos_estilista(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        const { rows } = await db.query(`
            SELECT l.id, l.principal, l.interest_rate_percent, l.term_weeks, l.start_date, l.status,
                   COALESCE(SUM(CASE WHEN i.status='pending' THEN i.total_amount ELSE 0 END), 0) AS pendiente,
                   COALESCE(SUM(CASE WHEN i.status IN ('paid','deducted') THEN i.total_amount ELSE 0 END), 0) AS pagado
            FROM staff_loans l
            LEFT JOIN staff_loan_installments i ON i.loan_id = l.id
            WHERE l.tenant_id = $1::uuid AND l.stylist_id = $2::uuid
            GROUP BY l.id
            ORDER BY l.start_date DESC
        `, [tenantId, st.id]);
        return {
            estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
            total: rows.length,
            prestamos: rows,
        };
    },

    async registrar_compra_staff(args, { tenantId, userId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        const items = args.items || [];
        if (!items.length) return { error: 'Sin items.' };

        const result = await prisma.$transaction(async (tx) => {
            const productsInfo = [];
            let total = 0;
            for (const it of items) {
                const { rows } = await tx.$queryRawUnsafe(`
                    SELECT id, name, sale_price, staff_price, stock FROM products
                    WHERE tenant_id = $1::uuid AND is_active = true AND LOWER(name) LIKE $2 LIMIT 1
                `, tenantId, `%${String(it.producto).toLowerCase()}%`);
                if (!rows.length) throw new Error(`Producto "${it.producto}" no encontrado.`);
                const p = rows[0];
                const qty = parseInt(it.cantidad || 1, 10);
                if (p.stock < qty) throw new Error(`Stock insuficiente de "${p.name}". Disponible: ${p.stock}.`);
                const price = it.precio !== undefined ? Number(it.precio) : Number(p.staff_price ?? p.sale_price);
                productsInfo.push({ id: p.id, name: p.name, qty, price });
                total += qty * price;
            }

            const purchase = await tx.staff_purchases.create({
                data: {
                    tenant_id: tenantId,
                    stylist_id: st.id,
                    seller_user_id: userId,
                    total_amount: total,
                    purchase_date: new Date(),
                    status: 'pendiente',
                    payment_terms_weeks: 1,
                },
            });

            for (const p of productsInfo) {
                await tx.staff_purchase_items.create({
                    data: {
                        purchase_id: purchase.id,
                        product_id: p.id,
                        quantity: p.qty,
                        price_at_sale: p.price,
                    },
                });
                await tx.products.update({ where: { id: p.id }, data: { stock: { decrement: p.qty } } });
            }

            return { purchase, total };
        });

        return {
            success: true,
            compra_id: result.purchase.id,
            total: result.total,
            mensaje: `Compra de ${fmtMoney(result.total)} registrada para ${st.first_name}. Se descontará en su próxima nómina.`,
        };
    },

    async ver_compras_estilista(args, { tenantId }) {
        const st = await findStylist(tenantId, args.estilista);
        if (!st) return { error: `No encontré "${args.estilista}".` };
        const { rows } = await db.query(`
            SELECT id, total_amount, purchase_date, status, payment_terms_weeks
            FROM staff_purchases
            WHERE tenant_id = $1::uuid AND stylist_id = $2::uuid
            ORDER BY purchase_date DESC
            LIMIT 20
        `, [tenantId, st.id]);
        return {
            estilista: `${st.first_name} ${st.last_name || ''}`.trim(),
            total: rows.length,
            compras: rows,
        };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en personal.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[personal] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'personal', tools, systemPrompt, executors, execute };
