// src/Components/Common/FloatingChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Offcanvas, OffcanvasHeader, OffcanvasBody, Spinner, Alert } from 'reactstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSelector } from 'react-redux';
import {
    useAIChat,
    ChatMessage,
    getUserName,
    isAdminOrOwner,
    IMPORT_OPTIONS,
} from '../../hooks/useAIChat';
import { selectIsSetupComplete, selectTenantPlan, selectSettingsLoaded } from '../../slices/Settings/settingsSlice';

interface FloatingChatProps {
    isOpen: boolean;
    toggle: () => void;
}

/* ── Lightweight Markdown (no Prism) ─────────────────────────── */
const FcMarkdown: React.FC<{ content: string }> = ({ content }) => (
    <div className="fc-md">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }: any) {
                    const inline = !className && !String(children).includes('\n');
                    if (inline) return <code className="fc-md-inline" {...props}>{children}</code>;
                    return (
                        <pre className="fc-md-pre">
                            <code {...props}>{children}</code>
                        </pre>
                    );
                },
                table({ children }: any) {
                    return <div className="fc-md-table-wrap"><table className="fc-md-table">{children}</table></div>;
                },
                a({ href, children }: any) {
                    return <a href={href} target="_blank" rel="noopener noreferrer" className="fc-md-link">{children}</a>;
                },
                p({ children }: any) { return <p className="fc-md-p">{children}</p>; },
                ul({ children }: any) { return <ul className="fc-md-ul">{children}</ul>; },
                ol({ children }: any) { return <ol className="fc-md-ol">{children}</ol>; },
                li({ children }: any) { return <li className="fc-md-li">{children}</li>; },
                h1({ children }: any) { return <h4 className="fc-md-h">{children}</h4>; },
                h2({ children }: any) { return <h5 className="fc-md-h">{children}</h5>; },
                h3({ children }: any) { return <h6 className="fc-md-h">{children}</h6>; },
                blockquote({ children }: any) { return <blockquote className="fc-md-bq">{children}</blockquote>; },
                hr() { return <hr className="fc-md-hr" />; },
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

/* ── Suggestion data ─────────────────────────────────────────── */
const onboardingSuggestions = [
    { text: 'Configurar horario', icon: 'ri-time-line', query: 'Quiero configurar mi horario de atencion' },
    { text: 'Agregar servicios', icon: 'ri-scissors-line', query: 'Quiero agregar mis servicios con precios' },
    { text: 'Agregar estilistas', icon: 'ri-user-add-line', query: 'Quiero registrar mis estilistas' },
    { text: 'Importar Excel', icon: 'ri-file-excel-line', query: 'Quiero importar datos desde un Excel' },
    { text: 'Ver planes', icon: 'ri-money-dollar-circle-line', query: 'Que incluye cada plan y cuanto cuesta?' },
];

const adminSuggestions = [
    { text: 'Citas de hoy', icon: 'ri-calendar-check-line', query: 'Cuantas citas hay hoy?' },
    { text: 'Ventas de hoy', icon: 'ri-money-dollar-circle-line', query: 'Dame el resumen de ventas de hoy' },
    { text: 'Crear servicio', icon: 'ri-scissors-line', query: 'Quiero crear un nuevo servicio' },
    { text: 'Estilistas', icon: 'ri-user-heart-line', query: 'Quienes son los estilistas?' },
    { text: 'Productos', icon: 'ri-shopping-bag-line', query: 'Que productos tenemos?' },
];

const proSuggestions = [
    { text: 'Citas de hoy', icon: 'ri-calendar-check-line', query: 'Cuantas citas hay hoy?' },
    { text: 'Crear cita', icon: 'ri-calendar-event-line', query: 'Quiero crear una cita' },
    { text: 'Agenda de mañana', icon: 'ri-calendar-2-line', query: 'Como esta la agenda de mañana?' },
    { text: 'Servicios', icon: 'ri-scissors-line', query: 'Cuales son los servicios disponibles?' },
    { text: 'Estilistas', icon: 'ri-user-heart-line', query: 'Quienes son los estilistas?' },
];

const clientSuggestions = [
    { text: 'Ver servicios', icon: 'ri-scissors-line', query: 'Que servicios tienen?' },
    { text: 'Agendar cita', icon: 'ri-calendar-check-line', query: 'Quiero agendar una cita' },
    { text: 'Precios', icon: 'ri-money-dollar-circle-line', query: 'Cuales son los precios de los servicios?' },
    { text: 'Estilistas', icon: 'ri-user-heart-line', query: 'Quienes son los estilistas?' },
];

/* ── Main Component ──────────────────────────────────────────── */
const FloatingChat: React.FC<FloatingChatProps> = ({ isOpen, toggle }) => {
    const adminCheck = isAdminOrOwner();
    const isSetupComplete = useSelector(selectIsSetupComplete);
    const plan = useSelector(selectTenantPlan);
    const settingsLoaded = useSelector(selectSettingsLoaded);
    const {
        messages, input, setInput, isTyping, error, isAdmin,
        messagesEndRef, fileInputRef,
        sendMessage, resetChat, scrollToBottom,
        isUploading, handleImportSelect, handleFileUpload,
        shouldShowOnboarding, isProPlan,
    } = useAIChat({ adminCheck, isSetupComplete, plan, settingsLoaded });

    const userName = getUserName();
    const suggestions = shouldShowOnboarding
        ? onboardingSuggestions
        : isProPlan
            ? proSuggestions
            : (isAdmin ? adminSuggestions : clientSuggestions);
    const [showClipMenu, setShowClipMenu] = useState(false);
    const clipRef = useRef<HTMLDivElement>(null);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    // Close clip menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (clipRef.current && !clipRef.current.contains(e.target as Node)) {
                setShowClipMenu(false);
            }
        };
        if (showClipMenu) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showClipMenu]);

    const handleSuggestion = (query: string) => {
        sendMessage(query);
    };

    const handleSubmit = () => {
        sendMessage(input);
    };

    return (
        <>
            <Offcanvas
                isOpen={isOpen}
                toggle={toggle}
                direction="end"
                className="offcanvas-end border-0"
                style={{ width: '420px' }}
            >
                {/* ── Header ──────────────────────────────── */}
                <OffcanvasHeader
                    className="d-flex align-items-center p-0"
                    toggle={toggle}
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 16px' }}
                >
                    <div className="d-flex align-items-center gap-2 px-3 py-2">
                        <i className="ri-sparkling-line text-white" style={{ fontSize: 20 }}></i>
                        <span className="text-white" style={{ fontWeight: 600, fontSize: 15 }}>
                            Asistente IA
                        </span>
                        {messages.length > 0 && !isTyping && (
                            <button
                                onClick={resetChat}
                                className="fc-header-btn ms-2"
                                title="Nueva conversacion"
                            >
                                <i className="ri-refresh-line"></i>
                            </button>
                        )}
                    </div>
                </OffcanvasHeader>

                <OffcanvasBody className="p-0 d-flex flex-column" style={{ background: 'var(--vz-body-bg, #f9fafb)' }}>
                    {error && (
                        <Alert color="warning" className="m-3 mb-0 py-2 small">{error}</Alert>
                    )}

                    {/* ── Messages area ───────────────────── */}
                    <div className="fc-messages">
                        {/* Empty / welcome state */}
                        {messages.length === 0 && (
                            <div className="fc-welcome">
                                <div className="fc-welcome-icon">
                                    <i className="ri-sparkling-line"></i>
                                </div>
                                <h5 className="fc-welcome-title">
                                    {userName ? `Hola ${userName}` : 'Hola'}, soy tu asistente
                                </h5>
                                <p className="fc-welcome-sub">
                                    {isAdmin
                                        ? 'Gestiona tu salon con IA: citas, ventas, servicios y mas'
                                        : 'Puedo ayudarte a ver servicios, estilistas y agendar citas'}
                                </p>
                            </div>
                        )}

                        {/* Chat messages */}
                        {messages.map((msg: ChatMessage) => (
                            <div
                                key={msg.id}
                                className={`fc-row ${msg.role === 'user' ? 'fc-row--user' : 'fc-row--bot'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="fc-avatar">
                                        <i className="ri-sparkling-line"></i>
                                    </div>
                                )}
                                <div className={`fc-bubble ${msg.role === 'user' ? 'fc-bubble--user' : 'fc-bubble--bot'}`}>
                                    {msg.role === 'assistant' && !msg.isTyping ? (
                                        <FcMarkdown content={msg.content} />
                                    ) : (
                                        <>
                                            {msg.content}
                                            {msg.isTyping && <span className="fc-caret">|</span>}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator (dots) */}
                        {isTyping && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                            <div className="fc-row fc-row--bot">
                                <div className="fc-avatar">
                                    <i className="ri-sparkling-line"></i>
                                </div>
                                <div className="fc-bubble fc-bubble--bot fc-dots-wrap">
                                    <span className="fc-dot" />
                                    <span className="fc-dot" />
                                    <span className="fc-dot" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Suggestion chips (always visible) ── */}
                    <div className="fc-chips-bar">
                        <div className="fc-chips-scroll">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestion(s.query)}
                                    disabled={isTyping}
                                    className="fc-chip"
                                >
                                    <i className={s.icon}></i>
                                    {s.text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Input area ─────────────────────────── */}
                    <div className="fc-input-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <div className="fc-input-box">
                            {/* Clip button (admin only) */}
                            {isAdmin && (
                                <div ref={clipRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowClipMenu(v => !v)}
                                        disabled={isUploading || isTyping}
                                        className="fc-clip-btn"
                                        title="Importar desde Excel"
                                    >
                                        {isUploading
                                            ? <Spinner size="sm" />
                                            : <i className="ri-attachment-2" style={{ fontSize: 18 }}></i>
                                        }
                                    </button>

                                    {/* Inline dropdown */}
                                    {showClipMenu && (
                                        <div className="fc-clip-menu">
                                            <div className="fc-clip-menu-title">Importar Excel</div>
                                            {IMPORT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.key}
                                                    className="fc-clip-option"
                                                    onClick={() => {
                                                        handleImportSelect(opt.key);
                                                        setShowClipMenu(false);
                                                    }}
                                                >
                                                    <i className={opt.icon} style={{ color: opt.color, fontSize: 16 }}></i>
                                                    <div>
                                                        <div className="fc-clip-option-label">{opt.label}</div>
                                                        <div className="fc-clip-option-desc">{opt.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <textarea
                                className="fc-textarea"
                                placeholder="Escribe tu mensaje..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                disabled={isTyping}
                                rows={1}
                            />
                            <button
                                className={`fc-send-btn ${input.trim() && !isTyping ? 'active' : ''}`}
                                onClick={handleSubmit}
                                disabled={!input.trim() || isTyping}
                            >
                                {isTyping ? (
                                    <Spinner size="sm" color="light" />
                                ) : (
                                    <i className="ri-send-plane-fill" style={{ fontSize: 15 }}></i>
                                )}
                            </button>
                        </div>
                    </div>
                </OffcanvasBody>

                <style>{`
                    /* ===== Header ===== */
                    .fc-header-btn {
                        width: 26px; height: 26px;
                        border-radius: 50%;
                        border: 1.5px solid rgba(255,255,255,0.4);
                        background: rgba(255,255,255,0.15);
                        color: #fff;
                        display: flex; align-items: center; justify-content: center;
                        cursor: pointer; font-size: 13px;
                        transition: all 0.2s;
                    }
                    .fc-header-btn:hover {
                        background: rgba(255,255,255,0.3);
                        border-color: rgba(255,255,255,0.7);
                    }

                    /* ===== Messages area ===== */
                    .fc-messages {
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    /* Welcome */
                    .fc-welcome {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        padding: 20px 10px;
                    }
                    .fc-welcome-icon {
                        width: 56px; height: 56px;
                        border-radius: 16px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex; align-items: center; justify-content: center;
                        margin-bottom: 16px;
                        box-shadow: 0 4px 16px rgba(102,126,234,0.3);
                    }
                    .fc-welcome-icon i { font-size: 28px; color: #fff; }
                    .fc-welcome-title {
                        margin: 0 0 6px; font-weight: 600;
                        color: var(--vz-heading-color, #111827);
                    }
                    .fc-welcome-sub {
                        margin: 0; font-size: 13px;
                        color: var(--vz-secondary-color, #6b7280);
                        max-width: 300px; line-height: 1.5;
                    }

                    /* Message rows */
                    .fc-row {
                        display: flex; gap: 10px;
                    }
                    .fc-row--user { justify-content: flex-end; }
                    .fc-row--bot { justify-content: flex-start; }

                    .fc-avatar {
                        width: 28px; height: 28px;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; margin-top: 2px;
                    }
                    .fc-avatar i { font-size: 13px; color: #fff; }

                    .fc-bubble {
                        max-width: 82%;
                        word-break: break-word;
                        font-size: 13px;
                        line-height: 1.6;
                    }
                    .fc-bubble--user {
                        padding: 10px 14px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #fff;
                        border-radius: 14px;
                        border-bottom-right-radius: 4px;
                        white-space: pre-wrap;
                    }
                    .fc-bubble--bot {
                        padding: 6px 0;
                        background: transparent;
                        color: var(--vz-body-color, #111827);
                    }

                    .fc-caret {
                        font-weight: bold;
                        animation: fcBlink 1s infinite;
                    }
                    @keyframes fcBlink {
                        0%,50% { opacity: 1; }
                        51%,100% { opacity: 0; }
                    }

                    /* Typing dots */
                    .fc-dots-wrap {
                        display: flex !important;
                        align-items: center;
                        gap: 5px;
                        padding: 12px 16px !important;
                        background: var(--vz-card-bg, #fff) !important;
                        border: 1px solid var(--vz-border-color, #e9ebec) !important;
                        border-radius: 14px !important;
                    }
                    .fc-dot {
                        width: 6px; height: 6px;
                        border-radius: 50%;
                        background: var(--vz-secondary-color, #999);
                        animation: fcBounce 1.4s ease-in-out infinite;
                    }
                    .fc-dot:nth-child(2) { animation-delay: 0.15s; }
                    .fc-dot:nth-child(3) { animation-delay: 0.3s; }
                    @keyframes fcBounce {
                        0%,80%,100% { transform: translateY(0); }
                        40% { transform: translateY(-4px); }
                    }

                    /* ===== Suggestion chips bar ===== */
                    .fc-chips-bar {
                        border-top: 1px solid var(--vz-border-color, #e5e7eb);
                        padding: 8px 12px;
                        background: var(--vz-body-bg, #f9fafb);
                    }
                    .fc-chips-scroll {
                        display: flex;
                        gap: 6px;
                        overflow-x: auto;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        padding-bottom: 2px;
                    }
                    .fc-chips-scroll::-webkit-scrollbar { display: none; }
                    .fc-chip {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                        padding: 6px 12px;
                        font-size: 11.5px;
                        font-weight: 500;
                        white-space: nowrap;
                        background: var(--vz-card-bg, white);
                        border: 1px solid var(--vz-border-color, #e5e7eb);
                        border-radius: 18px;
                        cursor: pointer;
                        color: var(--vz-body-color, #374151);
                        transition: all 0.2s;
                        font-family: inherit;
                        flex-shrink: 0;
                    }
                    .fc-chip i { font-size: 13px; }
                    .fc-chip:hover:not(:disabled) {
                        border-color: #667eea;
                        color: #667eea;
                        background: rgba(102,126,234,0.04);
                    }
                    .fc-chip:disabled {
                        opacity: 0.5;
                        cursor: default;
                    }

                    /* ===== Input area ===== */
                    .fc-input-area {
                        padding: 8px 12px 12px;
                        background: var(--vz-body-bg, #f9fafb);
                    }
                    .fc-input-box {
                        display: flex;
                        align-items: flex-end;
                        gap: 6px;
                        background: var(--vz-card-bg, white);
                        border: 2px solid var(--vz-border-color, #e5e7eb);
                        border-radius: 16px;
                        padding: 6px 8px;
                        transition: border-color 0.2s;
                    }
                    .fc-input-box:focus-within {
                        border-color: #667eea;
                    }

                    /* Clip / attach button */
                    .fc-clip-btn {
                        width: 32px; height: 32px;
                        border-radius: 50%;
                        border: none;
                        background: transparent;
                        color: var(--vz-secondary-color, #878a99);
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                        transition: all 0.2s;
                    }
                    .fc-clip-btn:hover:not(:disabled) {
                        background: var(--vz-light, #f3f6f9);
                        color: #667eea;
                    }
                    .fc-clip-btn:disabled {
                        opacity: 0.5; cursor: default;
                    }

                    /* Clip dropdown */
                    .fc-clip-menu {
                        position: absolute;
                        bottom: 42px;
                        left: 0;
                        width: 220px;
                        background: var(--vz-card-bg, #fff);
                        border: 1px solid var(--vz-border-color, #e5e7eb);
                        border-radius: 12px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                        z-index: 1070;
                        padding: 8px;
                        animation: fcSlideUp 0.15s ease-out;
                    }
                    @keyframes fcSlideUp {
                        from { opacity: 0; transform: translateY(6px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .fc-clip-menu-title {
                        font-size: 11px;
                        font-weight: 600;
                        color: var(--vz-secondary-color, #878a99);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        padding: 4px 8px 8px;
                    }
                    .fc-clip-option {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        width: 100%;
                        padding: 8px 10px;
                        border: none;
                        background: transparent;
                        border-radius: 8px;
                        cursor: pointer;
                        text-align: left;
                        font-family: inherit;
                        color: var(--vz-body-color, #374151);
                        transition: background 0.15s;
                    }
                    .fc-clip-option:hover {
                        background: var(--vz-light, #f3f6f9);
                    }
                    .fc-clip-option-label {
                        font-size: 13px;
                        font-weight: 600;
                    }
                    .fc-clip-option-desc {
                        font-size: 11px;
                        color: var(--vz-secondary-color, #878a99);
                    }

                    .fc-textarea {
                        flex: 1;
                        border: none;
                        background: transparent;
                        font-size: 13px;
                        resize: none;
                        outline: none;
                        min-height: 22px;
                        max-height: 80px;
                        font-family: inherit;
                        color: var(--vz-body-color, #374151);
                        padding: 5px 0;
                        line-height: 1.4;
                    }
                    .fc-textarea::placeholder {
                        color: var(--vz-secondary-color, #adb5bd);
                    }
                    .fc-send-btn {
                        width: 32px; height: 32px;
                        border-radius: 50%;
                        border: none;
                        background: var(--vz-light, #e5e7eb);
                        color: white;
                        cursor: default;
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                        transition: all 0.2s;
                    }
                    .fc-send-btn.active {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        cursor: pointer;
                    }
                    .fc-send-btn.active:hover {
                        transform: scale(1.05);
                    }

                    /* ===== Markdown inside FloatingChat ===== */
                    .fc-md {
                        font-size: 13px;
                        line-height: 1.6;
                    }
                    .fc-md > :first-child { margin-top: 0; }
                    .fc-md > :last-child { margin-bottom: 0; }
                    .fc-md-p { margin: 0 0 8px; }
                    .fc-md-p:last-child { margin-bottom: 0; }
                    .fc-md-ul, .fc-md-ol {
                        margin: 0 0 8px;
                        padding-left: 20px;
                    }
                    .fc-md-li { margin-bottom: 2px; }
                    .fc-md-h {
                        font-weight: 700;
                        margin: 10px 0 6px;
                        color: var(--vz-heading-color, #495057);
                    }
                    .fc-md-h:first-child { margin-top: 0; }
                    .fc-md-bq {
                        border-left: 3px solid #667eea;
                        padding: 6px 12px;
                        margin: 8px 0;
                        background: rgba(102,126,234,0.04);
                        border-radius: 0 6px 6px 0;
                        color: var(--vz-secondary-color, #6c757d);
                    }
                    .fc-md-hr {
                        border: none;
                        border-top: 1px solid var(--vz-border-color, #e9ebec);
                        margin: 10px 0;
                    }
                    .fc-md-inline {
                        background: var(--vz-light, rgba(0,0,0,0.05));
                        padding: 1px 5px;
                        border-radius: 4px;
                        font-size: 0.9em;
                        font-family: 'Consolas', monospace;
                        color: #e83e8c;
                    }
                    .fc-md-pre {
                        background: #1e1e2e;
                        color: #cdd6f4;
                        padding: 10px 12px;
                        border-radius: 8px;
                        overflow-x: auto;
                        font-size: 12px;
                        margin: 8px 0;
                        line-height: 1.5;
                    }
                    .fc-md-pre code {
                        font-family: 'Consolas', monospace;
                        background: transparent;
                    }
                    .fc-md-link {
                        color: #667eea;
                        text-decoration: none;
                        border-bottom: 1px solid rgba(102,126,234,0.3);
                    }
                    .fc-md-link:hover { border-color: #667eea; }
                    .fc-md-table-wrap {
                        overflow-x: auto;
                        margin: 8px 0;
                        border-radius: 6px;
                        border: 1px solid var(--vz-border-color, #e9ebec);
                    }
                    .fc-md-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                    }
                    .fc-md-table th {
                        background: var(--vz-light, #f3f6f9);
                        padding: 6px 10px;
                        text-align: left;
                        font-weight: 600;
                        border-bottom: 1px solid var(--vz-border-color, #e9ebec);
                        white-space: nowrap;
                    }
                    .fc-md-table td {
                        padding: 6px 10px;
                        border-bottom: 1px solid var(--vz-border-color, #e9ebec);
                    }
                    .fc-md-table tr:last-child td { border-bottom: none; }
                `}</style>
            </Offcanvas>
        </>
    );
};

export default FloatingChat;
