// Coworking (arriendo de cupos) — módulo COMPLETO para la interfaz nueva /v2.
// Porta toda la funcionalidad del panel viejo (ChairRentalTab.tsx) con el diseño
// del sistema nuevo: tokens T.*, componentes ui.tsx y modales propios (sin reactstrap).
//
// Endpoints y payloads EXACTOS del backend chair-rentals (mismos que el panel viejo):
//   status · income-summary · income-report · pending-refunds · connect · settings ·
//   eligible-staff · renters (list/add/get/update/delete) · invite · payment-link ·
//   setup-link · setup-intent · confirm-card · charge · refund · calendar ·
//   charge-day · toggle-block-day · mark-day-paid · unmark-day-paid · readjust-policy ·
//   pause · resume.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api } from "../../../services/api";
import { T, R, FONT, MONO, fmtCOP, colorFor, initials } from "../theme";
import { Loading, Empty, Mono, Avatar, Kpi, KpiGrid, Panel, Toggle } from "../components/ui";

// ── Cache de Stripe.js por (publishable key + connected account) ──────────
const stripeCache: Record<string, Promise<Stripe | null>> = {};
const getStripe = (pk: string, account: string | null): Promise<Stripe | null> => {
  const key = `${pk}::${account || ""}`;
  if (!stripeCache[key]) {
    stripeCache[key] = loadStripe(pk, account ? { stripeAccount: account } : undefined);
  }
  return stripeCache[key];
};

// ── Tipos (idénticos al panel viejo) ──────────────────────────────────────
type Renter = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  monthly_rent_cop: string | number | null;
  rental_status: "active" | "past_due" | "blocked" | null;
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
  direct_mode?: boolean;
};

type RenterDetail = {
  renter: {
    id: string;
    first_name: string;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    monthly_rent_cop: string | number | null;
    rental_status: Renter["rental_status"];
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
  card_status: { status: "activa" | "sin_fondos" | "rechazada"; reason: string | null } | null;
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
  day: string;
  reason: "double_charge" | "blocked_day" | string;
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

type IncomeReportCharge = {
  renter_id: string;
  renter_name: string;
  date: string;
  ts: number;
  amount_cop: number;
  refunded_cop: number;
  net_cop: number;
  type: "arriendo" | "extra" | string;
  status: "paid" | "refunded" | string;
  id: string;
  url: string | null;
};

type IncomeReportResp = {
  from?: string;
  to?: string;
  month: string;
  gross_cop: number;
  refunded_cop: number;
  net_cop: number;
  count: number;
  charges: IncomeReportCharge[];
  by_person: Array<{
    renter_id: string;
    renter_name: string;
    charges: number;
    gross_cop: number;
    refunded_cop: number;
    net_cop: number;
  }>;
};

type CalendarDay = {
  status: "paid" | "paid_manual" | "open" | "failed" | "void" | "blocked" | "refunded" | string;
  refunded?: boolean;
  manual?: boolean;
  note?: string;
  amount_cop: number;
  currency: string;
  invoice_id: string;
  hosted_invoice_url: string | null;
};

type CalendarResp = {
  month: string;
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

type IncomeSummary = { month: string; gross_cop: number; refunded_cop: number; net_cop: number };

// ── Helpers de formato ─────────────────────────────────────────────────────
const fmtStripeAmount = (cents: number, currency: string) => {
  const v = (cents || 0) / 100;
  return v.toLocaleString("es-CO", {
    style: "currency",
    currency: (currency || "cop").toUpperCase(),
    maximumFractionDigits: 0,
  });
};

const fmtUnixDate = (ts?: number | null, withTime = false) => {
  if (!ts) return "—";
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  return new Date(ts * 1000).toLocaleString("es-CO", opts);
};

const nameOfRenter = (r: { first_name?: string | null; last_name?: string | null; email?: string | null }) =>
  [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Estilista";

// ── Helpers de calendario ──────────────────────────────────────────────────
const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const monthLabelEs = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const thisMonthYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const buildMonthGrid = (ym: string): (string | null)[] => {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  let startOffset = first.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// ── Paletas de color por token (light/dark) ────────────────────────────────
const dayPalette = (status?: string): { bg: string; color: string; border: string } => {
  switch (status) {
    case "paid": return { bg: T.greenBg, color: T.greenDark, border: T.greenBorder };
    case "paid_manual": return { bg: T.greenBg2, color: T.greenDark, border: T.greenBorder };
    case "failed": return { bg: T.redBg, color: T.red, border: T.redBorder };
    case "open": return { bg: T.amberBg, color: T.amber, border: T.amber };
    case "void": return { bg: T.surface3, color: T.muted, border: T.border };
    case "blocked": return { bg: T.purpleBg, color: T.purple, border: T.purpleBorder };
    case "refunded": return { bg: T.purpleBg2, color: T.purple2, border: T.purpleBorder };
    default: return { bg: T.surface, color: T.muted, border: T.border };
  }
};

const renterTone = (s: Renter["rental_status"]) =>
  s === "active" ? { l: "Al día", c: T.green, bg: T.greenBg, icon: "ri-checkbox-circle-fill" }
  : s === "past_due" ? { l: "En mora", c: T.amber, bg: T.amberBg, icon: "ri-error-warning-fill" }
  : s === "blocked" ? { l: "Bloqueado", c: T.red, bg: T.redBg, icon: "ri-forbid-fill" }
  : { l: "Pendiente", c: T.muted, bg: T.surface3, icon: "ri-time-line" };

const invoiceTone = (s: string) =>
  s === "paid" ? { l: "Pagada", c: T.green, bg: T.greenBg }
  : s === "open" ? { l: "Abierta", c: T.amber, bg: T.amberBg }
  : s === "void" ? { l: "Anulada", c: T.muted, bg: T.surface3 }
  : s === "uncollectible" ? { l: "Incobrable", c: T.red, bg: T.redBg }
  : s === "draft" ? { l: "Borrador", c: T.purple, bg: T.purpleBg2 }
  : { l: s, c: T.muted, bg: T.surface3 };

const cardBrandIcon = (brand?: string) => {
  const b = (brand || "").toLowerCase();
  if (b.includes("visa")) return "ri-visa-line";
  if (b.includes("master")) return "ri-mastercard-line";
  return "ri-bank-card-line";
};

// ── Estilos reutilizables ──────────────────────────────────────────────────
const btnDark: React.CSSProperties = { background: T.ink, color: T.onInk, border: 0, borderRadius: R.md, padding: "10px 15px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "10px 15px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };
const btnGreen: React.CSSProperties = { background: T.green, color: "#fff", border: 0, borderRadius: R.md, padding: "10px 15px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };
const inp: React.CSSProperties = { width: "100%", border: `1px solid ${T.border}`, background: T.surface2, color: T.text, borderRadius: R.md, padding: "9px 11px", fontSize: 13.5, fontFamily: FONT, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: T.muted, display: "block", marginBottom: 5 };

// Botón chico de icono
const IconBtn: React.FC<{ icon: string; title?: string; onClick?: () => void; danger?: boolean; disabled?: boolean }> = ({ icon, title, onClick, danger, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      border: `1px solid ${T.border}`, background: T.surface, color: danger ? T.red : T.muted,
      borderRadius: 9, padding: "6px 9px", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15,
    }}
  >
    <i className={icon} />
  </button>
);

// ── Modal overlay propio (sin reactstrap) ──────────────────────────────────
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: string;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, icon, width = 640, footer, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", fontFamily: FONT }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, width: "100%", maxWidth: width, maxHeight: "88vh", display: "flex", flexDirection: "column", color: T.text, boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${T.border2}` }}>
          {icon && <i className={icon} style={{ fontSize: 18, color: T.muted }} />}
          <span style={{ fontWeight: 800, fontSize: 15.5, flex: 1 }}>{title}</span>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: T.muted, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2 }}>
            <i className="ri-close-line" />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: `1px solid ${T.border2}` }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Formulario de tarjeta embebido (Stripe Elements) ────────────────────────
const InlineCardForm: React.FC<{ onSuccess: (pmId: string | null) => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    if (error) {
      setErr(error.message || "No se pudo guardar la tarjeta.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    const pmId = typeof setupIntent?.payment_method === "string"
      ? setupIntent.payment_method
      : (setupIntent?.payment_method as any)?.id || null;
    onSuccess(pmId);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: R.md, padding: 12, marginBottom: 10 }}>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {err && (
        <div style={{ color: T.red, fontSize: 12.5, marginBottom: 8 }}>
          <i className="ri-error-warning-line" style={{ marginRight: 4 }} />{err}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={!stripe || submitting} style={{ ...btnGreen, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Guardando…" : <><i className="ri-bank-card-line" style={{ marginRight: 5 }} />Guardar tarjeta</>}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting} style={btnGhost}>Cancelar</button>
      </div>
    </form>
  );
};

// ── Paginador simple ────────────────────────────────────────────────────────
const Pager: React.FC<{ page: number; totalPages: number; from: number; to: number; total: number; onPrev: () => void; onNext: () => void }> = ({ page, totalPages, from, to, total, onPrev, onNext }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
    <span style={{ fontSize: 12, color: T.muted }}>{from}–{to} de {total}</span>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <IconBtn icon="ri-arrow-left-s-line" onClick={onPrev} disabled={page <= 1} title="Anterior" />
      <span style={{ fontSize: 12, color: T.muted }}>Pág. {page} / {totalPages}</span>
      <IconBtn icon="ri-arrow-right-s-line" onClick={onNext} disabled={page >= totalPages} title="Siguiente" />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
const Coworking: React.FC<{ tenantId?: string | null }> = () => {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [graceDraft, setGraceDraft] = useState<number>(3);
  const [enabledDraft, setEnabledDraft] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [income, setIncome] = useState<IncomeSummary | null>(null);

  // Paginación lista renters (front)
  const [renterPage, setRenterPage] = useState(1);
  const RENTERS_PER_PAGE = 10;

  // Modal Agregar
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [eligibleStaff, setEligibleStaff] = useState<EligibleStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [addForm, setAddForm] = useState({ first_name: "", last_name: "", email: "", phone: "", monthly_rent_cop: "" });
  const [addBusy, setAddBusy] = useState(false);

  // Modal Detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<RenterDetail | null>(null);
  const [invoicePage, setInvoicePage] = useState(0);
  const INVOICES_PER_PAGE = 10;

  // Modal Cobro ad-hoc
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ amount_cop: "", description: "" });
  const [chargeBusy, setChargeBusy] = useState(false);

  // Modal Calendario
  const [calOpen, setCalOpen] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const [calData, setCalData] = useState<CalendarResp | null>(null);
  const [calRenter, setCalRenter] = useState<Renter | null>(null);
  const [calMonth, setCalMonth] = useState<string>(thisMonthYm());
  const [calBusy, setCalBusy] = useState(false);
  const [calMode, setCalMode] = useState<"charge" | "block" | "paid">("charge");

  // Tarjeta embebida
  const [linkingCard, setLinkingCard] = useState(false);
  const [cardMode, setCardMode] = useState<"idle" | "inline">("idle");
  const [setupIntent, setSetupIntent] = useState<{ clientSecret: string; stripePromise: Promise<Stripe | null> } | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);

  // Reporte
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const currentMonth = todayStr.slice(0, 7);
  const addDays = (key: string, n: number) => {
    const d = new Date(`${key}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString("en-CA");
  };
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<IncomeReportResp | null>(null);
  const [reportFrom, setReportFrom] = useState<string>(`${currentMonth}-01`);
  const [reportTo, setReportTo] = useState<string>(todayStr);
  const [reportRenter, setReportRenter] = useState<string>("");
  const [reportView, setReportView] = useState<"fecha" | "persona">("fecha");
  const [reportPage, setReportPage] = useState(1);
  const REPORT_PAGE_SIZE = 15;

  // Devoluciones pendientes
  const [refundsOpen, setRefundsOpen] = useState(false);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsData, setRefundsData] = useState<PendingRefundsResp | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        api.get<StatusResp>("/chair-rentals/status"),
        api.get<{ renters: Renter[] }>("/chair-rentals/renters"),
      ]);
      setStatus(s.data);
      setRenters(r.data.renters || []);
      setGraceDraft(s.data.grace_days);
      setEnabledDraft(s.data.chair_rental_enabled);
      api.get<IncomeSummary>("/chair-rentals/income-summary")
        .then(({ data }) => setIncome(data))
        .catch(() => {});
    } catch (e: any) {
      console.error("[coworking] load error", e);
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
      if (r.rental_status === "active") { activos++; ingresoMensual += rent; }
      else if (r.rental_status === "past_due") { mora++; moraMonto += rent; }
      else if (r.rental_status === "blocked") { bloqueados++; bloqueadoMonto += rent; }
    }
    const ingresoDiario = Math.round(ingresoMensual / 30);
    return { activos, mora, bloqueados, ingresoMensual, ingresoDiario, moraMonto, bloqueadoMonto, total: renters.length };
  }, [renters]);

  const grace = status?.grace_days ?? 3;
  const daysPastDue = (r: Renter) => {
    if (!r.rental_past_due_since) return 0;
    const raw = Math.floor((Date.now() - new Date(r.rental_past_due_since).getTime()) / 86400000);
    return Math.max(0, raw);
  };

  // Paginación renters
  const rentersTotalPages = Math.max(1, Math.ceil(renters.length / RENTERS_PER_PAGE));
  const renterPageSafe = Math.min(renterPage, rentersTotalPages);
  const rentersPage = useMemo(
    () => renters.slice((renterPageSafe - 1) * RENTERS_PER_PAGE, renterPageSafe * RENTERS_PER_PAGE),
    [renters, renterPageSafe]
  );
  useEffect(() => { setRenterPage(1); }, [renters.length]);

  const onConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await api.post<{ url: string }>("/chair-rentals/connect", {});
      window.location.href = data.url;
    } catch (e: any) {
      const payload = e?.response?.data || {};
      if (payload.action === "enable_platform_connect" && payload.platform_setup_url) {
        await Swal.fire({
          icon: "warning", title: "Activa Connect en Stripe primero",
          html: `<div style="text-align:left"><p>${payload.error}</p></div>`,
          confirmButtonText: "Abrir Stripe Connect", showCancelButton: true, cancelButtonText: "Después",
        }).then((r) => { if (r.isConfirmed) window.open(payload.platform_setup_url, "_blank", "noopener"); });
      } else {
        Swal.fire("Error", payload.error || "No se pudo iniciar el onboarding de Stripe", "error");
      }
      setConnecting(false);
    }
  };

  const onSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.put("/chair-rentals/settings", { chair_rental_enabled: enabledDraft, rental_block_grace_days: graceDraft });
      await loadAll();
      Swal.fire({ icon: "success", text: "Configuración guardada", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo guardar", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const openAddModal = async () => {
    setAddOpen(true);
    setAddMode("existing");
    setSelectedStaffIds([]);
    setStaffSearch("");
    setAddForm({ first_name: "", last_name: "", email: "", phone: "", monthly_rent_cop: "" });
    setStaffLoading(true);
    try {
      const { data } = await api.get<{ staff: EligibleStaff[] }>("/chair-rentals/eligible-staff");
      setEligibleStaff(data.staff || []);
    } catch (e: any) {
      console.error("[coworking] eligible-staff error", e);
      setEligibleStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return eligibleStaff;
    return eligibleStaff.filter((s) => {
      const full = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
      return full.includes(q) || (s.email || "").toLowerCase().includes(q) || (s.phone || "").includes(q);
    });
  }, [eligibleStaff, staffSearch]);

  const toggleStaff = (id: string) =>
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allFilteredSelected = filteredStaff.length > 0 && filteredStaff.every((s) => selectedStaffIds.includes(s.id));

  const toggleSelectAll = () => {
    setSelectedStaffIds((prev) => {
      const visibleIds = filteredStaff.map((s) => s.id);
      if (visibleIds.every((id) => prev.includes(id))) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const submitNewRenter = async (monthly: number) => {
    if (!addForm.first_name || !addForm.email) {
      Swal.fire("Faltan datos", "Nombre y email son obligatorios", "warning");
      return;
    }
    setAddBusy(true);
    try {
      const { data } = await api.post<{ setup_url: string }>("/chair-rentals/renters", { ...addForm, monthly_rent_cop: monthly });
      setAddOpen(false);
      await loadAll();
      await Swal.fire({
        icon: "success", title: "Estilista agregado al coworking",
        html: `Envíale este enlace para que guarde su tarjeta:<br/><br/>
          <a href="${data.setup_url}" target="_blank" rel="noopener">${data.setup_url.slice(0, 60)}…</a>
          <br/><br/>Cuando complete el setup, la suscripción diaria se activa.`,
        confirmButtonText: "Copiar enlace",
      }).then(() => navigator.clipboard?.writeText(data.setup_url));
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo agregar el estilista", "error");
    } finally {
      setAddBusy(false);
    }
  };

  const submitBulkExisting = async (monthly: number) => {
    const ids = [...selectedStaffIds];
    if (ids.length === 0) {
      Swal.fire("Faltan datos", "Selecciona al menos un estilista de la lista", "warning");
      return;
    }
    const byId = new Map(eligibleStaff.map((s) => [s.id, s]));
    const nameOf = (id: string) => {
      const s = byId.get(id);
      return s ? [s.first_name, s.last_name].filter(Boolean).join(" ") : id;
    };
    setAddBusy(true);
    try {
      const added = await Promise.all(
        ids.map(async (id) => {
          try {
            await api.post("/chair-rentals/renters", { user_id: id, monthly_rent_cop: monthly });
            return { id, ok: true as const, error: null as string | null };
          } catch (e: any) {
            return { id, ok: false as const, error: e?.response?.data?.error || "No se pudo agregar" };
          }
        })
      );
      const okIds = added.filter((a) => a.ok).map((a) => a.id);
      const invited = await Promise.all(
        okIds.map(async (id) => {
          try {
            await api.post(`/chair-rentals/renters/${id}/invite`, {});
            return { id, emailed: true as const, error: null as string | null };
          } catch (e: any) {
            return { id, emailed: false as const, error: e?.response?.data?.error || "No se pudo invitar" };
          }
        })
      );
      const invMap = new Map(invited.map((i) => [i.id, i]));
      setAddOpen(false);
      await loadAll();
      const successRows = added.filter((a) => a.ok).map((a) => {
        const inv = invMap.get(a.id);
        const mailIcon = inv?.emailed
          ? '<i class="ri-mail-check-line" style="color:#14a05a"></i> invitado'
          : '<i class="ri-mail-close-line" style="color:#e0892a"></i> sin email';
        return `<li><strong>${nameOf(a.id)}</strong> — ${mailIcon}</li>`;
      });
      const failRows = added.filter((a) => !a.ok).map((a) => `<li><strong>${nameOf(a.id)}</strong> — <span style="color:#d04444">${a.error}</span></li>`);
      await Swal.fire({
        icon: failRows.length ? "warning" : "success",
        title: `${successRows.length} estilista${successRows.length === 1 ? "" : "s"} agregado${successRows.length === 1 ? "" : "s"} al coworking`,
        html: `<div style="text-align:left">
          ${successRows.length ? `<p class="mb-1">Se les envió la invitación de acceso por email para que ingresen y guarden su tarjeta:</p><ul style="padding-left:18px">${successRows.join("")}</ul>` : ""}
          ${failRows.length ? `<p class="mb-1 mt-2" style="color:#d04444">No se pudieron agregar:</p><ul style="padding-left:18px">${failRows.join("")}</ul>` : ""}
        </div>`,
      });
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo agregar el lote", "error");
    } finally {
      setAddBusy(false);
    }
  };

  const onAddSubmit = async () => {
    const monthly = Number(addForm.monthly_rent_cop);
    if (!monthly) {
      Swal.fire("Faltan datos", "El precio mensual es obligatorio", "warning");
      return;
    }
    if (addMode === "existing") await submitBulkExisting(monthly);
    else await submitNewRenter(monthly);
  };

  const onResendLink = async (r: Renter) => {
    try {
      const { data } = await api.post<{ url: string }>(`/chair-rentals/renters/${r.id}/payment-link`, {});
      await Swal.fire({
        icon: "info", title: "Enlace de pago",
        html: `<a href="${data.url}" target="_blank" rel="noopener">${data.url.slice(0, 60)}…</a>`,
        confirmButtonText: "Copiar",
      }).then(() => navigator.clipboard?.writeText(data.url));
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo generar enlace", "error");
    }
  };

  const onInvite = async (r: Renter) => {
    const conf = await Swal.fire({
      icon: "question", title: `Enviar invitación de acceso a ${r.first_name}?`,
      html: `Se enviará un correo a <strong>${r.email}</strong> para que cree su contraseña e ingrese a su espacio de Coworking en Tupelukeria.`,
      showCancelButton: true, confirmButtonText: "Sí, enviar invitación",
    });
    if (!conf.isConfirmed) return;
    try {
      const { data } = await api.post<{ message: string }>(`/chair-rentals/renters/${r.id}/invite`, {});
      Swal.fire("Invitación enviada", data?.message || `Se envió la invitación a ${r.email}`, "success");
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo enviar la invitación", "error");
    }
  };

  const onRemove = async (r: Renter) => {
    const conf = await Swal.fire({
      icon: "warning", title: `Quitar de coworking a ${r.first_name}?`,
      text: "Se cancela la suscripción de inmediato y vuelve a empleado.",
      showCancelButton: true, confirmButtonText: "Sí, quitar",
    });
    if (!conf.isConfirmed) return;
    try {
      await api.delete(`/chair-rentals/renters/${r.id}`, { params: { immediately: 1 } });
      await loadAll();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo quitar", "error");
    }
  };

  const openDetail = async (r: Renter) => {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    setCardMode("idle");
    setSetupIntent(null);
    setInvoicePage(0);
    try {
      const { data } = await api.get<RenterDetail>(`/chair-rentals/renters/${r.id}`);
      setDetail(data);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cargar el detalle", "error");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    try {
      const { data } = await api.get<RenterDetail>(`/chair-rentals/renters/${detail.renter.id}`);
      setDetail(data);
    } catch { /* noop */ }
    await loadAll();
  };

  // Cambiar tarifa mensual (PUT /renters/:id)
  const onChangeRate = async () => {
    if (!detail) return;
    const cur = Number(detail.renter.monthly_rent_cop) || 0;
    const { value } = await Swal.fire({
      title: "Cambiar tarifa mensual",
      input: "number",
      inputLabel: "Nuevo precio mensual (COP)",
      inputValue: String(cur),
      showCancelButton: true,
      confirmButtonText: "Guardar tarifa",
      inputAttributes: { min: "0", step: "1000" },
      inputValidator: (v) => (!v || Number(v) <= 0 ? "Debe ser mayor a 0" : null),
    });
    if (value == null || value === "") return;
    const monthly = Number(value);
    try {
      await api.put(`/chair-rentals/renters/${detail.renter.id}`, { monthly_rent_cop: monthly });
      Swal.fire({ icon: "success", text: "Tarifa actualizada", timer: 1300, showConfirmButton: false });
      await refreshDetail();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo actualizar la tarifa", "error");
    }
  };

  // Pausar / reanudar desde el detalle (POST pause|resume)
  const onTogglePauseDetail = async () => {
    if (!detail?.subscription) return;
    const paused = detail.subscription.status === "paused";
    const conf = await Swal.fire({
      icon: paused ? "question" : "warning",
      title: paused ? "¿Reanudar cobro automático?" : "¿Pausar cobro automático?",
      text: paused ? "Stripe volverá a cobrar la tarifa diaria automáticamente." : "Stripe dejará de cobrar la tarifa diaria.",
      showCancelButton: true, confirmButtonText: paused ? "Sí, reanudar" : "Sí, pausar",
    });
    if (!conf.isConfirmed) return;
    try {
      await api.post(`/chair-rentals/renters/${detail.renter.id}/${paused ? "resume" : "pause"}`, {});
      await refreshDetail();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cambiar el estado", "error");
    }
  };

  // Devoluciones pendientes
  const loadPendingRefunds = async () => {
    setRefundsLoading(true);
    try {
      const { data } = await api.get<PendingRefundsResp>("/chair-rentals/pending-refunds");
      setRefundsData(data);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudieron cargar las devoluciones pendientes", "error");
    } finally {
      setRefundsLoading(false);
    }
  };
  const openRefundsModal = () => { setRefundsOpen(true); loadPendingRefunds(); };

  // Reporte
  const loadIncomeReport = useCallback(async (from: string, to: string) => {
    setReportLoading(true);
    try {
      const { data } = await api.get<IncomeReportResp>("/chair-rentals/income-report", { params: { from, to } });
      setReportData(data);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cargar el reporte de pagos", "error");
    } finally {
      setReportLoading(false);
    }
  }, []);

  const applyReportRange = (from: string, to: string) => {
    if (!from || !to) return;
    const [a, b] = from <= to ? [from, to] : [to, from];
    setReportFrom(a);
    setReportTo(b);
    loadIncomeReport(a, b);
  };

  const openReportModal = () => {
    const from = `${currentMonth}-01`;
    setReportRenter("");
    setReportView("fecha");
    setReportFrom(from);
    setReportTo(todayStr);
    setReportOpen(true);
    loadIncomeReport(from, todayStr);
  };

  const reportCharges = useMemo(() => {
    const all = reportData?.charges || [];
    return reportRenter ? all.filter((c) => c.renter_id === reportRenter) : all;
  }, [reportData, reportRenter]);

  const reportTotals = useMemo(() => {
    let gross = 0, refunded = 0, net = 0;
    const persons = new Map<string, IncomeReportResp["by_person"][number]>();
    for (const c of reportCharges) {
      gross += c.amount_cop; refunded += c.refunded_cop; net += c.net_cop;
      const p = persons.get(c.renter_id) || { renter_id: c.renter_id, renter_name: c.renter_name, charges: 0, gross_cop: 0, refunded_cop: 0, net_cop: 0 };
      p.charges += 1; p.gross_cop += c.amount_cop; p.refunded_cop += c.refunded_cop; p.net_cop += c.net_cop;
      persons.set(c.renter_id, p);
    }
    return { gross_cop: gross, refunded_cop: refunded, net_cop: net, count: reportCharges.length, by_person: Array.from(persons.values()).sort((a, b) => b.net_cop - a.net_cop) };
  }, [reportCharges]);

  const reportTotalPages = Math.max(1, Math.ceil(reportCharges.length / REPORT_PAGE_SIZE));
  const reportPageSafe = Math.min(reportPage, reportTotalPages);
  const reportChargesPage = useMemo(
    () => reportCharges.slice((reportPageSafe - 1) * REPORT_PAGE_SIZE, reportPageSafe * REPORT_PAGE_SIZE),
    [reportCharges, reportPageSafe]
  );
  useEffect(() => { setReportPage(1); }, [reportRenter, reportView, reportData]);

  const exportReportCsv = () => {
    const rows = [["Fecha", "Estilista", "Tipo", "Cobrado_COP", "Reembolsado_COP", "Neto_COP", "Estado", "ID"]];
    for (const c of reportCharges) {
      rows.push([c.date, c.renter_name, c.type, String(c.amount_cop), String(c.refunded_cop), String(c.net_cop), c.status, c.id]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-pagos-coworking-${reportFrom === reportTo ? reportFrom : `${reportFrom}_a_${reportTo}`}${reportRenter ? "-filtrado" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onRefundPendingItem = async (renterId: string, renterName: string, item: PendingRefundItem) => {
    const conf = await Swal.fire({
      icon: "warning", title: `¿Devolver ${fmtCOP(item.amount_cop)}?`,
      html: `A <strong>${renterName}</strong> · día ${item.day} · ${item.reason === "blocked_day" ? "día bloqueado" : "doble cobro"}.<br/>Se devuelve a su tarjeta.`,
      showCancelButton: true, confirmButtonText: "Sí, devolver",
    });
    if (!conf.isConfirmed) return;
    setRefundingId(item.invoice_id);
    try {
      await api.post(`/chair-rentals/renters/${renterId}/refund`, { id: item.invoice_id });
      Swal.fire({ icon: "success", text: "Devolución enviada a la tarjeta", timer: 1300, showConfirmButton: false });
      await loadPendingRefunds();
      await loadAll();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo devolver el cobro", "error");
    } finally {
      setRefundingId(null);
    }
  };

  const onRefundInvoice = async (inv: RenterDetail["invoices"][number]) => {
    if (!detail) return;
    const conf = await Swal.fire({
      icon: "warning", title: `¿Reembolsar ${fmtStripeAmount(inv.amount_paid || inv.amount_due, inv.currency)}?`,
      html: `Se devolverá a la tarjeta del estilista.<br/><small>${inv.description || "Cobro"} · ${fmtUnixDate(inv.created, true)}</small>`,
      showCancelButton: true, confirmButtonText: "Sí, reembolsar",
    });
    if (!conf.isConfirmed) return;
    try {
      await api.post(`/chair-rentals/renters/${detail.renter.id}/refund`, { id: inv.id });
      Swal.fire({ icon: "success", text: "Reembolso enviado a la tarjeta", timer: 1400, showConfirmButton: false });
      await refreshDetail();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo reembolsar el cobro", "error");
    }
  };

  const startInlineCard = async () => {
    if (!detail) return;
    setSetupBusy(true);
    try {
      const { data } = await api.post<{ client_secret: string; publishable_key: string; stripe_account: string | null }>(
        `/chair-rentals/renters/${detail.renter.id}/setup-intent`, {}
      );
      const stripePromise = getStripe(data.publishable_key, data.stripe_account);
      setSetupIntent({ clientSecret: data.client_secret, stripePromise });
      setCardMode("inline");
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo iniciar la captura de tarjeta", "error");
    } finally {
      setSetupBusy(false);
    }
  };

  const onInlineCardSuccess = async (paymentMethodId: string | null) => {
    setCardMode("idle");
    setSetupIntent(null);
    if (detail && paymentMethodId) {
      try {
        await api.post(`/chair-rentals/renters/${detail.renter.id}/confirm-card`, { payment_method: paymentMethodId });
      } catch (e: any) {
        console.warn("[coworking] confirm-card error", e?.response?.data || e?.message);
      }
    }
    await refreshDetail();
    Swal.fire({ icon: "success", title: "Tarjeta vinculada", text: "Quedó guardada como predeterminada y la suscripción diaria usará esta tarjeta.", timer: 2200, showConfirmButton: false });
  };

  const openChargeFromDetail = () => {
    if (!detail) return;
    setChargeForm({ amount_cop: "", description: "" });
    setChargeOpen(true);
  };

  const onLinkCardFromDetail = async () => {
    if (!detail) return;
    const r = detail.renter;
    const updating = !!detail.default_card;
    const endpoint = r.has_subscription
      ? `/chair-rentals/renters/${r.id}/payment-link`
      : `/chair-rentals/renters/${r.id}/setup-link`;
    setLinkingCard(true);
    try {
      const { data } = await api.post<{ setup_url?: string; url?: string }>(endpoint, {});
      const url = data.setup_url || data.url || "";
      setLinkingCard(false);
      await Swal.fire({
        icon: "success",
        title: updating ? "Enlace para actualizar tarjeta" : "Enlace para vincular tarjeta",
        html: `Envíale este enlace a <strong>${nameOfRenter(r)}</strong> para que ${updating ? "actualice" : "guarde"} su tarjeta:<br/><br/>
          <a href="${url}" target="_blank" rel="noopener">${url.slice(0, 60)}…</a>
          <br/><br/>${r.has_subscription ? "La tarjeta nueva se usará en el próximo cobro." : "Cuando complete el setup, la suscripción diaria se activa."}`,
        confirmButtonText: "Copiar enlace",
      }).then(() => navigator.clipboard?.writeText(url));
    } catch (e: any) {
      setLinkingCard(false);
      Swal.fire("Error", e?.response?.data?.error || "No se pudo generar el enlace de tarjeta", "error");
    }
  };

  const onChargeSubmit = async () => {
    if (!detail) return;
    const amount = Number(chargeForm.amount_cop);
    const desc = chargeForm.description.trim();
    if (!amount || amount < 2000) { Swal.fire("Monto inválido", "Mínimo 2.000 COP", "warning"); return; }
    if (!desc) { Swal.fire("Falta concepto", "La descripción del cobro es obligatoria", "warning"); return; }
    const renterName = nameOfRenter(detail.renter);
    const conf = await Swal.fire({
      icon: "question", title: `Cobrar ${fmtCOP(amount)}?`,
      html: `A la tarjeta guardada de <strong>${renterName}</strong>${detail.default_card ? ` (•••• ${detail.default_card.last4})` : ""}.<br/><br/>Concepto: <em>${desc}</em>`,
      showCancelButton: true, confirmButtonText: "Sí, cobrar ahora",
    });
    if (!conf.isConfirmed) return;
    setChargeBusy(true);
    try {
      const { data } = await api.post(`/chair-rentals/renters/${detail.renter.id}/charge`, { amount_cop: amount, description: desc });
      setChargeOpen(false);
      await Swal.fire({
        icon: "success", title: "Cobro exitoso",
        html: `Se cobraron <strong>${fmtCOP(amount)}</strong> a la tarjeta del estilista.<br/><small>${(data as any).payment_intent_id || ""}</small>`,
      });
      try {
        const { data: fresh } = await api.get<RenterDetail>(`/chair-rentals/renters/${detail.renter.id}`);
        setDetail(fresh);
      } catch { /* noop */ }
    } catch (e: any) {
      const payload = e?.response?.data || {};
      Swal.fire({
        icon: "error", title: "No se pudo cobrar",
        html: `${payload.error || "Error desconocido"}${payload.code ? `<br/><small>code: ${payload.code}${payload.decline_code ? " · " + payload.decline_code : ""}</small>` : ""}`,
      });
    } finally {
      setChargeBusy(false);
    }
  };

  // Calendario
  const loadCalendar = useCallback(async (renterId: string, month: string) => {
    setCalLoading(true);
    try {
      const { data } = await api.get<CalendarResp>(`/chair-rentals/renters/${renterId}/calendar`, { params: { month } });
      setCalData(data);
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cargar el calendario", "error");
    } finally {
      setCalLoading(false);
    }
  }, []);

  const openCalendar = async (r: Renter) => {
    const ym = thisMonthYm();
    setCalRenter(r);
    setCalMonth(ym);
    setCalData(null);
    setCalMode("charge");
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
      icon: paused ? "question" : "warning",
      title: paused ? "¿Reanudar cobro automático?" : "¿Pausar cobro automático?",
      text: paused ? "Stripe volverá a cobrar la tarifa diaria automáticamente cada día." : "Stripe dejará de cobrar la tarifa diaria. Podrás cobrar días sueltos manualmente desde el calendario.",
      showCancelButton: true, confirmButtonText: paused ? "Sí, reanudar" : "Sí, pausar",
    });
    if (!conf.isConfirmed) return;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/${paused ? "resume" : "pause"}`, {});
      await loadCalendar(calRenter.id, calMonth);
      await loadAll();
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cambiar el estado", "error");
    } finally {
      setCalBusy(false);
    }
  };

  const onChargeDay = async (dateKey: string) => {
    if (!calRenter || !calData) return;
    const existing = calData.days[dateKey];
    if (existing?.status === "paid") return;
    if (!calData.has_customer) { Swal.fire("Sin tarjeta", "El estilista aún no ha guardado una tarjeta.", "warning"); return; }
    const renterName = nameOfRenter(calRenter);
    const conf = await Swal.fire({
      icon: "question", title: `¿Cobrar ${fmtCOP(calData.daily_cop)}?`,
      html: `Día <strong>${dateKey}</strong> · arriendo de cupo a la tarjeta guardada de <strong>${renterName}</strong>.`,
      showCancelButton: true, confirmButtonText: "Sí, cobrar este día",
    });
    if (!conf.isConfirmed) return;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/charge-day`, { date: dateKey });
      await loadCalendar(calRenter.id, calMonth);
      Swal.fire({ icon: "success", text: "Día cobrado correctamente", timer: 1300, showConfirmButton: false });
    } catch (e: any) {
      const p = e?.response?.data || {};
      Swal.fire({ icon: "error", title: "No se pudo cobrar el día", html: `${p.error || "Error desconocido"}${p.code ? `<br/><small>code: ${p.code}${p.decline_code ? " · " + p.decline_code : ""}</small>` : ""}` });
    } finally {
      setCalBusy(false);
    }
  };

  const onToggleBlockDay = async (dateKey: string) => {
    if (!calRenter || !calData) return;
    const existing = calData.days[dateKey];
    const isBlocked = existing?.status === "blocked";
    if (existing?.status === "paid") { Swal.fire("Día ya cobrado", "Ese día ya tiene un cobro pagado; no se puede bloquear.", "info"); return; }
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/toggle-block-day`, { date: dateKey });
      await loadCalendar(calRenter.id, calMonth);
      Swal.fire({ icon: "success", text: isBlocked ? "Día desbloqueado" : "Día bloqueado (no se cobrará)", timer: 1100, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cambiar el bloqueo del día", "error");
    } finally {
      setCalBusy(false);
    }
  };

  const onMarkDayPaid = async (dateKey: string) => {
    if (!calRenter || !calData) return;
    const existing = calData.days[dateKey];
    if (existing?.status === "paid") { Swal.fire("Día ya cobrado", "Ese día ya tiene un cobro real pagado.", "info"); return; }
    if (existing?.status === "blocked") { Swal.fire("Día bloqueado", "Ese día está bloqueado (no se cobra). Desbloquéalo primero si quieres marcarlo pagado.", "info"); return; }
    if (existing?.status === "paid_manual") {
      const conf = await Swal.fire({ icon: "warning", title: "Quitar pago manual", text: `¿Quitar la marca de pagado del ${dateKey}?`, showCancelButton: true, confirmButtonText: "Sí, quitar" });
      if (!conf.isConfirmed) return;
      setCalBusy(true);
      try {
        await api.post(`/chair-rentals/renters/${calRenter.id}/unmark-day-paid`, { date: dateKey });
        await loadCalendar(calRenter.id, calMonth);
        await loadAll();
      } catch (e: any) {
        Swal.fire("Error", e?.response?.data?.error || "No se pudo quitar la marca", "error");
      } finally {
        setCalBusy(false);
      }
      return;
    }
    const defAmount = calData.daily_cop || 0;
    const { value: formVals } = await Swal.fire({
      title: "Marcar día como pagado",
      html:
        `<div class="text-start">` +
        `<p class="mb-2" style="font-size:13px">Día <b>${dateKey}</b>. Esto <b>no cobra la tarjeta</b>: marca el día como pagado (cobrado en efectivo o por un cobro extra) y anula el intento fallido.</p>` +
        `<label class="form-label mb-1" style="font-size:12px">Monto cobrado (COP)</label>` +
        `<input id="swal-amount" type="number" class="form-control mb-2" value="${defAmount}" min="0" />` +
        `<label class="form-label mb-1" style="font-size:12px">Nota (opcional)</label>` +
        `<input id="swal-note" type="text" class="form-control" placeholder="efectivo, cobro extra, etc." maxlength="200" />` +
        `</div>`,
      showCancelButton: true, confirmButtonText: "Marcar pagado", focusConfirm: false,
      preConfirm: () => {
        const amount = Number((document.getElementById("swal-amount") as HTMLInputElement)?.value);
        const note = (document.getElementById("swal-note") as HTMLInputElement)?.value || "";
        return { amount_cop: amount, note };
      },
    });
    if (!formVals) return;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/mark-day-paid`, { date: dateKey, amount_cop: formVals.amount_cop, note: formVals.note });
      await loadCalendar(calRenter.id, calMonth);
      await loadAll();
      Swal.fire({ icon: "success", text: "Día marcado como pagado", timer: 1300, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo marcar el día", "error");
    } finally {
      setCalBusy(false);
    }
  };

  const onToggleReadjust = async () => {
    if (!calRenter || !calData) return;
    const next = !calData.readjust_blocked;
    setCalBusy(true);
    try {
      await api.post(`/chair-rentals/renters/${calRenter.id}/readjust-policy`, { readjust: next });
      setCalData({ ...calData, readjust_blocked: next });
    } catch (e: any) {
      Swal.fire("Error", e?.response?.data?.error || "No se pudo cambiar la política", "error");
    } finally {
      setCalBusy(false);
    }
  };

  const calSummary = useMemo(() => {
    if (!calData) return { paidDays: 0, paidTotal: 0, failedDays: 0 };
    let paidDays = 0, paidTotal = 0, failedDays = 0;
    for (const k of Object.keys(calData.days)) {
      const d = calData.days[k];
      if (d.status === "paid" || d.status === "paid_manual") { paidDays++; paidTotal += d.amount_cop || 0; }
      else if (d.status === "failed") failedDays++;
    }
    return { paidDays, paidTotal, failedDays };
  }, [calData]);

  const connectedAndReady = !!status?.connected && !!status?.charges_enabled;
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-v2-theme") === "dark";

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <Loading label="Cargando coworking…" />;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-.4px" }}>Coworking · arriendo de cupos</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>
          Cobra a estilistas independientes que usan tus instalaciones. Stripe cobra el equivalente diario.
          Tras <strong>{grace}</strong> día{grace === 1 ? "" : "s"} con pago fallido, se bloquean.
        </div>
      </div>

      {/* Estado de conexión Stripe */}
      {!status?.connected ? (
        <div style={{ background: T.surface, border: `1px solid ${T.purpleBorder}`, borderRadius: R.xxl, padding: 20, marginBottom: 18, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: T.greenBg, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flex: "none" }}>
            <i className="ri-bank-card-2-line" />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Conecta tu cuenta Stripe</div>
            <div style={{ fontSize: 13, color: T.muted, margin: "4px 0 12px" }}>El dinero llega directo a tu cuenta. Tupelukeria solo orquesta el cobro diario.</div>
            <button onClick={onConnect} disabled={connecting} style={{ ...btnDark, opacity: connecting ? 0.6 : 1 }}>
              {connecting ? "Conectando…" : <><i className="ri-link" style={{ marginRight: 5 }} />Conectar Stripe</>}
            </button>
          </div>
        </div>
      ) : !status.charges_enabled ? (
        <div style={{ background: T.amberBg, border: `1px solid ${T.amber}`, borderRadius: R.xl, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <i className="ri-error-warning-line" style={{ fontSize: 20, color: T.amber }} />
          <div style={{ flex: 1, fontSize: 13.5 }}><strong>Onboarding incompleto.</strong> Termina el proceso en Stripe.</div>
          <button onClick={onConnect} disabled={connecting} style={{ background: T.amber, color: "#fff", border: 0, borderRadius: R.md, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {connecting ? "…" : "Continuar"}
          </button>
        </div>
      ) : (
        <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: R.xl, padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <i className="ri-checkbox-circle-fill" style={{ fontSize: 20, color: T.green }} />
          <div style={{ fontSize: 13.5 }}><strong>Stripe conectado.</strong> {status.payouts_enabled ? "Payouts activos." : "Payouts pendientes."}</div>
        </div>
      )}

      {connectedAndReady && (
        <>
          {/* KPIs */}
          <KpiGrid cols={3}>
            <div onClick={openReportModal} role="button" title="Ver reporte de pagos" style={{ cursor: "pointer" }}>
              <Kpi
                icon={<i className="ri-funds-fill" />}
                label="Acumulado mes"
                value={income ? fmtCOP(income.net_cop) : "—"}
                valueColor={T.green}
                sub={income ? (income.refunded_cop > 0 ? `Neto a hoy · −${fmtCOP(income.refunded_cop)} reembolsado` : "Toca para ver el reporte") : "Calculando…"}
              />
            </div>
            <Kpi icon={<i className="ri-money-dollar-circle-fill" />} label="Mensual" value={fmtCOP(kpis.ingresoMensual)} sub={kpis.activos === 1 ? "1 activo" : `${kpis.activos} activos`} />
            <Kpi icon={<i className="ri-calendar-check-fill" />} label="Ingreso al día" value={fmtCOP(kpis.ingresoDiario)} sub="Tarifa diaria total" />
            <Kpi icon={<i className="ri-error-warning-fill" />} label="En mora" value={fmtCOP(kpis.moraMonto)} valueColor={kpis.mora ? T.amber : undefined} sub={kpis.mora ? `${kpis.mora} sin pagar` : "Todo al día"} />
            <Kpi icon={<i className="ri-forbid-fill" />} label="Bloqueados" value={fmtCOP(kpis.bloqueadoMonto)} valueColor={kpis.bloqueados ? T.red : undefined} sub={kpis.bloqueados ? `${kpis.bloqueados} sin acceso` : "Ninguno"} />
            <Kpi icon={<i className="ri-team-fill" />} label="Total renters" value={kpis.total} sub={kpis.total === 1 ? "1 estilista" : `${kpis.total} estilistas`} />
          </KpiGrid>

          {/* Configuración */}
          <Panel title={<><i className="ri-settings-3-line" style={{ marginRight: 6 }} />Configuración</>} style={{ marginBottom: 18 }}>
            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderRadius: R.lg, background: enabledDraft ? T.greenBg : T.surface2, border: `1px solid ${enabledDraft ? T.greenBorder : T.border}` }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: enabledDraft ? T.green : T.dim, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flex: "none" }}>
                  <i className="ri-store-2-line" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Coworking activo</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{enabledDraft ? "Puedes cobrar a los estilistas renter." : "Desactivado — no se cobra a nadie."}</div>
                </div>
                <Toggle on={enabledDraft} onClick={() => setEnabledDraft((v) => !v)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderRadius: R.lg, background: T.amberBg, border: `1px solid ${T.amber}` }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: T.amber, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flex: "none" }}>
                  <i className="ri-shield-keyhole-line" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Días de gracia antes de bloquear</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>Tras un pago fallido, espera <strong>{graceDraft}</strong> día{graceDraft === 1 ? "" : "s"} antes de suspender el acceso.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
                  <IconBtn icon="ri-subtract-line" onClick={() => setGraceDraft(Math.max(0, graceDraft - 1))} disabled={graceDraft <= 0} title="Menos días" />
                  <div style={{ width: 30, textAlign: "center", fontWeight: 800, fontSize: 17 }}>{graceDraft}</div>
                  <IconBtn icon="ri-add-line" onClick={() => setGraceDraft(Math.min(30, graceDraft + 1))} disabled={graceDraft >= 30} title="Más días" />
                </div>
              </div>
            </div>
            <div style={{ padding: "0 18px 18px" }}>
              <button onClick={onSaveSettings} disabled={savingSettings} style={{ ...btnDark, opacity: savingSettings ? 0.6 : 1 }}>
                {savingSettings ? "Guardando…" : <><i className="ri-save-line" style={{ marginRight: 5 }} />Guardar configuración</>}
              </button>
            </div>
          </Panel>

          {/* Lista de renters */}
          <Panel
            title={<><i className="ri-user-star-line" style={{ marginRight: 6 }} />Estilistas en coworking</>}
            right={
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={openRefundsModal} style={btnGhost} title="Personas con cobros que toca devolver">
                  <i className="ri-arrow-go-back-line" style={{ marginRight: 5 }} />Devoluciones
                </button>
                <button onClick={openAddModal} disabled={!status?.chair_rental_enabled} style={{ ...btnGreen, opacity: status?.chair_rental_enabled ? 1 : 0.5 }}>
                  <i className="ri-user-add-line" style={{ marginRight: 5 }} />Agregar estilista
                </button>
              </div>
            }
          >
            {renters.length === 0 ? (
              <Empty icon="🪑" title="Aún no hay estilistas en coworking." hint={!status?.chair_rental_enabled ? "Activa el switch para empezar." : "Usa \"Agregar estilista\"."} />
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.4fr", padding: "11px 20px", fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim, background: T.surface2 }}>
                  <span>ESTILISTA</span><span>CONTACTO</span><span style={{ textAlign: "right" }}>MENSUAL</span><span>ESTADO</span><span style={{ textAlign: "right" }}>ACCIONES</span>
                </div>
                {rentersPage.map((r) => {
                  const name = nameOfRenter(r);
                  const tone = renterTone(r.rental_status);
                  const dpd = daysPastDue(r);
                  return (
                    <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.4fr", alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${T.border3}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Avatar ini={initials(name)} color={colorFor(r.id)} size={36} radius={11} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                          {!r.rental_stripe_subscription_id && (
                            <div style={{ fontSize: 11, color: T.dim }}><i className="ri-time-line" style={{ marginRight: 3 }} />Sin tarjeta guardada</div>
                          )}
                        </div>
                      </div>
                      <div style={{ minWidth: 0, fontSize: 12 }}>
                        <div style={{ color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><i className="ri-mail-line" style={{ marginRight: 4 }} />{r.email}</div>
                        {r.phone && <div style={{ color: T.muted }}><i className="ri-phone-line" style={{ marginRight: 4 }} />{r.phone}</div>}
                      </div>
                      <Mono style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmtCOP(Number(r.monthly_rent_cop) || 0)}</Mono>
                      <div>
                        <span style={{ background: tone.bg, color: tone.c, fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 7, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <i className={tone.icon} style={{ fontSize: 12 }} />{tone.l}
                          {r.rental_status === "past_due" && dpd > 0 ? ` · ${dpd}/${grace}d` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5 }}>
                        <IconBtn icon="ri-eye-line" title="Ver detalle" onClick={() => openDetail(r)} />
                        <IconBtn icon="ri-calendar-2-line" title="Calendario de cobros" onClick={() => openCalendar(r)} />
                        <IconBtn icon="ri-link" title="Enlace de pago" onClick={() => onResendLink(r)} />
                        <IconBtn icon="ri-mail-send-line" title="Enviar invitación de acceso" onClick={() => onInvite(r)} />
                        <IconBtn icon="ri-delete-bin-line" title="Quitar" danger onClick={() => onRemove(r)} />
                      </div>
                    </div>
                  );
                })}
                {rentersTotalPages > 1 && (
                  <div style={{ padding: "0 20px 14px" }}>
                    <Pager
                      page={renterPageSafe} totalPages={rentersTotalPages}
                      from={(renterPageSafe - 1) * RENTERS_PER_PAGE + 1}
                      to={Math.min(renterPageSafe * RENTERS_PER_PAGE, renters.length)}
                      total={renters.length}
                      onPrev={() => setRenterPage((p) => Math.max(1, p - 1))}
                      onNext={() => setRenterPage((p) => Math.min(rentersTotalPages, p + 1))}
                    />
                  </div>
                )}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ═══════════ Modal Agregar ═══════════ */}
      <Modal
        open={addOpen} onClose={() => setAddOpen(false)} width={720}
        title="Agregar estilista al coworking" icon="ri-user-add-line"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} style={btnGhost}>Cancelar</button>
            <button onClick={onAddSubmit} disabled={addBusy} style={{ ...btnDark, opacity: addBusy ? 0.6 : 1 }}>
              {addBusy ? "Procesando…" : addMode === "existing"
                ? <><i className="ri-mail-send-line" style={{ marginRight: 5 }} />Agregar{selectedStaffIds.length ? ` ${selectedStaffIds.length}` : ""} e invitar</>
                : <><i className="ri-send-plane-line" style={{ marginRight: 5 }} />Crear y enviar link</>}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: T.surface2, borderRadius: R.md, padding: 4, width: "fit-content" }}>
          {(["existing", "new"] as const).map((m) => (
            <button key={m} onClick={() => setAddMode(m)} style={{ border: 0, borderRadius: R.sm, padding: "7px 14px", fontWeight: 700, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", background: addMode === m ? T.ink : "transparent", color: addMode === m ? T.onInk : T.muted }}>
              <i className={m === "existing" ? "ri-team-line" : "ri-user-add-line"} style={{ marginRight: 5 }} />
              {m === "existing" ? "Desde mi personal" : "Crear nuevo"}
            </button>
          ))}
        </div>

        {addMode === "existing" ? (
          <>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <i className="ri-search-line" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
              <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Buscar por nombre, email o teléfono…" style={{ ...inp, paddingLeft: 32 }} />
            </div>
            {filteredStaff.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                  Seleccionar todos {staffSearch ? "(filtrados)" : ""}
                </label>
                {selectedStaffIds.length > 0 && (
                  <span style={{ background: T.purpleBg2, color: T.purple, fontWeight: 700, fontSize: 11, padding: "3px 9px", borderRadius: 999 }}>
                    {selectedStaffIds.length} seleccionado{selectedStaffIds.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
            <div style={{ maxHeight: 320, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: R.md }}>
              {staffLoading ? (
                <Loading label="Cargando estilistas…" />
              ) : filteredStaff.length === 0 ? (
                <Empty icon="👥" title={eligibleStaff.length === 0 ? "No hay estilistas elegibles." : "Sin resultados."} hint={eligibleStaff.length === 0 ? "Usa \"Crear nuevo\"." : undefined} />
              ) : (
                filteredStaff.map((s, idx) => {
                  const selected = selectedStaffIds.includes(s.id);
                  const nm = nameOfRenter(s);
                  return (
                    <div key={s.id} onClick={() => toggleStaff(s.id)} style={{ padding: "10px 14px", cursor: "pointer", background: selected ? T.purpleBg : T.surface, borderTop: idx === 0 ? "none" : `1px solid ${T.border3}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleStaff(s.id)} onClick={(e) => e.stopPropagation()} style={{ flex: "none" }} />
                      <Avatar ini={initials(nm)} color={colorFor(s.id)} size={38} radius={11} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{nm}</div>
                        <div style={{ fontSize: 11.5, color: T.muted }}><i className="ri-mail-line" style={{ marginRight: 4 }} />{s.email}{s.phone ? ` · ${s.phone}` : ""}</div>
                      </div>
                      {s.employment_type === "renter" && (
                        <span style={{ background: T.amberBg, color: T.amber, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 999 }}>renter previo</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={lbl}>Precio mensual (igual para todos los seleccionados)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: T.muted, fontWeight: 700 }}>$</span>
                <input type="number" min={0} value={addForm.monthly_rent_cop} onChange={(e) => setAddForm({ ...addForm, monthly_rent_cop: e.target.value })} placeholder="600000" style={inp} />
                <span style={{ color: T.muted, fontWeight: 700 }}>COP</span>
              </div>
              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 5 }}>
                Stripe cobra a cada uno el equivalente diario: <strong>{addForm.monthly_rent_cop ? fmtCOP(Number(addForm.monthly_rent_cop) / 30) : "—"}/día</strong>. Puedes ajustar el precio individual luego en cada detalle.
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={lbl}>Nombre *</label><input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>Apellido</label><input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} style={inp} /></div>
            </div>
            <div><label style={lbl}>Email *</label><input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Teléfono (WhatsApp)</label><input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+57 300 ..." style={inp} /></div>
            <div>
              <label style={lbl}>Precio mensual</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: T.muted, fontWeight: 700 }}>$</span>
                <input type="number" min={0} value={addForm.monthly_rent_cop} onChange={(e) => setAddForm({ ...addForm, monthly_rent_cop: e.target.value })} placeholder="600000" style={inp} />
                <span style={{ color: T.muted, fontWeight: 700 }}>COP</span>
              </div>
              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 5 }}>Cobro diario: <strong>{addForm.monthly_rent_cop ? fmtCOP(Number(addForm.monthly_rent_cop) / 30) : "—"}/día</strong>.</div>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══════════ Modal Detalle ═══════════ */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} width={720} title="Detalle del renter" icon="ri-file-user-line"
        footer={<button onClick={() => setDetailOpen(false)} style={btnGhost}>Cerrar</button>}
      >
        {detailLoading || !detail ? (
          <Loading label="Cargando detalle…" />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 16, borderBottom: `1px solid ${T.border2}`, marginBottom: 16 }}>
              <Avatar ini={initials(nameOfRenter(detail.renter))} color={colorFor(detail.renter.id)} size={52} radius={14} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{nameOfRenter(detail.renter)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  {(() => { const t = renterTone(detail.renter.rental_status); return (
                    <span style={{ background: t.bg, color: t.c, fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 7, display: "inline-flex", alignItems: "center", gap: 4 }}><i className={t.icon} />{t.l}</span>
                  ); })()}
                  <span style={{ fontSize: 12, color: T.muted }}><i className="ri-calendar-line" style={{ marginRight: 4 }} />Renter desde {new Date(detail.renter.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}</span>
                </div>
              </div>
              <button onClick={openChargeFromDetail} disabled={!detail.default_card} style={{ ...btnDark, opacity: detail.default_card ? 1 : 0.5 }} title={!detail.default_card ? "El estilista debe guardar tarjeta primero" : ""}>
                <i className="ri-money-dollar-circle-line" style={{ marginRight: 5 }} />Cobrar extra
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div style={{ background: T.surface2, borderRadius: R.lg, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim, marginBottom: 12 }}><i className="ri-contacts-line" style={{ marginRight: 5 }} />CONTACTO</div>
                <div style={{ fontSize: 13, marginBottom: 8 }}><i className="ri-mail-line" style={{ color: T.muted, marginRight: 7 }} />{detail.renter.email}</div>
                <div style={{ fontSize: 13 }}><i className="ri-phone-line" style={{ color: T.muted, marginRight: 7 }} />{detail.renter.phone || "—"}</div>
              </div>

              <div style={{ background: T.surface2, borderRadius: R.lg, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim, marginBottom: 12 }}><i className="ri-bank-card-line" style={{ marginRight: 5 }} />PAGO Y SUSCRIPCIÓN</div>
                <div style={{ fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: T.muted }}>Mensualidad:</span> <strong>{fmtCOP(Number(detail.renter.monthly_rent_cop) || 0)}</strong>
                  <button onClick={onChangeRate} style={{ background: "transparent", border: 0, color: T.purple, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }} title="Cambiar tarifa"><i className="ri-pencil-line" style={{ marginRight: 3 }} />Cambiar</button>
                </div>

                {cardMode === "inline" && setupIntent ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8 }}><i className="ri-bank-card-line" style={{ marginRight: 5 }} />Ingresa la tarjeta del estilista</div>
                    <Elements stripe={setupIntent.stripePromise} options={{ clientSecret: setupIntent.clientSecret, appearance: { theme: isDark ? "night" : "stripe" } }}>
                      <InlineCardForm onSuccess={onInlineCardSuccess} onCancel={() => { setCardMode("idle"); setSetupIntent(null); }} />
                    </Elements>
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6 }}>Se guarda al instante y activa la suscripción diaria. No redirige a ninguna página.</div>
                  </div>
                ) : detail.default_card ? (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
                      <i className={cardBrandIcon(detail.default_card.brand)} style={{ fontSize: 18, color: T.purple }} />
                      <span>{detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}</span>
                      <span style={{ fontSize: 11.5, color: T.muted }}>exp {String(detail.default_card.exp_month).padStart(2, "0")}/{String(detail.default_card.exp_year).slice(-2)}</span>
                      {detail.card_status && (() => {
                        const cs = detail.card_status!;
                        const tone = cs.status === "activa" ? { l: "Activa", c: T.green, bg: T.greenBg } : cs.status === "sin_fondos" ? { l: "Sin fondos", c: T.amber, bg: T.amberBg } : { l: "Rechazada", c: T.red, bg: T.redBg };
                        return <span title={cs.reason || ""} style={{ background: tone.bg, color: tone.c, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 7 }}>{tone.l}</span>;
                      })()}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                      <button onClick={startInlineCard} disabled={setupBusy} style={{ background: "transparent", border: 0, color: T.purple, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: 0 }}>{setupBusy ? "…" : <><i className="ri-bank-card-line" style={{ marginRight: 4 }} />Cambiar aquí</>}</button>
                      <button onClick={onLinkCardFromDetail} disabled={linkingCard} style={{ background: "transparent", border: 0, color: T.muted, cursor: "pointer", fontSize: 12.5, fontWeight: 700, padding: 0 }}>{linkingCard ? "…" : <><i className="ri-links-line" style={{ marginRight: 4 }} />Enviar enlace</>}</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: T.amber, marginBottom: 8, fontSize: 13 }}><i className="ri-error-warning-line" style={{ marginRight: 5 }} />Sin tarjeta guardada</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button onClick={startInlineCard} disabled={setupBusy} style={{ ...btnDark, padding: "8px 12px" }}>{setupBusy ? "…" : <><i className="ri-bank-card-line" style={{ marginRight: 5 }} />Vincular tarjeta aquí</>}</button>
                      <button onClick={onLinkCardFromDetail} disabled={linkingCard} style={{ ...btnGhost, padding: "8px 12px" }}>{linkingCard ? "…" : <><i className="ri-links-line" style={{ marginRight: 5 }} />Enviar enlace</>}</button>
                    </div>
                  </div>
                )}

                {detail.subscription ? (
                  <div style={{ fontSize: 12, color: T.muted, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    <span><i className="ri-calendar-event-line" style={{ marginRight: 4 }} />Próximo cobro: <strong>{fmtUnixDate(detail.subscription.current_period_end)}</strong></span>
                    {detail.subscription.cancel_at_period_end && <span style={{ background: T.redBg, color: T.red, fontWeight: 700, fontSize: 10.5, padding: "2px 8px", borderRadius: 999 }}>Cancela al cierre</span>}
                    <button onClick={onTogglePauseDetail} style={{ background: "transparent", border: 0, color: T.purple, cursor: "pointer", fontSize: 12, fontWeight: 700, padding: 0 }}>
                      {detail.subscription.status === "paused" ? <><i className="ri-play-line" style={{ marginRight: 3 }} />Reanudar</> : <><i className="ri-pause-line" style={{ marginRight: 3 }} />Pausar</>}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Sin suscripción activa</div>
                )}
              </div>
            </div>

            {/* Historial */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim, marginBottom: 8 }}><i className="ri-history-line" style={{ marginRight: 5 }} />ÚLTIMOS COBROS</div>
            {detail.invoices.length === 0 ? (
              <div style={{ background: T.surface2, borderRadius: R.md, padding: "12px 14px", fontSize: 13, color: T.muted }}><i className="ri-information-line" style={{ marginRight: 6 }} />Sin facturas todavía.</div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr 1fr 1fr auto", padding: "8px 4px", fontSize: 11, fontWeight: 700, color: T.dim, borderBottom: `1px solid ${T.border2}` }}>
                  <span>FECHA</span><span>CONCEPTO</span><span style={{ textAlign: "right" }}>MONTO</span><span>ESTADO</span><span></span>
                </div>
                {detail.invoices.slice(invoicePage * INVOICES_PER_PAGE, invoicePage * INVOICES_PER_PAGE + INVOICES_PER_PAGE).map((i) => {
                  const it = invoiceTone(i.status);
                  const refunded = i.refunded || i.refunded_cash;
                  return (
                    <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr 1fr 1fr auto", alignItems: "center", padding: "10px 4px", fontSize: 12.5, borderBottom: `1px solid ${T.border3}` }}>
                      <span>{fmtUnixDate(i.created, true)}</span>
                      <span style={{ color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.description || "—"}</span>
                      <Mono style={{ textAlign: "right", fontWeight: 700 }}>{fmtStripeAmount(i.amount_paid || i.amount_due, i.currency)}</Mono>
                      <span>
                        {refunded
                          ? <span style={{ background: T.purpleBg2, color: T.purple2, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 7 }}>Reembolsado</span>
                          : <span style={{ background: it.bg, color: it.c, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 7 }}>{it.l}</span>}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        {i.hosted_invoice_url && <a href={i.hosted_invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: T.purple }} title="Ver recibo"><i className="ri-external-link-line" /></a>}
                        {!refunded && i.status === "paid" && (i.amount_paid || 0) > 0 && (
                          <button onClick={() => onRefundInvoice(i)} style={{ background: "transparent", border: 0, color: T.purple2, cursor: "pointer", padding: 0, fontSize: 15 }} title="Reembolsar este cobro a la tarjeta"><i className="ri-arrow-go-back-line" /></button>
                        )}
                      </span>
                    </div>
                  );
                })}
                {detail.invoices.length > INVOICES_PER_PAGE && (
                  <Pager
                    page={invoicePage + 1} totalPages={Math.ceil(detail.invoices.length / INVOICES_PER_PAGE)}
                    from={invoicePage * INVOICES_PER_PAGE + 1}
                    to={Math.min((invoicePage + 1) * INVOICES_PER_PAGE, detail.invoices.length)}
                    total={detail.invoices.length}
                    onPrev={() => setInvoicePage((p) => Math.max(0, p - 1))}
                    onNext={() => setInvoicePage((p) => p + 1)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ═══════════ Modal Cobro ad-hoc ═══════════ */}
      <Modal open={chargeOpen} onClose={() => setChargeOpen(false)} width={520} title="Cobro extra" icon="ri-money-dollar-circle-line"
        footer={
          <>
            <button onClick={() => setChargeOpen(false)} style={btnGhost}>Cancelar</button>
            <button onClick={onChargeSubmit} disabled={chargeBusy} style={{ ...btnGreen, opacity: chargeBusy ? 0.6 : 1 }}>{chargeBusy ? "Cobrando…" : <><i className="ri-bank-card-line" style={{ marginRight: 5 }} />Cobrar ahora</>}</button>
          </>
        }
      >
        {detail && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 13, background: T.surface2, borderRadius: R.lg, padding: 14, marginBottom: 16 }}>
              <Avatar ini={initials(nameOfRenter(detail.renter))} color={colorFor(detail.renter.id)} size={42} radius={12} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{nameOfRenter(detail.renter)}</div>
                {detail.default_card && <div style={{ fontSize: 11.5, color: T.muted }}><i className={cardBrandIcon(detail.default_card.brand)} style={{ marginRight: 4 }} />{detail.default_card.brand?.toUpperCase()} •••• {detail.default_card.last4}</div>}
              </div>
              <span style={{ background: T.purpleBg2, color: T.purple, fontWeight: 700, fontSize: 10.5, padding: "3px 9px", borderRadius: 999 }}><i className="ri-flashlight-line" style={{ marginRight: 3 }} />Inmediato</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Monto a cobrar</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: T.muted, fontWeight: 700 }}>$</span>
                <input type="number" min={2000} value={chargeForm.amount_cop} onChange={(e) => setChargeForm({ ...chargeForm, amount_cop: e.target.value })} placeholder="100000" style={{ ...inp, fontSize: 18, fontWeight: 600 }} />
                <span style={{ color: T.muted, fontWeight: 700 }}>COP</span>
              </div>
              {chargeForm.amount_cop && Number(chargeForm.amount_cop) >= 2000 && (
                <div style={{ fontSize: 12, color: T.green, marginTop: 5 }}><i className="ri-check-line" style={{ marginRight: 4 }} />Se cobrarán {fmtCOP(Number(chargeForm.amount_cop))}</div>
              )}
            </div>
            <div>
              <label style={lbl}>Concepto del cobro *</label>
              <textarea rows={2} value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} placeholder="Producto vendido, multa por daño, servicio extra…" style={{ ...inp, resize: "vertical" }} />
              <div style={{ fontSize: 11.5, color: T.muted, marginTop: 5 }}><i className="ri-information-line" style={{ marginRight: 4 }} />Aparece en el recibo de Stripe que recibe el estilista.</div>
            </div>
          </>
        )}
      </Modal>

      {/* ═══════════ Modal Devoluciones pendientes ═══════════ */}
      <Modal open={refundsOpen} onClose={() => setRefundsOpen(false)} width={720} title="Devoluciones pendientes" icon="ri-arrow-go-back-line"
        footer={<button onClick={() => setRefundsOpen(false)} style={btnGhost}>Cerrar</button>}
      >
        {refundsLoading ? (
          <Loading label="Cargando…" />
        ) : !refundsData || refundsData.renters.length === 0 ? (
          <Empty icon="✅" title="No hay devoluciones pendientes." hint="Ningún doble cobro ni día bloqueado sin reembolsar (últimos 60 días)." />
        ) : (
          <>
            <div style={{ background: T.amberBg, border: `1px solid ${T.amber}`, borderRadius: R.md, padding: "12px 14px", marginBottom: 14, fontSize: 13 }}>
              <i className="ri-error-warning-line" style={{ marginRight: 6, color: T.amber }} />
              Hay <strong>{refundsData.renters.length}</strong> estilista(s) con cobros por devolver — total <strong>{fmtCOP(refundsData.total_cop)}</strong>. Llámalos para avisarles y devuelve desde aquí.
            </div>
            {refundsData.renters.map((p) => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Estilista";
              const digits = (p.phone || "").replace(/\D/g, "");
              const intl = digits.length === 10 ? `57${digits}` : digits;
              return (
                <div key={p.id} style={{ border: `1px solid ${T.border}`, borderRadius: R.lg, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <Avatar ini={initials(name)} color={colorFor(p.id)} size={40} radius={12} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{name}</div>
                      <div style={{ fontSize: 11.5, color: T.muted }}>{p.phone || "Sin teléfono"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: T.purple2 }}>{fmtCOP(p.total_cop)}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{p.items.length} cobro(s)</div>
                    </div>
                    {digits && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <a href={`tel:+${intl}`} style={{ ...btnDark, padding: "7px 10px", textDecoration: "none" }} title={`Llamar a ${name}`}><i className="ri-phone-line" /></a>
                        <a href={`https://wa.me/${intl}?text=${encodeURIComponent(`Hola ${p.first_name || ""}, te escribo del salón: tienes ${fmtCOP(p.total_cop)} a favor por cobros de arriendo que vamos a devolverte a tu tarjeta.`)}`} target="_blank" rel="noopener noreferrer" style={{ ...btnGreen, padding: "7px 10px", textDecoration: "none" }} title={`WhatsApp a ${name}`}><i className="ri-whatsapp-line" /></a>
                      </div>
                    )}
                  </div>
                  {p.items.map((it) => (
                    <div key={it.invoice_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.border3}` }}>
                      <span style={{ fontSize: 12.5, width: 100 }}>{it.day}</span>
                      <span style={{ flex: 1 }}>
                        {it.reason === "blocked_day"
                          ? <span style={{ background: T.purpleBg, color: T.purple, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 999 }}>Día bloqueado</span>
                          : <span style={{ background: T.redBg, color: T.red, fontWeight: 700, fontSize: 10.5, padding: "3px 8px", borderRadius: 999 }}>Doble cobro</span>}
                      </span>
                      <Mono style={{ fontWeight: 700, fontSize: 13 }}>{fmtCOP(it.amount_cop)}</Mono>
                      <button onClick={() => onRefundPendingItem(p.id, name, it)} disabled={!!refundingId} style={{ ...btnGhost, padding: "6px 12px", color: T.purple2, opacity: refundingId ? 0.6 : 1 }}>
                        {refundingId === it.invoice_id ? "…" : <><i className="ri-arrow-go-back-line" style={{ marginRight: 4 }} />Devolver</>}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </Modal>

      {/* ═══════════ Modal Reporte de pagos ═══════════ */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} width={760} title="Reporte de pagos" icon="ri-file-chart-line"
        footer={
          <>
            <button onClick={exportReportCsv} disabled={reportCharges.length === 0} style={{ ...btnGhost, opacity: reportCharges.length === 0 ? 0.5 : 1 }}><i className="ri-download-2-line" style={{ marginRight: 5 }} />CSV</button>
            <button onClick={() => setReportOpen(false)} style={btnGhost}>Cerrar</button>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Desde</label><input type="date" value={reportFrom} max={todayStr} onChange={(e) => applyReportRange(e.target.value, reportTo)} style={inp} /></div>
          <div><label style={lbl}>Hasta</label><input type="date" value={reportTo} max={todayStr} onChange={(e) => applyReportRange(reportFrom, e.target.value)} style={inp} /></div>
          <div>
            <label style={lbl}>Estilista</label>
            <select value={reportRenter} onChange={(e) => setReportRenter(e.target.value)} style={inp}>
              <option value="">Todos los estilistas</option>
              {renters.map((r) => <option key={r.id} value={r.id}>{nameOfRenter(r)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Atajos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button style={{ ...btnGhost, padding: "6px 11px" }} onClick={() => applyReportRange(todayStr, todayStr)}>Hoy</button>
              <button style={{ ...btnGhost, padding: "6px 11px" }} onClick={() => { const y = addDays(todayStr, -1); applyReportRange(y, y); }}>Ayer</button>
              <button style={{ ...btnGhost, padding: "6px 11px" }} onClick={() => applyReportRange(addDays(todayStr, -6), todayStr)}>Últ. 7 días</button>
              <button style={{ ...btnGhost, padding: "6px 11px" }} onClick={() => applyReportRange(`${currentMonth}-01`, todayStr)}>Este mes</button>
              <button style={{ ...btnGhost, padding: "6px 11px" }} onClick={() => { const lastPrev = addDays(`${currentMonth}-01`, -1); applyReportRange(`${lastPrev.slice(0, 7)}-01`, lastPrev); }}>Mes pasado</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: T.surface2, borderRadius: R.md, padding: 4 }}>
            {(["fecha", "persona"] as const).map((v) => (
              <button key={v} onClick={() => setReportView(v)} style={{ border: 0, borderRadius: R.sm, padding: "7px 13px", fontWeight: 700, fontSize: 12, fontFamily: FONT, cursor: "pointer", background: reportView === v ? T.ink : "transparent", color: reportView === v ? T.onInk : T.muted }}>
                <i className={v === "fecha" ? "ri-calendar-line" : "ri-user-line"} style={{ marginRight: 4 }} />{v === "fecha" ? "Por fecha" : "Por persona"}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, background: T.surface2, borderRadius: R.md, padding: 14, marginBottom: 14 }}>
          <div><div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>NETO</div><Mono style={{ fontWeight: 800, fontSize: 17, color: T.green }}>{fmtCOP(reportTotals.net_cop)}</Mono></div>
          <div><div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>COBRADO</div><Mono style={{ fontWeight: 800, fontSize: 17 }}>{fmtCOP(reportTotals.gross_cop)}</Mono></div>
          {reportTotals.refunded_cop > 0 && <div><div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>REEMBOLSADO</div><Mono style={{ fontWeight: 800, fontSize: 17, color: T.purple2 }}>−{fmtCOP(reportTotals.refunded_cop)}</Mono></div>}
          <div style={{ marginLeft: "auto", textAlign: "right" }}><div style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}># COBROS</div><Mono style={{ fontWeight: 800, fontSize: 17 }}>{reportTotals.count}</Mono></div>
        </div>

        {reportLoading ? (
          <Loading label="Cargando reporte…" />
        ) : reportCharges.length === 0 ? (
          <Empty icon="📭" title={`Sin cobros en este periodo${reportRenter ? " para este estilista" : ""}.`} />
        ) : reportView === "fecha" ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.2fr 1fr auto", padding: "8px 4px", fontSize: 11, fontWeight: 700, color: T.dim, borderBottom: `1px solid ${T.border2}` }}>
              <span>FECHA</span><span>ESTILISTA</span><span>TIPO</span><span style={{ textAlign: "right" }}>MONTO</span><span></span>
            </div>
            {reportChargesPage.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.2fr 1fr auto", alignItems: "center", padding: "9px 4px", fontSize: 12.5, borderBottom: `1px solid ${T.border3}` }}>
                <span>{c.date}</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.renter_name}</span>
                <span>
                  {c.type === "extra"
                    ? <span style={{ background: T.amberBg, color: T.amber, fontWeight: 700, fontSize: 10, padding: "2px 7px", borderRadius: 999 }}>Extra</span>
                    : <span style={{ background: T.surface3, color: T.muted, fontWeight: 700, fontSize: 10, padding: "2px 7px", borderRadius: 999 }}>Arriendo</span>}
                  {c.status === "refunded" && <span style={{ background: T.purpleBg2, color: T.purple2, fontWeight: 700, fontSize: 10, padding: "2px 7px", borderRadius: 999, marginLeft: 4 }}>Reembolsado</span>}
                </span>
                <Mono style={{ textAlign: "right", fontWeight: 700 }}>
                  {c.status === "refunded"
                    ? <><span style={{ textDecoration: "line-through", color: T.muted }}>{fmtCOP(c.amount_cop)}</span> <span style={{ color: T.purple2 }}>{fmtCOP(c.net_cop)}</span></>
                    : fmtCOP(c.amount_cop)}
                </Mono>
                <span style={{ textAlign: "right" }}>{c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: T.muted }} title="Ver en Stripe"><i className="ri-external-link-line" /></a>}</span>
              </div>
            ))}
            {reportTotalPages > 1 && (
              <Pager
                page={reportPageSafe} totalPages={reportTotalPages}
                from={(reportPageSafe - 1) * REPORT_PAGE_SIZE + 1}
                to={Math.min(reportPageSafe * REPORT_PAGE_SIZE, reportCharges.length)}
                total={reportCharges.length}
                onPrev={() => setReportPage((p) => Math.max(1, p - 1))}
                onNext={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
              />
            )}
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 4px", fontSize: 11, fontWeight: 700, color: T.dim, borderBottom: `1px solid ${T.border2}` }}>
              <span>ESTILISTA</span><span style={{ textAlign: "center" }}># COBROS</span><span style={{ textAlign: "right" }}>COBRADO</span><span style={{ textAlign: "right" }}>NETO</span>
            </div>
            {reportTotals.by_person.map((p) => (
              <div key={p.renter_id} onClick={() => { setReportRenter(p.renter_id); setReportView("fecha"); }} title="Ver detalle de esta persona" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", alignItems: "center", padding: "9px 4px", fontSize: 12.5, borderBottom: `1px solid ${T.border3}`, cursor: "pointer" }}>
                <span style={{ fontWeight: 700 }}>{p.renter_name}</span>
                <span style={{ textAlign: "center" }}>{p.charges}</span>
                <Mono style={{ textAlign: "right" }}>{fmtCOP(p.gross_cop)}</Mono>
                <Mono style={{ textAlign: "right", fontWeight: 800, color: T.green }}>{fmtCOP(p.net_cop)}</Mono>
              </div>
            ))}
          </>
        )}
      </Modal>

      {/* ═══════════ Modal Calendario ═══════════ */}
      <Modal open={calOpen} onClose={() => setCalOpen(false)} width={720} title="Calendario de cobros" icon="ri-calendar-2-line"
        footer={<button onClick={() => setCalOpen(false)} style={btnGhost}>Cerrar</button>}
      >
        {calRenter && (
          <div style={{ display: "flex", alignItems: "center", gap: 13, paddingBottom: 14, borderBottom: `1px solid ${T.border2}`, marginBottom: 14 }}>
            <Avatar ini={initials(nameOfRenter(calRenter))} color={colorFor(calRenter.id)} size={46} radius={13} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{nameOfRenter(calRenter)}</div>
              <div style={{ fontSize: 12, color: T.muted }}>Tarifa diaria: <strong>{fmtCOP(calData?.daily_cop || 0)}</strong>{calData?.monthly_rent_cop ? ` · Mensualidad ${fmtCOP(Number(calData.monthly_rent_cop))}` : ""}</div>
            </div>
          </div>
        )}

        {/* Estado + pausar/reanudar */}
        {calData?.subscription ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, borderRadius: R.md, padding: 14, marginBottom: 14, background: calData.subscription.paused ? T.amberBg : T.greenBg }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className={calData.subscription.paused ? "ri-pause-circle-fill" : "ri-play-circle-fill"} style={{ fontSize: 22, color: calData.subscription.paused ? T.amber : T.green }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{calData.subscription.paused ? "Cobro automático en pausa" : "Cobro automático activo"}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>
                  {calData.subscription.paused
                    ? "No se cobra la tarifa diaria. Cobra días sueltos abajo."
                    : <>Stripe cobra la tarifa diaria cada día.{calData.subscription.current_period_end ? ` Próximo: ${fmtUnixDate(calData.subscription.current_period_end)}` : ""}</>}
                </div>
              </div>
            </div>
            <button onClick={onTogglePause} disabled={calBusy} style={{ ...(calData.subscription.paused ? btnGreen : { background: T.amber, color: "#fff", border: 0, borderRadius: R.md, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }), opacity: calBusy ? 0.6 : 1 }}>
              {calBusy ? "…" : calData.subscription.paused ? <><i className="ri-play-line" style={{ marginRight: 5 }} />Reanudar cobro</> : <><i className="ri-pause-line" style={{ marginRight: 5 }} />Pausar cobro</>}
            </button>
          </div>
        ) : !calLoading && calData ? (
          <div style={{ background: T.surface2, borderRadius: R.md, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: T.muted }}>
            <i className="ri-information-line" style={{ marginRight: 6 }} />Este estilista aún no tiene una suscripción activa. Guarda su tarjeta para empezar a cobrar.
          </div>
        ) : null}

        {/* Selector de modo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 4, background: T.surface2, borderRadius: 999, padding: 4 }}>
            {([
              { m: "charge", icon: "ri-money-dollar-circle-line", l: "Cobrar día", bg: T.green },
              { m: "paid", icon: "ri-hand-coin-line", l: "Marcar pagado", bg: T.green },
              { m: "block", icon: "ri-lock-line", l: "Bloquear día", bg: T.purple },
            ] as const).map((b) => (
              <button key={b.m} onClick={() => setCalMode(b.m)} disabled={calBusy} style={{ border: 0, borderRadius: 999, padding: "7px 14px", fontWeight: 700, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", background: calMode === b.m ? b.bg : "transparent", color: calMode === b.m ? "#fff" : T.muted }}>
                <i className={b.icon} style={{ marginRight: 5 }} />{b.l}
              </button>
            ))}
          </div>
        </div>

        {/* Política de bloqueo */}
        {calMode === "block" && calData && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: T.purpleBg, border: `1px solid ${T.purpleBorder}`, borderRadius: R.md, padding: "10px 14px", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: T.purple }}><i className="ri-scales-3-line" style={{ marginRight: 5 }} />{calData.readjust_blocked ? "Reajustar: paga el mes completo" : "Saltar: el día bloqueado se descuenta"}</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>{calData.readjust_blocked ? "Los días bloqueados NO se reembolsan — el cobro diario sigue corriendo." : "Los días bloqueados se reembolsan automáticamente — el renter paga menos ese mes."}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.muted }}>Reajustar</span>
              <Toggle on={!!calData.readjust_blocked} onClick={calBusy ? undefined : onToggleReadjust} />
            </div>
          </div>
        )}

        {/* Navegación de mes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <IconBtn icon="ri-arrow-left-s-line" onClick={() => gotoMonth(-1)} disabled={calLoading || calBusy} title="Mes anterior" />
          <span style={{ fontWeight: 800, fontSize: 15 }}>{monthLabelEs(calMonth)}</span>
          <IconBtn icon="ri-arrow-right-s-line" onClick={() => gotoMonth(1)} disabled={calLoading || calBusy || calMonth >= thisMonthYm()} title={calMonth >= thisMonthYm() ? "No puedes avanzar a meses futuros" : "Mes siguiente"} />
        </div>

        {calLoading ? (
          <Loading label="Cargando calendario…" />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 4 }}>
              {WEEKDAYS_ES.map((w) => <div key={w} style={{ textAlign: "center", color: T.muted, fontWeight: 600, fontSize: 11 }}>{w}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {buildMonthGrid(calMonth).map((cell, idx) => {
                if (!cell) return <div key={`e${idx}`} />;
                const day = Number(cell.slice(-2));
                const info = calData?.days[cell];
                const pal = dayPalette(info?.status);
                const isToday = cell === todayKey();
                const isFuture = cell > todayKey();
                const isPaid = info?.status === "paid";
                const isManual = info?.status === "paid_manual";
                const isBlocked = info?.status === "blocked";
                const paidMode = calMode === "paid";
                const blockMode = calMode === "block";
                const clickable = calBusy ? false
                  : paidMode ? (!isPaid && !isBlocked)
                  : blockMode ? (!isPaid && !isManual)
                  : (!isPaid && !isManual && !isBlocked && !!calData?.has_customer);
                return (
                  <div
                    key={cell}
                    onClick={clickable ? () => (paidMode ? onMarkDayPaid(cell) : blockMode ? onToggleBlockDay(cell) : onChargeDay(cell)) : undefined}
                    title={cell}
                    style={{
                      position: "relative", aspectRatio: "1 / 1", borderRadius: 10,
                      background: isFuture && !info ? T.surface2 : pal.bg,
                      border: isToday ? `2px solid ${T.purple2}` : `1.5px ${isFuture && !info ? "dashed" : "solid"} ${pal.border}`,
                      color: pal.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: clickable ? "pointer" : "default", opacity: isFuture && !info ? 0.8 : 1,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{day}</span>
                    {info?.status === "paid" && <i className="ri-check-line" style={{ fontSize: 13 }} />}
                    {info?.status === "paid_manual" && <i className="ri-hand-coin-line" style={{ fontSize: 12 }} />}
                    {info?.status === "refunded" && <i className="ri-arrow-go-back-line" style={{ fontSize: 12 }} />}
                    {info?.status === "failed" && <i className="ri-close-line" style={{ fontSize: 13 }} />}
                    {info?.status === "open" && <i className="ri-time-line" style={{ fontSize: 12 }} />}
                    {isBlocked && <i className={info?.refunded ? "ri-arrow-go-back-line" : "ri-lock-line"} style={{ fontSize: 12 }} />}
                    {!info && clickable && <i className={blockMode ? "ri-lock-line" : "ri-add-line"} style={{ fontSize: 12, opacity: 0.55 }} />}
                  </div>
                );
              })}
            </div>

            {/* Resumen del mes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              <div style={{ background: T.greenBg, borderRadius: R.md, padding: 10, textAlign: "center" }}><div style={{ fontWeight: 800, color: T.green }}>{calSummary.paidDays}</div><div style={{ fontSize: 11, color: T.muted }}>días pagados</div></div>
              <div style={{ background: T.surface2, borderRadius: R.md, padding: 10, textAlign: "center" }}><Mono style={{ fontWeight: 800 }}>{fmtCOP(calSummary.paidTotal)}</Mono><div style={{ fontSize: 11, color: T.muted }}>cobrado el mes</div></div>
              <div style={{ background: calSummary.failedDays ? T.redBg : T.surface2, borderRadius: R.md, padding: 10, textAlign: "center" }}><div style={{ fontWeight: 800, color: calSummary.failedDays ? T.red : T.text }}>{calSummary.failedDays}</div><div style={{ fontSize: 11, color: T.muted }}>días fallidos</div></div>
            </div>

            {/* Leyenda */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14, justifyContent: "center" }}>
              {[
                { c: dayPalette("paid"), t: "Pagado" },
                { c: dayPalette("paid_manual"), t: "Pagado manual" },
                { c: dayPalette("failed"), t: "Falló" },
                { c: dayPalette("open"), t: "Pendiente" },
                { c: dayPalette("blocked"), t: "Bloqueado" },
                { c: dayPalette("refunded"), t: "Reembolsado" },
                { c: dayPalette(undefined), t: "Sin cobro" },
              ].map((l) => (
                <div key={l.t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: l.c.bg, border: `1.5px solid ${l.c.border}`, display: "inline-block" }} />
                  <span style={{ fontSize: 11.5, color: T.muted }}>{l.t}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.muted, textAlign: "center", marginTop: 10 }}>
              <i className="ri-information-line" style={{ marginRight: 4 }} />
              {calMode === "block"
                ? calData?.readjust_blocked
                  ? 'Toca un día para bloquearlo. Con la política "reajustar" el día NO se reembolsa: el renter paga el mes completo.'
                  : "Toca un día para bloquearlo: no se cobrará. Si la suscripción alcanza a cobrarlo, se reembolsa automáticamente."
                : calMode === "paid"
                  ? "Toca un día (pendiente o fallido) para marcarlo como pagado SIN cobrar la tarjeta — para cuando cobraste en efectivo o con un cobro extra."
                  : "Toca un día sin cobro para cobrar la tarifa diaria manualmente."}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default Coworking;
