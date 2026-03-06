// src/controllers/stylistAppController.js
const prisma = require('../config/prisma');
const { getIO } = require('../socket');
const wahaService = require('../services/wahaService');

/* ============================================================
   1) Dashboard Stats
   GET /api/stylists/stats
   Retorna:
   - services_today: Citas completadas hoy
   - earnings_today: Ganancia estimada (comision) de hoy
   - pending_approval: Citas pendientes de aprobacion (futuras o pasadas)
   - total_services_month: Servicios completados este mes
============================================================ */
exports.getDashboardStats = async (req, res) => {
    // El middleware authMiddleware inyecta req.user
    // Se asume que el usuario es un estilista (role_id=3)
    const { id: stylistId, tenant_id, commission_rate } = req.user;

    try {
        // Obtener nombre del tenant
        const tenant = await prisma.tenants.findUnique({
            where: { id: tenant_id },
            select: { name: true }
        });
        const tenantName = tenant?.name || 'Peluqueria';

        // 1. Servicios Completados HOY
        const todayStatsQuery = `
      SELECT COUNT(a.id) as count, SUM(s.price) as total_sales
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.stylist_id = $1::uuid
        AND a.tenant_id = $2::uuid
        AND a.status IN ('completed', 'checked_out')
        AND DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = DATE(NOW() AT TIME ZONE 'America/Bogota')
    `;
        const todayRes = await prisma.$queryRawUnsafe(todayStatsQuery, stylistId, tenant_id);
        const servicesToday = parseInt(todayRes[0].count || 0, 10);
        const salesToday = parseFloat(todayRes[0].total_sales || 0);

        // Calcular ganancia basada en comision (si aplica)
        // commission_rate viene del token/user (ej: 0.50 para 50%)
        const rate = parseFloat(commission_rate || 0);
        const earningsToday = salesToday * rate;

        // 2. Pendientes de Aprobacion (Total global)
        const pendingCount = await prisma.appointments.count({
            where: {
                stylist_id: stylistId,
                tenant_id: tenant_id,
                status: 'pending_approval'
            }
        });

        // 3. Total del Mes (para KPI adicional)
        const monthQuery = `
      SELECT COUNT(id) as count
      FROM appointments
      WHERE stylist_id = $1::uuid
        AND tenant_id = $2::uuid
        AND status IN ('completed', 'checked_out')
        AND date_trunc('month', start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = date_trunc('month', NOW() AT TIME ZONE 'America/Bogota')
    `;
        const monthRes = await prisma.$queryRawUnsafe(monthQuery, stylistId, tenant_id);
        const totalServicesMonth = parseInt(monthRes[0].count || 0, 10);

        return res.status(200).json({
            stylist_id: stylistId,
            tenant_name: tenantName,
            services_today: servicesToday,
            earnings_today: earningsToday, // Ganancia estimada del estilista
            pending_approval: pendingCount,
            total_services_month: totalServicesMonth
        });

    } catch (error) {
        console.error('Error getting stylist dashboard stats:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   2) Update Location (Legacy - mantiene compatibilidad)
   POST /api/stylists/location
   Body: { lat, lng, is_inside_geofence }
   NOTA: Ahora usa updateLocationWithTracking internamente
   Esta funcion se define despues de updateLocationWithTracking
============================================================ */

/* ============================================================
   3) Get Pending Bookings (Aceptar/Rechazar)
   GET /api/stylists/bookings/pending
   Retorna citas con status = 'pending_approval'
============================================================ */
exports.getPendingBookings = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    try {
        const bookings = await prisma.$queryRawUnsafe(
            `SELECT
                a.id,
                a.start_time,
                a.end_time,
                a.status,
                a.created_at,
                s.name as service_name,
                s.price as service_price,
                s.duration_minutes,
                c.id as client_id,
                c.first_name || ' ' || COALESCE(c.last_name, '') as client_name,
                c.phone as client_phone
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            LEFT JOIN users c ON a.client_id = c.id
            WHERE a.stylist_id = $1::uuid
                AND a.tenant_id = $2::uuid
                AND a.status = 'pending_approval'
            ORDER BY a.start_time ASC
            LIMIT $3 OFFSET $4`,
            stylistId, tenant_id, parseInt(limit), parseInt(offset)
        );

        return res.status(200).json({
            bookings: bookings,
            total: bookings.length
        });
    } catch (error) {
        console.error('Error getting pending bookings:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   3.5) Get All Bookings (Todas las citas del estilista)
   GET /api/stylists/bookings/all
   Retorna todas las citas del estilista (scheduled, completed, pending_approval, etc.)
============================================================ */
exports.getAllBookings = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { limit = 50, offset = 0, status, date } = req.query;

    try {
        // Obtener fecha de hoy en timezone de Bogota para comparacion
        const todayResult = await prisma.$queryRawUnsafe(`
            SELECT DATE(NOW() AT TIME ZONE 'America/Bogota') as today
        `);
        const today = todayResult[0].today.toISOString().split('T')[0];

        let query = `
            SELECT
                a.id,
                a.start_time,
                a.end_time,
                a.status,
                a.created_at,
                s.name as service_name,
                s.price as service_price,
                s.duration_minutes,
                c.id as client_id,
                c.first_name || ' ' || COALESCE(c.last_name, '') as client_name,
                c.phone as client_phone,
                DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') as fecha_local
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            LEFT JOIN users c ON a.client_id = c.id
            WHERE a.stylist_id = $1::uuid
                AND a.tenant_id = $2::uuid
        `;

        const params = [stylistId, tenant_id];
        let paramIndex = 3;

        // Filtrar solo citas de hoy y futuras (no pasadas)
        // Si se proporciona una fecha especifica, filtrar por esa fecha
        if (date) {
            // Comparar la fecha sin importar la hora, usando el timezone de Bogota
            query += ` AND DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') = CAST($${paramIndex} AS DATE)`;
            params.push(date);
            paramIndex++;
            console.log(`[getAllBookings] Filtrando por fecha: ${date} para estilista ${stylistId}`);
        } else {
            // Por defecto, solo mostrar citas de hoy y futuras (incluyendo las de hoy sin importar la hora)
            query += ` AND DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= CAST($${paramIndex} AS DATE)`;
            params.push(today);
            paramIndex++;
            console.log(`[getAllBookings] Filtrando desde hoy: ${today} para estilista ${stylistId}`);
        }

        if (status) {
            query += ` AND a.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY a.start_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const bookings = await prisma.$queryRawUnsafe(query, ...params);

        console.log(`[getAllBookings] Encontradas ${bookings.length} citas para estilista ${stylistId}`);

        return res.status(200).json({
            bookings: bookings,
            total: bookings.length
        });
    } catch (error) {
        console.error('Error getting all bookings:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   4) Accept/Reject Booking
   POST /api/stylists/bookings/:bookingId/approve
   POST /api/stylists/bookings/:bookingId/reject
   Body (reject): { reason? } (opcional)
============================================================ */
exports.approveBooking = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { bookingId } = req.params;

    try {
        // Verificar que la cita pertenece al estilista
        const checkRows = await prisma.$queryRawUnsafe(
            `SELECT a.id, a.start_time, s.name as service_name, c.phone as client_phone
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             LEFT JOIN users c ON a.client_id = c.id
             WHERE a.id = $1::uuid AND a.stylist_id = $2::uuid AND a.tenant_id = $3::uuid AND a.status = 'pending_approval'`,
            bookingId, stylistId, tenant_id
        );

        if (checkRows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o ya procesada' });
        }

        const booking = checkRows[0];

        // Actualizar estado a 'confirmed'
        const updatedBooking = await prisma.appointments.update({
            where: { id: bookingId },
            data: { status: 'confirmed', updated_at: new Date() }
        });

        // Send WhatsApp notification to client
        try {
            if (booking.client_phone) {
                const message = `\u2705 \u00a1Tu cita ha sido confirmada!\n\n\ud83d\udccb Servicio: ${booking.service_name}\n\ud83d\udcc5 Fecha: ${new Date(booking.start_time).toLocaleDateString('es-CO')}\n\ud83d\udd50 Hora: ${new Date(booking.start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\nTe esperamos. \ud83d\udc87\u200d\u2640\ufe0f`;
                await wahaService.sendMessage(tenant_id, booking.client_phone + '@c.us', message);
            }
        } catch (e) { console.log('WhatsApp notification error:', e.message); }

        return res.status(200).json({
            success: true,
            booking: updatedBooking,
            message: 'Cita aprobada exitosamente'
        });
    } catch (error) {
        console.error('Error approving booking:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.rejectBooking = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { bookingId } = req.params;
    const { reason } = req.body;

    try {
        // Verificar que la cita pertenece al estilista (con datos para WhatsApp)
        const checkRows = await prisma.$queryRawUnsafe(
            `SELECT a.id, a.start_time, s.name as service_name, c.phone as client_phone
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             LEFT JOIN users c ON a.client_id = c.id
             WHERE a.id = $1::uuid AND a.stylist_id = $2::uuid AND a.tenant_id = $3::uuid AND a.status = 'pending_approval'`,
            bookingId, stylistId, tenant_id
        );

        if (checkRows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o ya procesada' });
        }

        const booking = checkRows[0];

        // Actualizar estado a 'rejected'
        const updatedRows = await prisma.$queryRawUnsafe(
            `UPDATE appointments
             SET status = 'rejected',
                 notes = COALESCE(notes || E'\\n', '') || 'Rechazada por estilista: ' || COALESCE($2, 'Sin razon especificada'),
                 updated_at = NOW()
             WHERE id = $1::uuid
             RETURNING *`,
            bookingId, reason || null
        );

        // Send WhatsApp notification to client
        try {
            if (booking.client_phone) {
                const message = `\ud83d\ude14 Tu cita no pudo ser confirmada.\n\n\ud83d\udccb Servicio: ${booking.service_name}\n\ud83d\udcc5 Fecha: ${new Date(booking.start_time).toLocaleDateString('es-CO')}\n\nPor favor agenda una nueva cita en otro horario. Disculpa las molestias.`;
                await wahaService.sendMessage(tenant_id, booking.client_phone + '@c.us', message);
            }
        } catch (e) { console.log('WhatsApp notification error:', e.message); }

        return res.status(200).json({
            success: true,
            booking: updatedRows[0],
            message: 'Cita rechazada'
        });
    } catch (error) {
        console.error('Error rejecting booking:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   5) Get Services Attended (Historial)
   GET /api/stylists/services/attended
   Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0
============================================================ */
exports.getServicesAttended = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    try {
        let query = `
            SELECT
                a.id,
                a.start_time,
                a.end_time,
                a.status,
                a.created_at,
                s.name as service_name,
                s.price as service_price,
                s.duration_minutes,
                c.id as client_id,
                c.first_name || ' ' || COALESCE(c.last_name, '') as client_name,
                c.phone as client_phone
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            LEFT JOIN users c ON a.client_id = c.id
            WHERE a.stylist_id = $1::uuid
                AND a.tenant_id = $2::uuid
                AND a.status IN ('completed', 'checked_out')
        `;
        const params = [stylistId, tenant_id];
        let paramIndex = 3;

        if (start_date) {
            query += ` AND DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND DATE(a.start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        query += ` ORDER BY a.start_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const services = await prisma.$queryRawUnsafe(query, ...params);

        return res.status(200).json({
            services: services,
            total: services.length
        });
    } catch (error) {
        console.error('Error getting services attended:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   6) Get Product Sales
   GET /api/stylists/products/sales
   Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0
============================================================ */
exports.getProductSales = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    try {
        let query = `
            SELECT
                ii.id,
                ii.total_price,
                ii.commission_value,
                ii.quantity,
                ii.created_at,
                p.name as product_name,
                p.price as product_unit_price,
                inv.id as invoice_id,
                inv.invoice_number,
                c.id as client_id,
                c.first_name || ' ' || COALESCE(c.last_name, '') as client_name
            FROM invoice_items ii
            JOIN invoices inv ON ii.invoice_id = inv.id
            JOIN products p ON ii.related_id = p.id
            LEFT JOIN users c ON inv.client_id = c.id
            WHERE ii.seller_id = $1::uuid
                AND inv.tenant_id = $2::uuid
                AND ii.item_type = 'product'
                AND inv.status IN ('paid', 'closed', 'completed')
        `;
        const params = [stylistId, tenant_id];
        let paramIndex = 3;

        if (start_date) {
            query += ` AND DATE(inv.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND DATE(inv.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        query += ` ORDER BY inv.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const sales = await prisma.$queryRawUnsafe(query, ...params);

        return res.status(200).json({
            sales: sales,
            total: sales.length
        });
    } catch (error) {
        console.error('Error getting product sales:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   7) Update Location with Geofence Tracking
   POST /api/stylists/location
   Body: { lat, lng, is_inside_geofence }
   Este endpoint ahora tambien registra entrada/salida de geocerca
============================================================ */
exports.updateLocationWithTracking = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { lat, lng, is_inside_geofence } = req.body;

    if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'lat y lng son requeridos' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Verificar si las columnas existen antes de usarlas
            const checkColumns = await tx.$queryRaw`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN ('is_inside_geofence', 'current_lat', 'current_lng', 'last_location_update')
            `;

            const existingColumns = checkColumns.map(r => r.column_name);
            const hasGeofenceColumns = existingColumns.includes('is_inside_geofence');
            const hasLocationColumns = existingColumns.includes('current_lat') && existingColumns.includes('current_lng');

            let wasInside = false;
            if (hasGeofenceColumns) {
                // Obtener estado anterior solo si la columna existe
                const prevState = await tx.$queryRawUnsafe(
                    `SELECT is_inside_geofence FROM users WHERE id = $1::uuid AND tenant_id = $2::uuid`,
                    stylistId, tenant_id
                );
                wasInside = prevState[0]?.is_inside_geofence || false;
            }

            const nowInside = !!is_inside_geofence;

            // Construir query de actualizacion dinamicamente segun las columnas disponibles
            const updateFields = [];
            const updateValues = [];
            let paramIdx = 1;

            if (hasLocationColumns) {
                updateFields.push(`current_lat = $${paramIdx++}`);
                updateValues.push(lat);
                updateFields.push(`current_lng = $${paramIdx++}`);
                updateValues.push(lng);
            }

            if (hasGeofenceColumns) {
                updateFields.push(`is_inside_geofence = $${paramIdx++}`);
                updateValues.push(nowInside);
            }

            if (existingColumns.includes('last_location_update')) {
                updateFields.push(`last_location_update = NOW()`);
            }

            if (updateFields.length > 0) {
                updateFields.push(`updated_at = NOW()`);
                updateValues.push(stylistId, tenant_id);

                await tx.$queryRawUnsafe(
                    `UPDATE users
                     SET ${updateFields.join(', ')}
                     WHERE id = $${paramIdx}::uuid AND tenant_id = $${paramIdx + 1}::uuid`,
                    ...updateValues
                );
            }

            // Registrar cambio de estado (entrada/salida) solo si las columnas existen
            if (hasGeofenceColumns && wasInside !== nowInside) {
                try {
                    await tx.$queryRawUnsafe(
                        `INSERT INTO geofence_logs (stylist_id, tenant_id, event_type, lat, lng, created_at)
                         VALUES ($1::uuid, $2::uuid, $3, $4, $5, NOW())`,
                        stylistId, tenant_id, nowInside ? 'entry' : 'exit', lat, lng
                    );
                } catch (logError) {
                    console.warn('Warning: Tabla geofence_logs no existe. Crear con: CREATE TABLE geofence_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stylist_id UUID NOT NULL, tenant_id UUID NOT NULL, event_type VARCHAR(10) NOT NULL, lat DECIMAL(10,8), lng DECIMAL(11,8), created_at TIMESTAMP DEFAULT NOW());');
                }

                // Sync fichero queue: activate/deactivate stylist based on geofence
                try {
                    await tx.stylist_queues.updateMany({
                        where: { stylist_id: stylistId, tenant_id: tenant_id },
                        data: { is_active: nowInside, updated_at: new Date() }
                    });
                } catch (queueError) {
                    // Silently ignore if stylist_queues table doesn't exist yet
                    console.warn('Warning: Could not update fichero queue:', queueError.message);
                }
            }

            return { wasInside, nowInside };
        });

        return res.status(200).json({
            success: true,
            message: 'Ubicacion actualizada',
            geofence_event: result.wasInside !== result.nowInside ? (result.nowInside ? 'entry' : 'exit') : null
        });

    } catch (error) {
        console.error('Error updating stylist location:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   8) Get Geofence Logs (Historial de entrada/salida)
   GET /api/stylists/geofence-logs
   Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&limit=50&offset=0
============================================================ */
exports.getGeofenceLogs = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;
    const { start_date, end_date, limit = 50, offset = 0 } = req.query;

    try {
        let query = `
            SELECT
                id,
                event_type,
                lat,
                lng,
                created_at
            FROM geofence_logs
            WHERE stylist_id = $1::uuid AND tenant_id = $2::uuid
        `;
        const params = [stylistId, tenant_id];
        let paramIndex = 3;

        if (start_date) {
            query += ` AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota') <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const logs = await prisma.$queryRawUnsafe(query, ...params);

        return res.status(200).json({
            logs: logs,
            total: logs.length
        });
    } catch (error) {
        // Si la tabla no existe, retornar array vacio
        if (error.message && error.message.includes('does not exist')) {
            return res.status(200).json({
                logs: [],
                total: 0,
                message: 'Tabla de logs de geocerca no configurada aun'
            });
        }
        console.error('Error getting geofence logs:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   9) Get Tenant Geofence Configuration
   GET /api/stylists/geofence-config
   Retorna la configuracion de geocerca del tenant (centro y radio)
============================================================ */
exports.getGeofenceConfig = async (req, res) => {
    const { tenant_id } = req.user;

    try {
        // Verificar si las columnas de geocerca existen
        const checkCols = await prisma.$queryRawUnsafe(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tenants'
            AND column_name IN ('geofence_center_lat', 'geofence_center_lng', 'geofence_radius')
        `);
        const cols = checkCols.map(r => r.column_name);
        const hasGeofenceCols = cols.includes('geofence_center_lat');

        if (!hasGeofenceCols) {
            // Auto-crear columnas si no existen
            await prisma.$queryRawUnsafe(`
                ALTER TABLE tenants
                ADD COLUMN IF NOT EXISTS geofence_center_lat DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS geofence_center_lng DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS geofence_radius DOUBLE PRECISION DEFAULT 200
            `);
        }

        const tenantRows = await prisma.$queryRawUnsafe(
            `SELECT id, name, address, geofence_center_lat, geofence_center_lng, geofence_radius
             FROM tenants WHERE id = $1::uuid`,
            tenant_id
        );

        if (tenantRows.length === 0) {
            return res.status(404).json({ error: 'Tenant no encontrado' });
        }

        const tenant = tenantRows[0];
        const center = {
            lat: tenant.geofence_center_lat != null ? parseFloat(tenant.geofence_center_lat) : 4.726518,
            lng: tenant.geofence_center_lng != null ? parseFloat(tenant.geofence_center_lng) : -74.034619
        };
        const radius = tenant.geofence_radius != null ? parseFloat(tenant.geofence_radius) : 200;

        return res.status(200).json({
            tenant_id: tenant_id,
            tenant_name: tenant.name,
            geofence: {
                center,
                radius,
                radius_km: (radius / 1000).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error getting geofence config:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   9b) Save Tenant Geofence Configuration
   POST /api/stylists/geofence-config
   Guarda la configuracion de geocerca del tenant (centro y radio)
============================================================ */
exports.saveGeofenceConfig = async (req, res) => {
    const { tenant_id } = req.user;
    const { center_lat, center_lng, radius } = req.body;

    if (center_lat == null || center_lng == null || radius == null) {
        return res.status(400).json({ error: 'Se requiere center_lat, center_lng y radius' });
    }

    try {
        await prisma.tenants.update({
            where: { id: tenant_id },
            data: {
                geofence_center_lat: parseFloat(center_lat),
                geofence_center_lng: parseFloat(center_lng),
                geofence_radius: parseFloat(radius)
            }
        });

        return res.status(200).json({
            message: 'Geocerca guardada correctamente',
            geofence: {
                center: { lat: parseFloat(center_lat), lng: parseFloat(center_lng) },
                radius: parseFloat(radius),
                radius_km: (parseFloat(radius) / 1000).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Error saving geofence config:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   10) Get All Stylists with Location Tracking (Para Dashboard Web)
   GET /api/stylists/tracking
   Retorna todos los estilistas del tenant con su ubicacion actual
============================================================ */
exports.getStylistsTracking = async (req, res) => {
    const { tenant_id } = req.user;

    try {
        // Verificar que columnas existen
        const checkColumns = await prisma.$queryRawUnsafe(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('is_inside_geofence', 'current_lat', 'current_lng', 'last_location_update')
        `);

        const existingColumns = checkColumns.map(r => r.column_name);
        const hasGeofenceColumns = existingColumns.includes('is_inside_geofence');
        const hasLocationColumns = existingColumns.includes('current_lat') && existingColumns.includes('current_lng');
        const hasLastUpdate = existingColumns.includes('last_location_update');

        // Construir SELECT dinamicamente
        let selectFields = [
            'u.id',
            'u.first_name',
            'u.last_name',
            'u.status'
        ];

        if (hasLocationColumns) {
            selectFields.push('u.current_lat', 'u.current_lng');
        } else {
            selectFields.push('NULL as current_lat', 'NULL as current_lng');
        }

        if (hasGeofenceColumns) {
            selectFields.push('u.is_inside_geofence');
        } else {
            selectFields.push('false as is_inside_geofence');
        }

        if (hasLastUpdate) {
            selectFields.push('u.last_location_update');
        } else {
            selectFields.push('NULL as last_location_update');
        }

        // Agregar subconsultas para geofence_logs (si la tabla existe)
        selectFields.push(`(
            SELECT event_type
            FROM geofence_logs
            WHERE stylist_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
        ) as last_geofence_event`);
        selectFields.push(`(
            SELECT created_at
            FROM geofence_logs
            WHERE stylist_id = u.id
            ORDER BY created_at DESC
            LIMIT 1
        ) as last_geofence_event_time`);

        let orderBy = 'u.first_name ASC';
        if (hasGeofenceColumns) {
            orderBy = `CASE WHEN u.is_inside_geofence = true THEN 0 ELSE 1 END, ${orderBy}`;
        }

        const rows = await prisma.$queryRawUnsafe(
            `SELECT ${selectFields.join(', ')}
            FROM users u
            WHERE u.tenant_id = $1::uuid
              AND u.role_id = 3
              AND u.status = 'active'
            ORDER BY ${orderBy}`,
            tenant_id
        );

        const stylists = rows.map(row => ({
            id: row.id,
            name: `${row.first_name} ${row.last_name || ''}`.trim(),
            lat: row.current_lat ? parseFloat(row.current_lat) : null,
            lng: row.current_lng ? parseFloat(row.current_lng) : null,
            status: row.is_inside_geofence ? 'connected' : 'disconnected',
            is_inside_geofence: row.is_inside_geofence || false,
            last_location_update: row.last_location_update,
            last_geofence_event: row.last_geofence_event,
            last_geofence_event_time: row.last_geofence_event_time,
            has_location: row.current_lat !== null && row.current_lng !== null
        }));

        return res.status(200).json({
            stylists: stylists,
            total: stylists.length,
            connected: stylists.filter(s => s.status === 'connected').length,
            disconnected: stylists.filter(s => s.status === 'disconnected').length
        });
    } catch (error) {
        console.error('Error getting stylists tracking:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   11) Get Queue Position (Fichero Digital)
   GET /api/stylists/queue-position
   Retorna la posicion del estilista en la fila virtual de citas pendientes
============================================================ */
exports.getQueuePosition = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;

    try {
        // Obtener todas las citas pendientes ordenadas por fecha/hora
        const queueQuery = `
            SELECT
                a.id,
                a.stylist_id,
                a.start_time,
                ROW_NUMBER() OVER (ORDER BY a.start_time ASC) as position
            FROM appointments a
            WHERE a.tenant_id = $1::uuid
                AND a.status = 'pending_approval'
                AND a.start_time >= NOW()
            ORDER BY a.start_time ASC
        `;

        const queueRows = await prisma.$queryRawUnsafe(queueQuery, tenant_id);

        // Encontrar la posicion del estilista actual
        let position = null;
        let isNext = false;
        let totalInQueue = queueRows.length;

        for (let i = 0; i < queueRows.length; i++) {
            if (queueRows[i].stylist_id === stylistId) {
                position = i + 1;
                isNext = (i === 0); // Es el proximo si esta en la primera posicion
                break;
            }
        }

        // Si no tiene citas pendientes, verificar si tiene citas programadas (scheduled)
        if (position === null) {
            const scheduledRes = await prisma.$queryRawUnsafe(
                `SELECT COUNT(*) as count
                FROM appointments
                WHERE stylist_id = $1::uuid
                    AND tenant_id = $2::uuid
                    AND status = 'scheduled'
                    AND start_time >= NOW()`,
                stylistId, tenant_id
            );
            const hasScheduled = parseInt(scheduledRes[0].count || 0, 10) > 0;

            return res.status(200).json({
                has_pending: false,
                position: null,
                is_next: false,
                total_in_queue: totalInQueue,
                has_scheduled: hasScheduled,
                message: hasScheduled
                    ? 'No tienes citas pendientes de aprobacion'
                    : 'No tienes citas en el fichero digital'
            });
        }

        return res.status(200).json({
            has_pending: true,
            position: position,
            is_next: isNext,
            total_in_queue: totalInQueue,
            message: isNext
                ? 'Eres el proximo en el fichero digital'
                : `Estas en la posicion ${position} del fichero digital`
        });

    } catch (error) {
        console.error('Error getting queue position:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   12) Get Smart Queue (Fichero Inteligente)
   GET /api/stylists/smart-queue
   Retorna informacion del fichero inteligente: posicion del estilista, cola por servicio, siguiente estilista disponible
============================================================ */
exports.getSmartQueue = async (req, res) => {
    const { id: stylistId, tenant_id } = req.user;

    try {
        // 1. Obtener posicion en cola de citas pendientes
        const queueQuery = `
            SELECT
                a.id,
                a.stylist_id,
                a.start_time,
                ROW_NUMBER() OVER (ORDER BY a.start_time ASC) as position
            FROM appointments a
            WHERE a.tenant_id = $1::uuid
                AND a.status = 'pending_approval'
                AND a.start_time >= NOW()
            ORDER BY a.start_time ASC
        `;

        const queueRows = await prisma.$queryRawUnsafe(queueQuery, tenant_id);

        let position = null;
        let isNext = false;
        let totalInQueue = queueRows.length;

        for (let i = 0; i < queueRows.length; i++) {
            if (queueRows[i].stylist_id === stylistId) {
                position = i + 1;
                isNext = (i === 0);
                break;
            }
        }

        // 2. Obtener informacion del estilista actual (last_turn_at, last_service_at)
        const stylistInfoRows = await prisma.$queryRawUnsafe(
            `SELECT
                id,
                first_name,
                last_name,
                last_turn_at,
                last_service_at
            FROM users
            WHERE id = $1::uuid AND tenant_id = $2::uuid`,
            stylistId, tenant_id
        );

        const currentStylist = stylistInfoRows[0] || null;

        // 3. Obtener siguiente estilista disponible (global)
        const nextAvailableRows = await prisma.$queryRawUnsafe(
            `SELECT id, first_name, last_name, last_turn_at, last_service_at
             FROM users
             WHERE tenant_id = $1::uuid
               AND role_id = 3
               AND status = 'active'
             ORDER BY COALESCE(last_turn_at, last_service_at) ASC NULLS FIRST
             LIMIT 1`,
            tenant_id
        );

        // 4. Obtener cola por servicio (digiturno)
        const servicesRows = await prisma.$queryRawUnsafe(
            `SELECT id, name FROM services WHERE tenant_id = $1::uuid ORDER BY name`,
            tenant_id
        );

        const queueByService = [];

        for (const service of servicesRows) {
            const stylistsRows = await prisma.$queryRawUnsafe(
                `SELECT
                  u.id as stylist_id,
                  u.first_name,
                  u.last_name,
                  ss.last_completed_at,
                  ss.total_completed,
                  ROW_NUMBER() OVER (
                    ORDER BY
                      ss.last_completed_at NULLS FIRST,
                      ss.total_completed ASC,
                      u.created_at ASC
                  ) as queue_position
                FROM users u
                INNER JOIN stylist_services ss ON u.id = ss.user_id
                WHERE u.tenant_id = $1::uuid
                  AND u.role_id = 3
                  AND COALESCE(NULLIF(u.status,''),'active') = 'active'
                  AND ss.service_id = $2::uuid
                ORDER BY
                  ss.last_completed_at NULLS FIRST,
                  ss.total_completed ASC,
                  u.created_at ASC`,
                tenant_id, service.id
            );

            // Encontrar posicion del estilista actual en este servicio
            let myPosition = null;
            for (let i = 0; i < stylistsRows.length; i++) {
                if (stylistsRows[i].stylist_id === stylistId) {
                    myPosition = i + 1;
                    break;
                }
            }

            queueByService.push({
                service_id: service.id,
                service_name: service.name,
                my_position: myPosition,
                total_stylists: stylistsRows.length,
                queue: stylistsRows.map((row, idx) => ({
                    stylist_id: row.stylist_id,
                    stylist_name: `${row.first_name} ${row.last_name || ''}`.trim(),
                    position: idx + 1,
                    is_me: row.stylist_id === stylistId,
                    last_completed_at: row.last_completed_at,
                    total_completed: row.total_completed || 0
                }))
            });
        }

        return res.status(200).json({
            stylist: currentStylist ? {
                id: currentStylist.id,
                name: `${currentStylist.first_name} ${currentStylist.last_name || ''}`.trim(),
                last_turn_at: currentStylist.last_turn_at,
                last_service_at: currentStylist.last_service_at
            } : null,
            pending_appointments: {
                has_pending: position !== null,
                position: position,
                is_next: isNext,
                total_in_queue: totalInQueue,
                message: isNext
                    ? 'Eres el proximo en el fichero digital'
                    : position !== null
                        ? `Estas en la posicion ${position} del fichero digital`
                        : 'No tienes citas pendientes de aprobacion'
            },
            next_available_stylist: nextAvailableRows.length > 0 ? {
                id: nextAvailableRows[0].id,
                name: `${nextAvailableRows[0].first_name} ${nextAvailableRows[0].last_name || ''}`.trim(),
                is_me: nextAvailableRows[0].id === stylistId
            } : null,
            queue_by_service: queueByService
        });

    } catch (error) {
        console.error('Error getting smart queue:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/* ============================================================
   Alias para compatibilidad: updateLocation usa updateLocationWithTracking
============================================================ */
exports.updateLocation = exports.updateLocationWithTracking;

/* ============================================================
   13) Create Schedule Block (Freeze Agenda)
   POST /api/stylists/schedule-block
   Body: { start_date, end_date, reason }
============================================================ */
exports.createScheduleBlock = async (req, res) => {
  const { id: stylistId, tenant_id } = req.user;
  const { start_date, end_date, reason } = req.body;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date y end_date son requeridos' });
  }

  try {
    const block = await prisma.schedule_blocks.create({
      data: {
        stylist_id: stylistId,
        tenant_id: tenant_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        reason: reason || null
      }
    });

    // Get stylist name for notification
    const user = await prisma.users.findUnique({
      where: { id: stylistId },
      select: { first_name: true, last_name: true }
    });
    const stylistName = `${user.first_name} ${user.last_name || ''}`.trim();

    // Emit socket event to notify admin
    try {
      getIO().to(`tenant:${tenant_id}`).emit('schedule:block_requested', {
        ...block,
        stylist_name: stylistName
      });
    } catch (e) { console.log('Socket emit error:', e.message); }

    return res.status(201).json({ success: true, block });
  } catch (error) {
    console.error('Error creating schedule block:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   14) Get Schedule Blocks (Stylist's own blocks)
   GET /api/stylists/schedule-blocks
============================================================ */
exports.getScheduleBlocks = async (req, res) => {
  const { id: stylistId } = req.user;

  try {
    const blocks = await prisma.schedule_blocks.findMany({
      where: { stylist_id: stylistId },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    return res.json({ blocks: blocks });
  } catch (error) {
    console.error('Error getting schedule blocks:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   15) Approve Schedule Block (Admin)
   PUT /api/stylists/schedule-blocks/:blockId/approve
============================================================ */
exports.approveScheduleBlock = async (req, res) => {
  const { id: adminId, tenant_id } = req.user;
  const { blockId } = req.params;

  try {
    const updatedRows = await prisma.$queryRawUnsafe(
      `UPDATE schedule_blocks SET status = 'approved', updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND status = 'pending' RETURNING *`,
      blockId, tenant_id
    );

    if (updatedRows.length === 0) {
      return res.status(404).json({ error: 'Bloqueo no encontrado o ya procesado' });
    }

    try {
      getIO().to(`tenant:${tenant_id}`).emit('schedule:block_approved', updatedRows[0]);
    } catch (e) {}

    return res.json({ success: true, block: updatedRows[0] });
  } catch (error) {
    console.error('Error approving schedule block:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/* ============================================================
   16) Reject Schedule Block (Admin)
   PUT /api/stylists/schedule-blocks/:blockId/reject
   Body: { admin_note }
============================================================ */
exports.rejectScheduleBlock = async (req, res) => {
  const { tenant_id } = req.user;
  const { blockId } = req.params;
  const { admin_note } = req.body;

  try {
    const updatedRows = await prisma.$queryRawUnsafe(
      `UPDATE schedule_blocks SET status = 'rejected', admin_note = $3, updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND status = 'pending' RETURNING *`,
      blockId, tenant_id, admin_note || null
    );

    if (updatedRows.length === 0) {
      return res.status(404).json({ error: 'Bloqueo no encontrado o ya procesado' });
    }

    try {
      getIO().to(`tenant:${tenant_id}`).emit('schedule:block_rejected', updatedRows[0]);
    } catch (e) {}

    return res.json({ success: true, block: updatedRows[0] });
  } catch (error) {
    console.error('Error rejecting schedule block:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
