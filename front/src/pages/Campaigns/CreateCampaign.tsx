import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader, Button, Input, Label, Spinner,
  Alert, Badge
} from "reactstrap";
import { api } from "../../services/api";

const CAMPAIGN_TEMPLATES = [
  {
    id: 'te-extranamos',
    name: 'Te Extrañamos',
    icon: 'ri-heart-line',
    subject: '¡Te extrañamos! Vuelve a visitarnos',
    html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Te Extrañamos</title></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;">
  <tr><td align="center" style="padding:30px 15px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header con gradiente -->
      <tr><td style="background:linear-gradient(135deg,#438eff,#6366f1);padding:40px 30px;text-align:center;">
        <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:120px;"><v:fill type="gradient" color="#438eff" color2="#6366f1" angle="135" /><v:textbox inset="0,0,0,0"><![endif]-->
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.5px;">Tupelukeria</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Tu salón de confianza</p>
        <!--[if mso]></v:textbox></v:rect><![endif]-->
      </td></tr>
      <!-- Cuerpo -->
      <tr><td style="padding:40px 35px 20px;">
        <h2 style="margin:0 0 20px;color:#333333;font-size:22px;font-weight:600;">¡Te extrañamos!</h2>
        <p style="margin:0 0 16px;color:#555555;font-size:16px;line-height:1.6;">Hola <strong>{{nombre}}</strong>,</p>
        <p style="margin:0 0 16px;color:#555555;font-size:16px;line-height:1.6;">Hace tiempo que no te vemos por nuestro salón y queremos que sepas que <strong style="color:#438eff;">te esperamos con los brazos abiertos</strong>.</p>
        <p style="margin:0 0 24px;color:#555555;font-size:16px;line-height:1.6;">Tu cabello merece el mejor cuidado profesional. Nuestro equipo de estilistas está listo para consentirte y ayudarte a lucir increíble.</p>
      </td></tr>
      <!-- CTA Button (Outlook-safe table-cell pattern) -->
      <tr><td align="center" style="padding:0 35px 35px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="background-color:#438eff;border-radius:8px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://app.tupelukeria.com" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#438eff" fillcolor="#438eff"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Agenda tu cita</center></v:roundrect><![endif]-->
            <!--[if !mso]><!--><a href="https://app.tupelukeria.com" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;background-color:#438eff;border-radius:8px;">Agenda tu cita</a><!--<![endif]-->
          </td></tr>
        </table>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background-color:#f8f9fa;padding:25px 35px;border-top:1px solid #eeeeee;text-align:center;">
        <p style="margin:0 0 8px;color:#999999;font-size:13px;line-height:1.5;">¡Te esperamos pronto!</p>
        <p style="margin:0;color:#bbbbbb;font-size:12px;">&copy; 2026 Tupelukeria. Todos los derechos reservados.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  },
  {
    id: 'promo-descuento',
    name: 'Promoción Especial',
    icon: 'ri-percent-line',
    subject: '¡Promoción exclusiva solo para ti!',
    html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Promoción Especial</title></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;">
  <tr><td align="center" style="padding:30px 15px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <!-- Header con gradiente -->
      <tr><td style="background:linear-gradient(135deg,#438eff,#6366f1);padding:40px 30px;text-align:center;">
        <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:120px;"><v:fill type="gradient" color="#438eff" color2="#6366f1" angle="135" /><v:textbox inset="0,0,0,0"><![endif]-->
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.5px;">Tupelukeria</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Tu salón de confianza</p>
        <!--[if mso]></v:textbox></v:rect><![endif]-->
      </td></tr>
      <!-- Hero descuento -->
      <tr><td style="padding:35px 35px 10px;text-align:center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#438eff,#6366f1);border-radius:12px;">
          <tr><td style="padding:30px 20px;text-align:center;">
            <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:530px;height:100px;"><v:fill type="gradient" color="#438eff" color2="#6366f1" angle="135" /><v:textbox inset="0,0,0,0"><center><![endif]-->
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:14px;text-transform:uppercase;letter-spacing:2px;">Oferta exclusiva</p>
            <p style="margin:0 0 8px;color:#ffffff;font-size:48px;font-weight:800;line-height:1;">15% OFF</p>
            <p style="margin:0;color:rgba(255,255,255,0.9);font-size:16px;">en tu próximo servicio</p>
            <!--[if mso]></center></v:textbox></v:rect><![endif]-->
          </td></tr>
        </table>
      </td></tr>
      <!-- Cuerpo -->
      <tr><td style="padding:25px 35px 20px;">
        <p style="margin:0 0 16px;color:#555555;font-size:16px;line-height:1.6;">Hola <strong>{{nombre}}</strong>,</p>
        <p style="margin:0 0 16px;color:#555555;font-size:16px;line-height:1.6;">Porque valoramos tu confianza, tenemos una <strong style="color:#438eff;">promoción exclusiva</strong> esperándote. Agenda tu cita antes de que termine la oferta y disfruta de este beneficio especial.</p>
        <p style="margin:0 0 8px;color:#333333;font-size:15px;font-weight:600;">¿Cómo usarlo?</p>
        <p style="margin:0 0 24px;color:#555555;font-size:15px;line-height:1.6;">Solo menciona este correo al momento de tu cita. ¡Así de fácil!</p>
      </td></tr>
      <!-- CTA Button (Outlook-safe table-cell pattern) -->
      <tr><td align="center" style="padding:0 35px 15px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="background-color:#438eff;border-radius:8px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="https://app.tupelukeria.com" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="#438eff" fillcolor="#438eff"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reserva ahora</center></v:roundrect><![endif]-->
            <!--[if !mso]><!--><a href="https://app.tupelukeria.com" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;background-color:#438eff;border-radius:8px;">Reserva ahora</a><!--<![endif]-->
          </td></tr>
        </table>
      </td></tr>
      <!-- Términos -->
      <tr><td style="padding:10px 35px 25px;">
        <p style="margin:0;color:#999999;font-size:12px;line-height:1.5;text-align:center;font-style:italic;">*Promoción válida hasta fin de mes. No acumulable con otras ofertas. Sujeto a disponibilidad.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background-color:#f8f9fa;padding:25px 35px;border-top:1px solid #eeeeee;text-align:center;">
        <p style="margin:0 0 8px;color:#999999;font-size:13px;line-height:1.5;">¡No dejes pasar esta oportunidad!</p>
        <p style="margin:0;color:#bbbbbb;font-size:12px;">&copy; 2026 Tupelukeria. Todos los derechos reservados.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  },
];

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Target
  const [inactiveDays, setInactiveDays] = useState(30);
  const [previewClients, setPreviewClients] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Step 2: Name + Subject
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");

  // Step 3: Content
  const [htmlContent, setHtmlContent] = useState(
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #438eff;">¡Te extrañamos!</h2>
  <p>Hola {{nombre}},</p>
  <p>Hace tiempo que no te vemos por nuestro salón. Queremos que sepas que te esperamos con los brazos abiertos.</p>
  <p>Agenda tu próxima cita y disfruta de nuestros servicios.</p>
  <p style="margin-top: 20px;">¡Te esperamos pronto!</p>
  <p><strong>Tu equipo de Tupelukeria</strong></p>
</div>`
  );

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const { data } = await api.get(`/campaigns/inactive-clients?days=${inactiveDays}`);
      setPreviewClients(data.clients || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar clientes.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !subject.trim() || !htmlContent.trim()) {
      setError("Todos los campos son requeridos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/campaigns", {
        name,
        subject,
        html_content: htmlContent,
        inactive_days: inactiveDays,
      });
      navigate(`/campaigns/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al crear la campaña.");
    } finally {
      setLoading(false);
    }
  };

  document.title = "Nueva Campaña | Tupelukeria";

  return (
    <div className="page-content">
      <Container fluid>
        <div className="d-flex align-items-center mb-3">
          <h4 className="mb-0 flex-grow-1">Nueva Campaña</h4>
          <Button color="light" onClick={() => navigate("/campaigns")}>
            <i className="ri-arrow-left-line me-1"></i> Volver
          </Button>
        </div>

        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}

        {/* Steps indicator */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex gap-2">
              {[1, 2, 3].map((s) => (
                <Badge
                  key={s}
                  color={step === s ? "primary" : step > s ? "success" : "light"}
                  className="px-3 py-2 fs-13"
                  style={{ cursor: step > s ? 'pointer' : 'default' }}
                  onClick={() => step > s && setStep(s)}
                >
                  {s === 1 ? "1. Audiencia" : s === 2 ? "2. Detalles" : "3. Contenido"}
                </Badge>
              ))}
            </div>
          </Col>
        </Row>

        {/* Step 1: Target selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <h5 className="card-title mb-0">Seleccionar audiencia</h5>
            </CardHeader>
            <CardBody>
              <Row className="align-items-end mb-4">
                <Col md={6}>
                  <Label>Días de inactividad</Label>
                  <p className="text-muted mb-2">
                    Clientes que no han tenido una cita en los últimos <strong>{inactiveDays}</strong> días
                  </p>
                  <Input
                    type="range"
                    min={7}
                    max={365}
                    value={inactiveDays}
                    onChange={(e) => { setInactiveDays(parseInt(e.target.value)); setPreviewClients(null); }}
                  />
                  <div className="d-flex justify-content-between text-muted mt-1">
                    <small>7 días</small>
                    <strong>{inactiveDays} días</strong>
                    <small>365 días</small>
                  </div>
                </Col>
                <Col md={3}>
                  <Button color="info" onClick={handlePreview} disabled={previewLoading}>
                    {previewLoading ? <Spinner size="sm" /> : <><i className="ri-search-line me-1"></i> Ver destinatarios</>}
                  </Button>
                </Col>
              </Row>

              {previewClients !== null && (
                <div>
                  <Alert color={previewClients.length > 0 ? "success" : "warning"}>
                    <strong>{previewClients.length}</strong> clientes inactivos encontrados
                  </Alert>

                  {previewClients.length > 0 && (
                    <>
                      <div className="table-responsive" style={{ maxHeight: 300, overflow: 'auto' }}>
                        <table className="table table-sm table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Nombre</th>
                              <th>Email</th>
                              <th>Última cita</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewClients.slice(0, 50).map((c: any, i: number) => (
                              <tr key={i}>
                                <td>{c.first_name} {c.last_name}</td>
                                <td>{c.email}</td>
                                <td>{c.last_appointment ? new Date(c.last_appointment).toLocaleDateString('es-CO') : 'Nunca'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewClients.length > 50 && (
                        <p className="text-muted mt-2">...y {previewClients.length - 50} más</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 text-end">
                <Button
                  color="primary"
                  disabled={previewClients === null || previewClients.length === 0}
                  onClick={() => setStep(2)}
                >
                  Siguiente <i className="ri-arrow-right-line ms-1"></i>
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 2: Name + Subject */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <h5 className="card-title mb-0">Detalles de la campaña</h5>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <Label>Nombre de la campaña</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Re-engagement Febrero 2026"
                    />
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <Label>Asunto del email</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ej: ¡Te extrañamos! Vuelve a visitarnos"
                    />
                  </div>
                </Col>
              </Row>
              <div className="mt-4 d-flex justify-content-between">
                <Button color="light" onClick={() => setStep(1)}>
                  <i className="ri-arrow-left-line me-1"></i> Anterior
                </Button>
                <Button color="primary" disabled={!name.trim() || !subject.trim()} onClick={() => setStep(3)}>
                  Siguiente <i className="ri-arrow-right-line ms-1"></i>
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 3: HTML Content */}
        {step === 3 && (
          <Row>
            {/* Template selection */}
            <Col xs={12} className="mb-3">
              <Card>
                <CardHeader>
                  <h5 className="card-title mb-0">Elegir plantilla</h5>
                </CardHeader>
                <CardBody>
                  <div className="d-flex flex-wrap gap-2">
                    {CAMPAIGN_TEMPLATES.map((t) => (
                      <Button
                        key={t.id}
                        color="soft-primary"
                        className="d-flex align-items-center gap-2"
                        onClick={() => {
                          setHtmlContent(t.html);
                          if (!subject.trim()) setSubject(t.subject);
                        }}
                      >
                        <i className={t.icon}></i> {t.name}
                      </Button>
                    ))}
                    <Button
                      color="soft-secondary"
                      onClick={() => setHtmlContent('')}
                    >
                      <i className="ri-file-line me-1"></i> En blanco
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <CardHeader>
                  <h5 className="card-title mb-0">Contenido del email (HTML)</h5>
                </CardHeader>
                <CardBody>
                  <Input
                    type="textarea"
                    rows={15}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </CardBody>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <CardHeader>
                  <h5 className="card-title mb-0">Vista previa</h5>
                </CardHeader>
                <CardBody>
                  <div
                    className="border rounded p-3"
                    style={{ minHeight: 300 }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </CardBody>
              </Card>
            </Col>
            <Col xs={12}>
              <div className="d-flex justify-content-between mt-2 mb-4">
                <Button color="light" onClick={() => setStep(2)}>
                  <i className="ri-arrow-left-line me-1"></i> Anterior
                </Button>
                <Button color="success" onClick={handleCreate} disabled={loading}>
                  {loading ? <Spinner size="sm" /> : <><i className="ri-save-line me-1"></i> Crear Campaña</>}
                </Button>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default CreateCampaign;
