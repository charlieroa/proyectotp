import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Row, Col, Card, CardBody, Button, Input, Progress, Spinner } from 'reactstrap';
import { getToken } from '../../../../services/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const authHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};
const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');

const GREETING_MAX = 500;

const GREETING_TEMPLATES = [
    {
        label: 'Bienvenida',
        icon: 'ri-hand-heart-line',
        text: '¡Hola! Bienvenido/a a TuPelukeria. Soy tu asistente virtual y estoy aquí para ayudarte a agendar citas, consultar servicios y más. ¿En qué te puedo ayudar?'
    },
    {
        label: 'Promoción',
        icon: 'ri-percent-line',
        text: '¡Hola! Este mes tenemos descuentos especiales en todos nuestros servicios. Pregúntame por las promociones vigentes o agenda tu cita ahora mismo.'
    },
    {
        label: 'Horarios',
        icon: 'ri-time-line',
        text: '¡Hola! Estamos disponibles de lunes a sábado. Puedo ayudarte a encontrar el horario perfecto para tu próxima cita. ¿Qué servicio te interesa?'
    }
];

interface Props {
    tenantId: string;
}

const WhatsAppConfig: React.FC<Props> = ({ tenantId }) => {
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Saludo y brochure
    const [greetingMessage, setGreetingMessage] = useState('');
    const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
    const [brochureFile, setBrochureFile] = useState<File | null>(null);
    const [brochurePreview, setBrochurePreview] = useState<string | null>(null);
    const [savingGreeting, setSavingGreeting] = useState(false);
    const [uploadingBrochure, setUploadingBrochure] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Refs
    const pollTimer = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- 1. CHECK CONNECTION ---
    const checkConnection = useCallback(async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true);
        if (!isAutoRefresh) setErrorMsg(null);

        try {
            const response = await fetch(`${API_BASE_URL}/whatsapp/status/${tenantId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'CONNECTED') {
                setIsConnected(true);
                setQrCode(null);
                if (!isAutoRefresh) setSuccessMsg('¡Conexión verificada exitosamente!');
            } else if (data.status === 'QR_READY' && data.qr) {
                setIsConnected(false);
                setQrCode(data.qr);
            } else if (data.status === 'LOADING') {
                setIsConnected(false);
            }
        } catch (error: any) {
            console.error("Error fetching status:", error);
            if (!isAutoRefresh) setErrorMsg('No se pudo conectar con el servidor.');
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    }, [tenantId]);

    // --- 2. DISCONNECT ---
    const handleDisconnect = async () => {
        const confirmed = window.confirm("¿Desconectar Bot?\nEl bot dejará de responder mensajes automáticamente.");
        if (!confirmed) return;

        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/whatsapp/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId })
            });
            setIsConnected(false);
            setQrCode(null);
            setSuccessMsg('El bot ha sido desconectado correctamente.');
            setTimeout(() => checkConnection(), 1500);
        } catch (error) {
            setErrorMsg('No se pudo desconectar el servicio.');
        } finally {
            setLoading(false);
        }
    };

    // --- 3. LOAD TENANT DATA ---
    const loadTenantData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
                headers: authHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setGreetingMessage(data.greeting_message || '');
                setBrochureUrl(data.brochure_url || null);
            }
        } catch (err) {
            console.error('Error cargando datos del tenant:', err);
        }
    };

    // --- 4. SAVE GREETING ---
    const handleSaveGreeting = async () => {
        setSavingGreeting(true);
        setErrorMsg(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ greeting_message: greetingMessage })
            });
            if (response.ok) {
                setSuccessMsg('Saludo guardado correctamente.');
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setErrorMsg('Error al guardar el saludo.');
            }
        } catch (err) {
            setErrorMsg('Error de conexión al guardar el saludo.');
        } finally {
            setSavingGreeting(false);
        }
    };

    // --- 5. UPLOAD BROCHURE ---
    const handleBrochureUpload = async () => {
        if (!brochureFile) return;
        setUploadingBrochure(true);
        setErrorMsg(null);
        try {
            const formData = new FormData();
            formData.append('brochure', brochureFile);
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/brochure`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                setBrochureUrl(data.url);
                setBrochureFile(null);
                setBrochurePreview(null);
                setSuccessMsg('Brochure subido correctamente.');
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setErrorMsg('Error al subir el brochure.');
            }
        } catch (err) {
            setErrorMsg('Error de conexión al subir el brochure.');
        } finally {
            setUploadingBrochure(false);
        }
    };

    // --- 6. DELETE BROCHURE ---
    const handleDeleteBrochure = async () => {
        if (!window.confirm('¿Eliminar el brochure actual?')) return;
        setErrorMsg(null);
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/brochure`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            if (response.ok) {
                setBrochureUrl(null);
                setSuccessMsg('Brochure eliminado.');
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                setErrorMsg('Error al eliminar el brochure.');
            }
        } catch (err) {
            setErrorMsg('Error de conexión al eliminar el brochure.');
        }
    };

    // --- 7. FILE PROCESSING ---
    const processFile = (file: File | null) => {
        setBrochureFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setBrochurePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setBrochurePreview(null);
        }
    };

    const handleBrochureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        processFile(e.target.files?.[0] || null);
    };

    // --- DRAG & DROP ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && /image\/(jpeg|png|webp)/.test(file.type)) {
            processFile(file);
        }
    };

    // --- FORMAT FILE SIZE ---
    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // --- EFFECT: INITIAL LOAD + POLLING ---
    useEffect(() => {
        if (tenantId) {
            checkConnection();
            loadTenantData();
        }

        if (!isConnected) {
            pollTimer.current = setInterval(() => {
                checkConnection(true);
            }, 3000);
        }

        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [tenantId, isConnected]);

    const greetingPercent = Math.round((greetingMessage.length / GREETING_MAX) * 100);

    return (
        <div>
            {/* ============================================ */}
            {/* PAGE HEADER */}
            {/* ============================================ */}
            <div className="mb-4">
                <div className="d-flex align-items-center gap-3">
                    <div
                        className="flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                        style={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'
                        }}
                    >
                        <i className="ri-robot-2-line fs-20 text-white"></i>
                    </div>
                    <div>
                        <h4 className="fw-semibold mb-1">Configura tu Bot</h4>
                        <p className="text-muted mb-0">
                            Conecta WhatsApp, personaliza el saludo y sube tu brochure de servicios.
                        </p>
                    </div>
                </div>
            </div>

            {/* MESSAGES */}
            {errorMsg && (
                <div className="alert alert-danger mb-3" role="alert">
                    <div className="d-flex align-items-center gap-2">
                        <i className="ri-error-warning-line"></i>
                        <span>{errorMsg}</span>
                    </div>
                </div>
            )}
            {successMsg && (
                <div className="alert alert-success mb-3" role="alert">
                    <div className="d-flex align-items-center gap-2">
                        <i className="ri-check-double-line"></i>
                        <span>{successMsg}</span>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* COMPACT STATUS BAR */}
            {/* ============================================ */}
            <Card className="mb-4">
                <CardBody>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        {/* IA Status */}
                        <div className="d-flex align-items-center gap-2 rounded px-3 py-2" style={{ background: 'rgba(102, 126, 234, 0.08)' }}>
                            <span
                                className="rounded-circle d-inline-block"
                                style={{
                                    width: 8, height: 8,
                                    backgroundColor: '#667eea',
                                    animation: 'statusPulse 2s ease-in-out infinite'
                                }}
                            ></span>
                            <i className="ri-sparkling-line" style={{ color: '#667eea' }}></i>
                            <span className="fw-medium">IA Activa</span>
                            <i className="ri-check-line text-success"></i>
                        </div>

                        {/* WhatsApp Status */}
                        <div
                            className="d-flex align-items-center gap-2 rounded px-3 py-2"
                            style={{
                                background: isConnected ? 'rgba(37, 211, 102, 0.08)' : 'rgba(255, 193, 7, 0.08)'
                            }}
                        >
                            <span
                                className="rounded-circle d-inline-block"
                                style={{
                                    width: 8, height: 8,
                                    backgroundColor: isConnected ? '#25D366' : '#ffc107',
                                    animation: 'statusPulse 2s ease-in-out infinite'
                                }}
                            ></span>
                            <i className="ri-whatsapp-line" style={{ color: isConnected ? '#25D366' : '#ffc107' }}></i>
                            <span className="fw-medium">
                                {loading ? 'Verificando...' : isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                            </span>
                            {isConnected
                                ? <i className="ri-check-line text-success"></i>
                                : <i className="ri-close-line text-warning"></i>
                            }
                        </div>

                        {/* Disconnect button when connected */}
                        {isConnected && (
                            <Button color="soft-danger" size="sm" className="rounded-pill ms-auto" onClick={handleDisconnect}>
                                <i className="ri-logout-circle-line me-1"></i>
                                Desconectar
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* ============================================ */}
            {/* QR CODE (full width, only when NOT connected) */}
            {/* ============================================ */}
            {!isConnected && (
                <Card className="mb-4">
                    <CardBody className="text-center">
                        {/* LOADING */}
                        {loading && (
                            <div className="py-3">
                                <Spinner color="success" className="mb-3" />
                                <p className="text-muted mb-0">Comunicando con el servidor...</p>
                            </div>
                        )}

                        {/* QR READY */}
                        {!loading && qrCode && (
                            <Row className="g-3 align-items-center">
                                <Col md={5} className="text-start">
                                    <h5 className="fw-semibold mb-3">
                                        <i className="ri-qr-code-line me-2 text-success"></i>
                                        Conecta tu WhatsApp
                                    </h5>
                                    <div className="vstack gap-3">
                                        {[
                                            { step: '1', text: 'Abre WhatsApp en tu teléfono', icon: 'ri-smartphone-line' },
                                            { step: '2', text: 'Ve a Dispositivos vinculados', icon: 'ri-links-line' },
                                            { step: '3', text: 'Toca "Vincular un dispositivo"', icon: 'ri-add-circle-line' },
                                            { step: '4', text: 'Escanea el código QR', icon: 'ri-qr-scan-2-line' }
                                        ].map((item) => (
                                            <div key={item.step} className="d-flex align-items-center gap-3">
                                                <span
                                                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded-circle text-white fs-12 fw-semibold"
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: 'linear-gradient(135deg, #25D366, #128C7E)'
                                                    }}
                                                >
                                                    {item.step}
                                                </span>
                                                <span className="text-muted">
                                                    <i className={`${item.icon} me-1`}></i>{item.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Col>
                                <Col md={7} className="text-center">
                                    <div
                                        className="d-inline-block p-3 rounded position-relative"
                                        style={{
                                            border: '2px solid #e5e7eb',
                                            background: '#fff'
                                        }}
                                    >
                                        <img
                                            src={qrCode}
                                            alt="Escanea este código QR"
                                            style={{
                                                width: 240,
                                                height: 240,
                                                objectFit: 'contain',
                                                imageRendering: 'pixelated'
                                            }}
                                        />
                                        <span
                                            className="position-absolute rounded-circle bg-success"
                                            style={{
                                                width: 12,
                                                height: 12,
                                                top: 10,
                                                right: 10,
                                                animation: 'statusPulse 2s ease-in-out infinite'
                                            }}
                                        ></span>
                                    </div>
                                    <div className="mt-3">
                                        <Button color="link" className="text-muted p-0" onClick={() => checkConnection(false)}>
                                            <i className="ri-refresh-line me-1"></i>
                                            ¿Expiró? Recargar código
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        )}

                        {/* LOADING ENGINE */}
                        {!loading && !qrCode && !errorMsg && (
                            <div className="py-3">
                                <Spinner size="sm" color="secondary" className="me-2" />
                                <span className="text-muted">Iniciando motor de WhatsApp...</span>
                            </div>
                        )}

                        {/* ERROR */}
                        {!loading && !qrCode && errorMsg && (
                            <div className="py-3">
                                <Button color="primary" className="rounded-pill" onClick={() => checkConnection(false)}>
                                    <i className="ri-refresh-line me-1"></i>
                                    Intentar de nuevo
                                </Button>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* ============================================ */}
            {/* ROW: GREETING + BROCHURE */}
            {/* ============================================ */}
            <Row className="g-3 mb-4">
                {/* CARD: GREETING */}
                <Col lg={6}>
                    <Card className="h-100" style={{ borderTop: '3px solid var(--vz-danger)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div
                                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                                    style={{
                                        width: 40, height: 40,
                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                    }}
                                >
                                    <i className="ri-chat-smile-2-line fs-16 text-white"></i>
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                    <h5 className="fw-semibold mb-0">Saludo Inicial</h5>
                                    <p className="text-muted fs-12 mb-0">Mensaje al recibir un nuevo cliente</p>
                                </div>
                            </div>

                            {/* Quick templates */}
                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                {GREETING_TEMPLATES.map((tpl) => (
                                    <Button
                                        key={tpl.label}
                                        color="light"
                                        size="sm"
                                        className="rounded-pill"
                                        onClick={() => setGreetingMessage(tpl.text)}
                                        title={`Usar plantilla: ${tpl.label}`}
                                    >
                                        <i className={`${tpl.icon} me-1`}></i>
                                        {tpl.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="mb-3">
                                <Input
                                    type="textarea"
                                    className="bg-light"
                                    rows={4}
                                    placeholder="Escribe tu mensaje de bienvenida..."
                                    value={greetingMessage}
                                    onChange={(e) => setGreetingMessage(e.target.value)}
                                    maxLength={GREETING_MAX}
                                    style={{ resize: 'none' }}
                                />
                                <div className="mt-2">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="text-muted fs-12">
                                            {greetingMessage.length}/{GREETING_MAX}
                                        </span>
                                        <span className={`fs-12 ${greetingPercent >= 90 ? 'text-warning fw-semibold' : 'text-muted'}`}>
                                            {greetingPercent >= 90 ? 'Casi lleno' : `${100 - greetingPercent}% disponible`}
                                        </span>
                                    </div>
                                    <Progress
                                        value={greetingPercent}
                                        color={greetingPercent >= 90 ? 'warning' : greetingPercent >= 70 ? 'info' : 'primary'}
                                        style={{ height: '4px' }}
                                    />
                                </div>
                            </div>

                            <Button
                                color="primary"
                                className="rounded-pill"
                                onClick={handleSaveGreeting}
                                disabled={savingGreeting}
                            >
                                {savingGreeting ? (
                                    <><Spinner size="sm" className="me-1" /> Guardando...</>
                                ) : (
                                    <><i className="ri-save-line me-1"></i> Guardar Saludo</>
                                )}
                            </Button>

                            <div className="mt-3 pt-3 border-top">
                                <p className="text-muted fs-12 mb-0">
                                    <i className="ri-lightbulb-line me-1 text-warning"></i>
                                    {greetingMessage
                                        ? 'Tu saludo se enviará cuando un cliente escriba por primera vez.'
                                        : 'Sin saludo configurado, la IA generará uno automáticamente.'}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </Col>

                {/* CARD: BROCHURE */}
                <Col lg={6}>
                    <Card className="h-100" style={{ borderTop: '3px solid var(--vz-success)' }}>
                        <CardBody>
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div
                                    className="flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                                    style={{
                                        width: 40, height: 40,
                                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                                    }}
                                >
                                    <i className="ri-image-line fs-16 text-white"></i>
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                    <h5 className="fw-semibold mb-0">Brochure de Servicios</h5>
                                    <p className="text-muted fs-12 mb-0">Imagen enviada al preguntar por servicios</p>
                                </div>
                                {brochureUrl && (
                                    <span className="badge bg-success-subtle text-success rounded-pill">
                                        <i className="ri-check-line me-1"></i> Subido
                                    </span>
                                )}
                            </div>

                            {/* Current brochure preview */}
                            {brochureUrl && !brochurePreview && (
                                <div className="text-center mb-3 w-100">
                                    <div className="position-relative d-inline-block" style={{ maxWidth: '100%' }}>
                                        <img
                                            src={`${BACKEND_BASE}${brochureUrl}`}
                                            alt="Brochure actual"
                                            className="rounded"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: 200,
                                                border: '1px solid #e5e7eb',
                                                objectFit: 'contain'
                                            }}
                                        />
                                        <Button
                                            color="danger"
                                            size="sm"
                                            className="rounded-circle position-absolute"
                                            style={{ top: 8, right: 8, width: 32, height: 32, padding: 0 }}
                                            onClick={handleDeleteBrochure}
                                            title="Eliminar brochure"
                                        >
                                            <i className="ri-delete-bin-line"></i>
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Preview of selected file */}
                            {brochurePreview && (
                                <div className="text-center mb-3">
                                    <img
                                        src={brochurePreview}
                                        alt="Preview"
                                        className="rounded"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: 200,
                                            border: '1px solid #e5e7eb',
                                            objectFit: 'contain'
                                        }}
                                    />
                                    {brochureFile && (
                                        <div className="mt-2">
                                            <span className="badge bg-light text-muted border">
                                                <i className="ri-file-line me-1"></i>
                                                {brochureFile.name} — {formatFileSize(brochureFile.size)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Drag & Drop zone */}
                            {!brochurePreview && (
                                <div
                                    className="text-center rounded mb-3"
                                    style={{
                                        padding: brochureUrl ? 16 : '32px 16px',
                                        cursor: 'pointer',
                                        border: `2px dashed ${dragActive ? '#0ab39c' : '#ced4da'}`,
                                        background: dragActive ? 'rgba(10,179,156,0.05)' : '#f8f9fa',
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <i className={`ri-upload-cloud-2-line ${brochureUrl ? 'fs-20' : 'fs-36'} text-muted mb-2 d-block`}></i>
                                    <p className="text-muted mb-1">
                                        {brochureUrl ? 'Reemplazar imagen' : 'Arrastra tu imagen aquí o haz clic'}
                                    </p>
                                    <div className="d-flex gap-1 justify-content-center flex-wrap">
                                        <span className="badge bg-light text-muted border">JPG</span>
                                        <span className="badge bg-light text-muted border">PNG</span>
                                        <span className="badge bg-light text-muted border">WEBP</span>
                                        <span className="badge bg-light text-muted border">Max 5MB</span>
                                    </div>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleBrochureFileChange}
                                style={{ display: 'none' }}
                            />

                            {brochureFile && (
                                <div className="d-flex gap-2">
                                    <Button
                                        color="success"
                                        className="rounded-pill"
                                        onClick={handleBrochureUpload}
                                        disabled={uploadingBrochure}
                                    >
                                        {uploadingBrochure ? (
                                            <><Spinner size="sm" className="me-1" /> Subiendo...</>
                                        ) : (
                                            <><i className="ri-upload-cloud-line me-1"></i> Subir Brochure</>
                                        )}
                                    </Button>
                                    <Button
                                        color="light"
                                        size="sm"
                                        className="rounded-pill"
                                        onClick={() => {
                                            setBrochureFile(null);
                                            setBrochurePreview(null);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            )}

                            <div className="mt-3 pt-3 border-top">
                                <p className="text-muted fs-12 mb-0">
                                    <i className="ri-lightbulb-line me-1 text-warning"></i>
                                    {brochureUrl
                                        ? 'Cuando un cliente pregunte por servicios, el bot enviará esta imagen.'
                                        : 'Sin brochure, el bot describirá servicios solo con texto.'}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Animations */}
            <style>{`
                @keyframes statusPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.85); }
                }
            `}</style>
        </div>
    );
};

export default WhatsAppConfig;
