const axios = require('axios');
const QRCode = require('qrcode'); // Para generar la imagen limpia
const Jimp = require('jimp');     // Para procesar la captura de pantalla
const jsQR = require('jsqr');     // Para leer el QR dentro de la captura

// --- CONFIGURACIÓN ---
const WAHA_URL = process.env.WAHA_URL || 'http://212.28.189.253:3002';
const WAHA_API_KEY = process.env.WAHA_API_KEY || '123';

// URL DEL WEBHOOK - Todo va a tu backend (ya no se usa n8n)
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || "https://api.tupelukeria.com/api/whatsapp/webhook";

const apiClient = axios.create({
    baseURL: WAHA_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY
    }
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 1. INICIA SESIÓN
 * Configura webhook hacia tu backend para TODO (estado + mensajes)
 */
const startSession = async (sessionName) => {
    const sessionConfig = {
        name: sessionName,
        config: {
            // Webhook único hacia tu backend
            webhooks: [
                {
                    url: BACKEND_WEBHOOK_URL,
                    events: ["session.status", "message"]  // Ambos eventos
                }
            ]
        }
    };

    try {
        console.log(`🚀 [WAHA] Iniciando/Verificando sesión: ${sessionName}`);
        console.log(`📡 Configurando webhook hacia: ${BACKEND_WEBHOOK_URL}`);

        const response = await apiClient.post('/api/sessions', sessionConfig);
        return response.data;
    } catch (error) {
        // Si ya existe (409/422), intentamos arrancarla
        if (error.response && (error.response.status === 409 || error.response.status === 422)) {
            try {
                await apiClient.post(`/api/sessions/${sessionName}/start`);
                return { name: sessionName, status: 'EXISTING_STARTED' };
            } catch (startError) {
                console.log(`♻️ La sesión existe pero no arranca. Reintentando en breve...`);
                return { status: 'LOADING' };
            }
        }
        throw error;
    }
};

/**
 * 2. OBTENER QR (ESTRATEGIA HÍBRIDA)
 * Convierte Screenshot -> Texto -> Imagen Limpia Base64
 */
const getQrRawData = async (sessionName) => {
    try {
        // A. INTENTO RÁPIDO: ¿WAHA nos da el texto directo?
        try {
            const response = await apiClient.get(`/api/sessions/${sessionName}`);
            if (response.data && response.data.qr) {
                return await QRCode.toDataURL(response.data.qr);
            }
        } catch (e) {
            // Ignoramos errores aquí, pasamos al plan B
        }

        // B. INTENTO ROBUSTO: Descargar Screenshot (WEBJS)
        const screenshot = await apiClient.get(`/api/screenshot?session=${sessionName}`, {
            responseType: 'arraybuffer'
        });

        if (screenshot.data) {
            const image = await Jimp.read(screenshot.data);
            const qrCodeData = jsQR(
                image.bitmap.data,
                image.bitmap.width,
                image.bitmap.height
            );

            if (qrCodeData && qrCodeData.data) {
                console.log("✅ [OCR] ¡QR encontrado en la captura! Regenerando imagen limpia...");
                return await QRCode.toDataURL(qrCodeData.data);
            }
        }

        return null;

    } catch (error) {
        if (error.response && error.response.status === 404) return null;
        if (error.response && error.response.status === 400) return null;
        console.error(`❌ Error procesando QR Híbrido:`, error.message);
        return null;
    }
};

/**
 * 3. OBTENER ESTADO
 */
const getSessionStatus = async (sessionName) => {
    try {
        const response = await apiClient.get(`/api/sessions/${sessionName}`);
        return response.data;
    } catch (error) {
        return null;
    }
};

/**
 * 4. ELIMINAR SESIÓN
 */
const deleteSession = async (sessionName) => {
    try {
        await apiClient.delete(`/api/sessions/${sessionName}`);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * 5. ENVIAR MENSAJE DE TEXTO
 * @param {string} sessionName - ID de la sesión (tenant_id)
 * @param {string} chatId - ID del chat (número@c.us)
 * @param {string} text - Mensaje a enviar
 */
const sendMessage = async (sessionName, chatId, text) => {
    try {
        console.log(`📤 [WAHA] Enviando mensaje a ${chatId}`);

        const response = await apiClient.post(`/api/sendText`, {
            session: sessionName,
            chatId: chatId,
            text: text
        });

        console.log(`✅ [WAHA] Mensaje enviado exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [WAHA] Error enviando mensaje:`, error.message);
        throw error;
    }
};

/**
 * 6. ENVIAR MENSAJE CON BOTONES (Opcional)
 */
const sendButtons = async (sessionName, chatId, text, buttons) => {
    try {
        const response = await apiClient.post(`/api/sendButtons`, {
            session: sessionName,
            chatId: chatId,
            body: text,
            buttons: buttons.map((btn, i) => ({
                id: `btn_${i}`,
                text: btn
            }))
        });
        return response.data;
    } catch (error) {
        // Si no soporta botones, enviar texto normal
        console.log('⚠️ Botones no soportados, enviando texto simple...');
        return sendMessage(sessionName, chatId, text);
    }
};

/**
 * 7. ENVIAR NOTA DE VOZ
 */
const sendVoice = async (sessionName, chatId, audioBase64) => {
    try {
        console.log(`📤 [WAHA] Enviando nota de voz a ${chatId}`);

        const response = await apiClient.post(`/api/sendVoice`, {
            session: sessionName,
            chatId: chatId,
            file: {
                mimetype: 'audio/ogg; codecs=opus',
                data: audioBase64
            }
        });

        console.log(`✅ [WAHA] Nota de voz enviada exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [WAHA] Error enviando nota de voz:`, error.message);
        throw error;
    }
};

/**
 * 8. ENVIAR IMAGEN
 * @param {string} sessionName - ID de la sesión (tenant_id)
 * @param {string} chatId - ID del chat (número@c.us)
 * @param {string} imageUrl - URL pública de la imagen
 * @param {string} caption - Texto debajo de la imagen
 */
const sendImage = async (sessionName, chatId, imageUrl, caption = '') => {
    try {
        console.log(`📤 [WAHA] Enviando imagen a ${chatId}`);

        const response = await apiClient.post('/api/sendImage', {
            session: sessionName,
            chatId: chatId,
            file: { mimetype: 'image/jpeg', url: imageUrl },
            caption: caption
        });

        console.log(`✅ [WAHA] Imagen enviada exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [WAHA] Error enviando imagen:`, error.message);
        throw error;
    }
};

/**
 * 9. DESCARGAR ARCHIVO DE MEDIA (para transcribir audios)
 */
const getMediaBuffer = async (sessionName, messageId) => {
    try {
        const response = await apiClient.get(`/api/${sessionName}/messages/${messageId}/download`, {
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`❌ [WAHA] Error descargando media:`, error.message);
        throw error;
    }
};

module.exports = {
    startSession,
    getQrRawData,
    getSessionStatus,
    deleteSession,
    sendMessage,
    sendButtons,
    sendVoice,
    sendImage,
    getMediaBuffer
};