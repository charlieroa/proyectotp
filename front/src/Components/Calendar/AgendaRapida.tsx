import React, { useEffect, useMemo, useState } from "react";
import {
  Button, Col, Form, FormGroup, Input, Label, Modal, ModalBody,
  ModalHeader, Row, Spinner,
} from "reactstrap";
import Select from "react-select";
import { sileo } from "sileo";
import { useTranslation } from 'react-i18next';
import { api } from "../../services/api";
import { getTenantIdFromToken } from "../../services/auth";

interface AgendaRapidaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetTenantId?: string;
}

type AssignMode = 'auto' | 'manual';
type ServiceRow = { service_id: string; mode: AssignMode; stylist_id: string };

const AgendaRapida: React.FC<AgendaRapidaProps> = ({
  isOpen, onClose, onSuccess, targetTenantId,
}) => {
  const { t } = useTranslation();
  const tenantId = targetTenantId || getTenantIdFromToken();

  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [stylists, setStylists] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([{ service_id: "", mode: 'auto', stylist_id: "" }]);
  const [submitting, setSubmitting] = useState(false);

  // Inline new client
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ first_name: "", phone: "" });
  const [creatingClient, setCreatingClient] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setLoadingData(true);
    (async () => {
      try {
        const [cRes, sRes, qRes, stRes] = await Promise.all([
          api.get(`/users/tenant/${tenantId}?role_id=4`),
          api.get(`/services/tenant/${tenantId}`),
          api.get(`/fichero/tenant/${tenantId}?include_absent=true`),
          api.get(`/users/tenant/${tenantId}?role_id=3`),
        ]);
        setClients(cRes.data || []);
        setServices(sRes.data || []);
        setStylists(Array.isArray(stRes.data) ? stRes.data : []);

        let queueData = qRes.data || [];
        // Auto-inicializar fichero si está vacío
        if (queueData.length === 0) {
          try {
            await api.post(`/fichero/reset/${tenantId}`);
            const refreshed = await api.get(`/fichero/tenant/${tenantId}?include_absent=true`);
            queueData = refreshed.data || [];
          } catch (e) {
            console.error("Error auto-inicializando fichero:", e);
          }
        }
        setQueues(queueData);
      } catch (err) {
        console.error("Error cargando datos agenda rápida:", err);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [isOpen, tenantId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setClientId("");
      setServiceRows([{ service_id: "", mode: 'auto', stylist_id: "" }]);
      setShowNewClient(false);
      setNewClient({ first_name: "", phone: "" });
    }
  }, [isOpen]);

  const clientOptions = useMemo(() => {
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

  const handleCreateClient = async () => {
    if (!newClient.first_name.trim()) {
      sileo.warning({ title: t("name_required") });
      return;
    }
    setCreatingClient(true);
    try {
      const payload: any = { first_name: newClient.first_name.trim(), phone: newClient.phone.trim(), role_id: 4, tenant_id: tenantId, password: 'cliente123' };
      const res = await api.post("/users", payload);
      const created = res.data;
      setClients((prev) => [...prev, created]);
      setClientId(String(created.id));
      setShowNewClient(false);
      setNewClient({ first_name: "", phone: "" });
      sileo.success({ title: t("client_created") });
    } catch (err: any) {
      sileo.error({ title: err?.response?.data?.error || "Error al crear cliente" });
    } finally {
      setCreatingClient(false);
    }
  };

  // Previews para filas en modo "auto" (ajusta posición si varias filas comparten categoría)
  const rowPreviews = useMemo(() => {
    const usedByCategory: Record<string, number> = {};
    return serviceRows.map((row) => {
      if (!row.service_id) return null;
      if (row.mode === 'manual') return null;
      const svc = services.find((s: any) => s.id === row.service_id);
      if (!svc?.category_id) return { error: "Servicio sin categoría" };
      const queue = queues.find((q: any) => q.category_id === svc.category_id);
      if (!queue || !queue.stylists || queue.stylists.length === 0) {
        return { error: "No hay estilistas disponibles" };
      }
      const pos = usedByCategory[svc.category_id] || 0;
      if (pos >= queue.stylists.length) {
        return { error: "No hay más estilistas disponibles en esta cola" };
      }
      usedByCategory[svc.category_id] = pos + 1;
      const next = queue.stylists[pos];
      return {
        name: `${next.first_name || ""} ${next.last_name || ""}`.trim(),
        queue_size: queue.stylists.length,
        is_present: !!next.is_inside_geofence,
      };
    });
  }, [serviceRows, services, queues]);

  const updateRow = (idx: number, patch: Partial<ServiceRow>) => {
    setServiceRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  // Estilistas disponibles para modo Manual: los que están en la cola del fichero
  // para la categoría del servicio seleccionado (mismo set que usa el modo Auto).
  const manualStylistsForRow = (row: ServiceRow) => {
    if (!row.service_id) return [];
    const svc = services.find((s: any) => s.id === row.service_id);
    if (!svc?.category_id) return stylists; // fallback si el servicio no tiene categoría
    const q = queues.find((qq: any) => qq.category_id === svc.category_id);
    return (q?.stylists || []).map((st: any) => ({
      id: st.stylist_id,
      first_name: st.first_name,
      last_name: st.last_name,
    }));
  };

  const addRow = () => setServiceRows(prev => [...prev, { service_id: "", mode: 'auto', stylist_id: "" }]);

  const removeRow = (idx: number) => {
    if (serviceRows.length <= 1) return;
    setServiceRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = serviceRows.filter(r => r.service_id && (r.mode === 'auto' || r.stylist_id));
    if (!clientId || validRows.length === 0) {
      sileo.warning({ title: t("complete_required_fields") });
      return;
    }

    setSubmitting(true);
    try {
      // Asignar estilista: auto (desde fichero) o manual (estilista elegido)
      const assigned: Array<{ service_id: string; stylist_id: string; stylist_name: string }> = [];
      for (const row of validRows) {
        const svc = services.find((s: any) => s.id === row.service_id);

        if (row.mode === 'manual') {
          const st = stylists.find((s: any) => String(s.id) === String(row.stylist_id));
          assigned.push({
            service_id: row.service_id,
            stylist_id: row.stylist_id,
            stylist_name: `${st?.first_name || ""} ${st?.last_name || ""}`.trim(),
          });
          continue;
        }

        if (!svc?.category_id) {
          sileo.error({ title: `El servicio "${svc?.name || ""}" no tiene categoría asignada. No se puede asignar desde el fichero.` });
          setSubmitting(false);
          return;
        }
        try {
          const { data } = await api.post(`/fichero/next/${svc.category_id}`, { tenant_id: tenantId, skip_geofence: true });
          if (!data?.stylist_id) {
            sileo.error({ title: `No hay estilistas disponibles en el fichero para "${svc.name}".` });
            setSubmitting(false);
            return;
          }
          assigned.push({
            service_id: row.service_id,
            stylist_id: data.stylist_id,
            stylist_name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          });
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.response?.data?.error || `No hay estilistas disponibles para "${svc.name}".`;
          sileo.error({ title: msg });
          setSubmitting(false);
          return;
        }
      }

      // Walk-in: usar hora actual
      const utcDateTime = new Date().toISOString();

      const payload: any = {
        client_id: clientId,
        appointments: assigned.map(a => ({
          service_id: a.service_id,
          stylist_id: a.stylist_id,
          start_time: utcDateTime,
        })),
        is_walk_in: true,
        notes: "[WALK-IN]",
      };

      if (targetTenantId) payload.target_tenant_id = targetTenantId;

      await api.post("/appointments/batch", payload);
      const names = assigned.map(a => a.stylist_name).filter(Boolean).join(", ");
      const baseTitle = assigned.length > 1 ? `${assigned.length} citas agendadas` : t("express_scheduled");
      sileo.success({ title: names ? `${baseTitle} — ${names}` : baseTitle });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      sileo.error({ title: err?.response?.data?.error || t("scheduling_error") });
    } finally {
      setSubmitting(false);
    }
  };

  const hasAtLeastOneValid = serviceRows.some(r => r.service_id && (r.mode === 'auto' || r.stylist_id));
  const hasPreviewError = rowPreviews.some((p) => p && 'error' in p);
  const canSubmit = clientId && hasAtLeastOneValid && !hasPreviewError && !submitting;

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="md">
      <ModalHeader toggle={onClose} className="bg-success-subtle">
        <i className="ri-flashlight-line me-2"></i>{t("quick_schedule")}
        <small className="d-block text-muted fw-normal" style={{ fontSize: "0.75rem" }}>
          {t("express_appointment")}
        </small>
      </ModalHeader>
      <ModalBody>
        {loadingData ? (
          <div className="text-center p-4"><Spinner /> <span className="ms-2">{t("loading")}</span></div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              {/* Cliente */}
              <Col xs={12}>
                <FormGroup className="mb-0">
                  <Label className="fw-medium">{t("client")} *</Label>
                  <div className="d-flex gap-2">
                    <div className="flex-grow-1">
                      <Select
                        options={clientOptions}
                        value={clientOptions.find((o) => o.value === clientId) || null}
                        onChange={(opt: any) => setClientId(opt?.value || "")}
                        isClearable
                        placeholder={t("search_client")}
                        noOptionsMessage={() => "Sin resultados"}
                        styles={{
                          control: (base: any) => ({ ...base, minHeight: 38 }),
                          menu: (base: any) => ({ ...base, zIndex: 9999 }),
                        }}
                      />
                    </div>
                    <Button
                      color="success"
                      outline
                      size="sm"
                      onClick={() => setShowNewClient(!showNewClient)}
                      title={t("new_client_lower")}
                    >
                      <i className="ri-user-add-line"></i>
                    </Button>
                  </div>
                </FormGroup>
                {showNewClient && (
                  <div className="border rounded p-2 mt-2 bg-light">
                    <Row className="g-2 align-items-end">
                      <Col xs={5}>
                        <Input
                          bsSize="sm"
                          placeholder="Nombre *"
                          value={newClient.first_name}
                          onChange={(e) => setNewClient((p) => ({ ...p, first_name: e.target.value }))}
                        />
                      </Col>
                      <Col xs={4}>
                        <Input
                          bsSize="sm"
                          placeholder="Teléfono"
                          value={newClient.phone}
                          onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </Col>
                      <Col xs={3}>
                        <Button color="success" size="sm" block onClick={handleCreateClient} disabled={creatingClient}>
                          {creatingClient ? <Spinner size="sm" /> : "Crear"}
                        </Button>
                      </Col>
                    </Row>
                  </div>
                )}
              </Col>

              {/* Servicios */}
              <Col xs={12}>
                <Label className="fw-medium">{t("service")} *</Label>
                {serviceRows.map((row, idx) => {
                  const preview = rowPreviews[idx];
                  return (
                    <div key={idx} className={`border rounded p-2 ${idx > 0 ? 'mt-2' : ''}`} style={{ background: '#fafafa' }}>
                      <div className="d-flex gap-2">
                        <Input
                          type="select"
                          className="flex-grow-1"
                          value={row.service_id}
                          onChange={(e) => updateRow(idx, { service_id: e.target.value, stylist_id: "" })}
                        >
                          <option value="">{t("select")} {t("service").toLowerCase()}</option>
                          {services.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </Input>
                        {serviceRows.length > 1 && (
                          <Button color="danger" outline size="sm" onClick={() => removeRow(idx)} style={{ minWidth: 34 }}>
                            <i className="ri-close-line"></i>
                          </Button>
                        )}
                      </div>

                      {/* Toggle modo asignación */}
                      <div className="btn-group btn-group-sm w-100 mt-2" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name={`mode-${idx}`}
                          id={`mode-auto-${idx}`}
                          checked={row.mode === 'auto'}
                          onChange={() => updateRow(idx, { mode: 'auto', stylist_id: "" })}
                        />
                        <label className="btn btn-outline-info" htmlFor={`mode-auto-${idx}`}>
                          <i className="ri-list-ordered me-1"></i>Auto (fichero)
                        </label>
                        <input
                          type="radio"
                          className="btn-check"
                          name={`mode-${idx}`}
                          id={`mode-manual-${idx}`}
                          checked={row.mode === 'manual'}
                          onChange={() => updateRow(idx, { mode: 'manual' })}
                        />
                        <label className="btn btn-outline-primary" htmlFor={`mode-manual-${idx}`}>
                          <i className="ri-user-line me-1"></i>Manual
                        </label>
                      </div>

                      {/* Dropdown manual de estilista (filtrado por categoría del servicio) */}
                      {row.mode === 'manual' && (() => {
                        const opts = manualStylistsForRow(row);
                        if (!row.service_id) {
                          return (
                            <div className="mt-2 small text-muted">
                              <i className="ri-information-line me-1"></i>Selecciona primero un servicio.
                            </div>
                          );
                        }
                        if (opts.length === 0) {
                          return (
                            <div className="mt-2 small text-danger">
                              <i className="ri-error-warning-line me-1"></i>No hay estilistas que hagan este servicio.
                            </div>
                          );
                        }
                        return (
                          <Input
                            type="select"
                            className="mt-2"
                            value={row.stylist_id}
                            onChange={(e) => updateRow(idx, { stylist_id: e.target.value })}
                          >
                            <option value="">{t("select_stylist") || "Seleccionar estilista"}</option>
                            {opts.map((s: any) => (
                              <option key={String(s.id)} value={String(s.id)}>
                                {s.first_name || ''} {s.last_name || ''}
                              </option>
                            ))}
                          </Input>
                        );
                      })()}

                      {/* Preview (solo modo auto) */}
                      {row.mode === 'auto' && preview && (
                        preview.error ? (
                          <div className="mt-1 small text-danger">
                            <i className="ri-error-warning-line me-1"></i>{preview.error}
                          </div>
                        ) : (
                          <div className="mt-1 small d-flex align-items-center gap-2 ps-1 flex-wrap">
                            <i className="ri-user-star-line text-success"></i>
                            <span className="text-muted">Se asignará a:</span>
                            <span className="fw-semibold text-success">{preview.name}</span>
                            {preview.is_present ? (
                              <span className="badge bg-success-subtle text-success">
                                <i className="ri-map-pin-line me-1"></i>Presente
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning">
                                <i className="ri-map-pin-off-line me-1"></i>Fuera de geocerca
                              </span>
                            )}
                            <span className="badge bg-light text-muted ms-auto">
                              {preview.queue_size} en cola
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-light border border-dashed w-100 mt-2 py-1 text-muted small"
                  onClick={addRow}
                  style={{ borderStyle: 'dashed' }}
                >
                  <i className="ri-add-circle-line me-1"></i>Agregar otro servicio
                </button>
              </Col>
            </Row>

            <div className="hstack gap-2 justify-content-end mt-4">
              <Button color="light" onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" color="success" disabled={!canSubmit}>
                {submitting ? <Spinner size="sm" className="me-1" /> : <i className="ri-flashlight-line me-1"></i>}
                {serviceRows.filter(r => r.service_id).length > 1
                  ? `Agendar ${serviceRows.filter(r => r.service_id).length} servicios`
                  : t("schedule_express")
                }
              </Button>
            </div>
          </Form>
        )}
      </ModalBody>
    </Modal>
  );
};

export default AgendaRapida;
