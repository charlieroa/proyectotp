// Ticket Virtual — crear ticket (desde topbar).
// UX simple: busca cliente existente; si el nombre no existe, crea el cliente
// en la BD (rol 4) y abre el ticket con él. Walk-in queda como opción secundaria.
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

// El endpoint /users/tenant/:id/clients devuelve { id, name, phone, ... } (name ya combinado).
type ClientOpt = { id: string; name: string; phone?: string };

interface TicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TicketsModal: React.FC<TicketsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const tenantId = getTenantIdFromToken();
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [query, setQuery] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setQuery("");
    setNewPhone("");
    api.get(`/users/tenant/${tenantId}/clients`)
      .then(({ data }) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, [isOpen, tenantId]);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return clients
      .filter((c) => {
        const full = (c.name || "").toLowerCase();
        return full.includes(q) || (c.phone || "").includes(q);
      })
      .slice(0, 6);
  }, [query, clients]);

  // Crea el cliente en la BD (rol 4) con el nombre tipeado y abre el ticket con él.
  const createClientAndOpen = async () => {
    const raw = query.trim();
    if (!raw || !tenantId) return;
    const parts = raw.split(/\s+/);
    const first_name = parts.shift() || raw;
    const last_name = parts.join(" ") || null;
    setSubmitting(true);
    try {
      const { data: client } = await api.post("/users", {
        tenant_id: tenantId,
        role_id: 4,
        first_name,
        last_name,
        phone: newPhone.trim() || null,
      });
      // submit() maneja su propio setSubmitting; lo dejamos encadenar.
      await submit({ client_id: client.id });
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.error || "No se pudo crear el cliente.", "error");
      setSubmitting(false);
    }
  };

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
            Si el nombre no existe, lo creas como cliente nuevo (o lo abres como walk-in).
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
                      <span>{c.name || "Cliente"}</span>
                      <small className="text-muted">{c.phone || ""}</small>
                    </div>
                  </ListGroupItem>
                ))}
              </ListGroup>
            ) : (
              <div className="p-3 bg-light rounded">
                <small className="text-muted d-block mb-2">
                  No hay ningún cliente con ese nombre. Créalo como cliente nuevo:
                </small>
                <Input
                  type="tel"
                  bsSize="sm"
                  className="mb-2"
                  placeholder="Teléfono (opcional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <Button
                  color="primary"
                  size="sm"
                  className="w-100 mb-2"
                  disabled={submitting}
                  onClick={createClientAndOpen}
                >
                  {submitting ? <Spinner size="sm" /> : `Crear cliente "${query.trim()}" y abrir ticket`}
                </Button>
                <div className="text-center">
                  <Button
                    color="link"
                    size="sm"
                    className="text-muted p-0"
                    disabled={submitting}
                    onClick={() => submit({ client_name_adhoc: query.trim() })}
                  >
                    o abrir como walk-in (sin guardar)
                  </Button>
                </div>
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
