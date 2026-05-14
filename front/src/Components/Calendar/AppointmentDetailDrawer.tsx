import React, { useState } from "react";
import { Offcanvas, OffcanvasHeader, OffcanvasBody, Button, Spinner } from "reactstrap";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import { useCurrency } from "../../contexts/CurrencyContext";
import { ApptStatus, STATUS_COLOR, STATUS_LABEL } from "./StylistDayView";

export type ApptDetail = {
  id: string;
  start_time: string;
  end_time?: string;
  status: ApptStatus;
  service_name: string;
  service_price?: number;
  stylist_name?: string;
  stylist_id?: string;
  client_id?: string;
  client_name: string;
  branch_name?: string;
  tenant_id?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  appointment: ApptDetail | null;
  /** Callback que el caller usa para refrescar datos cuando algo cambió. */
  onChanged?: () => void;
  /** El caller decide cómo abrir el modal de reagendar. */
  onReschedule?: (appt: ApptDetail) => void;
  /** Si el caller tiene su propio flujo de "iniciar/checkin" lo puede sobrescribir. */
  onCheckedIn?: (appt: ApptDetail) => void;
};

const AppointmentDetailDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  appointment,
  onChanged,
  onReschedule,
  onCheckedIn,
}) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [busy, setBusy] = useState<null | "checkin" | "checkout" | "cancel">(null);

  if (!appointment) return null;
  const a = appointment;
  const statusColor = STATUS_COLOR[a.status] || "#6b7280";
  const statusLabel = STATUS_LABEL[a.status] || a.status;

  const startStr = new Date(a.start_time).toLocaleString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endStr = a.end_time
    ? new Date(a.end_time).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  const isOpenStatus = ["scheduled", "rescheduled", "pending_approval"].includes(a.status);
  const isInProgress = a.status === "checked_in";
  const isReadyToPay = a.status === "checked_out";
  const isFinal = ["completed", "cancelled"].includes(a.status);

  const handleCheckIn = async () => {
    if (busy) return;
    setBusy("checkin");
    try {
      await api.patch(`/appointments/${a.id}/checkin`);
      Swal.fire({ icon: "success", title: "Servicio iniciado", timer: 1200, showConfirmButton: false });
      onCheckedIn?.(a);
      onChanged?.();
      onClose();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.error || "No se pudo iniciar." });
    } finally {
      setBusy(null);
    }
  };

  const handleMarkDone = async () => {
    if (busy) return;
    setBusy("checkout");
    try {
      await api.patch(`/appointments/${a.id}/checkout`);
      Swal.fire({ icon: "success", title: "Marcada como terminada", timer: 1200, showConfirmButton: false });
      onChanged?.();
      onClose();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.error || "No se pudo marcar." });
    } finally {
      setBusy(null);
    }
  };

  const handleCobrar = () => {
    navigate(`/checkout?appointment=${a.id}`);
    onClose();
  };

  const handleCancel = async () => {
    if (busy) return;
    const result = await Swal.fire({
      title: "¿Cancelar la cita?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f06548",
      cancelButtonColor: "#878a99",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setBusy("cancel");
    try {
      await api.patch(`/appointments/${a.id}/status`, { status: "cancelled" });
      Swal.fire({ icon: "success", title: "Cita cancelada", timer: 1200, showConfirmButton: false });
      onChanged?.();
      onClose();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err?.response?.data?.error || "No se pudo cancelar." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Offcanvas isOpen={isOpen} toggle={onClose} direction="end" style={{ width: 380 }}>
      <OffcanvasHeader toggle={onClose}>
        <span
          className="badge"
          style={{
            background: statusColor,
            color: "#fff",
            fontSize: 11,
            padding: "5px 10px",
            borderRadius: 12,
          }}
        >
          {statusLabel}
        </span>
      </OffcanvasHeader>
      <OffcanvasBody className="d-flex flex-column" style={{ gap: 14 }}>
        {/* Detalles */}
        <div>
          <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: 10, letterSpacing: 0.5 }}>
            Servicio
          </div>
          <div className="fw-bold" style={{ fontSize: 16 }}>
            {a.service_name}
          </div>
          {typeof a.service_price === "number" && a.service_price > 0 && (
            <div className="text-success fw-semibold mt-1">{formatCurrency(a.service_price)}</div>
          )}
        </div>

        <Field icon="ri-user-line" label="Cliente" value={a.client_name || "Sin cliente"} />
        {a.stylist_name && <Field icon="ri-scissors-line" label="Estilista" value={a.stylist_name} />}
        <Field icon="ri-time-line" label="Cuándo" value={endStr ? `${startStr} – ${endStr}` : startStr} />
        {a.branch_name && <Field icon="ri-building-line" label="Sucursal" value={a.branch_name} />}

        {/* Acciones */}
        {!isFinal && (
          <div className="border-top pt-3 mt-2 d-flex flex-column" style={{ gap: 8 }}>
            <div className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: 10, letterSpacing: 0.5 }}>
              Acciones
            </div>

            {isOpenStatus && (
              <>
                <Button color="warning" onClick={handleCheckIn} disabled={!!busy}>
                  {busy === "checkin" ? <Spinner size="sm" /> : <i className="ri-play-circle-line me-1" />}
                  Iniciar servicio
                </Button>
                {onReschedule && (
                  <Button color="soft-primary" onClick={() => { onReschedule(a); onClose(); }}>
                    <i className="ri-calendar-event-line me-1" /> Reagendar
                  </Button>
                )}
                <Button color="soft-danger" onClick={handleCancel} disabled={!!busy}>
                  {busy === "cancel" ? <Spinner size="sm" /> : <i className="ri-close-circle-line me-1" />}
                  Cancelar cita
                </Button>
              </>
            )}

            {isInProgress && (
              <>
                <Button color="info" onClick={handleMarkDone} disabled={!!busy}>
                  {busy === "checkout" ? <Spinner size="sm" /> : <i className="ri-check-double-line me-1" />}
                  Marcar como terminada
                </Button>
                <Button color="success" onClick={handleCobrar}>
                  <i className="ri-money-dollar-circle-line me-1" /> Ir a cobrar
                </Button>
                <Button color="soft-danger" onClick={handleCancel} disabled={!!busy}>
                  {busy === "cancel" ? <Spinner size="sm" /> : <i className="ri-close-circle-line me-1" />}
                  Cancelar cita
                </Button>
              </>
            )}

            {isReadyToPay && (
              <>
                <Button color="success" onClick={handleCobrar}>
                  <i className="ri-money-dollar-circle-line me-1" /> Cobrar ahora
                </Button>
                <div className="text-muted small mt-1">
                  Esta cita ya terminó y está pendiente de cobro. El cobro se completa en el punto de venta.
                </div>
              </>
            )}
          </div>
        )}

        {a.status === "completed" && (
          <div className="alert alert-success mb-0 d-flex align-items-center gap-2">
            <i className="ri-check-line fs-4" />
            <div>
              <div className="fw-semibold">Cita pagada</div>
              <div className="small text-muted">No hay acciones pendientes.</div>
            </div>
          </div>
        )}

        {a.status === "cancelled" && (
          <div className="alert alert-danger mb-0 d-flex align-items-center gap-2">
            <i className="ri-close-line fs-4" />
            <div>
              <div className="fw-semibold">Cita cancelada</div>
            </div>
          </div>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

const Field: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="d-flex align-items-start gap-2">
    <i className={`${icon} text-muted`} style={{ fontSize: 16, marginTop: 2 }} />
    <div style={{ minWidth: 0 }}>
      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: 10, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14 }}>{value}</div>
    </div>
  </div>
);

export default AppointmentDetailDrawer;
