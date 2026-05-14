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
import { useTranslation } from 'react-i18next';

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
import StylistDayView, { StylistAppt, StylistRow } from "../../Components/Calendar/StylistDayView";
import AppointmentDetailDrawer, { ApptDetail } from "../../Components/Calendar/AppointmentDetailDrawer";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const { t } = useTranslation();
  document.title = "Calendario | Sistema de Peluquerias";
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const { events, loading, tenantWorkingHours } = useSelector((state: any) => state.Calendar);

  const settingsState = useSelector((state: any) => state.Settings || state.settings);
  const settingsLoaded = settingsState?.loaded === true;
  const allowPastAppointments = settingsState?.data?.allow_past_appointments ?? false;
  const manageAllBranchesCash = settingsState?.data?.manage_all_branches_cash ?? false;
  const crossBranchSchedule = settingsState?.data?.cross_branch_schedule_block ?? false;

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

  // Cargar sucursales si es primary branch Y tiene permisos cross-branch
  const canManageBranches = isPrimary && (manageAllBranchesCash || crossBranchSchedule);
  useEffect(() => {
    if (!canManageBranches) { setBranches([]); return; }
    api.get('/tenants/my-businesses')
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 1) {
          setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
        }
      })
      .catch(() => {});
  }, [canManageBranches]);

  // El tenant efectivo: el seleccionado o el propio
  const effectiveTenantId = selectedBranchId || tenantId;
  // Solo pasar targetTenantId cuando es diferente al propio
  const targetTenantId = selectedBranchId && selectedBranchId !== tenantId ? selectedBranchId : undefined;

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  // Drawer de detalle de cita (reemplaza los SweetAlerts de antes)
  const [drawerAppt, setDrawerAppt] = useState<ApptDetail | null>(null);
  const drawerOpen = drawerAppt !== null;

  // Modo de vista: "calendar" (FullCalendar) o "stylists" (timeline por estilista).
  // Persistido en localStorage. Acepta ?view= en la URL (deep-link desde SuperCalendar drill-down).
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = (() => {
    const fromUrl = searchParams.get("view");
    if (fromUrl === "stylists" || fromUrl === "calendar") return fromUrl;
    const stored = localStorage.getItem("calendar_view_mode");
    return stored === "stylists" ? "stylists" : "calendar";
  })();
  const [viewMode, setViewMode] = useState<"calendar" | "stylists">(initialView);
  const switchView = (mode: "calendar" | "stylists") => {
    setViewMode(mode);
    localStorage.setItem("calendar_view_mode", mode);
    const next = new URLSearchParams(searchParams);
    if (mode === "stylists") next.set("view", "stylists");
    else next.delete("view");
    setSearchParams(next, { replace: true });
  };

  // Si viene ?branch=<id> desde el drill-down del SuperCalendar, aplicarlo al selector
  useEffect(() => {
    const branchFromUrl = searchParams.get("branch");
    if (branchFromUrl && branches.length > 0 && branches.find((b) => b.id === branchFromUrl)) {
      setSelectedBranchId(branchFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches]);

  // Click en una cita desde la vista por estilista → drawer
  const handleStylistApptClick = (appt: StylistAppt, stylist: StylistRow) => {
    setDrawerAppt({
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.status,
      service_name: appt.service_name,
      service_price: appt.price,
      stylist_id: stylist.stylist_id,
      stylist_name: `${stylist.first_name} ${stylist.last_name || ""}`.trim(),
      client_name: appt.client_name || "Sin cliente",
    });
  };

  // Cuando el drawer pide reagendar, abrimos el AppointmentModal con los datos
  const handleDrawerReschedule = (appt: ApptDetail) => {
    setSelectedEvent({
      id: appt.id,
      start_time: appt.start_time,
      end_time: appt.end_time,
      status: appt.status,
      service_name: appt.service_name,
      stylist_id: appt.stylist_id,
      client_id: appt.client_id,
    });
    setDefaultDate(null);
    setModalOpen(true);
  };

  useEffect(() => {
    dispatch(onGetCalendarData(targetTenantId || undefined));
    dispatch(fetchTenantSettings(targetTenantId || undefined));
  }, [dispatch, targetTenantId]);

  // Ticket recién creado desde el topbar → recargar eventos
  useEffect(() => {
    const onTicketCreated = () => dispatch(onGetCalendarData(targetTenantId || undefined));
    window.addEventListener("ticketCreated", onTicketCreated);
    return () => window.removeEventListener("ticketCreated", onTicketCreated);
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
        title: t("day_not_available"),
        text: t("day_not_in_schedule"),
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: t("got_it"),
      });
      return;
    }

    // ✅ VALIDACIÓN 2: Solo bloquear pasado cuando YA cargaron settings
    if (settingsLoaded && !allowPastAppointments && isDateInPast(clickedDate)) {
      Swal.fire({
        title: t("past_date"),
        html:
          `${t("no_past_appointments")}<br><small class='text-muted'>${t("enable_in_settings")}</small>`,
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: t("got_it"),
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

    // Ticket virtual → navegar a POS con el ticket precargado
    if (eventData?._isTicket) {
      navigate("/checkout", { state: { ticketId: eventData.ticket_id } });
      return;
    }

    const startISO = arg.event.start ? arg.event.start.toISOString() : eventData.start_time;
    const endISO = arg.event.end ? arg.event.end.toISOString() : eventData.end_time;

    setDrawerAppt({
      id: arg.event.id,
      start_time: startISO,
      end_time: endISO,
      status: eventData.status,
      service_name: eventData.service_name || arg.event.title || "Servicio",
      service_price: eventData.price ? Number(eventData.price) : undefined,
      stylist_name: `${eventData.stylist_first_name || ""} ${eventData.stylist_last_name || ""}`.trim(),
      stylist_id: eventData.stylist_id,
      client_id: eventData.client_id,
      client_name: `${eventData.client_first_name || ""} ${eventData.client_last_name || ""}`.trim() || "Sin cliente",
      tenant_id: eventData.tenant_id,
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
        title: t("error"),
        text: t("no_past_appointments"),
        icon: "error",
        confirmButtonColor: "#d33",
        confirmButtonText: t("got_it"),
      });
      dropInfo.revert();
      return;
    }

    // ✅ VALIDACIÓN 4: Verificar si el día está abierto según horario
    if (!isDayOpen(newStartTime, tenantWorkingHours)) {
      Swal.fire({
        title: t("day_not_available"),
        text: t("day_not_in_schedule"),
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: t("got_it"),
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
          title: t("appointment_updated"),
          text: t("appointment_moved"),
          timer: 2000,
          showConfirmButton: false,
        });
      })
      .catch((error: any) => {
        console.error("Error al mover cita:", error);
        Swal.fire({
          icon: "error",
          title: t("error"),
          text: error?.response?.data?.error || t("could_not_move"),
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
              <span className="visually-hidden">{t("loading")}</span>
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
          <BreadCrumb title={t("calendar")} pageTitle={t("appointments")} />

          {/* Toolbar unificado: selector de sucursal + toggle de vista */}
          <Card className="mb-3 border-0 shadow-sm">
            <CardBody className="py-2 px-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {branches.length > 1 && (
                    <>
                      <i className="ri-store-2-line fs-5 text-primary" />
                      <Input
                        type="select"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        bsSize="sm"
                        style={{ width: "auto", minWidth: 180 }}
                      >
                        <option value="">{t("my_branch")}</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </Input>
                      {targetTenantId && (
                        <span
                          className="d-inline-flex align-items-center gap-1"
                          style={{
                            background: "#cffafe",
                            color: "#0e7490",
                            border: "1px solid #a5f3fc",
                            borderRadius: 12,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <i className="ri-building-line" />
                          {branches.find((b) => b.id === selectedBranchId)?.name}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <ViewToggle viewMode={viewMode} onSwitch={switchView} />
              </div>
            </CardBody>
          </Card>

          {/* ✅ Indicador visual si las citas pasadas están permitidas (y settings ya cargaron) */}
          {settingsLoaded && allowPastAppointments && (
            <Row className="mb-3">
              <Col>
                <div className="alert alert-info alert-dismissible fade show" role="alert">
                  <i className="ri-information-line me-2"></i>
                  <strong>{t("special_mode_active")}</strong> {t("past_dates_allowed")}
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
              {viewMode === "stylists" ? (
                <Card className="card-h-100">
                  <CardBody>
                    <StylistDayView
                      tenantId={targetTenantId || null}
                      onApptClick={handleStylistApptClick}
                    />
                  </CardBody>
                </Card>
              ) : (
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
                      today: t("today"),
                      month: t("month"),
                      week: t("week"),
                      day: t("day"),
                      list: t("list"),
                    }}
                    dayMaxEvents={2}
                    moreLinkText={t("more")}
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
                      // Ticket virtual: render compacto con icono y total
                      if (ext._isTicket) {
                        const total = Number(ext.total_amount || 0).toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        });
                        return (
                          <div className="p-1" style={{ fontSize: '0.73rem', lineHeight: 1.2, overflow: 'hidden' }}>
                            <div className="fw-semibold text-truncate">🎫 {ext.client_name}</div>
                            <div className="text-truncate" style={{ opacity: 0.9 }}>
                              {ext.item_count} línea{ext.item_count === 1 ? '' : 's'} · {total}
                            </div>
                          </div>
                        );
                      }
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
                    allDaySlot={true}
                    allDayText="Tickets"
                  />
                </CardBody>
              </Card>
              )}
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

      <AppointmentDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerAppt(null)}
        appointment={drawerAppt}
        onReschedule={handleDrawerReschedule}
        onChanged={refreshCalendar}
      />
    </React.Fragment>
  );
};

const ViewToggle: React.FC<{
  viewMode: "calendar" | "stylists";
  onSwitch: (m: "calendar" | "stylists") => void;
}> = ({ viewMode, onSwitch }) => {
  const item = (mode: "calendar" | "stylists", icon: string, label: string) => {
    const active = viewMode === mode;
    return (
      <button
        type="button"
        onClick={() => onSwitch(mode)}
        style={{
          padding: "6px 14px",
          border: "none",
          background: active ? "#fff" : "transparent",
          color: active ? "#0ab39c" : "#6b7280",
          fontWeight: active ? 600 : 500,
          fontSize: 13,
          borderRadius: 7,
          cursor: "pointer",
          boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s ease",
        }}
      >
        <i className={icon} />
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: "inline-flex",
        background: "#f3f4f6",
        padding: 3,
        borderRadius: 9,
        border: "1px solid #e5e7eb",
      }}
    >
      {item("calendar", "ri-calendar-2-line", "Calendario")}
      {item("stylists", "ri-team-line", "Por estilista")}
    </div>
  );
};

export default Calendar;