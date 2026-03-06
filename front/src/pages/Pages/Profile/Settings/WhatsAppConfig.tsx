import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Row, Col, Card, CardBody, CardHeader, Button, Input, Label, Progress, Spinner, Badge,
    Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import classnames from 'classnames';
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

const GREETING_PLACEHOLDER = 'Ej: "Hola! Bienvenido/a a [tu negocio]. Soy tu asistente virtual, puedo ayudarte a agendar citas, ver servicios y mas. En que te puedo ayudar?"';

const STATUS_BG_COLORS = [
    '#000000', '#1d3557', '#264653', '#2a9d8f',
    '#e76f51', '#f4a261', '#e63946', '#6a0572'
];

interface Props {
    tenantId: string;
}

const WhatsAppConfig: React.FC<Props> = ({ tenantId }) => {
    const [activeTab, setActiveTab] = useState('1');

    // Connection
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Greeting & brochure
    const [greetingMessage, setGreetingMessage] = useState('');
    const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
    const [brochureFile, setBrochureFile] = useState<File | null>(null);
    const [brochurePreview, setBrochurePreview] = useState<string | null>(null);
    const [savingGreeting, setSavingGreeting] = useState(false);
    const [uploadingBrochure, setUploadingBrochure] = useState(false);

    // Stories
    const [storyType, setStoryType] = useState<'text' | 'image'>('image');
    const [storyText, setStoryText] = useState('');
    const [storyCaption, setStoryCaption] = useState('');
    const [storyImageFile, setStoryImageFile] = useState<File | null>(null);
    const [storyImagePreview, setStoryImagePreview] = useState<string | null>(null);
    const [storyBgColor, setStoryBgColor] = useState('#000000');
    const [publishingStory, setPublishingStory] = useState(false);

    // Refs
    const pollTimer = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const storyFileInputRef = useRef<HTMLInputElement>(null);

    const flash = (msg: string, type: 'success' | 'error' = 'success') => {
        if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); }
        else { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 5000); }
    };

    // ---- Connection ----
    const checkConnection = useCallback(async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true);
        if (!isAutoRefresh) setErrorMsg(null);
        try {
            const response = await fetch(`${API_BASE_URL}/whatsapp/status/${tenantId}`, { headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();
            if (data.status === 'CONNECTED') { setIsConnected(true); setQrCode(null); }
            else if (data.status === 'QR_READY' && data.qr) { setIsConnected(false); setQrCode(data.qr); }
            else { setIsConnected(false); }
        } catch { if (!isAutoRefresh) setErrorMsg('No se pudo conectar con el servidor.'); }
        finally { if (!isAutoRefresh) setLoading(false); }
    }, [tenantId]);

    const handleDisconnect = async () => {
        if (!window.confirm('Desconectar WhatsApp?\nEl bot dejara de responder.')) return;
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/whatsapp/disconnect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId }) });
            setIsConnected(false); setQrCode(null); flash('WhatsApp desconectado');
            setTimeout(() => checkConnection(), 1500);
        } catch { flash('No se pudo desconectar.', 'error'); }
        finally { setLoading(false); }
    };

    // ---- Tenant data ----
    const loadTenantData = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, { headers: authHeaders() });
            if (res.ok) { const d = await res.json(); setGreetingMessage(d.greeting_message || ''); setBrochureUrl(d.brochure_url || null); }
        } catch (err) { console.error('Error cargando datos del tenant:', err); }
    };

    const handleSaveGreeting = async () => {
        setSavingGreeting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ greeting_message: greetingMessage }) });
            flash(res.ok ? 'Saludo guardado' : 'Error al guardar', res.ok ? 'success' : 'error');
        } catch { flash('Error de conexion', 'error'); }
        finally { setSavingGreeting(false); }
    };

    // ---- Brochure ----
    const handleBrochureUpload = async () => {
        if (!brochureFile) return;
        setUploadingBrochure(true);
        try {
            const formData = new FormData(); formData.append('brochure', brochureFile);
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/tenants/${tenantId}/brochure`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formData });
            if (res.ok) { const d = await res.json(); setBrochureUrl(d.url); setBrochureFile(null); setBrochurePreview(null); flash('Brochure subido'); }
            else flash('Error al subir', 'error');
        } catch { flash('Error de conexion', 'error'); }
        finally { setUploadingBrochure(false); }
    };

    const handleDeleteBrochure = async () => {
        if (!window.confirm('Eliminar brochure?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/tenants/${tenantId}/brochure`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) { setBrochureUrl(null); flash('Brochure eliminado'); }
        } catch { flash('Error de conexion', 'error'); }
    };

    const processFile = (file: File | null) => {
        setBrochureFile(file);
        if (file) { const r = new FileReader(); r.onload = (e) => setBrochurePreview(e.target?.result as string); r.readAsDataURL(file); }
        else setBrochurePreview(null);
    };
    const formatSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    // ---- Stories ----
    const handlePublishStory = async () => {
        if (storyType === 'text' && !storyText.trim()) return flash('Escribe un texto para la historia', 'error');
        if (storyType === 'image' && !storyImageFile) return flash('Selecciona una imagen', 'error');
        setPublishingStory(true);
        try {
            let content = storyText;
            if (storyType === 'image' && storyImageFile) {
                const reader = new FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(storyImageFile);
                });
                content = base64;
            }
            const res = await fetch(`${API_BASE_URL}/whatsapp/send-status`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ tenantId, type: storyType, content, caption: storyCaption, backgroundColor: storyBgColor })
            });
            if (res.ok) {
                flash('Historia publicada!');
                setStoryText(''); setStoryCaption(''); setStoryImageFile(null); setStoryImagePreview(null);
            } else {
                const d = await res.json().catch(() => ({}));
                flash(d.error || 'Error al publicar', 'error');
            }
        } catch { flash('Error de conexion', 'error'); }
        finally { setPublishingStory(false); }
    };

    const handleStoryImage = (file: File | null) => {
        setStoryImageFile(file);
        if (file) { const r = new FileReader(); r.onload = (e) => setStoryImagePreview(e.target?.result as string); r.readAsDataURL(file); }
        else setStoryImagePreview(null);
    };

    // ---- Effects ----
    useEffect(() => {
        if (tenantId) { checkConnection(); loadTenantData(); }
        if (!isConnected) { pollTimer.current = setInterval(() => checkConnection(true), 3000); }
        return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }, [tenantId, isConnected]);

    const greetingPercent = Math.round((greetingMessage.length / GREETING_MAX) * 100);

    return (
        <div>
            {/* Alerts */}
            {errorMsg && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="ri-error-warning-line me-2"></i>{errorMsg}
                    <button type="button" className="btn-close" onClick={() => setErrorMsg(null)}></button>
                </div>
            )}
            {successMsg && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                    <i className="ri-check-double-line me-2"></i>{successMsg}
                    <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)}></button>
                </div>
            )}

            {/* ===== CONNECTION STATUS ===== */}
            <Card>
                <CardBody>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="avatar-sm flex-shrink-0">
                                <span className={`avatar-title ${isConnected ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} rounded-2 fs-20`}>
                                    <i className={isConnected ? 'ri-whatsapp-line' : 'ri-qr-code-line'}></i>
                                </span>
                            </div>
                            <div>
                                <h6 className="fw-semibold mb-1">
                                    {loading ? 'Verificando...' : isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                                </h6>
                                <span className="text-muted fs-13">
                                    {isConnected ? 'Bot activo respondiendo mensajes' : 'Escanea el codigo QR para activar el bot'}
                                </span>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <Badge color={isConnected ? 'success' : 'warning'} className="fs-12">
                                {isConnected ? 'Online' : 'Offline'}
                            </Badge>
                            {isConnected && (
                                <Button color="soft-danger" size="sm" onClick={handleDisconnect}>
                                    <i className="ri-link-unlink-m me-1"></i>Desconectar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* ===== QR CODE (when disconnected) ===== */}
            {!isConnected && (
                <Card>
                    <CardHeader className="bg-success-subtle">
                        <h6 className="card-title mb-0 d-flex align-items-center gap-2">
                            <i className="ri-smartphone-line text-success"></i>
                            Vincular WhatsApp
                        </h6>
                    </CardHeader>
                    <CardBody>
                        {loading && (
                            <div className="text-center py-4">
                                <Spinner color="success" />
                                <p className="text-muted mt-2 mb-0">Conectando con WhatsApp...</p>
                            </div>
                        )}
                        {!loading && qrCode && (
                            <Row className="align-items-center">
                                <Col md={7} className="text-center">
                                    <div className="d-inline-block p-3 border rounded">
                                        <img src={qrCode} alt="QR Code" style={{ width: 220, height: 220, objectFit: 'contain', imageRendering: 'pixelated' }} />
                                    </div>
                                    <div className="mt-2">
                                        <button className="btn btn-sm btn-soft-primary" onClick={() => checkConnection(false)}>
                                            <i className="ri-refresh-line me-1"></i>Recargar
                                        </button>
                                    </div>
                                </Col>
                                <Col md={5}>
                                    <h6 className="fw-semibold mb-3">Instrucciones</h6>
                                    <ol className="text-muted fs-13 ps-3 vstack gap-2 mb-0">
                                        <li>Abre <strong>WhatsApp</strong> en tu telefono</li>
                                        <li>Ve a <strong>Dispositivos vinculados</strong></li>
                                        <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                                        <li>Apunta la camara al <strong>codigo QR</strong></li>
                                    </ol>
                                </Col>
                            </Row>
                        )}
                        {!loading && !qrCode && !errorMsg && (
                            <div className="text-center py-4">
                                <Spinner size="sm" color="secondary" className="me-2" />
                                <span className="text-muted">Iniciando motor de WhatsApp...</span>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* ===== TABS: Configuracion del Bot / Historias ===== */}
            {isConnected && (
                <Card>
                    <CardHeader>
                        <Nav tabs className="nav-tabs-custom nav-success card-header-tabs">
                            <NavItem>
                                <NavLink
                                    style={{ cursor: 'pointer' }}
                                    className={classnames({ active: activeTab === '1' })}
                                    onClick={() => setActiveTab('1')}
                                >
                                    <i className="ri-robot-line me-1"></i> Configurar Bot
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink
                                    style={{ cursor: 'pointer' }}
                                    className={classnames({ active: activeTab === '2' })}
                                    onClick={() => setActiveTab('2')}
                                >
                                    <i className="ri-contrast-2-line me-1"></i> Historias
                                    <Badge color="info" className="ms-1 align-middle">Nuevo</Badge>
                                </NavLink>
                            </NavItem>
                        </Nav>
                    </CardHeader>
                    <CardBody>
                        <TabContent activeTab={activeTab}>
                            {/* ---- TAB 1: Bot Config ---- */}
                            <TabPane tabId="1">
                                {/* Saludo */}
                                <div className="mb-4">
                                    <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                                        <i className="ri-chat-smile-2-line text-primary"></i>
                                        Saludo Inicial
                                    </h6>
                                    <p className="text-muted fs-13 mb-3">
                                        Primer mensaje que el bot envia cuando un cliente nuevo escribe. Puedes poner un saludo, una promo, tus horarios, o lo que quieras.
                                    </p>
                                    <Input
                                        type="textarea"
                                        rows={4}
                                        placeholder={GREETING_PLACEHOLDER}
                                        value={greetingMessage}
                                        onChange={(e) => setGreetingMessage(e.target.value)}
                                        maxLength={GREETING_MAX}
                                        style={{ resize: 'none' }}
                                    />
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        <span className="text-muted fs-12">{greetingMessage.length}/{GREETING_MAX}</span>
                                        <Progress value={greetingPercent} color={greetingPercent >= 90 ? 'warning' : 'primary'} style={{ height: 3, width: 100 }} />
                                    </div>
                                    <div className="mt-3">
                                        <Button color="primary" size="sm" onClick={handleSaveGreeting} disabled={savingGreeting}>
                                            {savingGreeting ? <><Spinner size="sm" className="me-1" /> Guardando...</> : <><i className="ri-save-line me-1"></i>Guardar saludo</>}
                                        </Button>
                                    </div>
                                    {!greetingMessage && (
                                        <div className="alert alert-warning mt-3 mb-0 fs-13">
                                            <i className="ri-lightbulb-line me-1"></i>
                                            Sin saludo configurado, la IA generara uno automatico.
                                        </div>
                                    )}
                                </div>

                                <div className="border-top my-4"></div>

                                {/* Brochure */}
                                <div>
                                    <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                                        <i className="ri-image-line text-success"></i>
                                        Brochure de Servicios
                                        {brochureUrl && <Badge color="success" className="align-middle">Activo</Badge>}
                                    </h6>
                                    <p className="text-muted fs-13 mb-3">
                                        Imagen que el bot envia automaticamente cuando un cliente pregunta por los servicios disponibles.
                                    </p>

                                    {/* Current brochure */}
                                    {brochureUrl && !brochurePreview && (
                                        <div className="mb-3 position-relative d-inline-block">
                                            <img src={`${BACKEND_BASE}${brochureUrl}`} alt="Brochure" className="rounded border" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                                            <Button color="danger" size="sm" className="btn-icon position-absolute" style={{ top: 4, right: 4, width: 28, height: 28 }} onClick={handleDeleteBrochure}>
                                                <i className="ri-delete-bin-line fs-14"></i>
                                            </Button>
                                        </div>
                                    )}

                                    {/* Preview new file */}
                                    {brochurePreview && (
                                        <div className="mb-3">
                                            <img src={brochurePreview} alt="Preview" className="rounded border" style={{ maxWidth: '100%', maxHeight: 200 }} />
                                            {brochureFile && <div className="mt-1 text-muted fs-12">{brochureFile.name} - {formatSize(brochureFile.size)}</div>}
                                        </div>
                                    )}

                                    {/* Upload zone */}
                                    {!brochurePreview && (
                                        <div
                                            className="text-center rounded border-dashed p-4 mb-3"
                                            style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: 2, borderColor: '#dee2e6', background: '#f8f9fa' }}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <i className="ri-upload-cloud-2-line fs-22 text-muted d-block mb-1"></i>
                                            <span className="text-muted fs-13">{brochureUrl ? 'Clic para reemplazar' : 'Arrastra o haz clic para subir'}</span>
                                            <div className="d-flex gap-1 justify-content-center mt-2">
                                                {['JPG', 'PNG', 'WEBP'].map(f => <span key={f} className="badge bg-light text-muted border fs-11">{f}</span>)}
                                            </div>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => processFile(e.target.files?.[0] || null)} className="d-none" />

                                    {brochureFile && (
                                        <div className="hstack gap-2">
                                            <Button color="success" size="sm" onClick={handleBrochureUpload} disabled={uploadingBrochure}>
                                                {uploadingBrochure ? <Spinner size="sm" /> : <><i className="ri-upload-cloud-line me-1"></i>Subir</>}
                                            </Button>
                                            <Button color="light" size="sm" onClick={() => { setBrochureFile(null); setBrochurePreview(null); }}>Cancelar</Button>
                                        </div>
                                    )}
                                </div>
                            </TabPane>

                            {/* ---- TAB 2: Stories ---- */}
                            <TabPane tabId="2">
                                <p className="text-muted fs-13 mb-3">
                                    Publica estados/historias de WhatsApp visibles por 24 horas para todos tus contactos.
                                </p>

                                {/* Type selector */}
                                <div className="hstack gap-2 mb-3">
                                    <Button
                                        color={storyType === 'image' ? 'primary' : 'soft-primary'}
                                        size="sm"
                                        onClick={() => setStoryType('image')}
                                    >
                                        <i className="ri-image-line me-1"></i>Foto
                                    </Button>
                                    <Button
                                        color={storyType === 'text' ? 'primary' : 'soft-primary'}
                                        size="sm"
                                        onClick={() => setStoryType('text')}
                                    >
                                        <i className="ri-font-size me-1"></i>Texto
                                    </Button>
                                </div>

                                <Row className="g-3">
                                    <Col lg={7}>
                                        {storyType === 'image' ? (
                                            <>
                                                {storyImagePreview ? (
                                                    <div className="position-relative mb-3">
                                                        <img src={storyImagePreview} alt="Preview" className="rounded w-100" style={{ maxHeight: 260, objectFit: 'cover' }} />
                                                        <Button color="light" size="sm" className="btn-icon position-absolute" style={{ top: 8, right: 8, width: 28, height: 28 }}
                                                            onClick={() => { setStoryImageFile(null); setStoryImagePreview(null); }}>
                                                            <i className="ri-close-line"></i>
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="text-center rounded p-4 mb-3"
                                                        style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: 2, borderColor: '#dee2e6', background: '#f8f9fa' }}
                                                        onClick={() => storyFileInputRef.current?.click()}
                                                    >
                                                        <i className="ri-camera-line fs-22 text-muted d-block mb-2"></i>
                                                        <span className="text-muted fs-13">Arrastra una imagen o haz clic para seleccionar</span>
                                                        <div className="d-flex gap-1 justify-content-center mt-2">
                                                            {['JPG', 'PNG', 'WEBP'].map(f => <span key={f} className="badge bg-light text-muted border fs-11">{f}</span>)}
                                                        </div>
                                                    </div>
                                                )}
                                                <input ref={storyFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleStoryImage(e.target.files?.[0] || null)} className="d-none" />
                                                <div>
                                                    <Label className="form-label fs-13">Pie de foto (opcional)</Label>
                                                    <Input type="text" placeholder="Agrega un texto a tu foto..." value={storyCaption} onChange={(e) => setStoryCaption(e.target.value)} maxLength={200} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="mb-3">
                                                    <Label className="form-label fs-13">Texto de la historia</Label>
                                                    <Input type="textarea" rows={4} placeholder="Escribe el texto de tu historia..." value={storyText} onChange={(e) => setStoryText(e.target.value)} maxLength={700} style={{ resize: 'none' }} />
                                                    <span className="text-muted fs-12">{storyText.length}/700</span>
                                                </div>
                                                <div>
                                                    <Label className="form-label fs-13">Color de fondo</Label>
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        {STATUS_BG_COLORS.map((c) => (
                                                            <button
                                                                key={c}
                                                                className="rounded-circle border-0 p-0"
                                                                style={{
                                                                    width: 32, height: 32,
                                                                    background: c,
                                                                    cursor: 'pointer',
                                                                    outline: storyBgColor === c ? '3px solid var(--vz-primary)' : '2px solid #dee2e6',
                                                                    outlineOffset: 2,
                                                                    transition: 'outline 0.15s'
                                                                }}
                                                                onClick={() => setStoryBgColor(c)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </Col>

                                    {/* Preview */}
                                    <Col lg={5}>
                                        <Label className="form-label fs-13 text-muted">Vista previa</Label>
                                        <div className="rounded overflow-hidden position-relative" style={{
                                            background: storyType === 'text' ? storyBgColor : '#1a1a1a',
                                            minHeight: 280,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {storyType === 'image' && storyImagePreview ? (
                                                <div className="w-100" style={{ minHeight: 280 }}>
                                                    <img src={storyImagePreview} alt="" className="w-100" style={{ minHeight: 280, objectFit: 'cover' }} />
                                                    {storyCaption && (
                                                        <div className="position-absolute bottom-0 start-0 end-0 p-3" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                                                            <p className="text-white mb-0 fs-13">{storyCaption}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : storyType === 'text' ? (
                                                <div className="p-4 text-center">
                                                    <p className="text-white mb-0 fw-medium" style={{ fontSize: storyText.length > 200 ? 14 : storyText.length > 100 ? 16 : 20 }}>
                                                        {storyText || 'Tu texto aparecera aqui'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="text-center p-4">
                                                    <i className="ri-image-add-line fs-22" style={{ color: 'rgba(255,255,255,0.3)' }}></i>
                                                    <p className="mb-0 fs-13" style={{ color: 'rgba(255,255,255,0.4)' }}>Sin imagen</p>
                                                </div>
                                            )}
                                            {/* Status bar */}
                                            <div className="position-absolute top-0 start-0 end-0 p-2 d-flex align-items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                                <div className="rounded-circle" style={{ width: 24, height: 24, border: '2px solid #25D366', background: 'rgba(255,255,255,0.9)' }}></div>
                                                <span className="text-white fs-12 fw-medium">Mi estado</span>
                                                <span className="text-white fs-11 ms-auto" style={{ opacity: 0.6 }}>Ahora</span>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="border-top mt-4 pt-3 d-flex align-items-center justify-content-between">
                                    <span className="text-muted fs-13">
                                        <i className="ri-information-line me-1"></i>Visible por 24 horas para todos tus contactos.
                                    </span>
                                    <Button
                                        color="primary"
                                        onClick={handlePublishStory}
                                        disabled={publishingStory || (storyType === 'text' && !storyText.trim()) || (storyType === 'image' && !storyImageFile)}
                                    >
                                        {publishingStory
                                            ? <><Spinner size="sm" className="me-1" />Publicando...</>
                                            : <><i className="ri-send-plane-line me-1"></i>Publicar</>
                                        }
                                    </Button>
                                </div>
                            </TabPane>
                        </TabContent>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default WhatsAppConfig;
