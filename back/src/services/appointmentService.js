// src/services/appointmentService.js
'use strict';

const prisma = require('../config/prisma');
const { formatInTimeZone } = require('date-fns-tz');
const {
  TIME_ZONE,
  BLOCKING_STATUSES,
  UUID_RE,
  clean,
  makeLocalUtc,
  toLocalHHmm,
  getDayRangesFromWorkingHours,
  getEffectiveStylistDayRanges,
  intersectRangesArrays,
  isWithinRanges,
  buildSlotsFromRanges,
} = require('../utils/appointmentHelpers');

// ==================== CACHE & HELPERS ====================
let _HAS_DURATION_OVERRIDE_COL = null;

async function hasDurationOverrideColumn() {
  if (_HAS_DURATION_OVERRIDE_COL != null) return _HAS_DURATION_OVERRIDE_COL;
  const q = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'stylist_services'
      AND column_name  = 'duration_override_minutes'
    LIMIT 1
  `;
  _HAS_DURATION_OVERRIDE_COL = q.length > 0;
  return _HAS_DURATION_OVERRIDE_COL;
}

async function getServiceDurationMinutes(service_id, fallback = 60) {
  try {
    if (!service_id || !UUID_RE.test(service_id)) return fallback;
    const res = await prisma.services.findFirst({
      where: { id: service_id },
      select: { duration_minutes: true },
    });
    if (!res) return fallback;
    const n = Number(res.duration_minutes);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch (e) {
    if (e.code === '22P02') return fallback;
    throw e;
  }
}

// ==================== RESOLVERS ====================
async function resolveServiceFuzzy(tenantId, { service, service_id, selected_service_id }, limit = 10) {
  const svcId = [selected_service_id, service_id].find(v => UUID_RE.test(clean(v)));
  if (svcId) {
    const r = await prisma.services.findFirst({
      where: { id: svcId, tenant_id: tenantId },
      select: { id: true, name: true, duration_minutes: true },
    });
    if (r) return { chosen: r, options: [] };
    return { chosen: null, options: [] };
  }

  const q = clean(service);
  if (!q) return { chosen: null, options: [] };

  const safeLimit = Math.max(3, Math.min(20, limit));
  const res = await prisma.$queryRawUnsafe(
    `SELECT id, name, duration_minutes
      FROM services
      WHERE tenant_id=$1::uuid AND name ILIKE '%' || $2 || '%'
      ORDER BY CASE WHEN LOWER(name)=LOWER($2) THEN 0 ELSE 1 END, LENGTH(name)
      LIMIT $3`,
    tenantId, q, safeLimit
  );

  if (res.length === 1) return { chosen: res[0], options: [] };
  if (res.length === 0) return { chosen: null, options: [] };
  return { chosen: null, options: res };
}

async function resolveStylistFuzzy(tenantId, { stylist, stylist_id, selected_stylist_id }, limit = 10) {
  const styId = [selected_stylist_id, stylist_id].find(v => UUID_RE.test(clean(v)));
  if (styId) {
    const r = await prisma.users.findFirst({
      where: { id: styId, tenant_id: tenantId, role_id: 3 },
      select: { id: true, first_name: true, last_name: true, working_hours: true, status: true },
    });
    if (r && (r.status || 'active') === 'active') {
      return { chosen: { ...r, name: `${r.first_name} ${r.last_name || ''}`.trim() }, options: [] };
    }
    return { chosen: null, options: [] };
  }

  const q = clean(stylist);
  if (!q) return { chosen: null, options: [] };

  const safeLimit = Math.max(3, Math.min(20, limit));
  const res = await prisma.$queryRawUnsafe(
    `SELECT id, first_name, last_name, working_hours, status
      FROM users
      WHERE tenant_id=$1::uuid AND role_id=3
        AND (first_name || ' ' || COALESCE(last_name,'')) ILIKE '%' || $2 || '%'
      ORDER BY
        CASE WHEN LOWER(TRIM(first_name || ' ' || COALESCE(last_name,''))) = LOWER(TRIM($2)) THEN 0 ELSE 1 END,
        LENGTH(TRIM(first_name || ' ' || COALESCE(last_name,'')))
      LIMIT $3`,
    tenantId, q, safeLimit
  );

  const rows = res.filter(r => (r.status || 'active') === 'active');
  if (rows.length === 1) {
    const row = rows[0];
    return { chosen: { ...row, name: `${row.first_name} ${row.last_name || ''}`.trim() }, options: [] };
  }
  if (rows.length === 0) return { chosen: null, options: [] };
  return {
    chosen: null,
    options: rows.map(r => ({ id: r.id, name: `${r.first_name} ${r.last_name || ''}`.trim(), working_hours: r.working_hours }))
  };
}

// ==================== DISPONIBILIDAD ====================

/**
 * DIGITURNO: Encuentra estilistas disponibles ordenados por cola justa
 * LOGICA ACTUALIZADA (Round Robin con Estado + Orden Visual):
 * - Busca a todos los que hacen el servicio.
 * - Verifica horarios laborales.
 * - Verifica citas existentes (marca is_busy).
 * - REORDENA la lista final: Disponibles Primero, Ocupados Despues (respetando su turno relativo).
 */
async function findAvailableStylists(tenantId, serviceName, dateStr, timeStr) {
  try {
    // 1. Obtener informacion del servicio
    const serviceRow = await prisma.services.findFirst({
      where: {
        tenant_id: tenantId,
        name: { equals: serviceName, mode: 'insensitive' },
      },
      select: { id: true, duration_minutes: true },
    });

    if (!serviceRow) {
      console.log('❌ [DIGITURNO] Servicio no encontrado:', serviceName);
      return [];
    }

    const serviceId = serviceRow.id;
    const serviceDuration = Number(serviceRow.duration_minutes) || 60;

    // 2. Calcular ventana de tiempo requerida
    const requestedStartDateTime = makeLocalUtc(dateStr, timeStr);
    const requestedEndDateTime = new Date(requestedStartDateTime.getTime() + serviceDuration * 60000);

    console.log('\n' + '🎯'.repeat(40));
    console.log('🎯 [DIGITURNO] Búsqueda de estilista disponible');
    console.log('   Servicio:', serviceName, `(${serviceId.substring(0, 8)}...)`);
    console.log('   Fecha/Hora:', dateStr, timeStr);
    console.log('   Duración:', serviceDuration, 'minutos');
    console.log('   Ventana:', requestedStartDateTime.toISOString(), '→', requestedEndDateTime.toISOString());

    // 3. Verificar horario del tenant
    const tenantRow = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { working_hours: true },
    });
    if (!tenantRow) {
      console.log('❌ [DIGITURNO] Tenant no encontrado');
      return [];
    }

    const tenantWorkingHours = tenantRow.working_hours || {};
    const tenantDayRanges = getDayRangesFromWorkingHours(tenantWorkingHours, dateStr);

    if (!Array.isArray(tenantDayRanges) || tenantDayRanges.length === 0) {
      console.log('❌ [DIGITURNO] El salón está cerrado ese día');
      return [];
    }

    if (!isWithinRanges(dateStr, tenantDayRanges, requestedStartDateTime, requestedEndDateTime)) {
      console.log('❌ [DIGITURNO] La hora solicitada está fuera del horario del salón');
      return [];
    }

    // 4. CONSULTA PRINCIPAL CON SISTEMA DE COLA JUSTA POR SERVICIO
    // Traemos a todos ordenados por su turno "logico" (quien lleva mas tiempo sin trabajar va primero)
    console.log('🔍 [DIGITURNO] Consultando cola del servicio...');

    const allPotentialStylists = await prisma.$queryRawUnsafe(
      `SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.working_hours,
          u.created_at as user_created_at,
          ss.last_completed_at,
          ss.total_completed
        FROM users u
        INNER JOIN stylist_services ss ON u.id = ss.user_id
        WHERE u.tenant_id = $1::uuid
          AND u.role_id = 3
          AND COALESCE(NULLIF(u.status,''),'active') = 'active'
          AND ss.service_id = $2::uuid
        ORDER BY
          ss.last_completed_at ASC NULLS FIRST,
          ss.total_completed ASC,
          u.created_at ASC`,
      tenantId, serviceId
    );

    console.log(`📊 [DIGITURNO] Estilistas que ofrecen el servicio: ${allPotentialStylists.length}`);

    // 5. Procesar disponibilidad
    const processedQueue = [];

    for (const stylist of allPotentialStylists) {
      // 5.1 Verificar horario laboral
      const stylistDayRanges = getEffectiveStylistDayRanges(
        stylist.working_hours ?? null,
        tenantWorkingHours,
        dateStr
      );

      if (!Array.isArray(stylistDayRanges) || stylistDayRanges.length === 0) {
        console.log(`   ⏰ ${stylist.first_name}: No trabaja ese día (Excluido)`);
        continue;
      }

      const effectiveRanges = intersectRangesArrays(tenantDayRanges, stylistDayRanges);
      if (effectiveRanges.length === 0) {
        console.log(`   ⏰ ${stylist.first_name}: Horarios no coinciden (Excluido)`);
        continue;
      }

      if (!isWithinRanges(dateStr, effectiveRanges, requestedStartDateTime, requestedEndDateTime)) {
        console.log(`   ⏰ ${stylist.first_name}: Fuera de horario laboral en esa hora`);
        continue;
      }

      // 5.2 Verificar conflictos (CITAS)
      const overlap = await prisma.$queryRawUnsafe(
        `SELECT 1 FROM appointments
          WHERE stylist_id = $1::uuid
            AND status = ANY($4)
            AND (start_time, end_time) OVERLAPS ($2, $3)
          LIMIT 1`,
        stylist.id, requestedStartDateTime, requestedEndDateTime, BLOCKING_STATUSES
      );

      const isBusy = overlap.length > 0;

      stylist.is_busy = isBusy;
      stylist.status_label = isBusy ? 'OCUPADO' : 'DISPONIBLE';

      if (isBusy) {
        console.log(`   📅 ${stylist.first_name}: Tiene cita (Marcado OCUPADO)`);
      } else {
        console.log(`   ✅ ${stylist.first_name}: DISPONIBLE`);
      }

      processedQueue.push(stylist);
    }

    // 6. REORDENAMIENTO PARA UI (EL CAMBIO CLAVE)
    // Separamos la cola en dos grupos, manteniendo el orden de SQL dentro de cada uno.
    // Grupo 1: Disponibles (Prioridad visual)
    // Grupo 2: Ocupados (Fondo de la lista)

    const availableStylists = processedQueue.filter(s => !s.is_busy);
    const busyStylists = processedQueue.filter(s => s.is_busy);

    // Concatenamos: Verdes primero, Rojos al final.
    const finalSortedQueue = [...availableStylists, ...busyStylists];

    // 7. Encontrar al SUGERIDO (Sera el primero de la lista finalSortedQueue)
    const suggestedStylist = finalSortedQueue.length > 0 ? finalSortedQueue[0] : null;

    // 8. Resumen final en Logs
    console.log('─'.repeat(90));
    console.log(`✅ [DIGITURNO] Resultado ordenado para UI: ${finalSortedQueue.length} estilistas.`);

    if (finalSortedQueue.length > 0) {
      console.log('🏆 [DIGITURNO] Estado de la cola (Disponibles primero):');
      finalSortedQueue.forEach((s, idx) => {
        const lastService = s.last_completed_at
          ? formatInTimeZone(new Date(s.last_completed_at), TIME_ZONE, 'dd/MM HH:mm')
          : 'NUNCA';

        const prefix = (suggestedStylist && s.id === suggestedStylist.id) ? '👉' : '  ';
        const statusIcon = s.is_busy ? '🔴 OCUPADO' : '🟢 DISPONIBLE';

        console.log(`   ${prefix} ${idx + 1}. ${s.first_name} ${s.last_name || ''} | ${statusIcon} | (último: ${lastService})`);
      });
    } else {
      console.log('⚠️ [DIGITURNO] No hay estilistas trabajando en este horario.');
    }

    console.log('🎯'.repeat(40) + '\n');

    // Retornamos la lista YA ORDENADA.
    // El frontend mostrara esta lista tal cual, asi que los verdes salen arriba.
    return finalSortedQueue;

  } catch (error) {
    console.error('❌ [DIGITURNO ERROR] Error al encontrar estilistas disponibles:', error);
    return [];
  }
}

async function getStylistEffectiveDuration(stylistId, serviceId, baseDuration) {
  let duration = baseDuration;
  if (await hasDurationOverrideColumn()) {
    const over = await prisma.$queryRaw`
      SELECT duration_override_minutes FROM stylist_services WHERE user_id=${stylistId}::uuid AND service_id=${serviceId}::uuid LIMIT 1
    `;
    const d = Number(over[0]?.duration_override_minutes);
    if (Number.isFinite(d) && d > 0) duration = d;
  }
  return duration;
}

async function checkStylistOffersService(stylistId, serviceId) {
  const skill = await prisma.stylist_services.findFirst({
    where: { user_id: stylistId, service_id: serviceId },
  });
  return skill !== null;
}

async function getAvailableSlotsForStylist(tenantId, stylistId, serviceId, date, stepMinutes = 15) {
  const tenantRow = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { working_hours: true },
  });
  if (!tenantRow) return { slots: [], reason: 'Tenant no encontrado' };

  const tenantWH = tenantRow.working_hours || {};
  const tenantRanges = getDayRangesFromWorkingHours(tenantWH, date);
  if (!tenantRanges.length) return { slots: [], reason: 'El salón está cerrado ese día' };

  const styRes = await prisma.users.findFirst({
    where: { id: stylistId, tenant_id: tenantId, role_id: 3 },
    select: { working_hours: true },
  });
  if (!styRes) return { slots: [], reason: 'Estilista no encontrado' };

  const stylistWH = styRes.working_hours ?? null;
  const stylistRanges = getEffectiveStylistDayRanges(stylistWH, tenantWH, date);
  if (!stylistRanges.length) return { slots: [], reason: 'El estilista no trabaja ese día' };

  const effectiveRanges = intersectRangesArrays(tenantRanges, stylistRanges);
  if (!effectiveRanges.length) return { slots: [], reason: 'Horarios no coinciden' };

  const svcRes = await prisma.services.findFirst({
    where: { id: serviceId },
    select: { duration_minutes: true },
  });
  const baseDuration = Number(svcRes?.duration_minutes) || 60;
  const duration = await getStylistEffectiveDuration(stylistId, serviceId, baseDuration);

  const apptRes = await prisma.$queryRawUnsafe(
    `SELECT start_time, end_time
      FROM appointments
      WHERE stylist_id=$1::uuid
        AND (start_time AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date = $2::date
        AND status = ANY($3)`,
    stylistId, date, BLOCKING_STATUSES
  );

  // Precalcular los limites de cierre de cada rango (en minutos desde medianoche)
  const rangeLimits = effectiveRanges.map(range => {
    const [, close] = range.split('-').map(s => s.trim());
    const [ch, cm] = close.split(':').map(Number);
    return (ch || 0) * 60 + (cm || 0);
  });

  const candidateStarts = buildSlotsFromRanges(date, effectiveRanges, stepMinutes);
  const availableSlots = candidateStarts.filter(start => {
    const end = new Date(start.getTime() + duration * 60000);

    // Verificar que el servicio completo quepa dentro del horario laboral
    const startLocal = toLocalHHmm(start);
    const endLocal = toLocalHHmm(end);
    const [sh, sm] = startLocal.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const [eh, em] = endLocal.split(':').map(Number);
    const endMin = eh * 60 + em;

    const fitsInRange = effectiveRanges.some((range, i) => {
      const [open] = range.split('-').map(s => s.trim());
      const [oh, om] = open.split(':').map(Number);
      const openMin = (oh || 0) * 60 + (om || 0);
      return startMin >= openMin && endMin <= rangeLimits[i];
    });
    if (!fitsInRange) return false;

    // Verificar que no haya conflicto con citas existentes
    return !apptRes.some(a => {
      const s = new Date(a.start_time);
      const e = new Date(a.end_time);
      return start < e && end > s;
    });
  });

  return { slots: availableSlots, duration, effectiveRanges };
}

// ==================== BOOKING ====================

/**
 * DIGITURNO: Crea una cita
 * IMPORTANTE: La actualizacion de la cola (last_completed_at) se hace en el CHECKOUT,
 * NO en la creacion de la cita.
 */
async function createAppointmentRecord(tenantId, clientId, stylistId, serviceId, startTime, duration) {
  const endTime = new Date(startTime.getTime() + duration * 60000);

  console.log('\n' + '📝'.repeat(40));
  console.log('📝 [DIGITURNO] Creando cita...');
  console.log('   Tenant ID:', tenantId);
  console.log('   Cliente:', clientId.substring(0, 8) + '...');
  console.log('   Estilista:', stylistId.substring(0, 8) + '...');
  console.log('   Servicio:', serviceId.substring(0, 8) + '...');
  console.log('   Inicio:', startTime.toISOString());
  console.log('   Fin:', endTime.toISOString());

  // 1. Verificar conflictos
  const overlap = await prisma.$queryRawUnsafe(
    `SELECT id FROM appointments
      WHERE stylist_id=$1::uuid AND status=ANY($4) AND (start_time, end_time) OVERLAPS ($2,$3)`,
    stylistId, startTime, endTime, BLOCKING_STATUSES
  );

  if (overlap.length > 0) {
    console.log('❌ [DIGITURNO] Conflicto de horario detectado');
    console.log('📝'.repeat(40) + '\n');
    throw new Error('Conflicto de horario');
  }

  // 2. Crear la cita
  const appointment = await prisma.appointments.create({
    data: {
      tenant_id: tenantId,
      client_id: clientId,
      stylist_id: stylistId,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      status: 'scheduled',
    },
  });

  console.log('✅ [DIGITURNO] Cita creada exitosamente:', appointment.id);

  // NO actualizar la cola aqui - se hace en checkout
  console.log('ℹ️  [DIGITURNO] La posición en cola se actualizará al completar la cita (checkout)');
  console.log('📝'.repeat(40) + '\n');

  return appointment;
}

// ==================== EXPORTS ====================
module.exports = {
  hasDurationOverrideColumn,
  getServiceDurationMinutes,
  resolveServiceFuzzy,
  resolveStylistFuzzy,
  findAvailableStylists,
  getStylistEffectiveDuration,
  checkStylistOffersService,
  getAvailableSlotsForStylist,
  createAppointmentRecord,
};
