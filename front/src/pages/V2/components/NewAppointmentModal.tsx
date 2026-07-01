// Modal "Nueva cita" del rediseño /v2 (estilo Luxe). Reemplaza al AppointmentModal
// viejo de reactstrap dentro de Operacion. Flujo del mockup: se elige el SERVICIO
// primero y luego aparece QUIÉN lo hace (estilistas disponibles para ese servicio+hora).
// Cableado a los MISMOS thunks/endpoints reales:
//   - fetchTenantSlots        → /appointments/tenant/slots        (fecha+servicio+tenant)
//   - fetchAvailableStylists  → /appointments/stylists/available  (fecha+hora+servicio)
//   - createNewClient         → POST /users (role_id 4)
//   - createAppointmentsBatch → POST /appointments/batch
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  createAppointmentsBatch,
  fetchTenantSlots,
  fetchAvailableStylists,
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
type StylistRow = { id: string | number; first_name?: string; last_name?: string; commission_rate?: number | null; is_busy?: boolean };
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
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
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
function normalizeSlotsPayload(payload: any): string[] {
  const raw = Array.isArray(payload) ? payload : (payload?.slots ?? payload?.data?.slots ?? []);
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (typeof first === "string" && first.length === 5 && first.includes(":")) return raw as string[];
  if (first && typeof first === "object" && "local_time" in first) return (raw as Array<{ local_time: string }>).map((s) => s.local_time);
  if (typeof first === "string") return (raw as string[]).map((iso) => toHHmmLocal(iso));
  if (first && typeof first === "object" && "utc" in first) return (raw as Array<{ utc: string }>).map((s) => toHHmmLocal(s.utc));
  return [];
}
const firstName = (s?: string) => (s || "").trim().split(/\s+/)[0] || "";
const pctOf = (r?: number | null) => (r != null ? Math.round(Number(r) * 100) : null);
const fullName = (s?: { first_name?: string; last_name?: string }) => `${s?.first_name || ""} ${s?.last_name || ""}`.trim();

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, defaultDate, targetTenantId }) => {
  const dispatch: any = useDispatch();
  const fallbackTenant = useSelector((state: any) => state.Login?.user?.tenant_id);
  const tenantId = targetTenantId || fallbackTenant;

  // catálogos
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // cliente
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: "", phone: "" });
  const [creatingClient, setCreatingClient] = useState(false);

  // servicio → fecha → hora → estilista
  const [activeCat, setActiveCat] = useState<string>("all");
  const [serviceId, setServiceId] = useState("");
  const [dateStr, setDateStr] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [availStylists, setAvailStylists] = useState<StylistRow[]>([]);
  const [loadingStylists, setLoadingStylists] = useState(false);
  const [stylistId, setStylistId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── carga de catálogos al abrir ────────────────────────────────
  const loadCatalogs = useCallback(async () => {
    if (!tenantId) return;
    setLoadingCatalogs(true);
    try {
      const [rClients, rServices, rCats] = await Promise.allSettled([
        api.get(`/users/tenant/${tenantId}`, { params: { role_id: 4 } }),
        api.get(`/services/tenant/${tenantId}`),
        api.get(`/categories`),
      ]);
      setClients(rClients.status === "fulfilled" && Array.isArray(rClients.value.data) ? rClients.value.data : []);
      setServices(rServices.status === "fulfilled" && Array.isArray(rServices.value.data) ? rServices.value.data : []);
      setCategories(rCats.status === "fulfilled" && Array.isArray(rCats.value.data) ? rCats.value.data : []);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [tenantId]);

  // reset + carga al abrir; guarda de fecha pasada
  useEffect(() => {
    if (!isOpen) return;
    const d = defaultDate ? new Date(defaultDate) : new Date();
    if (isDateInPast(d)) {
      Swal.fire({ title: "Fecha pasada", html: "No se pueden crear citas en el pasado.", icon: "warning", confirmButtonText: "Entendido" });
      onClose();
      return;
    }
    setDateStr(toYyyyMmDd(d));
    setClientQuery(""); setClientOpen(false); setSelectedClient(null);
    setShowNewClient(false); setNewClient({ first_name: "", phone: "" });
    setActiveCat("all"); setServiceId(""); setSlots([]); setTime("");
    setAvailStylists([]); setStylistId("");
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate]);

  // slots: fecha + servicio → resetea hora y estilista
  useEffect(() => {
    if (!isOpen) return;
    setTime(""); setStylistId(""); setAvailStylists([]);
    if (serviceId && dateStr) {
      setLoadingSlots(true);
      dispatch(fetchTenantSlots(dateStr, serviceId, targetTenantId))
        .then((payload: any) => {
          const fetched = normalizeSlotsPayload(payload?.slots ?? payload);
          setSlots(fetched);
          if (fetched.length === 0 && payload?.message) {
            Swal.fire({ icon: "info", title: "Día cerrado", text: payload.message, confirmButtonText: "Entendido" });
          }
        })
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    } else {
      setSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, dateStr, isOpen]);

  // estilistas disponibles: servicio + fecha + hora
  useEffect(() => {
    if (!isOpen) return;
    setStylistId("");
    if (serviceId && dateStr && time) {
      setLoadingStylists(true);
      dispatch(fetchAvailableStylists(dateStr, time, serviceId, targetTenantId))
        .then((list: any) => setAvailStylists(Array.isArray(list) ? list : []))
        .catch(() => setAvailStylists([]))
        .finally(() => setLoadingStylists(false));
    } else {
      setAvailStylists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, dateStr, time, isOpen]);

  // ── derivados ──────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const list = q
      ? clients.filter((c) => `${c.first_name || ""} ${c.last_name || ""} ${c.phone || ""}`.toLowerCase().includes(q))
      : clients;
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

  const selectedService = useMemo(() => services.find((s) => String(s.id) === serviceId) || null, [services, serviceId]);
  const selectedStylist = useMemo(() => availStylists.find((s) => String(s.id) === stylistId) || null, [availStylists, stylistId]);
  const bookable = availStylists.filter((s) => !s.is_busy);

  const morning = slots.filter((s) => Number(s.split(":")[0]) < 12);
  const afternoon = slots.filter((s) => Number(s.split(":")[0]) >= 12);
  const canSubmit = !!selectedClient && !!serviceId && !!time && !!stylistId && !submitting;

  // ── acciones ───────────────────────────────────────────────────
  const handleCreateClient = async () => {
    const name = newClient.first_name.trim();
    if (!name) { Swal.fire({ icon: "warning", title: "El nombre es obligatorio." }); return; }
    setCreatingClient(true);
    try {
      const created: any = await dispatch(createNewClient({ first_name: name, phone: newClient.phone.trim() }, targetTenantId));
      const row: ClientRow = { id: created.id, first_name: created.first_name || name, last_name: created.last_name, phone: created.phone || newClient.phone.trim() };
      setClients((prev) => [row, ...prev]);
      setSelectedClient(row); setShowNewClient(false); setClientOpen(false);
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
    setSubmitting(true);
    try {
      await dispatch(createAppointmentsBatch({
        client_id: String(selectedClient.id),
        appointments: [{ service_id: serviceId, stylist_id: stylistId, start_time: dateObj.toISOString() }],
      }));
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, width: "min(600px, 96vw)", maxHeight: "90vh", overflow: "auto", color: T.text }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: `1px solid ${T.border2}`, position: "sticky", top: 0, background: T.surface, zIndex: 2 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.4px" }}>Nueva cita</h2>
            <p style={{ margin: "3px 0 0", color: T.muted, fontSize: 12.5 }}>Se agenda y luego se vuelve ticket</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface, color: T.muted, cursor: "pointer", fontSize: 17, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 22 }}>
          {loadingCatalogs ? (
            <Loading label="Cargando datos…" />
          ) : (
            <>
              {/* CLIENTE */}
              <Section label="Cliente">
                {selectedClient ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 11, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "10px 12px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: colorFor(fullName(selectedClient) || "c"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flex: "none" }}>{initials(fullName(selectedClient) || "?")}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fullName(selectedClient) || "Cliente"}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{selectedClient.phone || "Sin teléfono"}</div>
                    </div>
                    <button onClick={() => { setSelectedClient(null); setClientQuery(""); }} style={{ background: "transparent", border: 0, color: T.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input value={clientQuery} onChange={(e) => { setClientQuery(e.target.value); setClientOpen(true); setShowNewClient(false); }} onFocus={() => setClientOpen(true)} placeholder="Buscar cliente por nombre o teléfono…" style={inputStyle} />
                    {clientOpen && !showNewClient && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.md, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 220, overflowY: "auto", zIndex: 5 }}>
                        {filteredClients.map((c) => (
                          <div key={String(c.id)} onClick={() => { setSelectedClient(c); setClientOpen(false); }} className="v2-row" style={{ padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${T.border3}` }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{fullName(c)}</div>
                            {c.phone && <div style={{ fontSize: 11.5, color: T.muted }}>{c.phone}</div>}
                          </div>
                        ))}
                        <div onClick={() => { setShowNewClient(true); setNewClient({ first_name: clientQuery.trim(), phone: "" }); }} style={{ padding: "10px 12px", cursor: "pointer", color: T.green, fontWeight: 700, fontSize: 12.5 }}>+ Crear cliente nuevo</div>
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

              {/* SERVICIO (primero) */}
              <Section label="Servicio">
                {services.length === 0 ? (
                  <Empty icon="💈" title="Sin servicios" hint="No hay servicios configurados." />
                ) : (
                  <>
                    {catList.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                        <Chip label="Todos" on={activeCat === "all"} onClick={() => setActiveCat("all")} />
                        {catList.map((c) => <Chip key={String(c.id)} label={c.name} on={activeCat === String(c.id)} onClick={() => setActiveCat(String(c.id))} />)}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9 }}>
                      {filteredServices.map((s) => {
                        const on = String(s.id) === serviceId;
                        return (
                          <button key={String(s.id)} onClick={() => setServiceId(on ? "" : String(s.id))} style={{ textAlign: "left", cursor: "pointer", background: on ? T.greenBg2 : T.surface, color: T.text, border: `1.5px solid ${on ? T.green : T.border}`, borderRadius: R.md, padding: "10px 11px", fontFamily: FONT }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "0 12px", width: 210 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /></svg>
                  <input type="date" value={dateStr} min={toYyyyMmDd(new Date())} onChange={(e) => setDateStr(e.target.value)} style={{ border: 0, background: "transparent", color: T.text, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, outline: "none", padding: "10px 0", flex: 1 }} />
                </div>
              </Section>

              {/* HORA */}
              <Section label="Hora">
                {!serviceId ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>Elige un servicio para ver los horarios disponibles.</div>
                ) : loadingSlots ? (
                  <Loading label="Buscando horarios…" />
                ) : slots.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>No hay horarios disponibles para ese día.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {morning.length > 0 && <SlotGroup title="Mañana" slots={morning} value={time} onPick={setTime} />}
                    {afternoon.length > 0 && <SlotGroup title="Tarde" slots={afternoon} value={time} onPick={setTime} />}
                  </div>
                )}
              </Section>

              {/* ESTILISTA (quién lo hace — disponibles a esa hora) */}
              <Section label="Estilista">
                {!time ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>Elige servicio, fecha y hora para ver quién puede atender.</div>
                ) : loadingStylists ? (
                  <Loading label="Buscando estilistas…" />
                ) : bookable.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: T.muted }}>Ningún estilista disponible a esa hora para este servicio.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 9 }}>
                    {bookable.map((s) => {
                      const on = String(s.id) === stylistId;
                      const pct = pctOf(s.commission_rate);
                      return (
                        <button key={String(s.id)} onClick={() => setStylistId(on ? "" : String(s.id))} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", background: on ? T.greenBg2 : T.surface, border: `1.5px solid ${on ? T.green : T.border}`, borderRadius: R.md, padding: "10px 12px", fontFamily: FONT }}>
                          <span style={{ width: 30, height: 30, borderRadius: 9, background: colorFor(fullName(s) || "e"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flex: "none" }}>{initials(fullName(s) || "?")}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName(s) || "Estilista"}</div>
                            {pct != null && <div style={{ fontSize: 11.5, color: T.muted }}>Comisión {pct}%</div>}
                          </div>
                          {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderTop: `1px solid ${T.border2}`, position: "sticky", bottom: 0, background: T.surface2 }}>
          <div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600, minWidth: 0 }}>
            {selectedStylist
              ? `${selectedService?.name || "Servicio"} · ${firstName(selectedStylist.first_name)} (${stylistPct != null ? `${stylistPct}%` : "—"})`
              : "Servicio → hora → estilista"}
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{ ...primaryBtn, padding: "11px 22px", flex: "none", opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            {submitting ? "Agendando…" : "Agendar cita"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── sub-componentes ─────────────────────────────────────────────
const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>{label}</div>
    {children}
  </div>
);

const Chip: React.FC<{ label: string; on: boolean; onClick: () => void }> = ({ label, on, onClick }) => (
  <button onClick={onClick} style={{ cursor: "pointer", background: on ? T.ink : T.surface, color: on ? T.onInk : T.muted, border: `1.5px solid ${on ? T.ink : T.border}`, borderRadius: 9, padding: "6px 12px", fontWeight: 700, fontSize: 12, fontFamily: FONT, whiteSpace: "nowrap" }}>
    {label}
  </button>
);

const SlotGroup: React.FC<{ title: string; slots: string[]; value: string; onPick: (t: string) => void }> = ({ title, slots, value, onPick }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      {title === "Mañana"
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e0892a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2.5 1.5" /></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b6ef5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v2M5 12H3M6 6 4.5 4.5M18 6l1.5-1.5M21 12h-2M12 17a5 5 0 0 1 0-10" /><path d="M8 21h8M10 17v4M14 17v4" /></svg>}
      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}>{title.toUpperCase()}</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
      {slots.map((s) => {
        const on = s === value;
        return (
          <button key={s} onClick={() => onPick(on ? "" : s)} style={{ cursor: "pointer", background: on ? T.ink : T.surface, color: on ? T.onInk : T.text, border: `1px solid ${on ? T.ink : T.border}`, borderRadius: R.sm, padding: "8px 4px", fontWeight: 700, fontSize: 11.5, fontFamily: FONT }}>
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
