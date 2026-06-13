import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Row, Col, Button, Badge, Spinner, Input, Label, Alert,
  Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup,
  Card, CardBody, InputGroup, InputGroupText,
} from 'reactstrap';
import Swal from 'sweetalert2';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../../../../services/api';

// Cache de instancias Stripe.js por (publishable key + connected account). Stripe
// recomienda llamar loadStripe una sola vez por combinación.
const stripeCache: Record<string, Promise<Stripe | null>> = {};
const getStripe = (pk: string, account: string | null): Promise<Stripe | null> => {
  const key = `${pk}::${account || ''}`;
  if (!stripeCache[key]) {
    stripeCache[key] = loadStripe(pk, account ? { stripeAccount: account } : undefined);
  }
  return stripeCache[key];
};

// Formulario de tarjeta embebido (Stripe Elements) para vincular la tarjeta del
// estilista ahí mismo, sin redirigir a Checkout. El SetupIntent ya viene creado
// por el backend; aquí solo se confirma. Al confirmarse, el PM queda adjunto al
// customer y el backend (reconcileRenterCard) lo marca default + arranca la sub.
const InlineCardForm: React.FC<{ onSuccess: (paymentMethodId: string | null) => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: 'if_required' });
    if (error) {
      setErr(error.message || 'No se pudo guardar la tarjeta.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    // payment_method puede venir como string (id) o como objeto expandido.
    const pmId = typeof setupIntent?.payment_method === 'string'
      ? setupIntent.payment_method
      : (setupIntent?.payment_method as any)?.id || null;
    onSuccess(pmId);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="border rounded p-3 mb-2 bg-white">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {err && (
        <div className="text-danger fs-13 mb-2">
          <i className="ri-error-warning-line me-1"></i>{err}
        </div>
      )}
      <div className="d-flex gap-2">
        <Button color="success" size="sm" type="submit" disabled={!stripe || submitting}>
          {submitting ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Guardar tarjeta</>}
        </Button>
        <Button color="light" size="sm" type="button" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </Form>
  );
};

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
  card_status: { status: 'activa' | 'sin_fondos' | 'rechazada'; reason: string | null } | null;
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
    refunded_cash?: boolean;
    refunded?: boolean;
  }>;
};

type PendingRefundItem = {
  day: string; // YYYY-MM-DD
  reason: 'double_charge' | 'blocked_day' | string;
  amount_cop: number;
  invoice_id: string;
};

type PendingRefundsResp = {
  renters: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    total_cop: number;
    items: PendingRefundItem[];
  }>;
  total_cop: number;
};

type CalendarDay = {
  status: 'paid' | 'open' | 'failed' | 'void' | 'blocked' | 'refunded' | string;
  refunded?: boolean;
  amount_cop: number;
  currency: string;
  invoice_id: string;
  hosted_invoice_url: string | null;
};

type CalendarResp = {
  month: string; // YYYY-MM
  daily_cop: number;
  monthly_rent_cop: string | number | null;
  has_customer: boolean;
  subscription: {
    id: string;
    status: string;
    paused: boolean;
    pause_behavior: string | null;
    current_period_end: number;
    cancel_at_period_end: boolean;
  } | null;
  days: Record<string, CalendarDay>;
  blocked_days?: string[];
  readjust_blocked?: boolean;
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

// ── Helpers de calendario ──────────────────────────────────────────────
const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const monthLabelEs = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const thisMonthYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Celdas del mes empezando en lunes; null = relleno.
const buildMonthGrid = (ym: string): (string | null)[] => {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  let startOffset = first.getDay() - 1; // Lun=0
  if (startOffset < 0) startOffset = 6; // Domingo → última columna
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${ym}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const dayPalette = (status?: string): { bg: string; color: string; border: string } => {
  switch (status) {
    case 'paid': return { bg: '#d1f7e8', color: '#0a7c5a', border: '#0ab39c' };
    case 'failed': return { bg: '#ffe3df', color: '#c0392b', border: '#f06548' };
    case 'open': return { bg: '#fff4d6', color: '#9a6b00', border: '#f7b84b' };
    case 'void': return { bg: '#f1f3f5', color: '#868e96', border: '#dee2e6' };
    case 'blocked': return { bg: '#ece9fb', color: '#6f42c1', border: '#9b7fe0' };
    case 'refunded': return { bg: '#e7f6fb', color: '#1d7fa8', border: '#7fcbe8' };
    default: return { bg: '#ffffff', color: '#495057', border: '#e9ebec' };
  }
};

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

const KpiCard: React.FC<{ icon: string; label: string; value: React.ReactNode; color: string; subtitle?: string; valueTitle?: string }> = ({ icon, label, value, color, subtitle, valueTitle }) => (
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
          <h4 className="mb-0 fw-semibold text-truncate" style={{ fontSize: '1.05rem' }} title={valueTitle}>{value}</h4>
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
  // Paginación del historial de cobros (10 por página).
  const [invoicePage, setInvoicePage] = useState(0);
  const INVOICES_PER_PAGE = 10;

  // Modal Cobro ad-hoc
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ amount_cop: '', description: '' });
  const [chargeBusy, setChargeBusy] = useState(false);

  // Modal Calendario (pausar/reanudar + ver días pagados + cobrar día)
  const [calOpen, setCalOpen] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const [calData, setCalData] = useState<CalendarResp | null>(null);
  const [calRenter, setCalRenter] = useState<Renter | null>(null);
  const [calMonth, setCalMonth] = useState<string>(thisMonthYm());
  const [calBusy, setCalBusy] = useState(false);
  // Modo de interacción del calendario: por defecto BLOQUEAR (clic en un día lo
  // bloquea / desbloquea, sin cobrar). "Cobrar día" queda como modo secundario.
  const [calMode, setCalMode] = useState<'charge' | 'block'>('block');

  // Vincular / agregar tarjeta desde el detalle
  const [linkingCard, setLinkingCard] = useState(false);
  // Captura de tarjeta embebida (Stripe Elements) desde el detalle
  const [cardMode, setCardMode] = useState<'idle' | 'inline'>('idle');
  const [setupIntent, setSetupIntent] = useState<{ clientSecret: string; stripePromise: Promise<Stripe | null> } | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  // Acumulado REAL del mes a la fecha (cobrado − reembolsos), viene de Stripe.
  const [income, setIncome] = useState<{ month: string; gross_cop: number; refunded_cop: number; net_cop: number } | null>(null);

  // Modal "Devoluciones pendientes": personas con cobros que toca devolver
  // (dobles cobros / días bloqueados cobrados) para llamarlas y reembolsar.
  const [refundsOpen, setRefundsOpen] = useState(false);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsData, setRefundsData] = useState<PendingRefundsResp | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

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
      // No bloquea la carga de la página: suma invoices de Stripe renter por renter.
      api.get('/chair-rentals/income-summary')
        .then(({ data }) => setIncome(data))
        .catch(() => { /* noop — el KPI muestra "—" */ });
    } catch (e: any) {
      console.error('[chairRental] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const kpis = useMemo(() => {
    let activos = 0, mora = 0, bloqueados = 0;
    let ingresoMensual = 0, moraMonto = 0, bloqueadoMonto = 0;
    for (const r of renters) {
      const rent = Number(r.monthly_rent_cop) || 0;
      if (r.rental_status === 'active') { activos++; ingresoMensual += rent; }
      else if (r.rental_status === 'past_due') { mora++; moraMonto += rent; }
      else if (r.rental_status === 'blocked') { bloqueados++; bloqueadoMonto += rent; }
    }
    // Tarifa diaria total (run-rate) = mensual/30, igual que el cálculo del backend.
    const ingresoDiario = Math.round(ingresoMensual / 30);
    return { activos, mora, bloqueados, ingresoMensual, ingresoDiario, moraMonto, bloqueadoMonto, total: renters.length };
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
    setCardMode('idle');
    setSetupIntent(null);
    setInvoicePage(0);
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

  // Recarga el detalle abierto + la lista (estados/KPIs).
  const refreshDetail = async () => {
    if (!detail) return;
    try {
      const { data } = await api.get<RenterDetail>(`/chair-rentals/renters/${detail.renter.id}`);
      setDetail(data);
    } catch { /* noop */ }
    await loadAll();
  };

  // ── Devoluciones pendientes ───────────────────────────────────────────
  const loadPendingRefunds = async () => {
    setRefundsLoading(true);
    try {
      const { data } = await api.get<PendingRefundsResp>('/chair-rentals/pending-refunds');
      setRefundsData(data);
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudieron cargar las devoluciones pendientes', 'error');
    } finally {
      setRefundsLoading(false);
    }
  };

  const openRefundsModal = () => {
    setRefundsOpen(true);
    loadPendingRefunds();
  };

  // Reembolsa un cobro puntual desde el modal de devoluciones y recarga la lista.
  const onRefundPendingItem = async (renterId: string, renterName: string, item: PendingRefundItem) => {
    const conf = await Swal.fire({
      icon: 'warning',
      title: `¿Devolver ${fmtCop(item.amount_cop)}?`,
      html: `A <strong>${renterName}</strong> · día ${item.day} · ${item.reason === 'blocked_day' ? 'día bloqueado' : 'doble cobro'}.<br/>Se devuelve a su tarjeta.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, devolver',
      confirmButtonColor: '#299cdb',
    });
    if (!conf.isConfirmed) return;
    setRefundingId(item.invoice_id);
    try {
      await api.post(`/chair-rentals/renters/${renterId}/refund`, { id: item.invoice_id });
      Swal.fire({ icon: 'success', text: 'Devolución enviada a la tarjeta', timer: 1300, showConfirmButton: false });
      await loadPendingRefunds();
      await loadAll();
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo devolver el cobro', 'error');
    } finally {
      setRefundingId(null);
    }
  };

  // Reembolsa un cobro del historial a la tarjeta del estilista (cobros dobles,
  // días que no debían cobrarse). El backend acepta invoices (in_) y ad-hoc (pi_).
  const onRefundInvoice = async (inv: RenterDetail['invoices'][number]) => {
    if (!detail) return;
    const conf = await Swal.fire({
      icon: 'warning',
      title: `¿Reembolsar ${fmtStripeAmount(inv.amount_paid || inv.amount_due, inv.currency)}?`,
      html: `Se devolverá a la tarjeta del estilista.<br/><small class="text-muted">${inv.description || 'Cobro'} · ${fmtUnixDate(inv.created, true)}</small>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, reembolsar',
      confirmButtonColor: '#299cdb',
    });
    if (!conf.isConfirmed) return;
    try {
      await api.post(`/chair-rentals/renters/${detail.renter.id}/refund`, { id: inv.id });
      Swal.fire({ icon: 'success', text: 'Reembolso enviado a la tarjeta', timer: 1400, showConfirmButton: false });
      await refreshDetail();
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo reembolsar el cobro', 'error');
    }
  };

  // Inicia la captura embebida: pide un SetupIntent al backend y monta Elements.
  const startInlineCard = async () => {
    if (!detail) return;
    setSetupBusy(true);
    try {
      const { data } = await api.post<{ client_secret: string; publishable_key: string; stripe_account: string | null }>(
        `/chair-rentals/renters/${detail.renter.id}/setup-intent`, {}
      );
      const stripePromise = getStripe(data.publishable_key, data.stripe_account);
      setSetupIntent({ clientSecret: data.client_secret, stripePromise });
      setCardMode('inline');
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo iniciar la captura de tarjeta', 'error');
    } finally {
      setSetupBusy(false);
    }
  };

  const onInlineCardSuccess = async (paymentMethodId: string | null) => {
    setCardMode('idle');
    setSetupIntent(null);
    // Forzar que la tarjeta nueva quede como default (del customer y la sub).
    // Sin esto, si ya había una tarjeta, la suscripción seguía cobrando la vieja.
    if (detail && paymentMethodId) {
      try {
        await api.post(`/chair-rentals/renters/${detail.renter.id}/confirm-card`, {
          payment_method: paymentMethodId,
        });
      } catch (e: any) {
        console.warn('[chairRental] confirm-card error', e?.response?.data || e?.message);
      }
    }
    await refreshDetail();
    Swal.fire({
      icon: 'success',
      title: 'Tarjeta vinculada',
      text: 'Quedó guardada como predeterminada y la suscripción diaria usará esta tarjeta.',
      timer: 2200,
      showConfirmButton: false,
    });
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

  // ── Calendario ────────────────────────────────────────────────────────
  const loadCalendar = useCallback(async (renterId: string, month: string) => {
    setCalLoading(true);
    try {
      const { data } = await api.get<CalendarResp>(
        `/chair-rentals/renters/${renterId}/calendar`,
        { params: { month } }
      );
      setCalData(data);
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo cargar el calendario', 'error');
    } finally {
      setCalLoading(false);
    }
  }, []);

  const openCalendar = async (r: Renter) => {
    const ym = thisMonthYm();
    setCalRenter(r);
    setCalMonth(ym);
    setCalData(null);
    setCalMode('charge');
    setCalOpen(true);
    await loadCalendar(r.id, ym);
  };

  const gotoMonth = async (delta: number) => {
    if (!calRenter) return;
    const ym = shiftMonth(calMonth, delta);
    setCalMonth(ym);
    await loadCalendar(calRenter.id, ym);
  };

  const onTogglePause = async () => {
    if (!calRenter || !calData?.subscription) return;
    const paused = calData.subscription.paused;
    const conf = await Swal.fire({
      icon: paused ? 'question' : 'warning',
      title: paused ? '¿Reanudar cobro automático?' : '¿Pausar cobro automático?',
      text: paused
        ? 'Stripe volverá a cobrar la tarifa diaria automáticamente cada día.'
        : 'Stripe dejará de cobrar la tarifa diaria. Podrás cobrar días sueltos manualmente desde el calendario.',
      showCancelButton: true,
      confirmButtonText: paused ? 'Sí, reanudar' : 'Sí, pausar',
      confirmButtonColor: paused ? '#0ab39c' : '#f7b84b',
    });
    if (!conf.isConfirmed) return;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/${paused ? 'resume' : 'pause'}`, {});
      await loadCalendar(calRenter.id, calMonth);
      await loadAll();
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo cambiar el estado', 'error');
    } finally {
      setCalBusy(false);
    }
  };

  const onChargeDay = async (dateKey: string) => {
    if (!calRenter || !calData) return;
    const existing = calData.days[dateKey];
    if (existing?.status === 'paid') return; // ya pagado, no recobrar
    if (!calData.has_customer) {
      Swal.fire('Sin tarjeta', 'El estilista aún no ha guardado una tarjeta.', 'warning');
      return;
    }
    const renterName = [calRenter.first_name, calRenter.last_name].filter(Boolean).join(' ');
    const conf = await Swal.fire({
      icon: 'question',
      title: `¿Cobrar ${fmtCop(calData.daily_cop)}?`,
      html: `Día <strong>${dateKey}</strong> · arriendo de cupo a la tarjeta guardada de <strong>${renterName}</strong>.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar este día',
      confirmButtonColor: '#0ab39c',
    });
    if (!conf.isConfirmed) return;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/charge-day`, { date: dateKey });
      await loadCalendar(calRenter.id, calMonth);
      Swal.fire({ icon: 'success', text: 'Día cobrado correctamente', timer: 1300, showConfirmButton: false });
    } catch (e: any) {
      const p = e?.response?.data || {};
      Swal.fire({
        icon: 'error',
        title: 'No se pudo cobrar el día',
        html: `${p.error || 'Error desconocido'}${p.code ? `<br/><small class="text-muted">code: ${p.code}${p.decline_code ? ' · ' + p.decline_code : ''}</small>` : ''}`,
      });
    } finally {
      setCalBusy(false);
    }
  };

  // Bloquea/desbloquea un día: ese día no se cobra. Si la suscripción diaria
  // alcanza a cobrarlo, el backend lo reembolsa al instante (webhook).
  const onToggleBlockDay = async (dateKey: string) => {
    if (!calRenter || !calData) return;
    const existing = calData.days[dateKey];
    const isBlocked = existing?.status === 'blocked';
    if (existing?.status === 'paid') {
      Swal.fire('Día ya cobrado', 'Ese día ya tiene un cobro pagado; no se puede bloquear.', 'info');
      return;
    }
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/toggle-block-day`, { date: dateKey });
      await loadCalendar(calRenter.id, calMonth);
      Swal.fire({
        icon: 'success',
        text: isBlocked ? 'Día desbloqueado' : 'Día bloqueado (no se cobrará)',
        timer: 1100,
        showConfirmButton: false,
      });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo cambiar el bloqueo del día', 'error');
    } finally {
      setCalBusy(false);
    }
  };

  // Política de días bloqueados: false = "saltar" (se reembolsan, paga menos);
  // true = "reajustar" (no se reembolsan, paga el mes completo).
  const onToggleReadjust = async () => {
    if (!calRenter || !calData) return;
    const next = !calData.readjust_blocked;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/readjust-policy`, { readjust: next });
      setCalData({ ...calData, readjust_blocked: next });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo cambiar la política', 'error');
    } finally {
      setCalBusy(false);
    }
  };

  // Resumen del mes mostrado: total pagado + nº de días pagados.
  const calSummary = useMemo(() => {
    if (!calData) return { paidDays: 0, paidTotal: 0, failedDays: 0 };
    let paidDays = 0, paidTotal = 0, failedDays = 0;
    for (const k of Object.keys(calData.days)) {
      const d = calData.days[k];
      if (d.status === 'paid') { paidDays++; paidTotal += d.amount_cop || 0; }
      else if (d.status === 'failed') failedDays++;
    }
    return { paidDays, paidTotal, failedDays };
  }, [calData]);

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
          {/* KPIs — carrusel horizontal (swipe en móvil, scroll en desktop) */}
          <div
            className="d-flex gap-3 mb-4 pb-2 cr-kpi-carousel"
            style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {[
              {
                icon: 'ri-funds-fill',
                label: 'Acumulado mes',
                value: income ? fmtCop(income.net_cop) : '—',
                valueTitle: income ? fmtCop(income.net_cop) : '',
                color: '#0ab39c',
                subtitle: income
                  ? income.refunded_cop > 0
                    ? `Neto a hoy · −${fmtCop(income.refunded_cop)} reembolsado`
                    : 'Neto cobrado hasta hoy'
                  : 'Calculando…',
              },
              {
                icon: 'ri-money-dollar-circle-fill',
                label: 'Mensual',
                value: fmtCop(kpis.ingresoMensual),
                valueTitle: fmtCop(kpis.ingresoMensual),
                color: '#405189',
                subtitle: kpis.activos === 1 ? '1 activo' : `${kpis.activos} activos`,
              },
              {
                icon: 'ri-calendar-check-fill',
                label: 'Ingreso al día',
                value: fmtCop(kpis.ingresoDiario),
                valueTitle: fmtCop(kpis.ingresoDiario),
                color: '#299cdb',
                subtitle: 'Tarifa diaria total',
              },
              {
                icon: 'ri-error-warning-fill',
                label: 'En mora',
                value: fmtCop(kpis.moraMonto),
                valueTitle: fmtCop(kpis.moraMonto),
                color: '#f7b84b',
                subtitle: kpis.mora ? `${kpis.mora} sin pagar` : 'Todo al día',
              },
              {
                icon: 'ri-forbid-fill',
                label: 'Bloqueados',
                value: fmtCop(kpis.bloqueadoMonto),
                valueTitle: fmtCop(kpis.bloqueadoMonto),
                color: '#f06548',
                subtitle: kpis.bloqueados ? `${kpis.bloqueados} sin acceso` : 'Ninguno',
              },
              {
                icon: 'ri-team-fill',
                label: 'Total renters',
                value: kpis.total,
                color: '#3577f1',
                subtitle: kpis.total === 1 ? '1 estilista' : `${kpis.total} estilistas`,
              },
            ].map((k, i) => (
              <div key={i} style={{ flex: '0 0 auto', width: 210, scrollSnapAlign: 'start' }}>
                <KpiCard {...k} />
              </div>
            ))}
          </div>

          {/* Settings */}
          <Card className="mb-4">
            <CardBody>
              <h6 className="mb-3 d-flex align-items-center gap-2">
                <i className="ri-settings-3-line text-primary"></i> Configuración
              </h6>
              <Row className="g-3">
                {/* Tile: Coworking activo */}
                <Col md={6}>
                  <label
                    htmlFor="cr-enabled"
                    className="d-flex align-items-center gap-3 p-3 rounded h-100 mb-0"
                    style={{
                      background: enabledDraft ? '#eafaf4' : '#f6f8fa',
                      border: `1px solid ${enabledDraft ? '#b6ecd9' : '#e9ebec'}`,
                      cursor: 'pointer',
                      transition: 'background .15s, border-color .15s',
                    }}
                  >
                    <div
                      className="flex-shrink-0 d-flex align-items-center justify-content-center"
                      style={{ width: 44, height: 44, borderRadius: 12, background: enabledDraft ? '#0ab39c' : '#adb5bd', color: '#fff' }}
                    >
                      <i className="ri-store-2-line" style={{ fontSize: 20 }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">Coworking activo</div>
                      <small className="text-muted">
                        {enabledDraft ? 'Puedes cobrar a los estilistas renter.' : 'Desactivado — no se cobra a nadie.'}
                      </small>
                    </div>
                    <div className="form-check form-switch m-0" style={{ minHeight: 'auto' }}>
                      <Input
                        type="switch"
                        id="cr-enabled"
                        checked={enabledDraft}
                        onChange={(e) => setEnabledDraft(e.target.checked)}
                        style={{ cursor: 'pointer', width: '2.6em', height: '1.3em' }}
                      />
                    </div>
                  </label>
                </Col>

                {/* Tile: Días de gracia */}
                <Col md={6}>
                  <div
                    className="d-flex align-items-center gap-3 p-3 rounded h-100"
                    style={{ background: '#fff8ec', border: '1px solid #ffe6bf' }}
                  >
                    <div
                      className="flex-shrink-0 d-flex align-items-center justify-content-center"
                      style={{ width: 44, height: 44, borderRadius: 12, background: '#f7b84b', color: '#fff' }}
                    >
                      <i className="ri-shield-keyhole-line" style={{ fontSize: 20 }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">Días de gracia antes de bloquear</div>
                      <small className="text-muted">
                        Tras un pago fallido, espera <strong>{graceDraft}</strong> día{graceDraft === 1 ? '' : 's'} antes de suspender el acceso.
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                      <Button
                        color="light"
                        size="sm"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setGraceDraft(Math.max(0, graceDraft - 1))}
                        disabled={graceDraft <= 0}
                        title="Menos días"
                      >
                        <i className="ri-subtract-line"></i>
                      </Button>
                      <div className="text-center fw-bold" style={{ width: 34, fontSize: 18 }}>{graceDraft}</div>
                      <Button
                        color="light"
                        size="sm"
                        className="rounded-circle p-0 d-flex align-items-center justify-content-center"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setGraceDraft(Math.min(30, graceDraft + 1))}
                        disabled={graceDraft >= 30}
                        title="Más días"
                      >
                        <i className="ri-add-line"></i>
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
              <div className="mt-3">
                <Button color="primary" size="sm" onClick={onSaveSettings} disabled={savingSettings}>
                  {savingSettings ? <Spinner size="sm" /> : <><i className="ri-save-line me-1"></i> Guardar configuración</>}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Lista de renters */}
          <Card>
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <i className="ri-user-star-line"></i> Estilistas en coworking
                </h6>
                <div className="d-flex gap-2">
                  <Button color="info" size="sm" outline onClick={openRefundsModal} title="Personas con cobros que toca devolver (dobles cobros / días bloqueados)">
                    <i className="ri-arrow-go-back-line me-1"></i> Devoluciones
                  </Button>
                  <Button color="success" size="sm" onClick={openAddModal} disabled={!status?.chair_rental_enabled}>
                    <i className="ri-user-add-line me-1"></i> Agregar estilista
                  </Button>
                </div>
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
                            <Button size="sm" color="light" className="me-1" onClick={() => openCalendar(r)} title="Calendario de cobros (pausar / ver días pagados)">
                              <i className="ri-calendar-2-line"></i>
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
                      {cardMode === 'inline' && setupIntent ? (
                        <div className="mb-2">
                          <div className="fw-medium fs-13 mb-2">
                            <i className="ri-bank-card-line me-1"></i> Ingresa la tarjeta del estilista
                          </div>
                          <Elements
                            stripe={setupIntent.stripePromise}
                            options={{ clientSecret: setupIntent.clientSecret, appearance: { theme: 'stripe' } }}
                          >
                            <InlineCardForm
                              onSuccess={onInlineCardSuccess}
                              onCancel={() => { setCardMode('idle'); setSetupIntent(null); }}
                            />
                          </Elements>
                          <small className="text-muted d-block mt-1">
                            Se guarda al instante y activa la suscripción diaria. No redirige a ninguna página.
                          </small>
                        </div>
                      ) : detail.default_card ? (
                        <div className="mb-2">
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <i className={`${cardBrandIcon(detail.default_card.brand)} text-primary`} style={{ fontSize: 18 }}></i>
                            <span>{detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}</span>
                            <small className="text-muted">
                              exp {String(detail.default_card.exp_month).padStart(2, '0')}/{String(detail.default_card.exp_year).slice(-2)}
                            </small>
                            {detail.card_status && (
                              detail.card_status.status === 'activa' ? (
                                <Badge color="success" title="El último cobro a esta tarjeta fue exitoso">Activa</Badge>
                              ) : detail.card_status.status === 'sin_fondos' ? (
                                <Badge color="warning" title={detail.card_status.reason || 'Fondos insuficientes en el último cobro'}>Sin fondos</Badge>
                              ) : (
                                <Badge color="danger" title={detail.card_status.reason || 'El último cobro fue rechazado'}>Rechazada</Badge>
                              )
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-3 mt-1">
                            <Button
                              color="link"
                              size="sm"
                              className="p-0"
                              onClick={startInlineCard}
                              disabled={setupBusy}
                              title="Cambiar la tarjeta aquí mismo"
                            >
                              {setupBusy ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i>Cambiar aquí</>}
                            </Button>
                            <Button
                              color="link"
                              size="sm"
                              className="p-0 text-muted"
                              onClick={onLinkCardFromDetail}
                              disabled={linkingCard}
                              title="Enviar enlace al estilista para que actualice la tarjeta"
                            >
                              {linkingCard ? <Spinner size="sm" /> : <><i className="ri-links-line me-1"></i>Enviar enlace</>}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <div className="text-warning mb-2">
                            <i className="ri-error-warning-line me-1"></i> Sin tarjeta guardada
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <Button
                              color="primary"
                              size="sm"
                              onClick={startInlineCard}
                              disabled={setupBusy}
                              title="Digita la tarjeta del estilista aquí mismo"
                            >
                              {setupBusy ? <Spinner size="sm" /> : <><i className="ri-bank-card-line me-1"></i> Vincular tarjeta aquí</>}
                            </Button>
                            <Button
                              color="primary"
                              size="sm"
                              outline
                              onClick={onLinkCardFromDetail}
                              disabled={linkingCard}
                              title="Enviar un enlace al estilista para que guarde su tarjeta"
                            >
                              {linkingCard ? <Spinner size="sm" /> : <><i className="ri-links-line me-1"></i> Enviar enlace</>}
                            </Button>
                          </div>
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
                      {detail.invoices
                        .slice(invoicePage * INVOICES_PER_PAGE, invoicePage * INVOICES_PER_PAGE + INVOICES_PER_PAGE)
                        .map((i) => (
                        <tr key={i.id}>
                          <td className="fs-13">{fmtUnixDate(i.created, true)}</td>
                          <td className="fs-13">{i.description || '—'}</td>
                          <td className="text-end fw-medium">{fmtStripeAmount(i.amount_paid || i.amount_due, i.currency)}</td>
                          <td>
                            {i.refunded
                              ? <Badge color="info" title="Cobro reembolsado a la tarjeta">Reembolsado</Badge>
                              : i.refunded_cash
                              ? <Badge color="info" title="Cobro duplicado reembolsado en efectivo">Reembolsado</Badge>
                              : invoiceStatusBadge(i.status)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {i.hosted_invoice_url && (
                                <a href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary" title="Ver recibo">
                                  <i className="ri-external-link-line"></i>
                                </a>
                              )}
                              {!i.refunded && !i.refunded_cash && i.status === 'paid' && (i.amount_paid || 0) > 0 && (
                                <Button
                                  color="link"
                                  size="sm"
                                  className="p-0 text-info"
                                  title="Reembolsar este cobro a la tarjeta"
                                  onClick={() => onRefundInvoice(i)}
                                >
                                  <i className="ri-arrow-go-back-line"></i>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.invoices.length > INVOICES_PER_PAGE && (
                    <div className="d-flex align-items-center justify-content-between mt-2">
                      <small className="text-muted">
                        {invoicePage * INVOICES_PER_PAGE + 1}–
                        {Math.min((invoicePage + 1) * INVOICES_PER_PAGE, detail.invoices.length)} de {detail.invoices.length}
                      </small>
                      <div className="d-flex gap-1">
                        <Button
                          size="sm"
                          color="light"
                          disabled={invoicePage === 0}
                          onClick={() => setInvoicePage((p) => Math.max(0, p - 1))}
                        >
                          <i className="ri-arrow-left-s-line"></i>
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          disabled={(invoicePage + 1) * INVOICES_PER_PAGE >= detail.invoices.length}
                          onClick={() => setInvoicePage((p) => p + 1)}
                        >
                          <i className="ri-arrow-right-s-line"></i>
                        </Button>
                      </div>
                    </div>
                  )}
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

      {/* ========= Modal Devoluciones pendientes ========= */}
      <Modal isOpen={refundsOpen} toggle={() => setRefundsOpen(!refundsOpen)} size="lg" centered>
        <ModalHeader toggle={() => setRefundsOpen(false)}>
          <i className="ri-arrow-go-back-line me-2"></i> Devoluciones pendientes
        </ModalHeader>
        <ModalBody className="p-4">
          {refundsLoading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : !refundsData || refundsData.renters.length === 0 ? (
            <div className="text-center py-5">
              <i className="ri-checkbox-circle-line text-success" style={{ fontSize: 48 }}></i>
              <p className="text-muted mt-3 mb-0">No hay devoluciones pendientes.<br/><small>Ningún doble cobro ni día bloqueado sin reembolsar (últimos 60 días).</small></p>
            </div>
          ) : (
            <>
              <Alert color="warning" className="d-flex align-items-center gap-2">
                <i className="ri-error-warning-line fs-18"></i>
                <span>
                  Hay <strong>{refundsData.renters.length}</strong> estilista(s) con cobros por devolver —
                  total <strong>{fmtCop(refundsData.total_cop)}</strong>. Llámalos para avisarles y devuelve desde aquí.
                </span>
              </Alert>
              {refundsData.renters.map((p) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Estilista';
                const digits = (p.phone || '').replace(/\D/g, '');
                const intl = digits.length === 10 ? `57${digits}` : digits;
                return (
                  <Card key={p.id} className="border mb-3">
                    <CardBody className="p-3">
                      <div className="d-flex align-items-center gap-3 flex-wrap mb-2">
                        <Avatar first={p.first_name || undefined} last={p.last_name || undefined} id={p.id} size={42} />
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{name}</div>
                          <small className="text-muted">{p.phone || 'Sin teléfono'}</small>
                        </div>
                        <div className="text-end me-2">
                          <div className="fw-semibold text-info">{fmtCop(p.total_cop)}</div>
                          <small className="text-muted">{p.items.length} cobro(s)</small>
                        </div>
                        {digits && (
                          <div className="d-flex gap-2">
                            <a href={`tel:+${intl}`} className="btn btn-sm btn-primary" title={`Llamar a ${name}`}>
                              <i className="ri-phone-line"></i>
                            </a>
                            <a
                              href={`https://wa.me/${intl}?text=${encodeURIComponent(`Hola ${p.first_name || ''}, te escribo del salón: tienes ${fmtCop(p.total_cop)} a favor por cobros de arriendo que vamos a devolverte a tu tarjeta.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-success"
                              title={`WhatsApp a ${name}`}
                            >
                              <i className="ri-whatsapp-line"></i>
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                          <tbody>
                            {p.items.map((it) => (
                              <tr key={it.invoice_id}>
                                <td className="fs-13" style={{ width: 110 }}>{it.day}</td>
                                <td className="fs-13">
                                  {it.reason === 'blocked_day'
                                    ? <Badge color="primary" pill style={{ background: '#6f42c1' }}>Día bloqueado</Badge>
                                    : <Badge color="danger" pill>Doble cobro</Badge>}
                                </td>
                                <td className="text-end fw-medium" style={{ width: 120 }}>{fmtCop(it.amount_cop)}</td>
                                <td className="text-end" style={{ width: 130 }}>
                                  <Button
                                    color="info"
                                    size="sm"
                                    outline
                                    disabled={!!refundingId}
                                    onClick={() => onRefundPendingItem(p.id, name, it)}
                                  >
                                    {refundingId === it.invoice_id
                                      ? <Spinner size="sm" />
                                      : <><i className="ri-arrow-go-back-line me-1"></i>Devolver</>}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setRefundsOpen(false)}>Cerrar</Button>
        </ModalFooter>
      </Modal>

      {/* ========= Modal Calendario ========= */}
      <Modal isOpen={calOpen} toggle={() => setCalOpen(!calOpen)} size="lg" centered>
        <ModalHeader toggle={() => setCalOpen(false)}>
          <i className="ri-calendar-2-line me-2"></i> Calendario de cobros
        </ModalHeader>
        <ModalBody className="p-4">
          {calRenter && (
            <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
              <Avatar first={calRenter.first_name} last={calRenter.last_name} id={calRenter.id} size={48} />
              <div className="flex-grow-1">
                <h5 className="mb-0">{[calRenter.first_name, calRenter.last_name].filter(Boolean).join(' ')}</h5>
                <small className="text-muted">
                  Tarifa diaria: <strong>{fmtCop(calData?.daily_cop)}</strong>
                  {calData?.monthly_rent_cop ? <> · Mensualidad {fmtCop(calData.monthly_rent_cop)}</> : null}
                </small>
              </div>
            </div>
          )}

          {/* Barra de estado + pausar/reanudar */}
          {calData?.subscription ? (
            <div
              className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 p-3 rounded"
              style={{ background: calData.subscription.paused ? '#fff4d6' : '#eafaf4' }}
            >
              <div className="d-flex align-items-center gap-2">
                {calData.subscription.paused ? (
                  <>
                    <i className="ri-pause-circle-fill text-warning fs-22"></i>
                    <div>
                      <div className="fw-semibold">Cobro automático en pausa</div>
                      <small className="text-muted">No se cobra la tarifa diaria. Cobra días sueltos abajo.</small>
                    </div>
                  </>
                ) : (
                  <>
                    <i className="ri-play-circle-fill text-success fs-22"></i>
                    <div>
                      <div className="fw-semibold">Cobro automático activo</div>
                      <small className="text-muted">
                        Stripe cobra la tarifa diaria cada día.
                        {calData.subscription.current_period_end
                          ? <> Próximo: {fmtUnixDate(calData.subscription.current_period_end)}</>
                          : null}
                      </small>
                    </div>
                  </>
                )}
              </div>
              <Button
                size="sm"
                color={calData.subscription.paused ? 'success' : 'warning'}
                onClick={onTogglePause}
                disabled={calBusy}
              >
                {calBusy ? <Spinner size="sm" /> : calData.subscription.paused
                  ? <><i className="ri-play-line me-1"></i> Reanudar cobro</>
                  : <><i className="ri-pause-line me-1"></i> Pausar cobro</>}
              </Button>
            </div>
          ) : !calLoading && calData ? (
            <Alert color="light" className="d-flex align-items-center gap-2 mb-3">
              <i className="ri-information-line text-muted"></i>
              <span>Este estilista aún no tiene una suscripción activa. Guarda su tarjeta para empezar a cobrar.</span>
            </Alert>
          ) : null}

          {/* Selector de acción: cobrar un día suelto o bloquearlo (no se cobra) */}
          <div className="d-flex align-items-center justify-content-center mb-3">
            <div className="d-flex gap-1 p-1 bg-light rounded-pill">
              <Button
                color={calMode === 'charge' ? 'success' : 'light'}
                size="sm"
                className="rounded-pill px-3"
                onClick={() => setCalMode('charge')}
                disabled={calBusy}
              >
                <i className="ri-money-dollar-circle-line me-1"></i> Cobrar día
              </Button>
              <Button
                color={calMode === 'block' ? 'primary' : 'light'}
                size="sm"
                className="rounded-pill px-3"
                onClick={() => setCalMode('block')}
                disabled={calBusy}
                style={calMode === 'block' ? { background: '#6f42c1', borderColor: '#6f42c1' } : undefined}
              >
                <i className="ri-lock-line me-1"></i> Bloquear día
              </Button>
            </div>
          </div>

          {/* Política de días bloqueados (solo visible en modo bloquear) */}
          {calMode === 'block' && calData && (
            <div
              className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 px-3 py-2 rounded"
              style={{ background: '#f3f0fb', border: '1px solid #d9cef2' }}
            >
              <div>
                <div className="fw-semibold" style={{ fontSize: 13, color: '#6f42c1' }}>
                  <i className="ri-scales-3-line me-1"></i>
                  {calData.readjust_blocked ? 'Reajustar: paga el mes completo' : 'Saltar: el día bloqueado se descuenta'}
                </div>
                <small className="text-muted">
                  {calData.readjust_blocked
                    ? 'Los días bloqueados NO se reembolsan — el cobro diario sigue corriendo.'
                    : 'Los días bloqueados se reembolsan automáticamente — el renter paga menos ese mes.'}
                </small>
              </div>
              <div className="form-check form-switch mb-0">
                <Input
                  type="switch"
                  role="switch"
                  id="readjust-policy-switch"
                  checked={!!calData.readjust_blocked}
                  disabled={calBusy}
                  onChange={onToggleReadjust}
                />
                <Label htmlFor="readjust-policy-switch" className="form-check-label" style={{ fontSize: 12 }}>
                  Reajustar
                </Label>
              </div>
            </div>
          )}

          {/* Navegación de mes */}
          <div className="d-flex align-items-center justify-content-between mb-2">
            <Button color="light" size="sm" onClick={() => gotoMonth(-1)} disabled={calLoading || calBusy}>
              <i className="ri-arrow-left-s-line"></i>
            </Button>
            <h6 className="mb-0 fw-semibold">{monthLabelEs(calMonth)}</h6>
            <Button
              color="light"
              size="sm"
              onClick={() => gotoMonth(1)}
              disabled={calLoading || calBusy || calMonth >= thisMonthYm()}
              title={calMonth >= thisMonthYm() ? 'No puedes avanzar a meses futuros' : ''}
            >
              <i className="ri-arrow-right-s-line"></i>
            </Button>
          </div>

          {calLoading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <>
              {/* Cabecera días de la semana */}
              <div className="d-grid mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {WEEKDAYS_ES.map((w) => (
                  <div key={w} className="text-center text-muted fw-medium" style={{ fontSize: 11 }}>{w}</div>
                ))}
              </div>
              {/* Grid de días */}
              <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                {buildMonthGrid(calMonth).map((cell, idx) => {
                  if (!cell) return <div key={`e${idx}`} />;
                  const day = Number(cell.slice(-2));
                  const info = calData?.days[cell];
                  const pal = dayPalette(info?.status);
                  const isToday = cell === todayKey();
                  const isFuture = cell > todayKey();
                  const isPaid = info?.status === 'paid';
                  const isBlocked = info?.status === 'blocked';
                  const blockMode = calMode === 'block';
                  // En modo "cobrar": cualquier día no pagado y no bloqueado (con tarjeta).
                  // En modo "bloquear": cualquier día no pagado (bloquear/desbloquear), sin
                  // requerir tarjeta — el bloqueo solo evita el cobro.
                  const clickable = blockMode
                    ? (!isPaid && !calBusy)
                    : (!isPaid && !isBlocked && !calBusy && !!calData?.has_customer);
                  return (
                    <div
                      key={cell}
                      onClick={clickable ? () => (blockMode ? onToggleBlockDay(cell) : onChargeDay(cell)) : undefined}
                      title={
                        isBlocked
                          ? `${cell} · Bloqueado (no se cobra)${info?.refunded ? ' · cobro reembolsado a la tarjeta' : ''}${blockMode ? ' · toca para desbloquear' : ''}`
                          : blockMode
                            ? `${cell} · toca para bloquear (no se cobrará)`
                            : info
                              ? `${cell} · ${info.status === 'paid' ? 'Pagado' : info.status === 'refunded' ? 'Reembolsado' : info.status === 'failed' ? 'Falló' : info.status === 'void' ? 'Anulado' : 'Pendiente'} ${fmtCop(info.amount_cop)}`
                              : `${cell} · cobrar este día${isFuture ? ' (futuro)' : ''}`
                      }
                      style={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        borderRadius: 10,
                        background: isFuture && !info ? '#fbfcfd' : pal.bg,
                        border: isToday
                          ? '2px solid #3577f1'
                          : `1.5px ${isFuture && !info ? 'dashed' : 'solid'} ${pal.border}`,
                        color: pal.color,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: clickable ? 'pointer' : 'default',
                        opacity: isFuture && !info ? 0.85 : 1,
                        transition: 'transform .1s, box-shadow .1s',
                      }}
                      onMouseEnter={clickable ? (e) => { const t = e.currentTarget as HTMLDivElement; t.style.boxShadow = '0 2px 8px rgba(0,0,0,.12)'; t.style.transform = 'translateY(-1px)'; } : undefined}
                      onMouseLeave={clickable ? (e) => { const t = e.currentTarget as HTMLDivElement; t.style.boxShadow = 'none'; t.style.transform = 'none'; } : undefined}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1 }}>{day}</span>
                      {info?.status === 'paid' && <i className="ri-check-line" style={{ fontSize: 13 }}></i>}
                      {info?.status === 'refunded' && <i className="ri-arrow-go-back-line" style={{ fontSize: 12 }}></i>}
                      {info?.status === 'failed' && <i className="ri-close-line" style={{ fontSize: 13 }}></i>}
                      {info?.status === 'open' && <i className="ri-time-line" style={{ fontSize: 12 }}></i>}
                      {isBlocked && <i className={info?.refunded ? 'ri-arrow-go-back-line' : 'ri-lock-line'} style={{ fontSize: 12 }}></i>}
                      {!info && clickable && <i className={blockMode ? 'ri-lock-line' : 'ri-add-line'} style={{ fontSize: 12, opacity: .55 }}></i>}
                    </div>
                  );
                })}
              </div>

              {/* Resumen del mes */}
              <Row className="g-2 mt-3">
                <Col xs={6} md={4}>
                  <div className="p-2 rounded text-center" style={{ background: '#eafaf4' }}>
                    <div className="fw-semibold text-success">{calSummary.paidDays}</div>
                    <small className="text-muted">días pagados</small>
                  </div>
                </Col>
                <Col xs={6} md={4}>
                  <div className="p-2 rounded text-center" style={{ background: '#f6f8fa' }}>
                    <div className="fw-semibold">{fmtCop(calSummary.paidTotal)}</div>
                    <small className="text-muted">cobrado el mes</small>
                  </div>
                </Col>
                <Col xs={12} md={4}>
                  <div className="p-2 rounded text-center" style={{ background: calSummary.failedDays ? '#ffe3df' : '#f6f8fa' }}>
                    <div className={`fw-semibold ${calSummary.failedDays ? 'text-danger' : ''}`}>{calSummary.failedDays}</div>
                    <small className="text-muted">días fallidos</small>
                  </div>
                </Col>
              </Row>

              {/* Leyenda */}
              <div className="d-flex flex-wrap gap-3 mt-3 justify-content-center">
                {[
                  { c: dayPalette('paid'), t: 'Pagado' },
                  { c: dayPalette('failed'), t: 'Falló' },
                  { c: dayPalette('open'), t: 'Pendiente' },
                  { c: dayPalette('blocked'), t: 'Bloqueado' },
                  { c: dayPalette('refunded'), t: 'Reembolsado' },
                  { c: dayPalette(undefined), t: 'Sin cobro' },
                ].map((l) => (
                  <div key={l.t} className="d-flex align-items-center gap-1">
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: l.c.bg, border: `1.5px solid ${l.c.border}`, display: 'inline-block' }}></span>
                    <small className="text-muted">{l.t}</small>
                  </div>
                ))}
              </div>
              <p className="text-muted text-center fs-12 mt-2 mb-0">
                <i className="ri-information-line me-1"></i>
                {calMode === 'block'
                  ? calData?.readjust_blocked
                    ? 'Toca un día para bloquearlo. Con la política "reajustar" el día NO se reembolsa: el renter paga el mes completo.'
                    : 'Toca un día para bloquearlo: no se cobrará. Si la suscripción alcanza a cobrarlo, se reembolsa automáticamente.'
                  : 'Toca un día sin cobro para cobrar la tarifa diaria manualmente.'}
              </p>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setCalOpen(false)}>Cerrar</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ChairRentalTab;
