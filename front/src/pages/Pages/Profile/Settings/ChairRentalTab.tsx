import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Row, Col, Button, Badge, Spinner, Table, Input, Label, Alert,
  Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup,
} from 'reactstrap';
import Swal from 'sweetalert2';
import { api } from '../../../../services/api';

type Renter = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  monthly_rent_cop: string | number | null;
  rental_status: 'active' | 'past_due' | 'blocked' | null;
  rental_past_due_since: string | null;
  rental_stripe_subscription_id: string | null;
};

type StatusResp = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  chair_rental_enabled: boolean;
  grace_days: number;
};

const fmtCop = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const statusBadge = (s: Renter['rental_status']) => {
  switch (s) {
    case 'active': return <Badge color="success">Activo</Badge>;
    case 'past_due': return <Badge color="warning">Pago pendiente</Badge>;
    case 'blocked': return <Badge color="danger">Bloqueado</Badge>;
    default: return <Badge color="secondary">—</Badge>;
  }
};

const ChairRentalTab: React.FC = () => {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [graceDraft, setGraceDraft] = useState<number>(3);
  const [enabledDraft, setEnabledDraft] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal nuevo renter
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', phone: '', monthly_rent_cop: '' });
  const [addBusy, setAddBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get<StatusResp>('/chair-rentals/status'),
        api.get<{ renters: Renter[] }>('/chair-rentals/renters'),
      ]);
      setStatus(s.data);
      setRenters(r.data.renters || []);
      setGraceDraft(s.data.grace_days);
      setEnabledDraft(s.data.chair_rental_enabled);
    } catch (e: any) {
      console.error('[chairRental] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await api.post<{ url: string }>('/chair-rentals/connect', {});
      window.location.href = data.url;
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo iniciar el onboarding de Stripe', 'error');
      setConnecting(false);
    }
  };

  const onSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put('/chair-rentals/settings', {
        chair_rental_enabled: enabledDraft,
        rental_block_grace_days: graceDraft,
      });
      await loadAll();
      Swal.fire({ icon: 'success', text: 'Configuración guardada', timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo guardar', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const onAddSubmit = async () => {
    const monthly = Number(addForm.monthly_rent_cop);
    if (!addForm.first_name || !addForm.email || !monthly) {
      Swal.fire('Faltan datos', 'Nombre, email y precio mensual son obligatorios', 'warning');
      return;
    }
    setAddBusy(true);
    try {
      const { data } = await api.post<{ setup_url: string }>('/chair-rentals/renters', {
        ...addForm,
        monthly_rent_cop: monthly,
      });
      setAddOpen(false);
      setAddForm({ first_name: '', last_name: '', email: '', phone: '', monthly_rent_cop: '' });
      await loadAll();
      await Swal.fire({
        icon: 'success',
        title: 'Estilista agregado',
        html: `Envíale este enlace para que guarde su tarjeta:<br/><br/>
          <a href="${data.setup_url}" target="_blank" rel="noopener">${data.setup_url.slice(0, 60)}…</a>
          <br/><br/>Cuando complete el setup, la suscripción diaria se activa.`,
        confirmButtonText: 'Copiar enlace',
      }).then(() => navigator.clipboard?.writeText(data.setup_url));
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo agregar el estilista', 'error');
    } finally {
      setAddBusy(false);
    }
  };

  const onResendLink = async (r: Renter) => {
    try {
      const { data } = await api.post<{ url: string }>(`/chair-rentals/renters/${r.id}/payment-link`, {});
      await Swal.fire({
        icon: 'info',
        title: 'Enlace de pago',
        html: `<a href="${data.url}" target="_blank" rel="noopener">${data.url.slice(0, 60)}…</a>`,
        confirmButtonText: 'Copiar',
      }).then(() => navigator.clipboard?.writeText(data.url));
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo generar enlace', 'error');
    }
  };

  const onRemove = async (r: Renter) => {
    const conf = await Swal.fire({
      icon: 'warning',
      title: `Quitar arriendo de ${r.first_name}?`,
      text: 'Se cancela la suscripción al final del período actual y vuelve a empleado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
    });
    if (!conf.isConfirmed) return;
    try {
      await api.delete(`/chair-rentals/renters/${r.id}`);
      await loadAll();
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo quitar', 'error');
    }
  };

  const connectedAndReady = !!status?.connected && !!status?.charges_enabled;

  const renderConnectSection = () => {
    if (loading) return <Spinner size="sm" />;
    if (!status?.connected) {
      return (
        <div>
          <Alert color="info">
            <strong>Conecta tu cuenta Stripe</strong> para cobrarles directamente a los estilistas que arriendan cupo.
            El dinero llega a tu cuenta — Tupelukeria solo orquesta el cobro diario.
          </Alert>
          <Button color="primary" onClick={onConnect} disabled={connecting}>
            {connecting ? <Spinner size="sm" /> : 'Conectar Stripe'}
          </Button>
        </div>
      );
    }
    if (!status.charges_enabled) {
      return (
        <Alert color="warning">
          <strong>Onboarding incompleto.</strong> Termina el proceso en Stripe para empezar a cobrar.{' '}
          <Button size="sm" color="primary" onClick={onConnect} disabled={connecting}>
            {connecting ? <Spinner size="sm" /> : 'Continuar onboarding'}
          </Button>
        </Alert>
      );
    }
    return (
      <Alert color="success">
        <strong>Stripe conectado.</strong> Tu cuenta está lista para recibir cobros.
        {status.payouts_enabled ? ' Payouts activos.' : ' Payouts pendientes.'}
      </Alert>
    );
  };

  return (
    <div>
      <Row className="mb-4">
        <Col md={12}>
          <h4 className="mb-3">Arriendo de sillas</h4>
          <p className="text-muted mb-3">
            Cobra a estilistas independientes que usan tus instalaciones. Tú defines el precio mensual,
            Stripe cobra automáticamente cada día. Si fallan los pagos, después de <strong>{status?.grace_days ?? 3} días</strong> el estilista
            queda bloqueado y no puede recibir citas ni entrar a la app.
          </p>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>{renderConnectSection()}</Col>
      </Row>

      {connectedAndReady && (
        <>
          <Row className="mb-4">
            <Col md={6}>
              <FormGroup check className="mb-2">
                <Input
                  type="switch"
                  id="cr-enabled"
                  checked={enabledDraft}
                  onChange={(e) => setEnabledDraft(e.target.checked)}
                />
                <Label check for="cr-enabled" className="ms-2">
                  Activar arriendo de sillas
                </Label>
              </FormGroup>
              <FormGroup className="mb-2">
                <Label for="cr-grace">Días de gracia antes de bloquear</Label>
                <Input
                  id="cr-grace"
                  type="number"
                  min={0}
                  max={30}
                  value={graceDraft}
                  onChange={(e) => setGraceDraft(Number(e.target.value))}
                  style={{ maxWidth: 120 }}
                />
                <small className="text-muted">
                  Días con pago fallido antes de marcar al estilista como bloqueado.
                </small>
              </FormGroup>
              <Button color="primary" size="sm" onClick={onSaveSettings} disabled={savingSettings}>
                {savingSettings ? <Spinner size="sm" /> : 'Guardar configuración'}
              </Button>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={8}>
              <h5>Estilistas con cupo arrendado</h5>
            </Col>
            <Col md={4} className="text-end">
              <Button color="success" size="sm" onClick={() => setAddOpen(true)} disabled={!status?.chair_rental_enabled}>
                + Agregar estilista
              </Button>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              {renters.length === 0 ? (
                <Alert color="light">
                  Aún no hay estilistas con cupo arrendado.
                  {!status?.chair_rental_enabled && ' Activa el switch arriba para empezar.'}
                </Alert>
              ) : (
                <Table responsive bordered>
                  <thead>
                    <tr>
                      <th>Estilista</th>
                      <th>Email</th>
                      <th>Mensual</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renters.map((r) => (
                      <tr key={r.id}>
                        <td>{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                        <td>{r.email}</td>
                        <td>{fmtCop(r.monthly_rent_cop)}</td>
                        <td>{statusBadge(r.rental_status)}</td>
                        <td>
                          <Button size="sm" color="link" onClick={() => onResendLink(r)}>
                            Enlace de pago
                          </Button>
                          <Button size="sm" color="link" className="text-danger" onClick={() => onRemove(r)}>
                            Quitar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Col>
          </Row>
        </>
      )}

      <Modal isOpen={addOpen} toggle={() => setAddOpen(!addOpen)}>
        <ModalHeader toggle={() => setAddOpen(false)}>Agregar estilista con cupo</ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label>Nombre *</Label>
              <Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Apellido</Label>
              <Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Email *</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Teléfono (WhatsApp)</Label>
              <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
            </FormGroup>
            <FormGroup>
              <Label>Precio mensual (COP) *</Label>
              <Input
                type="number"
                min={0}
                value={addForm.monthly_rent_cop}
                onChange={(e) => setAddForm({ ...addForm, monthly_rent_cop: e.target.value })}
                placeholder="Ej: 600000"
              />
              <small className="text-muted">
                Stripe cobra el equivalente diario ({addForm.monthly_rent_cop ? fmtCop(Number(addForm.monthly_rent_cop) / 30) : '—'}/día).
              </small>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button color="primary" onClick={onAddSubmit} disabled={addBusy}>
            {addBusy ? <Spinner size="sm" /> : 'Crear y enviar link'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ChairRentalTab;
