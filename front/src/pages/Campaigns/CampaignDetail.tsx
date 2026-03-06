import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader, Badge, Button, Spinner,
  Progress, Table, Alert
} from "reactstrap";
import { api } from "../../services/api";

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "info", label: "Borrador" },
  sending: { color: "warning", label: "Enviando" },
  completed: { color: "success", label: "Completada" },
  paused: { color: "secondary", label: "Pausada" },
};

const recipientStatusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "light", label: "Pendiente" },
  sent: { color: "success", label: "Enviado" },
  failed: { color: "danger", label: "Fallido" },
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientsTotal, setRecipientsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const [campRes, recipRes] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/campaigns/${id}/recipients?limit=100`),
      ]);
      setCampaign(campRes.data);
      setRecipients(recipRes.data.recipients || []);
      setRecipientsTotal(recipRes.data.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al cargar campaña.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = "Detalle Campaña | Tupelukeria";
    fetchCampaign();
  }, [fetchCampaign]);

  // Poll while sending
  useEffect(() => {
    if (!campaign || campaign.status !== 'sending') return;
    const interval = setInterval(fetchCampaign, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, fetchCampaign]);

  const handleTest = async () => {
    setTestLoading(true);
    setTestMsg(null);
    try {
      const { data } = await api.post(`/campaigns/${id}/test`);
      setTestMsg(data.message || "Email de prueba enviado.");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al enviar prueba.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await api.post(`/campaigns/${id}/send`);
      await fetchCampaign();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al iniciar envío.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await api.post(`/campaigns/${id}/pause`);
      await fetchCampaign();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al pausar envío.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de eliminar esta campaña?")) return;
    try {
      await api.delete(`/campaigns/${id}`);
      navigate("/campaigns");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Error al eliminar.");
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5"><Spinner /></div>
        </Container>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="page-content">
        <Container fluid>
          <Alert color="danger">Campaña no encontrada.</Alert>
        </Container>
      </div>
    );
  }

  const st = statusConfig[campaign.status] || statusConfig.draft;
  const progressPct = campaign.total_recipients > 0
    ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100)
    : 0;

  return (
    <div className="page-content">
      <Container fluid>
        <div className="d-flex align-items-center mb-3">
          <h4 className="mb-0 flex-grow-1">{campaign.name}</h4>
          <Button color="light" onClick={() => navigate("/campaigns")} className="me-2">
            <i className="ri-arrow-left-line me-1"></i> Volver
          </Button>
        </div>

        {error && <Alert color="danger" toggle={() => setError(null)}>{error}</Alert>}

        {/* Campaign Info */}
        <Row>
          <Col md={8}>
            <Card>
              <CardHeader className="d-flex align-items-center">
                <h5 className="card-title mb-0 flex-grow-1">Información</h5>
                <Badge color={st.color} className={`fs-13 ${campaign.status === 'sending' ? 'badge-pulse' : ''}`}>
                  {st.label}
                </Badge>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md={6}>
                    <p><strong>Asunto:</strong> {campaign.subject}</p>
                    <p><strong>Destinatarios:</strong> {campaign.total_recipients}</p>
                    <p><strong>Creada:</strong> {campaign.created_at ? new Date(campaign.created_at).toLocaleString('es-CO') : '-'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Enviados:</strong> <span className="text-success">{campaign.sent_count}</span></p>
                    <p><strong>Fallidos:</strong> <span className="text-danger">{campaign.failed_count}</span></p>
                    {campaign.completed_at && (
                      <p><strong>Completada:</strong> {new Date(campaign.completed_at).toLocaleString('es-CO')}</p>
                    )}
                  </Col>
                </Row>

                {/* Progress bar */}
                {campaign.total_recipients > 0 && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Progreso</small>
                      <small className="text-muted">{progressPct}%</small>
                    </div>
                    <Progress
                      value={progressPct}
                      color={campaign.status === 'completed' ? 'success' : 'primary'}
                      animated={campaign.status === 'sending'}
                      striped={campaign.status === 'sending'}
                    />
                  </div>
                )}

                {/* Action buttons */}
                {testMsg && <Alert color="success" className="mt-3" toggle={() => setTestMsg(null)}>{testMsg}</Alert>}
                <div className="mt-3 d-flex gap-2">
                  {campaign.status === 'draft' && (
                    <Button color="info" outline onClick={handleTest} disabled={testLoading}>
                      {testLoading ? <Spinner size="sm" /> : <><i className="ri-mail-check-line me-1"></i> Enviar prueba</>}
                    </Button>
                  )}
                  {(campaign.status === 'draft' || campaign.status === 'paused') && (
                    <Button color="success" onClick={handleSend} disabled={actionLoading}>
                      {actionLoading ? <Spinner size="sm" /> : <><i className="ri-send-plane-line me-1"></i> {campaign.status === 'paused' ? 'Reanudar' : 'Enviar'}</>}
                    </Button>
                  )}
                  {campaign.status === 'sending' && (
                    <Button color="warning" onClick={handlePause} disabled={actionLoading}>
                      {actionLoading ? <Spinner size="sm" /> : <><i className="ri-pause-line me-1"></i> Pausar</>}
                    </Button>
                  )}
                  {campaign.status === 'draft' && (
                    <Button color="soft-danger" onClick={handleDelete}>
                      <i className="ri-delete-bin-line me-1"></i> Eliminar
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col md={4}>
            <Card>
              <CardHeader>
                <h5 className="card-title mb-0">Vista previa del email</h5>
              </CardHeader>
              <CardBody>
                <div
                  className="border rounded p-2"
                  style={{ maxHeight: 300, overflow: 'auto', fontSize: '12px' }}
                  dangerouslySetInnerHTML={{ __html: campaign.html_content }}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Recipients table */}
        <Card>
          <CardHeader>
            <h5 className="card-title mb-0">
              Destinatarios ({recipientsTotal})
              {campaign.status === 'sending' && <Spinner size="sm" className="ms-2" />}
            </h5>
          </CardHeader>
          <CardBody>
            {recipients.length === 0 ? (
              <p className="text-muted text-center py-3">No hay destinatarios.</p>
            ) : (
              <div className="table-responsive">
                <Table className="table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Estado</th>
                      <th>Enviado</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map((r) => {
                      const rs = recipientStatusConfig[r.status] || recipientStatusConfig.pending;
                      return (
                        <tr key={r.id}>
                          <td>{r.recipient_name || '-'}</td>
                          <td>{r.email}</td>
                          <td><Badge color={rs.color}>{rs.label}</Badge></td>
                          <td>{r.sent_at ? new Date(r.sent_at).toLocaleString('es-CO') : '-'}</td>
                          <td className="text-danger" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.error_message || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default CampaignDetail;
