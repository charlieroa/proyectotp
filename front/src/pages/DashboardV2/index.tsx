// DashboardV2 — vista hub: 3 sucursales (resumen) + agenda + tickets + KPIs.
// Data del backend en /api/dashboard-v2/branches-day y /api/dashboard-v2/stylists-day.
// Estilos: reactstrap + Bootstrap utilities + tokens SC del SuperCalendar.
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, CardBody, Button, Input, Spinner, Offcanvas, OffcanvasBody, OffcanvasHeader, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter, Label, Row as BRow, Col as BCol } from "reactstrap";
import {
  SC,
  FS,
  SP,
  RAD,
  colorFromString,
} from "../DashboardPrincipal/superCalendarTheme";
import { api } from "../../services/api";
import QuickAppointmentDrawer from "../../Components/Calendar/QuickAppointmentDrawer";
import TicketsModal from "../../Components/Tickets/TicketsModal";
import PointOfSale from "../PointOfSale";

// ─── Types ─────────────────────────────────────────────────
type ApptStatus = "scheduled" | "rescheduled" | "pending_approval" | "checked_in" | "checked_out" | "completed" | "cancelled";

const STATUS_COLOR: Record<ApptStatus, string> = {
  scheduled: "#cbd5e1",
  rescheduled: "#cbd5e1",
  pending_approval: "#a78bfa",
  checked_in: SC.info,
  checked_out: SC.warn,
  completed: SC.success,
  cancelled: SC.dim,
};

type ApiAppt = {
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

type FicheroNextRow = {
  category_id: string;
  category_name: string;
  position: number;
  stylist_id: string;
  stylist_name: string;
  in_salon: boolean;
};

type FicheroQueueStylist = {
  queue_id: string;
  stylist_id: string;
  first_name: string;
  last_name: string;
  position: number;
  is_active: boolean;
  is_inside_geofence: boolean;
};

type FicheroQueueCategory = {
  category_id: string;
  category_name: string;
  stylists: FicheroQueueStylist[];
};

type ApiBranch = {
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
    current: ApiAppt[];
    next: ApiAppt[];
    pending_payment: ApiAppt[];
  };
  pending_payment: { count: number; amount: number };
  open_tickets: { count: number; amount: number };
  revenue_today: number;
  low_stock: { count: number; products: { id: string; name: string; stock: number }[] };
  fichero?: FicheroNextRow[];
};

type BranchesResponse = { date: string; branches: ApiBranch[] };

type ApiStylist = {
  stylist_id: string;
  first_name: string;
  last_name: string;
  geo: { in_salon: boolean };
  appointments: {
    id: string;
    start_time: string;
    end_time?: string;
    status: ApptStatus;
    service_name: string;
    price: number;
    client_name: string;
  }[];
  sales_today: { revenue: number };
};

type StylistsResponse = { date: string; stylists: ApiStylist[] };

type ApiTicket = {
  id: string;
  ref: string;
  status: "open" | "paid" | "closed" | "completed" | "cancelled";
  total_amount: number;
  created_at: string;
  appointment_id?: string;
  client_name: string;
  item_count: number;
  seller_first_names: string[];
  seller_full_names: string[];
};

type BranchTicketsResponse = {
  tenant_id: string;
  date: string | null;
  open: ApiTicket[];
  paid_today: ApiTicket[];
  summary: {
    open_count: number;
    open_total: number;
    paid_today_count: number;
    paid_today_total: number;
  };
};


// ─── Helpers ───────────────────────────────────────────────
const INDIGO = "#4f46e5";
const HOUR_H = 52;
const HOUR_START = 8;
const HOUR_END = 19;
const STYLIST_COL_MIN = 130;

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtCO = (n: number): string => {
  return n >= 1_000_000
    ? `$ ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000
    ? `$ ${Math.round(n / 1000)}k`
    : `$ ${Math.round(n)}`;
};

const fmtFullCO = (n: number): string => `$ ${Math.round(n).toLocaleString("es-CO")}`;

const fmtTime = (h: number, m = 0): string => `${String(Math.floor(h)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const fmtDateLong = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const apptToDecimal = (iso: string): { hour: number; minute: number; decimal: number } => {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes(), decimal: d.getHours() + d.getMinutes() / 60 };
};

const initialsOf = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const shiftDate = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Page ──────────────────────────────────────────────────
const DashboardV2: React.FC = () => {
  const [date, setDate] = useState<string>(todayISO());
  const [agendaMode, setAgendaMode] = useState<"list" | "grid">("list");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const [branchesData, setBranchesData] = useState<BranchesResponse | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [stylistsData, setStylistsData] = useState<StylistsResponse | null>(null);
  const [ticketsData, setTicketsData] = useState<BranchTicketsResponse | null>(null);
  const [ficheroQueue, setFicheroQueue] = useState<FicheroQueueCategory[] | null>(null);

  const [appointmentDrawerOpen, setAppointmentDrawerOpen] = useState<boolean>(false);
  const [appointmentDefaultDate, setAppointmentDefaultDate] = useState<Date | null>(null);
  const [ticketsModalOpen, setTicketsModalOpen] = useState<boolean>(false);
  const [showAllTickets, setShowAllTickets] = useState<boolean>(false);
  const [posOpen, setPosOpen] = useState<{ ticketId: string; targetTenantId: string } | null>(null);
  const [anticipoOpen, setAnticipoOpen] = useState<boolean>(false);
  const [prestamoOpen, setPrestamoOpen] = useState<boolean>(false);

  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  document.title = "Dashboard v2 | Tupelukeria";

  // Fetch branches-day
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<BranchesResponse>("/dashboard-v2/branches-day", { params: { date } });
      setBranchesData(data);
      if (data.branches.length > 0 && !data.branches.find((b) => b.id === activeBranchId)) {
        setActiveBranchId(data.branches[0].id);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error || err?.message || "Error desconocido";
      setError(status ? `${status}: ${apiMsg}` : apiMsg);
      setBranchesData(null);
    } finally {
      setLoading(false);
    }
  }, [date, activeBranchId]);

  useEffect(() => { fetchBranches(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchBranches(), 60_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchBranches]);

  // Fetch stylists-day for active branch when grid mode
  useEffect(() => {
    if (agendaMode !== "grid" || !activeBranchId) {
      setStylistsData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<StylistsResponse>("/dashboard-v2/stylists-day", { params: { date, tenant_id: activeBranchId } });
        if (!cancelled) setStylistsData(data);
      } catch (err) {
        if (!cancelled) setStylistsData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [agendaMode, activeBranchId, date]);

  // Fetch branch-tickets for active branch
  useEffect(() => {
    if (!activeBranchId) {
      setTicketsData(null);
      return;
    }
    setShowAllTickets(false);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<BranchTicketsResponse>("/dashboard-v2/branch-tickets", { params: { date, tenant_id: activeBranchId } });
        if (!cancelled) setTicketsData(data);
      } catch (err) {
        if (!cancelled) setTicketsData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeBranchId, date]);

  // Fetch fichero full queue (include_absent=true → no filtra geofence)
  const fetchFicheroQueue = useCallback(async () => {
    if (!activeBranchId) {
      setFicheroQueue(null);
      return;
    }
    try {
      const { data } = await api.get<FicheroQueueCategory[]>(`/fichero/tenant/${activeBranchId}`, { params: { include_absent: true } });
      setFicheroQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      setFicheroQueue([]);
    }
  }, [activeBranchId]);

  useEffect(() => { fetchFicheroQueue(); }, [fetchFicheroQueue, date]);

  // Listen for ticket created event to refresh tickets list
  useEffect(() => {
    const onTicketCreated = () => {
      if (!activeBranchId) return;
      api
        .get<BranchTicketsResponse>("/dashboard-v2/branch-tickets", { params: { date, tenant_id: activeBranchId } })
        .then(({ data }) => setTicketsData(data))
        .catch(() => {});
    };
    window.addEventListener("ticketCreated", onTicketCreated);
    return () => window.removeEventListener("ticketCreated", onTicketCreated);
  }, [activeBranchId, date]);

  // Derived: active branch
  const activeBranch = useMemo(
    () => branchesData?.branches.find((b) => b.id === activeBranchId) || null,
    [branchesData, activeBranchId]
  );

  // Derived: appointments of active branch (combina current + next + pending_payment + completados)
  const branchAppts = useMemo<ApiAppt[]>(() => {
    if (!activeBranch) return [];
    const all = [
      ...activeBranch.appointments.current,
      ...activeBranch.appointments.next,
      ...activeBranch.appointments.pending_payment,
    ];
    // dedupe por id
    const seen = new Set<string>();
    const out: ApiAppt[] = [];
    for (const a of all) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      if (search) {
        const s = search.toLowerCase();
        if (
          !a.client_name.toLowerCase().includes(s) &&
          !a.service_name.toLowerCase().includes(s) &&
          !(a.stylist_name || "").toLowerCase().includes(s)
        ) continue;
      }
      out.push(a);
    }
    return out.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [activeBranch, search]);

  // Footer KPIs aggregated
  const footerKpis = useMemo(() => {
    const branches = branchesData?.branches || [];
    const stylistsTotal = branches.reduce((s, b) => s + b.stylists.total, 0);
    const stylistsInSalon = branches.reduce((s, b) => s + b.stylists.in_salon, 0);
    const apptsTotal = branches.reduce((s, b) => s + b.appointments.total, 0);
    const apptsInProgress = branches.reduce((s, b) => s + b.appointments.in_progress, 0);
    const apptsCompleted = branches.reduce((s, b) => s + b.appointments.completed, 0);
    const revenueTotal = branches.reduce((s, b) => s + b.revenue_today, 0);
    const pendingCount = branches.reduce((s, b) => s + b.pending_payment.count, 0);
    const pendingAmount = branches.reduce((s, b) => s + b.pending_payment.amount, 0);
    const openTicketsCount = branches.reduce((s, b) => s + b.open_tickets.count, 0);
    const openTicketsAmount = branches.reduce((s, b) => s + b.open_tickets.amount, 0);
    const lowStockTotal = branches.reduce((s, b) => s + b.low_stock.count, 0);
    return {
      stylists: { total: stylistsTotal, in_salon: stylistsInSalon },
      appointments: { total: apptsTotal, in_progress: apptsInProgress, completed: apptsCompleted },
      revenue: revenueTotal,
      pending_payment: { count: pendingCount, amount: pendingAmount },
      open_tickets: { count: openTicketsCount, amount: openTicketsAmount },
      low_stock: lowStockTotal,
    };
  }, [branchesData]);

  return (
    <div className="page-content page-content-flush">
      <style>{`
        .dv2-row:hover { background: ${SC.surface2}; }
        .dv2-pulse {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${SC.danger};
          display: inline-block;
          animation: dv2-pulse 1.5s infinite;
        }
        @keyframes dv2-pulse {
          0%   { box-shadow: 0 0 0 0 ${SC.danger}80; }
          70%  { box-shadow: 0 0 0 7px ${SC.danger}00; }
          100% { box-shadow: 0 0 0 0 ${SC.danger}00; }
        }
        @media (max-width: 1100px) {
          .dv2-two-col { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>

      <Container fluid>
        <Toolbar
          date={date}
          onPrev={() => setDate(shiftDate(date, -1))}
          onNext={() => setDate(shiftDate(date, 1))}
          onToday={() => setDate(todayISO())}
          onChangeDate={setDate}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          search={search}
          onSearchChange={setSearch}
          onNewAppointment={() => { setAppointmentDefaultDate(new Date(`${date}T09:00:00`)); setAppointmentDrawerOpen(true); }}
          onAnticipo={() => setAnticipoOpen(true)}
          onPrestamo={() => setPrestamoOpen(true)}
        />

        {error && (
          <Card className="border shadow-sm mt-2 mb-3">
            <CardBody>
              <div className="d-flex align-items-center gap-2" style={{ color: SC.danger }}>
                <i className="ri-error-warning-line" style={{ fontSize: 18 }} />
                <span style={{ fontSize: FS.md, fontWeight: 500 }}>Error cargando dashboard: {error}</span>
                <span className="flex-grow-1" />
                <Button color="light" size="sm" className="border" onClick={fetchBranches}>
                  <i className="ri-refresh-line me-1" /> Reintentar
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {loading && !branchesData && (
          <div className="d-flex justify-content-center py-5"><Spinner color="primary" /></div>
        )}

        {branchesData && branchesData.branches.length === 0 && (
          <Card className="border shadow-sm mt-3">
            <CardBody className="text-center py-5">
              <i className="ri-store-2-line" style={{ fontSize: 32, color: SC.dim }} />
              <div className="mt-2" style={{ fontSize: FS.lg, fontWeight: 600, color: SC.text }}>Sin sucursales</div>
              <div style={{ fontSize: FS.sm, color: SC.muted }}>Este tenant no tiene sucursales configuradas.</div>
            </CardBody>
          </Card>
        )}

        {branchesData && branchesData.branches.length > 0 && (
          <>
            {/* KPI band — arriba */}
            <Card className="border shadow-sm mt-2 mb-0">
              <CardBody className="p-0">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  <CompactKpi icon="ri-team-line" label="En salón" value={`${footerKpis.stylists.in_salon}/${footerKpis.stylists.total}`} divider />
                  <CompactKpi icon="ri-calendar-event-line" label="Citas hoy" value={String(footerKpis.appointments.total)} sub={`${footerKpis.appointments.in_progress} en curso`} divider />
                  <CompactKpi icon="ri-checkbox-circle-line" label="Cobrado" value={fmtCO(footerKpis.revenue)} divider />
                  <CompactKpi icon="ri-bill-line" label="Por cobrar" value={String(footerKpis.pending_payment.count)} sub={fmtCO(footerKpis.pending_payment.amount)} divider />
                  <CompactKpi icon="ri-file-list-3-line" label="Tickets abiertos" value={String(footerKpis.open_tickets.count)} sub={fmtCO(footerKpis.open_tickets.amount)} divider />
                  <CompactKpi icon="ri-archive-line" label="Stock bajo" value={String(footerKpis.low_stock)} sub="productos" />
                </div>
              </CardBody>
            </Card>

            {/* Grid sucursales */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: SP.xxl,
                marginTop: SP.lg,
              }}
            >
              {branchesData.branches.map((b) => (
                <BranchCard
                  key={b.id}
                  branch={b}
                  isActive={b.id === activeBranchId}
                  onClick={() => setActiveBranchId(b.id)}
                />
              ))}
            </div>

            {/* Two-column: Agenda + Tickets */}
            {activeBranch && (
              <div
                className="dv2-two-col"
                style={{
                  display: "grid",
                  gridTemplateColumns: agendaMode === "grid" ? "minmax(0, 3fr) minmax(0, 1fr)" : "minmax(0, 1.2fr) minmax(0, 1fr)",
                  gap: SP.xxl,
                  marginTop: SP.lg,
                }}
              >
                {/* Card Agenda */}
                <Card className="border shadow-sm mb-0">
                  <CardBody className="p-0">
                    <SectionTitle
                      dotColor={activeBranch.color}
                      label={`Agenda · ${branchShortName(activeBranch.name)}`}
                      count={branchAppts.length}
                      right={
                        <>
                          <ToggleSeg mode={agendaMode} onChange={setAgendaMode} />
                          {branchesData.branches.length > 1 && (
                            <Input
                              type="select"
                              bsSize="sm"
                              value={activeBranchId || ""}
                              onChange={(e) => setActiveBranchId(e.target.value)}
                              style={{ maxWidth: 130, height: 28 }}
                            >
                              {branchesData.branches.map((b) => (
                                <option key={b.id} value={b.id}>{branchShortName(b.name)}</option>
                              ))}
                            </Input>
                          )}
                        </>
                      }
                    />
                    {agendaMode === "list" ? (
                      <Timeline appts={branchAppts} />
                    ) : (
                      <CalendarGridFromApi
                        data={stylistsData}
                        onSlotClick={(hour) => {
                          const d = new Date(`${date}T00:00:00`);
                          d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
                          setAppointmentDefaultDate(d);
                          setAppointmentDrawerOpen(true);
                        }}
                      />
                    )}
                  </CardBody>
                </Card>

                {/* Card Tickets */}
                <Card className="border shadow-sm mb-0">
                  <CardBody className="p-0">
                    <SectionTitle
                      dotColor={activeBranch.color}
                      icon="ri-file-list-3-line"
                      iconColor={SC.warn}
                      label={`Tickets · ${branchShortName(activeBranch.name)}`}
                      count={ticketsData?.summary.open_count ?? 0}
                      right={
                        <>
                          {(ticketsData?.summary.open_count ?? 0) > 0 && <span className="dv2-pulse" />}
                          <Button color="primary" size="sm" className="d-inline-flex align-items-center gap-1" onClick={() => setTicketsModalOpen(true)}>
                            <i className="ri-bill-line" /> Abrir ticket
                          </Button>
                        </>
                      }
                    />
                    <TicketsCard
                      tickets={ticketsData}
                      branchColor={activeBranch.color}
                      showAll={showAllTickets}
                      onToggleShowAll={() => setShowAllTickets((v) => !v)}
                      onTicketClick={(t) => activeBranchId && setPosOpen({ ticketId: t.id, targetTenantId: activeBranchId })}
                    />
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Fichero Digital — abajo */}
            {activeBranch && (
              <Card className="border shadow-sm mt-3 mb-3">
                <CardBody className="p-0">
                  <SectionTitle
                    dotColor={activeBranch.color}
                    icon="ri-list-ordered"
                    iconColor={SC.info}
                    label={`Fichero · ${branchShortName(activeBranch.name)}`}
                    count={ficheroQueue ? ficheroQueue.filter((c) => c.stylists.length > 0).length : 0}
                  />
                  <FicheroPanel queue={ficheroQueue} branchColor={activeBranch.color} />
                </CardBody>
              </Card>
            )}
          </>
        )}
      </Container>

      <QuickAppointmentDrawer
        isOpen={appointmentDrawerOpen}
        onClose={() => setAppointmentDrawerOpen(false)}
        defaultDate={appointmentDefaultDate}
        targetTenantId={activeBranchId || undefined}
        onCreated={() => fetchBranches()}
      />

      <TicketsModal
        isOpen={ticketsModalOpen}
        onClose={() => setTicketsModalOpen(false)}
      />

      <AnticipoModal
        isOpen={anticipoOpen}
        onClose={() => setAnticipoOpen(false)}
        tenantId={activeBranchId}
      />
      <PrestamoModal
        isOpen={prestamoOpen}
        onClose={() => setPrestamoOpen(false)}
        tenantId={activeBranchId}
      />

      <Offcanvas
        isOpen={!!posOpen}
        toggle={() => setPosOpen(null)}
        direction="end"
        style={{ width: "min(1100px, 100vw)" }}
      >
        <OffcanvasHeader toggle={() => setPosOpen(null)} className="border-bottom">
          <span style={{ fontWeight: 600 }}>Cobrar ticket</span>
        </OffcanvasHeader>
        <OffcanvasBody className="p-0" style={{ overflowY: "auto" }}>
          {posOpen && (
            <PointOfSale
              embedded={{
                ticketId: posOpen.ticketId,
                targetTenantId: posOpen.targetTenantId,
                onClose: () => {
                  setPosOpen(null);
                  // refrescar tickets de la sucursal
                  if (activeBranchId) {
                    api
                      .get<BranchTicketsResponse>("/dashboard-v2/branch-tickets", { params: { date, tenant_id: activeBranchId } })
                      .then(({ data }) => setTicketsData(data))
                      .catch(() => {});
                    fetchBranches();
                  }
                },
              }}
            />
          )}
        </OffcanvasBody>
      </Offcanvas>
    </div>
  );
};

const branchShortName = (name: string): string => name.replace(/Tupeluker[ií]a\s*[·\-]\s*/i, "").trim() || name;

// ─── Anticipo Modal ────────────────────────────────────────
type StylistOpt = { id: string; first_name: string; last_name: string };

const AnticipoModal: React.FC<{ isOpen: boolean; onClose: () => void; tenantId: string | null }> = ({ isOpen, onClose, tenantId }) => {
  const [stylists, setStylists] = useState<StylistOpt[]>([]);
  const [stylistId, setStylistId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setErr(null);
    api.get<StylistOpt[]>(`/users/tenant/${tenantId}`, { params: { role_id: 3 } })
      .then(({ data }) => setStylists(Array.isArray(data) ? data : []))
      .catch(() => setStylists([]));
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) {
      setStylistId(""); setAmount(""); setDescription(""); setPaymentMethod("cash"); setErr(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!stylistId || !amount) { setErr("Estilista y monto son obligatorios."); return; }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { setErr("Monto inválido."); return; }
    setBusy(true);
    setErr(null);
    try {
      const stylist = stylists.find(s => s.id === stylistId);
      const stylistName = stylist ? `${stylist.first_name} ${stylist.last_name || ''}`.trim() : '';
      await api.post('/cash/movements', {
        type: 'payroll_advance',
        amount: n,
        description: description.trim() || `Anticipo a ${stylistName}`,
        category: 'payroll_advance',
        payment_method: paymentMethod,
        related_user_id: stylistId,
        related_entity_type: 'user',
        related_entity_id: stylistId,
        target_tenant_id: tenantId,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Error al crear el anticipo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered>
      <ModalHeader toggle={onClose}>
        <i className="ri-cash-line me-2 text-warning" />Crear anticipo
      </ModalHeader>
      <ModalBody>
        {err && <div className="alert alert-danger py-2 small">{err}</div>}
        <div className="mb-3">
          <Label className="form-label">Estilista</Label>
          <Input type="select" value={stylistId} onChange={(e) => setStylistId(e.target.value)}>
            <option value="">Selecciona estilista...</option>
            {stylists.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''}</option>
            ))}
          </Input>
        </div>
        <div className="mb-3">
          <Label className="form-label">Monto del anticipo</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0" />
          <small className="text-muted">Se descontará del próximo pago de nómina.</small>
        </div>
        <div className="mb-3">
          <Label className="form-label">Forma de pago</Label>
          <Input type="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="other">Otro</option>
          </Input>
          {paymentMethod === 'cash' && <small className="text-muted">Requiere caja abierta.</small>}
        </div>
        <div>
          <Label className="form-label">Descripción (opcional)</Label>
          <Input type="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo del anticipo..." />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button color="warning" onClick={handleSubmit} disabled={busy}>
          {busy ? <Spinner size="sm" className="me-2" /> : <i className="ri-check-line me-1" />}
          Crear anticipo
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ─── Préstamo Modal ────────────────────────────────────────
const PrestamoModal: React.FC<{ isOpen: boolean; onClose: () => void; tenantId: string | null }> = ({ isOpen, onClose, tenantId }) => {
  const [stylists, setStylists] = useState<StylistOpt[]>([]);
  const [stylistId, setStylistId] = useState<string>("");
  const [principal, setPrincipal] = useState<string>("");
  const [weeks, setWeeks] = useState<string>("4");
  const [interest, setInterest] = useState<string>("0");
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [busy, setBusy] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setErr(null);
    api.get<StylistOpt[]>(`/users/tenant/${tenantId}`, { params: { role_id: 3 } })
      .then(({ data }) => setStylists(Array.isArray(data) ? data : []))
      .catch(() => setStylists([]));
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) {
      setStylistId(""); setPrincipal(""); setWeeks("4"); setInterest("0"); setStartDate(todayISO()); setErr(null);
    }
  }, [isOpen]);

  const principalNum = Number(principal) || 0;
  const weeksNum = Number(weeks) || 0;
  const interestNum = Number(interest) || 0;
  const totalInterest = Math.round(principalNum * (interestNum / 100) * 100) / 100;
  const installment = weeksNum > 0 ? Math.round(((principalNum + totalInterest) / weeksNum) * 100) / 100 : 0;

  const handleSubmit = async () => {
    if (!stylistId || !principal || !weeks) { setErr("Todos los campos son obligatorios."); return; }
    if (principalNum <= 0) { setErr("Monto del préstamo inválido."); return; }
    if (weeksNum <= 0) { setErr("Semanas inválidas."); return; }
    if (interestNum < 0 || interestNum > 100) { setErr("Interés debe estar entre 0 y 100."); return; }
    setBusy(true);
    setErr(null);
    try {
      await api.post('/staff-loans', {
        stylist_id: stylistId,
        principal_amount: principalNum,
        weeks: weeksNum,
        interest_percent: interestNum,
        start_date: startDate,
        disburse_from_cash: true,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Error al crear el préstamo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
      <ModalHeader toggle={onClose}>
        <i className="ri-bank-line me-2 text-info" />Crear préstamo
      </ModalHeader>
      <ModalBody>
        {err && <div className="alert alert-danger py-2 small">{err}</div>}
        <div className="mb-3">
          <Label className="form-label">Estilista</Label>
          <Input type="select" value={stylistId} onChange={(e) => setStylistId(e.target.value)}>
            <option value="">Selecciona estilista...</option>
            {stylists.map(s => (
              <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''}</option>
            ))}
          </Input>
        </div>
        <BRow className="g-2">
          <BCol md={6}>
            <Label className="form-label">Monto del préstamo</Label>
            <Input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0" min="0" />
          </BCol>
          <BCol md={3}>
            <Label className="form-label">Semanas</Label>
            <Input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} min="1" />
          </BCol>
          <BCol md={3}>
            <Label className="form-label">Interés total %</Label>
            <Input type="number" value={interest} onChange={(e) => setInterest(e.target.value)} min="0" max="100" step="0.1" />
          </BCol>
        </BRow>
        <div className="mt-3 mb-3">
          <Label className="form-label">Fecha de primer pago</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        {principalNum > 0 && weeksNum > 0 && (
          <div className="p-3 rounded bg-light border">
            <div className="row g-2 small">
              <div className="col-6">Capital: <strong>{fmtFullCO(principalNum)}</strong></div>
              <div className="col-6">Interés total: <strong>{fmtFullCO(totalInterest)}</strong></div>
              <div className="col-6">Total a pagar: <strong>{fmtFullCO(principalNum + totalInterest)}</strong></div>
              <div className="col-6">Cuota semanal: <strong className="text-info">{fmtFullCO(installment)}</strong></div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button color="info" onClick={handleSubmit} disabled={busy}>
          {busy ? <Spinner size="sm" className="me-2" /> : <i className="ri-check-line me-1" />}
          Crear préstamo
        </Button>
      </ModalFooter>
    </Modal>
  );
};

// ─── Toolbar ───────────────────────────────────────────────
const Toolbar: React.FC<{
  date: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeDate: (d: string) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onNewAppointment: () => void;
  onAnticipo: () => void;
  onPrestamo: () => void;
}> = ({ date, onPrev, onNext, onToday, onChangeDate, autoRefresh, onAutoRefreshChange, search, onSearchChange, onNewAppointment, onAnticipo, onPrestamo }) => (
  <div
    className="d-flex flex-wrap align-items-center gap-2 mb-2 p-2 px-3"
    style={{ background: SC.surface, border: `1px solid ${SC.border}`, borderRadius: RAD.md }}
  >
    <h1 className="m-0" style={{ fontSize: FS.h2, fontWeight: 600, letterSpacing: "-0.015em", color: SC.text }}>
      Hoy · {fmtDateLong(date)}
    </h1>
    <div className="d-flex align-items-center gap-1">
      <Button color="light" size="sm" className="border" style={{ width: 28, height: 28, padding: 0 }} onClick={onPrev}>
        <i className="ri-arrow-left-s-line" />
      </Button>
      <Input type="date" bsSize="sm" value={date} onChange={(e) => onChangeDate(e.target.value)} style={{ maxWidth: 150, height: 28 }} />
      <Button color="light" size="sm" className="border" style={{ width: 28, height: 28, padding: 0 }} onClick={onNext}>
        <i className="ri-arrow-right-s-line" />
      </Button>
      <Button color="link" size="sm" className="text-muted px-2" onClick={onToday}>Hoy</Button>
    </div>
    <label className="d-inline-flex align-items-center gap-1 m-0" style={{ fontSize: FS.sm, color: SC.muted, fontWeight: 500 }}>
      <input type="checkbox" checked={autoRefresh} onChange={(e) => onAutoRefreshChange(e.target.checked)} /> Auto-refresh 60s
    </label>
    <div className="flex-grow-1" />
    <Input bsSize="sm" placeholder="Buscar cliente, servicio, estilista..." value={search} onChange={(e) => onSearchChange(e.target.value)} style={{ maxWidth: 280, height: 28 }} />
    <UncontrolledDropdown>
      <DropdownToggle
        size="sm"
        className="d-inline-flex align-items-center gap-1"
        style={{ background: "#0f172a", borderColor: "#0f172a", color: "#fff" }}
      >
        <i className="ri-flashlight-fill" style={{ color: "#fbbf24" }} /> Accesos rápidos
      </DropdownToggle>
      <DropdownMenu end>
        <DropdownItem onClick={onAnticipo}>
          <i className="ri-cash-line me-2 text-warning" /> Crear anticipo
        </DropdownItem>
        <DropdownItem onClick={onPrestamo}>
          <i className="ri-bank-line me-2 text-info" /> Crear préstamo
        </DropdownItem>
      </DropdownMenu>
    </UncontrolledDropdown>
    <Button color="success" size="sm" className="d-inline-flex align-items-center gap-1" onClick={onNewAppointment}>
      <i className="ri-calendar-event-line" /> Nueva cita
    </Button>
  </div>
);

// ─── Toggle list/grid ──────────────────────────────────────
const ToggleSeg: React.FC<{ mode: "list" | "grid"; onChange: (m: "list" | "grid") => void }> = ({ mode, onChange }) => (
  <div className="d-inline-flex" style={{ border: `1px solid ${SC.border2}`, borderRadius: RAD.sm, overflow: "hidden", background: SC.surface }}>
    <button
      type="button"
      onClick={() => onChange("list")}
      title="Lista"
      style={{
        height: 26, padding: "0 10px",
        background: mode === "list" ? SC.surface2 : "transparent",
        color: mode === "list" ? SC.text : SC.muted,
        fontSize: FS.sm,
        border: 0,
        cursor: "pointer",
      }}
    >
      <i className="ri-list-check" />
    </button>
    <button
      type="button"
      onClick={() => onChange("grid")}
      title="Calendario"
      style={{
        height: 26, padding: "0 10px",
        background: mode === "grid" ? SC.surface2 : "transparent",
        color: mode === "grid" ? SC.text : SC.muted,
        fontSize: FS.sm,
        border: 0,
        borderLeft: `1px solid ${SC.border2}`,
        cursor: "pointer",
      }}
    >
      <i className="ri-calendar-2-line" />
    </button>
  </div>
);

// ─── Section title ─────────────────────────────────────────
const SectionTitle: React.FC<{
  dotColor: string;
  icon?: string;
  iconColor?: string;
  label: string;
  count?: number;
  right?: React.ReactNode;
}> = ({ dotColor, icon, iconColor, label, count, right }) => (
  <div className="d-flex align-items-center gap-2" style={{ padding: "10px 14px", borderBottom: `1px solid ${SC.border}` }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
    {icon && <i className={icon} style={{ color: iconColor || SC.muted, fontSize: FS.md }} />}
    <span style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: SC.muted }}>{label}</span>
    {count !== undefined && (
      <span style={{ fontSize: FS.xs, fontWeight: 600, color: SC.dim, background: SC.surface2, padding: "1px 6px", borderRadius: RAD.pill }}>{count}</span>
    )}
    <span className="flex-grow-1" />
    <div className="d-flex align-items-center gap-2">{right}</div>
  </div>
);

// ─── Branch card ───────────────────────────────────────────
const BranchCard: React.FC<{ branch: ApiBranch; isActive: boolean; onClick: () => void }> = ({ branch, isActive, onClick }) => {
  const alerts: { tone: "amber" | "red"; icon: string; label: string; value: string }[] = [];
  if (branch.open_tickets.count > 0) {
    alerts.push({ tone: "amber", icon: "ri-alarm-warning-line", label: `${branch.open_tickets.count} tickets sin cobrar`, value: fmtCO(branch.open_tickets.amount) });
  }
  if (branch.low_stock.count > 0) {
    alerts.push({ tone: "red", icon: "ri-archive-line", label: "Stock bajo", value: `${branch.low_stock.count} prods` });
  }
  return (
    <Card
      className="border shadow-sm h-100"
      style={{
        cursor: "pointer",
        outline: isActive ? `2px solid ${branch.color}` : "none",
        outlineOffset: -1,
        overflow: "hidden",
      }}
      onClick={onClick}
    >
      <div style={{ height: 4, background: branch.color }} />
      <div className="d-flex align-items-center gap-2" style={{ padding: SP.xl, borderBottom: `1px solid ${SC.border}` }}>
        <div
          className="d-grid"
          style={{
            width: 36, height: 36,
            borderRadius: 7,
            background: branch.color,
            color: "#fff",
            placeItems: "center",
            fontSize: FS.xl,
            flex: "none",
          }}
        >
          <i className="ri-store-2-line" />
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="text-truncate" style={{ fontSize: FS.lg, fontWeight: 600, color: SC.text, letterSpacing: "-0.01em" }}>
            {branchShortName(branch.name)}
          </div>
          <div className="text-truncate" style={{ fontSize: FS.sm, color: SC.dim, fontWeight: 500, fontFeatureSettings: "'tnum'" }}>
            {branch.stylists.in_salon}/{branch.stylists.total} estilistas · {branch.appointments.total} citas
          </div>
        </div>
        {isActive && (
          <span
            className="d-inline-flex align-items-center gap-1"
            style={{
              padding: "1px 7px",
              borderRadius: RAD.pill,
              fontSize: 10,
              fontWeight: 600,
              color: SC.info,
              background: SC.infoBg,
              border: `1px solid ${SC.infoBorder}`,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 999, background: SC.info }} />
            Viendo
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: `1px solid ${SC.border}` }}>
        <KpiCell label="Cobrado" value={fmtCO(branch.revenue_today)} divider />
        <KpiCell label="Por cobrar" value={fmtCO(branch.pending_payment.amount)} divider />
        <KpiCell label="Tickets" value={`${branch.open_tickets.count} abiertos`} amber={branch.open_tickets.count > 0} />
      </div>

      {alerts.length > 0 && (
        <div>
          {alerts.map((a, i) => {
            const tone = a.tone === "amber"
              ? { color: SC.warn }
              : { color: SC.danger };
            return (
              <div
                key={i}
                className="dv2-row d-flex align-items-center gap-2"
                style={{
                  padding: "9px 14px",
                  borderBottom: i < alerts.length - 1 ? `1px solid ${SC.border}` : "none",
                  fontSize: FS.base,
                  cursor: "pointer",
                }}
              >
                <i className={a.icon} style={{ color: tone.color, fontSize: FS.lg }} />
                <span className="flex-grow-1 text-truncate" style={{ color: SC.text, fontWeight: 500 }}>{a.label}</span>
                <span style={{ fontWeight: 600, color: SC.text, fontFeatureSettings: "'tnum'", whiteSpace: "nowrap" }}>{a.value}</span>
                <i className="ri-arrow-right-s-line" style={{ color: SC.dim }} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const KpiCell: React.FC<{ label: string; value: string; divider?: boolean; amber?: boolean }> = ({ label, value, divider, amber }) => (
  <div
    style={{
      padding: "10px 12px",
      borderRight: divider ? `1px solid ${SC.border}` : "none",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    <div style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: SC.muted }}>{label}</div>
    <div style={{ fontSize: FS.h2, fontWeight: 700, letterSpacing: "-0.02em", color: amber ? SC.warn : SC.text, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>{value}</div>
  </div>
);

// ─── Timeline (list mode) ──────────────────────────────────
const Timeline: React.FC<{ appts: ApiAppt[] }> = ({ appts }) => {
  if (appts.length === 0) {
    return <Empty icon="ri-calendar-line" title="Sin citas" hint="Esta sucursal no tiene citas para el día seleccionado." />;
  }
  // Group by hour
  const byHour = new Map<number, ApiAppt[]>();
  for (const a of appts) {
    const h = new Date(a.start_time).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(a);
  }
  const hours = Array.from(byHour.keys()).sort((a, b) => a - b);
  const NOW = new Date().getHours();

  return (
    <div style={{ maxHeight: 600, overflow: "auto" }}>
      {hours.map((h, i) => {
        const isPast = h < NOW;
        const isNow = h === NOW;
        return (
          <div
            key={h}
            style={{
              display: "grid",
              gridTemplateColumns: "52px 1fr",
              borderBottom: i < hours.length - 1 ? `1px solid ${SC.border}` : "none",
            }}
          >
            <div
              style={{
                padding: "10px 8px",
                borderRight: `1px solid ${SC.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: 11,
                color: isNow ? INDIGO : SC.muted,
                fontWeight: isNow ? 700 : 500,
              }}
            >
              <span>{fmtTime(h)}</span>
              {isNow && <span style={{ fontSize: 8, color: INDIGO, textTransform: "uppercase", letterSpacing: "0.05em" }}>ahora</span>}
            </div>
            <div style={{ padding: "6px 0", display: "flex", flexDirection: "column", gap: 4, opacity: isPast ? 0.55 : 1 }}>
              {byHour.get(h)!.map((a) => <ApptRow key={a.id} appt={a} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ApptRow: React.FC<{ appt: ApiAppt }> = ({ appt }) => {
  const { hour, minute } = apptToDecimal(appt.start_time);
  const stylistInitials = initialsOf(appt.stylist_name);
  const present = appt.status === "checked_in" || appt.status === "checked_out";
  return (
    <div
      className="dv2-row"
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr auto auto",
        gap: 8,
        alignItems: "center",
        padding: "6px 12px 6px 10px",
        marginRight: 8,
        borderLeft: `3px solid ${STATUS_COLOR[appt.status]}`,
        borderRadius: "0 4px 4px 0",
        fontSize: FS.base,
        cursor: "pointer",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: FS.sm, color: SC.muted, fontWeight: 500 }}>
        {fmtTime(hour, minute)}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="text-truncate" style={{ fontWeight: 500, color: SC.text }}>{appt.service_name || "Servicio"}</div>
        <div className="text-truncate" style={{ fontSize: FS.sm, color: SC.dim }}>
          {appt.client_name}{appt.stylist_name ? ` · ${appt.stylist_name}` : ""}
        </div>
      </div>
      <span
        className="d-inline-grid"
        style={{
          width: 22, height: 22,
          borderRadius: 999,
          background: colorFromString(stylistInitials),
          color: "#fff",
          fontSize: 9,
          fontWeight: 600,
          placeItems: "center",
          boxShadow: present ? `0 0 0 2px ${SC.surface}, 0 0 0 4px ${SC.success}` : "none",
        }}
        title={appt.stylist_name}
      >
        {stylistInitials}
      </span>
      <span style={{ fontSize: FS.sm, fontWeight: 600, color: SC.text, fontFeatureSettings: "'tnum'" }}>
        {appt.service_price ? fmtCO(appt.service_price) : ""}
      </span>
    </div>
  );
};

// ─── Tickets card (real invoices) ──────────────────────────
const PREVIEW_LIMIT = 5;

const TicketsCard: React.FC<{
  tickets: BranchTicketsResponse | null;
  branchColor: string;
  showAll: boolean;
  onToggleShowAll: () => void;
  onTicketClick: (t: ApiTicket) => void;
}> = ({ tickets, branchColor, showAll, onToggleShowAll, onTicketClick }) => {
  if (!tickets) {
    return <div className="text-center py-3"><Spinner size="sm" color="primary" /></div>;
  }
  const open = tickets.open;
  const paidToday = tickets.paid_today;
  if (open.length === 0 && paidToday.length === 0) {
    return <Empty icon="ri-file-list-3-line" title="Sin tickets" hint="Cuando un cliente llegue, abre un ticket." />;
  }
  const openItems = showAll ? open : open.slice(0, PREVIEW_LIMIT);
  const paidItems = showAll ? paidToday : paidToday.slice(0, PREVIEW_LIMIT);
  const totalOver = open.length + paidToday.length;
  const previewTotal = openItems.length + paidItems.length;
  const hasMore = !showAll && totalOver > previewTotal;

  return (
    <div>
      {open.length > 0 && (
        <TicketGroup
          title="Abiertos"
          count={open.length}
          icon="ri-coins-line"
          tone={SC.warn}
          items={openItems}
          branchColor={branchColor}
          amountTone="warn"
          badge="cobrar"
          onTicketClick={onTicketClick}
        />
      )}
      {paidToday.length > 0 && (
        <TicketGroup
          title="Pagados hoy"
          count={paidToday.length}
          icon="ri-checkbox-circle-line"
          tone={SC.success}
          items={paidItems}
          branchColor={branchColor}
          topBorder={open.length > 0}
          amountTone="success"
          muted
          onTicketClick={onTicketClick}
        />
      )}
      {(hasMore || showAll) && (
        <button
          type="button"
          onClick={onToggleShowAll}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "transparent",
            border: "none",
            borderTop: `1px solid ${SC.border}`,
            color: SC.muted,
            fontSize: FS.sm,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "background .12s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = SC.surface2)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {showAll ? (
            <>
              <i className="ri-arrow-up-s-line" />
              Mostrar menos
            </>
          ) : (
            <>
              Ver todos los tickets ({totalOver})
              <i className="ri-arrow-down-s-line" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

const TicketGroup: React.FC<{
  title: string;
  count: number;
  icon: string;
  tone: string;
  items: ApiTicket[];
  branchColor: string;
  topBorder?: boolean;
  amountTone?: "warn" | "success" | "default";
  badge?: string;
  muted?: boolean;
  onTicketClick?: (t: ApiTicket) => void;
}> = ({ title, count, icon, tone, items, branchColor, topBorder, amountTone, badge, muted, onTicketClick }) => {
  const amountClass = amountTone === "warn" ? "text-warning" : amountTone === "success" ? "text-success" : "text-body";
  return (
    <div>
      <div
        className="d-flex align-items-center gap-2"
        style={{
          padding: topBorder ? "10px 14px 4px" : "8px 14px 4px",
          borderTop: topBorder ? `1px solid ${SC.border}` : "none",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: tone,
        }}
      >
        <i className={icon} />
        {title} · {count}
      </div>
      {items.map((t) => {
        const sellers = (t.seller_first_names || []).slice(0, 3);
        return (
          <div
            key={t.id}
            className="dv2-row"
            onClick={onTicketClick ? () => onTicketClick(t) : undefined}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto",
              gap: 10,
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: `1px solid ${SC.border}`,
              cursor: onTicketClick ? "pointer" : "default",
              fontSize: FS.base,
              opacity: muted ? 0.75 : 1,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: branchColor }} />
            <div style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2">
                <span className="text-truncate fw-semibold text-body">{t.client_name}</span>
                <span className="badge bg-light text-muted border" style={{ fontSize: 9, fontWeight: 600, fontFamily: "var(--font-mono, ui-monospace)" }}>
                  {t.ref}
                </span>
              </div>
              <div className="text-truncate text-muted" style={{ fontSize: 11 }}>
                {fmtTimeFromISO(t.created_at)} · {t.item_count} {t.item_count === 1 ? "item" : "items"}
                {t.appointment_id ? " · desde cita" : " · walk-in"}
              </div>
            </div>
            <div className="d-flex">
              {sellers.length === 0 ? (
                <span className="text-muted" style={{ fontSize: 11 }}>—</span>
              ) : sellers.map((nm, k) => {
                const ini = initialsOf(nm);
                return (
                  <span
                    key={k}
                    className="d-inline-grid"
                    title={t.seller_full_names?.[k] || nm}
                    style={{
                      width: 24, height: 24, borderRadius: 999,
                      background: colorFromString(ini),
                      color: "#fff", fontSize: 10, fontWeight: 600,
                      placeItems: "center",
                      marginLeft: k === 0 ? 0 : -6,
                      border: `2px solid ${SC.surface}`,
                    }}
                  >
                    {ini}
                  </span>
                );
              })}
            </div>
            <div className="text-end">
              <div className={`fw-bold ${amountClass}`} style={{ fontSize: 14 }}>
                {fmtFullCO(t.total_amount)}
              </div>
              {badge && (
                <div className="text-uppercase fw-semibold" style={{ fontSize: 9, color: tone, letterSpacing: "0.05em" }}>{badge}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const fmtTimeFromISO = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// ─── Fichero panel ─────────────────────────────────────────
// Cards informativas: próximo turno + 2 siguientes con tiempo estimado.
const FicheroPanel: React.FC<{
  queue: FicheroQueueCategory[] | null;
  branchColor: string;
}> = ({ queue, branchColor }) => {
  if (!queue) {
    return <div className="text-center py-4"><Spinner size="sm" color="primary" /></div>;
  }
  const cats = queue.filter((c) => c.stylists.some((s) => s.is_active));
  if (cats.length === 0) {
    return <Empty icon="ri-list-ordered" title="Sin fichero" hint="No hay estilistas en cola en este momento." />;
  }
  return (
    <div
      style={{
        padding: SP.lg,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: SP.lg,
      }}
    >
      {cats.map((cat) => (
        <FicheroCategoryCard key={cat.category_id} category={cat} branchColor={branchColor} />
      ))}
    </div>
  );
};

const SERVICE_DURATION_MIN = 45; // estimación promedio por turno
const fmtWait = (mins: number): string => {
  if (mins <= 0) return "Ahora";
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
};

const FicheroCategoryCard: React.FC<{
  category: FicheroQueueCategory;
  branchColor: string;
}> = ({ category, branchColor }) => {
  const sorted = [...category.stylists]
    .filter((s) => s.is_active)
    .sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return (
      <div style={{ padding: SP.lg, border: `1px solid ${SC.border}`, borderRadius: RAD.md, background: SC.surface }}>
        <div style={{ fontSize: FS.xs, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: SC.muted }}>
          {category.category_name}
        </div>
        <div style={{ fontSize: FS.sm, color: SC.dim, marginTop: 4 }}>Sin estilistas activos</div>
      </div>
    );
  }

  const next = sorted[0];
  const upcoming = sorted.slice(1, 3); // posiciones 2 y 3
  const moreCount = sorted.length - 3;
  const fullName = `${next.first_name || ""} ${next.last_name || ""}`.trim();
  const ini = initialsOf(fullName);

  return (
    <div
      style={{
        border: `1px solid ${SC.border}`,
        borderRadius: RAD.md,
        background: SC.surface,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          background: `${branchColor}0d`,
          borderBottom: `1px solid ${SC.border}`,
          borderLeft: `3px solid ${branchColor}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: FS.sm, fontWeight: 600, color: SC.text, letterSpacing: "-0.01em", flex: 1 }}>
          {category.category_name}
        </span>
        <span style={{ fontSize: FS.xs, fontWeight: 600, color: SC.muted, background: SC.surface2, padding: "1px 7px", borderRadius: RAD.pill }}>
          {sorted.length}
        </span>
      </div>

      {/* Próximo turno destacado */}
      <div style={{ padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <span
          className="d-inline-grid"
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: colorFromString(ini),
            color: "#fff",
            fontSize: FS.xl,
            fontWeight: 700,
            placeItems: "center",
            flex: "none",
            boxShadow: next.is_inside_geofence ? `0 0 0 2px ${SC.surface}, 0 0 0 4px ${SC.success}` : "none",
          }}
        >
          {ini}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: SC.success, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <i className="ri-time-line" />
            {next.is_inside_geofence ? "Disponible ahora" : "Próximo turno"}
          </div>
          <div className="text-truncate" style={{ fontSize: FS.lg, fontWeight: 600, color: SC.text, letterSpacing: "-0.01em" }}>
            {fullName || "Estilista"}
          </div>
          <div style={{ fontSize: FS.xs, color: next.is_inside_geofence ? SC.success : SC.dim, fontWeight: 500 }}>
            <i className={next.is_inside_geofence ? "ri-checkbox-circle-fill" : "ri-walk-line"} style={{ fontSize: FS.sm, marginRight: 3 }} />
            {next.is_inside_geofence ? "En salón" : "Fuera del salón"}
          </div>
        </div>
      </div>

      {/* Siguientes en cola */}
      {upcoming.length > 0 && (
        <div style={{ padding: "8px 14px 12px", borderTop: `1px dashed ${SC.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: SC.muted, marginBottom: 2 }}>
            Siguientes
          </div>
          {upcoming.map((s, i) => {
            const nm = `${s.first_name || ""} ${s.last_name || ""}`.trim();
            const initialsHere = initialsOf(nm);
            const wait = (i + 1) * SERVICE_DURATION_MIN;
            return (
              <div key={s.queue_id} className="d-flex align-items-center" style={{ gap: 8, fontSize: FS.sm }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: SC.surface2,
                    color: SC.muted,
                    fontSize: 10,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                    flex: "none",
                    fontFamily: "var(--font-mono, ui-monospace)",
                  }}
                >
                  {s.position}
                </span>
                <span
                  className="d-inline-grid"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: colorFromString(initialsHere),
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 600,
                    placeItems: "center",
                    flex: "none",
                    boxShadow: s.is_inside_geofence ? `0 0 0 1.5px ${SC.success}` : "none",
                  }}
                >
                  {initialsHere}
                </span>
                <span className="text-truncate" style={{ flex: 1, color: SC.text, fontWeight: 500 }}>
                  {nm || "Estilista"}
                </span>
                <span className="d-inline-flex align-items-center" style={{ gap: 3, fontSize: FS.xs, color: SC.muted, fontWeight: 600, flex: "none", fontFeatureSettings: "'tnum'" }}>
                  <i className="ri-timer-line" />
                  {fmtWait(wait)}
                </span>
              </div>
            );
          })}
          {moreCount > 0 && (
            <div style={{ fontSize: FS.xs, color: SC.dim, fontWeight: 500, paddingLeft: 26 }}>
              +{moreCount} más en cola
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Compact KPI ───────────────────────────────────────────
const CompactKpi: React.FC<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  divider?: boolean;
}> = ({ icon, label, value, sub, divider }) => (
  <div style={{ padding: "12px 14px", borderRight: divider ? `1px solid ${SC.border}` : "none", display: "flex", flexDirection: "column", gap: 4 }}>
    <div className="d-flex align-items-center gap-1" style={{ color: SC.muted }}>
      <i className={icon} style={{ fontSize: FS.md }} />
      <span style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    </div>
    <div style={{ fontSize: FS.h1, fontWeight: 700, letterSpacing: "-0.02em", color: SC.text, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>{value}</div>
    {sub && <div style={{ fontSize: FS.sm, fontWeight: 500, color: SC.dim }}>{sub}</div>}
  </div>
);

// ─── Empty state ───────────────────────────────────────────
const Empty: React.FC<{ icon: string; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="text-center" style={{ padding: "40px 14px" }}>
    <i className={icon} style={{ fontSize: 24, color: SC.dim }} />
    <div className="mt-2" style={{ fontSize: FS.sm, fontWeight: 500, color: SC.muted }}>{title}</div>
    <div style={{ fontSize: FS.sm, color: SC.dim }}>{hint}</div>
  </div>
);

// ─── Calendar grid (estilistas × horas) ────────────────────
const layoutAppts = <T extends { id: string; start: number; end: number }>(stylistAppts: T[]): Map<string, { col: number; total: number }> => {
  const sorted = [...stylistAppts].sort((a, b) => a.start - b.start);
  const cols: T[][] = [];
  for (const a of sorted) {
    let placed = false;
    for (const col of cols) {
      if (col[col.length - 1].end <= a.start) {
        col.push(a);
        placed = true;
        break;
      }
    }
    if (!placed) cols.push([a]);
  }
  const total = cols.length;
  const positions = new Map<string, { col: number; total: number }>();
  cols.forEach((col, ci) => col.forEach((a) => positions.set(a.id, { col: ci, total })));
  return positions;
};

type GridStylist = { id: string; initials: string; name: string; present: boolean; revenue: number; count: number };
type GridAppt = { id: string; stylistId: string; start: number; end: number; service: string; client: string; price: number; status: ApptStatus };

const CalendarGridFromApi: React.FC<{ data: StylistsResponse | null; onSlotClick?: (hour: number) => void }> = ({ data, onSlotClick }) => {
  if (!data) {
    return <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size="sm" color="primary" /></div>;
  }
  if (data.stylists.length === 0) {
    return <Empty icon="ri-team-line" title="Sin estilistas" hint="Esta sucursal no tiene estilistas activos." />;
  }

  const stylists: GridStylist[] = data.stylists.map((s) => ({
    id: s.stylist_id,
    initials: initialsOf(`${s.first_name} ${s.last_name}`.trim()),
    name: `${s.first_name} ${s.last_name || ""}`.trim(),
    present: s.geo.in_salon,
    revenue: s.sales_today.revenue,
    count: s.appointments.length,
  }));

  const appts: GridAppt[] = [];
  for (const s of data.stylists) {
    for (const a of s.appointments) {
      const start = apptToDecimal(a.start_time).decimal;
      const end = a.end_time ? apptToDecimal(a.end_time).decimal : start + 0.75;
      appts.push({
        id: a.id,
        stylistId: s.stylist_id,
        start,
        end,
        service: a.service_name,
        client: a.client_name,
        price: a.price,
        status: a.status,
      });
    }
  }

  return <CalendarGrid stylists={stylists} appointments={appts} onSlotClick={onSlotClick} />;
};

const CalendarGrid: React.FC<{ stylists: GridStylist[]; appointments: GridAppt[]; onSlotClick?: (hour: number) => void }> = ({ stylists, appointments, onSlotClick }) => {
  const hours = HOUR_END - HOUR_START;
  const totalHeight = hours * HOUR_H;
  const totalWidth = 52 + stylists.length * STYLIST_COL_MIN;
  const NOW = new Date().getHours() + new Date().getMinutes() / 60;

  return (
    <div style={{ overflow: "auto", maxHeight: 640, width: "100%", background: SC.surface }}>
      {/* Sticky header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `52px repeat(${stylists.length}, minmax(${STYLIST_COL_MIN}px, 1fr))`,
          minWidth: totalWidth,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: SC.surface,
          borderBottom: `1px solid ${SC.border}`,
        }}
      >
        <div style={{ height: 44 }} />
        {stylists.map((s) => (
          <div
            key={s.id}
            style={{
              borderLeft: `1px solid ${SC.border}`,
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              height: 44,
              boxSizing: "border-box",
            }}
          >
            <span
              className="d-inline-grid"
              style={{
                width: 22, height: 22,
                borderRadius: 999,
                background: colorFromString(s.initials),
                color: "#fff",
                fontSize: 9,
                fontWeight: 600,
                placeItems: "center",
                boxShadow: s.present ? `0 0 0 2px ${SC.surface}, 0 0 0 4px ${SC.success}` : "none",
                flex: "none",
              }}
            >
              {s.initials}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="text-truncate" style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: SC.text }}>{s.name.split(" ")[0]}</div>
              <div className="text-truncate" style={{ fontSize: 9, color: SC.dim, lineHeight: 1.2, fontFeatureSettings: "'tnum'" }}>
                {s.count} · {fmtCO(s.revenue)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Body grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `52px repeat(${stylists.length}, minmax(${STYLIST_COL_MIN}px, 1fr))`,
          minWidth: totalWidth,
          height: totalHeight,
          position: "relative",
        }}
      >
        {/* Hours column */}
        <div style={{ position: "relative", borderRight: `1px solid ${SC.border}` }}>
          {Array.from({ length: hours }, (_, i) => {
            const h = HOUR_START + i;
            const isNow = Math.floor(NOW) === h;
            return (
              <div
                key={h}
                style={{
                  position: "absolute",
                  top: i * HOUR_H,
                  left: 0,
                  right: 0,
                  height: HOUR_H,
                  borderTop: `1px solid ${SC.border}`,
                  padding: "4px 6px 0",
                  textAlign: "right",
                  fontFamily: "var(--font-mono, ui-monospace)",
                  fontSize: 10,
                  color: isNow ? INDIGO : SC.muted,
                  fontWeight: isNow ? 700 : 500,
                }}
              >
                {fmtTime(h)}
              </div>
            );
          })}
        </div>

        {/* Stylist columns */}
        {stylists.map((s) => {
          const stylistAppts = appointments.filter((a) => a.stylistId === s.id);
          const positions = layoutAppts(stylistAppts);
          return (
            <div
              key={s.id}
              style={{
                position: "relative",
                borderLeft: `1px solid ${SC.border}`,
              }}
            >
              {Array.from({ length: hours }, (_, i) => (
                <div
                  key={i}
                  onClick={onSlotClick ? () => onSlotClick(HOUR_START + i) : undefined}
                  style={{
                    position: "absolute",
                    top: i * HOUR_H,
                    left: 0,
                    right: 0,
                    height: HOUR_H,
                    borderTop: `1px solid ${SC.border}`,
                    background: HOUR_START + i < Math.floor(NOW) ? "rgba(0,0,0,0.015)" : "transparent",
                    cursor: onSlotClick ? "pointer" : "default",
                  }}
                >
                  <div style={{ position: "absolute", top: HOUR_H / 2, left: 0, right: 0, borderTop: `1px dashed ${SC.border}`, opacity: 0.5 }} />
                </div>
              ))}
              {NOW >= HOUR_START && NOW <= HOUR_END && (
                <div
                  style={{
                    position: "absolute",
                    top: (NOW - HOUR_START) * HOUR_H,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: INDIGO,
                    zIndex: 3,
                  }}
                >
                  <div style={{ position: "absolute", left: -3, top: -3, width: 8, height: 8, borderRadius: 999, background: INDIGO }} />
                </div>
              )}
              {stylistAppts.map((a) => {
                const top = (a.start - HOUR_START) * HOUR_H;
                const height = Math.max(22, (a.end - a.start) * HOUR_H - 2);
                const pos = positions.get(a.id) || { col: 0, total: 1 };
                const widthPct = 100 / pos.total;
                const leftPct = pos.col * widthPct;
                return (
                  <div
                    key={a.id}
                    style={{
                      position: "absolute",
                      top,
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${widthPct}% - 6px)`,
                      height,
                      borderLeft: `3px solid ${STATUS_COLOR[a.status]}`,
                      background: SC.surface,
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                      borderRadius: 4,
                      padding: "4px 6px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      overflow: "hidden",
                      zIndex: 1,
                      boxSizing: "border-box",
                    }}
                    title={`${a.service} · ${a.client}`}
                  >
                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono, ui-monospace)", color: SC.muted, lineHeight: 1.1 }}>
                      {fmtTime(Math.floor(a.start), Math.round((a.start % 1) * 60))}–{fmtTime(Math.floor(a.end), Math.round((a.end % 1) * 60))}
                    </span>
                    <div className="text-truncate" style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, color: SC.text }}>{a.service}</div>
                    {height > 44 && (
                      <div className="text-truncate" style={{ fontSize: 9, color: SC.dim, lineHeight: 1.2 }}>{a.client}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardV2;
