const axios = require('axios');

// --- CONFIGURACIÓN EVOLUTION API v2 ---
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:3002';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL || "https://api.tupelukeria.com/api/whatsapp/webhook";

const apiClient = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
    }
});

/**
 * Normaliza chatId: Evolution usa solo el número (sin @c.us/@s.whatsapp.net)
 */
function stripJidSuffix(chatId) {
    if (!chatId) return chatId;
    return chatId.replace(/@(c\.us|s\.whatsapp\.net)$/, '');
}

/**
 * 1. INICIA SESIÓN (crea instancia en Evolution API)
 */
const startSession = async (sessionName) => {
    try {
        console.log(`🚀 [EVOLUTION] Iniciando instancia: ${sessionName}`);
        console.log(`📡 Configurando webhook hacia: ${BACKEND_WEBHOOK_URL}`);

        const response = await apiClient.post('/instance/create', {
            instanceName: sessionName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
            webhook: {
                url: BACKEND_WEBHOOK_URL,
                byEvents: false,
                base64: true,
                events: [
                    'MESSAGES_UPSERT',
                    'CONNECTION_UPDATE',
                    'QRCODE_UPDATED'
                ]
            }
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 403) {
            // Instance already exists - try to connect it
            try {
                await apiClient.get(`/instance/connect/${sessionName}`);
                return { instanceName: sessionName, status: 'EXISTING_STARTED' };
            } catch (connectError) {
                console.log(`♻️ Instancia existe pero no conecta: ${connectError.message}`);
                return { status: 'LOADING' };
            }
        }
        throw error;
    }
};

/**
 * 2. OBTENER QR
 * Evolution devuelve base64 directo - no necesita jimp/jsqr
 */
const getQrRawData = async (sessionName) => {
    try {
        const response = await apiClient.get(`/instance/connect/${sessionName}`);

        if (response.data) {
            // Evolution devuelve { base64: "data:image/png;base64,..." } o { pairingCode: "..." }
            if (response.data.base64) {
                return response.data.base64;
            }
            // Algunas versiones lo ponen en code
            if (response.data.code) {
                const QRCode = require('qrcode');
                return await QRCode.toDataURL(response.data.code);
            }
        }
        return null;
    } catch (error) {
        if (error.response && (error.response.status === 404 || error.response.status === 400)) return null;
        console.error(`❌ Error obteniendo QR:`, error.message);
        return null;
    }
};

/**
 * 3. OBTENER ESTADO
 * Mapea estados de Evolution → formato compatible con el controller
 */
const getSessionStatus = async (sessionName) => {
    try {
        const response = await apiClient.get(`/instance/connectionState/${sessionName}`);
        const state = response.data?.instance?.state || response.data?.state;

        // Mapear estados Evolution → WAHA-compatible
        const statusMap = {
            'open': 'WORKING',
            'connecting': 'SCAN_QR_CODE',
            'close': 'FAILED',
            'refused': 'FAILED'
        };

        return {
            name: sessionName,
            status: statusMap[state] || state || 'LOADING'
        };
    } catch (error) {
        return null;
    }
};

/**
 * 4. ELIMINAR SESIÓN (logout + delete instance)
 */
const deleteSession = async (sessionName) => {
    try {
        // Primero logout para desconectar WhatsApp
        try {
            await apiClient.delete(`/instance/logout/${sessionName}`);
        } catch (e) { /* puede fallar si ya estaba desconectada */ }

        await apiClient.delete(`/instance/delete/${sessionName}`);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * 5. ENVIAR MENSAJE DE TEXTO
 */
const sendMessage = async (sessionName, chatId, text) => {
    try {
        const number = stripJidSuffix(chatId);
        console.log(`📤 [EVOLUTION] Enviando mensaje a ${number}`);

        const response = await apiClient.post(`/message/sendText/${sessionName}`, {
            number: number,
            text: text
        });

        console.log(`✅ [EVOLUTION] Mensaje enviado exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error enviando mensaje:`, error.message);
        throw error;
    }
};

/**
 * 6. ENVIAR MENSAJE CON BOTONES (fallback a texto en Evolution)
 */
const sendButtons = async (sessionName, chatId, text, buttons) => {
    // Evolution v2 no soporta botones nativos de forma estable, usar texto
    const buttonText = buttons.map((btn, i) => `${i + 1}. ${btn}`).join('\n');
    return sendMessage(sessionName, chatId, `${text}\n\n${buttonText}`);
};

/**
 * 7. ENVIAR NOTA DE VOZ
 */
const sendVoice = async (sessionName, chatId, audioBase64) => {
    try {
        const number = stripJidSuffix(chatId);
        console.log(`📤 [EVOLUTION] Enviando nota de voz a ${number}`);

        const response = await apiClient.post(`/message/sendWhatsAppAudio/${sessionName}`, {
            number: number,
            audio: `data:audio/ogg;base64,${audioBase64}`
        });

        console.log(`✅ [EVOLUTION] Nota de voz enviada exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error enviando nota de voz:`, error.message);
        throw error;
    }
};

/**
 * 8. ENVIAR IMAGEN
 */
const sendImage = async (sessionName, chatId, imageUrl, caption = '') => {
    try {
        const number = stripJidSuffix(chatId);
        console.log(`📤 [EVOLUTION] Enviando imagen a ${number}`);

        const response = await apiClient.post(`/message/sendMedia/${sessionName}`, {
            number: number,
            mediatype: 'image',
            media: imageUrl,
            caption: caption
        });

        console.log(`✅ [EVOLUTION] Imagen enviada exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error enviando imagen:`, error.message);
        throw error;
    }
};

/**
 * 9. OBTENER NÚMERO CONECTADO (para webhook connection.update)
 */
const getInstanceOwnerJid = async (sessionName) => {
    try {
        const response = await apiClient.get(`/instance/fetchInstances`, {
            params: { instanceName: sessionName }
        });
        const instances = Array.isArray(response.data) ? response.data : [response.data];
        const inst = instances.find(i => i.instance?.instanceName === sessionName || i.instanceName === sessionName);
        if (inst) {
            const ownerJid = inst.instance?.owner || inst.owner;
            if (ownerJid) return ownerJid.replace(/@s\.whatsapp\.net$/, '');
        }
        return null;
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error obteniendo owner JID:`, error.message);
        return null;
    }
};

/**
 * 10. DESCARGAR MEDIA (base64 viene inline con webhookBase64=true, este es fallback)
 */
const getMediaBuffer = async (sessionName, messageId) => {
    try {
        const response = await apiClient.post(`/chat/getBase64FromMediaMessage/${sessionName}`, {
            message: { key: { id: messageId } }
        });
        if (response.data?.base64) {
            return Buffer.from(response.data.base64, 'base64');
        }
        throw new Error('No base64 data in response');
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error descargando media:`, error.message);
        throw error;
    }
};

/**
 * 11. PUBLICAR ESTADO/HISTORIA DE WHATSAPP
 * @param {string} sessionName
 * @param {object} opts - { type: 'text'|'image'|'video'|'audio', content, caption?, backgroundColor?, font?, allContacts? }
 */
const sendStatus = async (sessionName, opts) => {
    try {
        console.log(`📤 [EVOLUTION] Publicando estado (${opts.type}) en ${sessionName}`);
        const response = await apiClient.post(`/message/sendStatus/${sessionName}`, {
            type: opts.type || 'text',
            content: opts.content,
            caption: opts.caption || '',
            backgroundColor: opts.backgroundColor || '#000000',
            font: opts.font || 1,
            allContacts: opts.allContacts !== false,
            statusJidList: opts.statusJidList || []
        });
        console.log(`✅ [EVOLUTION] Estado publicado exitosamente`);
        return response.data;
    } catch (error) {
        console.error(`❌ [EVOLUTION] Error publicando estado:`, error.message);
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
    getMediaBuffer,
    getInstanceOwnerJid,
    stripJidSuffix,
    sendStatus
};
