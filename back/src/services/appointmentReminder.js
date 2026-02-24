'use strict';

const prisma = require('../config/prisma');
const wahaService = require('./wahaService');
const { formatInTimeZone } = require('date-fns-tz');

const TIME_ZONE = 'America/Bogota';

async function checkReminders() {
  console.log('🔔 Checking appointment reminders...');

  try {
    // 1-hour reminders
    const oneHourRows = await prisma.$queryRaw`
      SELECT a.id, a.start_time, a.client_id, a.tenant_id, a.service_id,
             s.name AS service_name,
             u.phone AS client_phone, u.first_name AS client_name
      FROM appointments a
      JOIN users u ON a.client_id = u.id
      JOIN services s ON a.service_id = s.id
      WHERE a.status IN ('scheduled', 'rescheduled')
        AND a.reminder_sent_1h = false
        AND a.start_time BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'`;

    for (const appt of oneHourRows) {
      await sendReminder(appt, '1h');
    }

    // 24-hour reminders
    const twentyFourRows = await prisma.$queryRaw`
      SELECT a.id, a.start_time, a.client_id, a.tenant_id, a.service_id,
             s.name AS service_name,
             u.phone AS client_phone, u.first_name AS client_name
      FROM appointments a
      JOIN users u ON a.client_id = u.id
      JOIN services s ON a.service_id = s.id
      WHERE a.status IN ('scheduled', 'rescheduled')
        AND a.reminder_sent_24h = false
        AND a.start_time BETWEEN NOW() + INTERVAL '23 hours 50 minutes' AND NOW() + INTERVAL '24 hours 10 minutes'`;

    for (const appt of twentyFourRows) {
      await sendReminder(appt, '24h');
    }

    const total = oneHourRows.length + twentyFourRows.length;
    if (total > 0) {
      console.log(`🔔 Sent ${total} reminder(s)`);
    }
  } catch (err) {
    console.error('❌ Error checking reminders:', err.message);
  }
}

async function sendReminder(appt, type) {
  try {
    if (!appt.client_phone) {
      console.log(`⚠️ No phone for client ${appt.client_id}, skipping reminder`);
      return;
    }

    const dateStr = formatInTimeZone(appt.start_time, TIME_ZONE, "EEEE d 'de' MMMM");
    const timeStr = formatInTimeZone(appt.start_time, TIME_ZONE, 'h:mm a');

    const emoji = type === '1h' ? '⏰' : '📅';
    const timeLabel = type === '1h' ? 'en 1 hora' : 'mañana';

    const message = `${emoji} ¡Hola ${appt.client_name || ''}! Te recordamos que tienes una cita ${timeLabel}.\n\n💇 Servicio: ${appt.service_name}\n📅 ${dateStr}\n⏰ ${timeStr}\n\n¡Te esperamos en Tu Pelukería!`;

    const chatId = appt.client_phone.replace(/\D/g, '') + '@c.us';
    await wahaService.sendMessage(appt.tenant_id, chatId, message);

    const column = type === '1h' ? 'reminder_sent_1h' : 'reminder_sent_24h';
    await prisma.appointments.update({
      where: { id: appt.id },
      data: { [column]: true },
    });

    console.log(`🔔 Reminder (${type}) sent for appointment ${appt.id}`);
  } catch (err) {
    console.error(`❌ Error sending ${type} reminder for ${appt.id}:`, err.message);
  }
}

function startReminderScheduler() {
  console.log('🔔 Appointment reminder scheduler started (every 15 min)');
  // Run once on startup after a short delay
  setTimeout(checkReminders, 30000);
  // Then every 15 minutes
  setInterval(checkReminders, 15 * 60 * 1000);
}

module.exports = { startReminderScheduler, checkReminders };
