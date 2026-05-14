import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Row, Col, Card, CardBody, Button, Input, Spinner, Alert, Badge, Progress,
  Modal, ModalHeader, ModalBody, ModalFooter, FormFeedback,
} from "reactstrap";
import { api } from "../services/api";
import { jwtDecode } from "jwt-decode";
import { getToken } from "../services/auth";

const getTenantId = (): string | null => {
  try {
    const token = getToken();
    if (!token) return null;
    const decoded: any = jwtDecode(token);
    return decoded?.user?.tenant_id || null;
  } catch { return null; }
};

type PageStatus = "loading" | "no_page" | "processing" | "completed";
type ViewMode = "preview" | "editor";

interface WebPage {
  id: string;
  status: string;
  title?: string;
  slug?: string;
  html?: string;
  plury_generation_id?: string;
}

const ANIMATED_TEXTS = [
  "Disenando tu pagina web...",
  "Aplicando estilos modernos...",
  "Optimizando para moviles...",
  "Anadiendo tus servicios...",
  "Preparando la vista previa...",
  "Casi listo, ultimos retoques...",
];

const WebPageBuilder: React.FC = () => {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [webPage, setWebPage] = useState<WebPage | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [animatedTextIndex, setAnimatedTextIndex] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Slug modal state
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [modalSlug, setModalSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Slug edit state (for completed pages)
  const [slugInput, setSlugInput] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugMsg, setSlugMsg] = useState<{ type: string; text: string } | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = "Mi Web | TuPelukeria";
    fetchCurrentPage();
    return () => { clearAllIntervals(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for postMessage from Plury editor (save event)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'plury:editor-save' && event.data?.html) {
        setSaving(true);
        setError(null);
        try {
          await api.post('/web-pages/update-html', { html: event.data.html });
          setSuccessMsg('Cambios guardados!');
          setTimeout(() => setSuccessMsg(null), 3000);
          // Update local state
          setWebPage(prev => prev ? { ...prev, html: event.data.html } : prev);
        } catch (err: any) {
          setError('Error al guardar los cambios. Intenta de nuevo.');
        } finally {
          setSaving(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const clearAllIntervals = () => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (textIntervalRef.current) { clearInterval(textIntervalRef.current); textIntervalRef.current = null; }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
  };

  const fetchCurrentPage = async () => {
    setPageStatus("loading");
    setError(null);
    const tenantId = getTenantId();
    if (!tenantId) {
      setError("No se pudo obtener la informacion del usuario.");
      setPageStatus("no_page");
      return;
    }
    try {
      const response = await api.get(`/web-pages/tenant/${tenantId}`);
      const data = response.data;
      if (!data) { setPageStatus("no_page"); return; }
      if (data.id && data.html && data.status === "completed") {
        setWebPage(data);
        if (data.slug) setSlugInput(data.slug);
        setPageStatus("completed");
      } else if (data.id && data.status === "processing" && data.plury_generation_id) {
        setGenerationId(data.plury_generation_id);
        setPageStatus("processing");
        startPolling(data.plury_generation_id);
      } else {
        setPageStatus("no_page");
      }
    } catch (err: any) {
      if (err?.response?.status === 404) setPageStatus("no_page");
      else { setError("Error al cargar tu pagina."); setPageStatus("no_page"); }
    }
  };

  const startPolling = useCallback((id: string) => {
    clearAllIntervals();
    setAnimatedTextIndex(0);
    setProgressValue(0);
    textIntervalRef.current = setInterval(() => {
      setAnimatedTextIndex(prev => (prev + 1) % ANIMATED_TEXTS.length);
    }, 3000);
    progressIntervalRef.current = setInterval(() => {
      setProgressValue(prev => prev >= 90 ? 90 : prev + Math.random() * 8 + 2);
    }, 2000);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/web-pages/status/${id}`);
        const data = response.data;
        if (data.status === "completed" || data.status === "published") {
          clearAllIntervals();
          setProgressValue(100);
          setTimeout(() => fetchCurrentPage(), 500);
        } else if (data.status === "failed" || data.status === "error") {
          clearAllIntervals();
          setError("Error al generar tu pagina. Intenta de nuevo.");
          setPageStatus("no_page");
        }
      } catch { /* keep polling */ }
    }, 5000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSlugAvailability = (value: string) => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "");
    if (clean.length < 3) {
      setSlugAvailable(null);
      setSlugError(clean.length > 0 ? "Minimo 3 caracteres" : null);
      return;
    }
    setSlugChecking(true);
    setSlugError(null);
    setSlugAvailable(null);
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/web-pages/check-slug/${clean}`);
        setSlugAvailable(data.available);
        setSlugError(data.available ? null : data.reason);
      } catch {
        setSlugError("Error al verificar");
      } finally {
        setSlugChecking(false);
      }
    }, 500);
  };

  const handleModalSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setModalSlug(clean);
    checkSlugAvailability(clean);
  };

  const handleOpenSlugModal = () => {
    setModalSlug("");
    setSlugAvailable(null);
    setSlugError(null);
    setShowSlugModal(true);
  };

  const handleConfirmGenerate = async () => {
    const cleanSlug = modalSlug.replace(/^-+|-+$/g, "");
    if (cleanSlug.length < 3 || !slugAvailable) return;
    setShowSlugModal(false);
    const promptText = prompt.trim() || "Crea una landing con colores claros y elegantes, estilo moderno";
    setError(null);
    try {
      const response = await api.post("/web-pages/generate", { prompt: promptText, slug: cleanSlug });
      const data = response.data;
      if (data?.id) {
        setGenerationId(data.id);
        setPageStatus("processing");
        startPolling(data.id);
      } else {
        setError("Respuesta inesperada. Intenta de nuevo.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar la generacion.");
    }
  };

  const handleSaveSlug = async () => {
    const clean = slugInput.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
    if (clean.length < 3) {
      setSlugMsg({ type: "danger", text: "El subdominio debe tener al menos 3 caracteres." });
      return;
    }
    setSlugSaving(true);
    setSlugMsg(null);
    try {
      const { data } = await api.put("/web-pages/slug", { slug: clean });
      setSlugInput(data.slug);
      setWebPage(prev => prev ? { ...prev, slug: data.slug } : prev);
      setSlugMsg({ type: "success", text: `Publicado en ${data.slug}.tupelukeria.com` });
    } catch (err: any) {
      setSlugMsg({ type: "danger", text: err?.response?.data?.error || "Error al guardar subdominio." });
    } finally {
      setSlugSaving(false);
    }
  };

  const handleGenerate = async () => {
    const promptText = prompt.trim() || "Crea una landing con colores claros y elegantes, estilo moderno";
    setError(null);
    try {
      const response = await api.post("/web-pages/generate", { prompt: promptText });
      const data = response.data;
      if (data?.id) {
        setGenerationId(data.id);
        setPageStatus("processing");
        startPolling(data.id);
      } else {
        setError("Respuesta inesperada. Intenta de nuevo.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar la generacion.");
    }
  };

  const handleRegenerate = () => {
    setWebPage(null);
    setPrompt("");
    setEditorUrl(null);
    setViewMode("preview");
    setPageStatus("no_page");
  };

  const handleOpenEditor = async () => {
    setEditorLoading(true);
    setError(null);
    try {
      const response = await api.get("/web-pages/editor-url");
      if (response.data?.editor_url) {
        setEditorUrl(response.data.editor_url);
        setViewMode("editor");
      } else {
        setError("No se pudo obtener el editor.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al abrir el editor.");
    } finally {
      setEditorLoading(false);
    }
  };

  const handleCopyUrl = () => {
    if (!webPage?.slug) return;
    navigator.clipboard.writeText(`https://${webPage.slug}.tupelukeria.com`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const serveUrl = webPage?.slug ? `https://${webPage.slug}.tupelukeria.com` : null;

  const gradientBtn: React.CSSProperties = {
    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    border: "none", color: "#fff", fontWeight: 600, padding: "10px 24px",
    borderRadius: "8px", fontSize: "15px", boxShadow: "0 4px 15px rgba(99,102,241,0.3)",
  };
  const cardStyle: React.CSSProperties = {
    borderRadius: "16px", border: "none", boxShadow: "0 4px 25px rgba(0,0,0,0.08)",
  };

  // --- LOADING ---
  if (pageStatus === "loading") {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
            <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
            <p className="mt-3 text-muted fs-16">Cargando tu pagina web...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- PROCESSING ---
  if (pageStatus === "processing") {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <Row className="justify-content-center">
            <Col lg={8} xl={6}>
              <Card style={cardStyle} className="mt-4">
                <CardBody className="p-5 text-center">
                  <div className="mb-4">
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="ri-magic-line" style={{ fontSize: "36px", color: "#fff" }}></i>
                    </div>
                  </div>
                  <h3 className="mb-3" style={{ color: "#1e293b", fontWeight: 700 }}>Generando tu Web</h3>
                  <p className="text-muted fs-15 mb-4" style={{ minHeight: "24px" }}>{ANIMATED_TEXTS[animatedTextIndex]}</p>
                  <div className="px-4 mb-4">
                    <Progress value={progressValue} style={{ height: "8px", borderRadius: "4px" }} color="primary" animated striped />
                    <small className="text-muted mt-2 d-block">{Math.round(progressValue)}% completado</small>
                  </div>
                  <Spinner color="primary" size="sm" className="me-2" />
                  <span className="text-muted fs-13">Esto puede tardar hasta 2 minutos...</span>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  // --- NO PAGE ---
  if (pageStatus === "no_page") {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <Row className="justify-content-center">
            <Col lg={8} xl={6}>
              <div className="text-center mt-4 mb-4">
                <div className="mb-3">
                  <i className="ri-global-line" style={{ fontSize: "56px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}></i>
                </div>
                <h2 style={{ color: "#1e293b", fontWeight: 700 }}>Crea tu Pagina Web</h2>
                <p className="text-muted fs-15">Escribe los colores, estilo y como quieres que se vea. Tus servicios, horarios y equipo se agregan solos.</p>
              </div>
              {error && <Alert color="danger" className="mb-3" style={{ borderRadius: "10px" }}><i className="ri-error-warning-line me-2"></i>{error}</Alert>}
              <Card style={cardStyle}>
                <CardBody className="p-4">
                  <label className="form-label fw-semibold mb-2" style={{ color: "#334155" }}>Como quieres que se vea tu pagina?</label>
                  <Input type="textarea" rows={5} value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="Ej: Quiero colores rosados y dorados, estilo elegante y femenino, con fotos de salon de belleza. Incluir seccion de antes y despues."
                    style={{ borderRadius: "10px", border: "1.5px solid #e2e8f0", resize: "vertical", fontSize: "14px" }} />
                  <small className="text-muted d-block mt-2">
                    <i className="ri-lightbulb-line me-1"></i>
                    Describe los colores que quieres (ej: rosado, dorado, oscuro), el estilo (elegante, moderno, minimalista) y secciones extras. Tus servicios, horarios y equipo se agregan automaticamente.
                  </small>
                  <div className="text-end mt-4">
                    <Button style={gradientBtn} onClick={handleOpenSlugModal} className="d-inline-flex align-items-center gap-2">
                      <i className="ri-magic-line"></i>Generar Mi Web
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Slug selection modal */}
          <Modal isOpen={showSlugModal} toggle={() => setShowSlugModal(false)} centered>
            <ModalHeader toggle={() => setShowSlugModal(false)}>
              <i className="ri-global-line me-2" style={{ color: "#6366f1" }}></i>Elige el nombre de tu web
            </ModalHeader>
            <ModalBody>
              <p className="text-muted mb-3">
                Elige un nombre unico para tu pagina web. Sera tu direccion en internet.
              </p>
              <label className="form-label fw-semibold" style={{ color: "#334155" }}>Nombre del subdominio</label>
              <div className="d-flex align-items-center gap-0">
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    value={modalSlug}
                    onChange={(e) => handleModalSlugChange(e.target.value)}
                    placeholder="ej: mipelukeria"
                    maxLength={50}
                    valid={slugAvailable === true}
                    invalid={slugAvailable === false || !!slugError}
                    autoFocus
                    style={{ borderRadius: "8px" }}
                  />
                  {slugError && <FormFeedback>{slugError}</FormFeedback>}
                  {slugAvailable && <FormFeedback valid>Disponible!</FormFeedback>}
                </div>
                <span className="text-muted fw-semibold ms-2" style={{ whiteSpace: "nowrap" }}>.tupelukeria.com</span>
              </div>
              {slugChecking && (
                <div className="mt-2 text-muted fs-13">
                  <Spinner size="sm" className="me-1" />Verificando disponibilidad...
                </div>
              )}
              {slugAvailable && modalSlug && (
                <div className="mt-3 p-3 rounded" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div className="fw-semibold fs-14" style={{ color: "#6366f1" }}>
                    <i className="ri-check-double-line me-1"></i>Tu pagina sera accesible en:
                  </div>
                  <div className="fs-16 fw-bold mt-1" style={{ color: "#4f46e5" }}>
                    {modalSlug}.tupelukeria.com
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={() => setShowSlugModal(false)} style={{ borderRadius: "8px" }}>Cancelar</Button>
              <Button
                style={{ ...gradientBtn, padding: "8px 20px", fontSize: "14px" }}
                onClick={handleConfirmGenerate}
                disabled={!slugAvailable || slugChecking || modalSlug.replace(/^-+|-+$/g, "").length < 3}
              >
                <i className="ri-magic-line me-1"></i>Confirmar y Generar
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    );
  }

  // --- COMPLETED: EDITOR MODE ---
  if (viewMode === "editor") {
    return (
      <div className="page-content" style={{ padding: 0 }}>
        <div style={{ position: "relative", height: "calc(100vh - 70px)" }}>
          {/* Top bar */}
          <div style={{
            height: "50px", background: "#1e293b", display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 16px", color: "#fff",
          }}>
            <div className="d-flex align-items-center gap-3">
              <Button size="sm" color="light" outline onClick={() => { setViewMode("preview"); fetchCurrentPage(); }}
                style={{ borderRadius: "6px", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
                <i className="ri-arrow-left-line me-1"></i>Volver
              </Button>
              <span className="fw-semibold fs-14">{webPage?.title || "Mi Pagina Web"}</span>
              <Badge color="info" style={{ fontSize: "10px" }}>Editor Visual</Badge>
            </div>
            <div className="d-flex align-items-center gap-2">
              {saving && <><Spinner size="sm" color="light" className="me-1" /><span className="fs-13">Guardando...</span></>}
              {successMsg && <Badge color="success" className="fs-12"><i className="ri-check-line me-1"></i>{successMsg}</Badge>}
              {serveUrl && (
                <a href={serveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#94a3b8", fontSize: "13px", textDecoration: "none" }}>
                  <i className="ri-external-link-line me-1"></i>Ver publicada
                </a>
              )}
            </div>
          </div>

          {/* Editor iframe - full remaining height */}
          {editorUrl ? (
            <iframe
              src={editorUrl}
              title="Editor visual"
              style={{ width: "100%", height: "calc(100% - 50px)", border: "none", display: "block" }}
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: "calc(100% - 50px)" }}>
              <Spinner color="primary" style={{ width: "2.5rem", height: "2.5rem" }} />
              <p className="mt-3 text-muted">Cargando editor...</p>
            </div>
          )}
        </div>

        {/* Alerts overlay */}
        {error && (
          <div style={{ position: "fixed", top: "70px", right: "20px", zIndex: 9999, maxWidth: "400px" }}>
            <Alert color="danger" style={{ borderRadius: "10px" }} toggle={() => setError(null)}>
              <i className="ri-error-warning-line me-2"></i>{error}
            </Alert>
          </div>
        )}
      </div>
    );
  }

  // --- COMPLETED: PREVIEW MODE ---
  return (
    <div className="page-content">
      <div className="container-fluid">
        {error && <Alert color="danger" className="mb-3" style={{ borderRadius: "10px" }} toggle={() => setError(null)}><i className="ri-error-warning-line me-2"></i>{error}</Alert>}
        {successMsg && <Alert color="success" className="mb-3" style={{ borderRadius: "10px" }}><i className="ri-check-line me-2"></i>{successMsg}</Alert>}

        {/* Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ri-global-line" style={{ fontSize: "24px", color: "#fff" }}></i>
            </div>
            <div>
              <h4 className="mb-0" style={{ fontWeight: 700, color: "#1e293b" }}>{webPage?.title || "Mi Pagina Web"}</h4>
              <div className="d-flex align-items-center gap-2 mt-1">
                {serveUrl ? (
                  <a href={serveUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none fs-13" style={{ color: "#6366f1" }}>
                    Ver pagina <i className="ri-external-link-line"></i>
                  </a>
                ) : <span className="text-muted fs-13">tupelukeria.com</span>}
                <Button size="sm" color="none" className="p-0" onClick={handleCopyUrl} style={{ lineHeight: 1 }}>
                  <i className={`ri-file-copy-line fs-16 ${copied ? "text-success" : "text-muted"}`}></i>
                </Button>
                {copied && <small className="text-success fw-semibold">Copiado!</small>}
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge color="success" className="px-3 py-2 fs-12" style={{ borderRadius: "20px" }}>
              <i className="ri-check-line me-1"></i>Publicada
            </Badge>
            <Button
              style={{ ...gradientBtn, padding: "8px 18px", fontSize: "14px" }}
              onClick={handleOpenEditor}
              disabled={editorLoading}
              className="d-inline-flex align-items-center gap-1"
            >
              {editorLoading ? <Spinner size="sm" /> : <><i className="ri-edit-2-line"></i>Editar Pagina</>}
            </Button>
            <Button outline color="secondary" size="sm" className="d-inline-flex align-items-center gap-1" style={{ borderRadius: "8px" }} onClick={handleRegenerate}>
              <i className="ri-refresh-line"></i>Regenerar
            </Button>
          </div>
        </div>

        {/* Subdomain section */}
        <Card style={cardStyle} className="mb-4">
          <CardBody className="p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="ri-link" style={{ fontSize: "20px", color: "#6366f1" }}></i>
              <h6 className="mb-0 fw-semibold" style={{ color: "#1e293b" }}>Subdominio de tu pagina</h6>
            </div>
            <p className="text-muted fs-13 mb-3">
              {webPage?.slug
                ? "Tu pagina esta publicada en el siguiente subdominio. Puedes cambiarlo cuando quieras."
                : "Elige un nombre unico para tu pagina. Sera tu direccion en internet."
              }
            </p>
            {slugMsg && <Alert color={slugMsg.type} className="mb-2" style={{ borderRadius: "8px" }}>{slugMsg.text}</Alert>}
            <div className="d-flex gap-2 align-items-center">
              <div className="input-group" style={{ maxWidth: 420 }}>
                <Input
                  type="text"
                  value={slugInput}
                  onChange={(e) => { setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugMsg(null); }}
                  placeholder="ej: mipelukeria"
                  maxLength={50}
                  style={{ borderRadius: "8px 0 0 8px", border: "1.5px solid #e2e8f0" }}
                />
                <span className="input-group-text" style={{ background: "#f1f5f9", border: "1.5px solid #e2e8f0", color: "#64748b", fontWeight: 600 }}>.tupelukeria.com</span>
              </div>
              <Button color="success" onClick={handleSaveSlug} disabled={slugSaving || !slugInput.trim()} style={{ borderRadius: "8px", fontWeight: 600 }}>
                {slugSaving ? <Spinner size="sm" /> : <><i className="ri-global-line me-1"></i>Publicar</>}
              </Button>
            </div>
            {webPage?.slug && (
              <div className="mt-3 d-flex align-items-center gap-2">
                <Badge color="success" style={{ borderRadius: "20px", padding: "6px 12px" }}>
                  <i className="ri-check-line me-1"></i>Activa
                </Badge>
                <a href={`https://${webPage.slug}.tupelukeria.com`} target="_blank" rel="noopener noreferrer" className="fw-semibold text-decoration-none" style={{ color: "#6366f1" }}>
                  <i className="ri-external-link-line me-1"></i>https://{webPage.slug}.tupelukeria.com
                </a>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Preview */}
        <Card style={cardStyle}>
          <CardBody className="p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <span className="fw-semibold" style={{ color: "#475569" }}><i className="ri-eye-line me-1"></i>Vista previa</span>
              {serveUrl && (
                <a href={serveUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none fs-13" style={{ color: "#6366f1" }}>
                  Abrir en nueva pestana <i className="ri-external-link-line ms-1"></i>
                </a>
              )}
            </div>
            <div style={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 20px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
              <iframe srcDoc={webPage?.html || ""} title="Vista previa" style={{ width: "100%", height: "700px", border: "none", display: "block" }} sandbox="allow-scripts allow-same-origin" />
            </div>
          </CardBody>
        </Card>

        {/* Slug selection modal */}
        <Modal isOpen={showSlugModal} toggle={() => setShowSlugModal(false)} centered>
          <ModalHeader toggle={() => setShowSlugModal(false)}>
            <i className="ri-global-line me-2" style={{ color: "#6366f1" }}></i>Elige el nombre de tu web
          </ModalHeader>
          <ModalBody>
            <p className="text-muted mb-3">
              Elige un nombre unico para tu pagina web. Sera tu direccion en internet.
            </p>
            <label className="form-label fw-semibold" style={{ color: "#334155" }}>Nombre del subdominio</label>
            <div className="d-flex align-items-center gap-0">
              <div style={{ flex: 1 }}>
                <Input
                  type="text"
                  value={modalSlug}
                  onChange={(e) => handleModalSlugChange(e.target.value)}
                  placeholder="ej: mipelukeria"
                  maxLength={50}
                  valid={slugAvailable === true}
                  invalid={slugAvailable === false || !!slugError}
                  autoFocus
                  style={{ borderRadius: "8px" }}
                />
                {slugError && <FormFeedback>{slugError}</FormFeedback>}
                {slugAvailable && <FormFeedback valid>Disponible!</FormFeedback>}
              </div>
              <span className="text-muted fw-semibold ms-2" style={{ whiteSpace: "nowrap" }}>.tupelukeria.com</span>
            </div>
            {slugChecking && (
              <div className="mt-2 text-muted fs-13">
                <Spinner size="sm" className="me-1" />Verificando disponibilidad...
              </div>
            )}
            {slugAvailable && modalSlug && (
              <div className="mt-3 p-3 rounded" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="fw-semibold fs-14" style={{ color: "#6366f1" }}>
                  <i className="ri-check-double-line me-1"></i>Tu pagina sera accesible en:
                </div>
                <div className="fs-16 fw-bold mt-1" style={{ color: "#4f46e5" }}>
                  {modalSlug}.tupelukeria.com
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setShowSlugModal(false)} style={{ borderRadius: "8px" }}>Cancelar</Button>
            <Button
              style={{ ...gradientBtn, padding: "8px 20px", fontSize: "14px" }}
              onClick={handleConfirmGenerate}
              disabled={!slugAvailable || slugChecking || modalSlug.replace(/^-+|-+$/g, "").length < 3}
            >
              <i className="ri-magic-line me-1"></i>Confirmar y Generar
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
};

export default WebPageBuilder;
