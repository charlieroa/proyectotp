// src/slices/calendar/thunk.ts
import { jwtDecode } from "jwt-decode";
import { sileo } from "sileo";
import { api } from "../../services/api";
import { getToken } from "../../services/auth";
import {
  getCalendarDataStart,
  getCalendarDataSuccess,
  getCalendarDataFail,
  fetchSlotsSuccess,
  fetchSlotsFail,
  createAppointmentSuccess,
  createAppointmentFail,
  createNewClientSuccess,
  createNewClientFail,
  clearSlots as clearSlotsAction,
  updateAppointmentSuccess,
  updateAppointmentFail,
  fetchTenantSettingsStart,
  fetchTenantSettingsSuccess,
  fetchTenantSettingsFail,
  // 🎯 NUEVO: Importar acciones para digiturno
  fetchDigiturnoQueueStart,
  fetchDigiturnoQueueSuccess,
  fetchDigiturnoQueueFail,
} from "./reducer";

// ✅ Colores por estado (Sin cambios)
const getClassNameForStatus = (status: string) => {
  switch (status) {
    case "scheduled":
    case "rescheduled":
      return "bg-success-subtle text-success border border-success";
    case "checked_in":
      return "bg-info-subtle text-info border border-info";
    case "checked_out":
      return "bg-primary-subtle text-primary border border-primary";
    case "completed":
      return "bg-light text-secondary border";
    case "cancelled":
      return "bg-danger-subtle text-danger border border-danger";
    case "pending_approval":
      return "bg-warning-subtle text-warning border border-warning";
    default:
      return "bg-secondary-subtle text-secondary border";
  }
};

// 🔐 Tenant desde el JWT (Sin cambios)
const getTenantId = () => {
  const token = getToken();
  if (!token) throw new Error("Token de autenticación no encontrado");
  const decoded: any = jwtDecode(token);
  return decoded?.user?.tenant_id || decoded?.tenant_id;
};


// --- THUNK PARA OBTENER HORARIO DEL NEGOCIO ---
export const fetchTenantSettings = (targetTenantId?: string) => async (dispatch: any) => {
  dispatch(fetchTenantSettingsStart());
  try {
    const tenantId = targetTenantId || getTenantId();
    const response = await api.get(`/tenants/${tenantId}`);
    dispatch(fetchTenantSettingsSuccess(response.data));
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || "Error al cargar la configuración del negocio";
    dispatch(fetchTenantSettingsFail(message));
    return Promise.reject(message);
  }
};

// 🎯 NUEVO: THUNK PARA OBTENER COLA DEL DIGITURNO
export const fetchDigiturnoQueue = (tenantId: string) => async (dispatch: any) => {
  dispatch(fetchDigiturnoQueueStart());
  try {
    const response = await api.get(`/appointments/digiturno/queue/${tenantId}`);
    const queue = response.data?.queue || [];
    dispatch(fetchDigiturnoQueueSuccess(queue));
    return queue;
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || "Error al obtener cola del digiturno";
    dispatch(fetchDigiturnoQueueFail(message));
    console.error("Error fetching digiturno queue:", error);
    return Promise.reject(message);
  }
};


/** Cargar calendario (citas + catalogos + proximo estilista) */
export const getCalendarData = (targetTenantId?: string) => async (dispatch: any) => {
  dispatch(getCalendarDataStart());
  try {
    const tenantId = targetTenantId || getTenantId();
    const today = new Date();
    const year = today.getFullYear();
    const startDate = new Date(year, 0, 1).toISOString().split("T")[0];
    const endDate = new Date(year, 11, 31).toISOString().split("T")[0];

    const results = await Promise.allSettled([
      api.get(`/appointments/tenant/${tenantId}`, { params: { startDate, endDate } }),
      api.get(`/users/tenant/${tenantId}`, { params: { role_id: 4 } }),
      api.get(`/services/tenant/${tenantId}`),
      api.get(`/users/tenant/${tenantId}`, { params: { role_id: 3 } }),
      api.get(`/stylists/next-available`),
      api.get(`/tickets/active`).catch((e) => { throw e; }),
    ]);

    const [rApps, rClients, rServices, rStylists, rNext, rTickets] = results;

    const appointments = rApps.status === "fulfilled" ? rApps.value.data : [];
    const clients = rClients.status === "fulfilled" ? rClients.value.data : [];
    const services = rServices.status === "fulfilled" ? rServices.value.data : [];
    const stylists = rStylists.status === "fulfilled" ? rStylists.value.data : [];
    const nextAvail = rNext.status === "fulfilled" ? rNext.value.data : null;
    // 403 = feature flag off → simplemente no hay tickets para pintar
    const tickets = rTickets.status === "fulfilled" ? rTickets.value.data : [];

    if (rNext.status === "rejected") {
      console.warn("[getCalendarData] next-available falló:", rNext.reason?.response?.status || rNext.reason?.message);
    }

    const formattedAppointments = (Array.isArray(appointments) ? appointments : []).map((cita: any) => ({
      id: cita.id,
      title: `${cita.service_name} - ${cita.client_first_name || ""}`,
      start: cita.start_time,
      end: cita.end_time,
      className: getClassNameForStatus(cita.status),
      extendedProps: { ...cita },
    }));

    // Tickets virtuales → eventos all-day del día en que se abrieron, en morado.
    const formattedTickets = (Array.isArray(tickets) ? tickets : []).map((tk: any) => {
      const clientName = tk.users
        ? `${tk.users.first_name || ""} ${tk.users.last_name || ""}`.trim()
        : tk.client_name_adhoc || "Walk-in";
      const itemCount = Array.isArray(tk.invoice_items) ? tk.invoice_items.length : 0;
      const dayISO = (tk.created_at || new Date().toISOString()).slice(0, 10);
      return {
        id: `ticket-${tk.id}`,
        title: `🎫 ${clientName}`,
        start: dayISO,
        allDay: true,
        backgroundColor: "#7c3aed",
        borderColor: "#6d28d9",
        textColor: "#ffffff",
        extendedProps: {
          _isTicket: true,
          ticket_id: tk.id,
          client_name: clientName,
          item_count: itemCount,
          total_amount: tk.total_amount,
          ...tk,
        },
      };
    });

    const formattedEvents = [...formattedAppointments, ...formattedTickets];

    dispatch(
      getCalendarDataSuccess({
        events: formattedEvents,
        clients: Array.isArray(clients) ? clients : [],
        services: Array.isArray(services) ? services : [],
        stylists: Array.isArray(stylists) ? stylists : [],
        nextAvailableStylist: nextAvail || null,
      })
    );
  } catch (error: any) {
    dispatch(getCalendarDataFail(error?.message || "Error desconocido"));
  }
};


// =================================================================
// --- El resto de tus funciones permanece sin cambios ---
// =================================================================

export const fetchTenantSlots = (date: string, serviceId: string, targetTenantId?: string) => async (dispatch: any) => {
  if (!date || !serviceId) {
    dispatch(clearSlotsAction());
    return Promise.resolve([]);
  }
  try {
    const params: any = { date, service_id: serviceId };
    if (targetTenantId) params.target_tenant_id = targetTenantId;
    const { data } = await api.get('/appointments/tenant/slots', {
      params,
    });
    const slots = data?.slots || [];
    dispatch(fetchSlotsSuccess(slots));
    return Promise.resolve({ slots, message: data?.message || '' });
  } catch (error: any) {
    dispatch(fetchSlotsFail(error?.message || "Error al buscar horarios"));
    sileo.error({ title: "No se pudieron cargar los horarios disponibles." });
    return Promise.reject(error);
  }
};

export const fetchAvailableStylists = (date: string, time: string, serviceId: string, targetTenantId?: string) => async () => {
  if (!date || !time || !serviceId) return Promise.resolve([]);
  try {
    const params: any = { date, time, service_id: serviceId };
    if (targetTenantId) params.target_tenant_id = targetTenantId;
    const { data } = await api.get('/appointments/stylists/available', {
      params,
    });

    return data?.available || data?.availableStylists || [];
  } catch (error: any) {
    console.error("Error al obtener estilistas disponibles:", error);
    sileo.error({ title: "No se pudieron cargar los estilistas para esta hora." });
    return Promise.reject(error);
  }
};


export const fetchAvailability = (stylistId: string, date: string) => async (dispatch: any) => {
  try {
    const tenantId = getTenantId();
    const { data } = await api.get(`/appointments/availability`, {
      params: { tenant_id: tenantId, stylist_id: stylistId, date },
    });
    const slots = data?.availableSlots || [];
    dispatch(fetchSlotsSuccess(slots));
    return Promise.resolve(slots);
  } catch (error: any) {
    dispatch(fetchSlotsFail(error?.message || "Error al buscar horarios"));
    return Promise.reject(error);
  }
};

export const getStylistsForService = (serviceId: string) => async () => {
  if (!serviceId) return Promise.resolve([]);
  try {
    const tenantId = getTenantId();
    const { data: stylists } = await api.get(`/services/${serviceId}/stylists`, {
      params: { tenant_id: tenantId },
    });
    return Array.isArray(stylists) ? stylists : [];
  } catch (error: any) {
    console.error("Error al obtener estilistas por servicio:", error);
    sileo.error({ title: "No se pudieron cargar los estilistas para este servicio." });
    return Promise.reject(error);
  }
};

export const createNewClient = (clientData: any, targetTenantId?: string) => async (dispatch: any) => {
  try {
    const tenantId = targetTenantId || getTenantId();
    const dataToSend = { ...clientData, tenant_id: tenantId, role_id: 4 };
    const { data: newClient } = await api.post(`/users`, dataToSend);
    dispatch(createNewClientSuccess(newClient));
    return Promise.resolve(newClient);
  } catch (error: any) {
    dispatch(createNewClientFail(error));
    return Promise.reject(error?.response?.data || error);
  }
};

export const createAppointment = (appointmentData: any) => async (dispatch: any) => {
  try {
    await api.post(`/appointments`, appointmentData);
    dispatch(getCalendarData());
    dispatch(createAppointmentSuccess());
    return Promise.resolve();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.response?.data?.error || "No se pudo crear la cita.";
    dispatch(createAppointmentFail(errorMessage));
    return Promise.reject(errorMessage);
  }
};

export const updateAppointment = (appointment: any) => async (dispatch: any) => {
  try {
    const { data: updated } = await api.put(`/appointments/${appointment.id}`, appointment);
    const formattedUpdatedEvent = {
      id: updated.id,
      title: `${updated.service_name} - ${updated.client_first_name || ""}`,
      start: updated.start_time,
      end: updated.end_time,
      className: getClassNameForStatus(updated.status),
      extendedProps: { ...updated },
    };
    dispatch(updateAppointmentSuccess(formattedUpdatedEvent));
    sileo.success({ title: "¡Cita actualizada con éxito!" });
    return formattedUpdatedEvent;
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.response?.data?.error || "No se pudo actualizar la cita.";
    dispatch(updateAppointmentFail(errorMessage));
    sileo.error({ title: errorMessage });
    return Promise.reject(errorMessage);
  }
};

export const cancelAppointment = (appointmentId: string) => async (dispatch: any) => {
  try {
    await api.patch(`/appointments/${appointmentId}/status`, { status: 'cancelled' });
    await dispatch(getCalendarData());
    sileo.success({ title: "Cita cancelada" });
    return Promise.resolve();
  } catch (error: any) {
    const msg = error?.response?.data?.error || "No se pudo cancelar la cita.";
    sileo.error({ title: msg });
    return Promise.reject(msg);
  }
};

export const clearSlots = () => (dispatch: any) => {
  dispatch(clearSlotsAction());
};

export const createAppointmentsBatch = (payload: {
  client_id?: string;
  appointments: Array<{ service_id: string; stylist_id: string; start_time: string }>;
}) => async (dispatch: any) => {
  try {
    await api.post(`/appointments/batch`, payload);
    await dispatch(getCalendarData());
    dispatch(createAppointmentSuccess());
    sileo.success({ title: "¡Citas agendadas con éxito!" });
    return Promise.resolve();
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "No se pudo crear el lote de citas.";
    dispatch(createAppointmentFail(errorMessage));
    sileo.error({ title: errorMessage });
    return Promise.reject(errorMessage);
  }
};