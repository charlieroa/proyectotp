// Nómina — pantalla del rediseño /v2. Cableada al preview real de nómina del tenant
// (GET /payrolls/detailed-preview?start_date=&end_date=), el MISMO endpoint que usa la
// página Payroll/PayrollPreview.tsx. Rango de fechas por defecto derivado del día del
// header (mes en curso); chips de periodo (Mes/Quincena/Semana) ajustan Desde/Hasta.
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../services/api";
import { ScreenProps } from "../types";
import { T, FONT, MONO, fmtCOP, colorFor, initials } from "../theme";
import { KpiGrid, Mono, Empty, Loading } from "../components/ui";

// ── formas reales devueltas por /payrolls/detailed-preview ───────────────
interface Svc { item_id?: string; service_date?: string; client_name: string; service_name: string; service_price: number; net_commission: number; admin_fee: number; }
interface Prod { product_name: string; commission_value: number; }
interface Exp { description: string; amount: number; }
interface Row {
  stylist_id: string | null;
  stylist_name: string;
  net_paid: number;
  stylist_tips?: number;
  unassigned?: boolean;
  payment_type?: string;
  details: { services: Svc[]; products: Prod[]; expenses: Exp[] };
}
interface Summary { cash: number; creditCard: number; inventorySold: number; stylistExpenses: number; }

// ── helpers de fecha (YYYY-MM-DD, hora local) ────────────────────────────
const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string): Date => new Date(`${s}T00:00:00`);

type PeriodKey = "mes" | "quincena" | "semana";
const rangeFor = (key: PeriodKey, ref: Date): { from: string; to: string } => {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  if (key === "semana") {
    const dow = (ref.getDay() + 6) % 7; // lunes = 0
    const mon = new Date(y, m, d - dow);
    const sun = new Date(y, m, d - dow + 6);
    return { from: iso(mon), to: iso(sun) };
  }
  if (key === "quincena") {
    return d <= 15
      ? { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m, 15)) }
      : { from: iso(new Date(y, m, 16)), to: iso(new Date(y, m + 1, 0)) };
  }
  // mes
  return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
};

// derivados de cálculo por estilista (consistentes con el backend)
const calc = (r: Row) => {
  const svc = r.details.services;
  const svcGross = svc.reduce((a, c) => a + Number(c.net_commission || 0) + Number(c.admin_fee || 0), 0);
  const svcNet = svc.reduce((a, c) => a + Number(c.net_commission || 0), 0);
  const admin = svc.reduce((a, c) => a + Number(c.admin_fee || 0), 0);
  const price = svc.reduce((a, c) => a + Number(c.service_price || 0), 0);
  const prod = r.details.products.reduce((a, p) => a + Number(p.commission_value || 0), 0);
  const anticipos = r.details.expenses.reduce((a, e) => a + Math.abs(Number(e.amount || 0)), 0);
  const tips = Number(r.stylist_tips || 0);
  const net = Number(r.net_paid || 0);
  const pct = price > 0 ? Math.round((svcGross / price) * 100) : 0;
  return { svcGross, svcNet, admin, price, prod, anticipos, tips, net, pct, count: svc.length };
};

const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);

const Nomina: React.FC<ScreenProps> = ({ tenantId, date }) => {
  const ref = useMemo(() => (date ? parse(date) : new Date()), [date]);
  const initial = useMemo(() => rangeFor("mes", ref), [ref]);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [reloadKey, setReloadKey] = useState(0);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    api
      .get<{ summary_widgets: Summary; stylist_breakdowns: Row[] }>("/payrolls/detailed-preview", {
        params: { start_date: from, end_date: to },
      })
      .then(({ data }) => {
        setSummary(data.summary_widgets || null);
        const list = data.stylist_breakdowns || [];
        setRows(list);
        setSelId(list.length ? list[0].stylist_id ?? "__unassigned__" : null);
      })
      .catch((e) => setError(e?.response?.data?.error || "No se pudo calcular la nómina."))
      .finally(() => setLoading(false));
  }, [tenantId, from, to, reloadKey]);

  useEffect(() => { load(); }, [load]);

  const pickPeriod = (key: PeriodKey) => {
    const r = rangeFor(key, ref);
    setPeriod(key);
    setFrom(r.from);
    setTo(r.to);
  };

  // totales / KPIs derivados del breakdown real
  const tot = useMemo(() => {
    let comisiones = 0, descuentos = 0, pagar = 0;
    rows.forEach((r) => {
      const c = calc(r);
      comisiones += c.svcGross + c.prod + c.tips;
      descuentos += c.admin + c.anticipos;
      pagar += c.net;
    });
    const ventas = (summary?.cash || 0) + (summary?.creditCard || 0);
    return { ventas, comisiones, descuentos, pagar };
  }, [rows, summary]);

  const selected = useMemo(
    () => rows.find((r) => (r.stylist_id ?? "__unassigned__") === selId) || rows[0] || null,
    [rows, selId]
  );
  const sel = selected ? calc(selected) : null;

  const downloadExcel = () => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
    const base = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
    fetch(`${base}/payrolls/export-excel?start_date=${from}&end_date=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `nomina_${from}_${to}.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {});
  };

  // "Generar y guardar" persiste deducciones (no idempotente): sólo visual aquí.
  const generar = () => console.log("[Nómina v2] Generar y guardar", { from, to, rows: rows.length });

  if (!tenantId) return <Empty icon="🏪" title="Sin salón" hint="Selecciona un salón para calcular la nómina." />;

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.7px" }}>Nómina</h1>
      <p style={{ margin: "5px 0 18px", color: T.muted, fontSize: 14 }}>
        Cada ticket cobrado ya sumó aquí. Elige el rango de fechas, revisa y paga.
      </p>

      {/* Barra de rango */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <DateField label="Desde" value={from} onChange={(v) => { setFrom(v); setPeriod("mes"); }} />
        <DateField label="Hasta" value={to} onChange={(v) => { setTo(v); setPeriod("mes"); }} />
        <div style={{ display: "flex", gap: 6, paddingBottom: 1 }}>
          {([["mes", "Este mes"], ["quincena", "Quincena"], ["semana", "Semana"]] as [PeriodKey, string][]).map(([k, label]) => (
            <button key={k} onClick={() => pickPeriod(k)} style={chipStyle(period === k)}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setReloadKey((n) => n + 1)} style={{ background: T.ink, color: T.onInk, border: 0, borderRadius: 11, padding: "11px 18px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>
          Calcular
        </button>
      </div>

      {/* KPIs */}
      <KpiGrid cols={4} style={{ marginBottom: 16 }}>
        <KpiCard label="Ventas del periodo" value={fmtCOP(tot.ventas)} />
        <KpiCard label="Comisiones" value={fmtCOP(tot.comisiones)} />
        <KpiCard label="Descuentos" value={fmtCOP(tot.descuentos)} color={T.red} />
        <KpiCard label="Total a pagar" value={fmtCOP(tot.pagar)} color={T.green} green />
      </KpiGrid>

      {loading ? (
        <Loading label="Calculando nómina…" />
      ) : error ? (
        <Empty icon="⚠️" title="No se pudo calcular" hint={error} />
      ) : rows.length === 0 ? (
        <Empty icon="🧾" title="Sin nómina en el periodo" hint="No hay servicios ni comisiones en este rango de fechas." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* Equipo */}
            <div style={{ width: 300, flex: "none", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border2}`, fontWeight: 800, fontSize: 14 }}>Equipo</div>
              {rows.map((r) => {
                const c = calc(r);
                const id = r.stylist_id ?? "__unassigned__";
                const active = id === (selected?.stylist_id ?? "__unassigned__");
                const color = r.unassigned ? T.dim : colorFor(r.stylist_name);
                return (
                  <div key={id} onClick={() => setSelId(id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: `1px solid ${T.border3}`, cursor: "pointer", background: active ? T.surface2 : "transparent" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12.5, flex: "none" }}>{r.unassigned ? "?" : initials(r.stylist_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.stylist_name}</div>
                      <div style={{ fontSize: 11.5, color: T.dim }}>{r.unassigned ? "sin asignar" : `${c.pct}%`} · {c.count} servicios</div>
                    </div>
                    <Mono style={{ fontWeight: 800, fontSize: 14, color: c.net > 0 ? T.green : T.dim }}>{fmtCOP(c.net)}</Mono>
                  </div>
                );
              })}
            </div>

            {/* Detalle del seleccionado */}
            <div style={{ flex: 1, minWidth: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
              {selected && sel && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: `1px solid ${T.border2}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: selected.unassigned ? T.dim : colorFor(selected.stylist_name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flex: "none" }}>{selected.unassigned ? "?" : initials(selected.stylist_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.stylist_name}</div>
                      <div style={{ fontSize: 12.5, color: T.muted }}>Comisión {sel.pct}% · <span className="mono" style={{ fontFamily: MONO }}>{from} → {to}</span></div>
                    </div>
                    <button onClick={downloadExcel} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      Excel
                    </button>
                  </div>
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".7px", color: T.dim, marginBottom: 10 }}>CÁLCULO DEL PAGO</div>
                    <DetailRow bg={T.greenBg} stroke={T.green} icon="up" title="Comisión por servicios" sub={`${sel.count} servicios · ${sel.pct}% de cada uno`} amount={`+ ${fmtCOP(sel.svcGross)}`} amountColor={T.green} />
                    <DetailRow bg={T.purpleBg} stroke={T.purple2} icon="box" title="Comisión por productos" sub="Venta de productos al cliente" amount={`+ ${fmtCOP(sel.prod)}`} amountColor={T.green} />
                    <DetailRow bg={T.redBg2} stroke={T.red} icon="down" title="Anticipos / préstamos" sub="Adelantos entregados en el periodo" amount={sel.anticipos > 0 ? `- ${fmtCOP(sel.anticipos)}` : fmtCOP(0)} amountColor={T.red} />
                    <DetailRow bg={T.redBg2} stroke={T.red} icon="down" title="% Administrativo" sub="Cobro administrativo sobre servicios" amount={sel.admin > 0 ? `- ${fmtCOP(sel.admin)}` : fmtCOP(0)} amountColor={T.red} />
                    {sel.tips > 0 && (
                      <DetailRow bg={T.greenBg} stroke={T.green} icon="up" title="Propinas" sub="Parte del estilista sobre propinas" amount={`+ ${fmtCOP(sel.tips)}`} amountColor={T.green} />
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: "16px 18px", background: T.greenBg2, borderRadius: 13 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: T.greenDark }}>Neto a pagar</div>
                      <Mono style={{ fontWeight: 800, fontSize: 23, color: T.green }}>{fmtCOP(sel.net)}</Mono>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer total */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 22px" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Total nómina del periodo</div>
              <div style={{ fontSize: 12.5, color: T.muted }}>
                {rows.filter((r) => !r.unassigned).length} personas · <span className="mono" style={{ fontFamily: MONO }}>{from} → {to}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Mono style={{ fontWeight: 800, fontSize: 24, color: T.green }}>{fmtCOP(tot.pagar)}</Mono>
              <button onClick={generar} style={{ background: T.ink, color: T.onInk, border: 0, borderRadius: 12, padding: "14px 22px", fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}>Generar y guardar nómina</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── sub-componentes ──────────────────────────────────────────
const DateField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, display: "block", marginBottom: 5 }}>{label}</label>
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: 11, padding: "8px 12px", background: T.surface2 }}>
      <CalIcon />
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="mono"
        style={{ border: 0, background: "transparent", fontFamily: MONO, fontWeight: 600, fontSize: 13.5, color: T.text, outline: "none", cursor: "pointer" }}
      />
    </div>
  </div>
);

const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? T.ink : T.surface,
  color: active ? T.onInk : T.muted,
  border: `1px solid ${active ? T.ink : T.border}`,
  borderRadius: 9,
  padding: "9px 13px",
  fontWeight: 700,
  fontSize: 12.5,
  fontFamily: FONT,
  cursor: "pointer",
});

const KpiCard: React.FC<{ label: string; value: React.ReactNode; color?: string; green?: boolean }> = ({ label, value, color, green }) => (
  <div style={{ background: green ? T.greenBg2 : T.surface, border: `1px solid ${green ? T.greenBorder : T.border}`, borderRadius: 16, padding: "16px 17px" }}>
    <div style={{ fontSize: 12, color: green ? T.green : T.muted, fontWeight: green ? 700 : 600 }}>{label}</div>
    <Mono style={{ fontSize: 21, fontWeight: 800, marginTop: 6, display: "block", color: color || T.text }}>{value}</Mono>
  </div>
);

const DetailRow: React.FC<{ bg: string; stroke: string; icon: "up" | "down" | "box"; title: string; sub: string; amount: string; amountColor: string }> = ({ bg, stroke, icon, title, sub, amount, amountColor }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${T.border3}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon === "up" && <path d="m6 9 6-6 6 6M12 3v12" />}
          {icon === "down" && <path d="M18 15l-6 6-6-6M12 21V9" />}
          {icon === "box" && <path d="M3 7h18v12H3zM3 7l3-4h12l3 4" />}
        </svg>
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: T.dim }}>{sub}</div>
      </div>
    </div>
    <Mono style={{ fontWeight: 700, fontSize: 14.5, color: amountColor }}>{amount}</Mono>
  </div>
);

export default Nomina;
