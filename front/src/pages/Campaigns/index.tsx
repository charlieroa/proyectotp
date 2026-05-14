import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, CardHeader, Table, Badge, Button, Spinner
} from "reactstrap";
import { useTranslation } from 'react-i18next';
import { api } from "../../services/api";

const Campaigns = ({ embedded }: { embedded?: boolean }) => {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: "info", label: t("draft") },
    sending: { color: "warning", label: t("sending") },
    completed: { color: "success", label: t("status_completed") },
    paused: { color: "secondary", label: t("paused") },
  };

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get("/campaigns");
      setCampaigns(data);
    } catch (err) {
      console.error("Error loading campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = `${t("campaigns")} | Tupelukeria`;
    fetchCampaigns();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("delete_campaign_confirm"))) return;
    try {
      await api.delete(`/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting campaign:", err);
    }
  };

  const content = (
        <Row>
          <Col>
            {!embedded && (
              <div className="d-flex align-items-center mb-3">
                <h4 className="mb-0 flex-grow-1">{t("campaigns")}</h4>
                <Link to="/campaigns/new">
                  <Button color="success">
                    <i className="ri-add-line me-1"></i> {t("new_campaign")}
                  </Button>
                </Link>
              </div>
            )}

            <Card>
              <CardHeader>
                <h5 className="card-title mb-0">{t("all_campaigns")}</h5>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-4"><Spinner /></div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="ri-mail-send-line display-4 d-block mb-3"></i>
                    <p>{t("no_campaigns")}</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t("name")}</th>
                          <th>{t("subject")}</th>
                          <th>{t("status")}</th>
                          <th>{t("recipients")}</th>
                          <th>{t("sent")}</th>
                          <th>{t("failed")}</th>
                          <th>{t("created")}</th>
                          <th>{t("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => {
                          const st = statusConfig[c.status] || statusConfig.draft;
                          return (
                            <tr key={c.id}>
                              <td>
                                <Link to={`/campaigns/${c.id}`} className="fw-medium">
                                  {c.name}
                                </Link>
                              </td>
                              <td className="text-muted">{c.subject}</td>
                              <td>
                                <Badge color={st.color} className={c.status === 'sending' ? 'badge-pulse' : ''}>
                                  {st.label}
                                </Badge>
                              </td>
                              <td>{c.total_recipients}</td>
                              <td className="text-success">{c.sent_count}</td>
                              <td className="text-danger">{c.failed_count}</td>
                              <td>
                                {c.created_at ? new Date(c.created_at).toLocaleDateString('es-CO') : '-'}
                              </td>
                              <td>
                                <Link to={`/campaigns/${c.id}`} className="btn btn-sm btn-soft-primary me-1">
                                  <i className="ri-eye-line"></i>
                                </Link>
                                {c.status === 'draft' && (
                                  <button
                                    className="btn btn-sm btn-soft-danger"
                                    onClick={() => handleDelete(c.id)}
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                )}
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
          </Col>
        </Row>
  );

  if (embedded) return content;

  return (
    <div className="page-content">
      <Container fluid>
        {content}
      </Container>
    </div>
  );
};

export default Campaigns;
