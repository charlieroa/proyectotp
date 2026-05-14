import React, { useEffect, useMemo, useState } from "react";
import { Card, CardBody, Spinner, Button, Input, Row, Col, Badge } from "reactstrap";
import { api } from "../../services/api";
import { useCurrency } from "../../contexts/CurrencyContext";

export type ApptStatus =
  | "scheduled"
  | "rescheduled"
  | "pending_approval"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled";

export type StylistAppt = {
  id: string;
  start_time: string;
  end_time: string;
  status: ApptStatus;
  service_name: string;
  price?: number;
  client_name: string;
  batch_id?: string | null;
};

type QueueRow = {
  category_id: string;
  category_name: string;
  position: number;
  is_active: boolean;
  last_served_at?: string | null;
};

export type StylistRow = {
  stylist_id: string;
  first_name: string;
  last_name?: string | null;
  avatar_url?: string | null;
  payment_type?: string | null;
  geo: { in_salon: boolean; last_update?: string | null };
  appointments: StylistAppt[];
  open_tickets: { count: number; total: number };
  queues: QueueRow[];
  sales_today: { services_sold: number; products_sold: number; revenue: number };
};

export type StylistsDayResponse = {
  date: string;
  summary: {
    stylists_total: number;
    stylists_in_salon: number;
    appointments_total: number;
    appointments_completed: number;
    appointments_in_progress: number;
    revenue_today: number;
    open_tickets_count: number;
    open_tickets_amount: number;
  };
  stylists: StylistRow[];
};

export const STATUS_LABEL: Record<ApptStatus, string> = {
  scheduled: "Agendada",
  rescheduled: "Reagendada",
  pending_approval: "Por aprobar",
  checked_in: "En curso",
  checked_out: "Listo para cobrar",
  completed: "Pagada",
  cancelled: "Cancelada",
};

export const STATUS_COLOR: Record<ApptStatus, string> = {
  scheduled: "#9ca3af",
  rescheduled: "#9ca3af",
  pending_approval: "#a78bfa",
  checked_in: "#f59e0b",
  checked_out: "#06b6d4",
  completed: "#059669",
  cancelled: "#ef4444",
};

const DAY_START_MIN = 360; // 06:00
const DAY_END_MIN = 1320; // 22:00
const DAY_RANGE_MIN = DAY_END_MIN - DAY_START_MIN; // 960
const HOUR_MARKS = [6, 9, 12, 15, 18, 21];

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function minOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function pctFromMin(min: number): number {
  const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, min));
  return ((clamped - DAY_START_MIN) / DAY_RANGE_MIN) * 100;
}
function widthPct(start: string, end: string): number {
  const dur = Math.max(15, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return Math.max(1.5, (dur / DAY_RANGE_MIN) * 100);
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  /** Fecha controlada (YYYY-MM-DD). Si no se pasa, el componente maneja su propia fecha. */
  date?: string;
  /** Callback cuando cambia la fecha — solo si se controla externa. */
  onDateChange?: (iso: string) => void;
  /** Override de tenant (drill-down a sucursal del mismo grupo). */
  tenantId?: string | null;
  /** Click en una cita — si no se pasa, usa un alert simple por defecto. */
  onApptClick?: (appt: StylistAppt, stylist: StylistRow) => void;
  /** Mostrar la barra de filtros (date-picker + buscar + ocultar sin actividad). */
  showToolbar?: boolean;
  /** Mostrar las 6 tarjetas KPI de resumen. */
  showSummary?: boolean;
  /** Mostrar la sección "Próximo turno por servicio". */
  showFichero?: boolean;
};

const StylistDayView: React.FC<Props> = ({
  date: controlledDate,
  onDateChange,
  tenantId,
  onApptClick,
  showToolbar = true,
  showSummary = true,
  showFichero = true,
}) => {
  const { formatCurrency } = useCurrency();

  const [internalDate, setInternalDate] = useState<string>(todayISO());
  const date = controlledDate ?? internalDate;
  const setDate = (iso: string) => {
    if (onDateChange) onDateChange(iso);
    if (controlledDate === undefined) setInternalDate(iso);
  };

  const [data, setData] = useState<StylistsDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string> = { date };
    if (tenantId) params.tenant_id = tenantId;
    api
      .get<StylistsDayResponse>("/dashboard-v2/stylists-day", { params })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        console.error("StylistDayView fetch", err);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, tenantId]);

  const isToday = date === todayISO();

  const nowPct = useMemo(() => {
    if (!isToday) return null;
    const d = new Date();
    const m = d.getHours() * 60 + d.getMinutes();
    if (m < DAY_START_MIN || m > DAY_END_MIN) return null;
    return ((m - DAY_START_MIN) / DAY_RANGE_MIN) * 100;
  }, [isToday, data]);

  const filteredStylists = useMemo<StylistRow[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.stylists.filter((s) => {
      const name = `${s.first_name} ${s.last_name || ""}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (hideEmpty) {
        const hasActivity =
          s.appointments.length > 0 ||
          s.open_tickets.count > 0 ||
          s.sales_today.services_sold > 0 ||
          s.sales_today.products_sold > 0 ||
          s.geo.in_salon;
        if (!hasActivity) return false;
      }
      return true;
    });
  }, [data, search, hideEmpty]);

  const nextByCategory = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { category_id: string; category_name: string; candidates: { stylist: StylistRow; position: number }[] }>();
    for (const s of data.stylists) {
      for (const q of s.queues) {
        if (!q.is_active) continue;
        if (!map.has(q.category_id)) {
          map.set(q.category_id, { category_id: q.category_id, category_name: q.category_name, candidates: [] });
        }
        map.get(q.category_id)!.candidates.push({ stylist: s, position: q.position });
      }
    }
    return Array.from(map.values())
      .map((row) => {
        const inSalon = row.candidates.filter((c) => c.stylist.geo.in_salon).sort((a, b) => a.position - b.position);
        const fallback = row.candidates.slice().sort((a, b) => a.position - b.position);
        const next = inSalon.length > 0 ? inSalon[0] : fallback[0];
        return {
          category_id: row.category_id,
          category_name: row.category_name,
          next_stylist: next ? next.stylist : null,
          next_position: next ? next.position : null,
          in_salon: !!(next && next.stylist.geo.in_salon),
          active_count: row.candidates.length,
          in_salon_count: row.candidates.filter((c) => c.stylist.geo.in_salon).length,
        };
      })
      .sort((a, b) => a.category_name.localeCompare(b.category_name));
  }, [data]);

  const handleClickAppt = (appt: StylistAppt, stylist: StylistRow) => {
    if (onApptClick) onApptClick(appt, stylist);
  };

  return (
    <div>
      {showToolbar && (
        <Card className="mb-3">
          <CardBody className="py-3">
            <Row className="align-items-center g-2">
              <Col md={4} className="d-flex align-items-center gap-2">
                <Button color="soft-secondary" size="sm" onClick={() => setDate(shiftDate(date, -1))}>
                  <i className="ri-arrow-left-s-line" />
                </Button>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ maxWidth: 180 }}
                />
                <Button color="soft-secondary" size="sm" onClick={() => setDate(shiftDate(date, 1))}>
                  <i className="ri-arrow-right-s-line" />
                </Button>
                <Button color={isToday ? "primary" : "soft-primary"} size="sm" onClick={() => setDate(todayISO())}>
                  Hoy
                </Button>
              </Col>
              <Col md={5}>
                <Input
                  type="text"
                  placeholder="Buscar estilista..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
              <Col md={3} className="text-md-end">
                <label className="d-inline-flex align-items-center gap-2 mb-0">
                  <Input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                  <span className="small">Ocultar sin actividad</span>
                </label>
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* Cuando NO hay toolbar igual mostramos un mini-control de búsqueda + ocultar */}
      {!showToolbar && (
        <div className="d-flex align-items-center gap-2 mb-2">
          <Input
            type="text"
            placeholder="Buscar estilista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bsSize="sm"
            style={{ maxWidth: 240 }}
          />
          <label className="d-inline-flex align-items-center gap-2 mb-0 small">
            <Input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
            Ocultar sin actividad
          </label>
        </div>
      )}

      {showSummary && data && (
        <Row className="g-2 mb-3">
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">En salón</div>
                <h4 className="mb-0">
                  {data.summary.stylists_in_salon}
                  <small className="text-muted fs-14">/{data.summary.stylists_total}</small>
                </h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">Citas del día</div>
                <h4 className="mb-0">{data.summary.appointments_total}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">En curso</div>
                <h4 className="mb-0 text-warning">{data.summary.appointments_in_progress}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">Cobradas</div>
                <h4 className="mb-0 text-success">{data.summary.appointments_completed}</h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">Tickets abiertos</div>
                <h4 className="mb-0">
                  {data.summary.open_tickets_count}
                  <small className="text-muted fs-14 ms-1">{formatCurrency(data.summary.open_tickets_amount)}</small>
                </h4>
              </CardBody>
            </Card>
          </Col>
          <Col md={2} sm={4} xs={6}>
            <Card className="mb-0">
              <CardBody className="py-2 px-3">
                <div className="text-muted fs-12">Ingreso del día</div>
                <h4 className="mb-0 text-success">{formatCurrency(data.summary.revenue_today)}</h4>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {showFichero && data && nextByCategory.length > 0 && (
        <Card className="mb-3">
          <CardBody className="py-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">
                <i className="ri-list-ordered me-2 text-primary" />
                Próximo turno por servicio
              </h6>
              <small className="text-muted">Estilistas en salón tienen prioridad</small>
            </div>
            <Row className="g-2">
              {nextByCategory.map((row) => (
                <Col md={3} sm={4} xs={6} key={row.category_id}>
                  <div
                    style={{
                      padding: 10,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      background: row.in_salon ? "#ecfdf5" : "#f9fafb",
                      borderLeft: `4px solid ${row.in_salon ? "#10b981" : "#9ca3af"}`,
                      height: "100%",
                    }}
                  >
                    <div className="text-truncate fw-semibold" style={{ fontSize: 12, color: "#374151" }} title={row.category_name}>
                      {row.category_name}
                    </div>
                    {row.next_stylist ? (
                      <>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {row.next_stylist.avatar_url ? (
                            <img
                              src={row.next_stylist.avatar_url}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: "#e5e7eb",
                                color: "#6b7280",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {(row.next_stylist.first_name?.[0] || "?").toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="text-truncate fw-semibold" style={{ fontSize: 13 }}>
                              {row.next_stylist.first_name} {row.next_stylist.last_name || ""}
                            </div>
                            <div style={{ fontSize: 10, color: row.in_salon ? "#059669" : "#9ca3af" }}>
                              {row.in_salon ? "● EN SALÓN" : "○ FUERA"} · #{row.next_position}
                            </div>
                          </div>
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: 10 }}>
                          {row.in_salon_count} disponible{row.in_salon_count === 1 ? "" : "s"} de {row.active_count} activa
                          {row.active_count === 1 ? "" : "s"}
                        </div>
                      </>
                    ) : (
                      <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                        Nadie en cola
                      </div>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="text-center p-5">
          <Spinner /> <span className="ms-2">Cargando...</span>
        </div>
      ) : data && filteredStylists.length > 0 ? (
        <Card>
          <CardBody className="p-0">
            <div className="d-none d-md-flex align-items-center" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ width: 280, padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                ESTILISTA
              </div>
              <div style={{ flex: 1, position: "relative", padding: "10px 8px", fontSize: 11, color: "#9ca3af" }}>
                {HOUR_MARKS.map((h) => (
                  <span
                    key={h}
                    style={{
                      position: "absolute",
                      left: `${pctFromMin(60 * h)}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {String(h).padStart(2, "0")}h
                  </span>
                ))}
              </div>
              <div
                style={{
                  width: 220,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                ACTIVIDAD
              </div>
            </div>

            {filteredStylists.map((s) => {
              const inSalon = s.geo.in_salon;
              const appts = s.appointments;
              const activeQueues = s.queues.filter((q) => q.is_active);
              return (
                <div
                  key={s.stylist_id}
                  className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center"
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <div className="d-flex align-items-center gap-3" style={{ width: 280, padding: "10px 14px", minWidth: 0 }}>
                    <div style={{ flexShrink: 0 }}>
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            background: "#e5e7eb",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {(s.first_name?.[0] || "?").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="fw-semibold text-truncate">
                        {s.first_name} {s.last_name || ""}
                      </div>
                      <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 600,
                            background: inSalon ? "#d1fae5" : "#f3f4f6",
                            color: inSalon ? "#065f46" : "#6b7280",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: inSalon ? "#10b981" : "#9ca3af",
                            }}
                          />
                          {inSalon ? "EN SALÓN" : "FUERA"}
                        </span>
                        {s.payment_type === "salary" && (
                          <Badge color="soft-secondary" pill style={{ fontSize: 10 }}>
                            Nómina
                          </Badge>
                        )}
                      </div>
                      {activeQueues.length > 0 && (
                        <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                          {activeQueues.map((q) => (
                            <Badge
                              key={q.category_id}
                              color={q.position === 1 ? "info" : "soft-info"}
                              pill
                              style={{ fontSize: 10 }}
                              title={q.position === 1 ? `Es la siguiente en ${q.category_name}` : `Posición ${q.position} en ${q.category_name}`}
                            >
                              <i className="ri-list-ordered me-1" />#{q.position} {q.category_name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-grow-1" style={{ padding: "10px 8px", minWidth: 0 }}>
                    <div
                      style={{
                        position: "relative",
                        background: "#f9fafb",
                        height: 36,
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {HOUR_MARKS.map((h) => (
                        <div
                          key={h}
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: `${pctFromMin(60 * h)}%`,
                            borderLeft: "1px dashed #e5e7eb",
                          }}
                        />
                      ))}
                      {appts.map((a) => {
                        const left = pctFromMin(minOfDay(a.start_time));
                        const w = widthPct(a.start_time, a.end_time);
                        const color = STATUS_COLOR[a.status] || "#9ca3af";
                        const timeLabel = fmtTime(a.start_time);
                        return (
                          <div
                            key={a.id}
                            onClick={() => handleClickAppt(a, s)}
                            title={`${STATUS_LABEL[a.status]} · ${timeLabel} · ${a.service_name} · ${a.client_name}`}
                            style={{
                              position: "absolute",
                              top: 3,
                              bottom: 3,
                              left: `${left}%`,
                              width: `${w}%`,
                              background: color,
                              borderRadius: 4,
                              opacity: a.status === "cancelled" ? 0.4 : 0.95,
                              cursor: "pointer",
                              overflow: "hidden",
                              color: "white",
                              fontSize: 10,
                              padding: "2px 5px",
                              lineHeight: "12px",
                              whiteSpace: "nowrap",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                            }}
                          >
                            {w > 4 && <span style={{ fontWeight: 700, fontSize: 10 }}>{timeLabel}</span>}
                            {w > 10 && (
                              <span style={{ fontSize: 9, opacity: 0.92, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {a.service_name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {nowPct != null && (
                        <div
                          style={{
                            position: "absolute",
                            top: -2,
                            bottom: -2,
                            left: `${nowPct}%`,
                            width: 2,
                            background: "#ef4444",
                          }}
                        />
                      )}
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-1" style={{ fontSize: 11, color: "#6b7280" }}>
                      <span>
                        {appts.length} cita{appts.length === 1 ? "" : "s"}
                      </span>
                      <span>·</span>
                      <span className="text-success">
                        {appts.filter((a) => ["completed", "checked_out"].includes(a.status)).length} ✓
                      </span>
                      <span>·</span>
                      <span className="text-warning">
                        {appts.filter((a) => a.status === "checked_in").length} en curso
                      </span>
                      {appts.filter((a) => a.status === "scheduled").length > 0 && (
                        <>
                          <span>·</span>
                          <span>
                            {appts.filter((a) => a.status === "scheduled").length} pendiente
                            {appts.filter((a) => a.status === "scheduled").length === 1 ? "" : "s"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="d-flex flex-column" style={{ width: 220, padding: "10px 14px", textAlign: "right" }}>
                    <div className="d-flex justify-content-end align-items-baseline gap-2">
                      <span className="fs-12 text-muted">Vendido hoy</span>
                      <span className="fw-semibold text-success">{formatCurrency(s.sales_today.revenue)}</span>
                    </div>
                    <div className="fs-11 text-muted text-end">
                      {s.sales_today.services_sold} serv · {s.sales_today.products_sold} prod
                    </div>
                    {s.open_tickets.count > 0 && (
                      <div className="d-flex justify-content-end align-items-baseline gap-2 mt-1">
                        <Badge color="warning" pill>
                          <i className="ri-bill-line me-1" />
                          {s.open_tickets.count} abierto{s.open_tickets.count === 1 ? "" : "s"} · {formatCurrency(s.open_tickets.total)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="text-center text-muted py-5">No hay estilistas para mostrar.</CardBody>
        </Card>
      )}

      <Card className="mt-3">
        <CardBody className="py-2 px-3 d-flex flex-wrap align-items-center gap-3" style={{ fontSize: 11 }}>
          <span className="text-muted fw-semibold">LEYENDA:</span>
          <LegendBox color={STATUS_COLOR.scheduled} label="Agendado" />
          <LegendBox color={STATUS_COLOR.checked_in} label="En curso" />
          <LegendBox color={STATUS_COLOR.checked_out} label="Listo para cobrar" />
          <LegendBox color={STATUS_COLOR.completed} label="Pagado" />
          <LegendBox color={STATUS_COLOR.cancelled} label="Cancelado" opacity={0.35} />
          <span>·</span>
          <LegendDot color="#10b981" label="En salón" />
          <LegendDot color="#9ca3af" label="Fuera" />
          <span>·</span>
          <span>
            <span style={{ display: "inline-block", width: 2, height: 12, background: "#ef4444", verticalAlign: "middle", marginRight: 4 }} />
            Hora actual
          </span>
        </CardBody>
      </Card>
    </div>
  );
};

const LegendBox: React.FC<{ color: string; label: string; opacity?: number }> = ({ color, label, opacity }) => (
  <span>
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 3,
        background: color,
        verticalAlign: "middle",
        marginRight: 4,
        opacity,
      }}
    />
    {label}
  </span>
);

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span>
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        verticalAlign: "middle",
        marginRight: 4,
      }}
    />
    {label}
  </span>
);

export default StylistDayView;
