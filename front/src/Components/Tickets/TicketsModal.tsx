// Ticket Virtual — crear ticket (desde topbar).
// UX simple: busca cliente existente o cae en walk-in con el texto tipeado.
// Al crearse, emite window event 'ticketCreated' para que el calendario lo recargue.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  FormGroup,
  Input,
  Label,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "reactstrap";
import Swal from "sweetalert2";
import { api } from "../../services/api";
import { getTenantIdFromToken } from "../../services/auth";

type ClientOpt = { id: string; first_name: string; last_name?: string; phone?: string };

const fullName = (u?: { first_name?: string; last_name?: string } | null) =>
  u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "";

interface TicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TicketsModal: React.FC<TicketsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const tenantId = getTenantIdFromToken();
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setQuery("");
    api.get(`/users/tenant/${tenantId}/clients`)
      .then(({ data }) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, [isOpen, tenantId]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return clients
      .filter((c) => {
        const full = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
        return full.includes(q) || (c.phone || "").includes(q);
      })
      .slice(0, 6);
  }, [query, clients]);

  const submit = async (payload: { client_id?: string; client_name_adhoc?: string }) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/tickets/open", payload);
      window.dispatchEvent(new CustomEvent("ticketCreated", { detail: data }));
      onClose();
      // Ir directo a POS con el ticket precargado para agregar servicios y cobrar.
      navigate("/checkout", { state: { ticketId: data.id } });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        Swal.fire("Función desactivada", "Activa 'Ticket virtual' en Ajustes → General.", "info");
      } else {
        Swal.fire("Error", err?.response?.data?.error || "No se pudo abrir el ticket.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} centered>
      <ModalHeader toggle={onClose}>
        <i className="ri-bill-line me-2 text-primary" /> Nuevo ticket virtual
      </ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label>Cliente</Label>
          <Input
            placeholder="Nombre o teléfono (2+ letras)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <small className="text-muted">
            Si no está en la BD, lo abres como walk-in con el nombre tipeado.
          </small>
        </FormGroup>

        {query.trim().length >= 2 && (
          <>
            {matches.length > 0 ? (
              <ListGroup>
                {matches.map((c) => (
                  <ListGroupItem
                    key={c.id}
                    action
                    tag="button"
                    onClick={() => submit({ client_id: c.id })}
                    disabled={submitting}
                  >
                    <div className="d-flex justify-content-between">
                      <span>{fullName(c)}</span>
                      <small className="text-muted">{c.phone || ""}</small>
                    </div>
                  </ListGroupItem>
                ))}
              </ListGroup>
            ) : (
              <div className="p-3 bg-light rounded">
                <small className="text-muted d-block mb-2">
                  No hay cliente con ese nombre. Abrir como <strong>walk-in</strong>:
                </small>
                <Button
                  color="primary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => submit({ client_name_adhoc: query.trim() })}
                >
                  {submitting ? <Spinner size="sm" /> : `Abrir como "${query.trim()}"`}
                </Button>
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose} disabled={submitting}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TicketsModal;
