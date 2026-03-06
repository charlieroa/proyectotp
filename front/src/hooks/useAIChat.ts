import { useState, useRef, useCallback, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useDispatch } from 'react-redux';
import { fetchSetupStatus } from '../slices/Settings/settingsSlice';
import { sileo } from 'sileo';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
}

const SETUP_FUNCTIONS = ['crear_servicio', 'crear_estilista', 'configurar_horario_salon', 'actualizar_info_salon'];

// ─── Plan-aware greetings ────────────────────────────────────────
function buildGreeting(plan: string, isSetupComplete: boolean): string {
    const name = getUserName();
    const hi = name ? `Hola ${name}!` : 'Hola jefe!';

    if (!isSetupComplete) {
        return `${hi} Soy el asistente de **tupelukeria.com**, vamos a organizar tu establecimiento para que empieces a recibir citas lo antes posible.

Para empezar necesito algunos datos:

1. **Horario de atencion** — ¿que dias y en que horario atiende tu salon?
2. **Servicios** — dame los nombres y precios (ej: Corte $15.000, Tinte $40.000)
3. **Estilistas** — nombre de cada estilista de tu equipo
4. **Productos** (opcional) — si vendes productos, tambien los podemos cargar

Si te parece mucho texto, puedes **subirme un Excel** con tus datos usando el clip de adjuntos 📎 — acepto cualquier formato y en segundos tienes tu pelukeria lista.

Si prefieres hacerlo de manera manual, ve a [Configuracion](/settings) y completa cada seccion.

Dime, ¿por donde empezamos?`;
    }

    if (plan === 'free') {
        return `${hi} Soy el asistente de **tupelukeria.com**. En tu plan **Gratis** puedo ayudarte con:

- Configurar tu salon (horarios, servicios, estilistas)
- Importar datos desde Excel
- Resolver dudas sobre la plataforma

Para **agendamiento por IA** (crear citas, ver agenda), necesitas el plan **Pro** ($29.900/mes).
Para el **asistente completo** (ventas, rendimiento, productos y mas), necesitas el plan **Business** ($49.900/mes).

¿Quieres saber que incluye cada plan? Preguntame o ve a [Configuracion → Planes](/settings).`;
    }

    if (plan === 'pro') {
        return `${hi} Soy el asistente de **tupelukeria.com**. En tu plan **Pro** puedo ayudarte con:

- Ver y crear citas
- Consultar tu agenda del dia
- Ver servicios y estilistas disponibles

Para el **asistente completo** (ventas, rendimiento, productos, nomina y mas), necesitas el plan **Business** ($49.900/mes).

¿En que te puedo ayudar?`;
    }

    // Business+ plans — no auto-greeting
    return '';
}

// ─── Token helpers ───────────────────────────────────────────────
export const getTenantId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch { return null; }
};

export const getUserId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.id || null;
    } catch { return null; }
};

export const getUserName = (): string => {
    try {
        const raw = sessionStorage.getItem('authUser');
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        const name = parsed?.user?.name || parsed?.user?.first_name || '';
        return name.split(' ')[0];
    } catch { return ''; }
};

export const getUserRole = (): number | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.role_id || null;
    } catch { return null; }
};

/** Admin = role 1 (Admin), 2 (Owner), 5 (Super Admin) */
export const isAdminRole = (): boolean => {
    const role = getUserRole();
    return role !== null && [1, 2, 5].includes(role);
};

/** Admin or Owner only (no super admin) — used for FloatingChat visibility */
export const isAdminOrOwner = (): boolean => {
    const role = getUserRole();
    return role !== null && [1, 2].includes(role);
};

// ─── Excel import helpers ────────────────────────────────────────
export const IMPORT_OPTIONS = [
    { key: 'smart', icon: 'ri-magic-line', label: 'Importacion inteligente', desc: 'Detecta automaticamente el tipo', color: '#667eea' },
    { key: 'clients', icon: 'ri-user-line', label: 'Clientes', desc: 'Nombre, email, telefono', color: '#25a0e2' },
    { key: 'stylists', icon: 'ri-scissors-line', label: 'Estilistas', desc: 'Nombre, email, comision', color: '#e83e8c' },
    { key: 'services', icon: 'ri-price-tag-3-line', label: 'Servicios', desc: 'Nombre, precio, duracion', color: '#0ab39c' },
    { key: 'products', icon: 'ri-shopping-bag-line', label: 'Productos', desc: 'Nombre, precio, stock', color: '#f7b84b' },
];

// ─── Hook ────────────────────────────────────────────────────────
interface UseAIChatOptions {
    /** Override admin check (e.g. FloatingChat uses isAdminOrOwner) */
    adminCheck?: boolean;
    /** Whether setup is complete (from Redux) */
    isSetupComplete?: boolean;
    /** Current tenant plan (from Redux) */
    plan?: string;
    /** Whether settings have been loaded from API */
    settingsLoaded?: boolean;
}

export const useAIChat = (options?: UseAIChatOptions) => {
    const dispatch: any = useDispatch();
    const isAdmin = options?.adminCheck ?? isAdminRole();
    const isSetupComplete = options?.isSetupComplete ?? true;
    const plan = options?.plan || 'free';
    const settingsLoaded = options?.settingsLoaded ?? true;
    const shouldShowOnboarding = isAdmin && settingsLoaded && (!isSetupComplete || plan === 'free');
    const isProPlan = isAdmin && settingsLoaded && plan === 'pro' && isSetupComplete;
    const shouldShowGreeting = shouldShowOnboarding || isProPlan;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const historyRef = useRef<{ role: string; content: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const greetingInjectedRef = useRef(false);

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importType, setImportType] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-greeting for onboarding / free / pro plan
    useEffect(() => {
        if (shouldShowGreeting && !greetingInjectedRef.current && messages.length === 0) {
            const greeting = buildGreeting(plan, isSetupComplete);
            if (greeting) {
                greetingInjectedRef.current = true;
                setMessages([{
                    id: Date.now(),
                    role: 'assistant',
                    content: greeting,
                }]);
            }
        }
    }, [shouldShowGreeting, messages.length, plan, isSetupComplete]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const typeResponse = useCallback((fullResponse: string) => {
        const newId = Date.now();
        setMessages(prev => [...prev, { id: newId, role: 'assistant', content: '', isTyping: true }]);

        let idx = 0;
        const CHUNK = 4;
        const interval = setInterval(() => {
            idx = Math.min(idx + CHUNK, fullResponse.length);
            setMessages(prev => prev.map(m => m.id === newId ? { ...m, content: fullResponse.slice(0, idx) } : m));
            if (idx >= fullResponse.length) {
                clearInterval(interval);
                setIsTyping(false);
                setMessages(prev => prev.map(m => m.id === newId ? { ...m, isTyping: false } : m));
                historyRef.current = [...historyRef.current.slice(-8), { role: 'assistant', content: fullResponse }];
            }
        }, 14);
    }, []);

    const sendMessage = useCallback(async (text: string) => {
        const msg = text.trim();
        if (!msg || isTyping) return;

        const tenantId = getTenantId();
        if (!tenantId) {
            setError('No se encontro el tenant. Inicia sesion de nuevo.');
            return;
        }

        const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        historyRef.current = [...historyRef.current.slice(-8), { role: 'user', content: msg }];
        setInput('');
        setIsTyping(true);
        setError(null);

        const endpoint = isAdmin ? `${API_BASE_URL}/ai-admin-chat` : `${API_BASE_URL}/ai-chat`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    message: msg,
                    tenantId,
                    clientId: getUserId(),
                    conversationHistory: historyRef.current.slice(-8)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al comunicarse con el asistente');
            }

            const data = await response.json();
            typeResponse(data.response);

            if (data.functionExecuted && SETUP_FUNCTIONS.some(fn => data.functionExecuted.includes(fn))) {
                dispatch(fetchSetupStatus());
            }
        } catch (err: any) {
            setIsTyping(false);
            if (err.message?.includes('API Key')) {
                setError('Falta configurar la API Key de OpenAI. Ve a Configuracion > Configura tu bot.');
            } else {
                typeResponse(`Lo siento, ocurrio un error: ${err.message}`);
            }
        }
    }, [isTyping, isAdmin, dispatch, typeResponse]);

    const resetChat = useCallback(() => {
        setMessages([]);
        historyRef.current = [];
        greetingInjectedRef.current = false;
        setInput('');
        setError(null);
    }, []);

    // Excel import
    const handleImportSelect = useCallback((type: string) => {
        setImportType(type);
        setShowImportModal(false);
        setTimeout(() => fileInputRef.current?.click(), 100);
    }, []);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !importType) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = importType === 'smart'
            ? `${API_BASE_URL}/bulk-import/smart`
            : `${API_BASE_URL}/bulk-import/${importType}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al importar');

            sileo.success({ title: data.message });

            // Build enriched message for smart import
            let msgContent = data.message;
            if (importType === 'smart' && data.detectedType) {
                msgContent = `**Importacion inteligente completada**\n\n`
                    + `Tipo detectado: **${data.typeLabel}** (${data.confidence}% confianza)\n`
                    + `Resultado: ${data.created} creados, ${data.skipped} omitidos`;
                if (data.reasoning) msgContent += `\n\n_${data.reasoning}_`;
            }
            if (data.errors?.length) {
                msgContent += `\n\nErrores: ${data.errors.slice(0, 3).join(', ')}`;
            }

            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'assistant',
                content: msgContent,
            }]);

            if (['stylists', 'services'].includes(importType) || data.detectedType === 'stylists' || data.detectedType === 'services') {
                dispatch(fetchSetupStatus());
            }
        } catch (err: any) {
            sileo.error({ title: err.message });
        } finally {
            setIsUploading(false);
            setImportType(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [importType, dispatch]);

    return {
        messages, input, setInput, isTyping, error, isAdmin,
        messagesEndRef, fileInputRef,
        sendMessage, resetChat, scrollToBottom,
        shouldShowOnboarding,
        isProPlan,
        // Import
        showImportModal, setShowImportModal, isUploading,
        handleImportSelect, handleFileUpload,
    };
};
