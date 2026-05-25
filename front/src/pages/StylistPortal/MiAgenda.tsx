// Mi Agenda — citas del estilista renter logueado.
// Consume GET /appointments/me/agenda?startDate&endDate (solo sus propias citas).
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container, Row, Col, Card, CardBody, Button, Badge, Spinner, Alert, Table,
} from "reactstrap";
import { api } from "../../services/api";

type ApiAppt = {
  id: string;
  start_time: string;
  end_time?: string | null;
  status: string;
  service_id?: string;
  service_name: string;
  price?: number | string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendada", color: "secondary" },
  rescheduled: { label: "Reagendada", color: "secondary" },
  pending_approval: { label: "Por aprobar", color: "info" },
  checked_in: { label: "En salón", color: "primary" },
  checked_out: { label: "Saliendo", color: "warning" },
  completed: { label: "Completada", color: "success" },
  cancelled: { label: "Cancelada", color: "danger" },
};

// YYYY-MM-DD local → para inputs y rangos.
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" } as any);

const MiAgenda: React.FC = () => {
  // Rango: hoy + próximos 7 días.
  const today = useMemo(() => new Date(), []);
  const [appts, setAppts] = useState<ApiAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(today); start.setHours(0, 0, 0, 0);
      const end = new Date(today); end.setDate(end.getDate() + 7); end.setHours(23, 59, 59, 999);
      const { data } = await api.get<ApiAppt[]>("/appointments/me/agenda", {
        params: { startDate: start.toISOString(), endDate: end.toISOString() },
      });
      setAppts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || "No se pudo cargar tu agenda.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  // Agrupar por día (YYYY-MM-DD).
  const grouped = useMemo(() => {
    const map = new Map<string, ApiAppt[]>();
    for (const a of appts) {
      const key = toYMD(new Date(a.start_time));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appts]);

  return (
    <div className="page-content">
      <Container fluid>
        <Row className="mb-3">
          <Col>
            <h4 className="mb-1">Mi Agenda</h4>
            <p className="text-muted mb-0">Tus próximas citas (hoy y los próximos 7 días).</p>
          </Col>
          <Col xs="auto" className="d-flex align-items-center gap-2">
            <Button color="light" size="sm" onClick={load} disabled={loading}>
              <i className="ri-refresh-line me-1"></i> Actualizar
            </Button>
            <Link to="/mi-coworking" className="btn btn-soft-primary btn-sm">
              <i className="ri-store-2-line me-1"></i> Mi Coworking
            </Link>
          </Col>
        </Row>

        {loading ? (
          <div className="d-flex justify-content-center py-5"><Spinner color="primary" /></div>
        ) : error ? (
          <Alert color="warning" className="mb-0">{error}</Alert>
        ) : grouped.length === 0 ? (
          <Card className="mb-0"><CardBody className="text-center text-muted py-5">
            <i className="ri-calendar-2-line fs-1 d-block mb-2"></i>
            No tienes citas en los próximos días.
          </CardBody></Card>
        ) : (
          grouped.map(([day, items]) => (
            <Card className="mb-3" key={day}>
              <CardBody>
                <h6 className="text-muted text-capitalize mb-3">{fmtDateLong(items[0].start_time)}</h6>
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Hora</th>
                        <th>Servicio</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a) => {
                        const meta = STATUS_META[a.status] || { label: a.status, color: "secondary" };
                        const client = [a.client_first_name, a.client_last_name].filter(Boolean).join(" ") || "Cliente";
                        return (
                          <tr key={a.id}>
                            <td className="fw-medium">{fmtTime(a.start_time)}{a.end_time ? ` – ${fmtTime(a.end_time)}` : ""}</td>
                            <td>{a.service_name}</td>
                            <td className="text-muted">{client}</td>
                            <td><Badge color={meta.color}>{meta.label}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </Container>
    </div>
  );
};

export default MiAgenda;
