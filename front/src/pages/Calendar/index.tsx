// =============================================
// File: src/pages/Calendar/index.tsx
// =============================================
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardBody, Container, Row, Col, Input } from "reactstrap";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from "@fullcalendar/list";
import esLocale from "@fullcalendar/core/locales/es";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";

import useCalendarSocket from "../../hooks/useCalendarSocket";

import {
  getCalendarData as onGetCalendarData,
  updateAppointment as onUpdateAppointment,
  cancelAppointment as onCancelAppointment,
} from "../../slices/thunks";

import { fetchTenantSettings } from "../../slices/Settings/settingsSlice";

import BreadCrumb from "../../Components/Common/BreadCrumb";
import CentroDeCitasDiarias from "../../Components/Calendar/CentroDeCitasDiarias";
import AppointmentModal from "../../Components/Calendar/AppointmentModal";
import { getIsPrimaryBranch, getTenantIdFromToken } from "../../services/auth";
import api from "../../services/api";

type BranchOption = { id: string; name: string; };

// ✅ HELPER: Verificar si una fecha es pasada (solo fecha, sin hora)
const isDateInPast = (date: Date): boolean => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return checkDate < today;
};

// ✅ HELPER: Verificar si una fecha/hora específica es pasada
const isDateTimeInPast = (date: Date): boolean => date < new Date();

// ✅ HELPER: ¿El día está abierto según workingHours?
const isDayOpen = (date: Date, workingHours: any): boolean => {
  if (!workingHours || typeof workingHours !== "object" || Object.keys(workingHours).length === 0) {
    // Si no hay configuración, permitimos por defecto
    return true;
  }
  const dayIndex = date.getDay(); // 0: domingo ... 6: sábado
  const esKey = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][dayIndex];
  const enKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayIndex];
  const daySchedule = (workingHours as any)[esKey] || (workingHours as any)[enKey];

  if (daySchedule === undefined) return true;

  // Puede venir como string ("09:00-17:00" o "cerrado")
  if (typeof daySchedule === "string") {
    const s = daySchedule.toLowerCase();
    if (s === "cerrado" || s === "closed") return false;
    return true;
  }

  // O como objeto { active: boolean, start: string, end: string }
  if (typeof daySchedule === "object" && daySchedule !== null) {
    if ((daySchedule as any).active === false) return false;
    return true;
  }

  return true;
};

const Calendar = () => {
  document.title = "Calendario | Sistema de Peluquerias";
  const dispatch: any = useDispatch();

  const { events, loading, tenantWorkingHours } = useSelector((state: any) => state.Calendar);

  const settingsState = useSelector((state: any) => state.Settings || state.settings);
  const settingsLoaded = settingsState?.loaded === true;
  const allowPastAppointments = settingsState?.data?.allow_past_appointments ?? false;

  const loginState = useSelector((s: any) => s.Login || {});
  const tenantId = useMemo(() => {
    const fromRedux = loginState?.user?.user?.tenant_id || loginState?.user?.tenant_id;
    if (fromRedux) return fromRedux;
    try {
      const stored = JSON.parse(sessionStorage.getItem('authUser') || '{}');
      if (stored?.user?.tenant_id) return stored.user.tenant_id;
      if (stored?.tenant_id) return stored.tenant_id;
    } catch {}
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.user?.tenant_id) return payload.user.tenant_id;
      }
    } catch {}
    return null;
  }, [loginState]);

  // --- Selector de sucursal (cross-branch) ---
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const isPrimary = getIsPrimaryBranch();

  // Cargar sucursales si es primary branch
  useEffect(() => {
    if (!isPrimary) return;
    api.get('/tenants/my-businesses')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 1) {
          setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});
  }, [isPrimary]);

  // El tenant efectivo: el seleccionado o el propio
  const effectiveTenantId = selectedBranchId || tenantId;
  // Solo pasar targetTenantId cuando es diferente al propio
  const targetTenantId = selectedBranchId && selectedBranchId !== tenantId ? selectedBranchId : undefined;

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(onGetCalendarData(targetTenantId || undefined));
    dispatch(fetchTenantSettings(targetTenantId || undefined));
  }, [dispatch, targetTenantId]);

  const refreshCalendar = useCallback(() => {
    dispatch(onGetCalendarData(targetTenantId || undefined));
  }, [dispatch, targetTenantId]);

  useCalendarSocket({
    tenantId: effectiveTenantId,
    onAnyChange: () => {
      console.log('🔄 [CALENDAR] Refrescando por WebSocket...');
      refreshCalendar();
    },
  });

  const handleDateClick = (arg: any) => {
    const clickedDate = arg.date as Date;

    // ✅ VALIDACIÓN 1: Verificar si el día está abierto
    if (!isDayOpen(clickedDate, tenantWorkingHours)) {
      Swal.fire({
        title: "Día no disponible",
        text: "Este día no está seleccionado en tu configuración de horarios.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ VALIDACIÓN 2: Solo bloquear pasado cuando YA cargaron settings
    if (settingsLoaded && !allowPastAppointments && isDateInPast(clickedDate)) {
      Swal.fire({
        title: "Fecha pasada",
        html:
          "No se pueden crear citas en fechas pasadas.<br><small class='text-muted'>Puedes habilitarlo en Configuración &rarr; Datos de la peluquería.</small>",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ Si pasa ambas validaciones, abrir modal
    setSelectedEvent(null);
    setDefaultDate(clickedDate);
    setModalOpen(true);
  };

  const handleEventClick = (arg: any) => {
    const eventData = arg.event.extendedProps;
    const canModify = ['scheduled', 'rescheduled', 'pending_approval'].includes(eventData.status);

    if (!canModify) {
      setSelectedEvent(eventData);
      setDefaultDate(null);
      setModalOpen(true);
      return;
    }

    const startTime = eventData.start_time
      ? new Date(eventData.start_time).toLocaleString('es-CO', {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: 'numeric', minute: '2-digit', hour12: true,
        })
      : '';

    Swal.fire({
      title: '¿Qué deseas hacer con esta cita?',
      html: `<div class="text-start">
        <p class="mb-1"><strong>${eventData.service_name || 'Servicio'}</strong></p>
        <p class="mb-1" style="color:#878a99"><i class="ri-user-line me-1"></i>${eventData.client_first_name || ''} ${eventData.client_last_name || ''}</p>
        <p class="mb-1" style="color:#878a99"><i class="ri-scissors-line me-1"></i>${eventData.stylist_first_name || ''} ${eventData.stylist_last_name || ''}</p>
        <p class="mb-0" style="color:#878a99"><i class="ri-time-line me-1"></i>${startTime}</p>
      </div>`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '<i class="ri-calendar-event-line me-1"></i> Reprogramar',
      denyButtonText: '<i class="ri-close-circle-line me-1"></i> Cancelar Cita',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#f7b84b',
      denyButtonColor: '#f06548',
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedEvent(eventData);
        setDefaultDate(null);
        setModalOpen(true);
      } else if (result.isDenied) {
        Swal.fire({
          title: '¿Confirmar cancelación?',
          text: 'Esta acción marcará la cita como cancelada.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#f06548',
          cancelButtonColor: '#878a99',
          confirmButtonText: 'Sí, cancelar cita',
          cancelButtonText: 'No, volver',
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed) {
            dispatch(onCancelAppointment(eventData.id));
          }
        });
      }
    });
  };

  const handleNewAppointmentClick = () => {
    setSelectedEvent(null);
    setDefaultDate(null);
    setModalOpen(true);
  };

  const handleEventDrop = (dropInfo: any) => {
    const { event } = dropInfo;
    const newStartTime: Date = event.start as Date;

    // ✅ VALIDACIÓN 3: Solo bloquear drag & drop a pasado cuando settings estén cargados
    if (settingsLoaded && !allowPastAppointments && newStartTime && isDateTimeInPast(newStartTime)) {
      Swal.fire({
        title: "No permitido",
        text: "No puedes mover citas a fechas u horas pasadas.",
        icon: "error",
        confirmButtonColor: "#d33",
        confirmButtonText: "Entendido",
      });
      dropInfo.revert();
      return;
    }

    // ✅ VALIDACIÓN 4: Verificar si el día está abierto según horario
    if (!isDayOpen(newStartTime, tenantWorkingHours)) {
      Swal.fire({
        title: "Día no disponible",
        text: "No puedes mover citas a días cerrados según tu configuración.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Entendido",
      });
      dropInfo.revert();
      return;
    }

    // Si pasa las validaciones, proceder con la actualización
    const updatedPayload = {
      ...event.extendedProps,
      id: event.id,
      start_time: newStartTime.toISOString(),
    };

    dispatch(onUpdateAppointment(updatedPayload))
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "¡Cita actualizada!",
          text: "La cita se movió correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });
      })
      .catch((error: any) => {
        console.error("Error al mover cita:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error?.response?.data?.error || "No se pudo mover la cita.",
          confirmButtonColor: "#d33",
        });
        dropInfo.revert();
      });
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb title="Calendario" pageTitle="Citas" />

          {/* Selector de sucursal (solo si tiene multiples sucursales) */}
          {branches.length > 1 && (
            <Row className="mb-3">
              <Col md={4}>
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-store-2-line fs-5 text-primary"></i>
                  <Input
                    type="select"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Mi sucursal</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </Input>
                </div>
              </Col>
              {targetTenantId && (
                <Col md={8} className="d-flex align-items-center">
                  <span className="badge bg-info-subtle text-info fs-6">
                    <i className="ri-building-line me-1"></i>
                    Gestionando: {branches.find(b => b.id === selectedBranchId)?.name}
                  </span>
                </Col>
              )}
            </Row>
          )}

          {/* ✅ Indicador visual si las citas pasadas están permitidas (y settings ya cargaron) */}
          {settingsLoaded && allowPastAppointments && (
            <Row className="mb-3">
              <Col>
                <div className="alert alert-info alert-dismissible fade show" role="alert">
                  <i className="ri-information-line me-2"></i>
                  <strong>Modo especial activo:</strong> Se permite crear y mover citas en fechas pasadas.
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
              </Col>
            </Row>
          )}

          <Row>
            <Col xl={3}>
              <CentroDeCitasDiarias events={events} onNewAppointmentClick={handleNewAppointmentClick} targetTenantId={targetTenantId} />
            </Col>
            <Col xl={9}>
              <Card className="card-h-100">
                <CardBody>
                  <FullCalendar
                    plugins={[BootstrapTheme, dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                    }}
                    events={events}
                    editable={true}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventDrop={handleEventDrop}
                    locale={esLocale}
                    buttonText={{
                      today: "Hoy",
                      month: "Mes",
                      week: "Semana",
                      day: "Día",
                      list: "Lista",
                    }}
                    dayMaxEvents={2}
                    moreLinkText="más"
                    eventTimeFormat={{
                      hour: "numeric",
                      minute: "2-digit",
                      meridiem: "short",
                      hour12: true,
                    }}
                    slotLabelFormat={{
                      hour: "numeric",
                      minute: "2-digit",
                      meridiem: "short",
                      hour12: true,
                    }}
                    eventContent={(arg) => {
                      const ext = arg.event.extendedProps;
                      const startDate = arg.event.start;
                      const timeStr = startDate
                        ? startDate.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
                        : '';
                      return (
                        <div className="p-1" style={{ fontSize: '0.73rem', lineHeight: 1.25, overflow: 'hidden' }}>
                          <div className="fw-semibold text-truncate">{ext.service_name || arg.event.title}</div>
                          <div className="text-truncate" style={{ opacity: 0.9 }}>{ext.client_first_name || ''}</div>
                          <div className="text-truncate" style={{ opacity: 0.8 }}>{ext.stylist_first_name || ''} &middot; {timeStr}</div>
                        </div>
                      );
                    }}
                    // ✅ Configuración adicional para mejor UX
                    height="auto"
                    nowIndicator={true}
                    navLinks={true}
                    eventResizableFromStart={false}
                    selectMirror={true}
                    allDaySlot={false}
                  />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedEvent={selectedEvent}
        defaultDate={defaultDate}
        allowPastAppointments={allowPastAppointments}
        targetTenantId={targetTenantId}
      />
    </React.Fragment>
  );
};

export default Calendar;