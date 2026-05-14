import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader, Button, Spinner,
  Input, Label, Alert, Badge, Progress,
  Modal, ModalHeader, ModalBody, ModalFooter, FormFeedback,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { api } from "../../services/api";
import { getDecodedToken } from "../../services/auth";

const GENERATION_TIMEOUT_MS = 15 * 60 * 1000;

const WebPage = () => {
  const decoded = getDecodedToken();
  const tenantId = decoded?.user?.tenant_id;

  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollErrorCount = useRef(0);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Subdomain state
  const [slugInput, setSlugInput] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugMsg, setSlugMsg] = useState<{ type: string; text: string } | null>(null);

  // Slug modal state (shown before generating)
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [modalSlug, setModalSlug] = useState("");
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPage = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get(`/web-pages/tenant/${tenantId}`);
      setPage(data);
      if (data?.slug) setSlugInput(data.slug);
      if (data && data.status === "processing" && data.plury_generation_id) {
        startPolling(data.plury_generation_id);
      }
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);


  useEffect(() => {
    loadPage();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadPage]);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || !e.data.type) return;
      switch (e.data.type) {
        case "content-updated":
          setEditedHtml(e.data.html);
          break;
        case "undo-state":
          setCanUndo(!!e.data.canUndo);
          setCanRedo(!!e.data.canRedo);
          break;
        case "element-selected":
          setSelectedElement(e.data.elementLabel || e.data.tag);
          break;
        case "element-deselected":
          setSelectedElement(null);
          break;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const stopPolling = (errorMsg?: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollErrorCount.current = 0;
    setPolling(false);
    setGenerating(false);
    if (errorMsg) setError(errorMsg);
    loadPage();
  };

  const startPolling = (generationId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollErrorCount.current = 0;
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/web-pages/status/${generationId}`);
        pollErrorCount.current = 0;
        if (data.status === "completed") {
          stopPolling();
        } else if (data.status === "failed") {
          stopPolling(data.message || "La generacion fallo. Intenta de nuevo.");
        }
      } catch {
        pollErrorCount.current++;
        if (pollErrorCount.current >= 10) {
          stopPolling("No se pudo obtener el estado de la generacion. Intenta de nuevo.");
        }
      }
    }, 4000);
  };

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
    if (!prompt.trim()) return;
    setModalSlug("");
    setSlugAvailable(null);
    setSlugError(null);
    setShowSlugModal(true);
  };

  const handleConfirmGenerate = async () => {
    const cleanSlug = modalSlug.replace(/^-+|-+$/g, "");
    if (cleanSlug.length < 3 || !slugAvailable) return;
    setShowSlugModal(false);
    setError(null);
    setGenerating(true);
    try {
      const { data } = await api.post("/web-pages/generate", { prompt: prompt.trim(), slug: cleanSlug });
      setSlugInput(cleanSlug);
      startPolling(data.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Error al generar.");
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setGenerating(true);
    try {
      const { data } = await api.post("/web-pages/generate", { prompt: prompt.trim() });
      startPolling(data.id);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Error al generar.");
      setGenerating(false);
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
      setSlugMsg({ type: "success", text: `Publicado en ${data.url}` });
      loadPage();
    } catch (err: any) {
      setSlugMsg({ type: "danger", text: err?.response?.data?.error || "Error al guardar subdominio." });
    } finally {
      setSlugSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId) return;
    if (!window.confirm("Eliminar la pagina web actual? Podras generar una nueva.")) return;
    try {
      await api.delete(`/web-pages/tenant/${tenantId}`);
      setPage(null);
      setPrompt("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al eliminar.");
    }
  };

  // Edit mode handlers
  const sendToIframe = (msg: any) => {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  };

  const handleStartEdit = () => {
    setEditing(true);
    setEditedHtml(null);
    setCanUndo(false);
    setCanRedo(false);
    setSelectedElement(null);
    setTimeout(() => sendToIframe({ type: "toggle-edit-mode", enabled: true }), 300);
  };

  const handleCancelEdit = () => {
    sendToIframe({ type: "toggle-edit-mode", enabled: false });
    setEditing(false);
    setEditedHtml(null);
    setSelectedElement(null);
    // Reload page data to reset iframe content
    loadPage();
  };

  const handleSave = async () => {
    if (!editedHtml || !tenantId) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/web-pages/tenant/${tenantId}`, { html: editedHtml });
      sendToIframe({ type: "toggle-edit-mode", enabled: false });
      setEditing(false);
      setEditedHtml(null);
      setSelectedElement(null);
      loadPage();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => sendToIframe({ type: "undo" });
  const handleRedo = () => sendToIframe({ type: "redo" });

  // If page has been "processing" for too long, stop showing the active progress state.
  const isStaleProcessing = page?.status === "processing" && page?.created_at &&
    (Date.now() - new Date(page.created_at).getTime()) > GENERATION_TIMEOUT_MS;

  const isProcessing = !isStaleProcessing && (generating || polling || (page?.status === "processing"));

  // Use srcdoc with stored HTML (so editor postMessage works), fall back to published_url
  const useHtml = !!page?.html;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Pagina Web" pageTitle="Mi Negocio" />

        <Row>
          <Col lg={8}>
            {loading ? (
              <Card><CardBody className="text-center py-5"><Spinner /></CardBody></Card>
            ) : page?.status === "completed" && (page?.published_url || page?.html) ? (
              <>
                <Card>
                  <CardHeader className="d-flex align-items-center justify-content-between">
                    <div>
                      <h5 className="mb-1">{page.title || "Mi Pagina Web"}</h5>
                      {page.published_url && (
                        <a href={page.published_url} target="_blank" rel="noopener noreferrer" className="text-primary fs-13">
                          <i className="ri-external-link-line me-1"></i>{page.published_url}
                        </a>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      {!editing ? (
                        <>
                          <Button size="sm" color="warning" onClick={handleStartEdit}>
                            <i className="ri-edit-line me-1"></i>Editar
                          </Button>
                          {page.published_url && (
                            <a href={page.published_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                              <i className="ri-eye-line me-1"></i>Ver Pagina
                            </a>
                          )}
                          <Button size="sm" color="soft-danger" onClick={handleDelete}>
                            <i className="ri-delete-bin-line me-1"></i>Eliminar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" color="light" onClick={handleUndo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
                            <i className="ri-arrow-go-back-line"></i>
                          </Button>
                          <Button size="sm" color="light" onClick={handleRedo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
                            <i className="ri-arrow-go-forward-line"></i>
                          </Button>
                          {selectedElement && (
                            <Badge color="info" className="d-flex align-items-center fs-12 px-2">
                              {selectedElement}
                            </Badge>
                          )}
                          <Button size="sm" color="success" onClick={handleSave} disabled={!editedHtml || saving}>
                            {saving ? <Spinner size="sm" /> : <><i className="ri-save-line me-1"></i>Guardar</>}
                          </Button>
                          <Button size="sm" color="soft-secondary" onClick={handleCancelEdit}>
                            <i className="ri-close-line me-1"></i>Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  {/* Edit mode indicator */}
                  {editing && (
                    <div className="bg-warning-subtle text-warning px-3 py-2 fs-13 d-flex align-items-center gap-2">
                      <i className="ri-edit-circle-line"></i>
                      <span><strong>Modo edicion:</strong> Haz doble clic en textos para editarlos. Clic para seleccionar elementos.</span>
                    </div>
                  )}

                  <CardBody className="p-0">
                    <iframe
                      ref={iframeRef}
                      {...(useHtml ? { srcDoc: page.html } : { src: page.published_url })}
                      title="Vista previa"
                      style={{
                        width: "100%",
                        height: editing ? "700px" : "600px",
                        border: editing ? "2px solid var(--vz-warning)" : "none",
                        borderRadius: "0 0 4px 4px",
                      }}
                    />
                  </CardBody>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <h5 className="mb-0">
                    <i className="ri-global-line me-2"></i>
                    Crear Pagina Web
                  </h5>
                </CardHeader>
                <CardBody>
                  {isStaleProcessing ? (
                    <div className="text-center py-5">
                      <i className="ri-error-warning-line text-warning" style={{ fontSize: "3rem" }}></i>
                      <h5 className="text-warning mt-3">La generacion tardo demasiado</h5>
                      <p className="text-muted">
                        Parece que hubo un problema con la generacion anterior. Puedes intentar de nuevo.
                      </p>
                      <Button color="danger" size="sm" onClick={handleDelete} className="me-2">
                        <i className="ri-delete-bin-line me-1"></i>Eliminar e intentar de nuevo
                      </Button>
                    </div>
                  ) : isProcessing ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" className="mb-3" style={{ width: "3rem", height: "3rem" }} />
                      <h5 className="text-primary">Generando tu pagina web...</h5>
                      <p className="text-muted">
                        Nuestra IA esta creando una pagina profesional para tu negocio.
                        <br />Esto puede tardar entre 30 segundos y 2 minutos.
                      </p>
                      <Progress animated color="primary" value={100} className="mt-3" style={{ maxWidth: 400, margin: "0 auto" }} />
                    </div>
                  ) : (
                    <>
                      <p className="text-muted mb-3">
                        Describe como quieres tu pagina web. Nuestra IA creara una landing page profesional
                        con toda la informacion de tu negocio.
                      </p>

                      {error && <Alert color="danger" className="mb-3">{error}</Alert>}

                      <div className="mb-3">
                        <Label className="fw-semibold">Describe tu pagina ideal</Label>
                        <Input
                          type="textarea"
                          rows={4}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="Ej: Quiero una pagina moderna con colores oscuros, que muestre nuestros servicios de peluqueria, galeria de fotos, horarios y un boton para agendar cita por WhatsApp."
                        />
                        <small className="text-muted mt-1 d-block">
                          La informacion de tu negocio (nombre, direccion, telefono) se incluye automaticamente.
                        </small>
                      </div>

                      <Button
                        color="primary"
                        onClick={handleOpenSlugModal}
                        disabled={!prompt.trim() || prompt.trim().length < 3}
                        className="d-flex align-items-center gap-2"
                      >
                        <i className="ri-magic-line"></i>
                        Generar Pagina Web
                      </Button>
                    </>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Subdomain / publish section */}
            {page?.status === "completed" && !isProcessing && !editing && (
              <Card>
                <CardHeader>
                  <h6 className="mb-0"><i className="ri-link me-1"></i>Publicar con Subdominio</h6>
                </CardHeader>
                <CardBody>
                  <p className="text-muted fs-13 mb-2">
                    Elige un subdominio para publicar tu pagina. Sera accesible en <strong>tusubdominio.tupelukeria.com</strong>
                  </p>
                  {slugMsg && <Alert color={slugMsg.type} className="mb-2">{slugMsg.text}</Alert>}
                  <div className="d-flex gap-2 align-items-center">
                    <div className="input-group" style={{ maxWidth: 420 }}>
                      <Input
                        type="text"
                        value={slugInput}
                        onChange={(e) => { setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugMsg(null); }}
                        placeholder="ej: stunning"
                        maxLength={50}
                      />
                      <span className="input-group-text">.tupelukeria.com</span>
                    </div>
                    <Button color="success" onClick={handleSaveSlug} disabled={slugSaving || !slugInput.trim()}>
                      {slugSaving ? <Spinner size="sm" /> : <><i className="ri-global-line me-1"></i>Publicar</>}
                    </Button>
                  </div>
                  {page?.slug && (
                    <div className="mt-2">
                      <a href={`https://${page.slug}.tupelukeria.com`} target="_blank" rel="noopener noreferrer" className="text-success fw-semibold">
                        <i className="ri-external-link-line me-1"></i>https://{page.slug}.tupelukeria.com
                      </a>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Regenerate section when page exists */}
            {page?.status === "completed" && !isProcessing && !editing && (
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Regenerar Pagina</h6>
                </CardHeader>
                <CardBody>
                  <p className="text-muted fs-13 mb-2">
                    No te gusta el resultado? Describe los cambios y genera una nueva version.
                  </p>
                  {error && <Alert color="danger" className="mb-2">{error}</Alert>}
                  <div className="d-flex gap-2">
                    <Input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ej: Hazla mas moderna con colores pastel..."
                    />
                    <Button color="primary" onClick={handleGenerate} disabled={!prompt.trim() || prompt.trim().length < 3}>
                      <i className="ri-refresh-line me-1"></i>Regenerar
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </Col>

          <Col lg={4}>
            {/* Info card */}
            <Card>
              <CardBody>
                <div className="d-flex align-items-center mb-3">
                  <div className="avatar-sm flex-shrink-0">
                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-20">
                      <i className="ri-global-line"></i>
                    </div>
                  </div>
                  <div className="ms-3">
                    <h6 className="mb-1">Pagina Web con IA</h6>
                    <p className="text-muted mb-0 fs-12">Powered by Plury</p>
                  </div>
                </div>
                <ul className="list-unstyled text-muted fs-13 mb-0">
                  <li className="mb-2"><i className="ri-check-line text-success me-1"></i>Landing page profesional</li>
                  <li className="mb-2"><i className="ri-check-line text-success me-1"></i>Diseno responsive</li>
                  <li className="mb-2"><i className="ri-check-line text-success me-1"></i>Optimizada para SEO</li>
                  <li className="mb-2"><i className="ri-check-line text-success me-1"></i>URL publica incluida</li>
                  <li className="mb-2"><i className="ri-check-line text-success me-1"></i>Editor visual integrado</li>
                  <li><i className="ri-check-line text-success me-1"></i>Regenera cuando quieras</li>
                </ul>
              </CardBody>
            </Card>


            {/* Prompt used */}
            {page?.prompt && page?.status === "completed" && (
              <Card>
                <CardBody>
                  <h6 className="mb-2"><i className="ri-chat-quote-line me-1"></i>Prompt usado</h6>
                  <p className="text-muted fs-13 mb-0 fst-italic">"{page.prompt}"</p>
                </CardBody>
              </Card>
            )}
          </Col>
        </Row>
        {/* Slug selection modal */}
        <Modal isOpen={showSlugModal} toggle={() => setShowSlugModal(false)} centered>
          <ModalHeader toggle={() => setShowSlugModal(false)}>
            <i className="ri-global-line me-2"></i>Elige el nombre de tu web
          </ModalHeader>
          <ModalBody>
            <p className="text-muted mb-3">
              Elige un nombre unico para tu pagina web. Sera tu direccion en internet.
            </p>
            <Label className="fw-semibold">Nombre del subdominio</Label>
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
                />
                {slugError && <FormFeedback>{slugError}</FormFeedback>}
                {slugAvailable && (
                  <FormFeedback valid>Disponible!</FormFeedback>
                )}
              </div>
              <span className="text-muted fw-semibold ms-2" style={{ whiteSpace: "nowrap" }}>.tupelukeria.com</span>
            </div>
            {slugChecking && (
              <div className="mt-2 text-muted fs-13">
                <Spinner size="sm" className="me-1" />Verificando disponibilidad...
              </div>
            )}
            {slugAvailable && modalSlug && (
              <div className="mt-3 p-3 bg-success-subtle rounded">
                <div className="text-success fw-semibold fs-14">
                  <i className="ri-check-double-line me-1"></i>
                  Tu pagina sera accesible en:
                </div>
                <div className="text-success fs-16 fw-bold mt-1">
                  {modalSlug}.tupelukeria.com
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setShowSlugModal(false)}>Cancelar</Button>
            <Button
              color="primary"
              onClick={handleConfirmGenerate}
              disabled={!slugAvailable || slugChecking || modalSlug.replace(/^-+|-+$/g, "").length < 3}
            >
              <i className="ri-magic-line me-1"></i>Confirmar y Generar
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default WebPage;
