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
const { executeFunction: executeStylistFunction, STYLIST_TOOLS, STYLIST_SYSTEM_PROMPT } = require('./whatsappStylistController');
const bcrypt = require('bcryptjs');
const { isPlanAtLeast, getTenantPlan } = require('../middleware/planMiddleware');
const { isInHandoff, setHandoff } = require('../services/handoffCache');

console.log('🚀 [DEBUG] whatsappController.js cargado v17 (Evolution API v2 migration)');

const TIME_ZONE = 'America/Bogota';

// Cache para historial de conversación
const conversationCache = new Map();

// Cache para datos de reserva en progreso
const bookingContextCache = new Map();

// Cache para datos pendientes del cliente antes de agendar
const pendingClientDataCache = new Map(); // Key: "tenantId:chatId" → { step: 'name'|'email', bookingParams, collected: {} }

// Cache para sesiones admin por WhatsApp
const adminSessionCache = new Map();   // Key: "tenantId:chatId" → { userId, role_id, email, name, lastActivity, conversationHistory }
const adminAuthStateCache = new Map(); // Key: "tenantId:chatId" → { step: 'email'|'password', email?, attempts, blockedUntil? }
// Cache para estilistas (auth automático por número de WhatsApp, sin contraseña)
const stylistSessionCache = new Map(); // Key: "tenantId:chatId" → { stylistId, stylistTenantId, name, lastActivity, conversationHistory }
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

    // Limpiar datos pendientes de cliente (máx 10 min)
    for (const [key, pending] of pendingClientDataCache.entries()) {
        if (pending.createdAt && (now - pending.createdAt > 10 * 60 * 1000)) {
            pendingClientDataCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 [CACHE] Limpieza: ${cleaned} entradas eliminadas. Sizes: conv=${conversationCache.size}, booking=${bookingContextCache.size}, adminSess=${adminSessionCache.size}, authState=${adminAuthStateCache.size}, pendingData=${pendingClientDataCache.size}`);
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
/* ==============   NORMALIZACIÓN EVOLUTION API → FORMATO INTERNO  ==== */
/* =================================================================== */

function normalizeEvolutionEvent(raw) {
    // Si ya tiene el formato interno (event + session), devolver tal cual
    if (raw.event && raw.session) return raw;

    const evolutionEvent = raw.event;
    const instanceName = raw.instance;
    const data = raw.data || {};

    // CONNECTION_UPDATE → session.status
    if (evolutionEvent === 'connection.update' || evolutionEvent === 'CONNECTION_UPDATE') {
        const state = data.state || data.status;
        let mappedStatus = 'unknown';
        if (state === 'open') mappedStatus = 'authenticated';
        else if (state === 'close' || state === 'refused') mappedStatus = 'failed';
        else if (state === 'connecting') mappedStatus = 'scan_qr_code';

        return {
            event: 'session.status',
            session: instanceName,
            payload: { status: mappedStatus }
        };
    }

    // MESSAGES_UPSERT → message
    if (evolutionEvent === 'messages.upsert' || evolutionEvent === 'MESSAGES_UPSERT') {
        // Evolution puede enviar array o objeto
        const messages = Array.isArray(data) ? data : (data.messages || [data]);
        const msg = messages[0];
        if (!msg) return { event: evolutionEvent, session: instanceName, payload: {} };

        const key = msg.key || {};
        const fromMe = key.fromMe || false;
        const remoteJid = key.remoteJid || '';
        // Normalizar JID: @s.whatsapp.net → @c.us para compatibilidad con caches y DB
        const chatId = remoteJid.replace(/@s\.whatsapp\.net$/, '@c.us');

        // Extraer texto del mensaje
        const msgContent = msg.message || {};
        let body = msgContent.conversation
            || msgContent.extendedTextMessage?.text
            || msgContent.buttonsResponseMessage?.selectedDisplayText
            || msgContent.listResponseMessage?.title
            || '';

        // Determinar tipo de mensaje
        let type = 'chat';
        let audioBase64 = null;
        if (msgContent.audioMessage) {
            type = msgContent.audioMessage.ptt ? 'ptt' : 'audio';
            // Con webhookBase64=true, el audio viene en base64
            audioBase64 = msg.base64 || msgContent.audioMessage?.base64 || null;
        } else if (msgContent.imageMessage) {
            type = 'image';
        } else if (msgContent.videoMessage) {
            type = 'video';
        } else if (msgContent.documentMessage) {
            type = 'document';
        } else if (msgContent.stickerMessage) {
            type = 'sticker';
        }

        return {
            event: 'message',
            session: instanceName,
            payload: {
                id: key.id,
                from: chatId,
                fromMe: fromMe,
                body: body,
                type: type,
                pushName: msg.pushName || '',
                notifyName: msg.pushName || '',
                audioBase64: audioBase64,
                _data: msg
            }
        };
    }

    // QRCODE_UPDATED - ignorar (el frontend pollean getStatus que llama a getQrRawData)
    if (evolutionEvent === 'qrcode.updated' || evolutionEvent === 'QRCODE_UPDATED') {
        return { event: 'qrcode.updated', session: instanceName, payload: data };
    }

    // Evento desconocido: pasar tal cual
    return {
        event: evolutionEvent || raw.event,
        session: instanceName || raw.session,
        payload: data || raw.payload
    };
}

/* =================================================================== */
/* ==============   WEBHOOK (EVOLUTION API)   ========================= */
/* =================================================================== */

exports.handleWahaWebhook = async (req, res) => {
    try {
        const rawEvent = req.body;

        // ═══════════════════════════════════════════════════════════════
        // ══════  NORMALIZACIÓN: Evolution API → formato interno  ══════
        // ═══════════════════════════════════════════════════════════════
        const event = normalizeEvolutionEvent(rawEvent);
        const eventType = event.event;
        const tenantId = event.session;

        if (!tenantId) {
            return res.status(200).send('OK');
        }

        console.log(`\n📥 [WEBHOOK] Evento recibido: ${eventType} | Sesión: ${tenantId}`);

        // Cambio de estado de sesión
        if (eventType === 'session.status' && event.payload?.status === 'authenticated') {
            console.log('🔔 [WEBHOOK] ¡Conexión Exitosa Detectada!');

            // Evolution no envía el número en connection.update, lo obtenemos via API
            let cleanNumber = null;
            const me = event.me || event.payload?.me;
            if (me) {
                cleanNumber = (me.id || me).split('@')[0];
            } else {
                cleanNumber = await wahaService.getInstanceOwnerJid(tenantId);
            }

            if (tenantId && cleanNumber) {
                const displayNumber = '+' + cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');

                await prisma.$queryRawUnsafe(
                    `UPDATE tenant_numbers
                     SET provider = 'disconnected', phone_number_id = 'disconnected', display_phone_number = ''
                     WHERE phone_number_id = $1 AND tenant_id != $2::uuid`,
                    cleanNumber, tenantId
                );

                await prisma.$queryRawUnsafe(
                    `UPDATE tenant_numbers
                     SET provider = 'evolution', phone_number_id = $1, display_phone_number = $2, updated_at = NOW()
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

                        // Evolution: audio base64 viene inline en payload (webhook con base64=true)
                        if (payload.audioBase64) {
                            audioBuffer = Buffer.from(payload.audioBase64, 'base64');
                            console.log(`   ✅ Audio obtenido inline (base64, ${audioBuffer.length} bytes)`);
                        }

                        // Fallback: descargar via Evolution API
                        if (!audioBuffer && payload.id) {
                            try {
                                audioBuffer = await wahaService.getMediaBuffer(tenantId, payload.id);
                                console.log(`   ✅ Audio descargado via API (${audioBuffer.length} bytes)`);
                            } catch (dlError) {
                                console.log(`   ⚠️ Evolution API download falló: ${dlError.message}`);
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
            // ══════  INTERCEPTOR: ESTILISTA POR WHATSAPP  ═════════════
            // ═══════════════════════════════════════════════════════════
            // Auth automático por número: si el phone matchea un user role_id=3
            // de este tenant (o de una sucursal hija/padre), entrar en modo estilista.
            if (userMessage && typeof userMessage === 'string') {
                const stylistCacheKey = `${tenantId}:${chatId}`;
                let stylistSession = stylistSessionCache.get(stylistCacheKey);

                // Si no hay sesión, intentar identificar al estilista por su teléfono
                if (!stylistSession) {
                    try {
                        const stylistRows = await prisma.$queryRawUnsafe(
                            `SELECT u.id, u.tenant_id, u.first_name, u.last_name, u.employment_type, u.rental_status
                             FROM users u
                             JOIN tenants t_user ON t_user.id = u.tenant_id
                             JOIN tenants t_wa   ON t_wa.id   = $1::uuid
                             WHERE u.phone = $2
                               AND u.role_id = 3
                               AND COALESCE(u.status, 'active') = 'active'
                               AND (
                                   u.tenant_id = $1::uuid
                                   OR t_user.parent_tenant_id = $1::uuid
                                   OR t_wa.parent_tenant_id = u.tenant_id
                                   OR (t_user.parent_tenant_id IS NOT NULL
                                       AND t_user.parent_tenant_id = t_wa.parent_tenant_id)
                               )
                             LIMIT 1`,
                            tenantId, phoneNumber
                        );
                        if (stylistRows.length > 0) {
                            const s = stylistRows[0];
                            stylistSession = {
                                stylistId: s.id,
                                stylistTenantId: s.tenant_id,
                                name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Estilista',
                                lastActivity: Date.now(),
                                conversationHistory: []
                            };
                            stylistSessionCache.set(stylistCacheKey, stylistSession);
                            console.log(`💇 [STYLIST WA] Estilista identificado: ${stylistSession.name} (id=${s.id}, tenant=${s.tenant_id}, type=${s.employment_type})`);

                            const isRenter = s.employment_type === 'renter';
                            const rentalBlock = isRenter
                                ? `\n*💳 TU ESPACIO DE COWORKING:*\n` +
                                  `• "ver mi coworking" → estado, mensualidad y tarifa diaria\n` +
                                  `• "configurar mi pago" → guardar tarjeta (primera vez)\n` +
                                  `• "actualizar mi tarjeta" → cambiar tarjeta guardada\n\n`
                                : '';

                            // Saludo de bienvenida en la PRIMERA interacción
                            await wahaService.sendMessage(tenantId, chatId,
                                `Hola ${stylistSession.name.split(' ')[0]} 💇 Soy tu asistente.\n\n` +
                                `*🧾 ARMAR TICKETS:*\n` +
                                `• "abre un ticket a María González"\n` +
                                `• "crea un cliente Pedro 3001234567" (si es nuevo)\n` +
                                `• "agrega un corte al ticket"\n` +
                                `• "agrega un shampoo al ticket"\n` +
                                `• "muéstrame mi ticket actual"\n\n` +
                                `*📊 CONSULTAS:*\n` +
                                `• "mi agenda hoy"\n` +
                                `• "cuánto llevo ganado hoy"\n` +
                                `• "mis comisiones del mes"\n` +
                                `• "mi fichero" / "mis anticipos" / "mis préstamos"\n` +
                                `• "resumen" → todo en uno\n\n` +
                                rentalBlock +
                                `_El cobro lo hace el cajero, tú solo armas el ticket._`
                            );
                            return res.status(200).send('OK');
                        }
                    } catch (stylErr) {
                        console.error('[STYLIST WA] Error identificando estilista:', stylErr.message);
                    }
                }

                // Si hay sesión activa, procesar con IA del estilista
                if (stylistSession) {
                    const msgTrimmed = userMessage.trim();
                    if (/^(salir|cerrar\s*sesion|cerrar\s*sesión|exit|logout)$/i.test(msgTrimmed)) {
                        stylistSessionCache.delete(stylistCacheKey);
                        await wahaService.sendMessage(tenantId, chatId, '👋 Sesión cerrada. Cuando me escribas otra vez te identifico de nuevo.');
                        return res.status(200).send('OK');
                    }
                    // Comando ayuda / menu — re-muestra las opciones
                    if (/^(ayuda|menu|menú|opciones|help|comandos|qu[eé]\s*puedes\s*hacer)$/i.test(msgTrimmed)) {
                        await wahaService.sendMessage(tenantId, chatId,
                            `Estos son los comandos que entiendo:\n\n` +
                            `*🧾 ARMAR TICKETS:*\n` +
                            `• "abre un ticket a [nombre del cliente]"\n` +
                            `• "crea un cliente [nombre] [teléfono]" (si es nuevo)\n` +
                            `• "busca el ticket de [nombre]" (sumarte a uno existente)\n` +
                            `• "agrega [servicio] al ticket"\n` +
                            `• "agrega [producto] al ticket"\n` +
                            `• "muéstrame mi ticket actual"\n` +
                            `• "cambia el precio del corte a 25000, [motivo]"\n\n` +
                            `*📊 CONSULTAS:*\n` +
                            `• "mi agenda hoy" / "qué tengo mañana"\n` +
                            `• "cuánto llevo hoy" / "mis ganancias"\n` +
                            `• "mis comisiones del mes"\n` +
                            `• "mi fichero" / "mis anticipos" / "mis préstamos"\n` +
                            `• "mis sucursales" / "cámbiame a [nombre]"\n` +
                            `• "resumen"`
                        );
                        return res.status(200).send('OK');
                    }
                    stylistSession.lastActivity = Date.now();
                    try {
                        const stylistReply = await processWithStylistAI(stylistSession, msgTrimmed, isVoiceMessage);
                        await wahaService.sendMessage(tenantId, chatId, stylistReply);
                    } catch (stylAIErr) {
                        console.error('[STYLIST WA] Error procesando con IA:', stylAIErr.message);
                        await wahaService.sendMessage(tenantId, chatId, '😅 No pude procesar tu pregunta. Intenta de nuevo.');
                    }
                    return res.status(200).send('OK');
                }
            }

            // ═══════════════════════════════════════════════════════════
            // ══════  INTERCEPTOR: ADMIN POR WHATSAPP  ═════════════════
            // ═══════════════════════════════════════════════════════════
            // Verificar plan business+ para admin chat por WhatsApp
            const tenantPlan = await getTenantPlan(tenantId);

            if (userMessage && typeof userMessage === 'string') {
                const adminCacheKey = `${tenantId}:${chatId}`;
                const adminSession = adminSessionCache.get(adminCacheKey);
                const authState = adminAuthStateCache.get(adminCacheKey);
                const msgTrimmed = userMessage.trim();
                const msgLower = msgTrimmed.toLowerCase();

                // 1. Si ya tiene sesión admin activa
                if (adminSession && (Date.now() - adminSession.lastActivity < ADMIN_SESSION_TIMEOUT)) {
                    // Verificar que el plan siga siendo business+ para sesiones admin activas
                    if (!isPlanAtLeast(tenantPlan, 'business')) {
                        adminSessionCache.delete(adminCacheKey);
                        await wahaService.sendMessage(tenantId, chatId, '🔒 El modo administrador por WhatsApp requiere el plan Business o superior. Tu sesión admin ha sido cerrada.');
                        return res.status(200).send('OK');
                    }
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
                    // Verificar plan business+ para admin por WhatsApp
                    if (!isPlanAtLeast(tenantPlan, 'business')) {
                        await wahaService.sendMessage(tenantId, chatId, '🔒 El modo administrador por WhatsApp requiere el plan Business o superior. Visita app.tupelukeria.com/settings para actualizar tu plan.');
                        return res.status(200).send('OK');
                    }
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

            // ═══════════════════ CHECK BLOCKED ═══════════════════
            {
                const blockedConv = await prisma.whatsapp_conversations.findUnique({
                    where: { tenant_id_chat_id: { tenant_id: tenantId, chat_id: chatId } },
                    select: { blocked: true },
                });
                if (blockedConv?.blocked === true) {
                    console.log(`🚫 [BLOCKED] Mensaje ignorado de cliente bloqueado ${chatId}`);
                    return res.status(200).send('OK');
                }
            }

            // ═══════════════════ INTERCEPTOR HANDOFF (humano) ═══════════════════
            {
                const msgTrimmed = (userMessage || '').trim();
                const handoffTrigger = /\b(hablar\s+con\s+(un\s+|una\s+|el\s+|la\s+)?(alguien|persona|humano|asesor(a)?|recepcionista|agente)|quiero\s+(un\s+|una?\s+)?(humano|asesor(a)?|persona|agente)|necesito\s+(\w+\s+){0,3}(asesor(a)?|humano|persona|agente)|necesito\s+que\s+alguien\s+me\s+ayude|necesito\s+ayuda|ayuda\s+de\s+(un\s+|una?\s+)?(asesor|humano|persona|agente)|agente\s+real|atencion\s+humana|asistencia\s+humana|persona\s+real|comunic(ar|a)me\s+con\s+(un\s+|una\s+)?(asesor|persona|humano|agente)|paso\s+con\s+(un\s+|una\s+)?(asesor|humano|persona)|atender\s+me\s+(un\s+|una\s+)?(humano|persona|asesor))\b/i;

                // 1. Si ya está en handoff → guardar mensaje en DB + socket, NO procesar con IA
                if (isInHandoff(tenantId, chatId)) {
                    console.log(`🤝 [HANDOFF] Mensaje de cliente en handoff ${chatId}, reenviando a agente`);
                    try {
                        const conv = await prisma.whatsapp_conversations.findUnique({
                            where: { tenant_id_chat_id: { tenant_id: tenantId, chat_id: chatId } }
                        });
                        if (conv) {
                            await prisma.whatsapp_messages.create({
                                data: {
                                    conversation_id: conv.id,
                                    sender_type: 'client',
                                    sender_name: payload.notifyName || payload.pushName || phoneNumber,
                                    content: msgTrimmed || '[media]',
                                    message_type: 'text',
                                }
                            });
                            const io = getIO();
                            io.to(`tenant:${tenantId}`).emit('whatsapp:new-message', {
                                conversationId: conv.id,
                                message: {
                                    sender_type: 'client',
                                    sender_name: payload.notifyName || payload.pushName || phoneNumber,
                                    content: msgTrimmed || '[media]',
                                    created_at: new Date().toISOString(),
                                }
                            });
                        }
                    } catch (err) {
                        console.error('❌ [HANDOFF] Error guardando mensaje handoff:', err.message);
                    }
                    return res.status(200).send('OK');
                }

                // 2. Detectar trigger de handoff
                if (handoffTrigger.test(msgTrimmed)) {
                    console.log(`🤝 [HANDOFF] Trigger detectado de ${chatId}: "${msgTrimmed}"`);
                    try {
                        const displayName = payload.notifyName || payload.pushName || payload.contact?.name || '';
                        const conv = await prisma.whatsapp_conversations.upsert({
                            where: { tenant_id_chat_id: { tenant_id: tenantId, chat_id: chatId } },
                            create: {
                                tenant_id: tenantId,
                                chat_id: chatId,
                                client_name: displayName || phoneNumber,
                                client_phone: phoneNumber,
                                status: 'handoff',
                            },
                            update: {
                                status: 'handoff',
                                client_name: displayName || phoneNumber,
                                client_phone: phoneNumber,
                                updated_at: new Date(),
                            }
                        });
                        // Save the trigger message
                        await prisma.whatsapp_messages.create({
                            data: {
                                conversation_id: conv.id,
                                sender_type: 'client',
                                sender_name: displayName || phoneNumber,
                                content: msgTrimmed,
                                message_type: 'text',
                            }
                        });
                        setHandoff(tenantId, chatId);

                        const io = getIO();
                        io.to(`tenant:${tenantId}`).emit('whatsapp:new-handoff', {
                            conversationId: conv.id,
                            clientName: conv.client_name,
                            clientPhone: conv.client_phone,
                        });

                        await wahaService.sendMessage(tenantId, chatId,
                            '🤝 Te conecto con un asesor. En un momento te atiende una persona real.\n\nMientras tanto, puedes escribir tu consulta y la verá el asesor.'
                        );
                    } catch (err) {
                        console.error('❌ [HANDOFF] Error creando handoff:', err.message);
                        await wahaService.sendMessage(tenantId, chatId, 'Lo siento, no pude conectarte con un asesor en este momento. Intenta de nuevo más tarde.');
                    }
                    return res.status(200).send('OK');
                }
            }
            // ═══════════════════ FIN INTERCEPTOR HANDOFF ═══════════════════

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
            let hasValidEmail = false; // Flag para email real (no @whatsapp.temp)
            let hasValidPhone = false; // Flag para teléfono real
            const parsedName = parseFullName(notifyName);
            
            console.log(`   📋 Nombre de display recibido: "${notifyName}" ${notifyName ? '(válido)' : '(vacío - usando "Cliente")'}`);
            console.log(`   📋 Nombre parseado: first_name="${parsedName.firstName || 'null'}", last_name="${parsedName.lastName || 'null'}"`);

            try {
                // 🔧 MEJORADO: Buscar cliente por teléfono O por nombre (si tenemos display name válido)
                let existingClientRows = await prisma.$queryRawUnsafe(
                    `SELECT id, first_name, last_name, phone, email FROM users
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
                    // Validar email y teléfono
                    const savedEmail = existingClientRows[0].email || '';
                    const savedPhone = existingClientRows[0].phone || '';
                    hasValidEmail = savedEmail && !savedEmail.endsWith('@whatsapp.temp') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedEmail);
                    hasValidPhone = savedPhone && savedPhone.length >= 7 && !/^\d{1,3}$/.test(savedPhone);
                    console.log(`   ✅ Cliente existente identificado: ${senderName} (ID: ${clientId}, teléfono: ${phoneNumber}, tieneNombreEnBD: ${hasNameInDB}, emailValido: ${hasValidEmail}, telValido: ${hasValidPhone})`);
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
                            
                            hasValidPhone = true; // Teléfono siempre válido desde WhatsApp
                            hasValidEmail = false; // Email es placeholder @whatsapp.temp
                            console.log(`   🆕 Nuevo cliente creado: ${senderName} (ID: ${clientId}, teléfono: ${phoneNumber}, tieneNombreEnBD: ${hasNameInDB}, emailValido: ${hasValidEmail})`);
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

            // Verificar plan pro+ para bot de cliente por WhatsApp
            if (!isPlanAtLeast(tenantPlan, 'pro')) {
                console.log(`   🔒 Tenant ${tenantId} tiene plan ${tenantPlan}, bot cliente requiere pro+`);
                await wahaService.sendMessage(tenantId, chatId, '🔒 El asistente por WhatsApp requiere un plan superior. Contacta al administrador del salón.');
                return res.status(200).send('OK');
            }

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
                pendingClientDataCache.delete(cacheKey);
            }

            // ═══════════════════ INTERCEPTOR: RECOLECCIÓN DE DATOS DEL CLIENTE ═══════════════════
            const pendingData = pendingClientDataCache.get(cacheKey);
            if (pendingData && clientId) {
                const msg = userMessage.trim();

                if (pendingData.step === 'name') {
                    // Esperamos nombre completo (2+ palabras)
                    const namePattern = /^([A-Za-zÁÉÍÓÚáéíóúÑñüÜ]{2,})\s+([A-Za-zÁÉÍÓÚáéíóúÑñüÜ\s]{2,})$/;
                    const match = msg.match(namePattern);
                    if (match) {
                        const firstName = match[1];
                        const lastName = match[2].trim();
                        await db.query(
                            `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3::uuid`,
                            [firstName, lastName, clientId]
                        );
                        senderName = `${firstName} ${lastName}`;
                        hasNameInDB = true;
                        console.log(`   ✅ [DATOS] Nombre capturado: ${senderName}`);

                        // Si también falta email, pedir email
                        if (!hasValidEmail) {
                            pendingData.step = 'email';
                            pendingData.collected.name = senderName;
                            pendingClientDataCache.set(cacheKey, pendingData);
                            await wahaService.sendMessage(tenantId, chatId, `Gracias ${firstName}. Ahora necesito tu correo electrónico para enviarte la confirmación de tu cita.`);
                            return res.status(200).send('OK');
                        }

                        // Tiene todo, proceder a agendar
                        pendingClientDataCache.delete(cacheKey);
                        console.log(`   ✅ [DATOS] Datos completos, procediendo a agendar...`);
                        const bookResult = await callBookAppointmentMulti(tenantId, clientId, pendingData.bookingParams);
                        if (bookResult.booked) {
                            const bp = pendingData.bookingParams;
                            await wahaService.sendMessage(tenantId, chatId, `Listo ${firstName}, tu cita quedó agendada. Te esperamos.`);
                        } else {
                            await wahaService.sendMessage(tenantId, chatId, bookResult.error || 'No se pudo agendar la cita, intenta de nuevo.');
                        }
                        return res.status(200).send('OK');
                    } else {
                        await wahaService.sendMessage(tenantId, chatId, 'Necesito tu nombre completo (nombre y apellido). Por ejemplo: María García');
                        return res.status(200).send('OK');
                    }
                }

                if (pendingData.step === 'email') {
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (emailPattern.test(msg)) {
                        await db.query(
                            `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2::uuid`,
                            [msg.toLowerCase(), clientId]
                        );
                        hasValidEmail = true;
                        console.log(`   ✅ [DATOS] Email capturado: ${msg}`);

                        // Datos completos, agendar
                        pendingClientDataCache.delete(cacheKey);
                        const bookResult = await callBookAppointmentMulti(tenantId, clientId, pendingData.bookingParams);
                        if (bookResult.booked) {
                            await wahaService.sendMessage(tenantId, chatId, `Perfecto, tu cita quedó agendada. Te enviamos la confirmación a ${msg}`);
                        } else {
                            await wahaService.sendMessage(tenantId, chatId, bookResult.error || 'No se pudo agendar la cita, intenta de nuevo.');
                        }
                        return res.status(200).send('OK');
                    } else {
                        await wahaService.sendMessage(tenantId, chatId, 'Necesito un correo electrónico válido. Por ejemplo: tucorreo@gmail.com');
                        return res.status(200).send('OK');
                    }
                }
            }
            // ═══════════════════ FIN INTERCEPTOR DATOS CLIENTE ═══════════════════

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
                    brochureUrl,
                    { hasNameInDB, hasValidEmail, hasValidPhone, cacheKey }
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

                // Guardar conversación y mensajes en DB para historial
                try {
                    const conv = await prisma.whatsapp_conversations.upsert({
                        where: { tenant_id_chat_id: { tenant_id: tenantId, chat_id: chatId } },
                        create: {
                            tenant_id: tenantId,
                            chat_id: chatId,
                            client_name: senderName || phoneNumber,
                            client_phone: phoneNumber,
                            client_user_id: clientId || null,
                            status: 'bot',
                        },
                        update: {
                            client_name: senderName && senderName !== 'Cliente' ? senderName : undefined,
                            client_phone: phoneNumber,
                            client_user_id: clientId || undefined,
                            updated_at: new Date(),
                        },
                    });
                    await prisma.whatsapp_messages.createMany({
                        data: [
                            {
                                conversation_id: conv.id,
                                sender_type: 'client',
                                sender_name: senderName || phoneNumber,
                                content: userMessage || '[media]',
                                message_type: 'text',
                            },
                            {
                                conversation_id: conv.id,
                                sender_type: 'bot',
                                sender_name: 'Bot',
                                content: messageToSend,
                                message_type: 'text',
                            },
                        ],
                    });
                } catch (dbErr) {
                    console.error('⚠️ [WA-DB] Error guardando historial:', dbErr.message);
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

async function processWithAI(apiKey, tenantId, clientId, userMessage, conversationHistory, bookingContext, senderName, tenantName, extractedDateTime = { date: null, time: null }, upcomingAppointments = [], brochureUrl = null, clientFlags = {}) {
    const { hasNameInDB = true, hasValidEmail = true, hasValidPhone = true, cacheKey = '' } = clientFlags;
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

    const SYSTEM_PROMPT = `Eres el asistente comercial de "${tenantName}" en WhatsApp. Cliente: ${senderName}.
Hoy: ${hoyStr}.${contextInfo}

═══════════════════════════════════════════════════════════════
TU PERSONALIDAD: VENDEDOR ESTRELLA
═══════════════════════════════════════════════════════════════
- Eres amable, cercano y comercial. Tu objetivo es que el cliente AGENDE UNA CITA.
- Habla con naturalidad, como un asesor de confianza, NO como un robot lleno de emojis.
- EMOJIS: Casi nunca. Máximo 1 emoji por cada 3-4 mensajes, y solo si tiene sentido. Preferible NO usar. Nunca pongas emoji al lado de cada opción en una lista.
- Sé breve, directo y persuasivo. Nada de párrafos largos ni frases exageradas.
- USA EL NOMBRE DEL CLIENTE (${senderName}) para personalizar. Ejemplo: "${senderName}, este servicio te queda perfecto" en vez de "Este servicio es genial".
- SIEMPRE guía hacia agendar: "Te busco un horario?", "Cuando te queda bien?"
- UPSELL INTELIGENTE: Después de que el cliente elija un servicio o agende una cita, ofrece algo complementario de forma NATURAL y PERSONALIZADA:
  * NO digas: "Ya que vienes, te gustaría agregar un manicure?"
  * SÍ di: "${senderName}, aprovecha que vienes y sal con todo, te recomiendo complementar con un [servicio]. No dejes pasar la oportunidad."
  * Usa frases motivadoras naturales: "sal brillando", "aprovecha la visita", "quedate con el look completo", "date ese gusto".
- Cuando muestres listas de servicios, usa formato limpio SIN emojis en cada línea:
  * 1. Corte Caballero - $35,000 (45 min)
  * 2. Barba mas corte - $35,000 (45 min)
- Cuando muestres categorías, formato limpio:
  * 1. Barberia
  * 2. Cortes
  * 3. Keratina

⚠️ IMPORTANTE - IDENTIFICACIÓN DE CLIENTE:
- Si el usuario proporciona su nombre completo (ej: "Fredy castellanos", "Juan Pérez"), esto es para identificarlo en el sistema.
- Si ya tienes todos los datos de la cita (servicio, estilista, fecha, hora) y el usuario proporciona su nombre, intenta agendar la cita de nuevo.

⚠️ CRÍTICO: USA LOS DATOS DEL CONTEXTO ARRIBA. Si dice "📅 Fecha: 2026-01-22", esa fecha YA ESTÁ GUARDADA.

TIENES 7 FUNCIONES:
1. buscar_servicio → Buscar servicios (SIEMPRE PRIMERO)
2. verificar_disponibilidad → Ver horarios (requiere servicio + estilista + fecha)
3. agendar_cita → Confirmar cita
4. ver_mis_agendas → Listar citas próximas del cliente (ver/cancelar/modificar)
5. cancelar_cita → Cancelar una cita por id (el cliente debe ser el dueño)
6. modificar_cita → Cambiar fecha u hora de una cita por id
7. consultar_info_salon → Horario, dirección, teléfono e info del salón

INFORMACIÓN DEL SALÓN:
- Si el cliente pregunta por horario, dirección, teléfono, ubicación o información del salón, usa consultar_info_salon.

═══════════════════════════════════════════════════════════════
🎯 FLUJO OBLIGATORIO (SIGUE EN ORDEN):
═══════════════════════════════════════════════════════════════

PASO 1: BUSCAR SERVICIO - ⚠️ OBLIGATORIO
- Usuario dice: "quiero un servicio" / "necesito un servicio" / "corte" / "manicure" → LLAMAR buscar_servicio INMEDIATAMENTE
- Si el usuario dice "quiero una cita", "quiero agendar", "necesito un turno" SIN especificar servicio → usa "servicio" como palabra clave: [buscar_servicio: service="servicio"]. NUNCA uses "cita", "turno" o "reserva" como nombre de servicio.
- NO respondas sin llamar la función. SIEMPRE llama buscar_servicio.

CATEGORÍAS DE SERVICIOS:
- Si buscar_servicio devuelve "show_categories: true" con una lista de categorías:
  → Presenta PRIMERO las categorías como opciones. Ejemplo:
    "${senderName}, tenemos estas opciones. Cual te interesa?
    1. Cabello
    2. Uñas
    3. Tratamientos faciales"
  → NO listes todos los servicios individuales. Muestra SOLO las categorías.
  → Cuando el cliente elija una categoría, muestra los servicios de ESA categoría con precios.
  → Después de mostrar servicios de una categoría, menciona otras: "Tambien tenemos [otra categoría] por si te animas."

OCASIONES ESPECIALES (detalle, regalo, cumpleaños, aniversario, sorpresa):
- Si el usuario menciona "detalle", "regalo", "sorpresa", "cumpleaños" o similar:
  → Llama buscar_servicio con service="servicio" para obtener todo.
  → Presenta con calidez: "Que buen detalle, ${senderName}. Mira lo que tenemos para esa ocasion:"

- Si hay múltiples servicios → mostrar opciones y pedir confirmación
- Si hay un solo servicio → guardar service_id y mostrar estilistas
- ⚠️ CRÍTICO: Si el resultado tiene "stylists" con una lista, SOLO muestra esos estilistas. NO inventes estilistas.

CASO ESPECIAL - Usuario dice TODO de una vez (servicio + estilista + fecha + hora):
- Llama buscar_servicio solo para obtener el service_id (sin mostrar resultado al usuario)
- Luego llama verificar_disponibilidad INMEDIATAMENTE con todos los datos
- Responde DIRECTAMENTE: "Carlos esta disponible mañana a las 9:30 AM. Te confirmo?"
- NO digas: "Estos estilistas ofrecen..." si el usuario ya especificó un estilista

PASO 2: ELEGIR ESTILISTA / FECHA
- Si el usuario menciona una FECHA después de elegir servicio → Guardar fecha y MOSTRAR ESTILISTAS INMEDIATAMENTE
  → NO digas "He guardado la fecha" ni "Un momento"
  → Muestra directamente: "Estos profesionales te pueden atender: 1. [nombre], 2. [nombre]..."
- Si el usuario elige estilista por nombre:
  - SI HAY FECHA EN CONTEXTO → verificar_disponibilidad INMEDIATAMENTE sin preguntar
  - SI NO HAY FECHA → preguntar: "Para que fecha quieres tu cita con [nombre]?"

PASO 2.5: USUARIO MENCIONA HORA O FRANJA
- ⚠️ AMBIGÜEDAD "MAÑANA": En español "mañana" puede significar "tomorrow" O "morning".
  Si YA hay fecha en el contexto y el usuario responde "mañana", "tarde" o "noche":
  → Significa la FRANJA HORARIA, NO un cambio de fecha. Mantén la fecha del contexto.
  → "Mañana" = antes de 12:00 PM. "Tarde" = 12:00-6:00 PM. "Noche" = después de 6:00 PM.
- Si el usuario dice una hora específica y ya hay estilista + fecha en contexto:
  → Llamar verificar_disponibilidad con la hora incluida y la FECHA DEL CONTEXTO
  → Responder DIRECTAMENTE:
    * Si disponible: "[Nombre] esta disponible a las [hora]. Te la confirmo?"
    * Si NO disponible: "[Nombre] no tiene ese horario libre, pero tiene estos: [lista]. Cual te queda mejor?"

PASO 3: VERIFICAR DISPONIBILIDAD
- Usar fecha del contexto si existe
- Llamar con: serviceId + stylistName + date
- RESPUESTA DIRECTA: No digas "Voy a verificar" o "Un momento". Di directamente el resultado:
  * ⚠️ CRÍTICO - Si el salón está cerrado ese día (salonClosed: true): Responde claramente "Ese día no estamos disponibles" y sugiere otro día: "¿Qué tal el [siguiente día hábil]?"
  * Si está disponible: "[Nombre] tiene estos horarios disponibles: [lista]. ¿Cuál te va mejor?"
  * Si NO está disponible: "[Nombre] está ocupado/a a esa hora. Te puedo ofrecer: [lista]. ¿Cuál prefieres?"
  * Si no encuentra estilista: "No encontré a [nombre], pero tenemos a: [lista]. ¿Con quién te gustaría?"
- ⚠️ Usa formato de 12 horas (AM/PM). Si el resultado tiene "slots_12h", úsalo.
- 🆕 Muestra TODOS los horarios en lista numerada.

PASO 3.5: SERVICIOS MULTI-ESTILISTA
- Si buscar_servicio devuelve un servicio con max_concurrent_stylists > 1, ese servicio requiere VARIOS estilistas simultáneos.
- Ejemplo: un masaje a 4 manos necesita 2 estilistas.
- Debes presentar al cliente los estilistas disponibles y decirle cuántos necesita:
  "Este servicio necesita [N] estilistas. Tenemos disponibles: 1. Carlos, 2. Dario, 3. María. ¿Con cuáles prefieres?"
- El cliente puede elegir estilistas o dejar que tú elijas.
- Al agendar, usa stylistIds (array de UUIDs) y stylistNames (array de nombres) en agendar_cita.
- Si el servicio tiene max_concurrent_stylists = 1 (o no tiene el campo), funciona normal con un solo estilista.

PASO 4: CONFIRMAR Y AGENDAR
- Usuario elige hora → confirmar
- Usuario dice "sí" → agendar_cita con la hora correcta
- DESPUÉS DE AGENDAR EXITOSAMENTE → Confirma la cita y luego ofrece un complemento NATURAL Y PERSONALIZADO:
  "Listo ${senderName}, tu cita quedo agendada. Aprovecha que vienes y complementa con un [servicio relacionado], sal con el look completo. Te lo agendo?"
  Usa el nombre del cliente, sé persuasivo pero natural. No suenes robótico.

PASO 5: SALUDO INICIAL
- Cuando el cliente saluda sin pedir nada específico:
  → Si TIENE citas próximas en contexto, menciónale brevemente y pregunta si necesita algo.
  → Si NO tiene citas: Saludo breve y directo: "Hola ${senderName}, bienvenido a ${tenantName}. Te ayudo a agendar o quieres conocer nuestros servicios?"
- Si el cliente saluda Y pide algo → atiende directo SIN mencionar citas existentes.
- NUNCA inventes citas. SOLO menciona si aparecen en "CITAS PRÓXIMAS DEL CLIENTE".

PASO 6: CITAS DEL CLIENTE (ver / cancelar / modificar / REAGENDAR IMPLÍCITO)
- Si pide "ver mis citas" → ver_mis_agendas
- Si pide cancelar → cancelar_cita con el appointmentId
- Si pide modificar → modificar_cita con appointmentId, nueva fecha y hora
- DESPUÉS de cancelar: "Listo, cita cancelada. Quieres que te busque otro dia?"

⚠️ DETECCIÓN DE REAGENDAMIENTO IMPLÍCITO (MUY IMPORTANTE):
Cuando el cliente dice frases como:
  - "no alcanzo a llegar", "no voy a poder ir", "no puedo asistir"
  - "se me presentó algo", "me surgió un inconveniente", "tengo un imprevisto"
  - "me podrían atender antes", "hay algo más temprano", "pueden adelantar mi cita"
  - "voy a llegar tarde", "estoy retrasado/a", "llego en X minutos"
  - "puedo ir otro día", "será que hay para mañana", "mejor otro horario"
  - "tengo que cancelar", "no creo que llegue", "no me va a dar tiempo"
  - Cualquier variación que implique que NO puede cumplir con su cita actual

→ NUNCA pierdas el contexto. El cliente está hablando de su CITA EXISTENTE.
→ Paso 1: Llama ver_mis_agendas para ver sus citas próximas.
→ Paso 2: Identifica la cita más cercana en el tiempo (o la que el cliente mencione).
→ Paso 3: Sé empático y ofrece soluciones:
  - Si quiere reagendar: "No te preocupes ${senderName}, ¿para qué día y hora te queda mejor?"
  - Si quiere antes: "Déjame revisar si hay un horario más temprano..." → verificar_disponibilidad con fecha de hoy
  - Si va tarde: "Tranquilo/a, ¿a qué hora podrías llegar? Reviso si podemos ajustarte."
→ Paso 4: Cuando el cliente dé nueva fecha/hora → modificar_cita con el appointmentId
→ NUNCA respondas solo "entendido" sin ofrecer ayuda concreta.
→ NUNCA dejes la conversación sin resolver: SIEMPRE guía a reagendar o cancelar.
→ Si el cliente no especifica nueva fecha → SUGIERE opciones disponibles para los próximos días.

REGLA ESPECIAL - SALÓN NO CONFIGURADO:
- Si buscar_servicio devuelve "not_configured: true", responde EXACTAMENTE con el mensaje devuelto. NO intentes buscar más.

REGLA DE ORO:
- Si el usuario pide un servicio → LLAMA buscar_servicio INMEDIATAMENTE
- Si el resultado tiene show_categories → muestra CATEGORÍAS primero, NO todos los servicios individuales
- ⚠️ Si el usuario menciona TODO de una vez → buscar_servicio PERO ve directo a verificar_disponibilidad
- Si tienes servicio + estilista + fecha en contexto → LLAMA verificar_disponibilidad AUTOMÁTICAMENTE
- SIEMPRE di el resultado directamente, NO digas "Voy a verificar" ni "Un momento"
- ⚠️ NO muestres listas de estilistas si el usuario ya especificó qué estilista quiere
- SIEMPRE intenta cerrar la venta: guía al cliente a agendar, sugiere complementos, genera urgencia amable
- ⚠️ CONTEXTO DE CITAS: Si el cliente tiene citas próximas y dice algo que sugiere problema con su cita (no puede ir, llega tarde, quiere cambiar, surgió algo) → SIEMPRE relaciona con su cita existente y ofrece reagendar. NUNCA pierdas este contexto.
- 🔄 RETENCIÓN: Tu objetivo es NO perder al cliente. Si quiere cancelar → ofrece reagendar primero. Si no puede hoy → busca otro día. SIEMPRE intenta mantener la cita.

═══════════════════════════════════════════════════════════════
⛔ LÍMITE DE ALCANCE - NO RESPONDAS FUERA DE TEMA
═══════════════════════════════════════════════════════════════
- SOLO puedes hablar de temas relacionados con el salón: servicios, citas, estilistas, horarios, ubicación, precios.
- Si el usuario pregunta algo que NO tiene relación con el salón (política, deportes, recetas, tareas, matemáticas, chistes, consejos personales, noticias, clima, etc.):
  → Responde brevemente: "${senderName}, solo puedo ayudarte con temas del salón. ¿Te busco un servicio o agendamos una cita?"
  → NUNCA respondas la pregunta fuera de tema, ni siquiera parcialmente.
  → NUNCA digas "no sé" y luego intentes responder.
- Excepciones permitidas: consejos básicos de cuidado de cabello/uñas/piel SI están relacionados con los servicios del salón.`
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
                description: "Agenda la cita cuando el usuario confirma. Para servicios multi-estilista, usa stylistIds (array) con todos los estilistas necesarios.",
                parameters: {
                    type: "object",
                    properties: {
                        serviceId: { type: "string", description: "UUID del servicio" },
                        stylistId: { type: "string", description: "UUID del estilista (para servicio con 1 estilista)" },
                        stylistName: { type: "string", description: "Nombre del estilista" },
                        stylistIds: { type: "array", items: { type: "string" }, description: "Array de UUIDs de estilistas (para servicios multi-estilista)" },
                        stylistNames: { type: "array", items: { type: "string" }, description: "Array de nombres de estilistas (para servicios multi-estilista)" },
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
        },
        {
            type: "function",
            function: {
                name: "consultar_info_salon",
                description: "Consulta información del salón: horario de atención, dirección, teléfono, email, etc.",
                parameters: { type: "object", properties: {}, required: [] }
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

            if (functionResult.found && functionResult.multiple) {
                if (functionResult.show_categories && functionResult.categories) {
                    console.log(`   📂 Categorías encontradas: ${functionResult.categories.map(c => c.name).join(', ')}`);
                    functionResult.hint = 'MUESTRA LAS CATEGORÍAS como lista numerada limpia SIN emojis. Pregunta al cliente cuál le interesa. Usa su nombre.';
                } else if (functionResult.options) {
                    console.log(`   📋 Servicios encontrados (múltiples): ${functionResult.options.map(o => o.name).join(', ')}`);
                    functionResult.hint = 'Muestra las opciones en lista numerada con precios. Usa el nombre del cliente. Sin emojis en cada linea.';
                }
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

            // Soporte multi-estilista
            const multiStylistIds = functionArgs.stylistIds || [];
            const multiStylistNames = functionArgs.stylistNames || [];
            const isMultiStylist = multiStylistIds.length > 1 || multiStylistNames.length > 1;

            const bookParams = {
                serviceId: (_uuid.test(functionArgs.serviceId) ? functionArgs.serviceId : null) || bookingContext.service_id,
                stylistId: (_uuid.test(functionArgs.stylistId) ? functionArgs.stylistId : null) || bookingContext.stylist_id,
                stylistName: functionArgs.stylistName || bookingContext.stylist,
                date: functionArgs.date || bookingContext.date,
                time: functionArgs.time || bookingContext.time
            };

            console.log(`\n📝 [AGENDAR CITA] Preparando reserva ${isMultiStylist ? '(MULTI-ESTILISTA)' : ''}`);
            console.log(`   ClientId: ${clientId}`);
            console.log(`   Params finales:`, JSON.stringify(bookParams, null, 2));
            if (isMultiStylist) console.log(`   Multi-stylist IDs: ${multiStylistIds.join(', ')}, Names: ${multiStylistNames.join(', ')}`);

            if (!clientId) {
                console.log(`   ❌ Error: clientId es null o undefined`);
                functionResult = {
                    booked: false,
                    error: 'No se pudo identificar tu número de teléfono. Por favor, asegúrate de que tu número esté registrado en nuestro sistema o contacta directamente con el salón.'
                };
            } else {
                // 🔧 Validar datos del cliente antes de agendar
                const missingData = [];
                if (!hasNameInDB) missingData.push('nombre');
                if (!hasValidEmail) missingData.push('email');

                if (missingData.length > 0) {
                    console.log(`   ⏸️ Datos incompletos del cliente: faltan [${missingData.join(', ')}]. Pausando agendamiento.`);
                    const firstStep = missingData[0] === 'nombre' ? 'name' : 'email';
                    pendingClientDataCache.set(cacheKey, {
                        step: firstStep,
                        bookingParams: isMultiStylist ? { ...bookParams, stylistIds: multiStylistIds, stylistNames: multiStylistNames, isMultiStylist: true } : bookParams,
                        collected: {},
                        createdAt: Date.now()
                    });
                    functionResult = {
                        booked: false,
                        needs_client_data: true,
                        missing: missingData,
                        message: missingData.includes('nombre')
                            ? 'Antes de confirmar tu cita necesito unos datos. ¿Cuál es tu nombre completo (nombre y apellido)?'
                            : 'Antes de confirmar tu cita necesito tu correo electrónico para enviarte la confirmación.'
                    };
                } else if (isMultiStylist) {
                    // Multi-stylist booking: crear múltiples citas con mismo batch_id
                    const { v4: uuidv4 } = require('uuid');
                    const batchId = uuidv4();
                    const results = [];
                    let allBooked = true;

                    for (let i = 0; i < Math.max(multiStylistIds.length, multiStylistNames.length); i++) {
                        const singleParams = {
                            ...bookParams,
                            stylistId: multiStylistIds[i] || null,
                            stylistName: multiStylistNames[i] || null,
                            batchId
                        };
                        const result = await callBookAppointment(tenantId, clientId, singleParams);
                        results.push(result);
                        if (!result.booked) allBooked = false;
                    }

                    if (allBooked) {
                        const stylistNamesList = results.map(r => r.appointment?.stylist).filter(Boolean).join(' y ');
                        functionResult = {
                            booked: true,
                            multi_stylist: true,
                            appointments: results.map(r => r.appointment),
                            message: `¡Listo! Tu cita quedó agendada con ${stylistNamesList} para el ${results[0].appointment?.date} a las ${results[0].appointment?.time_12h || results[0].appointment?.time}.`
                        };
                    } else {
                        functionResult = {
                            booked: false,
                            error: 'No se pudieron agendar todos los estilistas. ' + results.filter(r => !r.booked).map(r => r.error || r.message).join('. ')
                        };
                    }
                } else {
                    functionResult = await callBookAppointment(tenantId, clientId, bookParams);
                }
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
        else if (functionName === 'consultar_info_salon') {
            const tenant = await prisma.tenants.findUnique({
                where: { id: tenantId },
                select: { name: true, address: true, city: true, phone: true, email: true, website: true, working_hours: true },
            });
            if (!tenant) {
                functionResult = { error: 'No se encontró información del salón.' };
            } else {
                const hours = typeof tenant.working_hours === 'string'
                    ? JSON.parse(tenant.working_hours || '{}')
                    : (tenant.working_hours || {});
                const DAY_NAMES = { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' };
                const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const horario = DAY_ORDER
                    .filter(day => hours[day])
                    .map(day => {
                        const v = hours[day];
                        const dayName = DAY_NAMES[day] || day;
                        // Format: string "08:00-18:00" or "cerrado"
                        if (typeof v === 'string') {
                            if (/cerrado|closed|off/i.test(v)) return `${dayName}: Cerrado`;
                            return `${dayName}: ${v.replace('-', ' - ')}`;
                        }
                        // Format: object { active, open, close }
                        if (typeof v === 'object' && v.active) {
                            return `${dayName}: ${v.open || '?'} - ${v.close || '?'}`;
                        }
                        if (typeof v === 'object' && !v.active) return null;
                        return `${dayName}: ${String(v)}`;
                    })
                    .filter(Boolean)
                    .join('\n');
                functionResult = {
                    nombre: tenant.name,
                    direccion: tenant.address || 'No configurada',
                    ciudad: tenant.city || 'No configurada',
                    telefono: tenant.phone || 'No configurado',
                    email: tenant.email || 'No configurado',
                    sitio_web: tenant.website || 'No configurado',
                    horario: horario || 'No configurado',
                };
            }
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

// ═════════════════════════════════════════════════════════════════════
// ══════════   IA del estilista (auth automático por phone)   ═════════
// ═════════════════════════════════════════════════════════════════════
async function processWithStylistAI(stylistSession, userMessage, isVoiceMessage = false) {
    const apiKey = await getGlobalOpenAIKey();
    if (!apiKey) throw new Error('No hay API key de OpenAI configurada.');

    const now = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd hh:mm a');
    let systemPrompt = `${STYLIST_SYSTEM_PROMPT}\n\nFecha/hora actual: ${now}\nEstilista: ${stylistSession.name}`;

    if (isVoiceMessage) {
        systemPrompt += `\n\n⚠️ RESPUESTA POR VOZ: tu respuesta será convertida a audio (TTS).\n` +
            `- Formatea números de forma HABLADA: "trescientos mil pesos", no "$300.000"\n` +
            `- Sé conversacional y natural, sin emojis ni asteriscos.`;
    }

    const history = stylistSession.conversationHistory || [];
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: userMessage }
    ];

    console.log(`\n🤖 [STYLIST WA] Request para ${stylistSession.name}: "${userMessage.slice(0, 60)}"`);

    const firstResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            tools: STYLIST_TOOLS,
            tool_choice: 'auto',
            temperature: 0.5,
            max_tokens: 500
        })
    });

    if (!firstResponse.ok) {
        const errBody = await firstResponse.text();
        console.error('[STYLIST WA] OpenAI error:', errBody);
        throw new Error('Error al comunicarse con OpenAI.');
    }

    const firstData = await firstResponse.json();
    const assistantMessage = firstData.choices[0].message;

    if (firstData.usage) {
        trackUsage(stylistSession.stylistTenantId, 'stylist_chat_whatsapp', firstData.model || 'gpt-4o-mini',
            firstData.usage.prompt_tokens, firstData.usage.completion_tokens).catch(() => {});
    }

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        const reply = assistantMessage.content || 'No tengo respuesta en este momento.';
        history.push({ role: 'user', content: userMessage });
        history.push({ role: 'assistant', content: reply });
        stylistSession.conversationHistory = history.slice(-20);
        return reply;
    }

    const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments || '{}');
            let result;
            try {
                console.log(`   🔧 [STYLIST WA] Ejecutando: ${fnName}(${JSON.stringify(fnArgs)})`);
                result = await executeStylistFunction(fnName, fnArgs, stylistSession.stylistId, stylistSession.stylistTenantId, stylistSession);
            } catch (err) {
                console.error(`   ❌ [STYLIST WA] Error en ${fnName}:`, err.message);
                result = { error: `Error ejecutando ${fnName}: ${err.message}` };
            }
            return { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) };
        })
    );

    const followUpMessages = [...messages, assistantMessage, ...toolResults];
    const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: followUpMessages,
            temperature: 0.5,
            max_tokens: 500
        })
    });

    if (!secondResponse.ok) {
        const errBody = await secondResponse.text();
        console.error('[STYLIST WA] OpenAI follow-up error:', errBody);
        throw new Error('Error al procesar la respuesta de las funciones.');
    }

    const secondData = await secondResponse.json();
    if (secondData.usage) {
        trackUsage(stylistSession.stylistTenantId, 'stylist_chat_whatsapp', secondData.model || 'gpt-4o-mini',
            secondData.usage.prompt_tokens, secondData.usage.completion_tokens).catch(() => {});
    }

    const finalContent = secondData.choices[0].message.content || 'No pude generar una respuesta.';
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: finalContent });
    stylistSession.conversationHistory = history.slice(-20);

    const executedFns = assistantMessage.tool_calls.map(tc => tc.function.name).join(', ');
    console.log(`   ✅ [STYLIST WA] Funciones ejecutadas: ${executedFns}`);
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

// Wrapper multi-estilista para callBookAppointment (pendingData recovery)
async function callBookAppointmentMulti(tenantId, clientId, params) {
    if (params.isMultiStylist && params.stylistIds && params.stylistIds.length > 1) {
        const { v4: uuidv4 } = require('uuid');
        const batchId = uuidv4();
        const results = [];
        for (let i = 0; i < Math.max(params.stylistIds.length, (params.stylistNames || []).length); i++) {
            const singleParams = {
                serviceId: params.serviceId,
                date: params.date,
                time: params.time,
                stylistId: params.stylistIds[i] || null,
                stylistName: (params.stylistNames || [])[i] || null,
                batchId
            };
            const result = await callBookAppointment(tenantId, clientId, singleParams);
            results.push(result);
        }
        const allBooked = results.every(r => r.booked);
        if (allBooked) {
            const names = results.map(r => r.appointment?.stylist).filter(Boolean).join(' y ');
            return { booked: true, multi_stylist: true, appointments: results.map(r => r.appointment), message: `¡Cita agendada con ${names}!` };
        }
        return { booked: false, error: results.filter(r => !r.booked).map(r => r.error).join('. ') };
    }
    return callBookAppointment(tenantId, clientId, params);
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

exports.sendStatus = async (req, res) => {
    const { tenantId, type, content, caption, backgroundColor } = req.body;
    if (!tenantId || !content) {
        return res.status(400).json({ error: 'Faltan tenantId y content' });
    }

    try {
        const result = await wahaService.sendStatus(tenantId, {
            type: type || 'image',
            content,
            caption: caption || '',
            backgroundColor: backgroundColor || '#000000',
            allContacts: true
        });
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('❌ Error publicando estado:', error.message);
        return res.status(500).json({ error: 'Error al publicar historia', details: error.message });
    }
};