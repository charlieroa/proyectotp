// Selector "Nueva atención": pregunta primero qué hacer y luego monta el
// sub-flujo existente correspondiente, sin reescribirlos.
//   - Ticket   → TicketsModal (atender/cobrar ahora → POS)
//   - Reserva  → QuickAppointmentDrawer (cita futura)
//   - Walk-in  → AgendaRapida (solo fallback cuando el ticket está apagado)
// Gating: si el salón tiene ticket_virtual_enabled y el rol ∈ [1,2,6] → [Ticket, Reserva];
// si no → [Reserva, Agenda Rápida].
import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";
import { getRoleFromToken } from "../../services/auth";
import TicketsModal from "../Tickets/TicketsModal";
import QuickAppointmentDrawer from "./QuickAppointmentDrawer";
import AgendaRapida from "./AgendaRapida";

interface NuevaAtencionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTenantId?: string;
  onSuccess?: () => void;
  /** Si se conoce el flag se pasa para evitar un fetch; si no, el modal lo consulta. */
  ticketEnabled?: boolean;
  /** Fecha/hora a precargar en la reserva. */
  defaultDate?: Date | null;
}

type View = "choose" | "ticket" | "reserva" | "walkin";

const NuevaAtencionModal: React.FC<NuevaAtencionModalProps> = ({
  isOpen, onClose, targetTenantId, onSuccess, ticketEnabled, defaultDate,
}) => {
  const { t } = useTranslation();
  const role = getRoleFromToken();
  const [view, setView] = useState<View>("choose");
  const [flag, setFlag] = useState<boolean>(!!ticketEnabled);

  // Reset a la pantalla de elección cada vez que se abre.
  useEffect(() => {
    if (isOpen) setView("choose");
  }, [isOpen]);

  // Resolver el flag: usar el prop si vino, si no consultarlo al abrir.
  useEffect(() => {
    if (!isOpen) return;
    if (typeof ticketEnabled === "boolean") {
      setFlag(ticketEnabled);
      return;
    }
    api.get("/tenants/my-businesses")
      .then(({ data }) => {
        const tenant = Array.isArray(data) && data[0];
        setFlag(!!tenant?.ticket_virtual_enabled);
      })
      .catch(() => setFlag(false));
  }, [isOpen, ticketEnabled]);

  const canTicket = flag && !!role && [1, 2, 6].includes(role);

  const closeAll = () => {
    setView("choose");
    onClose();
  };

  const Tarjeta: React.FC<{
    icon: string; color: string; title: string; desc: string; onClick: () => void;
  }> = ({ icon, color, title, desc, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-100 d-flex align-items-center gap-3 border rounded p-3 mb-2 text-start bg-white"
      style={{ cursor: "pointer", transition: "box-shadow .15s, transform .15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <span
        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
        style={{ width: 44, height: 44, background: `${color}1a`, color }}
      >
        <i className={`${icon} fs-4`}></i>
      </span>
      <span>
        <span className="d-block fw-semibold">{title}</span>
        <small className="text-muted">{desc}</small>
      </span>
      <i className="ri-arrow-right-s-line fs-4 text-muted ms-auto"></i>
    </button>
  );

  return (
    <>
      <Modal isOpen={isOpen && view === "choose"} toggle={onClose} centered size="md">
        <ModalHeader toggle={onClose}>
          <i className="ri-flashlight-line me-2 text-primary"></i>{t("new_attention")}
        </ModalHeader>
        <ModalBody>
          {canTicket ? (
            <>
              <Tarjeta
                icon="ri-bill-line" color="#4081ff"
                title={t("attention_ticket_title")} desc={t("attention_ticket_desc")}
                onClick={() => setView("ticket")}
              />
              <Tarjeta
                icon="ri-calendar-event-line" color="#0ab39c"
                title={t("attention_reserve_title")} desc={t("attention_reserve_desc")}
                onClick={() => setView("reserva")}
              />
            </>
          ) : (
            <>
              <Tarjeta
                icon="ri-calendar-event-line" color="#0ab39c"
                title={t("attention_reserve_title")} desc={t("attention_reserve_desc")}
                onClick={() => setView("reserva")}
              />
              <Tarjeta
                icon="ri-flashlight-line" color="#f7b84b"
                title={t("attention_walkin_title")} desc={t("attention_walkin_desc")}
                onClick={() => setView("walkin")}
              />
            </>
          )}
        </ModalBody>
      </Modal>

      {canTicket && (
        <TicketsModal isOpen={isOpen && view === "ticket"} onClose={closeAll} />
      )}

      <QuickAppointmentDrawer
        isOpen={isOpen && view === "reserva"}
        onClose={closeAll}
        defaultDate={defaultDate}
        targetTenantId={targetTenantId}
        onCreated={onSuccess}
      />

      <AgendaRapida
        isOpen={isOpen && view === "walkin"}
        onClose={closeAll}
        targetTenantId={targetTenantId}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default NuevaAtencionModal;
