import React, { useState, useEffect, useRef } from 'react';
import { Spinner } from 'reactstrap';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import * as Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';

import {
    useAIChat,
    ChatMessage,
    getUserName,
    IMPORT_OPTIONS,
} from '../../hooks/useAIChat';
import { selectIsSetupComplete, selectTenantPlan, selectSettingsLoaded } from '../../slices/Settings/settingsSlice';

/* ── Suggestions ─────────────────────────────────────────────── */
const onboardingSuggestions = [
    { icon: 'ri-time-line', text: 'Configurar horario', query: 'Quiero configurar mi horario de atencion' },
    { icon: 'ri-scissors-line', text: 'Agregar servicios', query: 'Quiero agregar mis servicios con precios' },
    { icon: 'ri-user-add-line', text: 'Agregar estilistas', query: 'Quiero registrar mis estilistas' },
    { icon: 'ri-file-excel-line', text: 'Importar Excel', query: 'Quiero importar datos desde un Excel' },
    { icon: 'ri-money-dollar-circle-line', text: 'Ver planes', query: 'Que incluye cada plan y cuanto cuesta?' },
    { icon: 'ri-settings-3-line', text: 'Ir a Configuracion', query: 'Quiero ir a configuracion manual' },
];

const proSuggestions = [
    { icon: 'ri-calendar-check-line', text: 'Citas de hoy', query: 'Cuantas citas hay hoy?' },
    { icon: 'ri-calendar-event-line', text: 'Crear cita', query: 'Quiero crear una cita' },
    { icon: 'ri-calendar-2-line', text: 'Agenda de mañana', query: 'Como esta la agenda de mañana?' },
    { icon: 'ri-scissors-line', text: 'Servicios', query: 'Cuales son los servicios disponibles?' },
    { icon: 'ri-user-heart-line', text: 'Estilistas', query: 'Quienes son los estilistas?' },
    { icon: 'ri-time-line', text: 'Horario estilista', query: 'Cual es el horario de los estilistas?' },
];

const adminSuggestions = [
    { icon: 'ri-calendar-check-line', text: 'Citas de hoy', query: 'Cuantas citas hay hoy?' },
    { icon: 'ri-bar-chart-box-line', text: 'Ventas de hoy', query: 'Dame el resumen de ventas de hoy' },
    { icon: 'ri-scissors-line', text: 'Crear servicio', query: 'Quiero crear un nuevo servicio' },
    { icon: 'ri-user-heart-line', text: 'Estilistas', query: 'Quienes son los estilistas?' },
    { icon: 'ri-shopping-bag-line', text: 'Productos', query: 'Que productos tenemos?' },
    { icon: 'ri-trophy-line', text: 'Rendimiento', query: 'Rendimiento de estilistas este mes' },
];

const clientSuggestions = [
    { icon: 'ri-scissors-line', text: 'Ver servicios', query: 'Que servicios tienen?' },
    { icon: 'ri-calendar-check-line', text: 'Agendar cita', query: 'Quiero agendar una cita' },
    { icon: 'ri-money-dollar-circle-line', text: 'Precios', query: 'Cuales son los precios?' },
    { icon: 'ri-user-heart-line', text: 'Estilistas', query: 'Quienes son los estilistas?' },
    { icon: 'ri-time-line', text: 'Horarios', query: 'Horarios disponibles' },
    { icon: 'ri-star-line', text: 'Recomendar', query: 'Que servicio me recomiendan?' },
];

/* ── Code block with Prism ───────────────────────────────────── */
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
    const codeRef = useRef<HTMLElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (codeRef.current) Prism.highlightElement(codeRef.current);
    }, [code, language]);

    return (
        <div className="aia-codeblock">
            <div className="aia-codeblock-head">
                <span>{language || 'code'}</span>
                <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    <i className={copied ? 'ri-check-line' : 'ri-clipboard-line'}></i>
                    {copied ? 'Copiado' : 'Copiar'}
                </button>
            </div>
            <pre><code ref={codeRef} className={`language-${language || 'plaintext'}`}>{code}</code></pre>
        </div>
    );
};

/* ── Markdown renderer ───────────────────────────────────────── */
const Md: React.FC<{ content: string }> = ({ content }) => (
    <div className="aia-md">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match && !String(children).includes('\n');
                    if (inline) return <code className="aia-md-inline" {...props}>{children}</code>;
                    return <CodeBlock language={match ? match[1] : ''} code={String(children).replace(/\n$/, '')} />;
                },
                table({ children }: any) { return <div className="aia-md-tw"><table className="aia-md-tbl">{children}</table></div>; },
                a({ href, children }: any) { return <a href={href} target="_blank" rel="noopener noreferrer" className="aia-md-a">{children}</a>; },
                p({ children }: any) { return <p className="aia-md-p">{children}</p>; },
                ul({ children }: any) { return <ul className="aia-md-ul">{children}</ul>; },
                ol({ children }: any) { return <ol className="aia-md-ol">{children}</ol>; },
                li({ children }: any) { return <li className="aia-md-li">{children}</li>; },
                h1({ children }: any) { return <h3 className="aia-md-h">{children}</h3>; },
                h2({ children }: any) { return <h4 className="aia-md-h">{children}</h4>; },
                h3({ children }: any) { return <h5 className="aia-md-h">{children}</h5>; },
                blockquote({ children }: any) { return <blockquote className="aia-md-bq">{children}</blockquote>; },
                hr() { return <hr className="aia-md-hr" />; },
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

/* ── Message row ─────────────────────────────────────────────── */
const MsgRow: React.FC<{ msg: ChatMessage; userName: string }> = ({ msg, userName }) => {
    const [hovered, setHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`aia-msg ${msg.role === 'user' ? 'aia-msg--user' : 'aia-msg--bot'}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setCopied(false); }}
        >
            {msg.role === 'assistant' && (
                <div className="aia-av">
                    <i className="ri-sparkling-line"></i>
                </div>
            )}
            <div className={`aia-bub ${msg.role === 'user' ? 'aia-bub--user' : 'aia-bub--bot'}`}>
                {msg.role === 'assistant' && !msg.isTyping ? (
                    <Md content={msg.content} />
                ) : (
                    <>{msg.content}{msg.isTyping && <span className="aia-caret">|</span>}</>
                )}
                {msg.role === 'assistant' && !msg.isTyping && (
                    <AnimatePresence>
                        {hovered && (
                            <motion.button
                                className="aia-copy"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                            >
                                <i className={copied ? 'ri-check-line' : 'ri-clipboard-line'}></i>
                                {copied ? 'Copiado' : 'Copiar'}
                            </motion.button>
                        )}
                    </AnimatePresence>
                )}
            </div>
            {msg.role === 'user' && (
                <div className="aia-av aia-av--user">
                    {userName ? userName[0].toUpperCase() : 'T'}
                </div>
            )}
        </motion.div>
    );
};

/* ==================== Main ==================== */

const AIAssistant: React.FC = () => {
    const isSetupComplete = useSelector(selectIsSetupComplete);
    const plan = useSelector(selectTenantPlan);
    const settingsLoaded = useSelector(selectSettingsLoaded);
    const {
        messages, input, setInput, isTyping, error, isAdmin,
        messagesEndRef, fileInputRef,
        sendMessage, resetChat, scrollToBottom,
        isUploading, handleImportSelect, handleFileUpload,
        shouldShowOnboarding, isProPlan,
    } = useAIChat({ isSetupComplete, plan, settingsLoaded });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const clipRef = useRef<HTMLDivElement>(null);
    const userName = getUserName();
    const suggestions = shouldShowOnboarding
        ? onboardingSuggestions
        : isProPlan
            ? proSuggestions
            : (isAdmin ? adminSuggestions : clientSuggestions);
    const [showClip, setShowClip] = useState(false);
    const isEmpty = messages.length === 0;

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
        }
    }, [input]);

    // Close clip on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (clipRef.current && !clipRef.current.contains(e.target as Node)) setShowClip(false);
        };
        if (showClip) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showClip]);

    /* ── Shared input card (used in both empty & active states) ── */
    const inputCard = (
        <div className="aia-input-card">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />

            {isAdmin && (
                <div ref={clipRef} style={{ position: 'relative' }}>
                    <button
                        className="aia-icon-btn"
                        onClick={() => setShowClip(v => !v)}
                        disabled={isUploading || isTyping}
                        title="Importar Excel"
                    >
                        {isUploading ? <Spinner size="sm" /> : <i className="ri-attachment-2"></i>}
                    </button>
                    {showClip && (
                        <div className="aia-clip-drop">
                            <div className="aia-clip-title">Importar Excel</div>
                            {IMPORT_OPTIONS.map(opt => (
                                <button key={opt.key} className="aia-clip-opt" onClick={() => { handleImportSelect(opt.key); setShowClip(false); }}>
                                    <i className={opt.icon} style={{ color: opt.color }}></i>
                                    <div>
                                        <div className="aia-clip-opt-name">{opt.label}</div>
                                        <div className="aia-clip-opt-desc">{opt.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <textarea
                ref={textareaRef}
                className="aia-textarea"
                placeholder="Escribe tu mensaje..."
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

            {messages.length > 0 && !isTyping && (
                <button className="aia-icon-btn" onClick={resetChat} title="Nuevo chat">
                    <i className="ri-refresh-line"></i>
                </button>
            )}

            <button
                className={`aia-send ${input.trim() && !isTyping ? 'aia-send--on' : ''}`}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
            >
                {isTyping ? <Spinner size="sm" color="light" /> : <i className="ri-arrow-up-line"></i>}
            </button>
        </div>
    );

    const chips = (
        <div className="aia-chips">
            {suggestions.map((s, i) => (
                <motion.button
                    key={i}
                    className="aia-chip"
                    onClick={() => sendMessage(s.query)}
                    disabled={isTyping}
                    initial={isEmpty ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: isEmpty ? 0.3 + i * 0.04 : 0 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                >
                    <i className={s.icon}></i>
                    {s.text}
                </motion.button>
            ))}
        </div>
    );

    return (
        <div className={`aia-root ${isEmpty ? 'aia-root--empty' : ''}`}>
            {/* ── Messages area (hidden when empty) ── */}
            {!isEmpty && (
                <div className="aia-scroll">
                    <div className="aia-center">
                        <div className="aia-thread">
                            {messages.map((msg) => (
                                <MsgRow key={msg.id} msg={msg} userName={userName} />
                            ))}

                            {isTyping && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
                                <motion.div
                                    className="aia-msg aia-msg--bot"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="aia-av">
                                        <i className="ri-sparkling-line"></i>
                                    </div>
                                    <div className="aia-bub aia-bub--bot aia-dots">
                                        <span className="aia-dot" />
                                        <span className="aia-dot" />
                                        <span className="aia-dot" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bottom section (centered when empty, pinned when active) ── */}
            <div className={isEmpty ? 'aia-empty' : 'aia-bottom'}>
                <div className={isEmpty ? 'aia-empty-inner' : 'aia-bottom-center'}>
                    {/* Welcome (only when empty) */}
                    {isEmpty && (
                        <>
                            <motion.div
                                className="aia-welcome-icon"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
                            >
                                <i className="ri-sparkling-line"></i>
                            </motion.div>
                            <motion.h2
                                className="aia-welcome-title"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                            >
                                {userName ? `Hola ${userName}` : 'Hola'}, soy tu asistente
                            </motion.h2>
                            <motion.p
                                className="aia-welcome-sub"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                            >
                                {isAdmin
                                    ? 'Gestiona tu salon: citas, ventas, servicios, estilistas y mas.'
                                    : 'Puedo ayudarte a ver servicios, conocer estilistas y agendar citas.'}
                            </motion.p>
                        </>
                    )}

                    {error && (
                        <div className="aia-error">
                            <i className="ri-error-warning-line"></i> {error}
                        </div>
                    )}

                    {inputCard}
                    {chips}
                    <p className="aia-footer">Asistente IA de TuPelukeria — puede cometer errores</p>
                </div>
            </div>

            <style>{`
                /* ===== Layout ===== */
                .aia-root {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 70px);
                    background: var(--vz-body-bg, #f3f3f9);
                    overflow: hidden;
                }
                .aia-root--empty {
                    justify-content: center;
                }

                /* ===== Empty state: centered ===== */
                .aia-empty {
                    padding: 24px 16px;
                }
                .aia-empty-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                }

                /* ===== Welcome ===== */
                .aia-welcome-icon {
                    width: 68px; height: 68px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 18px;
                    box-shadow: 0 12px 40px rgba(102,126,234,0.25);
                    animation: aiaFloat 3s ease-in-out infinite;
                }
                .aia-welcome-icon i { font-size: 32px; color: #fff; }
                @keyframes aiaFloat {
                    0%,100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .aia-welcome-title {
                    font-size: clamp(1.3rem, 3vw, 1.7rem);
                    font-weight: 700;
                    margin-bottom: 6px;
                    color: var(--vz-heading-color, #495057);
                }
                .aia-welcome-sub {
                    color: var(--vz-secondary-color, #878a99);
                    font-size: 14px;
                    margin: 0 0 24px;
                    max-width: 400px;
                    line-height: 1.6;
                }

                /* ===== Active state: scroll + bottom ===== */
                .aia-scroll {
                    flex: 1;
                    overflow-y: auto;
                }
                .aia-center {
                    max-width: 680px;
                    width: 100%;
                    margin: 0 auto;
                    padding: 0 16px;
                }
                .aia-thread {
                    padding: 20px 0 8px;
                }

                /* ===== Messages ===== */
                .aia-msg {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    align-items: flex-start;
                }
                .aia-msg--user { justify-content: flex-end; }
                .aia-msg--bot { justify-content: flex-start; }

                .aia-av {
                    width: 30px; height: 30px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; margin-top: 2px;
                    font-size: 12px; font-weight: 600;
                }
                .aia-av i { font-size: 14px; color: #fff; }
                .aia-av--user {
                    background: var(--vz-primary, #405189);
                    color: #fff;
                }

                .aia-bub {
                    max-width: 85%;
                    font-size: 14px;
                    line-height: 1.7;
                    word-break: break-word;
                    position: relative;
                }
                .aia-bub--user {
                    padding: 10px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    border-radius: 18px;
                    border-bottom-right-radius: 4px;
                    white-space: pre-wrap;
                }
                .aia-bub--bot {
                    padding: 4px 0;
                    background: transparent;
                    color: var(--vz-body-color, #495057);
                }

                /* Typing dots */
                .aia-dots {
                    display: flex !important; align-items: center; gap: 5px;
                    padding: 14px 18px !important;
                    background: var(--vz-card-bg, #fff) !important;
                    border: 1px solid var(--vz-border-color, #e9ebec) !important;
                    border-radius: 16px !important;
                }
                .aia-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: var(--vz-secondary-color, #999);
                    animation: aiaBounce 1.4s ease-in-out infinite;
                }
                .aia-dot:nth-child(2) { animation-delay: 0.15s; }
                .aia-dot:nth-child(3) { animation-delay: 0.3s; }
                @keyframes aiaBounce {
                    0%,80%,100% { transform: translateY(0); }
                    40% { transform: translateY(-5px); }
                }
                .aia-caret { font-weight: bold; animation: aiaBlink 1s infinite; }
                @keyframes aiaBlink {
                    0%,50% { opacity: 1; } 51%,100% { opacity: 0; }
                }

                /* Copy btn */
                .aia-copy {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 3px 10px; margin-top: 6px;
                    font-size: 11.5px; font-family: inherit;
                    color: var(--vz-secondary-color, #878a99);
                    background: transparent;
                    border: 1px solid var(--vz-border-color, #e9ebec);
                    border-radius: 8px; cursor: pointer;
                    transition: all 0.15s;
                }
                .aia-copy i { font-size: 13px; }
                .aia-copy:hover { color: #667eea; border-color: #667eea; background: rgba(102,126,234,0.05); }

                /* ===== Bottom (active state) ===== */
                .aia-bottom {
                    background: var(--vz-body-bg, #f3f3f9);
                    padding: 0 16px 14px;
                }
                .aia-bottom-center {
                    max-width: 680px;
                    margin: 0 auto;
                }

                /* Error */
                .aia-error {
                    background: #fff3cd;
                    color: #856404;
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-size: 13px;
                    margin-bottom: 10px;
                    display: flex; align-items: center; gap: 6px;
                    text-align: left;
                }

                /* ===== Input card ===== */
                .aia-input-card {
                    display: flex;
                    align-items: flex-end;
                    gap: 4px;
                    width: 100%;
                    background: var(--vz-card-bg, #fff);
                    border: 1.5px solid var(--vz-border-color, #e9ebec);
                    border-radius: 16px;
                    padding: 6px 8px 6px 6px;
                    transition: all 0.2s;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
                }
                .aia-input-card:focus-within {
                    border-color: #667eea;
                    box-shadow: 0 2px 20px rgba(102,126,234,0.1);
                }

                .aia-icon-btn {
                    width: 36px; height: 36px;
                    border-radius: 50%;
                    border: none; background: transparent;
                    color: var(--vz-secondary-color, #878a99);
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 18px;
                    transition: all 0.15s;
                }
                .aia-icon-btn:hover:not(:disabled) {
                    background: var(--vz-light, #f3f6f9);
                    color: #667eea;
                }
                .aia-icon-btn:disabled { opacity: 0.4; cursor: default; }

                .aia-textarea {
                    flex: 1; border: none; background: transparent;
                    font-size: 14px; resize: none; outline: none;
                    min-height: 24px; max-height: 140px;
                    font-family: inherit;
                    color: var(--vz-body-color, #374151);
                    line-height: 1.5; padding: 8px 4px;
                }
                .aia-textarea::placeholder { color: var(--vz-secondary-color, #adb5bd); }

                .aia-send {
                    width: 36px; height: 36px;
                    border-radius: 50%; border: none;
                    background: var(--vz-light, #e9ebec);
                    color: var(--vz-secondary-color, #adb5bd);
                    cursor: default;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 18px;
                    transition: all 0.15s;
                }
                .aia-send--on {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff; cursor: pointer;
                    box-shadow: 0 2px 8px rgba(102,126,234,0.3);
                }
                .aia-send--on:hover {
                    transform: scale(1.06);
                    box-shadow: 0 4px 14px rgba(102,126,234,0.35);
                }

                /* ===== Clip dropdown ===== */
                .aia-clip-drop {
                    position: absolute;
                    bottom: 46px; left: 0;
                    width: 230px;
                    background: var(--vz-card-bg, #fff);
                    border: 1px solid var(--vz-border-color, #e5e7eb);
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
                    z-index: 10; padding: 8px;
                    animation: aiaSlide 0.15s ease-out;
                }
                @keyframes aiaSlide {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .aia-clip-title {
                    font-size: 11px; font-weight: 600;
                    color: var(--vz-secondary-color, #878a99);
                    text-transform: uppercase; letter-spacing: 0.5px;
                    padding: 4px 8px 8px;
                }
                .aia-clip-opt {
                    display: flex; align-items: center; gap: 10px;
                    width: 100%; padding: 8px 10px;
                    border: none; background: transparent;
                    border-radius: 8px; cursor: pointer;
                    text-align: left; font-family: inherit;
                    color: var(--vz-body-color, #374151);
                    transition: background 0.15s;
                }
                .aia-clip-opt:hover { background: var(--vz-light, #f3f6f9); }
                .aia-clip-opt i { font-size: 16px; flex-shrink: 0; }
                .aia-clip-opt-name { font-size: 13px; font-weight: 600; }
                .aia-clip-opt-desc { font-size: 11px; color: var(--vz-secondary-color, #878a99); }

                /* ===== Chips ===== */
                .aia-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 12px;
                    justify-content: center;
                }
                .aia-chip {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 14px;
                    font-size: 12.5px; font-weight: 500;
                    white-space: nowrap;
                    background: var(--vz-card-bg, #fff);
                    border: 1px solid var(--vz-border-color, #e9ebec);
                    border-radius: 20px;
                    cursor: pointer;
                    color: var(--vz-body-color, #495057);
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .aia-chip i { font-size: 14px; }
                .aia-chip:hover:not(:disabled) {
                    border-color: #667eea;
                    color: #667eea;
                    background: rgba(102,126,234,0.04);
                }
                .aia-chip:disabled { opacity: 0.5; cursor: default; }

                .aia-footer {
                    text-align: center;
                    font-size: 11px;
                    color: var(--vz-secondary-color, #adb5bd);
                    margin: 10px 0 0;
                }

                /* ===== Markdown ===== */
                .aia-md { font-size: 14px; line-height: 1.7; }
                .aia-md > :first-child { margin-top: 0; }
                .aia-md > :last-child { margin-bottom: 0; }
                .aia-md-p { margin: 0 0 12px; }
                .aia-md-p:last-child { margin-bottom: 0; }
                .aia-md-ul, .aia-md-ol { margin: 0 0 12px; padding-left: 22px; }
                .aia-md-li { margin-bottom: 4px; }
                .aia-md-h { font-weight: 700; margin: 16px 0 8px; color: var(--vz-heading-color, #495057); }
                .aia-md-h:first-child { margin-top: 0; }
                .aia-md-bq {
                    border-left: 3px solid #667eea;
                    padding: 8px 16px; margin: 12px 0;
                    background: rgba(102,126,234,0.04);
                    border-radius: 0 8px 8px 0;
                    color: var(--vz-secondary-color, #6c757d);
                }
                .aia-md-hr { border: none; border-top: 1px solid var(--vz-border-color, #e9ebec); margin: 16px 0; }
                .aia-md-inline {
                    background: var(--vz-light, rgba(0,0,0,0.05));
                    padding: 2px 6px; border-radius: 5px;
                    font-size: 0.9em; font-family: 'Fira Code','Consolas',monospace;
                    color: #e83e8c;
                }
                .aia-md-a {
                    color: #667eea; text-decoration: none;
                    border-bottom: 1px solid rgba(102,126,234,0.3);
                }
                .aia-md-a:hover { border-color: #667eea; }

                /* Table */
                .aia-md-tw {
                    overflow-x: auto; margin: 12px 0;
                    border-radius: 8px;
                    border: 1px solid var(--vz-border-color, #e9ebec);
                }
                .aia-md-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
                .aia-md-tbl th {
                    background: var(--vz-light, #f3f6f9);
                    padding: 8px 12px; text-align: left;
                    font-weight: 600;
                    border-bottom: 1px solid var(--vz-border-color, #e9ebec);
                    white-space: nowrap;
                }
                .aia-md-tbl td {
                    padding: 8px 12px;
                    border-bottom: 1px solid var(--vz-border-color, #e9ebec);
                }
                .aia-md-tbl tr:last-child td { border-bottom: none; }
                .aia-md-tbl tr:hover td { background: rgba(102,126,234,0.03); }

                /* Code block */
                .aia-codeblock {
                    margin: 12px 0; border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .aia-codeblock-head {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 8px 14px; background: #16161e; font-size: 12px;
                }
                .aia-codeblock-head span { color: #878a99; text-transform: lowercase; }
                .aia-codeblock-head button {
                    display: inline-flex; align-items: center; gap: 4px;
                    background: transparent; border: none;
                    color: #878a99; font-size: 12px; font-family: inherit;
                    cursor: pointer; padding: 2px 6px; border-radius: 4px;
                    transition: all 0.15s;
                }
                .aia-codeblock-head button i { font-size: 14px; }
                .aia-codeblock-head button:hover { color: #fff; background: rgba(255,255,255,0.08); }
                .aia-codeblock pre {
                    margin: 0; padding: 14px 16px;
                    background: #1e1e2e !important;
                    overflow-x: auto; font-size: 13px; line-height: 1.6;
                }
                .aia-codeblock pre code {
                    font-family: 'Fira Code','Consolas','Monaco',monospace;
                    background: transparent !important;
                    padding: 0 !important; font-size: 13px;
                }
                .aia-codeblock pre[class*="language-"],
                .aia-codeblock code[class*="language-"] {
                    background: #1e1e2e !important;
                }
            `}</style>
        </div>
    );
};

export default AIAssistant;
