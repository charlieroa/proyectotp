import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from 'reactstrap';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
}

const getTenantId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch { return null; }
};

const getUserId = (): string | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.id || null;
    } catch { return null; }
};

const getUserName = (): string => {
    try {
        const raw = sessionStorage.getItem('authUser');
        if (!raw) return '';
        const parsed = JSON.parse(raw);
        const name = parsed?.user?.name || parsed?.user?.first_name || '';
        return name.split(' ')[0];
    } catch { return ''; }
};

const getUserRole = (): number | null => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const decoded: any = jwtDecode(token);
        return decoded?.user?.role_id || null;
    } catch { return null; }
};

const isAdminRole = (): boolean => {
    const role = getUserRole();
    return role !== null && [1, 2, 5].includes(role);
};

const adminSuggestions = [
    { icon: 'ri-calendar-check-line', text: 'Cuantas citas hay hoy?', color: '#25a0e2' },
    { icon: 'ri-map-pin-user-line', text: 'Quien esta en el salon ahora?', color: '#43e97b' },
    { icon: 'ri-bar-chart-box-line', text: 'Dame el resumen de ventas de hoy', color: '#667eea' },
    { icon: 'ri-scissors-line', text: 'Cuales son los servicios mas populares este mes?', color: '#e83e8c' },
    { icon: 'ri-shopping-bag-line', text: 'Cuales son los productos mas vendidos?', color: '#f7b84b' },
    { icon: 'ri-trophy-line', text: 'Cual es el rendimiento de los estilistas este mes?', color: '#f5576c' },
];

const clientSuggestions = [
    { icon: 'ri-bar-chart-box-line', text: 'Analiza mis ventas de esta semana', color: '#667eea' },
    { icon: 'ri-lightbulb-line', text: 'Dame estrategias para aumentar clientes', color: '#f7b84b' },
    { icon: 'ri-calendar-check-line', text: 'Muestra las citas de hoy', color: '#25a0e2' },
    { icon: 'ri-scissors-line', text: 'Cuales son mis servicios mas populares', color: '#e83e8c' },
    { icon: 'ri-user-star-line', text: 'Quienes son mis mejores estilistas', color: '#43e97b' },
    { icon: 'ri-money-dollar-circle-line', text: 'Como puedo mejorar mis precios', color: '#f5576c' },
];

const AIAssistant: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const userName = getUserName();
    const isAdmin = isAdminRole();
    const suggestions = isAdmin ? adminSuggestions : clientSuggestions;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
        }
    }, [input]);

    const typeResponse = (fullResponse: string) => {
        const newId = Date.now();
        setMessages(prev => [...prev, { id: newId, role: 'assistant', content: '', isTyping: true }]);

        let idx = 0;
        const interval = setInterval(() => {
            idx++;
            setMessages(prev => prev.map(m => m.id === newId ? { ...m, content: fullResponse.slice(0, idx) } : m));
            if (idx >= fullResponse.length) {
                clearInterval(interval);
                setIsTyping(false);
                setMessages(prev => prev.map(m => m.id === newId ? { ...m, isTyping: false } : m));
                setConversationHistory(prev => [...prev.slice(-8), { role: 'assistant', content: fullResponse }]);
            }
        }, 10);
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text.trim() };
        setMessages(prev => [...prev, userMsg]);
        setConversationHistory(prev => [...prev.slice(-8), { role: 'user', content: text.trim() }]);
        setInput('');
        setIsTyping(true);

        try {
            const chatEndpoint = isAdmin ? `${API_BASE_URL}/ai-admin-chat` : `${API_BASE_URL}/ai-chat`;
            const response = await fetch(chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    message: text.trim(),
                    tenantId: getTenantId(),
                    clientId: getUserId(),
                    conversationHistory: conversationHistory.slice(-8)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error al comunicarse con el asistente');
            }

            const data = await response.json();
            typeResponse(data.response);
        } catch (err: any) {
            setIsTyping(false);
            typeResponse(`Lo siento, ocurrio un error: ${err.message}`);
        }
    };

    const resetChat = () => {
        setMessages([]);
        setConversationHistory([]);
        setInput('');
    };

    const isEmpty = messages.length === 0;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 70px)',
            background: 'var(--vz-body-bg, #f3f3f9)',
            overflow: 'hidden',
        }}>
            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {isEmpty ? (
                    /* ===== Empty state ===== */
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        maxWidth: 720,
                        margin: '0 auto',
                        width: '100%',
                    }}>
                        <div style={{
                            width: 72,
                            height: 72,
                            borderRadius: 20,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 24,
                            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
                        }}>
                            <i className="ri-sparkling-line" style={{ fontSize: 36, color: '#fff' }}></i>
                        </div>
                        <h2 style={{
                            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                            fontWeight: 700,
                            marginBottom: 8,
                            color: 'var(--vz-heading-color, #495057)',
                        }}>
                            {userName ? `Hola ${userName}, soy tu asistente IA` : 'Hola, soy tu asistente IA'}
                        </h2>
                        <p style={{
                            color: 'var(--vz-secondary-color, #878a99)',
                            fontSize: 15,
                            marginBottom: 32,
                            textAlign: 'center',
                        }}>
                            Preguntame sobre tu negocio, ventas, estrategias, citas o lo que necesites.
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12,
                            width: '100%',
                            maxWidth: 640,
                        }}>
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(s.text)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '14px 16px',
                                        background: 'var(--vz-card-bg, #fff)',
                                        border: '1px solid var(--vz-border-color, #e9ebec)',
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: 13,
                                        color: 'var(--vz-body-color, #495057)',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = s.color;
                                        e.currentTarget.style.boxShadow = `0 2px 8px ${s.color}20`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'var(--vz-border-color, #e9ebec)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <i className={s.icon} style={{ fontSize: 20, color: s.color, flexShrink: 0 }}></i>
                                    <span>{s.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* ===== Chat messages ===== */
                    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    gap: 12,
                                    marginBottom: 24,
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: 2,
                                    }}>
                                        <i className="ri-sparkling-line" style={{ fontSize: 18, color: '#fff' }}></i>
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '12px 18px',
                                    borderRadius: 16,
                                    fontSize: 14,
                                    lineHeight: 1.65,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    ...(msg.role === 'user' ? {
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: '#fff',
                                        borderBottomRightRadius: 4,
                                    } : {
                                        background: 'var(--vz-card-bg, #fff)',
                                        color: 'var(--vz-body-color, #495057)',
                                        borderBottomLeftRadius: 4,
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                        border: '1px solid var(--vz-border-color, #e9ebec)',
                                    }),
                                }}>
                                    {msg.content}
                                    {msg.isTyping && (
                                        <span style={{ fontWeight: 'bold', animation: 'aiCursorBlink 1s infinite' }}>|</span>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'var(--vz-primary, #405189)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: 2,
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 600,
                                    }}>
                                        {userName ? userName[0].toUpperCase() : 'T'}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && messages[messages.length - 1]?.role === 'user' && (
                            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <i className="ri-sparkling-line" style={{ fontSize: 18, color: '#fff' }}></i>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '14px 20px',
                                    background: 'var(--vz-card-bg, #fff)',
                                    border: '1px solid var(--vz-border-color, #e9ebec)',
                                    borderRadius: 16,
                                    borderBottomLeftRadius: 4,
                                }}>
                                    <span className="ai-dot" style={{ animationDelay: '0ms' }} />
                                    <span className="ai-dot" style={{ animationDelay: '150ms' }} />
                                    <span className="ai-dot" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input area */}
            <div style={{
                padding: '12px 16px 20px',
                maxWidth: 720,
                margin: '0 auto',
                width: '100%',
            }}>
                {messages.length > 0 && !isTyping && (
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <button
                            onClick={resetChat}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--vz-secondary-color, #878a99)',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontFamily: 'inherit',
                            }}
                        >
                            <i className="ri-refresh-line"></i> Nueva conversacion
                        </button>
                    </div>
                )}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    background: 'var(--vz-card-bg, #fff)',
                    border: '1px solid var(--vz-border-color, #d1d5db)',
                    borderRadius: 24,
                    padding: '10px 14px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    transition: 'border-color 0.2s',
                }}>
                    <textarea
                        ref={textareaRef}
                        style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: 14,
                            resize: 'none',
                            outline: 'none',
                            minHeight: 24,
                            maxHeight: 150,
                            fontFamily: 'inherit',
                            color: 'var(--vz-body-color, #374151)',
                            lineHeight: 1.5,
                        }}
                        placeholder="Preguntale algo a tu asistente..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(input);
                            }
                        }}
                        disabled={isTyping}
                        rows={1}
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isTyping}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: 'none',
                            background: input.trim() && !isTyping
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'var(--vz-light, #e5e7eb)',
                            color: '#fff',
                            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                        }}
                    >
                        {isTyping ? (
                            <Spinner size="sm" color="light" />
                        ) : (
                            <i className="ri-send-plane-fill" style={{ fontSize: 18 }}></i>
                        )}
                    </button>
                </div>
                <p style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: 'var(--vz-secondary-color, #878a99)',
                    marginTop: 8,
                    marginBottom: 0,
                }}>
                    Asistente IA de TuPelukeria — puede cometer errores. Verifica la informacion importante.
                </p>
            </div>

            <style>{`
                @keyframes aiCursorBlink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                .ai-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--vz-secondary-color, #878a99);
                    animation: aiDotBounce 1.4s infinite ease-in-out;
                }
                @keyframes aiDotBounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-6px); }
                }
            `}</style>
        </div>
    );
};

export default AIAssistant;
