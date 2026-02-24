'use strict';

const prisma = require('../config/prisma');
const db = require('../config/db');
const wahaService = require('../services/wahaService');
const { formatInTimeZone, zonedTimeToUtc } = require('date-fns-tz');
const { getIO } = require('../socket');
const { normalizeDateKeyword, normalizeHumanTimeToHHMM, BLOCKING_STATUSES } = require('../utils/appointmentHelpers');
const { getGlobalOpenAIKey } = require('../services/openaiKeyService');
const { trackUsage } = require('../services/tokenTracker');
const { executeFunction: executeAdminFunction, ADMIN_TOOLS, ADMIN_SYSTEM_PROMPT } = require('./aiAdminChatController');
const bcrypt = require('bcryptjs');

console.log('🚀 [DEBUG] whatsappController.js cargado v15 (Fixes: ORM, cache, security)');

const TIME_ZONE = 'America/Bogota';

// Cache para historial de conversación
const conversationCache = new Map();

// Cache para datos de reserva en progreso
const bookingContextCache = new Map();

// Cache para sesiones admin por WhatsApp
const adminSessionCache = new Map();   // Key: "tenantId:chatId" → { userId, role_id, email, name, lastActivity, conversationHistory }
const adminAuthStateCache = new Map(); // Key: "tenantId:chatId" → { step: 'email'|'password', email?, attempts, blockedUntil? }
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const ADMIN_MAX_ATTEMPTS = 3;
const ADMIN_BLOCK_TIME = 5 * 60 * 1000; // 5 minutos de bloqueo

// ==================== LIMPIEZA PERIÓDICA DE CACHES ====================
const CONVERSATION_TTL = 60 * 60 * 1000; // 1 hora sin actividad
const BOOKING_TTL = 30 * 60 * 1000;      // 30 min sin actividad
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // Limpiar cada 5 min

// Agregar timestamps a las entradas de cache
function setCacheWithTimestamp(cache, key, value) {
    cache.set(key, { data: value, lastAccess: Date.now() });
}
function getCacheData(cache, key) {
    const entry = cache.get(key);
    if (!entry) return null;
    entry.lastAccess = Date.now();
    return entry.data;
}

// Limpieza periódica de caches
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of conversationCache.entries()) {
        // Soportar tanto formato viejo (array directo) como nuevo (con timestamp)
        if (Array.isArray(entry)) {
            // Formato viejo: convertir a nuevo formato
            conversationCache.set(key, { data: entry, lastAccess: now });
        } else if (entry.lastAccess && (now - entry.lastAccess > CONVERSATION_TTL)) {
            conversationCache.delete(key);
            cleaned++;
        }
    }

    for (const [key, entry] of bookingContextCache.entries()) {
        if (entry && typeof entry === 'object' && !entry.lastAccess) {
            bookingContextCache.set(key, { data: entry, lastAccess: now });
        } else if (entry.lastAccess && (now - entry.lastAccess > BOOKING_TTL)) {
            bookingContextCache.delete(key);
            cleaned++;
        }
    }

    for (const [key, session] of adminSessionCache.entries()) {
        if (session.lastActivity && (now - session.lastActivity > ADMIN_SESSION_TIMEOUT)) {
            adminSessionCache.delete(key);
            cleaned++;
        }
    }

    for (const [key, state] of adminAuthStateCache.entries()) {
        // Limpiar estados de auth que llevan más de 10 min
        if (state.createdAt && (now - state.createdAt > 10 * 60 * 1000)) {
            adminAuthStateCache.delete(key);
            cleaned++;
        }
        // Limpiar bloqueos expirados
        if (state.blockedUntil && now > state.blockedUntil) {
            adminAuthStateCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 [CACHE] Limpieza: ${cleaned} entradas eliminadas. Sizes: conv=${conversationCache.size}, booking=${bookingContextCache.size}, adminSess=${adminSessionCache.size}, authState=${adminAuthStateCache.size}`);
    }
}, CACHE_CLEANUP_INTERVAL);

/* =================================================================== */
/* ==============   TTS HELPER (ElevenLabs + OpenAI fallback)  ======= */
/* =================================================================== */

const GLOBAL_ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || null;
const GLOBAL_ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

async function sendTTSResponse(tenantId, chatId, text) {
    try {
        const apiKey = await getGlobalOpenAIKey();
        let audioBase64 = null;

        // 1. Obtener key de ElevenLabs (tenant > global > null)
        let elevenLabsKey = GLOBAL_ELEVENLABS_KEY;
        let voiceId = GLOBAL_ELEVENLABS_VOICE;
        try {
            const tenantVoice = await db.query('SELECT elevenlabs_api_key, elevenlabs_voice_id FROM tenants WHERE id = $1::uuid', [tenantId]);
            if (tenantVoice.rows[0]?.elevenlabs_api_key) {
                elevenLabsKey = tenantVoice.rows[0].elevenlabs_api_key;
            }
            if (tenantVoice.rows[0]?.elevenlabs_voice_id) {
                voiceId = tenantVoice.rows[0].elevenlabs_voice_id;
            }
        } catch (e) { /* usar globals */ }

        // 2. Intentar ElevenLabs primero
        console.log(`   🔊 [TTS] elevenLabsKey=${elevenLabsKey ? elevenLabsKey.slice(0, 10) + '...' : 'NULL'}, voiceId=${voiceId}`);
        if (elevenLabsKey) {
            try {
                const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: 'POST',
                    headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    })
                });
                if (elevenLabsResponse.ok) {
                    const audioBuffer = Buffer.from(await elevenLabsResponse.arrayBuffer());
                    audioBase64 = audioBuffer.toString('base64');
                    console.log(`   🔊 TTS generado con ElevenLabs (voice: ${voiceId})`);
                } else {
                    const errBody = await elevenLabsResponse.text();
                    console.warn(`   ⚠️ ElevenLabs TTS status ${elevenLabsResponse.status}: ${errBody}`);
                }
            } catch (elErr) {
                console.warn('   ⚠️ ElevenLabs TTS falló:', elErr.message);
            }
        } else {
            console.warn('   ⚠️ [TTS] No hay ElevenLabs API key, usando OpenAI fallback');
        }

        // 3. Fallback a OpenAI TTS
        if (!audioBase64 && apiKey) {
            try {
                const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'tts-1-hd',
                        voice: 'alloy',
                        input: text,
                        response_format: 'opus'
                    })
                });
                if (ttsResponse.ok) {
                    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
                    audioBase64 = audioBuffer.toString('base64');
                    trackUsage(tenantId, 'tts', 'tts-1-hd', 0, 0, text.length);
                    console.log(`   🔊 TTS generado con OpenAI`);
                }
            } catch (oaiErr) {
                console.warn('   ⚠️ OpenAI TTS falló:', oaiErr.message);
            }
        }

        // 4. Enviar audio
        if (audioBase64) {
            await wahaService.sendVoice(tenantId, chatId, audioBase64);
            console.log(`   ✅ Nota de voz enviada`);
            return true;
        }
        return false;
    } catch (err) {
        console.error('❌ sendTTSResponse error:', err.message);
        return false;
    }
}

/* =================================================================== */
/* ==============   CITAS PRÓXIMAS DEL CLIENTE (WHATSAPP)  =========== */
/* =================================================================== */

async function getUpcomingAppointmentsForClient(tenantId, clientId) {
    if (!tenantId || !clientId) return [];
    try {
        const now = new Date();
        const rows = await prisma.$queryRawUnsafe(
            `SELECT a.id, a.start_time, a.service_id, s.name AS service_name,
                    u.first_name || ' ' || COALESCE(u.last_name, '') AS stylist_name
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             JOIN users u ON a.stylist_id = u.id
             WHERE a.tenant_id = $1::uuid AND a.client_id = $2::uuid
               AND a.status IN ('scheduled', 'pending_approval', 'rescheduled')
               AND a.start_time >= $3::timestamptz
             ORDER BY a.start_time ASC
             LIMIT 10`,
            tenantId, clientId, now
        );
        const esLocale = require('date-fns/locale/es');
        return rows.map(row => {
            const start = new Date(row.start_time);
            const dateFormatted = formatInTimeZone(start, TIME_ZONE, "EEEE d 'de' MMMM", { locale: esLocale });
            const timeFormatted = formatInTimeZone(start, TIME_ZONE, 'h:mm a', { locale: esLocale });
            return {
                id: row.id,
                start_time: row.start_time,
                dateFormatted,
                timeFormatted,
                service_name: row.service_name,
                stylist_name: (row.stylist_name || '').trim() || 'Estilista'
            };
        });
    } catch (err) {
        console.error('❌ getUpcomingAppointmentsForClient:', err.message);
        return [];
    }
}

/* =================================================================== */
/* ==============   EXTRACCIÓN DE FECHA/HORA DEL MENSAJE   =========== */
/* =================================================================== */

function extractDateTimeFromMessage(message) {
    const result = { date: null, time: null };
    
    // Normalizar mensaje: reemplazar errores tipográficos comunes
    let normalizedMessage = message.toLowerCase()
        .replace(/ma[;:.,]ana/gi, 'mañana')      // ma;ana, ma:ana, ma.ana → mañana
        .replace(/manana/gi, 'mañana')           // manana → mañana
        .replace(/ma[ñn]ana/gi, 'mañana')        // mañana, manana → mañana
        // 🆕 Normalizar días de la semana con typos comunes
        .replace(/vien[rn]es/gi, 'viernes')      // vienres, viennes → viernes
        .replace(/juev[ea]s/gi, 'jueves')        // juevas, juevss → jueves
        .replace(/mi[eé]rcol[ea]s/gi, 'miércoles') // miercolas, miércoless → miércoles
        .replace(/mier[ck]ol[ea]s/gi, 'miércoles') // mierkoles → miércoles
        .replace(/mart[ea]s/gi, 'martes')        // martas → martes
        .replace(/lun[ea]s/gi, 'lunes')          // lunas → lunes
        .replace(/s[aá]bad[oa]/gi, 'sábado')     // sabada, sababo → sábado
        .replace(/doming[oa]/gi, 'domingo');     // dominga → domingo

    console.log(`\n🔍 [EXTRACT] Analizando mensaje: "${message}"`);
    if (normalizedMessage !== message.toLowerCase()) {
        console.log(`   📝 Normalizado a: "${normalizedMessage}"`);
    }

    // Fecha
    const datePatterns = [
        { regex: /(?:para\s+)?(pasado\s*mañana)/i, keyword: 'pasado mañana' },
        { regex: /(?:para\s+)?(mañana)/i, keyword: 'mañana' },
        { regex: /(?:para\s+)?(hoy)/i, keyword: 'hoy' },
        { regex: /(?:para\s+)?(?:el\s+|este\s+)?(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)/i, extract: true },
    ];

    for (const pattern of datePatterns) {
        const match = normalizedMessage.match(pattern.regex);
        if (match) {
            let dateInput = pattern.keyword || match[0];
            dateInput = dateInput.replace(/^para\s+/i, '').trim();
            const normalized = normalizeDateKeyword(dateInput);
            if (normalized) {
                result.date = normalized;
                console.log(`   ✅ Fecha detectada: "${dateInput}" → ${normalized}`);
                break;
            }
        }
    }

    // Hora - patrones mejorados
    const timePatterns = [
        /a\s+las\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)?/i,
        /las\s+(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i,  // "las 2", "las 14", "las 9.30"
        /\b(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,  // "9.30 am", "9:30 pm"
        /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,  // "9 am", "2pm"
        /(?:tipo|como\s+a\s+las?)\s+(\d{1,2})(?:[:.](\d{2}))?/i,  // "tipo 9.30"
        /\b(\d{1,2})[:.](\d{2})\b/,  // "14:00", "9.30"
    ];

    for (const pattern of timePatterns) {
        const match = normalizedMessage.match(pattern);
        if (match) {
            const timeStr = match[0];
            const normalized = normalizeHumanTimeToHHMM(timeStr);
            if (normalized && normalized !== '') {
                result.time = normalized;
                console.log(`   ✅ Hora detectada: "${timeStr}" → ${normalized}`);
                break;
            }
        }
    }

    return result;
}

/* =================================================================== */
/* ==============   WEBHOOK (LISTEN TO WAHA)   ======================= */
/* =================================================================== */

exports.handleWahaWebhook = async (req, res) => {
    try {
        const event = req.body;
        const eventType = event.event;
        const tenantId = event.session;

        console.log(`\n📥 [WEBHOOK] Evento recibido: ${eventType} | Sesión: ${tenantId}`);

        // Cambio de estado de sesión
        if (eventType === 'session.status' && event.payload?.status === 'authenticated') {
            console.log('🔔 [WEBHOOK] ¡Conexión Exitosa Detectada!');

            const me = event.me || event.payload.me;
            if (tenantId && me) {
                const rawNumber = me.id;
                const cleanNumber = rawNumber.split('@')[0];
                const displayNumber = '+' + cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');

                await prisma.$queryRawUnsafe(
                    `UPDATE tenant_numbers
                     SET provider = 'disconnected', phone_number_id = 'disconnected', display_phone_number = ''
                     WHERE phone_number_id = $1 AND tenant_id != $2::uuid`,
                    cleanNumber, tenantId
                );

                await prisma.$queryRawUnsafe(
                    `UPDATE tenant_numbers
                     SET provider = 'waha', phone_number_id = $1, display_phone_number = $2, updated_at = NOW()
                     WHERE tenant_id = $3::uuid`,
                    cleanNumber, displayNumber, tenantId
                );

                console.log(`   ✅ Tenant ${tenantId} conectado con número ${displayNumber}`);
            }
        }

        // Mensaje entrante
        if (eventType === 'message' && event.payload) {
            const payload = event.payload;

            if (payload.fromMe) {
                return res.status(200).send('OK');
            }

            const messageType = payload.type || payload._data?.type;
            const chatId = payload.from;
            let userMessage = payload.body;
            let isVoiceMessage = false;

            const phoneNumber = chatId.split('@')[0];

            // ═══════════════════════════════════════════════════════════
            // ══════  TRANSCRIPCIÓN DE AUDIO (antes del interceptor)  ==
            // ═══════════════════════════════════════════════════════════
            if (messageType === 'ptt' || messageType === 'audio') {
                console.log(`\n🎤 [AUDIO PRE-INTERCEPT] Transcribiendo audio de ${phoneNumber}...`);
                isVoiceMessage = true;
                try {
                    const apiKey = await getGlobalOpenAIKey();
                    if (apiKey) {
                        const axios = require('axios');
                        let audioBuffer = null;
                        const WAHA_URL = process.env.WAHA_URL || 'http://212.28.189.253:3002';
                        const WAHA_API_KEY = process.env.WAHA_API_KEY || '';

                        if (payload.media?.url) {
                            try {
                                let mediaUrl = payload.media.url;
                                if (mediaUrl.includes('localhost:3000')) mediaUrl = mediaUrl.replace('http://localhost:3000', WAHA_URL);
                                if (mediaUrl.includes('0.0.0.0:3000')) mediaUrl = mediaUrl.replace('http://0.0.0.0:3000', WAHA_URL);
                                const audioResponse = await axios.get(mediaUrl, {
                                    responseType: 'arraybuffer',
                                    headers: { 'X-Api-Key': WAHA_API_KEY },
                                    timeout: 10000
                                });
                                audioBuffer = Buffer.from(audioResponse.data);
                            } catch (urlError) {
                                console.log(`   ⚠️ URL directa falló: ${urlError.message}`);
                            }
                        }
                        if (!audioBuffer && payload.id) {
                            try {
                                const downloadUrl = `${WAHA_URL}/api/${tenantId}/messages/${payload.id}/download`;
                                const audioResponse = await axios.get(downloadUrl, {
                                    responseType: 'arraybuffer',
                                    headers: { 'X-Api-Key': WAHA_API_KEY },
                                    timeout: 10000
                                });
                                audioBuffer = Buffer.from(audioResponse.data);
                            } catch (wahaError) {
                                console.log(`   ⚠️ WAHA API falló: ${wahaError.message}`);
                            }
                        }
                        if (!audioBuffer) {
                            await wahaService.sendMessage(tenantId, chatId, '🎤 No pude acceder a tu nota de voz. ¿Puedes escribirme?');
                            return res.status(200).send('OK');
                        }
                        const FormData = require('form-data');
                        const formData = new FormData();
                        formData.append('file', audioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
                        formData.append('model', 'whisper-1');
                        formData.append('language', 'es');
                        const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                            headers: { 'Authorization': `Bearer ${apiKey}`, ...formData.getHeaders() }
                        });
                        userMessage = whisperResponse.data.text;
                        console.log(`   📝 Transcripción: "${userMessage}"`);
                        trackUsage(tenantId, 'whisper', 'whisper-1', 0, 0, 0);
                    } else {
                        await wahaService.sendMessage(tenantId, chatId, '🎤 No puedo procesar notas de voz en este momento.');
                        return res.status(200).send('OK');
                    }
                } catch (voiceError) {
                    console.error('❌ Error transcribiendo audio:', voiceError.message);
                    await wahaService.sendMessage(tenantId, chatId, '😅 Hubo un problema con tu nota de voz. ¿Puedes escribirme?');
                    return res.status(200).send('OK');
                }
            }

            // ═══════════════════════════════════════════════════════════
            // ══════  INTERCEPTOR: ADMIN POR WHATSAPP  ═════════════════
            // ═══════════════════════════════════════════════════════════
            if (userMessage && typeof userMessage === 'string') {
                const adminCacheKey = `${tenantId}:${chatId}`;
                const adminSession = adminSessionCache.get(adminCacheKey);
                const authState = adminAuthStateCache.get(adminCacheKey);
                const msgTrimmed = userMessage.trim();
                const msgLower = msgTrimmed.toLowerCase();

                // 1. Si ya tiene sesión admin activa
                if (adminSession && (Date.now() - adminSession.lastActivity < ADMIN_SESSION_TIMEOUT)) {
                    // Comando para salir
                    if (/^(salir|cerrar\s*sesion|cerrar\s*sesión|exit|logout)$/i.test(msgTrimmed)) {
                        adminSessionCache.delete(adminCacheKey);
                        await wahaService.sendMessage(tenantId, chatId, '🔓 Sesión de administrador cerrada. Volviste al modo cliente.');
                        return res.status(200).send('OK');
                    }

                    // Comando para cambiar de salón
                    if (/^(cambiar\s*sal[oó]n|cambiar\s*peluquer[ií]a|otro\s*local|switch\s*salon)$/i.test(msgTrimmed)) {
                        try {
                            const currentAdminTenantId = adminSession.tenantId || tenantId;
                            const userTenantRows = await prisma.$queryRawUnsafe(
                                `SELECT id, name, parent_tenant_id FROM tenants WHERE id = $1::uuid`,
                                currentAdminTenantId
                            );

                            let relatedTenants = [];
                            if (userTenantRows.length > 0) {
                                const ut = userTenantRows[0];
                                const parentId = ut.parent_tenant_id || ut.id;
                                relatedTenants = await prisma.$queryRawUnsafe(
                                    `SELECT id, name FROM tenants
                                     WHERE id = $1::uuid OR parent_tenant_id = $1::uuid
                                     ORDER BY name`,
                                    parentId
                                );
                            }

                            if (relatedTenants.length <= 1) {
                                await wahaService.sendMessage(tenantId, chatId, 'Solo tienes un local registrado.');
                                return res.status(200).send('OK');
                            }

                            const tenantList = relatedTenants.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
                            adminSessionCache.delete(adminCacheKey);
                            adminAuthStateCache.set(adminCacheKey, {
                                step: 'select_tenant',
                                userId: adminSession.userId,
                                role_id: adminSession.role_id,
                                email: adminSession.email,
                                name: adminSession.name,
                                tenants: relatedTenants,
                                createdAt: Date.now()
                            });

                            await wahaService.sendMessage(tenantId, chatId, `¿Cuál local quieres administrar?\n\n${tenantList}\n\nEnvía el número.`);
                        } catch (switchErr) {
                            console.error('❌ Error cambiando salón:', switchErr.message);
                            await wahaService.sendMessage(tenantId, chatId, 'Error al buscar locales. Intenta de nuevo.');
                        }
                        return res.status(200).send('OK');
                    }

                    // Procesar con IA admin (usar tenantId del adminSession si existe)
                    adminSession.lastActivity = Date.now();
                    const effectiveTenantId = adminSession.tenantId || tenantId;
                    try {
                        const adminResponse = await processWithAdminAI(effectiveTenantId, adminSession, msgTrimmed, isVoiceMessage);

                        // Si el admin envió audio, responder con TTS
                        if (isVoiceMessage) {
                            const sent = await sendTTSResponse(tenantId, chatId, adminResponse);
                            if (!sent) await wahaService.sendMessage(tenantId, chatId, adminResponse);
                        } else {
                            await wahaService.sendMessage(tenantId, chatId, adminResponse);
                        }
                    } catch (adminErr) {
                        console.error('❌ [ADMIN WA] Error:', adminErr.message);
                        await wahaService.sendMessage(tenantId, chatId, '😅 Hubo un error procesando tu solicitud de admin. Intenta de nuevo.');
                    }
                    return res.status(200).send('OK');
                }

                // Limpiar sesión admin expirada
                if (adminSession) {
                    adminSessionCache.delete(adminCacheKey);
                }

                // 2. Si está en proceso de autenticación
                if (authState) {
                    // Verificar bloqueo por intentos fallidos
                    if (authState.blockedUntil && Date.now() < authState.blockedUntil) {
                        const minutesLeft = Math.ceil((authState.blockedUntil - Date.now()) / 60000);
                        await wahaService.sendMessage(tenantId, chatId, `⛔ Demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto(s).`);
                        return res.status(200).send('OK');
                    }

                    // Comando para cancelar autenticación
                    if (/^(cancelar|salir|exit)$/i.test(msgTrimmed)) {
                        adminAuthStateCache.delete(adminCacheKey);
                        await wahaService.sendMessage(tenantId, chatId, '❌ Autenticación cancelada.');
                        return res.status(200).send('OK');
                    }

                    // "admin" reinicia el flujo de autenticación
                    if (/^admin(istrador)?$/i.test(msgTrimmed)) {
                        adminAuthStateCache.set(adminCacheKey, { step: 'email', attempts: 0, createdAt: Date.now() });
                        await wahaService.sendMessage(tenantId, chatId, '🔐 *Modo Administrador*\n\nIngresa tu email de administrador:');
                        return res.status(200).send('OK');
                    }

                    if (authState.step === 'email') {
                        // Validar que parece un email
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msgTrimmed)) {
                            await wahaService.sendMessage(tenantId, chatId, '⚠️ Eso no parece un email válido. Ingresa tu email de administrador:');
                            return res.status(200).send('OK');
                        }
                        authState.email = msgTrimmed.toLowerCase();
                        authState.step = 'password';
                        adminAuthStateCache.set(adminCacheKey, authState);
                        await wahaService.sendMessage(tenantId, chatId, '🔑 Ahora ingresa tu contraseña:');
                        return res.status(200).send('OK');
                    }

                    if (authState.step === 'select_tenant') {
                        const selection = parseInt(msgTrimmed, 10);
                        if (isNaN(selection) || selection < 1 || selection > authState.tenants.length) {
                            await wahaService.sendMessage(tenantId, chatId, `Envía un número del 1 al ${authState.tenants.length} para seleccionar el local.`);
                            return res.status(200).send('OK');
                        }
                        const selectedTenant = authState.tenants[selection - 1];
                        adminAuthStateCache.delete(adminCacheKey);

                        adminSessionCache.set(adminCacheKey, {
                            userId: authState.userId,
                            role_id: authState.role_id,
                            email: authState.email,
                            name: authState.name,
                            tenantId: selectedTenant.id,
                            tenantName: selectedTenant.name,
                            lastActivity: Date.now(),
                            conversationHistory: []
                        });

                        console.log(`🔐 [ADMIN WA] Sesión admin iniciada: ${authState.name} (${authState.email}) en tenant ${selectedTenant.id} (${selectedTenant.name})`);
                        await wahaService.sendMessage(tenantId, chatId,
                            `✅ Administrando *${selectedTenant.name}*\n\nPuedes preguntarme sobre citas, ventas, estilistas, servicios, productos, promociones y configuración.\n\nEscribe *"salir"* para cerrar sesión.\nEscribe *"cambiar salón"* para administrar otro local.\n⏱️ La sesión expira tras 30 min de inactividad.`
                        );
                        return res.status(200).send('OK');
                    }

                    if (authState.step === 'password') {
                        try {
                            // Buscar usuario por email GLOBALMENTE (sin filtrar por tenant) con role admin
                            const userRows = await prisma.$queryRawUnsafe(
                                `SELECT id, email, password_hash, role_id, first_name, last_name, tenant_id
                                 FROM users
                                 WHERE LOWER(email) = $1 AND role_id IN (1, 2)`,
                                authState.email
                            );

                            if (userRows.length === 0) {
                                authState.attempts = (authState.attempts || 0) + 1;
                                if (authState.attempts >= ADMIN_MAX_ATTEMPTS) {
                                    authState.blockedUntil = Date.now() + ADMIN_BLOCK_TIME;
                                    authState.step = 'email';
                                    adminAuthStateCache.set(adminCacheKey, authState);
                                    await wahaService.sendMessage(tenantId, chatId, '⛔ Demasiados intentos fallidos. Intenta de nuevo en 5 minutos.');
                                } else {
                                    const remaining = ADMIN_MAX_ATTEMPTS - authState.attempts;
                                    adminAuthStateCache.delete(adminCacheKey);
                                    await wahaService.sendMessage(tenantId, chatId, `❌ Credenciales inválidas. Te quedan ${remaining} intento(s). Escribe *admin* para reintentar.`);
                                }
                                return res.status(200).send('OK');
                            }

                            const user = userRows[0];
                            const passwordMatch = await bcrypt.compare(msgTrimmed, user.password_hash);

                            if (!passwordMatch) {
                                authState.attempts = (authState.attempts || 0) + 1;
                                if (authState.attempts >= ADMIN_MAX_ATTEMPTS) {
                                    authState.blockedUntil = Date.now() + ADMIN_BLOCK_TIME;
                                    authState.step = 'email';
                                    adminAuthStateCache.set(adminCacheKey, authState);
                                    await wahaService.sendMessage(tenantId, chatId, '⛔ Demasiados intentos fallidos. Intenta de nuevo en 5 minutos.');
                                } else {
                                    const remaining = ADMIN_MAX_ATTEMPTS - authState.attempts;
                                    await wahaService.sendMessage(tenantId, chatId, `❌ Contraseña incorrecta. Te quedan ${remaining} intento(s). Ingresa tu contraseña:`);
                                }
                                return res.status(200).send('OK');
                            }

                            // Autenticación exitosa - buscar tenants relacionados
                            const adminName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin';
                            const userTenantId = user.tenant_id;

                            // Buscar tenants relacionados (hijos, padre, hermanos)
                            let relatedTenants = [];
                            try {
                                const userTenantRows = await prisma.$queryRawUnsafe(
                                    `SELECT id, name, parent_tenant_id FROM tenants WHERE id = $1::uuid`,
                                    userTenantId
                                );

                                if (userTenantRows.length > 0) {
                                    const userTenant = userTenantRows[0];

                                    if (userTenant.parent_tenant_id) {
                                        // User está en un tenant hijo → obtener padre + hermanos
                                        relatedTenants = await prisma.$queryRawUnsafe(
                                            `SELECT id, name FROM tenants
                                             WHERE id = $1::uuid OR parent_tenant_id = $1::uuid
                                             ORDER BY name`,
                                            userTenant.parent_tenant_id
                                        );
                                    } else {
                                        // User está en tenant padre → obtener self + hijos
                                        relatedTenants = await prisma.$queryRawUnsafe(
                                            `SELECT id, name FROM tenants
                                             WHERE id = $1::uuid OR parent_tenant_id = $1::uuid
                                             ORDER BY name`,
                                            userTenantId
                                        );
                                    }
                                }
                            } catch (tenantErr) {
                                console.warn('⚠️ Error buscando tenants relacionados:', tenantErr.message);
                            }

                            // Si hay múltiples tenants, preguntar cuál administrar
                            if (relatedTenants.length > 1) {
                                const tenantList = relatedTenants.map((t, i) => `${i + 1}. ${t.name}`).join('\n');

                                adminAuthStateCache.set(adminCacheKey, {
                                    step: 'select_tenant',
                                    userId: user.id,
                                    role_id: user.role_id,
                                    email: user.email,
                                    name: adminName,
                                    tenants: relatedTenants,
                                    createdAt: Date.now()
                                });

                                await wahaService.sendMessage(tenantId, chatId,
                                    `✅ ¡Hola, ${adminName}! Tienes acceso a ${relatedTenants.length} locales:\n\n${tenantList}\n\n¿Cuál quieres administrar? Envía el número.`
                                );
                                return res.status(200).send('OK');
                            }

                            // Un solo tenant → crear sesión directamente
                            adminAuthStateCache.delete(adminCacheKey);
                            const selectedTenantId = relatedTenants.length === 1 ? relatedTenants[0].id : userTenantId;
                            const selectedTenantName = relatedTenants.length === 1 ? relatedTenants[0].name : null;

                            adminSessionCache.set(adminCacheKey, {
                                userId: user.id,
                                role_id: user.role_id,
                                email: user.email,
                                name: adminName,
                                tenantId: selectedTenantId,
                                tenantName: selectedTenantName,
                                lastActivity: Date.now(),
                                conversationHistory: []
                            });
                            console.log(`🔐 [ADMIN WA] Sesión admin iniciada: ${adminName} (${user.email}) en tenant ${selectedTenantId}`);
                            await wahaService.sendMessage(tenantId, chatId,
                                `✅ ¡Bienvenido/a, ${adminName}! 🔐\n\nEstás en *modo administrador*${selectedTenantName ? ` de *${selectedTenantName}*` : ''}. Puedes preguntarme sobre:\n• Citas de hoy o cualquier fecha\n• Fichero digital / estilistas en el salón\n• Servicios, productos, promociones\n• Ventas y rendimiento\n• Crear citas, servicios, productos, estilistas o promociones\n• Configurar horarios y datos del salón\n\nEscribe *"salir"* para cerrar sesión.\nEscribe *"cambiar salón"* para administrar otro local.\n⏱️ La sesión expira tras 30 min de inactividad.`
                            );
                            return res.status(200).send('OK');

                        } catch (authError) {
                            console.error('❌ [ADMIN WA] Error en autenticación:', authError.message);
                            adminAuthStateCache.delete(adminCacheKey);
                            await wahaService.sendMessage(tenantId, chatId, '❌ Error interno durante la autenticación. Intenta de nuevo.');
                            return res.status(200).send('OK');
                        }
                    }
                }

                // 3. Si envía la palabra clave "admin"
                if (/^admin(istrador)?$/i.test(msgTrimmed)) {
                    // Verificar si hay bloqueo activo
                    const blockedState = adminAuthStateCache.get(adminCacheKey);
                    if (blockedState && blockedState.blockedUntil && Date.now() < blockedState.blockedUntil) {
                        const minutesLeft = Math.ceil((blockedState.blockedUntil - Date.now()) / 60000);
                        await wahaService.sendMessage(tenantId, chatId, `⛔ Acceso bloqueado temporalmente. Intenta en ${minutesLeft} minuto(s).`);
                        return res.status(200).send('OK');
                    }
                    adminAuthStateCache.set(adminCacheKey, { step: 'email', attempts: 0, createdAt: Date.now() });
                    await wahaService.sendMessage(tenantId, chatId, '🔐 *Modo Administrador*\n\nIngresa tu email de administrador:');
                    return res.status(200).send('OK');
                }

                // 4. Si nada de lo anterior → continúa al flujo normal de cliente
            }
            // ═══════════════════ FIN INTERCEPTOR ADMIN ═══════════════════

            // 🔍 MEJORADO: Buscar display name en múltiples lugares del payload
            const notifyNameRaw = payload.notifyName || payload._data?.notifyName || payload.author?.notifyName || payload.contact?.notifyName;
            const pushNameRaw = payload.pushName || payload._data?.pushName || payload.author?.pushName || payload.contact?.pushName;
            const contactName = payload.contact?.name || payload.author?.name || payload.name;
            let notifyName = notifyNameRaw || pushNameRaw || contactName || '';
            
            // Log completo del payload para diagnóstico (solo cuando no hay nombre)
            if (!notifyName || notifyName.trim() === '') {
                console.log(`   ⚠️ DIAGNÓSTICO - Display name vacío o no disponible para ${phoneNumber}:`);
                console.log(`      payload.notifyName: "${payload.notifyName || '(no existe)'}"`);
                console.log(`      payload._data?.notifyName: "${payload._data?.notifyName || '(no existe)'}"`);
                console.log(`      payload.pushName: "${payload.pushName || '(no existe)'}"`);
                console.log(`      payload._data?.pushName: "${payload._data?.pushName || '(no existe)'}"`);
                console.log(`      payload.contact?.name: "${payload.contact?.name || '(no existe)'}"`);
                console.log(`      payload.contact?.notifyName: "${payload.contact?.notifyName || '(no existe)'}"`);
                console.log(`      payload.author?.name: "${payload.author?.name || '(no existe)'}"`);
                console.log(`      payload.author?.notifyName: "${payload.author?.notifyName || '(no existe)'}"`);
                console.log(`      payload.name: "${payload.name || '(no existe)'}"`);
                console.log(`      payload.from: "${payload.from || '(no existe)'}"`);
                console.log(`      📦 Payload completo (keys): ${Object.keys(payload).join(', ')}`);
            } else {
                console.log(`   ✅ Display name encontrado: "${notifyName}" (fuente: ${notifyNameRaw ? 'notifyName' : pushNameRaw ? 'pushName' : 'contact/author'})`);
            }

            // 🔧 Función helper para separar nombre completo en first_name y last_name
            const parseFullName = (fullName) => {
                if (!fullName || fullName.trim() === '') return { firstName: null, lastName: null };
                
                const trimmed = fullName.trim();
                const invalidNames = ['cliente', 'hola', 'buenos', 'días', 'tardes', 'noches', 'hi', 'hello', 'whatsapp'];
                
                // Si es un nombre inválido, retornar null
                if (invalidNames.includes(trimmed.toLowerCase())) {
                    return { firstName: null, lastName: null };
                }
                
                // Si es solo un número, retornar null
                if (/^\d+$/.test(trimmed)) {
                    return { firstName: null, lastName: null };
                }
                
                // Separar por espacios
                const parts = trimmed.split(/\s+/).filter(p => p.length > 0);
                
                if (parts.length === 0) return { firstName: null, lastName: null };
                if (parts.length === 1) return { firstName: parts[0], lastName: null };
                
                // Si tiene 2 o más partes, primera es nombre, resto es apellido
                return {
                    firstName: parts[0],
                    lastName: parts.slice(1).join(' ')
                };
            };

            // Gestión de cliente
            let clientId = null;
            let senderName = notifyName || 'Cliente';
            let hasNameInDB = false; // 🔧 Flag para saber si el usuario tiene nombre guardado en BD
            const parsedName = parseFullName(notifyName);
            
            console.log(`   📋 Nombre de display recibido: "${notifyName}" ${notifyName ? '(válido)' : '(vacío - usando "Cliente")'}`);
            console.log(`   📋 Nombre parseado: first_name="${parsedName.firstName || 'null'}", last_name="${parsedName.lastName || 'null'}"`);

            try {
                // 🔧 MEJORADO: Buscar cliente por teléfono O por nombre (si tenemos display name válido)
                let existingClientRows = await prisma.$queryRawUnsafe(
                    `SELECT id, first_name, last_name, phone FROM users
                     WHERE tenant_id = $1::uuid AND phone = $2 AND role_id = 4`,
                    tenantId, phoneNumber
                );

                // Si no se encontró por teléfono y tenemos un nombre válido, buscar por nombre
                if (existingClientRows.length === 0 && parsedName.firstName && parsedName.firstName.length >= 2) {
                    console.log(`   🔍 No se encontró por teléfono, buscando por nombre: "${parsedName.firstName}"`);
                    const nameSearchRows = parsedName.lastName
                        ? await prisma.$queryRawUnsafe(
                            `SELECT id, first_name, last_name, phone FROM users
                             WHERE tenant_id = $1::uuid
                               AND role_id = 4
                               AND LOWER(first_name) = LOWER($2)
                               AND (LOWER(last_name) = LOWER($3) OR last_name IS NULL OR last_name = '')
                             ORDER BY created_at DESC
                             LIMIT 1`,
                            tenantId, parsedName.firstName, parsedName.lastName
                        )
                        : await prisma.$queryRawUnsafe(
                            `SELECT id, first_name, last_name, phone FROM users
                             WHERE tenant_id = $1::uuid
                               AND role_id = 4
                               AND LOWER(first_name) = LOWER($2)
                               AND (last_name IS NULL OR last_name = '')
                             ORDER BY created_at DESC
                             LIMIT 1`,
                            tenantId, parsedName.firstName
                        );

                    if (nameSearchRows.length > 0) {
                        existingClientRows = nameSearchRows;
                        console.log(`   ✅ Cliente encontrado por nombre: ${nameSearchRows[0].first_name} (teléfono actual: ${nameSearchRows[0].phone})`);
                        console.log(`   📱 Actualizando teléfono de ${nameSearchRows[0].phone} a ${phoneNumber}`);

                        // Actualizar el teléfono del cliente existente
                        await prisma.users.update({
                            where: { id: nameSearchRows[0].id },
                            data: { phone: phoneNumber, updated_at: new Date() }
                        });
                    }
                }

                if (existingClientRows.length > 0) {
                    clientId = existingClientRows[0].id;
                    let savedFirstName = existingClientRows[0].first_name;
                    let savedLastName = existingClientRows[0].last_name;

                    // 🔧 SIMPLIFICADO: Si el cliente existe (role_id = 4) y tiene display name válido, actualizar el nombre en BD
                    const invalidNames = ['cliente', 'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hi', 'hello'];
                    const hasInvalidSavedName = !savedFirstName || 
                                               savedFirstName.length < 2 || 
                                               /^\d+$/.test(savedFirstName) || 
                                               invalidNames.includes(savedFirstName.toLowerCase());
                    
                    // Si tenemos un display name válido Y el nombre guardado es inválido, actualizarlo
                    if (parsedName.firstName && parsedName.firstName.length >= 2 && hasInvalidSavedName) {
                        try {
                            await prisma.$queryRawUnsafe(
                                `UPDATE users
                                 SET first_name = $1, last_name = $2, updated_at = NOW()
                                 WHERE id = $3::uuid AND tenant_id = $4::uuid AND role_id = 4`,
                                parsedName.firstName, parsedName.lastName, clientId, tenantId
                            );
                            savedFirstName = parsedName.firstName;
                            savedLastName = parsedName.lastName;
                            console.log(`   ✅ Nombre del cliente actualizado desde display: ${parsedName.firstName} ${parsedName.lastName || ''}`);
                        } catch (updateError) {
                            console.error(`   ⚠️ Error al actualizar nombre desde display: ${updateError.message}`);
                        }
                    }

                    // Usar el nombre guardado (actualizado o existente) para senderName
                    if (savedFirstName && savedFirstName.length >= 2 && !/^\d+$/.test(savedFirstName) && !invalidNames.includes(savedFirstName.toLowerCase())) {
                        senderName = savedLastName && savedLastName.length >= 2 ? `${savedFirstName} ${savedLastName}`.trim() : savedFirstName;
                        hasNameInDB = true; // ✅ Tiene nombre válido en BD
                    } else if (parsedName.firstName && parsedName.firstName.length >= 2) {
                        // Si el nombre guardado no es válido pero tenemos un display name válido, usarlo temporalmente
                        senderName = parsedName.lastName && parsedName.lastName.length >= 2 
                            ? `${parsedName.firstName} ${parsedName.lastName}`.trim() 
                            : parsedName.firstName;
                        console.log(`   ℹ️ Usando display name para senderName: "${senderName}" (no está en BD aún)`);
                        // hasNameInDB permanece false para que el bot pregunte el nombre
                    }
                    console.log(`   ✅ Cliente existente identificado: ${senderName} (ID: ${clientId}, teléfono: ${phoneNumber}, tieneNombreEnBD: ${hasNameInDB})`);
                } else {
                    // ✅ SOLUCIÓN: Omitir el campo id y dejar que PostgreSQL lo genere automáticamente
                    try {
                        const firstNameToUse = parsedName.firstName || 'Cliente';
                        const lastNameToUse = parsedName.lastName || null;
                        
                        const newClientRows = await prisma.$queryRawUnsafe(
                            `INSERT INTO users (tenant_id, role_id, first_name, last_name, phone, email, password_hash)
                             VALUES ($1::uuid, 4, $2, $3, $4, $5, 'whatsapp')
                             RETURNING id`,
                            tenantId, firstNameToUse, lastNameToUse, phoneNumber, `${phoneNumber}@whatsapp.temp`
                        );

                        if (newClientRows.length > 0) {
                            clientId = newClientRows[0].id;
                            senderName = lastNameToUse ? `${firstNameToUse} ${lastNameToUse}` : firstNameToUse;
                            
                            // Si el nombre es "Cliente" pero tenemos un display name válido, intentar actualizarlo
                            if (firstNameToUse === 'Cliente' && parsedName.firstName && parsedName.firstName.length >= 2) {
                                console.log(`   🔄 Actualizando nombre de "Cliente" a "${parsedName.firstName}"`);
                                try {
                                    await db.query(
                                        `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3::uuid`,
                                        [parsedName.firstName, parsedName.lastName, clientId]
                                    );
                                    senderName = parsedName.lastName && parsedName.lastName.length >= 2 
                                        ? `${parsedName.firstName} ${parsedName.lastName}`.trim() 
                                        : parsedName.firstName;
                                    hasNameInDB = true; // ✅ Ahora tiene nombre válido
                                    console.log(`   ✅ Nombre actualizado a: ${senderName}`);
                                } catch (updateError) {
                                    console.error(`   ⚠️ Error al actualizar nombre: ${updateError.message}`);
                                }
                            } else if (firstNameToUse !== 'Cliente') {
                                hasNameInDB = true; // ✅ Tiene nombre válido desde el inicio
                            }
                            
                            console.log(`   🆕 Nuevo cliente creado: ${senderName} (ID: ${clientId}, teléfono: ${phoneNumber}, tieneNombreEnBD: ${hasNameInDB})`);
                        }
                    } catch (insertError) {
                        // Si falla por duplicado (puede haber un race condition), intentar buscar de nuevo
                        if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
                            console.log(`   ⚠️ Cliente duplicado detectado, buscando nuevamente...`);
                            const retryClient = await db.query(
                                `SELECT id, first_name, last_name FROM users
                                 WHERE tenant_id = $1::uuid AND phone = $2 AND role_id = 4`,
                                [tenantId, phoneNumber]
                            );
                            if (retryClient.rows.length > 0) {
                                clientId = retryClient.rows[0].id;
                                const retryFirstName = retryClient.rows[0].first_name;
                                const retryLastName = retryClient.rows[0].last_name;
                                senderName = retryLastName ? `${retryFirstName} ${retryLastName}` : retryFirstName;
                                console.log(`   ✅ Cliente encontrado después de retry: ${senderName} (ID: ${clientId})`);
                            } else {
                                console.error(`   ❌ Error al crear cliente (duplicado pero no encontrado): ${insertError.message}`);
                            }
                        } else {
                            console.error(`   ❌ Error al crear cliente: ${insertError.message}`);
                            throw insertError; // Re-lanzar si es otro tipo de error
                        }
                    }
                }
            } catch (clientError) {
                console.error('   ❌ Error crítico en gestión de cliente:', clientError.message);
                console.error('   Stack:', clientError.stack);
                // No lanzar el error, pero registrar que clientId es null
                // El proceso continuará y fallará en callBookAppointment con un mensaje más claro
            }

            // Validar que tenemos clientId antes de continuar
            if (!clientId) {
                console.error(`   ⚠️ ADVERTENCIA: No se pudo obtener/crear clientId para ${phoneNumber}`);
                hasNameInDB = false; // Sin clientId, no puede tener nombre válido
            }
            
            // 🔧 Log final del estado del nombre
            console.log(`   📊 Estado final: senderName="${senderName}", hasNameInDB=${hasNameInDB}, clientId=${clientId ? 'existe' : 'null'}`);

            // Audio ya fue transcrito arriba (antes del interceptor admin)
            // Solo filtrar mensajes no válidos
            if (!isVoiceMessage && (messageType !== 'chat' || !payload.body)) {
                return res.status(200).send('OK');
            }

            console.log(`\n💬 [MENSAJE] De: ${senderName} (${chatId})`);
            console.log(`   Texto: "${userMessage}"`);

            // Obtener API Key global y datos del tenant
            const apiKey = await getGlobalOpenAIKey();
            const tenantDataResult = await db.query('SELECT name, greeting_message, brochure_url FROM tenants WHERE id = $1::uuid', [tenantId]);

            if (!apiKey) {
                console.log('⚠️ No hay API Key global configurada');
                await wahaService.sendMessage(tenantId, chatId, '⚠️ El asistente no está configurado. Contacta al administrador.');
                return res.status(200).send('OK');
            }

            const tenantData = tenantDataResult.rows[0] || {};
            const tenantName = tenantData.name || 'nuestra peluquería';
            const greetingMessage = tenantData.greeting_message || null;
            const brochureUrl = tenantData.brochure_url || null;

            // Obtener historial y contexto de reserva
            const cacheKey = `${tenantId}:${chatId}`;
            let rawCache = conversationCache.get(cacheKey);
            let conversationHistory = Array.isArray(rawCache) ? rawCache : (rawCache?.data && Array.isArray(rawCache.data) ? rawCache.data : []);
            let bookingContext = bookingContextCache.get(cacheKey) || {};

            // Reinicio de conversación
            const simpleGreetings = /^(hola|buenos días|buenas tardes|buenas noches|hi|hey|hello|ola)[\s!.]*$/i;
            const resetCommands = /(empezar de nuevo|cancelar|reset|reiniciar|nueva cita|otro servicio)/i;

            // 🔧 NUEVO: Detectar si el usuario no tiene nombre y necesita proporcionarlo
            const invalidNameValues = ['cliente', 'hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hi', 'hello'];
            const hasInvalidName = clientId && !hasNameInDB && (
                                  !senderName || 
                                  senderName === 'Cliente' || 
                                  senderName.length < 2 || 
                                  /^\d+$/.test(senderName) ||
                                  invalidNameValues.includes(senderName.toLowerCase())
                              );
            
            // 🔧 DEBUG: Verificar si es un saludo simple
            const isSimpleGreeting = simpleGreetings.test(userMessage.trim());
            const hasNoHistory = conversationHistory.length === 0;
            
            console.log(`   👤 Validación de nombre: senderName="${senderName}", hasNameInDB=${hasNameInDB}, clientId=${clientId ? 'existe' : 'null'}, hasInvalidName=${hasInvalidName}`);
            console.log(`   🔍 Condiciones: isSimpleGreeting=${isSimpleGreeting}, hasNoHistory=${hasNoHistory}`);
            
            // Si no tiene nombre válido y el mensaje parece ser un nombre (2+ palabras), guardarlo PRIMERO
            if (hasInvalidName && clientId) {
                const namePattern = /^([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]{2,})$/;
                const potentialName = userMessage.trim();
                if (namePattern.test(potentialName)) {
                    const match = potentialName.match(namePattern);
                    const firstName = match[1];
                    const lastName = match[2];
                    
                    const invalidNames = ['cliente', 'hola', 'buenos', 'días', 'tardes', 'noches', 'hi', 'hello', 'si', 'sí', 'no'];
                    if (!invalidNames.includes(firstName.toLowerCase()) && !invalidNames.includes(lastName.toLowerCase())) {
                        try {
                            await db.query(
                                `UPDATE users 
                                 SET first_name = $1, last_name = $2, updated_at = NOW()
                                 WHERE id = $3::uuid AND tenant_id = $4::uuid AND role_id = 4`,
                                [firstName, lastName, clientId, tenantId]
                            );
                            console.log(`   ✅ Nombre del cliente guardado: ${firstName} ${lastName}`);
                            senderName = `${firstName} ${lastName}`;
                            hasNameInDB = true; // ✅ Ahora tiene nombre válido
                        } catch (updateError) {
                            console.error(`   ⚠️ Error al guardar nombre: ${updateError.message}`);
                        }
                    }
                }
            }
            
            // Si no tiene nombre válido y envía un saludo, preguntarle su nombre ANTES de procesar con IA
            if (hasInvalidName && isSimpleGreeting && hasNoHistory) {
                console.log(`   👤 Usuario sin nombre detectado (senderName="${senderName}", hasNameInDB=${hasNameInDB}), preguntando nombre...`);
                await wahaService.sendMessage(tenantId, chatId, '¡Hola! 👋 Para poder ayudarte mejor, ¿podrías decirme tu nombre completo?');
                return res.status(200).send('OK');
            }
            
            // Si no tiene clientId, también preguntar el nombre
            if (!clientId && isSimpleGreeting && hasNoHistory) {
                console.log(`   ⚠️ Usuario sin clientId, preguntando nombre...`);
                await wahaService.sendMessage(tenantId, chatId, '¡Hola! 👋 Para poder ayudarte mejor, ¿podrías decirme tu nombre completo?');
                return res.status(200).send('OK');
            }

            // Saludo personalizado para usuario conocido con nombre válido
            // Se envía primero como "banner" y luego el bot continúa con su flujo normal de IA
            if (isSimpleGreeting && hasNoHistory && clientId && hasNameInDB) {
                const defaultGreeting = `Hola, soy el agente de ${tenantName}, puedes escribirme o enviarme notas de voz 🎙️`;
                let personalizedGreeting = (greetingMessage || defaultGreeting)
                    .replace(/\{nombre\}/gi, senderName)
                    .replace(/\{salon\}/gi, tenantName);
                await wahaService.sendMessage(tenantId, chatId, personalizedGreeting);
            }

            if ((simpleGreetings.test(userMessage.trim()) || resetCommands.test(userMessage.trim())) && conversationHistory.length > 0) {
                console.log(`🔄 Limpiando conversación para ${senderName}`);
                conversationHistory = [];
                bookingContext = {};
                conversationCache.set(cacheKey, conversationHistory);
                bookingContextCache.set(cacheKey, bookingContext);
            }

            // Extraer fecha/hora del mensaje
            const extractedDateTime = extractDateTimeFromMessage(userMessage);

            let contextUpdated = false;
            let shouldAutoCheck = false;

            // 🆕 DETECTAR NOMBRES DE ESTILISTAS MENCIONADOS (consulta desde BD)
            if (bookingContext.service_id && !bookingContext.stylist_id) {
                try {
                    const stylistRows = await prisma.$queryRawUnsafe(
                        `SELECT LOWER(first_name) AS name_lower, first_name
                         FROM users
                         WHERE tenant_id = $1::uuid AND role_id = 3
                           AND COALESCE(NULLIF(status,''),'active') = 'active'`,
                        tenantId
                    );
                    const userMessageLower = userMessage.toLowerCase().trim();

                    for (const row of stylistRows) {
                        const name = row.name_lower;
                        if (!name || name.length < 2) continue;
                        if (userMessageLower === name ||
                            userMessageLower.includes(name + ' ') ||
                            userMessageLower.includes(' ' + name) ||
                            userMessageLower === name + ' está bien' ||
                            userMessageLower.includes(name + ' esta bien')) {

                            bookingContext.stylist = row.first_name;
                            contextUpdated = true;
                            console.log(`   ✅ Estilista detectado y guardado: ${bookingContext.stylist}`);
                            break;
                        }
                    }
                } catch (stylistDetectErr) {
                    console.error('   ⚠️ Error detectando estilista:', stylistDetectErr.message);
                }
            }

            let shouldShowStylists = false;
            
            if (extractedDateTime.date && !bookingContext.date) {
                bookingContext.date = extractedDateTime.date;
                contextUpdated = true;
                console.log(`   ✅ Fecha guardada en contexto: ${extractedDateTime.date}`);
                
                if (bookingContext.service_id && bookingContext.stylist) {
                    shouldAutoCheck = true;
                    console.log(`   🎯 Tiene servicio + estilista + fecha → Puede verificar automáticamente`);
                }
                
                if (bookingContext.service_id && !bookingContext.stylist) {
                    shouldShowStylists = true;
                    console.log(`   🎯 Tiene servicio + fecha (sin estilista) → Debe mostrar estilistas automáticamente`);
                }
            }
            if (extractedDateTime.time && !bookingContext.time) {
                bookingContext.time = extractedDateTime.time;
                contextUpdated = true;
                console.log(`   ⏰ Hora guardada en contexto: ${extractedDateTime.time}`);
            }

            if (contextUpdated) {
                bookingContextCache.set(cacheKey, bookingContext);
            }

if (shouldAutoCheck) {
                    console.log(`   💡 Hint para GPT: Ya tiene servicio + estilista + fecha → Debe verificar disponibilidad`);
                }

            // Citas próximas del cliente (para ofrecer ver/cancelar/modificar)
            let upcomingAppointments = [];
            if (clientId) {
                upcomingAppointments = await getUpcomingAppointmentsForClient(tenantId, clientId);
                if (upcomingAppointments.length > 0) {
                    console.log(`   📅 Cliente tiene ${upcomingAppointments.length} cita(s) próxima(s)`);
                }
            }

            // Interceptor de brochure: si el usuario pide ver el brochure/catálogo
            if (brochureUrl) {
                const brochurePatterns = /brochure|cat[aá]logo|ver.*servicios|qu[eé].*ofrecen|s[ií].*quiero.*ver|muestr.*brochure/i;
                if (brochurePatterns.test(userMessage)) {
                    const fullUrl = `${process.env.BACKEND_URL || 'https://api.tupelukeria.com'}${brochureUrl}`;
                    try {
                        await wahaService.sendImage(tenantId, chatId, fullUrl, `📋 ¡Aquí tienes nuestro brochure de servicios de ${tenantName}!`);
                    } catch (imgErr) {
                        console.error('❌ Error enviando imagen de brochure:', imgErr.message);
                        await wahaService.sendMessage(tenantId, chatId, `📋 Puedes ver nuestro brochure aquí: ${fullUrl}`);
                    }
                    await wahaService.sendMessage(tenantId, chatId, '¿Te gustaría agendar una cita? 💇');
                    return res.status(200).send('OK');
                }
            }

            try {
                let messageToProcess = userMessage;
                if (shouldAutoCheck) {
                    messageToProcess = `${userMessage}\n\n[NOTA: Ya tienes servicio + estilista + fecha en el contexto. Verifica disponibilidad automáticamente.]`;
                    console.log(`   📝 Mensaje procesado con hint de auto-verificación`);
                } else if (shouldShowStylists) {
                    messageToProcess = `${userMessage}\n\n[NOTA: Ya tienes servicio y fecha en el contexto. Muestra los estilistas disponibles automáticamente usando buscar_servicio. NO digas "He guardado la fecha" ni "Un momento, por favor". Muestra directamente los estilistas.]`;
                    console.log(`   📝 Mensaje procesado con hint para mostrar estilistas`);
                }

                const result = await processWithAI(
                    apiKey,
                    tenantId,
                    clientId,
                    messageToProcess,
                    conversationHistory,
                    bookingContext,
                    senderName,
                    tenantName,
                    extractedDateTime,
                    upcomingAppointments,
                    brochureUrl
                );

                if (result.updatedContext) {
                    bookingContext = { ...bookingContext, ...result.updatedContext };
                    bookingContextCache.set(cacheKey, bookingContext);
                    console.log(`   📝 Contexto actualizado:`, JSON.stringify(bookingContext));
                }

                if (result.updatedContext?.booked) {
                    bookingContextCache.set(cacheKey, {});
                }

                conversationHistory.push({ role: 'user', content: userMessage });
                conversationHistory.push({ role: 'assistant', content: result.response });

                if (conversationHistory.length > 20) {
                    conversationHistory = conversationHistory.slice(-20);
                }
                conversationCache.set(cacheKey, conversationHistory);

                let messageToSend = result.response;

                // Responder (con TTS si fue mensaje de voz)
                if (isVoiceMessage) {
                    const sent = await sendTTSResponse(tenantId, chatId, messageToSend);
                    if (!sent) {
                        await wahaService.sendMessage(tenantId, chatId, messageToSend);
                    }
                } else {
                    await wahaService.sendMessage(tenantId, chatId, messageToSend);
                    console.log(`   ✅ Respuesta enviada`);
                }

            } catch (aiError) {
                console.error('❌ Error IA:', aiError.message);
                await wahaService.sendMessage(tenantId, chatId, '😅 Tuve un problema. ¿Puedes intentar de nuevo?');
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ [WEBHOOK ERROR]:', error);
        res.status(500).send('Error procesando webhook');
    }
};

/* =================================================================== */
/* ==============   PROCESAR CON IA (OPENAI)   ======================= */
/* =================================================================== */

async function processWithAI(apiKey, tenantId, clientId, userMessage, conversationHistory, bookingContext, senderName, tenantName, extractedDateTime = { date: null, time: null }, upcomingAppointments = [], brochureUrl = null) {
    const hoyStr = formatInTimeZone(new Date(), TIME_ZONE, "EEEE d 'de' MMMM 'de' yyyy", { locale: require('date-fns/locale/es') });

    let contextInfo = '';
    if (Object.keys(bookingContext).length > 0) {
        const parts = [];
        if (bookingContext.service) parts.push(`📋 Servicio: ${bookingContext.service}`);
        if (bookingContext.service_id) parts.push(`   (service_id: ${bookingContext.service_id})`);
        if (bookingContext.stylist) parts.push(`💇 Estilista: ${bookingContext.stylist}`);
        if (bookingContext.stylist_id) parts.push(`   (stylist_id: ${bookingContext.stylist_id})`);
        if (bookingContext.date) parts.push(`📅 Fecha: ${bookingContext.date}`);
        if (bookingContext.time) parts.push(`⏰ Hora: ${bookingContext.time}`);
        if (parts.length > 0) {
            contextInfo = `\n\n📋 DATOS DE LA RESERVA EN PROGRESO:\n${parts.join('\n')}`;
        }
    }

    if (upcomingAppointments && upcomingAppointments.length > 0) {
        const citasLines = upcomingAppointments.map((c, i) =>
            `${i + 1}. ID: ${c.id} — ${c.service_name} con ${c.stylist_name}, ${c.dateFormatted} a las ${c.timeFormatted}`
        ).join('\n');
        contextInfo += `\n\n📅 CITAS PRÓXIMAS DEL CLIENTE (${upcomingAppointments.length}):\n${citasLines}\n\n⚠️ REGLA SOBRE CITAS EXISTENTES: SOLO menciona estas citas si el usuario SALUDA sin pedir nada específico (ej: "Hola", "Buenos días") o si PREGUNTA por sus citas. Si el usuario pide una NUEVA cita, servicio, o cualquier otra cosa, atiende su solicitud directamente SIN mencionar las citas existentes. Si pide ver sus citas → usa ver_mis_agendas. Si pide cancelar → cancelar_cita con el id. Si pide modificar → modificar_cita con id, nueva fecha y hora.`;
    }

    const SYSTEM_PROMPT = `Eres el asistente de "${tenantName}" en WhatsApp. Cliente: ${senderName}.
Hoy: ${hoyStr}.${contextInfo}

⚠️ IMPORTANTE - IDENTIFICACIÓN DE CLIENTE:
- Si el usuario proporciona su nombre completo (ej: "Fredy castellanos", "Juan Pérez"), esto es para identificarlo en el sistema.
- Si ya tienes todos los datos de la cita (servicio, estilista, fecha, hora) y el usuario proporciona su nombre, intenta agendar la cita de nuevo.
- El nombre del usuario se usará para actualizar su perfil en el sistema.

⚠️ CRÍTICO: USA LOS DATOS DEL CONTEXTO ARRIBA. Si dice "📅 Fecha: 2026-01-22", esa fecha YA ESTÁ GUARDADA.

TIENES 6 FUNCIONES:
1. buscar_servicio → Buscar servicios (SIEMPRE PRIMERO)
2. verificar_disponibilidad → Ver horarios (requiere servicio + estilista + fecha)
3. agendar_cita → Confirmar cita
4. ver_mis_agendas → Listar citas próximas del cliente (ver/cancelar/modificar)
5. cancelar_cita → Cancelar una cita por id (el cliente debe ser el dueño)
6. modificar_cita → Cambiar fecha u hora de una cita por id

═══════════════════════════════════════════════════════════════
🎯 FLUJO OBLIGATORIO (SIGUE EN ORDEN):
═══════════════════════════════════════════════════════════════

PASO 1: BUSCAR SERVICIO PRIMERO - ⚠️ OBLIGATORIO
- Usuario dice: "quiero un servicio" / "necesito un servicio" / "corte" / "manicure" → LLAMAR buscar_servicio INMEDIATAMENTE
- Si el usuario dice "quiero una cita", "quiero agendar", "necesito un turno" SIN especificar el servicio → usa "servicio" como palabra clave: [buscar_servicio: service="servicio"]. NUNCA uses "cita", "turno" o "reserva" como nombre de servicio.
- Si el usuario no especifica qué servicio, usa "servicio" como palabra clave: [buscar_servicio: service="servicio"]
- NO respondas sin llamar la función. SIEMPRE llama buscar_servicio cuando alguien pide un servicio.
- Si hay múltiples servicios → mostrar opciones y pedir confirmación
- Si hay un solo servicio → guardar service_id y mostrar estilistas
- ⚠️ CRÍTICO: Si el resultado tiene "stylists" con una lista, SOLO muestra esos estilistas. NO inventes estilistas.

🆕 CASO ESPECIAL - Usuario dice TODO de una vez (servicio + estilista + fecha + hora):
- Usuario dice: "Quiero una cita para mañana 9:30 am para corte con carlos roa"
- ⚠️ IMPORTANTE: Aunque llames buscar_servicio primero, NO muestres la lista de estilistas
- Extrae del mensaje: servicio="corte", estilista="carlos roa", fecha="mañana", hora="09:30"
- Llama buscar_servicio solo para obtener el service_id (sin mostrar resultado al usuario)
- Luego llama verificar_disponibilidad INMEDIATAMENTE con todos los datos
- Responde DIRECTAMENTE: "Carlos está disponible mañana a las 9:30 AM. ¿Confirmo tu cita?"
- NO digas: "Estos estilistas ofrecen..." si el usuario ya especificó un estilista

PASO 2: ELEGIR ESTILISTA / FECHA
- Si el usuario menciona una FECHA después de elegir servicio → Guardar fecha y MOSTRAR ESTILISTAS INMEDIATAMENTE
  → NO digas "He guardado la fecha" ni "Un momento, por favor"
  → Llama buscar_servicio con el service_id del contexto para obtener los estilistas
  → Muestra directamente: "Estos estilistas ofrecen [servicio]: 1. [nombre], 2. [nombre]..."
- Si el usuario elige estilista por nombre (ej: "sofia", "pedro", "carlos"):
  - SI HAY FECHA EN CONTEXTO → verificar_disponibilidad INMEDIATAMENTE sin preguntar nada
    → Ejemplo: [verificar_disponibilidad: serviceId="xxx", stylistName="sofia", date="2026-01-22"]
    → Mostrar directamente los horarios: "Sofía tiene disponible mañana en estos horarios: 9:00, 10:00..."
  - SI NO HAY FECHA → preguntar: "¿Para qué fecha quieres tu cita con [nombre]?"

PASO 2.5: USUARIO MENCIONA HORA O FRANJA
- ⚠️ AMBIGÜEDAD "MAÑANA": En español "mañana" puede significar "tomorrow" O "morning".
  Si YA hay una fecha en el contexto y le acabas de mostrar franjas (Mañana/Tarde/Noche), y el usuario responde "mañana", "tarde" o "noche":
  → Significa la FRANJA HORARIA, NO un cambio de fecha. Mantén la fecha del contexto.
  → "Mañana" = horarios antes de 12:00 PM. Sugiere "¿Te parece a las 9:00 AM?" o pide hora específica.
  → "Tarde" = horarios de 12:00 PM a 6:00 PM. Sugiere "¿Te parece a las 2:00 PM?" o pide hora específica.
  → "Noche" = horarios después de 6:00 PM. Sugiere "¿Te parece a las 7:00 PM?" o pide hora específica.
- Si el usuario dice una hora específica (ej: "a las 9", "9", "las 2 pm") y ya hay estilista + fecha en contexto:
  → Llamar verificar_disponibilidad con la hora incluida y la FECHA DEL CONTEXTO (no cambiarla)
  → Responder DIRECTAMENTE:
    * Si disponible: "Sí, Sofía está disponible el [fecha] a las 9:00. ¿Confirmo tu cita?"
    * Si NO disponible: "Sofía no está disponible a las 9:00. Horarios cercanos: 9:15, 9:30, 10:00. ¿Cuál prefieres?"

PASO 3: VERIFICAR DISPONIBILIDAD
- Usar fecha del contexto si existe
- Llamar con: serviceId + stylistName + date (del contexto o nueva)
- RESPUESTA DIRECTA: No digas "Voy a verificar" o "Un momento". Di directamente el resultado:
  * ⚠️ CRÍTICO - Si el salón está cerrado ese día (salonClosed: true): Responde claramente "NO" o "No podemos agendar". Usa el mensaje exacto del resultado.
  * ⚠️ CRÍTICO - Si la hora está fuera del horario laboral: Responde "No, esa hora está fuera de nuestro horario de atención. Horarios disponibles: [lista]"
  * Si está disponible: "[Nombre] tiene disponible [fecha] en estos horarios: [lista]"
  * Si NO está disponible (estilista ocupado): "[Nombre] no está disponible [fecha] a las [hora]. Horarios disponibles: [lista]"
  * Si no encuentra estilista: "No encontré [nombre]. Disponibles: [lista]"
- ⚠️ IMPORTANTE: Usa el formato de 12 horas (AM/PM) para mostrar horarios. Si el resultado tiene "slots_12h", úsalo.
- 🆕 MUESTRA TODOS LOS HORARIOS: Si el resultado tiene "slots_12h" con múltiples horarios, muestra TODOS en una lista numerada.

PASO 4: CONFIRMAR Y AGENDAR
- Usuario elige hora → confirmar
- Usuario dice "sí" o confirma → agendar_cita con la hora correcta

PASO 5: SALUDO INICIAL
- Cuando el cliente saluda (hola, buenos días, etc.) sin pedir nada específico y TIENE citas próximas en el contexto, menciónale brevemente sus citas y pregunta si necesita algo.
- Si el cliente saluda Y PIDE algo específico (ej: "Hola quiero una cita para mañana"), atiende su solicitud directamente SIN mencionar citas existentes.
- ⚠️ NUNCA inventes citas. SOLO menciona citas si aparecen listadas arriba en "📅 CITAS PRÓXIMAS DEL CLIENTE".
- Si NO ves esa sección en el contexto, el cliente NO tiene citas. No le digas que tiene citas.

PASO 6: CITAS DEL CLIENTE (ver / cancelar / modificar)
- SOLO menciona citas existentes cuando el usuario PREGUNTA por ellas o cuando saluda SIN pedir nada más.
- Si pide "ver mis citas", "mis agendas", "qué citas tengo" → ver_mis_agendas (sin parámetros)
- Si pide "cancelar la cita" o "cancelar la del [fecha]" → cancelar_cita con el appointmentId de esa cita
- Si pide "cambiar la cita", "modificar", "otra fecha/hora" → modificar_cita con appointmentId, nueva fecha (YYYY-MM-DD) y nueva hora (HH:mm)

REGLA ESPECIAL - SALÓN NO CONFIGURADO:
- Si buscar_servicio devuelve "not_configured: true", responde EXACTAMENTE con el mensaje devuelto. NO intentes buscar más servicios ni sugerir alternativas.

REGLA DE ORO:
- Si el usuario pide un servicio → LLAMA buscar_servicio INMEDIATAMENTE
- ⚠️ Si el usuario menciona TODO de una vez (servicio + estilista + fecha + hora) → Llama buscar_servicio PERO NO muestres la lista de estilistas, ve directo a verificar_disponibilidad
- Si tienes servicio + estilista + fecha en contexto → LLAMA verificar_disponibilidad AUTOMÁTICAMENTE
- Si el usuario menciona una hora después de elegir estilista → LLAMA verificar_disponibilidad con la hora
- SIEMPRE di el resultado directamente, NO digas "Voy a verificar" ni "Un momento"
- ⚠️ NO muestres listas de estilistas si el usuario ya especificó qué estilista quiere`
    + (brochureUrl ? '\n\nNOTA: Este salón tiene un brochure de servicios disponible. Si el cliente pregunta por servicios o precios, puedes decirle: "¿Te gustaría ver nuestro brochure de servicios?" El sistema enviará la imagen automáticamente.' : '');

    const FUNCTIONS = [
        {
            type: "function",
            function: {
                name: "buscar_servicio",
                description: "Busca un servicio y devuelve los estilistas que lo ofrecen. Si el usuario menciona un estilista, pasa stylistName para filtrar solo servicios de ese estilista.",
                parameters: {
                    type: "object",
                    properties: {
                        service: { type: "string", description: "Nombre del servicio. Si no especifica servicio, usa 'servicio'." },
                        stylistName: { type: "string", description: "Nombre del estilista mencionado (opcional, para filtrar servicios)" }
                    },
                    required: ["service"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "verificar_disponibilidad",
                description: "Verifica horarios disponibles. REQUIERE fecha.",
                parameters: {
                    type: "object",
                    properties: {
                        serviceId: { type: "string", description: "UUID del servicio (OBLIGATORIO)" },
                        stylistId: { type: "string", description: "UUID del estilista (opcional)" },
                        stylistName: { type: "string", description: "Nombre del estilista" },
                        date: { type: "string", description: "Fecha en formato YYYY-MM-DD (OBLIGATORIO)" },
                        time: { type: "string", description: "Hora en formato HH:mm (opcional)" }
                    },
                    required: ["serviceId", "date"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "agendar_cita",
                description: "Agenda la cita cuando el usuario confirma.",
                parameters: {
                    type: "object",
                    properties: {
                        serviceId: { type: "string", description: "UUID del servicio" },
                        stylistId: { type: "string", description: "UUID del estilista" },
                        stylistName: { type: "string", description: "Nombre del estilista" },
                        date: { type: "string", description: "Fecha YYYY-MM-DD" },
                        time: { type: "string", description: "Hora HH:mm" }
                    },
                    required: ["serviceId", "date", "time"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "ver_mis_agendas",
                description: "Lista las citas próximas del cliente. Usar cuando pida ver sus citas, agendas o qué tiene agendado."
            }
        },
        {
            type: "function",
            function: {
                name: "cancelar_cita",
                description: "Cancela una cita del cliente por su id.",
                parameters: {
                    type: "object",
                    properties: {
                        appointmentId: { type: "string", description: "UUID de la cita a cancelar" }
                    },
                    required: ["appointmentId"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "modificar_cita",
                description: "Cambia la fecha y/o hora de una cita del cliente.",
                parameters: {
                    type: "object",
                    properties: {
                        appointmentId: { type: "string", description: "UUID de la cita a modificar" },
                        newDate: { type: "string", description: "Nueva fecha en YYYY-MM-DD" },
                        newTime: { type: "string", description: "Nueva hora en HH:mm" }
                    },
                    required: ["appointmentId", "newDate", "newTime"]
                }
            }
        }
    ];

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-12),
        { role: 'user', content: userMessage }
    ];

    console.log('\n🤖 [GPT] Enviando request...');
    console.log('   Contexto actual:', JSON.stringify(bookingContext));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            tools: FUNCTIONS,
            tool_choice: 'auto',
            temperature: 0.3,
            max_tokens: 400
        })
    });

    if (!response.ok) {
        throw new Error('Error de OpenAI');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    // Track token usage for the first GPT call
    if (data.usage) {
        trackUsage(tenantId, 'chat', 'gpt-4o-mini', data.usage.prompt_tokens, data.usage.completion_tokens, data.usage.total_tokens);
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Procesar todas las tool_calls (no solo la primera)
        const allToolResults = [];
        let updatedContext = {};

        for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`\n🔧 [FUNCIÓN] ${functionName} llamada`);
        console.log(`📦 [ARGS]:`, JSON.stringify(functionArgs, null, 2));

        let functionResult;

        if (functionName === 'buscar_servicio') {
            const searchDate = bookingContext.date || extractedDateTime.date || null;
            const searchTime = bookingContext.time || extractedDateTime.time || null;
            // Detectar estilista: primero de GPT args, luego contexto, luego del mensaje original
            let searchStylist = functionArgs.stylistName || bookingContext.stylist || null;
            if (!searchStylist) {
                // Consultar estilistas del tenant y detectar en el mensaje
                try {
                    const stylistsRes = await db.query(
                        `SELECT first_name, last_name FROM users WHERE tenant_id = $1::uuid AND role_id = 3 AND COALESCE(NULLIF(status, ''), 'active') = 'active'`,
                        [tenantId]
                    );
                    const msgLower = userMessage.toLowerCase();
                    for (const row of stylistsRes.rows) {
                        const firstName = (row.first_name || '').toLowerCase();
                        const fullName = `${firstName} ${(row.last_name || '').toLowerCase()}`.trim();
                        if (firstName && msgLower.includes(firstName)) {
                            searchStylist = firstName;
                            break;
                        }
                    }
                } catch (e) { /* no-op */ }
            }
            console.log(`   🔍 searchStylist: "${searchStylist}"`);
            functionResult = await callSearchService(tenantId, functionArgs.service, searchDate, searchTime, searchStylist);

            if (functionResult.found && functionResult.service && !functionResult.multiple) {
                updatedContext.service = functionResult.service.name;
                updatedContext.service_id = functionResult.service.id;
                console.log(`   ✅ Servicio guardado: ${functionResult.service.name} (${functionResult.service.id})`);

                // Auto-encadenar a verificar_disponibilidad si ya tenemos estilista + fecha
                const ctxDate = bookingContext.date || extractedDateTime.date || null;
                const ctxTime = bookingContext.time || extractedDateTime.time || null;
                const ctxStylist = bookingContext.stylist || functionArgs.stylistName || null;
                // Detectar nombre de estilista en el mensaje original del usuario
                const detectedStylist = ctxStylist || (() => {
                    if (!functionResult.stylists || functionResult.stylists.length === 0) return null;
                    const msgLower = userMessage.toLowerCase();
                    const match = functionResult.stylists.find(s => msgLower.includes(s.name.toLowerCase()) || msgLower.includes(s.name.split(' ')[0].toLowerCase()));
                    return match ? match.name : null;
                })();

                if (ctxDate && detectedStylist) {
                    console.log(`   🔗 Auto-encadenando a verificar_disponibilidad: stylist="${detectedStylist}", date="${ctxDate}", time="${ctxTime}"`);
                    const autoCheckResult = await callCheckAvailability(tenantId, {
                        serviceId: functionResult.service.id,
                        stylistName: detectedStylist,
                        date: ctxDate,
                        time: ctxTime
                    });

                    // Guardar estilista en contexto si se encontró
                    if (autoCheckResult.stylist && autoCheckResult.stylist.id) {
                        updatedContext.stylist = autoCheckResult.stylist.name;
                        updatedContext.stylist_id = autoCheckResult.stylist.id;
                    }
                    if (ctxDate && !bookingContext.date) updatedContext.date = ctxDate;
                    if (ctxTime && !bookingContext.time) updatedContext.time = ctxTime;

                    // Combinar resultados para que GPT tenga toda la info
                    functionResult = {
                        ...functionResult,
                        availability: autoCheckResult,
                        auto_checked: true,
                        hint: `IMPORTANTE: Ya se verificó disponibilidad automáticamente. Muestra directamente el resultado de "availability" al usuario. NO muestres la lista de estilistas.`
                    };
                } else if (bookingContext.date && functionResult.stylists && functionResult.stylists.length > 0) {
                    console.log(`   📅 Fecha ya existe en contexto: ${bookingContext.date}`);
                    functionResult.date_in_context = bookingContext.date;
                    functionResult.hint = `Nota: Ya tienes fecha guardada (${bookingContext.date}). Cuando el usuario elija estilista, usa esa fecha para verificar disponibilidad.`;
                }
            }

            if (functionResult.found && functionResult.multiple && functionResult.options) {
                console.log(`   📋 Servicios encontrados (múltiples): ${functionResult.options.map(o => o.name).join(', ')}`);
                functionResult.hint = 'Muestra estas opciones al usuario para que elija.';
            }
        }
        else if (functionName === 'verificar_disponibilidad') {
            // Validar que los IDs sean UUIDs reales (GPT a veces envía nombres en vez de UUIDs)
            const _uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const checkParams = {
                serviceId: (_uuid.test(functionArgs.serviceId) ? functionArgs.serviceId : null) || bookingContext.service_id,
                stylistId: (_uuid.test(functionArgs.stylistId) ? functionArgs.stylistId : null) || bookingContext.stylist_id,
                stylistName: functionArgs.stylistName || bookingContext.stylist,
                date: functionArgs.date || bookingContext.date,
                time: functionArgs.time || bookingContext.time
            };

            console.log(`   📋 Params finales:`, JSON.stringify(checkParams));
            functionResult = await callCheckAvailability(tenantId, checkParams);

            if (functionResult.stylist && functionResult.stylist.id) {
                updatedContext.stylist = functionResult.stylist.name;
                updatedContext.stylist_id = functionResult.stylist.id;
                console.log(`   ✅ Estilista guardado: ${functionResult.stylist.name} (${functionResult.stylist.id})`);
            }

            if (functionResult.needsDate && functionResult.stylist) {
                updatedContext.stylist = functionResult.stylist.name;
                updatedContext.stylist_id = functionResult.stylist.id;
            }

            if (functionResult.stylists && Array.isArray(functionResult.stylists) && checkParams.stylistName) {
                const searchName = checkParams.stylistName.toLowerCase();
                const matchedStylist = functionResult.stylists.find(s => 
                    s.name.toLowerCase().includes(searchName) ||
                    searchName.includes(s.name.toLowerCase().split(' ')[0])
                );
                
                if (matchedStylist) {
                    updatedContext.stylist = matchedStylist.name;
                    updatedContext.stylist_id = matchedStylist.id;
                    console.log(`   ✅ Estilista encontrado en lista: ${matchedStylist.name} (${matchedStylist.id})`);
                    functionResult.matched_stylist = matchedStylist;
                }
            }

            if (functionResult.date && !bookingContext.date) {
                updatedContext.date = functionResult.date;
            }

            if (functionResult.salonClosed) {
                console.log(`   ⚠️ Salón cerrado ese día`);
                if (functionResult.nextAvailableDay) {
                    console.log(`   📅 Siguiente día disponible: ${functionResult.nextAvailableDay}`);
                }
                functionResult.can_book = false;
                functionResult.reason = 'salon_closed';
            }
        }
        else if (functionName === 'agendar_cita') {
            const _uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const bookParams = {
                serviceId: (_uuid.test(functionArgs.serviceId) ? functionArgs.serviceId : null) || bookingContext.service_id,
                stylistId: (_uuid.test(functionArgs.stylistId) ? functionArgs.stylistId : null) || bookingContext.stylist_id,
                stylistName: functionArgs.stylistName || bookingContext.stylist,
                date: functionArgs.date || bookingContext.date,
                time: functionArgs.time || bookingContext.time
            };

            console.log(`\n📝 [AGENDAR CITA] Preparando reserva`);
            console.log(`   ClientId: ${clientId}`);
            console.log(`   Params finales:`, JSON.stringify(bookParams, null, 2));

            if (!clientId) {
                console.log(`   ❌ Error: clientId es null o undefined`);
                functionResult = {
                    booked: false,
                    error: 'No se pudo identificar tu número de teléfono. Por favor, asegúrate de que tu número esté registrado en nuestro sistema o contacta directamente con el salón.'
                };
            } else {
                functionResult = await callBookAppointment(tenantId, clientId, bookParams);
            }

            if (functionResult.booked) {
                updatedContext.booked = true;
                console.log(`   ✅ Cita agendada exitosamente`);
            } else {
                console.log(`   ❌ Error al agendar:`, functionResult.error || functionResult.message);
            }
        }
        else if (functionName === 'ver_mis_agendas') {
            functionResult = await callVerMisAgendas(tenantId, clientId);
        }
        else if (functionName === 'cancelar_cita') {
            const appointmentId = functionArgs.appointmentId;
            functionResult = await callCancelarCita(tenantId, clientId, appointmentId);
        }
        else if (functionName === 'modificar_cita') {
            const { appointmentId, newDate, newTime } = functionArgs;
            functionResult = await callModificarCita(tenantId, clientId, appointmentId, newDate, newTime);
        }

        console.log('\n📋 [FUNCTION RESULT]:', JSON.stringify(functionResult, null, 2).substring(0, 800));

        // ── Respuesta directa cuando auto_checked (sin volver a llamar a GPT) ──
        if (functionResult.auto_checked && functionResult.availability) {
            const avail = functionResult.availability;
            const stylistName = avail.stylist?.name || updatedContext.stylist || 'el estilista';
            const serviceName = functionResult.service?.name || updatedContext.service || 'el servicio';
            let directResponse;

            if (avail.available && avail.time) {
                const time12 = avail.slots_12h?.[0] || avail.time || '';
                directResponse = `✅ *${stylistName}* está disponible para *${serviceName}* el ${avail.date || 'ese día'} a las *${time12}*.\n\n¿Confirmo tu cita? 💇`;
            } else if (avail.available && avail.franjas && avail.franjas.length > 0) {
                directResponse = `*${stylistName}* tiene disponibilidad para *${serviceName}* el ${avail.date || 'ese día'}:\n\n${avail.franjas.join('\n')}\n\n¿Qué hora te conviene? 😊`;
            } else if (avail.available && avail.slots_12h && avail.slots_12h.length > 0) {
                const slots = avail.slots_12h.map((s, i) => `${i + 1}. ${s}`).join('\n');
                directResponse = `*${stylistName}* tiene disponible *${serviceName}* el ${avail.date || 'ese día'} en estos horarios:\n\n${slots}\n\n¿Cuál prefieres? 😊`;
            } else if (!avail.available && avail.slots_12h && avail.slots_12h.length > 0) {
                const slots = avail.slots_12h.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join('\n');
                directResponse = `${stylistName} no tiene disponible esa hora para *${serviceName}*, pero tiene estos horarios:\n\n${slots}\n\n¿Cuál prefieres? 😊`;
            } else if (avail.salonClosed) {
                directResponse = avail.message || `Lo siento, el salón no está abierto ese día. ${avail.nextAvailableDay ? `El próximo día disponible es ${avail.nextAvailableDay}.` : '¿Quieres probar otro día?'}`;
            } else {
                directResponse = avail.message || `Lo siento, ${stylistName} no tiene disponibilidad para ese día. ¿Quieres probar otra fecha u otro estilista?`;
            }

            console.log('   ⚡ Respuesta directa (auto_checked):', directResponse.substring(0, 200));
            return {
                response: directResponse,
                updatedContext
            };
        }

        // Acumular resultado para enviar a GPT
        allToolResults.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(functionResult) });
        } // ── fin del for (toolCall of assistantMessage.tool_calls) ──

        const followUpMessages = [
            ...messages,
            assistantMessage,
            ...allToolResults
        ];

        console.log('\n🤖 [GPT] Generando respuesta final...');

        const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: followUpMessages,
                temperature: 0.3,
                max_tokens: 400
            })
        });

        if (!finalResponse.ok) {
            // Usar el mensaje del último resultado disponible
            const lastResult = allToolResults.length > 0 ? JSON.parse(allToolResults[allToolResults.length - 1].content) : {};
            return {
                response: lastResult.message || 'Procesado.',
                updatedContext
            };
        }

        const finalData = await finalResponse.json();
        const finalResponseText = finalData.choices[0].message.content;

        // Track token usage for the follow-up GPT call
        if (finalData.usage) {
            trackUsage(tenantId, 'chat', 'gpt-4o-mini', finalData.usage.prompt_tokens, finalData.usage.completion_tokens, finalData.usage.total_tokens);
        }

        return {
            response: finalResponseText,
            updatedContext
        };
    }

    return { response: assistantMessage.content, updatedContext: null };
}

/* =================================================================== */
/* ==============   PROCESAR CON IA ADMIN (WHATSAPP)   =============== */
/* =================================================================== */

async function processWithAdminAI(tenantId, adminSession, userMessage, isVoiceMessage = false) {
    const apiKey = await getGlobalOpenAIKey();
    if (!apiKey) throw new Error('No hay API key de OpenAI configurada.');

    const now = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd hh:mm a');
    let systemPrompt = `${ADMIN_SYSTEM_PROMPT}\n\nFecha/hora actual: ${now}\nAdmin: ${adminSession.name} (${adminSession.email})`;

    if (adminSession.tenantName) {
        systemPrompt += `\nSalón actual: ${adminSession.tenantName}`;
    }

    if (isVoiceMessage) {
        systemPrompt += `\n\n⚠️ RESPUESTA POR VOZ: El admin envió una nota de voz, tu respuesta será convertida a audio (TTS). MUY IMPORTANTE:
- Formatea números de forma HABLADA: en vez de "$300.000" di "trescientos mil pesos" o "300 mil pesos"
- En vez de "$1.500.000" di "un millón quinientos mil" o "millón y medio"
- Sé conversacional y natural, como si hablaras por teléfono
- NO uses emojis, asteriscos, viñetas ni formato markdown
- Usa frases como "llevas", "tienes", "van" en vez de listar datos fríamente
- Para ventas di algo como: "hoy llevas 300 mil pesos en total, 100 mil en efectivo, 150 mil en tarjeta y 50 mil en transferencias"
- Para productos: "el más vendido es tal con 20 unidades"`;
    }

    // Usar historial separado de la sesión admin
    const history = adminSession.conversationHistory || [];

    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: userMessage }
    ];

    console.log(`\n🤖 [ADMIN WA] Enviando request para ${adminSession.name}...`);

    const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            tools: ADMIN_TOOLS,
            tool_choice: 'auto',
            temperature: 0.5,
            max_tokens: 800
        })
    });

    if (!firstResponse.ok) {
        const errBody = await firstResponse.text();
        console.error('[ADMIN WA] OpenAI error:', errBody);
        throw new Error('Error al comunicarse con OpenAI.');
    }

    const firstData = await firstResponse.json();
    const assistantMessage = firstData.choices[0].message;

    if (firstData.usage) {
        trackUsage(tenantId, 'admin_chat_whatsapp', firstData.model || 'gpt-4o-mini',
            firstData.usage.prompt_tokens, firstData.usage.completion_tokens).catch(() => {});
    }

    // Si no hay tool_calls, respuesta directa
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        const reply = assistantMessage.content || 'No tengo respuesta en este momento.';
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 20) adminSession.conversationHistory = history.slice(-20);
        else adminSession.conversationHistory = history;
        return reply;
    }

    // Ejecutar TODAS las tool_calls en paralelo
    const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
            let result;
            try {
                console.log(`   🔧 [ADMIN WA] Ejecutando: ${functionName}(${JSON.stringify(functionArgs)})`);
                result = await executeAdminFunction(functionName, functionArgs, tenantId);
            } catch (err) {
                console.error(`   ❌ [ADMIN WA] Error en ${functionName}:`, err.message);
                result = { error: `Error ejecutando ${functionName}: ${err.message}` };
            }
            return {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            };
        })
    );

    // Segunda llamada con resultados de las funciones
    const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
    ];

    const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            temperature: 0.5,
            max_tokens: 800
        })
    });

    if (!secondResponse.ok) {
        const errBody = await secondResponse.text();
        console.error('[ADMIN WA] OpenAI follow-up error:', errBody);
        throw new Error('Error al procesar la respuesta de las funciones.');
    }

    const secondData = await secondResponse.json();

    if (secondData.usage) {
        trackUsage(tenantId, 'admin_chat_whatsapp', secondData.model || 'gpt-4o-mini',
            secondData.usage.prompt_tokens, secondData.usage.completion_tokens).catch(() => {});
    }

    const finalContent = secondData.choices[0].message.content || 'No pude generar una respuesta.';

    // Actualizar historial de la sesión admin
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: finalContent });
    if (history.length > 20) adminSession.conversationHistory = history.slice(-20);
    else adminSession.conversationHistory = history;

    const executedFunctions = assistantMessage.tool_calls.map(tc => tc.function.name).join(', ');
    console.log(`   ✅ [ADMIN WA] Funciones ejecutadas: ${executedFunctions}`);

    return finalContent;
}

/* =================================================================== */
/* ==============   LLAMADAS A LOS ENDPOINTS   ======================= */
/* =================================================================== */

async function callSearchService(tenantId, service, date = null, time = null, stylistName = null) {
    try {
        const whatsappBookingController = require('./Whatsappbookingcontroller');
        const mockReq = { body: { tenantId, service, date, time, stylistName } };
        let responseData = null;
        const mockRes = {
            status: (code) => mockRes,
            json: (data) => { responseData = data; return mockRes; }
        };
        await whatsappBookingController.searchService(mockReq, mockRes);
        return responseData || { found: false, message: 'Error buscando servicio' };
    } catch (error) {
        console.error('❌ Error en callSearchService:', error);
        return { found: false, message: 'Error interno' };
    }
}

async function callCheckAvailability(tenantId, params) {
    try {
        const whatsappBookingController = require('./Whatsappbookingcontroller');
        const mockReq = { body: { tenantId, ...params } };
        let responseData = null;
        const mockRes = {
            status: (code) => mockRes,
            json: (data) => { responseData = data; return mockRes; }
        };
        await whatsappBookingController.checkAvailability(mockReq, mockRes);
        return responseData || { available: false, message: 'Error verificando disponibilidad' };
    } catch (error) {
        console.error('❌ Error en callCheckAvailability:', error);
        return { available: false, message: 'Error interno' };
    }
}

async function callBookAppointment(tenantId, clientId, params) {
    try {
        const whatsappBookingController = require('./Whatsappbookingcontroller');
        console.log('\n📞 [CALL BOOK APPOINTMENT]');
        console.log('   TenantId:', tenantId);
        console.log('   ClientId:', clientId);
        console.log('   Params recibidos:', JSON.stringify(params, null, 2));

        if (!clientId) {
            console.log('   ❌ Error: clientId no proporcionado');
            return { booked: false, error: 'No se pudo identificar al cliente.' };
        }
        if (!params.serviceId) return { booked: false, error: 'No se ha seleccionado un servicio.' };
        if (!params.stylistId && !params.stylistName) return { booked: false, error: 'No se ha seleccionado un estilista.' };
        if (!params.date) return { booked: false, error: 'No se ha indicado la fecha.' };
        if (!params.time) return { booked: false, error: 'No se ha indicado la hora.' };

        const mockReq = { body: { tenantId, clientId, ...params } };
        let responseData = null;
        let statusCode = 200;
        const mockRes = {
            status: (code) => { statusCode = code; return mockRes; },
            json: (data) => { responseData = data; return mockRes; }
        };

        await whatsappBookingController.bookAppointment(mockReq, mockRes);
        console.log('   📋 Respuesta del endpoint:', JSON.stringify(responseData, null, 2));
        console.log('   Status code:', statusCode);

        return responseData || { booked: false, error: 'Error desconocido al agendar cita' };
    } catch (error) {
        console.error('❌ Error en callBookAppointment:', error);
        return { booked: false, error: 'Error interno: ' + error.message };
    }
}

async function callVerMisAgendas(tenantId, clientId) {
    try {
        const list = await getUpcomingAppointmentsForClient(tenantId, clientId);
        if (list.length === 0) {
            return { found: false, message: 'No tienes citas programadas.' };
        }
        const lines = list.map((c, i) =>
            `${i + 1}. ${c.service_name} con ${c.stylist_name}, ${c.dateFormatted} a las ${c.timeFormatted} (id: ${c.id})`
        );
        return {
            found: true,
            count: list.length,
            appointments: list,
            message: `Tienes ${list.length} cita(s) programada(s):\n${lines.join('\n')}\n\n¿Quieres cancelar o modificar alguna? Di el número o el id de la cita.`
        };
    } catch (err) {
        console.error('❌ callVerMisAgendas:', err);
        return { found: false, message: 'No pude cargar tus citas. Intenta de nuevo.' };
    }
}

async function callCancelarCita(tenantId, clientId, appointmentId) {
    if (!appointmentId) {
        return { cancelled: false, error: 'Falta el id de la cita.' };
    }
    try {
        const result = await db.query(
            'DELETE FROM appointments WHERE id = $1::uuid AND client_id = $2::uuid AND tenant_id = $3::uuid RETURNING id',
            [appointmentId, clientId, tenantId]
        );
        if (result.rowCount === 0) {
            return { cancelled: false, error: 'No se encontró esa cita o no te pertenece.' };
        }
        try { getIO().to(`tenant:${tenantId}`).emit('appointment:cancelled', { id: appointmentId }); } catch(e) {}
        return { cancelled: true, message: 'Tu cita ha sido cancelada.' };
    } catch (err) {
        console.error('❌ callCancelarCita:', err);
        return { cancelled: false, error: 'No pude cancelar la cita. Intenta de nuevo.' };
    }
}

async function callModificarCita(tenantId, clientId, appointmentId, newDate, newTime) {
    if (!appointmentId || !newDate || !newTime) {
        return { updated: false, error: 'Faltan id de cita, nueva fecha o nueva hora.' };
    }
    try {
        const apptRes = await db.query(
            `SELECT a.id, a.stylist_id, a.service_id
             FROM appointments a
             WHERE a.id = $1::uuid AND a.client_id = $2::uuid AND a.tenant_id = $3::uuid
               AND a.status IN ('scheduled', 'pending_approval', 'rescheduled')`,
            [appointmentId, clientId, tenantId]
        );
        if (apptRes.rows.length === 0) {
            return { updated: false, error: 'No se encontró esa cita o no te pertenece.' };
        }
        const appt = apptRes.rows[0];
        const durationRes = await db.query('SELECT duration_minutes FROM services WHERE id = $1::uuid', [appt.service_id]);
        const duration = Number(durationRes.rows[0]?.duration_minutes) || 60;
        const startTime = new Date(`${newDate}T${newTime}:00`);
        if (isNaN(startTime.getTime())) {
            return { updated: false, error: 'Fecha u hora inválida. Usa formato YYYY-MM-DD y HH:mm.' };
        }
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const overlap = await db.query(
            `SELECT id FROM appointments
             WHERE stylist_id = $1::uuid AND id <> $2::uuid
               AND status = ANY($3)
               AND (start_time, end_time) OVERLAPS ($4, $5)`,
            [appt.stylist_id, appointmentId, BLOCKING_STATUSES, startTime, endTime]
        );
        if (overlap.rowCount > 0) {
            return { updated: false, error: 'Ese horario no está disponible. Elige otra fecha u hora.' };
        }

        await db.query(
            'UPDATE appointments SET start_time = $1, end_time = $2, updated_at = NOW() WHERE id = $3::uuid',
            [startTime, endTime, appointmentId]
        );
        try { getIO().to(`tenant:${tenantId}`).emit('appointment:updated', { id: appointmentId, start_time: startTime, end_time: endTime }); } catch(e) {}
        const esLocale = require('date-fns/locale/es');
        const dateFormatted = formatInTimeZone(startTime, TIME_ZONE, "EEEE d 'de' MMMM", { locale: esLocale });
        const timeFormatted = formatInTimeZone(startTime, TIME_ZONE, 'h:mm a', { locale: esLocale });
        return {
            updated: true,
            message: `Cita modificada para el ${dateFormatted} a las ${timeFormatted}.`
        };
    } catch (err) {
        console.error('❌ callModificarCita:', err);
        return { updated: false, error: 'No pude modificar la cita. Intenta de nuevo.' };
    }
}

/* =================================================================== */
/* ==============   OTROS ENDPOINTS   ================================ */
/* =================================================================== */

exports.getStatus = async (req, res) => {
    const { tenantId } = req.params;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    try {
        let sessionStatus = await wahaService.getSessionStatus(tenantId);

        if (!sessionStatus) {
            console.log(`🆕 Sesión ${tenantId} no existe. Creando...`);
            await wahaService.startSession(tenantId);
            return res.json({ status: 'LOADING' });
        }

        const status = String(sessionStatus.status).toLowerCase();

        if (status === 'working' || status === 'authenticated') {
            return res.json({ status: 'CONNECTED' });
        }

        if (status === 'scan_qr_code') {
            const qrImageBase64 = await wahaService.getQrRawData(tenantId);
            if (qrImageBase64) {
                return res.json({ status: 'QR_READY', qr: qrImageBase64 });
            }
            return res.json({ status: 'LOADING' });
        }

        if (status === 'failed') {
            await wahaService.deleteSession(tenantId);
            return res.json({ status: 'LOADING', message: 'Reparando sesión...' });
        }

        if (status === 'stopped') {
            await wahaService.startSession(tenantId);
            return res.json({ status: 'LOADING' });
        }

        return res.json({ status: 'LOADING' });

    } catch (error) {
        console.error('❌ Error en getStatus:', error.message);
        return res.json({ status: 'ERROR', message: error.message });
    }
};

exports.disconnect = async (req, res) => {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'Falta tenantId' });

    console.log(`🔌 Desconectando tenant: ${tenantId}`);

    try {
        await wahaService.deleteSession(tenantId);

        await db.query(
            `UPDATE tenant_numbers
             SET provider = 'disconnected', phone_number_id = 'disconnected', display_phone_number = '', updated_at = NOW()
             WHERE tenant_id = $1::uuid`,
            [tenantId]
        );

        for (const key of conversationCache.keys()) {
            if (key.startsWith(tenantId)) conversationCache.delete(key);
        }
        for (const key of bookingContextCache.keys()) {
            if (key.startsWith(tenantId)) bookingContextCache.delete(key);
        }
        for (const key of adminSessionCache.keys()) {
            if (key.startsWith(tenantId)) adminSessionCache.delete(key);
        }
        for (const key of adminAuthStateCache.keys()) {
            if (key.startsWith(tenantId)) adminAuthStateCache.delete(key);
        }

        return res.json({ success: true, message: 'Desconectado correctamente.' });

    } catch (error) {
        console.error('Error al desconectar:', error);
        res.status(200).json({ success: true, message: 'Desconexión forzada.' });
    }
};