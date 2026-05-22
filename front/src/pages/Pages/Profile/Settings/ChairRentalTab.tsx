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

type EligibleStaff = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  employment_type?: string | null;
  rental_status?: string | null;
};

type StatusResp = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  chair_rental_enabled: boolean;
  grace_days: number;
};

type RenterDetail = {
  renter: {
    id: string;
    first_name: string;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    monthly_rent_cop: string | number | null;
    rental_status: Renter['rental_status'];
    rental_past_due_since: string | null;
    created_at: string;
    has_subscription: boolean;
    has_customer: boolean;
  };
  subscription: {
    id: string;
    status: string;
    current_period_end: number;
    current_period_start: number;
    cancel_at_period_end: boolean;
  } | null;
  default_card: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: string;
    amount_paid: number;
    amount_due: number;
    currency: string;
    created: number;
    hosted_invoice_url: string | null;
    description: string | null;
  }>;
};

const fmtCop = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
};

const fmtStripeAmount = (cents: number, currency: string) => {
  // Stripe COP usa centavos (×100). Mostrar dividiendo /100.
  const v = (cents || 0) / 100;
  return v.toLocaleString('es-CO', { style: 'currency', currency: (currency || 'cop').toUpperCase(), maximumFractionDigits: 0 });
};

const fmtUnixDate = (ts?: number | null) => {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

const statusBadge = (s: Renter['rental_status']) => {
  switch (s) {
    case 'active': return <Badge color="success">Activo</Badge>;
    case 'past_due': return <Badge color="warning">Pago pendiente</Badge>;
    case 'blocked': return <Badge color="danger">Bloqueado</Badge>;
    default: return <Badge color="secondary">—</Badge>;
  }
};

const invoiceStatusBadge = (s: string) => {
  switch (s) {
    case 'paid': return <Badge color="success">Pagada</Badge>;
    case 'open': return <Badge color="warning">Abierta</Badge>;
    case 'void': return <Badge color="secondary">Anulada</Badge>;
    case 'uncollectible': return <Badge color="danger">Incobrable</Badge>;
    case 'draft': return <Badge color="info">Borrador</Badge>;
    default: return <Badge color="secondary">{s}</Badge>;
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

  // Modal Agregar
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', phone: '', monthly_rent_cop: '' });
  const [addBusy, setAddBusy] = useState(false);

  // Modal Detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RenterDetail | null>(null);

  // Modal Cobro ad-hoc
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ amount_cop: '', description: '' });
  const [chargeBusy, setChargeBusy] = useState(false);

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
      const payload = e?.response?.data || {};
      if (payload.action === 'enable_platform_connect' && payload.platform_setup_url) {
        await Swal.fire({
          icon: 'warning',
          title: 'Activa Connect en Stripe primero',
          html: `
            <div style="text-align:left">
              <p>${payload.error}</p>
              <p class="text-muted" style="font-size:13px">
                Esto es una sola vez por toda la plataforma — después de activarlo, cualquier peluquería podrá conectar su Stripe directamente desde esta pantalla.
              </p>
            </div>
          `,
          confirmButtonText: 'Abrir Stripe Connect',
          showCancelButton: true,
          cancelButtonText: 'Después',
        }).then((r) => {
          if (r.isConfirmed) window.open(payload.platform_setup_url, '_blank', 'noopener');
        });
      } else {
        Swal.fire('Error', payload.error || 'No se pudo iniciar el onboarding de Stripe', 'error');
      }
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

  const openAddModal = async () => {
    setAddOpen(true);
    setAddMode('existing');
    setSelectedStaffId('');
    setStaffSearch('');
    setAddForm({ first_name: '', last_name: '', email: '', phone: '', monthly_rent_cop: '' });
    setStaffLoading(true);
    try {
      const { data } = await api.get<{ staff: EligibleStaff[] }>('/chair-rentals/eligible-staff');
      setEligibleStaff(data.staff || []);
    } catch (e: any) {
      console.error('[chairRental] eligible-staff error', e);
      setEligibleStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return eligibleStaff;
    return eligibleStaff.filter((s) => {
      const full = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      return full.includes(q) || (s.email || '').toLowerCase().includes(q) || (s.phone || '').includes(q);
    });
  }, [eligibleStaff, staffSearch]);

  const onAddSubmit = async () => {
    const monthly = Number(addForm.monthly_rent_cop);
    if (!monthly) {
      Swal.fire('Faltan datos', 'El precio mensual es obligatorio', 'warning');
      return;
    }

    let payload: any = { monthly_rent_cop: monthly };

    if (addMode === 'existing') {
      if (!selectedStaffId) {
        Swal.fire('Faltan datos', 'Selecciona un estilista de la lista', 'warning');
        return;
      }
      payload.user_id = selectedStaffId;
    } else {
      if (!addForm.first_name || !addForm.email) {
        Swal.fire('Faltan datos', 'Nombre y email son obligatorios', 'warning');
        return;
      }
      payload = { ...payload, ...addForm, monthly_rent_cop: monthly };
    }

    setAddBusy(true);
    try {
      const { data } = await api.post<{ setup_url: string }>('/chair-rentals/renters', payload);
      setAddOpen(false);
      await loadAll();
      await Swal.fire({
        icon: 'success',
        title: 'Estilista agregado al coworking',
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
      title: `Quitar de coworking a ${r.first_name}?`,
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

  const openDetail = async (r: Renter) => {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get<RenterDetail>(`/chair-rentals/renters/${r.id}`);
      setDetail(data);
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo cargar el detalle', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openChargeFromDetail = () => {
    if (!detail) return;
    setChargeForm({ amount_cop: '', description: '' });
    setChargeOpen(true);
  };

  const onChargeSubmit = async () => {
    if (!detail) return;
    const amount = Number(chargeForm.amount_cop);
    const desc = chargeForm.description.trim();
    if (!amount || amount < 2000) {
      Swal.fire('Monto inválido', 'Mínimo 2.000 COP', 'warning');
      return;
    }
    if (!desc) {
      Swal.fire('Falta concepto', 'La descripción del cobro es obligatoria', 'warning');
      return;
    }
    const renterName = [detail.renter.first_name, detail.renter.last_name].filter(Boolean).join(' ');
    const conf = await Swal.fire({
      icon: 'question',
      title: `Cobrar ${fmtCop(amount)}?`,
      html: `A la tarjeta guardada de <strong>${renterName}</strong>${detail.default_card ? ` (•••• ${detail.default_card.last4})` : ''}.<br/><br/>Concepto: <em>${desc}</em>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar ahora',
      confirmButtonColor: '#0ab39c',
    });
    if (!conf.isConfirmed) return;

    setChargeBusy(true);
    try {
      const { data } = await api.post(`/chair-rentals/renters/${detail.renter.id}/charge`, {
        amount_cop: amount,
        description: desc,
      });
      setChargeOpen(false);
      await Swal.fire({
        icon: 'success',
        title: 'Cobro exitoso',
        html: `Se cobraron <strong>${fmtCop(amount)}</strong> a la tarjeta del estilista.<br/><small class="text-muted">${(data as any).payment_intent_id || ''}</small>`,
      });
      // Recargar el detalle para que aparezca la nueva transacción
      try {
        const { data: fresh } = await api.get<RenterDetail>(`/chair-rentals/renters/${detail.renter.id}`);
        setDetail(fresh);
      } catch { /* noop */ }
    } catch (e: any) {
      const payload = e?.response?.data || {};
      Swal.fire({
        icon: 'error',
        title: 'No se pudo cobrar',
        html: `${payload.error || 'Error desconocido'}${payload.code ? `<br/><small class="text-muted">code: ${payload.code}${payload.decline_code ? ' · ' + payload.decline_code : ''}</small>` : ''}`,
      });
    } finally {
      setChargeBusy(false);
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
          <h4 className="mb-3">Coworking</h4>
          <p className="text-muted mb-3">
            Cobra a estilistas independientes que usan tus instalaciones bajo modalidad de coworking.
            Tú defines el precio mensual, Stripe cobra automáticamente cada día. Si fallan los pagos,
            después de <strong>{status?.grace_days ?? 3} días</strong> el estilista queda bloqueado y
            no puede recibir citas ni entrar a la app.
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
                  Activar coworking
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
              <h5>Estilistas en coworking</h5>
            </Col>
            <Col md={4} className="text-end">
              <Button color="success" size="sm" onClick={openAddModal} disabled={!status?.chair_rental_enabled}>
                + Agregar estilista
              </Button>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              {renters.length === 0 ? (
                <Alert color="light">
                  Aún no hay estilistas en coworking.
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
                          <Button size="sm" color="link" onClick={() => openDetail(r)}>
                            Ver detalle
                          </Button>
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

      {/* Modal Agregar */}
      <Modal isOpen={addOpen} toggle={() => setAddOpen(!addOpen)} size="lg">
        <ModalHeader toggle={() => setAddOpen(false)}>Agregar estilista al coworking</ModalHeader>
        <ModalBody>
          <div className="mb-3 d-flex gap-2">
            <Button
              color={addMode === 'existing' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setAddMode('existing')}
            >
              Desde mi personal
            </Button>
            <Button
              color={addMode === 'new' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setAddMode('new')}
            >
              Crear nuevo
            </Button>
          </div>

          {addMode === 'existing' ? (
            <>
              <FormGroup>
                <Label>Buscar estilista</Label>
                <Input
                  placeholder="Nombre, email o teléfono…"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
              </FormGroup>
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
                {staffLoading ? (
                  <div className="text-center p-3"><Spinner size="sm" /></div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-muted text-center p-3">
                    {eligibleStaff.length === 0
                      ? 'No hay estilistas disponibles. Crea uno nuevo.'
                      : 'Sin resultados para esa búsqueda.'}
                  </div>
                ) : (
                  <Table className="mb-0" hover>
                    <tbody>
                      {filteredStaff.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedStaffId(s.id)}
                          style={{
                            cursor: 'pointer',
                            background: selectedStaffId === s.id ? '#e7f5ff' : undefined,
                          }}
                        >
                          <td style={{ width: 30 }}>
                            <Input
                              type="radio"
                              checked={selectedStaffId === s.id}
                              onChange={() => setSelectedStaffId(s.id)}
                            />
                          </td>
                          <td>
                            <div><strong>{[s.first_name, s.last_name].filter(Boolean).join(' ')}</strong></div>
                            <small className="text-muted">{s.email}{s.phone ? ` · ${s.phone}` : ''}</small>
                          </td>
                          <td>
                            {s.employment_type === 'renter' && s.rental_status ? (
                              <Badge color="warning">renter previo</Badge>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
              <FormGroup className="mt-3">
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
            </>
          ) : (
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
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button color="primary" onClick={onAddSubmit} disabled={addBusy}>
            {addBusy ? <Spinner size="sm" /> : 'Crear y enviar link'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal Detalle */}
      <Modal isOpen={detailOpen} toggle={() => setDetailOpen(!detailOpen)} size="lg">
        <ModalHeader toggle={() => setDetailOpen(false)}>
          {detail ? `Detalle de ${[detail.renter.first_name, detail.renter.last_name].filter(Boolean).join(' ')}` : 'Detalle'}
        </ModalHeader>
        <ModalBody>
          {detailLoading || !detail ? (
            <div className="text-center p-4"><Spinner /></div>
          ) : (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="text-muted mb-2">Datos personales</h6>
                  <div><strong>Email:</strong> {detail.renter.email}</div>
                  <div><strong>Teléfono:</strong> {detail.renter.phone || '—'}</div>
                  <div><strong>Estado:</strong> {statusBadge(detail.renter.rental_status)}</div>
                  <div><strong>Mensualidad:</strong> {fmtCop(detail.renter.monthly_rent_cop)}</div>
                </Col>
                <Col md={6}>
                  <h6 className="text-muted mb-2">Tarjeta y suscripción</h6>
                  {detail.default_card ? (
                    <div>
                      <strong>Tarjeta:</strong> {detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}{' '}
                      <small className="text-muted">
                        (exp {String(detail.default_card.exp_month).padStart(2, '0')}/{String(detail.default_card.exp_year).slice(-2)})
                      </small>
                    </div>
                  ) : (
                    <div className="text-muted">Sin tarjeta guardada</div>
                  )}
                  {detail.subscription ? (
                    <>
                      <div className="mt-1">
                        <strong>Sub:</strong> <Badge color={detail.subscription.status === 'active' ? 'success' : 'warning'}>{detail.subscription.status}</Badge>
                      </div>
                      <div><small className="text-muted">Próximo cobro: {fmtUnixDate(detail.subscription.current_period_end)}</small></div>
                      {detail.subscription.cancel_at_period_end && (
                        <Badge color="danger" className="mt-1">Cancelará al cierre del período</Badge>
                      )}
                    </>
                  ) : (
                    <div className="text-muted mt-1">Sin suscripción activa</div>
                  )}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-muted mb-0">Últimos cobros</h6>
                    <Button
                      size="sm"
                      color="primary"
                      onClick={openChargeFromDetail}
                      disabled={!detail.default_card}
                      title={!detail.default_card ? 'El estilista debe guardar tarjeta primero' : ''}
                    >
                      + Cobrar extra
                    </Button>
                  </div>
                  {detail.invoices.length === 0 ? (
                    <Alert color="light" className="mb-0">Sin facturas todavía.</Alert>
                  ) : (
                    <Table responsive size="sm" bordered>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>#</th>
                          <th>Concepto</th>
                          <th>Monto</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.invoices.map((i) => (
                          <tr key={i.id}>
                            <td><small>{fmtUnixDate(i.created)}</small></td>
                            <td><small>{i.number || '—'}</small></td>
                            <td><small>{i.description || '—'}</small></td>
                            <td>{fmtStripeAmount(i.amount_paid || i.amount_due, i.currency)}</td>
                            <td>{invoiceStatusBadge(i.status)}</td>
                            <td>
                              {i.hosted_invoice_url && (
                                <a href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                  <small>Ver</small>
                                </a>
                              )}
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
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </ModalFooter>
      </Modal>

      {/* Modal Cobro ad-hoc */}
      <Modal isOpen={chargeOpen} toggle={() => setChargeOpen(!chargeOpen)}>
        <ModalHeader toggle={() => setChargeOpen(false)}>Cobrar a la tarjeta del estilista</ModalHeader>
        <ModalBody>
          {detail && (
            <>
              <Alert color="info">
                <small>
                  Se cobrará a <strong>{[detail.renter.first_name, detail.renter.last_name].filter(Boolean).join(' ')}</strong>
                  {detail.default_card ? ` (${detail.default_card.brand?.toUpperCase()} •••• ${detail.default_card.last4})` : ''}.
                  El cobro es <strong>inmediato</strong> y se descuenta de la tarjeta guardada.
                </small>
              </Alert>
              <FormGroup>
                <Label>Monto (COP) *</Label>
                <Input
                  type="number"
                  min={2000}
                  value={chargeForm.amount_cop}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount_cop: e.target.value })}
                  placeholder="Ej: 100000"
                />
                <small className="text-muted">Mínimo 2.000 COP.</small>
              </FormGroup>
              <FormGroup>
                <Label>Concepto *</Label>
                <Input
                  type="textarea"
                  rows={2}
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="Ej: Producto vendido, multa por daño, servicio extra…"
                />
                <small className="text-muted">Aparece en el recibo de Stripe del estilista.</small>
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setChargeOpen(false)}>Cancelar</Button>
          <Button color="primary" onClick={onChargeSubmit} disabled={chargeBusy}>
            {chargeBusy ? <Spinner size="sm" /> : 'Cobrar ahora'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ChairRentalTab;
