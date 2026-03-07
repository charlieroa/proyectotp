import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Row,
  Spinner,
  FormFeedback,
  InputGroup,
} from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import Flatpickr from "react-flatpickr";
import { sileo } from "sileo";
import { useDispatch, useSelector } from "react-redux";
import { unwrapResult } from '@reduxjs/toolkit';
import Swal from 'sweetalert2';
import axios from 'axios';
import Select from 'react-select';

// Thunks
import {
  updateAppointment as onUpdateAppointment,
  createAppointmentsBatch as onCreateAppointmentsBatch,
  fetchTenantSlots,
  fetchAvailableStylists,
  addNewContact,
  createNewClient,
  cancelAppointment as onCancelAppointment,
} from "../../slices/thunks";

// Tipos
interface AppointmentFormValues {
  client_id: string;
  service_id: string;
  stylist_id: string;
  date: string | Date;
  start_time: string;
}

// Definición de Estilista con la bandera clave
type Stylist = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  is_busy?: boolean;
};

type ExtraRow = { service_id: string; stylist_id: string };

interface DigiturnoQueueItem {
  service_id: string;
  stylist_id: string;
  stylist_name: string;
  order: number;
  last_completed_at: string | null;
  total_completed: number;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: any | null;
  defaultDate?: Date | null;
  allowPastAppointments?: boolean;
  targetTenantId?: string;
}

// Helpers de fecha/hora
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

const isSameDayLocal = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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

// =================================================================
// --- INICIO DEL COMPONENTE ---
// =================================================================
const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  defaultDate,
  allowPastAppointments = false,
  targetTenantId,
}) => {
  const dispatch: any = useDispatch();
  const { clients = [], services = [] } =
    useSelector((state: any) => state.calendar || state.Calendar || {}) || {};

  const tenantId = useSelector((state: any) => state.Login?.user?.tenant_id);

  // Estados
  const [showClientModal, setShowClientModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [extraRows, setExtraRows] = useState<ExtraRow[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState<boolean>(false);
  const [availableStylists, setAvailableStylists] = useState<Stylist[]>([]);
  const [isLoadingStylists, setIsLoadingStylists] = useState<boolean>(false);
  const [availableStylistsRows, setAvailableStylistsRows] = useState<Record<number, Stylist[]>>({});
  const [isLoadingStylistsRows, setIsLoadingStylistsRows] = useState<Record<number, boolean>>({});
  const [isSuggestingMain, setIsSuggestingMain] = useState<boolean>(false);
  const [isSuggestingRow, setIsSuggestingRow] = useState<Record<number, boolean>>({});
  const [digiturnoQueue, setDigiturnoQueue] = useState<DigiturnoQueueItem[]>([]);
  const [createdClientsMap, setCreatedClientsMap] = useState<Record<string, { first_name: string; last_name?: string }>>({});
  const [closeClientModalOnSave, setCloseClientModalOnSave] = useState<boolean>(true);
  const [newClientData, setNewClientData] = useState({ first_name: '', last_name: '', phone: '' });
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const firstLoadEditRef = useRef<boolean>(false);
  const isEditMode = !!selectedEvent;

  // Determinar si la cita se puede cancelar/reagendar
  const canCancelOrReschedule = isEditMode && selectedEvent &&
    ['scheduled', 'rescheduled', 'pending_approval'].includes(selectedEvent.status);

  // Cargar cola de digiturno (informativo)
  useEffect(() => {
    if (isOpen && tenantId) {
      axios.get(`/api/appointments/digiturno/queue/${tenantId}`)
        .then((response) => setDigiturnoQueue(response.data.queue || []))
        .catch((err) => console.error('Error Digiturno Queue:', err));
    }
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isEditMode && defaultDate && !allowPastAppointments) {
      if (isDateInPast(defaultDate)) {
        Swal.fire({
          title: "Fecha no válida",
          html: "No se pueden crear citas en fechas pasadas.",
          icon: "warning",
          confirmButtonText: "Entendido",
        });
        onClose();
      }
    }
  }, [isOpen, isEditMode, defaultDate, allowPastAppointments, onClose]);

  // Formik Principal
  const validation = useFormik<AppointmentFormValues>({
    enableReinitialize: true,
    validationSchema: Yup.object({
      service_id: Yup.string().required("Seleccione un servicio."),
      date: Yup.mixed().required("Seleccione una fecha."),
      start_time: Yup.string().required("Seleccione un horario."),
      stylist_id: Yup.string().required("Seleccione un estilista."),
      client_id: Yup.string().when([], {
        is: () => !selectedEvent,
        then: (schema: any) => schema.required("Seleccione un cliente."),
        otherwise: (schema: any) => schema.notRequired(),
      }),
    }),
    initialValues: {
      client_id: "",
      service_id: "",
      stylist_id: "",
      date: "",
      start_time: "",
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(true);
      try {
        const dateObj = new Date(values.date as any);
        const [hours, minutes] = values.start_time.split(":").map(Number);
        dateObj.setHours(hours, minutes, 0, 0);
        const utcDateTimeString = dateObj.toISOString();

        if (!allowPastAppointments && isDateTimeInPast(dateObj, values.start_time)) {
          Swal.fire({ icon: 'warning', title: 'Fecha pasada', text: 'No se pueden crear citas en el pasado.' });
          setSubmitting(false);
          return;
        }
        if (!values.client_id && !selectedEvent) throw new Error("Seleccione un cliente.");

        if (selectedEvent) {
          await dispatch(onUpdateAppointment({
            id: selectedEvent.id,
            client_id: selectedEvent.client_id,
            service_id: values.service_id,
            stylist_id: values.stylist_id,
            start_time: utcDateTimeString,
          }));
          sileo.success({ title: "Cita actualizada" });
        } else {
          const allAppointments = [
            { service_id: values.service_id, stylist_id: values.stylist_id, start_time: utcDateTimeString },
            ...extraRows.filter((r) => r.service_id && r.stylist_id).map((r) => ({ ...r, start_time: utcDateTimeString })),
          ];
          await dispatch(onCreateAppointmentsBatch({ client_id: values.client_id, appointments: allAppointments }));
          sileo.success({ title: "Cita(s) agendada(s)" });
        }
        onClose();
      } catch (error: any) {
        sileo.error({ title: error?.message || "Error al agendar." });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      if (selectedEvent) {
        firstLoadEditRef.current = true;
        const { client_id, service_id, stylist_id, start_time } = selectedEvent;
        const startTimeDate = new Date(start_time);
        validation.setValues({
          ...validation.initialValues,
          client_id: String(client_id || ""),
          service_id: String(service_id || ""),
          stylist_id: String(stylist_id || ""),
          date: startTimeDate,
          start_time: toHHmmLocal(start_time),
        });
      } else {
        // Usar defaultDate si existe, si no usar hoy
        const dateToSet = defaultDate ? new Date(defaultDate) : new Date();
        validation.setFieldValue("date", dateToSet);
      }
    } else {
      validation.resetForm();
      setExtraRows([]);
      setTimeSlots([]);
      setAvailableStylists([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedEvent, defaultDate]);

  // Cargar Slots
  useEffect(() => {
    const { service_id, date } = validation.values;
    if (!(isEditMode && firstLoadEditRef.current)) validation.setFieldValue("start_time", "");

    if (service_id && date) {
      setIsLoadingTimeSlots(true);
      const dateStr = toYyyyMmDd(date);
      dispatch(fetchTenantSlots(dateStr, service_id, targetTenantId))
        .then((payload: any) => {
          const fetched = normalizeSlotsPayload(payload);
          let filtered = fetched;
          if (!allowPastAppointments) {
            const selectedDate = new Date(date as any);
            const now = new Date();
            if (isSameDayLocal(selectedDate, now)) {
              const currentMins = now.getHours() * 60 + now.getMinutes();
              filtered = fetched.filter((t) => hhmmToMinutes(t) > currentMins);
            }
          }
          const current = validation.values.start_time;
          if (!filtered.includes(current) && current) validation.setFieldValue("start_time", "");
          setTimeSlots(filtered);
        })
        .finally(() => setIsLoadingTimeSlots(false));
    } else {
      setTimeSlots([]);
    }
  }, [validation.values.service_id, validation.values.date, dispatch]);

  // =========================================================
  // CARGA DE ESTILISTAS (LÓGICA SIMPLE, EL ORDEN SE HACE EN MEMO)
  // =========================================================
  useEffect(() => {
    const { service_id, date, start_time } = validation.values;
    if (!(isEditMode && firstLoadEditRef.current)) validation.setFieldValue("stylist_id", "");

    if (service_id && date && start_time) {
      setIsLoadingStylists(true);
      const dateStr = toYyyyMmDd(date);

      dispatch(fetchAvailableStylists(dateStr, start_time, service_id, targetTenantId))
        .then((stylists: Stylist[]) => {
          console.log("Estilistas recibidos del backend:", stylists);
          setAvailableStylists(stylists);
        })
        .catch(() => setAvailableStylists([]))
        .finally(() => {
          setIsLoadingStylists(false);
          if (firstLoadEditRef.current) firstLoadEditRef.current = false;
        });
    } else {
      setAvailableStylists([]);
    }
  }, [validation.values.service_id, validation.values.date, validation.values.start_time, dispatch]);

  // =========================================================
  // 🔥 ORDENAMIENTO VISUAL FORZADO (MEMOIZADO) 🔥
  // =========================================================
  const sortedStylistsForDropdown = useMemo(() => {
    if (!availableStylists || availableStylists.length === 0) return [];

    // Creamos una copia para ordenar
    const sorted = [...availableStylists].sort((a, b) => {
      // Convertimos a booleano seguro
      const aBusy = Boolean(a.is_busy);
      const bBusy = Boolean(b.is_busy);

      // Queremos: Falsos (Libres) primero, Verdaderos (Ocupados) después
      if (aBusy === bBusy) return 0; // Si son iguales, respeta orden del backend
      return aBusy ? 1 : -1; // True va al final (1), False al principio (-1)
    });

    console.log("🔄 Lista Reordenada para UI (Libres primero):", sorted.map(s => `${s.first_name} (${s.is_busy})`));

    // Si hay un estilista seleccionado, lo ponemos al principio siempre (para que aparezca seleccionado)
    const currentId = validation.values.stylist_id;
    if (currentId && !sorted.find(s => String(s.id) === String(currentId))) {
      // Si el seleccionado no está en la lista (raro), no hacemos nada especial
      return sorted;
    }

    return sorted;
  }, [availableStylists, validation.values.stylist_id]);

  // Helpers
  const isStylistUsedElsewhere = (stylistId: string | number) => {
    return extraRows.some((r) => String(r.stylist_id) === String(stylistId));
  };

  // DIGITURNO
  const handleSuggestMain = async () => {
    const { service_id, date, start_time } = validation.values;
    if (!service_id || !date || !start_time) return sileo.info({ title: "Complete los datos primero." });
    setIsSuggestingMain(true);
    try {
      const dateStr = toYyyyMmDd(date);
      const stylists: Stylist[] = await dispatch(fetchAvailableStylists(dateStr, start_time, service_id, targetTenantId));

      // Lógica de asignación: El primero que NO esté ocupado y NO esté usado
      const nextStylist = stylists.find(s => !s.is_busy && !isStylistUsedElsewhere(s.id));

      if (nextStylist) {
        validation.setFieldValue("stylist_id", String(nextStylist.id));
        sileo.success({ title: `Asignado: ${nextStylist.first_name}` });
      } else {
        sileo.warning({ title: "Todos los estilistas están ocupados." });
      }
    } catch (e) { sileo.error({ title: "Error al consultar digiturno" }); }
    finally { setIsSuggestingMain(false); }
  };

  // UI Helpers
  const canSubmit = useMemo(() => validation.isValid && !validation.isSubmitting, [validation.isValid, validation.isSubmitting]);
  const currentStylistLabel = (() => {
    const id = validation.values.stylist_id;
    if (!id) return "";
    const found = availableStylists.find((s) => String(s.id) === String(id));
    if (found) return `${found.first_name || ""} ${found.last_name || ""}`;
    return `Estilista Seleccionado`;
  })();

  // Deduplicar clientes por id y formatear para react-select
  const clientOptions = useMemo(() => {
    const map = new Map<string, any>();
    (clients || []).forEach((c: any) => {
      const key = String(c.id);
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values()).map((c: any) => ({
      value: String(c.id),
      label: `${c.first_name || ''} ${c.last_name || ''}${c.phone ? ` — ${c.phone}` : ''}`.trim(),
    }));
  }, [clients]);

  const selectedClientOption = useMemo(() => {
    return clientOptions.find(o => o.value === validation.values.client_id) || null;
  }, [clientOptions, validation.values.client_id]);

  // Cancelar cita
  const handleCancelAppointment = async () => {
    if (!selectedEvent?.id) return;
    setIsCancelling(true);
    try {
      await dispatch(onCancelAppointment(selectedEvent.id));
      setShowCancelModal(false);
      onClose();
    } catch (err: any) {
      // error already shown by thunk
    } finally {
      setIsCancelling(false);
    }
  };

  // Reagendar: cerrar modal de confirmación y poner el form en modo edición
  const handleReschedule = () => {
    setShowCancelModal(false);
    // El form ya está en modo edición, solo limpiar fecha/hora para que elija nuevos
    validation.setFieldValue("date", new Date());
    validation.setFieldValue("start_time", "");
    validation.setFieldValue("stylist_id", "");
  };

  const handleCreateClient = async () => {
    const { first_name, last_name, phone } = newClientData;
    if (!first_name.trim()) {
      sileo.warning({ title: 'El nombre es obligatorio.' });
      return;
    }
    setIsCreatingClient(true);
    try {
      const result = await dispatch(createNewClient({ first_name: first_name.trim(), last_name: last_name.trim(), phone: phone.trim() }, targetTenantId));
      validation.setFieldValue('client_id', String(result.id));
      setShowClientModal(false);
      setNewClientData({ first_name: '', last_name: '', phone: '' });
      sileo.success({ title: 'Cliente creado' });
    } catch (err: any) {
      sileo.error({ title: err?.message || 'Error al crear cliente' });
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered size="lg">
      <ModalHeader toggle={onClose} className="bg-light">
        {isEditMode ? "Detalle de Cita" : "Agendar Cita"}
      </ModalHeader>
      <ModalBody>
        {/* Info card when viewing/editing existing appointment */}
        {isEditMode && selectedEvent && (
          <div className="bg-light rounded p-3 mb-3 border">
            <Row>
              <Col xs={6}>
                <div className="mb-2">
                  <small className="text-muted d-block">Servicio</small>
                  <strong>{selectedEvent.service_name || 'Sin servicio'}</strong>
                </div>
              </Col>
              <Col xs={6}>
                <div className="mb-2">
                  <small className="text-muted d-block">Estado</small>
                  <span className={`badge ${selectedEvent.status === 'completed' ? 'bg-success' : selectedEvent.status === 'cancelled' ? 'bg-danger' : selectedEvent.status === 'checked_in' ? 'bg-info' : 'bg-primary'}`}>
                    {selectedEvent.status === 'scheduled' ? 'Agendada' : selectedEvent.status === 'completed' ? 'Completada' : selectedEvent.status === 'cancelled' ? 'Cancelada' : selectedEvent.status === 'checked_in' ? 'En atención' : selectedEvent.status === 'checked_out' ? 'Finalizada' : selectedEvent.status || 'Agendada'}
                  </span>
                </div>
              </Col>
              <Col xs={6}>
                <div className="mb-2">
                  <small className="text-muted d-block">Cliente</small>
                  <strong><i className="ri-user-line me-1"></i>{selectedEvent.client_first_name || ''} {selectedEvent.client_last_name || ''}</strong>
                </div>
              </Col>
              <Col xs={6}>
                <div className="mb-2">
                  <small className="text-muted d-block">Estilista</small>
                  <strong><i className="ri-scissors-line me-1"></i>{selectedEvent.stylist_first_name || ''} {selectedEvent.stylist_last_name || ''}</strong>
                </div>
              </Col>
              <Col xs={6}>
                <div>
                  <small className="text-muted d-block">Hora</small>
                  <strong><i className="ri-time-line me-1"></i>
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                    {selectedEvent.end_time ? ` - ${new Date(selectedEvent.end_time).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                  </strong>
                </div>
              </Col>
              <Col xs={6}>
                <div>
                  <small className="text-muted d-block">Fecha</small>
                  <strong><i className="ri-calendar-line me-1"></i>
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                  </strong>
                </div>
              </Col>
            </Row>

            {/* Botones de acción para cita existente */}
            {canCancelOrReschedule && (
              <div className="mt-3 pt-2 border-top">
                <Button color="danger" outline size="sm" onClick={() => setShowCancelModal(true)}>
                  <i className="ri-close-circle-line me-1"></i>Cancelar / Reagendar Cita
                </Button>
              </div>
            )}
          </div>
        )}

        <Form onSubmit={(e) => { e.preventDefault(); validation.handleSubmit(); }}>
          <Row className="g-3">
            {/* Cliente */}
            <Col xs={12}>
              <FormGroup>
                <Label>Cliente*</Label>
                <div className="d-flex gap-2">
                  <div className="flex-grow-1">
                    <Select
                      options={clientOptions}
                      value={selectedClientOption}
                      onChange={(opt: any) => validation.setFieldValue('client_id', opt?.value || '')}
                      isDisabled={isEditMode}
                      isClearable
                      placeholder="Buscar cliente..."
                      noOptionsMessage={() => 'No se encontraron clientes'}
                      styles={{
                        control: (base: any) => ({ ...base, minHeight: 38 }),
                        menu: (base: any) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                  {!isEditMode && (
                    <Button color="success" outline onClick={() => setShowClientModal(true)} title="Crear nuevo cliente">
                      <i className="ri-user-add-line"></i>
                    </Button>
                  )}
                </div>
              </FormGroup>
            </Col>

            {/* Servicio */}
            <Col xs={12}>
              <FormGroup>
                <Label>Servicio*</Label>
                {services.length === 0 ? (
                  <div className="alert alert-warning py-2 mb-0">
                    <i className="ri-information-line me-1"></i>
                    No hay servicios configurados para este negocio. Agregue servicios desde la configuración.
                  </div>
                ) : (
                  <Input type="select" name="service_id" onChange={validation.handleChange} value={validation.values.service_id}>
                    <option value="">Seleccione...</option>
                    {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Input>
                )}
              </FormGroup>
            </Col>

            {/* Fecha/Hora */}
            <Col md={6}>
              <FormGroup>
                <Label>Fecha*</Label>
                <Flatpickr className="form-control" value={validation.values.date as any} onChange={([d]) => validation.setFieldValue("date", d)} options={{ dateFormat: "Y-m-d", minDate: "today" }} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Hora*</Label>
                <Input type="select" name="start_time" onChange={validation.handleChange} value={validation.values.start_time} disabled={isLoadingTimeSlots}>
                  <option value="">Seleccione...</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                </Input>
              </FormGroup>
            </Col>

            {/* Estilista */}
            <Col xs={12}>
              <FormGroup>
                <Label>Estilista*</Label>
                <div className="d-flex gap-2">
                  <Input type="select" name="stylist_id" onChange={validation.handleChange} value={validation.values.stylist_id} disabled={isLoadingStylists}>
                    <option value="">{isLoadingStylists ? "Cargando..." : "Seleccione..."}</option>

                    {/* Opción Actual si existe y no está en la lista */}
                    {validation.values.stylist_id && !sortedStylistsForDropdown.find(s => String(s.id) === String(validation.values.stylist_id)) && (
                      <option value={validation.values.stylist_id}>{currentStylistLabel}</option>
                    )}

                    {/* ✅ LISTA ORDENADA CON INDICADORES VISUALES */}
                    {sortedStylistsForDropdown.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        className={s.is_busy ? "text-danger bg-light fw-bold" : "text-success fw-bold"}
                      >
                        {/* Iconos para depurar visualmente */}
                        {s.is_busy ? `🔴 (Ocupado)` : `🟢 (Libre)`} - {s.first_name} {s.last_name}
                      </option>
                    ))}
                  </Input>

                  <Button color="info" outline onClick={handleSuggestMain} disabled={isSuggestingMain} title="Asignación Inteligente">
                    {isSuggestingMain ? <Spinner size="sm" /> : <><i className="ri-magic-line me-1"></i>Digiturno</>}
                  </Button>
                </div>
              </FormGroup>
            </Col>
          </Row>

          <div className="hstack gap-2 justify-content-end mt-4">
            <Button color="light" onClick={onClose}>Cancelar</Button>
            <Button type="submit" color="success" disabled={!canSubmit}>Agendar</Button>
          </div>
        </Form>
      </ModalBody>

      {/* Modal Cancelar / Reagendar */}
      <Modal isOpen={showCancelModal} toggle={() => setShowCancelModal(false)} centered size="sm">
        <ModalHeader toggle={() => setShowCancelModal(false)} className="bg-light">
          <i className="ri-question-line me-1"></i> ¿Qué deseas hacer con esta cita?
        </ModalHeader>
        <ModalBody className="text-center">
          {selectedEvent && (
            <div className="mb-3 text-start">
              <p className="mb-1"><strong>{selectedEvent.service_name}</strong></p>
              <p className="mb-1 text-muted">
                <i className="ri-user-line me-1"></i>{selectedEvent.client_first_name} {selectedEvent.client_last_name}
              </p>
              <p className="mb-0 text-muted">
                <i className="ri-time-line me-1"></i>
                {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
              </p>
            </div>
          )}
          <hr />
          <div className="d-grid gap-2">
            <Button color="warning" onClick={handleReschedule} className="d-flex align-items-center justify-content-center gap-2">
              <i className="ri-calendar-event-line"></i> Reagendar Cita
            </Button>
            <Button color="danger" onClick={handleCancelAppointment} disabled={isCancelling} className="d-flex align-items-center justify-content-center gap-2">
              {isCancelling ? <Spinner size="sm" /> : <><i className="ri-close-circle-line"></i> Cancelar Cita</>}
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* Modal Crear Cliente */}
      <Modal isOpen={showClientModal} toggle={() => setShowClientModal(false)} centered size="sm">
        <ModalHeader toggle={() => setShowClientModal(false)} className="bg-light">
          Nuevo Cliente
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Nombre*</Label>
            <Input
              value={newClientData.first_name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="Nombre"
            />
          </FormGroup>
          <FormGroup>
            <Label>Apellido</Label>
            <Input
              value={newClientData.last_name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Apellido"
            />
          </FormGroup>
          <FormGroup>
            <Label>Teléfono</Label>
            <Input
              value={newClientData.phone}
              onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Ej: 3001234567"
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowClientModal(false)}>Cancelar</Button>
          <Button color="success" onClick={handleCreateClient} disabled={isCreatingClient}>
            {isCreatingClient ? <Spinner size="sm" /> : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>
    </Modal>
  );
};

export default AppointmentModal;