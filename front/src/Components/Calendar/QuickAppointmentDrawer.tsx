import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  FormGroup,
  Input,
  Label,
  Offcanvas,
  OffcanvasBody,
  OffcanvasHeader,
  Spinner,
} from "reactstrap";
import Select from "react-select";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { getTenantIdFromToken } from "../../services/auth";
import { SC, FS, SP, RAD } from "../../pages/DashboardPrincipal/superCalendarTheme";

interface QuickAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date | null;
  targetTenantId?: string;
  onCreated?: () => void;
}

type StylistMode = "auto" | "manual";

interface ClientOpt {
  value: string;
  label: string;
}

interface ServiceOpt {
  value: string;
  label: string;
  price: number;
  category_id?: string | null;
  name: string;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
const toYyyyMmDd = (d: string | Date): string => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split("T")[0];
};

const toHHmmLocal = (d: string | Date): string => {
  const dt = new Date(d);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatMoney = (n: number): string => `$ ${Number(n || 0).toLocaleString("es-CO")}`;

// ──────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  borderTop: `1px solid ${SC.border}`,
  padding: `${SP.xl}px 0`,
};

const firstSectionStyle: React.CSSProperties = {
  padding: `0 0 ${SP.xl}px 0`,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: FS.sm,
  letterSpacing: "0.06em",
  color: SC.muted,
  marginBottom: SP.sm,
};

const footerStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  left: 0,
  right: 0,
  background: SC.surface,
  borderTop: `1px solid ${SC.border2}`,
  padding: `${SP.lg}px ${SP.xl}px`,
  display: "flex",
  gap: SP.md,
  justifyContent: "space-between",
  zIndex: 10,
};

const reactSelectStyles = {
  control: (base: any) => ({ ...base, minHeight: 40, borderRadius: RAD.md }),
  menu: (base: any) => ({ ...base, zIndex: 9999 }),
};

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────
const QuickAppointmentDrawer: React.FC<QuickAppointmentDrawerProps> = ({
  isOpen,
  onClose,
  defaultDate,
  targetTenantId,
  onCreated,
}) => {
  const { t } = useTranslation();
  const tenantId = targetTenantId || getTenantIdFromToken() || "";

  // Loaded data
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [stylistMode, setStylistMode] = useState<StylistMode>("manual");
  const [stylistId, setStylistId] = useState<string>("");
  const [date, setDate] = useState<string>(""); // yyyy-mm-dd
  const [time, setTime] = useState<string>(""); // HH:mm
  const [notes, setNotes] = useState<string>("");

  // Inline create-client form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: "",
    phone: "",
    email: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // ── Effect: load data when opened
  useEffect(() => {
    if (!isOpen || !tenantId) return;
    let cancelled = false;
    setLoadingData(true);
    (async () => {
      try {
        const [cRes, sRes, stRes] = await Promise.all([
          api.get(`/users/tenant/${tenantId}/clients`),
          api.get(`/services/tenant/${tenantId}`),
          api.get(`/users/tenant/${tenantId}?role_id=3`),
        ]);
        if (cancelled) return;
        setClients(Array.isArray(cRes.data) ? cRes.data : []);
        setServices(Array.isArray(sRes.data) ? sRes.data : []);
        setStylists(Array.isArray(stRes.data) ? stRes.data : []);
      } catch (err) {
        // Fallback for tenants where /clients endpoint isn't available
        try {
          const cFallback = await api.get(`/users/tenant/${tenantId}?role_id=4`);
          if (!cancelled) setClients(Array.isArray(cFallback.data) ? cFallback.data : []);
        } catch {
          /* ignore */
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId]);

  // ── Effect: pre-fill date/time from defaultDate
  useEffect(() => {
    if (!isOpen) return;
    const base = defaultDate ? new Date(defaultDate) : new Date();
    setDate(toYyyyMmDd(base));
    if (defaultDate) {
      setTime(toHHmmLocal(base));
    } else {
      setTime("");
    }
  }, [isOpen, defaultDate]);

  // ── Effect: reset on close
  useEffect(() => {
    if (!isOpen) {
      setClientId("");
      setServiceId("");
      setStylistMode("manual");
      setStylistId("");
      setNotes("");
      setShowNewClient(false);
      setNewClient({ first_name: "", phone: "", email: "" });
    }
  }, [isOpen]);

  // ── Memos: dropdown options
  const clientOptions: ClientOpt[] = useMemo(() => {
    const map = new Map<string, any>();
    clients.forEach((c: any) => {
      const key = String(c.id);
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values()).map((c: any) => ({
      value: String(c.id),
      label: `${c.first_name || ""} ${c.last_name || ""}${c.phone ? ` — ${c.phone}` : ""}`.trim(),
    }));
  }, [clients]);

  const serviceOptions: ServiceOpt[] = useMemo(() => {
    return (services || []).map((s: any) => ({
      value: String(s.id),
      name: s.name || "",
      price: Number(s.price || 0),
      category_id: s.category_id ?? null,
      label: `${s.name || ""} — ${formatMoney(Number(s.price || 0))}`,
    }));
  }, [services]);

  const stylistOptions = useMemo(() => {
    return (stylists || []).map((s: any) => ({
      value: String(s.id),
      label: `${s.first_name || ""} ${s.last_name || ""}`.trim() || `#${s.id}`,
    }));
  }, [stylists]);

  const selectedClient = useMemo(
    () => clientOptions.find((o) => o.value === clientId) || null,
    [clientOptions, clientId]
  );

  const selectedService = useMemo(
    () => serviceOptions.find((o) => o.value === serviceId) || null,
    [serviceOptions, serviceId]
  );

  const selectedStylist = useMemo(
    () => stylistOptions.find((o) => o.value === stylistId) || null,
    [stylistOptions, stylistId]
  );

  // ── Validation: required fields for submit
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!clientId || !serviceId || !date || !time) return false;
    if (stylistMode === "manual" && !stylistId) return false;
    return true;
  }, [submitting, clientId, serviceId, date, time, stylistMode, stylistId]);

  // ── Handlers
  const handleCreateClient = async () => {
    const first_name = newClient.first_name.trim();
    const phone = newClient.phone.trim();
    const email = newClient.email.trim();

    if (!first_name) {
      Swal.fire({ icon: "warning", title: t("name_required") || "El nombre es obligatorio." });
      return;
    }
    setCreatingClient(true);
    try {
      const payload: any = {
        first_name,
        phone,
        role_id: 4,
        tenant_id: tenantId,
        password: "cliente123",
      };
      if (email) payload.email = email;

      const res = await api.post("/users", payload);
      const created = res.data;
      setClients((prev) => [...prev, created]);
      setClientId(String(created.id));
      setShowNewClient(false);
      setNewClient({ first_name: "", phone: "", email: "" });
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: t("client_created") || "Cliente creado",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: err?.response?.data?.error || err?.message || "Error al crear cliente",
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Build start_time ISO string in local tz
      const [yyyy, mm, dd] = date.split("-").map(Number);
      const [hh, mi] = time.split(":").map(Number);
      const startDateObj = new Date(yyyy, (mm || 1) - 1, dd || 1, hh || 0, mi || 0, 0, 0);
      const startISO = startDateObj.toISOString();

      if (stylistMode === "auto") {
        // Use fichero queue → /appointments/batch with is_walk_in semantics is for walk-ins (now);
        // for a scheduled auto-assign, fall back to the fichero/next pattern from AgendaRapida.tsx
        const svc = services.find((s: any) => String(s.id) === String(serviceId));
        if (!svc?.category_id) {
          throw new Error("El servicio no tiene categoría asignada. No se puede asignar desde el fichero.");
        }
        const { data: nextSt } = await api.post(`/fichero/next/${svc.category_id}`, {
          tenant_id: tenantId,
          skip_geofence: true,
        });
        if (!nextSt?.stylist_id) {
          throw new Error("No hay estilistas disponibles en el fichero para este servicio.");
        }

        const payload: any = {
          client_id: clientId,
          service_id: serviceId,
          stylist_id: nextSt.stylist_id,
          start_time: startISO,
        };
        if (notes.trim()) payload.notes = notes.trim();
        await api.post("/appointments", payload);
      } else {
        const payload: any = {
          client_id: clientId,
          service_id: serviceId,
          stylist_id: stylistId,
          start_time: startISO,
        };
        if (notes.trim()) payload.notes = notes.trim();
        await api.post("/appointments", payload);
      }

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Cita agendada",
        showConfirmButton: false,
        timer: 1800,
      });
      try {
        window.dispatchEvent(new CustomEvent("appointmentCreated"));
      } catch {
        /* ignore */
      }
      onCreated?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo crear la cita.";
      Swal.fire({ icon: "error", title: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  const isMobile = typeof window !== "undefined" && window.innerWidth < 576;

  return (
    <Offcanvas
      isOpen={isOpen}
      toggle={onClose}
      direction="end"
      style={{ width: isMobile ? "100%" : 480 }}
    >
      <OffcanvasHeader toggle={onClose} className="border-bottom">
        <div className="d-flex align-items-center gap-2">
          <i className="ri-calendar-event-line" style={{ fontSize: FS.xl, color: SC.success }}></i>
          <span className="fw-semibold">{t("schedule_appointment") || "Agendar cita"}</span>
        </div>
      </OffcanvasHeader>

      <OffcanvasBody style={{ padding: 0, display: "flex", flexDirection: "column" }}>
        {loadingData ? (
          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 240 }}>
            <Spinner /> <span className="ms-2 text-muted">{t("loading") || "Cargando"}</span>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: `${SP.xl}px ${SP.xl}px ${SP.lg}px` }}>
            {/* ── Cliente ── */}
            <div style={firstSectionStyle}>
              <div className="text-uppercase fw-semibold" style={eyebrowStyle}>
                {t("client") || "Cliente"}
              </div>
              <Select
                options={clientOptions}
                value={selectedClient}
                onChange={(opt: any) => setClientId(opt?.value || "")}
                isClearable
                placeholder={t("search_client") || "Buscar cliente"}
                noOptionsMessage={() => t("no_clients_found") || "Sin resultados"}
                styles={reactSelectStyles}
              />
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => setShowNewClient((v) => !v)}
                  style={{ fontSize: FS.md, color: SC.success }}
                >
                  <i className="ri-user-add-line me-1"></i>
                  {showNewClient ? t("cancel") || "Cancelar" : "Crear cliente nuevo"}
                </button>
              </div>

              {showNewClient && (
                <div
                  className="mt-2 p-3 rounded"
                  style={{ background: SC.surface2, border: `1px solid ${SC.border2}` }}
                >
                  <div className="row g-2">
                    <div className="col-12">
                      <Label className="form-label small mb-1">{t("name") || "Nombre"} *</Label>
                      <Input
                        bsSize="sm"
                        value={newClient.first_name}
                        onChange={(e) =>
                          setNewClient((p) => ({ ...p, first_name: e.target.value }))
                        }
                        placeholder={t("name") || "Nombre"}
                      />
                    </div>
                    <div className="col-12">
                      <Label className="form-label small mb-1">{t("phone") || "Teléfono"}</Label>
                      <Input
                        bsSize="sm"
                        value={newClient.phone}
                        onChange={(e) =>
                          setNewClient((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    <div className="col-12">
                      <Label className="form-label small mb-1">
                        {t("email") || "Email"} <span className="text-muted">(opcional)</span>
                      </Label>
                      <Input
                        bsSize="sm"
                        type="email"
                        value={newClient.email}
                        onChange={(e) =>
                          setNewClient((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="cliente@correo.com"
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end mt-1">
                      <Button
                        color="success"
                        size="sm"
                        onClick={handleCreateClient}
                        disabled={creatingClient}
                      >
                        {creatingClient ? <Spinner size="sm" /> : "Guardar cliente"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Servicio ── */}
            <div style={sectionStyle}>
              <div className="text-uppercase fw-semibold" style={eyebrowStyle}>
                {t("service") || "Servicio"}
              </div>
              <Select
                options={serviceOptions}
                value={selectedService}
                onChange={(opt: any) => setServiceId(opt?.value || "")}
                isClearable
                placeholder={t("select") || "Selecciona un servicio"}
                noOptionsMessage={() => "Sin servicios"}
                styles={reactSelectStyles}
                formatOptionLabel={(opt: any) => (
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{opt.name}</span>
                    <span className="text-muted ms-2" style={{ fontSize: FS.md }}>
                      {formatMoney(opt.price)}
                    </span>
                  </div>
                )}
              />
            </div>

            {/* ── Estilista ── */}
            <div style={sectionStyle}>
              <div className="text-uppercase fw-semibold" style={eyebrowStyle}>
                {t("stylist") || "Estilista"}
              </div>
              <FormGroup check className="mb-2">
                <Input
                  type="radio"
                  id="qad-mode-auto"
                  name="qad-stylist-mode"
                  checked={stylistMode === "auto"}
                  onChange={() => {
                    setStylistMode("auto");
                    setStylistId("");
                  }}
                />
                <Label check htmlFor="qad-mode-auto" className="ms-1">
                  Asignar automáticamente (fichero)
                </Label>
              </FormGroup>
              <FormGroup check className="mb-2">
                <Input
                  type="radio"
                  id="qad-mode-manual"
                  name="qad-stylist-mode"
                  checked={stylistMode === "manual"}
                  onChange={() => setStylistMode("manual")}
                />
                <Label check htmlFor="qad-mode-manual" className="ms-1">
                  Elegir manualmente
                </Label>
              </FormGroup>

              {stylistMode === "auto" ? (
                <div className="text-muted" style={{ fontSize: FS.md }}>
                  Se asigna desde el fichero al hacer check-in.
                </div>
              ) : (
                <Select
                  options={stylistOptions}
                  value={selectedStylist}
                  onChange={(opt: any) => setStylistId(opt?.value || "")}
                  isClearable
                  placeholder={t("select_stylist") || "Selecciona un estilista"}
                  noOptionsMessage={() => "Sin estilistas"}
                  styles={reactSelectStyles}
                />
              )}
            </div>

            {/* ── Fecha y hora ── */}
            <div style={sectionStyle}>
              <div className="text-uppercase fw-semibold" style={eyebrowStyle}>
                {t("date_and_time") || "Fecha y hora"}
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <Label className="form-label small mb-1">{t("date") || "Fecha"} *</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <Label className="form-label small mb-1">{t("time") || "Hora"} *</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Notas ── */}
            <div style={sectionStyle}>
              <div className="text-uppercase fw-semibold" style={eyebrowStyle}>
                {(t("notes") || "Notas")}{" "}
                <span className="text-muted text-lowercase fw-normal">(opcional)</span>
              </div>
              <Input
                type="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones para esta cita…"
              />
            </div>
          </div>
        )}

        {/* ── Footer (sticky) ── */}
        <div style={footerStyle}>
          <Button color="light" onClick={onClose} disabled={submitting}>
            {t("cancel") || "Cancelar"}
          </Button>
          <Button
            color="success"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="d-flex align-items-center gap-2"
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <i className="ri-calendar-event-line"></i>
            )}
            <span>{t("schedule") || "Agendar"}</span>
          </Button>
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default QuickAppointmentDrawer;
