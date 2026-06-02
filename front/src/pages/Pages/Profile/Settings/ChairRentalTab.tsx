import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Row, Col, Button, Badge, Spinner, Input, Label, Alert,
  Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup,
  Card, CardBody, InputGroup, InputGroupText,
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
  const v = (cents || 0) / 100;
  return v.toLocaleString('es-CO', { style: 'currency', currency: (currency || 'cop').toUpperCase(), maximumFractionDigits: 0 });
};

const fmtUnixDate = (ts?: number | null, withTime = false) => {
  if (!ts) return '—';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' };
  return new Date(ts * 1000).toLocaleString('es-CO', opts);
};

const initials = (firstName?: string | null, lastName?: string | null) => {
  const a = (firstName || '').trim().charAt(0).toUpperCase();
  const b = (lastName || '').trim().charAt(0).toUpperCase();
  return (a + b) || a || '?';
};

// Color de avatar a partir del nombre — determinista.
const avatarColor = (key: string) => {
  const palette = ['#0ab39c', '#3577f1', '#f7b84b', '#f06548', '#405189', '#299cdb', '#6f42c1', '#d63384'];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const Avatar: React.FC<{ first?: string | null; last?: string | null; size?: number; id?: string }> = ({ first, last, size = 36, id }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: avatarColor(id || `${first}${last}`),
      color: 'white',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontSize: size * 0.4,
      flexShrink: 0,
    }}
  >
    {initials(first, last)}
  </div>
);

const statusInfo = (s: Renter['rental_status']) => {
  switch (s) {
    case 'active': return { color: 'success', icon: 'ri-checkbox-circle-fill', text: 'Al día' };
    case 'past_due': return { color: 'warning', icon: 'ri-error-warning-fill', text: 'En mora' };
    case 'blocked': return { color: 'danger', icon: 'ri-forbid-fill', text: 'Bloqueado' };
    default: return { color: 'secondary', icon: 'ri-time-line', text: 'Pendiente' };
  }
};

const statusBadge = (s: Renter['rental_status']) => {
  const i = statusInfo(s);
  return (
    <Badge color={i.color} className="d-inline-flex align-items-center gap-1" style={{ padding: '6px 10px' }}>
      <i className={i.icon} style={{ fontSize: 12 }}></i>
      {i.text}
    </Badge>
  );
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

const cardBrandIcon = (brand?: string) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) return 'ri-visa-line';
  if (b.includes('master')) return 'ri-mastercard-line';
  return 'ri-bank-card-line';
};

const KpiCard: React.FC<{ icon: string; label: string; value: React.ReactNode; color: string; subtitle?: string }> = ({ icon, label, value, color, subtitle }) => (
  <Card className="card-animate h-100 mb-0">
    <CardBody>
      <div className="d-flex align-items-center">
        <div
          className="avatar-sm flex-shrink-0 me-3"
          style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className={icon} style={{ fontSize: 22 }}></i>
        </div>
        <div className="flex-grow-1 overflow-hidden">
          <p className="text-uppercase text-muted fs-12 mb-1 fw-medium">{label}</p>
          <h4 className="mb-0 fw-semibold">{value}</h4>
          {subtitle && <small className="text-muted">{subtitle}</small>}
        </div>
      </div>
    </CardBody>
  </Card>
);

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
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
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

  // Vincular / agregar tarjeta desde el detalle
  const [linkingCard, setLinkingCard] = useState(false);

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

  const kpis = useMemo(() => {
    let activos = 0, mora = 0, bloqueados = 0, ingresoMensual = 0;
    for (const r of renters) {
      if (r.rental_status === 'active') activos++;
      else if (r.rental_status === 'past_due') mora++;
      else if (r.rental_status === 'blocked') bloqueados++;
      if (r.rental_status === 'active' && r.monthly_rent_cop) {
        ingresoMensual += Number(r.monthly_rent_cop) || 0;
      }
    }
    return { activos, mora, bloqueados, ingresoMensual, total: renters.length };
  }, [renters]);

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
          html: `<div style="text-align:left"><p>${payload.error}</p></div>`,
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
    setSelectedStaffIds([]);
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

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // "Seleccionar todos" opera sobre los visibles tras el filtro de búsqueda.
  const allFilteredSelected =
    filteredStaff.length > 0 && filteredStaff.every((s) => selectedStaffIds.includes(s.id));

  const toggleSelectAll = () => {
    setSelectedStaffIds((prev) => {
      const visibleIds = filteredStaff.map((s) => s.id);
      if (visibleIds.every((id) => prev.includes(id))) {
        // todos los visibles ya estaban → des-seleccionarlos
        return prev.filter((id) => !visibleIds.includes(id));
      }
      // agregar los visibles que falten, conservando los ya seleccionados (fuera del filtro)
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  // Modo "Crear nuevo": un solo estilista, muestra link de setup para copiar.
  const submitNewRenter = async (monthly: number) => {
    if (!addForm.first_name || !addForm.email) {
      Swal.fire('Faltan datos', 'Nombre y email son obligatorios', 'warning');
      return;
    }
    setAddBusy(true);
    try {
      const { data } = await api.post<{ setup_url: string }>('/chair-rentals/renters', {
        ...addForm,
        monthly_rent_cop: monthly,
      });
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

  // Modo "Desde mi personal": agrega en lote los seleccionados con el mismo
  // precio y le envía a cada uno la invitación de acceso por email.
  const submitBulkExisting = async (monthly: number) => {
    const ids = [...selectedStaffIds];
    if (ids.length === 0) {
      Swal.fire('Faltan datos', 'Selecciona al menos un estilista de la lista', 'warning');
      return;
    }
    const byId = new Map(eligibleStaff.map((s) => [s.id, s]));
    const nameOf = (id: string) => {
      const s = byId.get(id);
      return s ? [s.first_name, s.last_name].filter(Boolean).join(' ') : id;
    };

    setAddBusy(true);
    try {
      // 1) Agregar cada estilista al coworking (crea customer + price diario).
      const added = await Promise.all(
        ids.map(async (id) => {
          try {
            await api.post('/chair-rentals/renters', { user_id: id, monthly_rent_cop: monthly });
            return { id, ok: true as const, error: null as string | null };
          } catch (e: any) {
            return { id, ok: false as const, error: e?.response?.data?.error || 'No se pudo agregar' };
          }
        })
      );

      // 2) Para los agregados con éxito, enviar invitación de acceso por email.
      const okIds = added.filter((a) => a.ok).map((a) => a.id);
      const invited = await Promise.all(
        okIds.map(async (id) => {
          try {
            await api.post(`/chair-rentals/renters/${id}/invite`, {});
            return { id, emailed: true as const, error: null as string | null };
          } catch (e: any) {
            return { id, emailed: false as const, error: e?.response?.data?.error || 'No se pudo invitar' };
          }
        })
      );
      const invMap = new Map(invited.map((i) => [i.id, i]));

      setAddOpen(false);
      await loadAll();

      const successRows = added
        .filter((a) => a.ok)
        .map((a) => {
          const inv = invMap.get(a.id);
          const mailIcon = inv?.emailed
            ? '<i class="ri-mail-check-line text-success"></i> invitado'
            : '<i class="ri-mail-close-line text-warning"></i> sin email';
          return `<li><strong>${nameOf(a.id)}</strong> — ${mailIcon}</li>`;
        });
      const failRows = added
        .filter((a) => !a.ok)
        .map((a) => `<li><strong>${nameOf(a.id)}</strong> — <span class="text-danger">${a.error}</span></li>`);

      await Swal.fire({
        icon: failRows.length ? 'warning' : 'success',
        title: `${successRows.length} estilista${successRows.length === 1 ? '' : 's'} agregado${successRows.length === 1 ? '' : 's'} al coworking`,
        html: `
          <div style="text-align:left">
            ${successRows.length ? `<p class="mb-1">Se les envió la invitación de acceso por email para que ingresen y guarden su tarjeta:</p><ul style="padding-left:18px">${successRows.join('')}</ul>` : ''}
            ${failRows.length ? `<p class="mb-1 mt-2 text-danger">No se pudieron agregar:</p><ul style="padding-left:18px">${failRows.join('')}</ul>` : ''}
          </div>`,
      });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo agregar el lote', 'error');
    } finally {
      setAddBusy(false);
    }
  };

  const onAddSubmit = async () => {
    const monthly = Number(addForm.monthly_rent_cop);
    if (!monthly) {
      Swal.fire('Faltan datos', 'El precio mensual es obligatorio', 'warning');
      return;
    }
    if (addMode === 'existing') {
      await submitBulkExisting(monthly);
    } else {
      await submitNewRenter(monthly);
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

  const onInvite = async (r: Renter) => {
    const conf = await Swal.fire({
      icon: 'question',
      title: `Enviar invitación de acceso a ${r.first_name}?`,
      html: `Se enviará un correo a <strong>${r.email}</strong> para que cree su contraseña e ingrese a su espacio de Coworking en Tupelukeria.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar invitación',
      confirmButtonColor: '#3577f1',
    });
    if (!conf.isConfirmed) return;
    try {
      const { data } = await api.post<{ message: string }>(`/chair-rentals/renters/${r.id}/invite`, {});
      Swal.fire('Invitación enviada', data?.message || `Se envió la invitación a ${r.email}`, 'success');
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo enviar la invitación', 'error');
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

  // Genera el enlace para que el estilista guarde/actualice su tarjeta.
  // - Sin suscripción aún → setup-link (activa la suscripción diaria al guardar).
  // - Con suscripción → payment-link (actualiza la tarjeta existente).
  const onLinkCardFromDetail = async () => {
    if (!detail) return;
    const r = detail.renter;
    const updating = !!detail.default_card; // ya tiene tarjeta → es actualización
    const endpoint = r.has_subscription
      ? `/chair-rentals/renters/${r.id}/payment-link`
      : `/chair-rentals/renters/${r.id}/setup-link`;
    setLinkingCard(true);
    try {
      const { data } = await api.post<{ setup_url?: string; url?: string }>(endpoint, {});
      const url = data.setup_url || data.url || '';
      setLinkingCard(false);
      await Swal.fire({
        icon: 'success',
        title: updating ? 'Enlace para actualizar tarjeta' : 'Enlace para vincular tarjeta',
        html: `Envíale este enlace a <strong>${[r.first_name, r.last_name].filter(Boolean).join(' ')}</strong> para que ${updating ? 'actualice' : 'guarde'} su tarjeta:<br/><br/>
          <a href="${url}" target="_blank" rel="noopener">${url.slice(0, 60)}…</a>
          <br/><br/>${r.has_subscription ? 'La tarjeta nueva se usará en el próximo cobro.' : 'Cuando complete el setup, la suscripción diaria se activa.'}`,
        confirmButtonText: 'Copiar enlace',
      }).then(() => navigator.clipboard?.writeText(url));
    } catch (e: any) {
      setLinkingCard(false);
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo generar el enlace de tarjeta', 'error');
    }
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
        <Card className="border border-info-subtle">
          <CardBody>
            <div className="d-flex align-items-start gap-3">
              <div style={{ fontSize: 28, color: '#0ab39c' }}><i className="ri-bank-card-2-line"></i></div>
              <div className="flex-grow-1">
                <h6 className="mb-1">Conecta tu cuenta Stripe</h6>
                <p className="text-muted mb-3 fs-13">El dinero llega directo a tu cuenta. Tupelukeria solo orquesta el cobro diario.</p>
                <Button color="primary" onClick={onConnect} disabled={connecting} size="sm">
                  {connecting ? <Spinner size="sm" /> : <><i className="ri-link me-1"></i> Conectar Stripe</>}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      );
    }
    if (!status.charges_enabled) {
      return (
        <Alert color="warning" className="d-flex align-items-center gap-2 mb-0">
          <i className="ri-error-warning-line fs-20"></i>
          <div className="flex-grow-1">
            <strong>Onboarding incompleto.</strong> Termina el proceso en Stripe.
          </div>
          <Button size="sm" color="warning" onClick={onConnect} disabled={connecting}>
            {connecting ? <Spinner size="sm" /> : 'Continuar'}
          </Button>
        </Alert>
      );
    }
    return (
      <Alert color="success" className="d-flex align-items-center gap-2 mb-0">
        <i className="ri-checkbox-circle-fill fs-20"></i>
        <div className="flex-grow-1">
          <strong>Stripe conectado.</strong> {status.payouts_enabled ? 'Payouts activos.' : 'Payouts pendientes.'}
        </div>
      </Alert>
    );
  };

  return (
    <div>
      {/* Header */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-1 d-flex align-items-center gap-2">
            <i className="ri-store-2-line text-primary"></i> Coworking
          </h4>
          <p className="text-muted mb-0 fs-13">
            Cobra a estilistas independientes que usan tus instalaciones. Stripe cobra el equivalente diario.
            Tras <strong>{status?.grace_days ?? 3}</strong> días con pago fallido, se bloquean.
          </p>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={12}>{renderConnectSection()}</Col>
      </Row>

      {connectedAndReady && (
        <>
          {/* KPIs */}
          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <KpiCard
                icon="ri-money-dollar-circle-fill"
                label="Ingreso mensual"
                value={fmtCop(kpis.ingresoMensual)}
                color="#0ab39c"
                subtitle={kpis.activos === 1 ? '1 activo' : `${kpis.activos} activos`}
              />
            </Col>
            <Col xs={6} md={3}>
              <KpiCard
                icon="ri-team-fill"
                label="Total renters"
                value={kpis.total}
                color="#3577f1"
                subtitle={kpis.total === 1 ? '1 estilista' : `${kpis.total} estilistas`}
              />
            </Col>
            <Col xs={6} md={3}>
              <KpiCard
                icon="ri-error-warning-fill"
                label="En mora"
                value={kpis.mora}
                color="#f7b84b"
                subtitle={kpis.mora ? 'Atención requerida' : 'Todo al día'}
              />
            </Col>
            <Col xs={6} md={3}>
              <KpiCard
                icon="ri-forbid-fill"
                label="Bloqueados"
                value={kpis.bloqueados}
                color="#f06548"
                subtitle={kpis.bloqueados ? 'Sin acceso al salón' : 'Ninguno'}
              />
            </Col>
          </Row>

          {/* Settings */}
          <Card className="mb-4">
            <CardBody>
              <Row>
                <Col md={6}>
                  <h6 className="mb-3 d-flex align-items-center gap-2">
                    <i className="ri-settings-3-line"></i> Configuración
                  </h6>
                  <FormGroup check className="mb-3 form-switch">
                    <Input
                      type="switch"
                      id="cr-enabled"
                      checked={enabledDraft}
                      onChange={(e) => setEnabledDraft(e.target.checked)}
                    />
                    <Label check for="cr-enabled" className="ms-2">
                      Coworking activo
                    </Label>
                  </FormGroup>
                  <FormGroup className="mb-3">
                    <Label for="cr-grace" className="mb-1 fs-13 fw-medium">
                      <i className="ri-time-line me-1"></i> Días de gracia antes de bloquear
                    </Label>
                    <Input
                      id="cr-grace"
                      type="number"
                      min={0}
                      max={30}
                      value={graceDraft}
                      onChange={(e) => setGraceDraft(Number(e.target.value))}
                      style={{ maxWidth: 120 }}
                    />
                  </FormGroup>
                  <Button color="primary" size="sm" onClick={onSaveSettings} disabled={savingSettings}>
                    {savingSettings ? <Spinner size="sm" /> : <><i className="ri-save-line me-1"></i> Guardar</>}
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Lista de renters */}
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <i className="ri-user-star-line"></i> Estilistas en coworking
                </h6>
                <Button color="success" size="sm" onClick={openAddModal} disabled={!status?.chair_rental_enabled}>
                  <i className="ri-user-add-line me-1"></i> Agregar estilista
                </Button>
              </div>

              {renters.length === 0 ? (
                <div className="text-center py-5">
                  <i className="ri-store-2-line" style={{ fontSize: 48, color: '#dee2e6' }}></i>
                  <p className="text-muted mt-3 mb-0">
                    Aún no hay estilistas en coworking.
                    {!status?.chair_rental_enabled && <><br/><small>Activa el switch para empezar.</small></>}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Estilista</th>
                        <th>Contacto</th>
                        <th>Mensualidad</th>
                        <th>Estado</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renters.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <Avatar first={r.first_name} last={r.last_name} id={r.id} />
                              <div>
                                <div className="fw-medium">{[r.first_name, r.last_name].filter(Boolean).join(' ')}</div>
                                {!r.rental_stripe_subscription_id && (
                                  <small className="text-muted">
                                    <i className="ri-time-line me-1"></i> Sin tarjeta guardada
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fs-13"><i className="ri-mail-line me-1 text-muted"></i> {r.email}</div>
                            {r.phone && <div className="fs-13"><i className="ri-phone-line me-1 text-muted"></i> {r.phone}</div>}
                          </td>
                          <td className="fw-medium">{fmtCop(r.monthly_rent_cop)}</td>
                          <td>{statusBadge(r.rental_status)}</td>
                          <td className="text-end">
                            <Button size="sm" color="light" className="me-1" onClick={() => openDetail(r)} title="Ver detalle">
                              <i className="ri-eye-line"></i>
                            </Button>
                            <Button size="sm" color="light" className="me-1" onClick={() => onResendLink(r)} title="Enlace de pago">
                              <i className="ri-link"></i>
                            </Button>
                            <Button size="sm" color="light" className="me-1" onClick={() => onInvite(r)} title="Enviar invitación de acceso (login)">
                              <i className="ri-mail-send-line"></i>
                            </Button>
                            <Button size="sm" color="light" className="text-danger" onClick={() => onRemove(r)} title="Quitar">
                              <i className="ri-delete-bin-line"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* ========= Modal Agregar ========= */}
      <Modal isOpen={addOpen} toggle={() => setAddOpen(!addOpen)} size="lg" centered>
        <ModalHeader toggle={() => setAddOpen(false)}>
          <i className="ri-user-add-line me-2"></i> Agregar estilista al coworking
        </ModalHeader>
        <ModalBody>
          <div className="d-flex gap-2 mb-3 p-1 bg-light rounded" style={{ width: 'fit-content' }}>
            <Button
              color={addMode === 'existing' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setAddMode('existing')}
              className="rounded-pill px-3"
            >
              <i className="ri-team-line me-1"></i> Desde mi personal
            </Button>
            <Button
              color={addMode === 'new' ? 'primary' : 'light'}
              size="sm"
              onClick={() => setAddMode('new')}
              className="rounded-pill px-3"
            >
              <i className="ri-user-add-line me-1"></i> Crear nuevo
            </Button>
          </div>

          {addMode === 'existing' ? (
            <>
              <FormGroup className="mb-2">
                <InputGroup>
                  <InputGroupText className="bg-light"><i className="ri-search-line"></i></InputGroupText>
                  <Input
                    placeholder="Buscar por nombre, email o teléfono…"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                  />
                </InputGroup>
              </FormGroup>
              {filteredStaff.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                  <FormGroup check className="mb-0">
                    <Input
                      type="checkbox"
                      id="cr-select-all"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                    />
                    <Label check for="cr-select-all" className="ms-1 fs-13 fw-medium" style={{ cursor: 'pointer' }}>
                      Seleccionar todos {staffSearch ? '(filtrados)' : ''}
                    </Label>
                  </FormGroup>
                  {selectedStaffIds.length > 0 && (
                    <Badge color="primary" pill>
                      {selectedStaffIds.length} seleccionado{selectedStaffIds.length === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>
              )}
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e9ebec', borderRadius: 8 }}>
                {staffLoading ? (
                  <div className="text-center p-4"><Spinner size="sm" /></div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center p-4 text-muted">
                    <i className="ri-team-line" style={{ fontSize: 32, color: '#dee2e6' }}></i>
                    <p className="mb-0 mt-2">
                      {eligibleStaff.length === 0
                        ? 'No hay estilistas elegibles. Usa "Crear nuevo".'
                        : 'Sin resultados para esa búsqueda.'}
                    </p>
                  </div>
                ) : (
                  filteredStaff.map((s, idx) => {
                    const selected = selectedStaffIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleStaff(s.id)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: selected ? '#e7f5ff' : (idx % 2 ? '#fafbfc' : 'white'),
                          borderBottom: idx === filteredStaff.length - 1 ? 'none' : '1px solid #f1f3f5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'background 0.15s',
                        }}
                      >
                        <Input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleStaff(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0 flex-shrink-0"
                          style={{ cursor: 'pointer' }}
                        />
                        <Avatar first={s.first_name} last={s.last_name} id={s.id} size={40} />
                        <div className="flex-grow-1">
                          <div className="fw-medium">{[s.first_name, s.last_name].filter(Boolean).join(' ')}</div>
                          <small className="text-muted">
                            <i className="ri-mail-line me-1"></i>{s.email}
                            {s.phone && <> · <i className="ri-phone-line me-1"></i>{s.phone}</>}
                          </small>
                        </div>
                        {s.employment_type === 'renter' && (
                          <Badge color="warning" pill>renter previo</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <FormGroup className="mt-3">
                <Label className="mb-1 fw-medium">Precio mensual (igual para todos los seleccionados)</Label>
                <InputGroup>
                  <InputGroupText>$</InputGroupText>
                  <Input
                    type="number"
                    min={0}
                    value={addForm.monthly_rent_cop}
                    onChange={(e) => setAddForm({ ...addForm, monthly_rent_cop: e.target.value })}
                    placeholder="600000"
                  />
                  <InputGroupText>COP</InputGroupText>
                </InputGroup>
                <small className="text-muted">
                  Stripe cobra a cada uno el equivalente diario: <strong>{addForm.monthly_rent_cop ? fmtCop(Number(addForm.monthly_rent_cop) / 30) : '—'}/día</strong>.
                  {' '}Puedes ajustar el precio individual luego en cada detalle.
                </small>
              </FormGroup>
            </>
          ) : (
            <Form>
              <Row>
                <Col md={6}>
                  <FormGroup>
                    <Label className="mb-1 fw-medium">Nombre *</Label>
                    <Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
                  </FormGroup>
                </Col>
                <Col md={6}>
                  <FormGroup>
                    <Label className="mb-1 fw-medium">Apellido</Label>
                    <Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
                  </FormGroup>
                </Col>
              </Row>
              <FormGroup>
                <Label className="mb-1 fw-medium">Email *</Label>
                <InputGroup>
                  <InputGroupText><i className="ri-mail-line"></i></InputGroupText>
                  <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                </InputGroup>
              </FormGroup>
              <FormGroup>
                <Label className="mb-1 fw-medium">Teléfono (WhatsApp)</Label>
                <InputGroup>
                  <InputGroupText><i className="ri-phone-line"></i></InputGroupText>
                  <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+57 300 ..." />
                </InputGroup>
              </FormGroup>
              <FormGroup>
                <Label className="mb-1 fw-medium">Precio mensual</Label>
                <InputGroup>
                  <InputGroupText>$</InputGroupText>
                  <Input
                    type="number"
                    min={0}
                    value={addForm.monthly_rent_cop}
                    onChange={(e) => setAddForm({ ...addForm, monthly_rent_cop: e.target.value })}
                    placeholder="600000"
                  />
                  <InputGroupText>COP</InputGroupText>
                </InputGroup>
                <small className="text-muted">
                  Cobro diario: <strong>{addForm.monthly_rent_cop ? fmtCop(Number(addForm.monthly_rent_cop) / 30) : '—'}/día</strong>.
                </small>
              </FormGroup>
            </Form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button color="primary" onClick={onAddSubmit} disabled={addBusy}>
            {addBusy ? (
              <Spinner size="sm" />
            ) : addMode === 'existing' ? (
              <><i className="ri-mail-send-line me-1"></i> Agregar{selectedStaffIds.length ? ` ${selectedStaffIds.length}` : ''} e invitar</>
            ) : (
              <><i className="ri-send-plane-line me-1"></i> Crear y enviar link</>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ========= Modal Detalle ========= */}
      <Modal isOpen={detailOpen} toggle={() => setDetailOpen(!detailOpen)} size="lg" centered>
        <ModalHeader toggle={() => setDetailOpen(false)}>
          <i className="ri-file-user-line me-2"></i> Detalle del renter
        </ModalHeader>
        <ModalBody className="p-4">
          {detailLoading || !detail ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <>
              {/* Header con avatar + nombre + status */}
              <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <Avatar first={detail.renter.first_name} last={detail.renter.last_name} id={detail.renter.id} size={56} />
                <div className="flex-grow-1">
                  <h5 className="mb-1">{[detail.renter.first_name, detail.renter.last_name].filter(Boolean).join(' ')}</h5>
                  <div className="d-flex gap-2 align-items-center">
                    {statusBadge(detail.renter.rental_status)}
                    <span className="text-muted fs-13">
                      <i className="ri-calendar-line me-1"></i>
                      Renter desde {new Date(detail.renter.created_at).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <Button
                  color="primary"
                  size="sm"
                  onClick={openChargeFromDetail}
                  disabled={!detail.default_card}
                  title={!detail.default_card ? 'El estilista debe guardar tarjeta primero' : ''}
                >
                  <i className="ri-money-dollar-circle-line me-1"></i> Cobrar extra
                </Button>
              </div>

              {/* 2 cards: contacto + suscripción */}
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Card className="bg-light border-0 h-100">
                    <CardBody>
                      <h6 className="text-muted text-uppercase fs-12 mb-3">
                        <i className="ri-contacts-line me-1"></i> Contacto
                      </h6>
                      <div className="mb-2"><i className="ri-mail-line text-muted me-2"></i>{detail.renter.email}</div>
                      <div><i className="ri-phone-line text-muted me-2"></i>{detail.renter.phone || '—'}</div>
                    </CardBody>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="bg-light border-0 h-100">
                    <CardBody>
                      <h6 className="text-muted text-uppercase fs-12 mb-3">
                        <i className="ri-bank-card-line me-1"></i> Pago y suscripción
                      </h6>
                      <div className="mb-2 fs-14">
                        <span className="text-muted">Mensualidad:</span>{' '}
                        <strong>{fmtCop(detail.renter.monthly_rent_cop)}</strong>
                      </div>
                      {detail.default_card ? (
                        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                          <i className={`${cardBrandIcon(detail.default_card.brand)} text-primary`} style={{ fontSize: 18 }}></i>
                          <span>{detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}</span>
                          <small className="text-muted">
                            exp {String(detail.default_card.exp_month).padStart(2, '0')}/{String(detail.default_card.exp_year).slice(-2)}
                          </small>
                          <Button
                            color="link"
                            size="sm"
                            className="p-0 ms-1"
                            onClick={onLinkCardFromDetail}
                            disabled={linkingCard}
                            title="Generar enlace para actualizar la tarjeta"
                          >
                            {linkingCard ? <Spinner size="sm" /> : <><i className="ri-refresh-line me-1"></i>Cambiar</>}
                          </Button>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <div className="text-warning mb-2">
                            <i className="ri-error-warning-line me-1"></i> Sin tarjeta guardada
                          </div>
                          <Button
                            color="primary"
                            size="sm"
                            outline
                            onClick={onLinkCardFromDetail}
                            disabled={linkingCard}
                          >
                            {linkingCard ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Vincular tarjeta</>}
                          </Button>
                        </div>
                      )}
                      {detail.subscription ? (
                        <div className="fs-13 text-muted">
                          <i className="ri-calendar-event-line me-1"></i>
                          Próximo cobro: <strong>{fmtUnixDate(detail.subscription.current_period_end)}</strong>
                          {detail.subscription.cancel_at_period_end && (
                            <Badge color="danger" pill className="ms-2">Cancela al cierre</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted fs-13">Sin suscripción activa</div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* Historial */}
              <h6 className="text-muted text-uppercase fs-12 mb-2 mt-3">
                <i className="ri-history-line me-1"></i> Últimos cobros
              </h6>
              {detail.invoices.length === 0 ? (
                <Alert color="light" className="mb-0 d-flex align-items-center gap-2">
                  <i className="ri-information-line text-muted"></i>
                  <span>Sin facturas todavía.</span>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Concepto</th>
                        <th className="text-end">Monto</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.invoices.map((i) => (
                        <tr key={i.id}>
                          <td className="fs-13">{fmtUnixDate(i.created, true)}</td>
                          <td className="fs-13">{i.description || '—'}</td>
                          <td className="text-end fw-medium">{fmtStripeAmount(i.amount_paid || i.amount_due, i.currency)}</td>
                          <td>{invoiceStatusBadge(i.status)}</td>
                          <td>
                            {i.hosted_invoice_url && (
                              <a href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary" title="Ver recibo">
                                <i className="ri-external-link-line"></i>
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </ModalFooter>
      </Modal>

      {/* ========= Modal Cobro ad-hoc ========= */}
      <Modal isOpen={chargeOpen} toggle={() => setChargeOpen(!chargeOpen)} centered>
        <ModalHeader toggle={() => setChargeOpen(false)}>
          <i className="ri-money-dollar-circle-line me-2"></i> Cobro extra
        </ModalHeader>
        <ModalBody className="p-4">
          {detail && (
            <>
              <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded">
                <Avatar first={detail.renter.first_name} last={detail.renter.last_name} id={detail.renter.id} size={44} />
                <div className="flex-grow-1">
                  <div className="fw-medium">{[detail.renter.first_name, detail.renter.last_name].filter(Boolean).join(' ')}</div>
                  {detail.default_card && (
                    <small className="text-muted">
                      <i className={cardBrandIcon(detail.default_card.brand)}></i> {detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}
                    </small>
                  )}
                </div>
                <Badge color="info" pill><i className="ri-flashlight-line me-1"></i>Inmediato</Badge>
              </div>

              <FormGroup className="mb-3">
                <Label className="mb-1 fw-medium">Monto a cobrar</Label>
                <InputGroup size="lg">
                  <InputGroupText>$</InputGroupText>
                  <Input
                    type="number"
                    min={2000}
                    value={chargeForm.amount_cop}
                    onChange={(e) => setChargeForm({ ...chargeForm, amount_cop: e.target.value })}
                    placeholder="100000"
                    style={{ fontSize: 20, fontWeight: 500 }}
                  />
                  <InputGroupText>COP</InputGroupText>
                </InputGroup>
                {chargeForm.amount_cop && Number(chargeForm.amount_cop) >= 2000 && (
                  <small className="text-success">
                    <i className="ri-check-line"></i> Se cobrarán {fmtCop(chargeForm.amount_cop)}
                  </small>
                )}
              </FormGroup>

              <FormGroup className="mb-0">
                <Label className="mb-1 fw-medium">Concepto del cobro *</Label>
                <Input
                  type="textarea"
                  rows={2}
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="Producto vendido, multa por daño, servicio extra…"
                />
                <small className="text-muted">
                  <i className="ri-information-line me-1"></i>
                  Aparece en el recibo de Stripe que recibe el estilista.
                </small>
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setChargeOpen(false)}>Cancelar</Button>
          <Button color="success" onClick={onChargeSubmit} disabled={chargeBusy}>
            {chargeBusy ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Cobrar ahora</>}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ChairRentalTab;
