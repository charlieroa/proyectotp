// Operación — pantalla núcleo del rediseño /v2. Un solo flujo: Agenda → Ticket → Caja.
// Cableada a datos reales (/dashboard-v2/*, /cash/*) y reutiliza los componentes ya
// probados: AppointmentDetailDrawer, PointOfSale embebido y los modales de caja.
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Offcanvas, OffcanvasBody, OffcanvasHeader } from "reactstrap";
import { api } from "../../../services/api";
import { ScreenProps } from "../types";
import { T, FONT, fmtCOP, fmtCOPShort, colorFor, initials } from "../theme";
import { Kpi, KpiGrid, Panel, Mono, Empty, Loading } from "../components/ui";
import { useBranchesDay } from "../data/useV2Data";
import AppointmentDetailDrawer, { ApptDetail } from "../../../Components/Calendar/AppointmentDetailDrawer";
import NewAppointmentModal from "../components/NewAppointmentModal";
import PointOfSale from "../../PointOfSale";
import { ModalAbrirCaja, ModalResumenCierre } from "../../../Components/Calendar/CentroDeCitasDiarias";

type Tab = "agenda" | "tickets" | "caja";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Agendada", color: T.muted, bg: T.surface3 },
  rescheduled: { label: "Reagendada", color: T.muted, bg: T.surface3 },
  pending_approval: { label: "Por aprobar", color: T.purple, bg: T.purpleBg2 },
  checked_in: { label: "En curso", color: T.purple2, bg: T.purpleBg },
  checked_out: { label: "Por cobrar", color: T.amber, bg: T.amberBg },
  completed: { label: "Cobrada", color: T.green, bg: T.greenBg },
  cancelled: { label: "Cancelada", color: T.dim, bg: T.surface3 },
};

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const Operacion: React.FC<ScreenProps> = ({ date, newApptSignal }) => {
  const { branches, activeId, setActiveId, loading, error, refresh } = useBranchesDay(date);
  const active = useMemo(() => branches.find((b) => b.id === activeId) || null, [branches, activeId]);
  const [tab, setTab] = useState<Tab>("agenda");

  // agenda
  const [stylists, setStylists] = useState<any[]>([]);
  // tickets
  const [tickets, setTickets] = useState<any>(null);
  // caja
  const [cash, setCash] = useState<any | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [cashClose, setCashClose] = useState(false);

  // drawers / modales
  const [appt, setAppt] = useState<ApptDetail | null>(null);
  const [pos, setPos] = useState<{ ticketId: string; targetTenantId: string } | null>(null);
  const [newAppt, setNewAppt] = useState(false);

  // el shell dispara "Nueva atención" incrementando newApptSignal → abre el modal de cita
  useEffect(() => { if (newApptSignal) setNewAppt(true); }, [newApptSignal]);

  const fetchStylists = useCallback(() => {
    if (!activeId) return setStylists([]);
    api.get("/dashboard-v2/stylists-day", { params: { date, tenant_id: activeId } })
      .then(({ data }) => setStylists(data?.stylists || [])).catch(() => setStylists([]));
  }, [activeId, date]);

  const fetchTickets = useCallback(() => {
    if (!activeId) return setTickets(null);
    api.get("/dashboard-v2/branch-tickets", { params: { date, tenant_id: activeId } })
      .then(({ data }) => setTickets(data)).catch(() => setTickets(null));
  }, [activeId, date]);

  const fetchCash = useCallback(() => {
    if (!activeId) return setCash(null);
    api.get("/cash/current", { params: { target_tenant_id: activeId } })
      .then(({ data }) => setCash(data)).catch(() => setCash(null));
  }, [activeId]);

  useEffect(() => { fetchStylists(); fetchTickets(); fetchCash(); }, [fetchStylists, fetchTickets, fetchCash]);

  // citas aplanadas desde stylists-day
  const citas = useMemo(() => {
    const out: any[] = [];
    stylists.forEach((s) => {
      const stName = `${s.first_name} ${s.last_name || ""}`.trim();
      (s.appointments || []).forEach((a: any) => out.push({ ...a, stylist_name: stName, stylist_id: s.stylist_id }));
    });
    return out.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [stylists]);

  const openAppt = (a: any) => {
    setAppt({
      id: a.id, start_time: a.start_time, end_time: a.end_time, status: a.status,
      service_name: a.service_name, service_price: a.price, stylist_name: a.stylist_name,
      stylist_id: a.stylist_id, client_name: a.client_name, tenant_id: activeId || undefined,
    });
  };

  const refreshAll = () => { refresh(); fetchStylists(); fetchTickets(); fetchCash(); };

  if (loading && !branches.length) return <Loading label="Cargando operación…" />;
  if (error) return <Empty icon="⚠️" title="No se pudo cargar" hint={error} />;
  if (!active) return <Empty icon="🏪" title="Sin sucursales" hint="Este tenant no tiene sucursales configuradas." />;

  // KPIs de la sucursal activa
  const kEnSalon = `${active.stylists.in_salon}/${active.stylists.total}`;
  const kCitas = active.appointments?.total ?? citas.length;
  const kCobrado = active.revenue_today || 0;
  const kTickets = active.open_tickets?.count ?? 0;

  // etapa actual del flujo según la pestaña (Cita → Ticket → Caja → Nómina)
  const stage = tab === "agenda" ? 1 : tab === "tickets" ? 2 : 3;
  const steps = [
    { t: "Cita", s: "entra a la agenda" },
    { t: "Ticket", s: "se atiende y suma" },
    { t: "Caja", s: "se cobra" },
    { t: "Nómina", s: "reparte comisión" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.7px" }}>Operación del día</h1>
          <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 14 }}>
            Un solo flujo: la cita entra, se vuelve ticket, se cobra en caja y alimenta la nómina.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          {branches.length > 1 && (
            <select value={activeId || ""} onChange={(e) => setActiveId(e.target.value)} style={{ ...selStyle }}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={() => setNewAppt(true)} style={{ ...btnDark, display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Nueva cita
          </button>
        </div>
      </div>

      {/* stepper con estado (activo / hecho / pendiente) */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "13px 15px", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
        {steps.map((s, i) => {
          const n = i + 1;
          const activeStep = n === stage;
          const done = n < stage;
          const boxBg = activeStep ? T.greenBg2 : T.surface;
          const boxBd = activeStep ? T.green : done ? T.greenBorder : T.border2;
          const numBg = activeStep ? T.green : done ? T.greenBorder : T.surface3;
          const numCol = activeStep ? "#fff" : done ? T.greenDark : T.dim;
          const titleCol = activeStep ? T.greenDark : done ? T.text : T.muted;
          const subCol = activeStep ? T.green : T.faint;
          return (
            <React.Fragment key={s.t}>
              <div style={{ flex: 1, border: `1.5px solid ${boxBd}`, borderRadius: 12, padding: "10px 13px", background: boxBg }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700, marginBottom: 5, background: numBg, color: numCol }}>{n}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: titleCol }}>{s.t}</div>
                <div style={{ fontSize: 11, color: subCol }}>{s.s}</div>
              </div>
              {i < steps.length - 1 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" strokeLinecap="round" style={{ flex: "none" }}><path d="m9 6 6 6-6 6" /></svg>}
            </React.Fragment>
          );
        })}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13, padding: 6, width: "fit-content" }}>
        <TabBtn active={tab === "agenda"} onClick={() => setTab("agenda")} label="Agenda" count={kCitas} />
        <TabBtn active={tab === "tickets"} onClick={() => setTab("tickets")} label="Tickets abiertos" count={tickets?.summary?.open_count ?? kTickets} />
        <TabBtn active={tab === "caja"} onClick={() => setTab("caja")} label="Caja" />
      </div>

      {/* AGENDA */}
      {tab === "agenda" && (
        <>
          <KpiGrid cols={4}>
            <Kpi label="En salón" value={kEnSalon} />
            <Kpi label="Citas hoy" value={String(kCitas)} />
            <Kpi label="Cobrado hoy" value={fmtCOPShort(kCobrado)} valueColor={T.green} />
            <Kpi label="Tickets abiertos" value={String(kTickets)} />
          </KpiGrid>
          <Panel title="Citas de hoy" right={<span style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>Toca una cita para abrir su ticket →</span>}>
            {citas.length === 0 ? (
              <Empty icon="📅" title="Sin citas" hint="No hay citas para este día." />
            ) : citas.map((c) => {
              const st = STATUS[c.status] || STATUS.scheduled;
              return (
                <div key={c.id} onClick={() => openAppt(c)} className="v2-row" style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 20px", borderTop: `1px solid ${T.border3}`, cursor: "pointer" }}>
                  <div style={{ width: 54, textAlign: "center", flex: "none" }}>
                    <Mono style={{ fontWeight: 700, fontSize: 15 }}>{fmtTime(c.start_time)}</Mono>
                  </div>
                  <div style={{ width: 1, height: 34, background: T.border2, flex: "none" }} />
                  <div style={{ width: 38, height: 38, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, background: colorFor(c.client_name || "") }}>{initials(c.client_name || "")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.client_name || "Cliente"}</div>
                    <div style={{ fontSize: 12.5, color: T.muted }}>{c.service_name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flex: "none" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: colorFor(c.stylist_name) + "22", color: colorFor(c.stylist_name), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 10.5 }}>{initials(c.stylist_name)}</span>
                    <span style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{c.stylist_name}</span>
                  </div>
                  <Mono style={{ width: 110, textAlign: "right", flex: "none", fontWeight: 700, fontSize: 14 }}>{fmtCOP(c.price || 0)}</Mono>
                  <span style={{ background: st.bg, color: st.color, fontWeight: 700, fontSize: 11.5, padding: "5px 11px", borderRadius: 8, flex: "none" }}>{st.label}</span>
                </div>
              );
            })}
          </Panel>
        </>
      )}

      {/* TICKETS */}
      {tab === "tickets" && (
        <div>
          {!tickets ? <Loading /> : (
            <>
              {(tickets.open || []).length === 0 && (tickets.paid_today || []).length === 0 ? (
                <Empty icon="🧾" title="Sin tickets" hint="Cuando un cliente llegue, abre un ticket." />
              ) : (
                <>
                  {(tickets.open || []).map((t: any) => (
                    <TicketRow key={t.id} t={t} onOpen={() => activeId && setPos({ ticketId: t.id, targetTenantId: activeId })} tone="open" />
                  ))}
                  {(tickets.paid_today || []).map((t: any) => (
                    <TicketRow key={t.id} t={t} onOpen={() => activeId && setPos({ ticketId: t.id, targetTenantId: activeId })} tone="paid" />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* CAJA */}
      {tab === "caja" && (
        <div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: cash ? T.green : T.dim, boxShadow: cash ? "0 0 0 4px rgba(20,160,90,.22)" : "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{cash ? "Caja abierta" : "Caja cerrada"}</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>
                {cash ? `Base ${fmtCOP(cash.opening_amount || cash.base || 0)} · desde ${cash.opened_at ? fmtTime(cash.opened_at) : "—"}` : "Abre la caja para registrar cobros en efectivo."}
              </div>
            </div>
            {cash ? (
              <button onClick={() => setCashClose(true)} style={{ ...btnRed }}>Cerrar caja (arqueo)</button>
            ) : (
              <button onClick={() => setCashOpen(true)} style={{ ...btnDark }}>Abrir caja</button>
            )}
          </div>

          <KpiGrid cols={4} style={{ marginBottom: 16 }}>
            <Kpi label="💵 Efectivo" value={fmtCOP(cash?.cash_total ?? cash?.efectivo ?? 0)} />
            <Kpi label="💳 Tarjeta" value={fmtCOP(cash?.card_total ?? cash?.tarjeta ?? 0)} />
            <Kpi label="📱 Transferencia" value={fmtCOP(cash?.transfer_total ?? cash?.transferencia ?? 0)} />
            <Kpi label="Total en caja" value={fmtCOP(cash?.expected_cash ?? cash?.total ?? kCobrado)} dark />
          </KpiGrid>

          <Panel title="Cobros de hoy">
            {(tickets?.paid_today || []).length === 0 ? (
              <Empty icon="💸" title="Sin cobros aún" hint="Los tickets pagados hoy aparecerán aquí." />
            ) : (tickets.paid_today).map((m: any) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderTop: `1px solid ${T.border3}` }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.client_name || "Cliente"}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{m.item_count || 0} ítems · {m.ref || ""}</div>
                </div>
                <Mono style={{ fontWeight: 700, fontSize: 14.5, color: T.green, width: 120, textAlign: "right" }}>{fmtCOP(m.total_amount || 0)}</Mono>
              </div>
            ))}
          </Panel>
        </div>
      )}

      {/* Drawers reales reutilizados */}
      <AppointmentDetailDrawer
        isOpen={!!appt}
        onClose={() => setAppt(null)}
        appointment={appt}
        confirmBeforeCheckIn
        checkInLabel="Iniciar y abrir ticket"
        onChanged={refreshAll}
        onCheckedIn={(_a: any, ticketId?: string) => { if (ticketId && activeId) setPos({ ticketId, targetTenantId: activeId }); }}
      />

      <ModalAbrirCaja isOpen={cashOpen} onClose={() => setCashOpen(false)} onSessionOpened={fetchCash} targetTenantId={activeId || undefined} />
      <ModalResumenCierre isOpen={cashClose} onClose={() => setCashClose(false)} onSessionClosed={fetchCash} sessionData={cash} targetTenantId={activeId || undefined} />

      {/* Modal de agendamiento (crea cita nueva) — diseño v2, cableado a los thunks reales */}
      <NewAppointmentModal
        isOpen={newAppt}
        onClose={() => { setNewAppt(false); refreshAll(); }}
        defaultDate={new Date(`${date}T00:00:00`)}
        targetTenantId={activeId || undefined}
      />

      <Offcanvas isOpen={!!pos} toggle={() => setPos(null)} direction="end" style={{ width: "min(1100px, 100vw)" }}>
        <OffcanvasHeader toggle={() => setPos(null)} className="border-bottom"><span style={{ fontWeight: 600 }}>Cobrar ticket</span></OffcanvasHeader>
        <OffcanvasBody className="p-0" style={{ overflowY: "auto" }}>
          {pos && (
            <PointOfSale embedded={{ ticketId: pos.ticketId, targetTenantId: pos.targetTenantId, onClose: () => { setPos(null); refreshAll(); } }} />
          )}
        </OffcanvasBody>
      </Offcanvas>
    </div>
  );
};

// ── sub-componentes ──────────────────────────────────────────
const TabBtn: React.FC<{ active: boolean; onClick: () => void; label: string; count?: number }> = ({ active, onClick, label, count }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 7, background: active ? T.ink : "transparent", color: active ? T.onInk : T.muted, border: 0, borderRadius: 9, padding: "9px 14px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
    {label}{count !== undefined && <span style={{ opacity: 0.6 }}>{count}</span>}
  </button>
);

const TicketRow: React.FC<{ t: any; onOpen: () => void; tone: "open" | "paid" }> = ({ t, onOpen, tone }) => (
  <div onClick={onOpen} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 13, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", opacity: tone === "paid" ? 0.75 : 1 }}>
    <div style={{ width: 42, height: 42, borderRadius: 12, background: colorFor(t.client_name || t.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{initials(t.client_name || "?")}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.client_name || "Cliente"}</div>
      <div style={{ fontSize: 12.5, color: T.muted }}>{t.item_count || 0} ítems · {(t.seller_first_names || []).join(", ")}</div>
    </div>
    <div style={{ textAlign: "right" }}>
      <Mono style={{ fontWeight: 800, fontSize: 17 }}>{fmtCOP(t.total_amount || 0)}</Mono>
      <div style={{ fontSize: 11.5, color: T.dim, fontWeight: 600 }}>{tone === "paid" ? "Pagado" : "Abierto"} · {t.created_at ? fmtTime(t.created_at) : ""}</div>
    </div>
    <button style={{ ...btnDark }}>{tone === "paid" ? "Ver →" : "Cobrar →"}</button>
  </div>
);

const selStyle: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 12px", fontWeight: 700, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" };
const btnDark: React.CSSProperties = { background: T.ink, color: T.onInk, border: 0, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };
const btnRed: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: "11px 16px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer", color: T.red };

export default Operacion;
