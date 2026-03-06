// Archivo: src/Components/Calendar/TarjetaCita.tsx
import React from 'react';
import { Link } from "react-router-dom";
import { Card, CardBody, Badge } from "reactstrap";
import Swal from 'sweetalert2';
import { getRoleFromToken } from '../../services/auth';

type GrupoCliente = {
  clientId: string | number;
  client_first_name: string;
  client_last_name?: string;
  earliestStartISO: string;
  count: number;
  appointments: {
    id: string | number;
    service_name: string;
    stylist_first_name?: string;
    start_time: string;
  }[];
};

const TarjetaCita = ({ group }: { group: GrupoCliente }) => {
  if (!group || !group.appointments || group.appointments.length === 0) return null;

  const nombreCliente = `${group.client_first_name} ${group.client_last_name || ''}`.trim();
  const primerServ = group.appointments[0]?.service_name ?? 'Servicios';
  const hora = new Date(group.earliestStartISO).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const isRecepcionista = getRoleFromToken() === 6;

  // Enviamos client_id por query y el resto por state
  const query = new URLSearchParams({ client_id: String(group.clientId) }).toString();

  const cardContent = (
    <Card className="mb-2 shadow-sm">
      <CardBody>
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0 me-3">
            <div className="avatar-xs position-relative">
              <div className="avatar-title bg-primary-subtle rounded-circle">
                <i className="mdi mdi-account text-primary"></i>
              </div>
              <Badge
                color="danger"
                pill
                className="position-absolute top-0 start-100 translate-middle"
                title={`${group.count} servicio(s)`}
              >
                {group.count}
              </Badge>
            </div>
          </div>

          <div className="flex-grow-1 overflow-hidden">
            <h5 className="mb-1 fs-14 text-truncate">{nombreCliente}</h5>
            <p className="text-muted mb-0 text-truncate">
              {primerServ}{group.count > 1 ? ` + ${group.count - 1} más` : ''} • {hora}
            </p>
          </div>

          <div className="flex-shrink-0 ms-2">
            <i className="ri-arrow-right-s-line fs-20 text-muted"></i>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  if (isRecepcionista) {
    return (
      <div
        className="text-reset text-decoration-none"
        style={{ cursor: 'pointer' }}
        onClick={() => Swal.fire({ icon: 'info', title: 'Pago en caja', text: 'Este servicio se cobra en la caja principal.' })}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={{ pathname: "/checkout", search: `?${query}` }}
      state={{
        clientId: group.clientId,
        appointmentIds: group.appointments.map(a => a.id),
        services: group.appointments.map(a => a.service_name),
      }}
      className="text-reset text-decoration-none"
    >
      {cardContent}
    </Link>
  );
};

export default TarjetaCita;
