// Modal "Nueva cita" del rediseño /v2 (estilo Luxe). Reemplaza al AppointmentModal
// viejo de reactstrap dentro de Operacion. El DISEÑO es nuevo (tokens T.*), pero la
// LÓGICA está cableada a los MISMOS thunks/endpoints reales que usa el modal viejo:
//   - fetchTenantSlots         → /appointments/tenant/slots  (fecha+servicio+tenant)
//   - fetchAvailableStylists   → /appointments/stylists/available
//   - createNewClient          → POST /users (role_id 4)
//   - createAppointmentsBatch  → POST /appointments/batch
// Los listados (clientes/estilistas/servicios/categorías) se piden a los mismos
// endpoints REST que alimentan el modal viejo (/users/tenant, /services/tenant).
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  createAppointmentsBatch,
  fetchTenantSlots,
  createNewClient,
} from "../../../slices/thunks";
import { api } from "../../../services/api";
import { T, R, FONT, fmtCOP, colorFor, initials } from "../theme";
import { Loading, Empty } from "./ui";

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date | null;
  targetTenantId?: string;
}

type ClientRow = { id: string | number; first_name?: string; last_name?: string; phone?: string };
type StylistRow = { id: string | number; first_name?: string; last_name?: string; commission_rate?: number | null };
type ServiceRow = { id: string | number; name: string; price?: number; category_id?: string | number | null };
type CategoryRow = { id: string | number; name: string };

// ── helpers de fecha/hora (copiados del AppointmentModal viejo) ──────────────
const toYyyyMmDd = (d: string | Date): string => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split("T")[0];
};

const toHHmmLocal = (d: string | Date) => {
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const hhmmTo12h = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const isDateInPast = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return checkDate < today;
};

const isDateTimeInPast = (date: Date, time: string): boolean => {
  const [hours, minutes] = time.split(":").map(Number);
  const checkDateTime = new Date(date);
  checkDateTime.setHours(hours, minutes, 0, 0);
  return checkDateTime < new Date();
};

// Normaliza la respuesta de slots a string[] "HH:mm" (copiado del viejo)
function normalizeSlotsPayload(payload: any): string[] {
  const raw = Array.isArray(payload) ? payload : (payload?.slots ?? payload?.data?.slots ?? []);
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  const first = raw[0];
  if (typeof first === "string" && first.length === 5 && first.includes(":")) {
    return raw as string[];
  }
  if (first && typeof first === "object" && "local_time" in first) {
    return (raw as Array<{ local_time: string }>).map((s) => s.local_time);
  }
  if (typeof first === "string") {
    return (raw as string[]).map((iso) => toHHmmLocal(iso));
  }
  if (first && typeof first === "object" && "utc" in first) {
    return (raw as Array<{ utc: string }>).map((s) => toHHmmLocal(s.utc));
  }
  return [];
}

const firstName = (s?: string) => (s || "").trim().split(/\s+/)[0] || "";
const pctOf = (r?: number | null) => (r != null ? Math.round(Number(r) * 100) : null);

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  targetTenantId,
}) => {
  const dispatch: any = useDispatch();
  const fallbackTenant = useSelector((state: any) => state.Login?.user?.tenant_id);
  const tenantId = targetTenantId || fallbackTenant;

  // catálogos
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stylists, setStylists] = useState<StylistRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // selección
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: "", phone: "" });
  const [creatingClient, setCreatingClient] = useState(false);

  const [stylistId, setStylistId] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [serviceId, setServiceId] = useState("");
  const [dateStr, setDateStr] = useState<string>("");

  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── carga de catálogos al abrir ────────────────────────────────
  const loadCatalogs = useCallback(async () => {
    if (!tenantId) return;
    setLoadingCatalogs(true);
    try {
      const [rClients, rStylists, rServices, rCats] = await Promise.allSettled([
        api.get(`/users/tenant/${tenantId}`, { params: { role_id: 4 } }),
        api.get(`/users/tenant/${tenantId}`, { params: { role_id: 3 } }),
        api.get(`/services/tenant/${tenantId}`),
        api.get(`/categories`),
      ]);
      setClients(rClients.status === "fulfilled" && Array.isArray(rClients.value.data) ? rClients.value.data : []);
      setStylists(rStylists.status === "fulfilled" && Array.isArray(rStylists.value.data) ? rStylists.value.data : []);
      setServices(rServices.status === "fulfilled" && Array.isArray(rServices.value.data) ? rServices.value.data : []);
      setCategories(rCats.status === "fulfilled" && Array.isArray(rCats.value.data) ? rCats.value.data : []);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [tenantId]);

  // reset + carga al abrir; guarda de fecha pasada (replica el viejo)
  useEffect(() => {
    if (!isOpen) return;
    const d = defaultDate ? new Date(defaultDate) : new Date();
    if (isDateInPast(d)) {
      Swal.fire({ title: "Fecha pasada", html: "No se pueden crear citas en el pasado.", icon: "warning", confirmButtonText: "Entendido" });
      onClose();
      return;
    }
    setDateStr(toYyyyMmDd(d));
    setClientQuery("");
    setClientOpen(false);
    setSelectedClient(null);
    setShowNewClient(false);
    setNewClient({ first_name: "", phone: "" });
    setStylistId("");
    setActiveCat("all");
    setServiceId("");
    setSlots([]);
    setTime("");
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate]);

  // ── slots: fecha + servicio (+ tenant) igual que el viejo ──────
  useEffect(() => {
    if (!isOpen) return;
    setTime("");
    if (serviceId && dateStr) {
      setLoadingSlots(true);
      dispatch(fetchTenantSlots(dateStr, serviceId, targetTenantId))
        .then((payload: any) => {
          const slotsRaw = payload?.slots ?? payload;
          const fetched = normalizeSlotsPayload(slotsRaw);
          const message = payload?.message || "";
          setSlots(fetched);
          if (fetched.length === 0 && message) {
            Swal.fire({ icon: "info", title: "Día cerrado", text: message, confirmButtonText: "Entendido" });
          }
        })
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    } else {
      setSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, dateStr, isOpen]);

  // ── derivados ──────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const base = clients;
    const list = q
      ? base.filter((c) => `${c.first_name || ""} ${c.last_name || ""} ${c.phone || ""}`.toLowerCase().includes(q))
      : base;
    return list.slice(0, 20);
  }, [clients, clientQuery]);

  const catList = useMemo(() => {
    const usados = new Set(services.map((s) => String(s.category_id ?? "")));
    return categories.filter((c) => usados.has(String(c.id)));
  }, [categories, services]);

  const filteredServices = useMemo(() => {
    if (activeCat === "all") return services;
    return services.filter((s) => String(s.category_id ?? "") === activeCat);
  }, [services, activeCat]);

  const selectedStylist = useMemo(() => stylists.find((s) => String(s.id) === stylistId) || null, [stylists, stylistId]);

  const morning = slots.filter((s) => Number(s.split(":")[0]) < 12);
  const afternoon = slots.filter((s) => Number(s.split(":")[0]) >= 12);

  const canSubmit = !!selectedClient && !!stylistId && !!serviceId && !!time && !submitting;

  // ── acciones ───────────────────────────────────────────────────
  const handleCreateClient = async () => {
    const name = newClient.first_name.trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "El nombre es obligatorio." });
      return;
    }
    setCreatingClient(true);
    try {
      const created: any = await dispatch(createNewClient({ first_name: name, phone: newClient.phone.trim() }, targetTenantId));
      const row: ClientRow = { id: created.id, first_name: created.first_name || name, last_name: created.last_name, phone: created.phone || newClient.phone.trim() };
      setClients((prev) => [row, ...prev]);
      setSelectedClient(row);
      setShowNewClient(false);
      setClientOpen(false);
      setNewClient({ first_name: "", phone: "" });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: err?.message || err?.error || "Error al crear cliente" });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient || !serviceId || !stylistId || !time) return;
    const dateObj = new Date(`${dateStr}T00:00:00`);
    const [hours, minutes] = time.split(":").map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
    if (isDateTimeInPast(dateObj, time)) {
      Swal.fire({ icon: "warning", title: "Fecha pasada", text: "No se pueden crear citas en el pasado." });
      return;
    }
    const utcDateTimeString = dateObj.toISOString();
    setSubmitting(true);
    try {
      await dispatch(createAppointmentsBatch({
        client_id: String(selectedClient.id),
        appointments: [{ service_id: serviceId, stylist_id: stylistId, start_time: utcDateTimeString }],
      }));
      // createAppointmentsBatch ya muestra el toast de éxito/error
      onClose();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: typeof err === "string" ? err : (err?.message || "No se pudo agendar la cita.") });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stylistPct = pctOf(selectedStylist?.commission_rate);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, width: "min(480px, 94vw)", maxHeight: "90vh", overflow: "auto", color: T.text }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 20px", borderBottom: `1px solid ${T.border2}`, position: "sticky", top: 0, background: T.surface, zIndex: 2 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.4px" }}>Nueva cita</h2>
            <p style={{ margin: "3px 0 0", color: T.muted, fontSize: 12.5 }}>Se agenda y luego se vuelve ticket</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "transparent", border: 0, color: T.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2 }}>✕</button>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {loadingCatalogs ? (
            <Loading label="Cargando datos…" />
          ) : (
            <>
              {/* CLIENTE */}
              <Section label="Cliente">
                {selectedClient ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 11, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "10px 12px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: colorFor(`${selectedClient.first_name || ""}`), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flex: "none" }}>
                      {initials(`${selectedClient.first_name || ""} ${selectedClient.last_name || ""}`)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{`${selectedClient.first_name || ""} ${selectedClient.last_name || ""}`.trim() || "Cliente"}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{selectedClient.phone || "Sin teléfono"}</div>
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientQuery(""); }} style={{ background: "transparent", border: 0, color: T.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      value={clientQuery}
                      onChange={(e) => { setClientQuery(e.target.value); setClientOpen(true); setShowNewClient(false); }}
                      onFocus={() => setClientOpen(true)}
                      placeholder="Buscar cliente por nombre o teléfono…"
                      style={inputStyle}
                    />
                    {clientOpen && !showNewClient && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.md, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflowY: "auto", zIndex: 5 }}>
                        {filteredClients.map((c) => (
                          <div
                            key={String(c.id)}
                            onClick={() => { setSelectedClient(c); setClientOpen(false); }}
                            className="v2-row"
                            style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${T.border3}` }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{`${c.first_name || ""} ${c.last_name || ""}`.trim()}</div>
                            {c.phone && <div style={{ fontSize: 11.5, color: T.muted }}>{c.phone}</div>}
                          </div>
                        ))}
                        <div
                          onClick={() => { setShowNewClient(true); setNewClient({ first_name: clientQuery.trim(), phone: "" }); }}
                          style={{ padding: "10px 12px", cursor: "pointer", color: T.green, fontWeight: 700, fontSize: 12.5 }}
                        >
                          + Crear cliente nuevo
                        </div>
                      </div>
                    )}
                    {showNewClient && (
                      <div style={{ marginTop: 10, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: R.md, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={newClient.first_name} onChange={(e) => setNewClient((p) => ({ ...p, first_name: e.target.value }))} placeholder="Nombre*" style={inputStyle} />
                        <input value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} placeholder="Teléfono" style={inputStyle} />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => setShowNewClient(false)} style={ghostBtn}>Cancelar</button>
                          <button onClick={handleCreateClient} disabled={creatingClient} style={{ ...primaryBtn, opacity: creatingClient ? 0.6 : 1 }}>{creatingClient ? "Creando…" : "Crear"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* ESTILISTA */}
              <Section label="Estilista">
                {stylists.length === 0 ? (
                  <Empty icon="✂️" title="Sin estilistas" hint="No hay estilistas configurados." />
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {stylists.map((s) => {
                      const on = String(s.id) === stylistId;
                      const pct = pctOf(s.commission_rate);
                      return (
                        <button
                          key={String(s.id)}
                          onClick={() => setStylistId(on ? "" : String(s.id))}
                          style={{
                            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                            background: on ? T.ink : T.surface, color: on ? T.onInk : T.text,
                            border: `1px solid ${on ? T.ink : T.border}`, borderRadius: R.pill,
                            padding: "8px 13px", fontWeight: 700, fontSize: 12.5, fontFamily: FONT,
                          }}
                        >
                          {firstName(s.first_name) || "Estilista"}
                          {pct != null && <span style={{ opacity: 0.6, fontWeight: 600 }}>{pct}%</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* SERVICIO */}
              <Section label="Servicio">
                {services.length === 0 ? (
                  <Empty icon="💈" title="Sin servicios" hint="No hay servicios configurados." />
                ) : (
                  <>
                    {catList.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 11 }}>
                        <Chip label="Todos" on={activeCat === "all"} onClick={() => setActiveCat("all")} />
                        {catList.map((c) => (
                          <Chip key={String(c.id)} label={c.name} on={activeCat === String(c.id)} onClick={() => setActiveCat(String(c.id))} />
                        ))}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {filteredServices.map((s) => {
                        const on = String(s.id) === serviceId;
                        return (
                          <button
                            key={String(s.id)}
                            onClick={() => setServiceId(on ? "" : String(s.id))}
                            style={{
                              textAlign: "left", cursor: "pointer",
                              background: on ? T.greenBg2 : T.surface, color: T.text,
                              border: `1.5px solid ${on ? T.green : T.border}`, borderRadius: R.md,
                              padding: "9px 10px", fontFamily: FONT,
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.25 }}>{s.name}</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: T.green, marginTop: 3 }}>{fmtCOP(s.price || 0)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </Section>

              {/* FECHA */}
              <Section label="Fecha">
                <input type="date" value={dateStr} min={toYyyyMmDd(new Date())} onChange={(e) => setDateStr(e.target.value)} style={inputStyle} />
              </Section>

              {/* HORA */}
              <Section label="Hora">
                {!serviceId || !dateStr ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>Elige servicio y fecha para ver horarios disponibles.</div>
                ) : loadingSlots ? (
                  <Loading label="Buscando horarios…" />
                ) : slots.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>No hay horarios disponibles para ese día.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {morning.length > 0 && <SlotGroup title="Mañana" slots={morning} value={time} onPick={setTime} />}
                    {afternoon.length > 0 && <SlotGroup title="Tarde" slots={afternoon} value={time} onPick={setTime} />}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderTop: `1px solid ${T.border2}`, position: "sticky", bottom: 0, background: T.surface }}>
          <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>
            {selectedStylist
              ? `Comisión de ${firstName(selectedStylist.first_name)}: ${stylistPct != null ? `${stylistPct}%` : "—"}`
              : "Selecciona un estilista"}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{ ...primaryBtn, padding: "11px 22px", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            {submitting ? "Agendando…" : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── sub-componentes ─────────────────────────────────────────────
const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: T.muted, marginBottom: 9 }}>{label}</div>
    {children}
  </div>
);

const Chip: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({ label, on, onClick }) => (
  <button
    onClick={onClick}
    style={{ cursor: "pointer", background: on ? T.ink : T.surface, color: on ? T.onInk : T.muted, border: `1px solid ${on ? T.ink : T.border}`, borderRadius: R.pill, padding: "6px 12px", fontWeight: 700, fontSize: 12, fontFamily: FONT }}
  >
    {label}
  </button>
);

const SlotGroup: React.FC<{ title: string; slots: string[]; value: string; onPick: (t: string) => void }> = ({ title, slots, value, onPick }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, marginBottom: 7 }}>{title.toUpperCase()}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
      {slots.map((s) => {
        const on = s === value;
        return (
          <button
            key={s}
            onClick={() => onPick(on ? "" : s)}
            style={{ cursor: "pointer", background: on ? T.ink : T.surface, color: on ? T.onInk : T.text, border: `1px solid ${on ? T.ink : T.border}`, borderRadius: R.sm, padding: "8px 4px", fontWeight: 700, fontSize: 11.5, fontFamily: FONT }}
          >
            {hhmmTo12h(s)}
          </button>
        );
      })}
    </div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%", background: T.surface, color: T.text, border: `1px solid ${T.border}`,
  borderRadius: R.md, padding: "10px 12px", fontSize: 13.5, fontFamily: FONT, outline: "none", boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  background: T.ink, color: T.onInk, border: 0, borderRadius: R.md, padding: "9px 16px",
  fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: R.md,
  padding: "9px 14px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer",
};

export default NewAppointmentModal;
