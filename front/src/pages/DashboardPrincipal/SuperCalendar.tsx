import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardBody, Spinner, Input, Button } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../../contexts/CurrencyContext";
import { api } from "../../services/api";
import AppointmentDetailDrawer, { ApptDetail } from "../../Components/Calendar/AppointmentDetailDrawer";

type ApptStatus =
  | "scheduled"
  | "rescheduled"
  | "pending_approval"
  | "checked_in"
  | "checked_out"
  | "completed"
  | "cancelled";

type ApptShort = {
  id: string;
  start_time: string;
  end_time?: string;
  status: ApptStatus;
  service_id?: string;
  service_name: string;
  service_price?: number;
  stylist_id?: string;
  stylist_name: string;
  client_id?: string;
  client_name: string;
};

type FicheroRow = {
  category_id: string;
  category_name: string;
  position: number;
  stylist_id: string;
  stylist_name: string;
  in_salon: boolean;
};

type LowStockProduct = { id: string; name: string; stock: number };

type StylistRevenue = {
  stylist_id: string;
  stylist_name: string;
  services_sold: number;
  products_sold: number;
  revenue: number;
};

type Branch = {
  id: string;
  name: string;
  color: string;
  stylists: { total: number; in_salon: number };
  appointments: {
    total: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    upcoming_count: number;
    current: ApptShort[];
    next: ApptShort[];
    pending_payment: ApptShort[];
  };
  pending_payment: { count: number; amount: number };
  fichero: FicheroRow[];
  open_tickets: { count: number; amount: number };
  revenue_today: number;
  low_stock: { count: number; products: LowStockProduct[] };
  stylist_revenue?: StylistRevenue[];
};

type BranchesResponse = { date: string; branches: Branch[] };

const STATUS_LABEL: Record<ApptStatus, string> = {
  scheduled: "Agendada",
  rescheduled: "Reagendada",
  pending_approval: "Por aprobar",
  checked_in: "En curso",
  checked_out: "Listo para cobrar",
  completed: "Pagada",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<ApptStatus, string> = {
  scheduled: "#9ca3af",
  rescheduled: "#9ca3af",
  pending_approval: "#a78bfa",
  checked_in: "#f59e0b",
  checked_out: "#06b6d4",
  completed: "#059669",
  cancelled: "#ef4444",
};

const LS_AUTOREFRESH = "supercal_autorefresh";
const LS_HIDDEN_BRANCHES = "supercal_hidden_branches";

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
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateTitle(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function colorFromString(s: string): string {
  const palette = [
    "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
    "#10b981", "#3b82f6", "#ef4444", "#0ea5e9", "#a855f7",
  ];
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return palette[Math.abs(hash) % palette.length];
}

const SuperCalendar: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const [date, setDate] = useState<string>(todayISO());
  const [data, setData] = useState<BranchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => localStorage.getItem(LS_AUTOREFRESH) === "1");
  const [drawerAppt, setDrawerAppt] = useState<ApptDetail | null>(null);
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(LS_HIDDEN_BRANCHES);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: resp } = await api.get<BranchesResponse>("/dashboard-v2/branches-day", { params: { date } });
      setData(resp);
    } catch (err: any) {
      console.error("SuperCalendar fetch error:", err);
      setData(null);
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error || err?.message || "Error desconocido";
      setErrorMsg(status ? `${status}: ${apiMsg}` : apiMsg);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh cada 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => {
      const next = !prev;
      localStorage.setItem(LS_AUTOREFRESH, next ? "1" : "0");
      return next;
    });
  };

  const toggleBranchHidden = (id: string) => {
    setHiddenBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(LS_HIDDEN_BRANCHES, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const visibleBranches = useMemo<Branch[]>(() => {
    if (!data) return [];
    return data.branches.filter((b) => !hiddenBranches.has(b.id));
  }, [data, hiddenBranches]);

  const isToday = date === todayISO();

  const handleApptClick = (appt: ApptShort, branch: Branch) => {
    setDrawerAppt({
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.status,
      service_name: appt.service_name || "Servicio",
      service_price: appt.service_price,
      stylist_id: appt.stylist_id,
      stylist_name: appt.stylist_name,
      client_id: appt.client_id,
      client_name: appt.client_name || "Sin cliente",
      branch_name: branch.name,
      tenant_id: branch.id,
    });
  };

  const handleDrawerReschedule = (a: ApptDetail) => {
    // SuperCalendar no tiene AppointmentModal local; abrimos /calendar con la sucursal
    if (a.tenant_id) {
      navigate(`/calendar?branch=${a.tenant_id}&view=stylists`);
    } else {
      navigate("/calendar");
    }
  };

  return (
    <div>
      <style>{`
        .branch-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .branch-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08) !important;
        }
        .branch-footer-btn .footer-arrow {
          transition: transform 0.18s ease;
        }
        .branch-footer-btn:hover {
          background: var(--branch-color, #6b7280) !important;
          color: #fff !important;
          border-style: solid !important;
        }
        .branch-footer-btn:hover .footer-arrow {
          transform: translateX(4px);
        }
        .appt-row {
          transition: background 0.12s ease;
        }
        .appt-row:hover {
          background: #f9fafb;
        }
        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          animation: supercal-pulse-ring 1.5s infinite;
        }
        @keyframes supercal-pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55); }
          70% { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
      `}</style>
      {/* Toolbar superior */}
      <Card className="border shadow-sm mb-3">
        <CardBody className="py-2">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <Button color="soft-secondary" size="sm" onClick={() => setDate(shiftDate(date, -1))}>
              <i className="ri-arrow-left-s-line" />
            </Button>
            <Input
              type="date"
              bsSize="sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <Button color="soft-secondary" size="sm" onClick={() => setDate(shiftDate(date, 1))}>
              <i className="ri-arrow-right-s-line" />
            </Button>
            <Button color={isToday ? "primary" : "soft-primary"} size="sm" onClick={() => setDate(todayISO())}>
              Hoy
            </Button>
            <h6 className="mb-0 ms-2 d-none d-md-block">{formatDateTitle(date)}</h6>
            {loading && <Spinner size="sm" className="ms-2" />}

            <div className="ms-auto d-flex align-items-center gap-2">
              <label className="d-inline-flex align-items-center gap-1 mb-0 small">
                <Input type="checkbox" checked={autoRefresh} onChange={toggleAutoRefresh} />
                <span>Auto-refresh 60s</span>
              </label>
              {data && data.branches.length > 1 && (
                <div className="d-flex flex-wrap align-items-center gap-1">
                  {data.branches.map((b) => {
                    const hidden = hiddenBranches.has(b.id);
                    return (
                      <span
                        key={b.id}
                        onClick={() => toggleBranchHidden(b.id)}
                        className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded border"
                        style={{
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          background: hidden ? "transparent" : `${b.color}1a`,
                          borderColor: hidden ? "#dee2e6" : b.color,
                          opacity: hidden ? 0.5 : 1,
                        }}
                        title={hidden ? "Mostrar" : "Ocultar"}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: b.color,
                            display: "inline-block",
                          }}
                        />
                        {b.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Resumen agregado del grupo */}
      {data && visibleBranches.length > 0 && (
        <GroupSummary branches={visibleBranches} formatCurrency={formatCurrency} />
      )}

      {/* Grilla kanban de sucursales */}
      {loading && !data ? (
        <Card>
          <CardBody className="text-center py-5">
            <Spinner /> <span className="ms-2 text-muted">Cargando sucursales...</span>
          </CardBody>
        </Card>
      ) : errorMsg ? (
        <Card>
          <CardBody className="text-center py-5">
            <i className="ri-error-warning-line text-danger" style={{ fontSize: 28 }} />
            <div className="mt-2 text-danger fw-semibold">No se pudo cargar el SuperCalendario</div>
            <div className="text-muted small mt-1">{errorMsg}</div>
            <Button size="sm" color="soft-secondary" className="mt-3" onClick={fetchData}>
              Reintentar
            </Button>
          </CardBody>
        </Card>
      ) : !data || data.branches.length === 0 ? (
        <Card>
          <CardBody className="text-center text-muted py-5">
            No se encontraron sucursales asociadas a tu cuenta.
          </CardBody>
        </Card>
      ) : visibleBranches.length === 0 ? (
        <Card>
          <CardBody className="text-center text-muted py-5">
            Todas las sucursales están ocultas. Activa al menos una en el filtro de arriba.
          </CardBody>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {visibleBranches.map((b) => (
            <BranchColumn
              key={b.id}
              branch={b}
              isToday={isToday}
              formatCurrency={formatCurrency}
              onApptClick={(a) => handleApptClick(a, b)}
              onOpenDrillDown={() => navigate(`/calendar?branch=${b.id}&view=stylists`)}
            />
          ))}
        </div>
      )}

      <AppointmentDetailDrawer
        isOpen={drawerAppt !== null}
        onClose={() => setDrawerAppt(null)}
        appointment={drawerAppt}
        onReschedule={handleDrawerReschedule}
        onChanged={fetchData}
      />
    </div>
  );
};

const GroupSummary: React.FC<{ branches: Branch[]; formatCurrency: (n: number) => string }> = ({
  branches,
  formatCurrency,
}) => {
  const agg = branches.reduce(
    (acc, b) => {
      acc.in_salon += b.stylists.in_salon;
      acc.stylists_total += b.stylists.total;
      acc.appts_total += b.appointments.total;
      acc.completed += b.appointments.completed;
      acc.in_progress += b.appointments.in_progress;
      acc.revenue += b.revenue_today;
      acc.pending_count += b.pending_payment.count;
      acc.pending_amount += b.pending_payment.amount;
      acc.tickets_count += b.open_tickets.count;
      acc.tickets_amount += b.open_tickets.amount;
      acc.low_stock += b.low_stock.count;
      return acc;
    },
    {
      in_salon: 0,
      stylists_total: 0,
      appts_total: 0,
      completed: 0,
      in_progress: 0,
      revenue: 0,
      pending_count: 0,
      pending_amount: 0,
      tickets_count: 0,
      tickets_amount: 0,
      low_stock: 0,
    }
  );

  const Stat: React.FC<{ label: string; value: React.ReactNode; color?: string; sub?: string }> = ({
    label,
    value,
    color,
    sub,
  }) => (
    <div className="px-3 py-2" style={{ minWidth: 0, flex: "1 1 0" }}>
      <div className="text-muted text-uppercase" style={{ fontSize: 10, letterSpacing: 0.6 }}>
        {label}
      </div>
      <div className="fw-bold" style={{ fontSize: 20, lineHeight: 1.1, color: color || "#111827" }}>
        {value}
      </div>
      {sub && (
        <div className="text-muted" style={{ fontSize: 11 }}>
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-sm mb-3">
      <CardBody className="p-0">
        <div className="d-flex flex-wrap align-items-stretch divide-stats">
          <Stat
            label="En salón"
            value={
              <>
                <span style={{ color: agg.in_salon > 0 ? "#10b981" : "#9ca3af" }}>{agg.in_salon}</span>
                <small className="text-muted ms-1" style={{ fontSize: 13 }}>
                  /{agg.stylists_total}
                </small>
              </>
            }
            sub={`${branches.length} sucursal${branches.length === 1 ? "" : "es"}`}
          />
          <Stat label="Citas hoy" value={agg.appts_total} sub={`${agg.in_progress} en curso`} />
          <Stat label="Cobradas" value={agg.completed} color="#059669" />
          <Stat label="Ingreso" value={formatCurrency(agg.revenue)} color="#059669" />
          {agg.pending_count > 0 && (
            <Stat
              label="Por cobrar"
              value={agg.pending_count}
              color="#0e7490"
              sub={formatCurrency(agg.pending_amount)}
            />
          )}
          {agg.tickets_count > 0 && (
            <Stat
              label="Tickets abiertos"
              value={agg.tickets_count}
              color="#92400e"
              sub={formatCurrency(agg.tickets_amount)}
            />
          )}
          {agg.low_stock > 0 && <Stat label="Stock bajo" value={agg.low_stock} color="#991b1b" />}
        </div>
      </CardBody>
      <style>{`
        .divide-stats > * + * { border-left: 1px solid #f1f5f9; }
        @media (max-width: 768px) {
          .divide-stats > * + * { border-left: none; border-top: 1px solid #f1f5f9; }
        }
      `}</style>
    </Card>
  );
};

const MiniKpi: React.FC<{ label: string; value: React.ReactNode; color?: string; icon?: string }> = ({
  label,
  value,
  color,
  icon,
}) => (
  <div className="text-center flex-fill" style={{ minWidth: 0 }}>
    <div className="d-flex align-items-baseline justify-content-center" style={{ gap: 4 }}>
      {icon && <i className={icon} style={{ fontSize: 11, color: color || "#9ca3af", opacity: 0.7 }} />}
      <div className="fw-bold" style={{ color: color || "#111827", fontSize: 17, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
    <div className="text-muted text-uppercase text-truncate mt-1" style={{ fontSize: 9, letterSpacing: 0.5 }}>
      {label}
    </div>
  </div>
);

const AlertPill: React.FC<{
  icon: string;
  label: string;
  bg: string;
  fg: string;
  border: string;
  title?: string;
}> = ({ icon, label, bg, fg, border, title }) => (
  <span
    className="d-inline-flex align-items-center"
    style={{
      gap: 4,
      padding: "3px 8px",
      borderRadius: 12,
      background: bg,
      color: fg,
      border: `1px solid ${border}`,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
    title={title}
  >
    <i className={icon} />
    {label}
  </span>
);

const BranchColumn: React.FC<{
  branch: Branch;
  isToday: boolean;
  formatCurrency: (n: number) => string;
  onApptClick: (a: ApptShort) => void;
  onOpenDrillDown: () => void;
}> = ({ branch, isToday, formatCurrency, onApptClick, onOpenDrillDown }) => {
  const { stylists, appointments, fichero, open_tickets, pending_payment, revenue_today, low_stock } = branch;
  const stylistRevenue = branch.stylist_revenue || [];
  const hasActivity =
    stylists.in_salon > 0 ||
    appointments.total > 0 ||
    open_tickets.count > 0 ||
    pending_payment.count > 0 ||
    revenue_today > 0;

  const completionPct = appointments.total > 0 ? (appointments.completed / appointments.total) * 100 : 0;

  return (
    <Card
      className="branch-card mb-0 shadow-sm"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTop: `4px solid ${branch.color}`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <CardBody className="d-flex flex-column p-0" style={{ flex: 1, minHeight: 0 }}>
        {/* Header sucursal con barra de color */}
        <div
          className="d-flex align-items-center"
          style={{
            gap: 10,
            padding: "10px 14px",
            background: `linear-gradient(135deg, ${branch.color}1f, ${branch.color}05)`,
            borderBottom: `1px solid ${branch.color}33`,
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: branch.color,
              color: "#fff",
              boxShadow: `0 2px 6px ${branch.color}66`,
            }}
          >
            <i className="ri-store-2-line" style={{ fontSize: 15 }} />
          </div>
          <h6 className="mb-0 fw-bold text-truncate flex-grow-1" title={branch.name} style={{ color: "#1f2937" }}>
            {branch.name}
          </h6>
        </div>

        <div className="d-flex flex-column" style={{ padding: 14, gap: 12, flex: 1, minHeight: 0 }}>
        {/* KPIs principales */}
        <div className="d-flex justify-content-between gap-1">
          <MiniKpi
            label="EN SALÓN"
            icon="ri-user-line"
            value={
              <>
                <span style={{ color: stylists.in_salon > 0 ? "#10b981" : "#9ca3af" }}>{stylists.in_salon}</span>
                <small className="text-muted ms-1" style={{ fontSize: 11 }}>
                  /{stylists.total}
                </small>
              </>
            }
          />
          <MiniKpi label="CITAS" icon="ri-calendar-line" value={appointments.total} />
          <MiniKpi label="COBRADAS" icon="ri-check-line" value={appointments.completed} color="#059669" />
          <MiniKpi
            label="INGRESO"
            icon="ri-money-dollar-circle-line"
            value={<span title={formatCurrency(revenue_today)}>{formatCurrency(revenue_today)}</span>}
            color="#059669"
          />
        </div>

        {/* Barra de progreso del día */}
        {appointments.total > 0 && (
          <div>
            <div
              className="d-flex justify-content-between"
              style={{
                fontSize: 9,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              <span>Avance del día</span>
              <span>{Math.round(completionPct)}%</span>
            </div>
            <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${completionPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  transition: "width 0.4s ease",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        )}

        {/* Pills de alertas (única fila compacta, scroll horizontal si sobran) */}
        {(pending_payment.count > 0 || open_tickets.count > 0 || low_stock.count > 0) && (
          <div
            className="d-flex flex-wrap"
            style={{ gap: 4 }}
          >
            {pending_payment.count > 0 && (
              <AlertPill
                icon="ri-alarm-warning-line"
                label={`${pending_payment.count} por cobrar · ${formatCurrency(pending_payment.amount)}`}
                bg="#cffafe"
                fg="#0e7490"
                border="#a5f3fc"
              />
            )}
            {open_tickets.count > 0 && (
              <AlertPill
                icon="ri-bill-line"
                label={`${open_tickets.count} ticket${open_tickets.count === 1 ? "" : "s"} · ${formatCurrency(open_tickets.amount)}`}
                bg="#fef3c7"
                fg="#92400e"
                border="#fde68a"
              />
            )}
            {low_stock.count > 0 && (
              <AlertPill
                icon="ri-archive-line"
                label={`${low_stock.count} stock bajo`}
                bg="#fee2e2"
                fg="#991b1b"
                border="#fecaca"
                title={low_stock.products.map((p) => `${p.name} (${p.stock})`).join("\n")}
              />
            )}
          </div>
        )}

        {/* Contenido principal: lista + secciones (crece con flex) */}
        <div className="d-flex flex-column" style={{ gap: 12, flex: 1 }}>
          {!hasActivity ? (
            <div className="text-center py-4" style={{ color: "#9ca3af" }}>
              <i className="ri-cup-line" style={{ fontSize: 30, opacity: 0.4 }} />
              <div className="small fst-italic mt-2">Sin actividad hoy</div>
              <div style={{ fontSize: 10 }}>Esperando a empezar</div>
            </div>
          ) : (
            <>
              {isToday && appointments.current.length > 0 && (
                <Section title="Ahora" count={appointments.in_progress} accent="#f59e0b" pulse>
                  {appointments.current.map((a) => (
                    <ApptItem key={a.id} appt={a} onClick={() => onApptClick(a)} showTime={false} formatCurrency={formatCurrency} />
                  ))}
                </Section>
              )}

              {appointments.pending_payment.length > 0 && (
                <Section
                  title="Listas para cobrar"
                  count={appointments.pending_payment.length}
                  accent="#06b6d4"
                >
                  {appointments.pending_payment.slice(0, 4).map((a) => (
                    <ApptItem key={a.id} appt={a} onClick={() => onApptClick(a)} showTime={false} formatCurrency={formatCurrency} />
                  ))}
                  {appointments.pending_payment.length > 4 && (
                    <div className="text-muted small ps-1">+{appointments.pending_payment.length - 4} más</div>
                  )}
                </Section>
              )}

              {stylistRevenue.length > 0 && (
                <Section title="Ganancia por estilista" count={stylistRevenue.length} accent="#059669">
                  {stylistRevenue.slice(0, 5).map((s) => (
                    <StylistRevenueItem key={s.stylist_id} item={s} formatCurrency={formatCurrency} />
                  ))}
                  {stylistRevenue.length > 5 && (
                    <div className="text-muted small ps-1">+{stylistRevenue.length - 5} más</div>
                  )}
                </Section>
              )}

              <Section
                title={isToday ? "Próximas" : "Agendadas"}
                count={appointments.upcoming_count}
                accent="#6b7280"
              >
                {appointments.next.length === 0 ? (
                  <div className="text-muted small fst-italic ps-1">
                    {isToday ? "No hay próximas citas" : "Sin agenda"}
                  </div>
                ) : (
                  <>
                    {appointments.next.map((a) => (
                      <ApptItem key={a.id} appt={a} onClick={() => onApptClick(a)} showTime={true} formatCurrency={formatCurrency} />
                    ))}
                    {appointments.upcoming_count > appointments.next.length && (
                      <div className="text-muted small ps-1">
                        +{appointments.upcoming_count - appointments.next.length} más
                      </div>
                    )}
                  </>
                )}
              </Section>

              {isToday && fichero.length > 0 && (
                <Section title="Fichero · próximo turno" accent="#6b7280">
                  {fichero.slice(0, 5).map((f) => (
                    <div key={f.category_id} className="d-flex align-items-center gap-2 small ps-1">
                      <span
                        className="text-muted text-truncate"
                        style={{ minWidth: 0, maxWidth: "32%", fontSize: 11 }}
                        title={f.category_name}
                      >
                        {f.category_name}
                      </span>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: f.in_salon ? "#10b981" : "#9ca3af",
                          flexShrink: 0,
                        }}
                        title={f.in_salon ? "En salón" : "Fuera"}
                      />
                      <span className="text-truncate flex-grow-1" style={{ minWidth: 0, fontSize: 12 }}>
                        {f.stylist_name}
                      </span>
                      <span
                        className="text-muted ms-auto"
                        style={{ fontSize: 10, fontWeight: 600 }}
                      >
                        #{f.position}
                      </span>
                    </div>
                  ))}
                  {fichero.length > 5 && (
                    <div className="text-muted small ps-1">+{fichero.length - 5} categorías</div>
                  )}
                </Section>
              )}
            </>
          )}
        </div>

        {/* Pie con drill-down */}
        <button
          type="button"
          onClick={onOpenDrillDown}
          className="branch-footer-btn btn btn-sm w-100 mt-auto d-flex align-items-center justify-content-center"
          style={{
            background: "transparent",
            color: branch.color,
            border: `1px dashed ${branch.color}55`,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            gap: 4,
            ...({ "--branch-color": branch.color } as React.CSSProperties),
          }}
        >
          <span>Ver agenda detalle</span>
          <i className="ri-arrow-right-line footer-arrow" />
        </button>
        </div>
      </CardBody>
    </Card>
  );
};

const Section: React.FC<{
  title: string;
  count?: number;
  accent?: string;
  pulse?: boolean;
  children: React.ReactNode;
}> = ({ title, count, accent, pulse, children }) => (
  <div>
    <div
      className="d-flex align-items-center justify-content-between mb-1"
      style={{ paddingBottom: 3, borderBottom: "1px solid #f1f5f9" }}
    >
      <span
        className="fw-semibold text-uppercase d-inline-flex align-items-center"
        style={{ fontSize: 10, letterSpacing: 0.6, color: accent || "#6b7280", gap: 6 }}
      >
        {pulse && <span className="pulse-dot" style={{ background: accent || "#f59e0b" }} />}
        {title}
      </span>
      {typeof count === "number" && (
        <span
          className="text-muted"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {count}
        </span>
      )}
    </div>
    <div className="d-flex flex-column" style={{ gap: 2 }}>
      {children}
    </div>
  </div>
);

const StylistRevenueItem: React.FC<{
  item: StylistRevenue;
  formatCurrency: (n: number) => string;
}> = ({ item, formatCurrency }) => {
  const stylistColor = colorFromString(item.stylist_name || "?");
  const breakdown = [
    item.services_sold > 0 ? `${item.services_sold} servicio${item.services_sold === 1 ? "" : "s"}` : null,
    item.products_sold > 0 ? `${item.products_sold} producto${item.products_sold === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="d-flex align-items-center"
      style={{ gap: 7, padding: "4px 6px", borderRadius: 5, fontSize: 12 }}
      title={`${item.stylist_name} · ${breakdown || "sin desglose"}`}
    >
      <span
        className="d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: stylistColor,
          color: "#fff",
          fontSize: 9,
          letterSpacing: 0.3,
        }}
      >
        {getInitials(item.stylist_name)}
      </span>
      <span className="text-truncate" style={{ minWidth: 0, flex: 1, color: "#374151" }}>
        {item.stylist_name}
      </span>
      {breakdown && (
        <span className="text-muted text-truncate" style={{ fontSize: 10, maxWidth: "35%", flexShrink: 0 }}>
          {breakdown}
        </span>
      )}
      <span style={{ color: "#059669", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
        {formatCurrency(item.revenue)}
      </span>
    </div>
  );
};

const ApptItem: React.FC<{
  appt: ApptShort;
  onClick: () => void;
  showTime: boolean;
  formatCurrency: (n: number) => string;
}> = ({ appt, onClick, showTime, formatCurrency }) => {
  const color = STATUS_COLOR[appt.status] || "#9ca3af";
  const stylistColor = colorFromString(appt.stylist_name || "?");
  const hasPrice = typeof appt.service_price === "number" && appt.service_price > 0;
  return (
    <div
      onClick={onClick}
      className="appt-row d-flex align-items-center"
      style={{ gap: 7, cursor: "pointer", padding: "4px 6px", borderRadius: 5, fontSize: 12 }}
      title={`${STATUS_LABEL[appt.status]} · ${appt.service_name} · ${appt.stylist_name} → ${appt.client_name}`}
    >
      {showTime ? (
        <span className="fw-semibold" style={{ minWidth: 38, flexShrink: 0, color: "#374151", fontSize: 11 }}>
          {fmtTime(appt.start_time)}
        </span>
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
      )}
      <span
        className="d-inline-flex align-items-center justify-content-center fw-bold flex-shrink-0"
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: stylistColor,
          color: "#fff",
          fontSize: 9,
          letterSpacing: 0.3,
        }}
        title={appt.stylist_name}
      >
        {getInitials(appt.stylist_name)}
      </span>
      <span className="text-truncate" style={{ minWidth: 0, flex: 1, color: "#374151" }} title={appt.service_name}>
        {appt.service_name}
      </span>
      {hasPrice && (
        <span style={{ color: "#059669", fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
          {formatCurrency(appt.service_price as number)}
        </span>
      )}
      <span
        className="text-muted text-truncate"
        style={{ fontSize: 11, maxWidth: "30%", flexShrink: 0 }}
        title={`${appt.stylist_name} — ${appt.client_name}`}
      >
        {appt.client_name}
      </span>
    </div>
  );
};

export default SuperCalendar;
