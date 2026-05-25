// Mi Coworking — espacio del estilista renter logueado.
// Replica lo que el bot de WhatsApp ofrece a los estilistas de Coworking:
// estado (al día / mora / bloqueado), mensualidad, cobro diario, días en mora,
// historial de pagos y botón para actualizar/registrar tarjeta.
// Consume GET /chair-rentals/me, POST /chair-rentals/me/payment-link y /me/setup-link.
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, Button, Badge, Spinner, Alert, Table,
} from "reactstrap";
import Swal from "sweetalert2";
import { api } from "../../services/api";

// ── Tipos (mismo shape que /chair-rentals/me) ──────────────
type RentalStatus = "active" | "past_due" | "blocked" | null;

type MeResp = {
  renter: {
    id: string;
    first_name: string;
    last_name?: string | null;
    email: string;
    rental_status: RentalStatus;
    rental_past_due_since: string | null;
    monthly_rent_cop: string | number | null;
    daily_cop: number;
    days_past_due: number;
    grace_days: number;
    has_subscription: boolean;
    has_customer: boolean;
    created_at: string;
  };
  tenant_name: string | null;
  subscription: { status: string; current_period_end: number; current_period_start: number; cancel_at_period_end: boolean } | null;
  default_card: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: string;
    amount_paid: number;
    amount_due: number;
    currency: string;
    created: number;
    hosted_invoice_url: string | null;
    description: string | null;
  }>;
};

// ── Helpers de formato ─────────────────────────────────────
const fmtCop = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
};

const fmtStripeAmount = (cents: number, currency: string) => {
  const v = (cents || 0) / 100;
  return v.toLocaleString("es-CO", { style: "currency", currency: (currency || "cop").toUpperCase(), maximumFractionDigits: 0 });
};

const fmtUnixDate = (ts?: number | null) =>
  ts ? new Date(ts * 1000).toLocaleDateString("es-CO", { dateStyle: "medium" } as any) : "—";

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  active: { label: "Al día", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: "ri-checkbox-circle-line" },
  past_due: { label: "Pago pendiente", color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "ri-error-warning-line" },
  blocked: { label: "Bloqueado", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: "ri-lock-line" },
};

const invoiceStatusColor = (s: string): string => {
  if (s === "paid") return "success";
  if (s === "open") return "warning";
  if (s === "void" || s === "uncollectible") return "danger";
  return "secondary";
};

const MiCoworking: React.FC = () => {
  const [data, setData] = useState<MeResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<MeResp>("/chair-rentals/me");
      setData(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || "No se pudo cargar tu espacio de Coworking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Abre el portal de Stripe (actualizar tarjeta) o el checkout (primera tarjeta).
  const openStripe = async (kind: "payment-link" | "setup-link") => {
    setActionBusy(true);
    try {
      const { data } = await api.post<{ url: string }>(`/chair-rentals/me/${kind}`, {});
      if (data?.url) window.location.assign(data.url);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo generar el enlace de pago.", "error");
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="d-flex justify-content-center py-5">
            <Spinner color="primary" />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-content">
        <Container fluid>
          <Alert color="warning" className="mb-0">
            {error || "No tienes un espacio de Coworking activo."}
          </Alert>
        </Container>
      </div>
    );
  }

  const r = data.renter;
  const meta = STATUS_META[r.rental_status || "active"] || STATUS_META.active;
  const needsCard = !r.has_customer || !r.has_subscription;
  const daysLeft = Math.max(0, (r.grace_days ?? 0) - (r.days_past_due ?? 0));

  return (
    <div className="page-content">
      <Container fluid>
        {/* Encabezado */}
        <Row className="mb-3">
          <Col>
            <h4 className="mb-1">Mi Coworking</h4>
            <p className="text-muted mb-0">
              {data.tenant_name ? `Tu espacio en ${data.tenant_name}` : "Tu espacio de Coworking"}
            </p>
          </Col>
          <Col xs="auto" className="d-flex align-items-center">
            <Link to="/mi-agenda" className="btn btn-soft-primary btn-sm">
              <i className="ri-calendar-line me-1"></i> Mi agenda
            </Link>
          </Col>
        </Row>

        {/* Estado destacado */}
        <Card className="mb-4">
          <CardBody>
            <Row className="g-3 align-items-center">
              <Col md={6}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 14, background: meta.bg,
                      border: `1px solid ${meta.border}`, color: meta.color,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                    }}
                  >
                    <i className={meta.icon}></i>
                  </div>
                  <div>
                    <div className="text-muted fs-13">Estado de tu Coworking</div>
                    <Badge
                      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                      className="fs-14 px-3 py-2 mt-1"
                    >
                      {meta.label}
                    </Badge>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                {r.rental_status === "past_due" && (
                  <Alert color="warning" className="mb-0 py-2">
                    <i className="ri-error-warning-line me-1"></i>
                    Tu último pago no se procesó. Llevas <strong>{r.days_past_due}</strong> día(s) en mora.
                    {daysLeft > 0
                      ? <> Tienes <strong>{daysLeft}</strong> día(s) antes de que se suspenda tu acceso.</>
                      : <> Tu acceso puede suspenderse pronto.</>}
                  </Alert>
                )}
                {r.rental_status === "blocked" && (
                  <Alert color="danger" className="mb-0 py-2">
                    <i className="ri-lock-line me-1"></i>
                    Tu acceso está suspendido por falta de pago. Actualiza tu método de pago para reactivarlo.
                  </Alert>
                )}
                {r.rental_status === "active" && (
                  <Alert color="success" className="mb-0 py-2">
                    <i className="ri-checkbox-circle-line me-1"></i>
                    Estás al día con tu Coworking. ¡Gracias!
                  </Alert>
                )}
              </Col>
            </Row>
          </CardBody>
        </Card>

        {/* Cifras */}
        <Row className="g-3 mb-4">
          <Col md={4}>
            <Card className="h-100 mb-0">
              <CardBody>
                <div className="text-muted fs-13">Mensualidad</div>
                <h4 className="mt-1 mb-0">{fmtCop(r.monthly_rent_cop)}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 mb-0">
              <CardBody>
                <div className="text-muted fs-13">Cobro diario</div>
                <h4 className="mt-1 mb-0">{fmtCop(r.daily_cop)}</h4>
                <small className="text-muted">Se cobra automáticamente cada día (mensualidad ÷ 30).</small>
              </CardBody>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 mb-0">
              <CardBody>
                <div className="text-muted fs-13">Método de pago</div>
                {data.default_card ? (
                  <>
                    <h4 className="mt-1 mb-0 text-capitalize">
                      {data.default_card.brand} •••• {data.default_card.last4}
                    </h4>
                    <small className="text-muted">
                      Vence {String(data.default_card.exp_month).padStart(2, "0")}/{data.default_card.exp_year}
                    </small>
                  </>
                ) : (
                  <h4 className="mt-1 mb-0 text-muted">Sin tarjeta</h4>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Acción de pago */}
        <Card className="mb-4">
          <CardBody className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h5 className="mb-1">{needsCard ? "Activa tu pago" : "Tu método de pago"}</h5>
              <p className="text-muted mb-0">
                {needsCard
                  ? "Registra una tarjeta para activar tu Coworking. El cobro diario inicia cuando guardes la tarjeta."
                  : "Cambia o actualiza la tarjeta con la que se cobra tu Coworking."}
              </p>
            </div>
            {needsCard ? (
              <Button color="primary" disabled={actionBusy} onClick={() => openStripe("setup-link")}>
                {actionBusy ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Registrar tarjeta</>}
              </Button>
            ) : (
              <Button color="primary" outline disabled={actionBusy} onClick={() => openStripe("payment-link")}>
                {actionBusy ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Actualizar tarjeta</>}
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Historial de pagos */}
        <Card className="mb-0">
          <CardBody>
            <h5 className="mb-3">Historial de pagos</h5>
            {data.invoices.length === 0 ? (
              <p className="text-muted mb-0">Aún no hay pagos registrados.</p>
            ) : (
              <div className="table-responsive">
                <Table className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Estado</th>
                      <th className="text-end">Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{fmtUnixDate(inv.created)}</td>
                        <td className="text-muted">{inv.description || "Coworking"}</td>
                        <td className="fw-medium">
                          {fmtStripeAmount(inv.status === "paid" ? inv.amount_paid : inv.amount_due, inv.currency)}
                        </td>
                        <td><Badge color={invoiceStatusColor(inv.status)} className="text-uppercase">{inv.status}</Badge></td>
                        <td className="text-end">
                          {inv.hosted_invoice_url ? (
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light">
                              <i className="ri-external-link-line"></i>
                            </a>
                          ) : <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
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

export default MiCoworking;
