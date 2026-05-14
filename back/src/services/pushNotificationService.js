// src/services/pushNotificationService.js
const prisma = require('../config/prisma');

let admin = null;

try {
  const firebaseAdmin = require('firebase-admin');
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
    });
    admin = firebaseAdmin;
    console.log('🔔 Firebase Admin SDK initialized');
  } else {
    console.log('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled');
  }
} catch (e) {
  console.log('⚠️ Firebase Admin SDK not available:', e.message);
}

/**
 * Send push notification to a specific user
 */
async function sendToUser(userId, title, body, data = {}) {
  if (!admin) return;

  try {
    const tokens = await prisma.$queryRawUnsafe(
      `SELECT token, platform FROM device_tokens WHERE user_id = $1::uuid`,
      userId
    );

    if (tokens.length === 0) return;

    // FCM requires all data values to be strings
    const stringData = {};
    for (const [k, v] of Object.entries({ ...data, click_action: 'OPEN_APP' })) {
      stringData[k] = String(v ?? '');
    }

    const message = {
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'appointments',
          priority: 'high',
          defaultVibrateTimings: true,
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1,
            'mutable-content': 1,
          },
        },
      },
    };

    const results = await Promise.allSettled(
      tokens.map((t) =>
        admin.messaging().send({ ...message, token: t.token })
      )
    );

    // Clean up invalid tokens
    const invalidTokens = [];
    results.forEach((result, i) => {
      if (
        result.status === 'rejected' &&
        (result.reason?.code === 'messaging/registration-token-not-registered' ||
          result.reason?.code === 'messaging/invalid-registration-token')
      ) {
        invalidTokens.push(tokens[i].token);
      }
    });

    if (invalidTokens.length > 0) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM device_tokens WHERE token = ANY($1::text[])`,
        invalidTokens
      );
      console.log(`🧹 Removed ${invalidTokens.length} invalid FCM tokens`);
    }
  } catch (e) {
    console.log('⚠️ Push notification error:', e.message);
  }
}

/**
 * Notify stylist about appointment events
 */
async function notifyStylist(stylistId, event, appointmentData) {
  if (!admin) return;

  const { service_name, client_name, start_time } = appointmentData;
  let title, body;
  const hora = start_time
    ? new Date(start_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  switch (event) {
    case 'created':
      title = 'Nueva cita';
      body = `${service_name || 'Servicio'} con ${client_name || 'cliente'} a las ${hora}`;
      break;
    case 'cancelled':
      title = 'Cita cancelada';
      body = `${service_name || 'Servicio'} con ${client_name || 'cliente'}`;
      break;
    case 'rescheduled':
      title = 'Cita reagendada';
      body = `${service_name || 'Servicio'} nueva hora: ${hora}`;
      break;
    default:
      title = 'Actualización de cita';
      body = service_name || 'Tu agenda ha cambiado';
  }

  await sendToUser(stylistId, title, body, {
    type: `appointment:${event}`,
    appointmentId: appointmentData.id || '',
  });
}

module.exports = { sendToUser, notifyStylist };
