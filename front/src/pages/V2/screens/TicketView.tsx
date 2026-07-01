// Vista INLINE de Ticket → Cobro → Confirmación para /v2 (estilo Luxe).
// Reemplaza el offcanvas del POS viejo dentro de Operación. NO reimplementa la
// lógica de negocio: reutiliza EXACTAMENTE los mismos endpoints del POS clásico
// (front/src/pages/PointOfSale/index.tsx), modo "ticket virtual":
//   GET    /tickets/:id                      → cargar ticket (cliente + invoice_items)
//   POST   /tickets/:id/items                → agregar servicio/producto
//   DELETE /tickets/:id/items/:itemId        → quitar línea
//   POST   /tickets/:id/close                → cobrar y cerrar (+ propina + FE DIAN)
// Catálogos: /services/tenant/:id, /products?audience=cliente, /users/tenant/:id?role_id=3
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../services/api";
import { T, FONT, R, fmtCOP, colorFor, initials } from "../theme";
import { Loading, Empty, Toggle } from "../components/ui";

export type Phase = "ticket" | "cobro" | "done";

interface Props {
  ticketId: string;
  targetTenantId: string;
  date: string; // YYYY-MM-DD (día seleccionado en Operación)
  onExit: () => void; // volver a la lista de Operación (refresca)
  onPhase?: (p: Phase) => void;
}

type Catalog = { id: string; name: string; price: number };
type Stylist = { id: string; name: string };

// líneas normalizadas del ticket (desde invoice_items)
type Line = {
  itemId: string;
  type: string; // 'service' | 'product' | 'custom'
  name: string;
  unit: number;
  qty: number;
  sellerId: string | null;
  sellerName: string;
  commission: number;
};

const num = (v: any): number => Number(v || 0);

const normalize = (data: any): Line[] =>
  (data?.invoice_items || []).map((it: any): Line => ({
    itemId: it.id,
    type: it.item_type || "service",
    name: it.description || "Ítem",
    unit: num(it.unit_price),
    qty: num(it.quantity) || 1,
    sellerId: it.seller_id || it.users?.id || null,
    sellerName: it.users ? `${it.users.first_name || ""} ${it.users.last_name || ""}`.trim() : "",
    commission: num(it.commission_value),
  }));

const clientOf = (data: any): { name: string; meta: string } => {
  if (!data) return { name: "Cliente", meta: "" };
  const reg = data.users ? `${data.users.first_name || ""} ${data.users.last_name || ""}`.trim() : "";
  const name = reg || data.client_name_adhoc || "Walk-in";
  const meta = data.client_name_adhoc && !reg ? "Walk-in" : (data.users?.phone || "Cliente");
  return { name, meta };
};

const iconFor = (type: string) => (type === "product" ? "🛍️" : "✂️");

const METHODS: { key: string; label: string; icon: string }[] = [
  { key: "cash", label: "Efectivo", icon: "💵" },
  { key: "card", label: "Tarjeta", icon: "💳" },
  { key: "transfer", label: "Transferencia", icon: "📱" },
  { key: "mixed", label: "Mixto", icon: "🔀" },
];

const TicketView: React.FC<Props> = ({ ticketId, targetTenantId, date, onExit, onPhase }) => {
  const [phase, setPhaseState] = useState<Phase>("ticket");
  const setPhase = useCallback((p: Phase) => { setPhaseState(p); onPhase?.(p); }, [onPhase]);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [err, setErr] = useState<string>("");

  // catálogos
  const [services, setServices] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Catalog[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);

  // agregar ítem
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<string>(""); // "svc:<id>" | "prod:<id>"
  const [pickSeller, setPickSeller] = useState<string>("");
  const [busyAdd, setBusyAdd] = useState(false);

  // cobro
  const [method, setMethod] = useState<string>("cash");
  const [giveTip, setGiveTip] = useState(false);
  const [feOn, setFeOn] = useState(false);
  const [feType, setFeType] = useState<"final" | "nit">("final");
  const [docType, setDocType] = useState<string>("CC");
  const [docNumber, setDocNumber] = useState<string>("");
  const [feEmail, setFeEmail] = useState<string>("");
  const [charging, setCharging] = useState(false);

  // confirmación
  const [result, setResult] = useState<any>(null);

  const reload = useCallback(async () => {
    const { data } = await api.get(`/tickets/${ticketId}`);
    setTicket(data);
    setLines(normalize(data));
    // precargar correo del cliente registrado para FE
    const email = data?.users?.email || "";
    if (email && !email.endsWith("@temp.tupelukeria.com")) setFeEmail((e) => e || email);
    return data;
  }, [ticketId]);

  // carga inicial: ticket + catálogos
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [tk, svc, prod, styl] = await Promise.all([
          api.get(`/tickets/${ticketId}`),
          api.get(`/services/tenant/${targetTenantId}`).catch(() => ({ data: [] })),
          api.get(`/products`, { params: { audience: "cliente", target_tenant_id: targetTenantId } }).catch(() => ({ data: [] })),
          api.get(`/users/tenant/${targetTenantId}`, { params: { role_id: 3 } }).catch(() => ({ data: [] })),
        ]);
        if (cancel) return;
        setTicket(tk.data);
        setLines(normalize(tk.data));
        const email = tk.data?.users?.email || "";
        if (email && !email.endsWith("@temp.tupelukeria.com")) setFeEmail(email);
        setServices((Array.isArray(svc.data) ? svc.data : []).map((s: any) => ({ id: s.id, name: s.name, price: num(s.price) })));
        setProducts((Array.isArray(prod.data) ? prod.data : []).map((p: any) => ({ id: p.id, name: p.name, price: num(p.sale_price) })));
        setStylists((Array.isArray(styl.data) ? styl.data : []).map((u: any) => ({ id: u.id, name: `${u.first_name || ""} ${u.last_name || ""}`.trim() })));
      } catch (e: any) {
        if (!cancel) setErr(e?.response?.data?.error || "No se pudo cargar el ticket.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [ticketId, targetTenantId]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unit * l.qty, 0), [lines]);
  const tip = giveTip ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal; // precios IVA incluido; propina se suma en cobro
  const grand = total + tip;

  const client = useMemo(() => clientOf(ticket), [ticket]);

  // ── acciones (endpoints idénticos al POS viejo) ──────────────
  const addItem = async () => {
    if (!pick || !pickSeller || busyAdd) return;
    setBusyAdd(true);
    setErr("");
    const [kind, id] = pick.split(":");
    const cat = (kind === "prod" ? products : services).find((c) => c.id === id);
    if (!cat) { setBusyAdd(false); return; }
    const payload = {
      item_type: kind === "prod" ? "product" : "service",
      related_id: cat.id,
      description: cat.name,
      quantity: 1,
      unit_price: cat.price,
      seller_id: pickSeller,
    };
    try {
      const resp = await api.post(`/tickets/${ticketId}/items`, payload);
      if (resp.data?.duplicate_warning) {
        const ok = window.confirm(`Ya agregaste "${cat.name}" hace un momento. ¿Agregarlo otra vez?`);
        if (ok) await api.post(`/tickets/${ticketId}/items`, { ...payload, allow_duplicate: true });
      }
      await reload();
      setPick("");
      setAdding(false);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "No se pudo agregar el ítem.");
    } finally {
      setBusyAdd(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setErr("");
    try {
      await api.delete(`/tickets/${ticketId}/items/${itemId}`);
      await reload();
    } catch (e: any) {
      setErr(e?.response?.data?.error || "No se pudo quitar la línea.");
    }
  };

  const confirmPay = async () => {
    if (charging) return;
    setCharging(true);
    setErr("");
    // Payload de cierre: idéntico a PointOfSale.handlePayNow (modo ticket) +
    // los campos de FE DIAN que el backend (closeTicket → boltiInvoiceService) acepta.
    const payload: Record<string, any> = {
      tip_amount: tip,
      payment_method: method,
      tip_recipient_user_id: null, // repartir entre todos (igual que el default del POS)
      // FIX DE FECHA: el backend usa new Date() en el servidor y NO acepta fecha
      // explícita para el cobro; enviamos business_date de forma informativa (día
      // seleccionado en Operación). El backend ignora campos desconocidos.
      business_date: date,
    };
    if (feOn) {
      payload.invoice_email = feEmail.trim() || undefined;
      if (feType === "nit") {
        payload.client_document_type = docType;
        payload.client_document_number = docNumber.trim() || undefined;
      }
      // consumidor final: sin documento → backend factura a NIT 222222222222
    }
    try {
      const { data } = await api.post(`/tickets/${ticketId}/close`, payload);
      setResult(data);
      setPhase("done");
    } catch (e: any) {
      setErr(e?.response?.data?.error || "No se pudo cobrar el ticket.");
    } finally {
      setCharging(false);
    }
  };

  // reparto de comisión para la confirmación (desde el ticket devuelto por /close)
  const split = useMemo(() => {
    const items: Line[] = normalize(result?.ticket);
    const by = new Map<string, { name: string; total: number }>();
    for (const l of items) {
      if (!l.sellerId || l.commission <= 0) continue;
      const cur = by.get(l.sellerId) || { name: l.sellerName || "Estilista", total: 0 };
      cur.total += l.commission;
      by.set(l.sellerId, cur);
    }
    return Array.from(by.values());
  }, [result]);

  if (loading) return <Loading label="Cargando ticket…" />;
  if (err && !ticket) return <Empty icon="⚠️" title="No se pudo cargar" hint={err} />;

  // ── UI ───────────────────────────────────────────────────────
  const ClientHeader: React.FC<{ badge?: React.ReactNode }> = ({ badge }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 20px", borderBottom: `1px solid ${T.border2}` }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15, background: colorFor(client.name) }}>{initials(client.name)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{client.name}</div>
        <div style={{ fontSize: 12.5, color: T.muted }}>{lines.length} ítem{lines.length === 1 ? "" : "s"} · Ticket #{String(ticketId).slice(0, 8)}</div>
      </div>
      {badge}
    </div>
  );

  const errBanner = err ? (
    <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, borderRadius: R.md, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{err}</div>
  ) : null;

  // ============ FASE 1: TICKET (constructor) ============
  if (phase === "ticket") {
    return (
      <div>
        {errBanner}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
          {/* izquierda: constructor */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, overflow: "hidden" }}>
            <ClientHeader badge={<span style={{ background: T.amberBg, color: T.amber, fontWeight: 700, fontSize: 11.5, padding: "5px 11px", borderRadius: 8 }}>● Abierto</span>} />
            <div style={{ padding: 16 }}>
              {lines.length === 0 ? (
                <Empty icon="🧾" title="Ticket vacío" hint="Agrega un servicio o producto para empezar." />
              ) : lines.map((l) => (
                <div key={l.itemId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: `1px solid ${T.border3}` }}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, flex: "none", background: T.surface3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{iconFor(l.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{l.name}{l.qty > 1 ? ` × ${l.qty}` : ""}</div>
                    {l.sellerName ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 3, fontSize: 11.5, color: colorFor(l.sellerName), background: colorFor(l.sellerName) + "1f", fontWeight: 700, padding: "2px 8px", borderRadius: 7 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 5, background: colorFor(l.sellerName), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5 }}>{initials(l.sellerName)}</span>
                        {l.sellerName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: T.amber, fontWeight: 700 }}>Sin estilista</span>
                    )}
                  </div>
                  <span className="mono" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14 }}>{fmtCOP(l.unit * l.qty)}</span>
                  <button onClick={() => removeItem(l.itemId)} title="Quitar" style={{ width: 28, height: 28, borderRadius: 8, flex: "none", border: `1px solid ${T.border}`, background: T.surface, color: T.red, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
                </div>
              ))}

              {/* agregar */}
              {!adding ? (
                <button onClick={() => setAdding(true)} style={{ width: "100%", marginTop: 12, padding: "13px", borderRadius: R.md, border: `1.5px dashed ${T.border2}`, background: "transparent", color: T.muted, fontWeight: 700, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}>
                  + Agregar servicio o producto
                </button>
              ) : (
                <div style={{ marginTop: 12, padding: 14, borderRadius: R.md, border: `1px solid ${T.border}`, background: T.surface2 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <select value={pick} onChange={(e) => setPick(e.target.value)} style={selStyle}>
                      <option value="">Servicio o producto…</option>
                      {services.length > 0 && (
                        <optgroup label="Servicios">
                          {services.map((s) => <option key={s.id} value={`svc:${s.id}`}>{s.name} — {fmtCOP(s.price)}</option>)}
                        </optgroup>
                      )}
                      {products.length > 0 && (
                        <optgroup label="Productos">
                          {products.map((p) => <option key={p.id} value={`prod:${p.id}`}>{p.name} — {fmtCOP(p.price)}</option>)}
                        </optgroup>
                      )}
                    </select>
                    <select value={pickSeller} onChange={(e) => setPickSeller(e.target.value)} style={selStyle}>
                      <option value="">¿Quién lo atendió?…</option>
                      {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={addItem} disabled={!pick || !pickSeller || busyAdd} style={{ ...btnInk, opacity: !pick || !pickSeller || busyAdd ? 0.5 : 1 }}>{busyAdd ? "Agregando…" : "Agregar"}</button>
                      <button onClick={() => { setAdding(false); setPick(""); }} style={btnGhost}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 11.5, color: T.faint, marginTop: 12, marginBottom: 0 }}>
                Cada estilista que atienda suma lo suyo al ticket; la comisión se reparte automáticamente al cobrar.
              </p>
            </div>
          </div>

          {/* derecha: resumen */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 20, position: "sticky", top: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Resumen</div>
            <Row label="Subtotal" value={fmtCOP(subtotal)} />
            <Row label="Nº de ítems" value={String(lines.length)} />
            <Row label="IVA" value="Incluido" muted />
            <div style={{ borderTop: `1px solid ${T.border2}`, margin: "12px 0", paddingTop: 12, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
              <span className="mono" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 26 }}>{fmtCOP(total)}</span>
            </div>
            <button onClick={() => setPhase("cobro")} disabled={lines.length === 0} style={{ ...btnInk, width: "100%", padding: "14px", fontSize: 14.5, marginTop: 6, opacity: lines.length === 0 ? 0.5 : 1 }}>
              Cobrar {fmtCOP(total)}
            </button>
            <button onClick={onExit} style={{ ...btnGhost, width: "100%", marginTop: 9 }}>Guardar y dejar abierto</button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FASE 2: COBRO ============
  if (phase === "cobro") {
    return (
      <div>
        {errBanner}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
          {/* izquierda: cliente + ítems (lectura) + opciones */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, overflow: "hidden" }}>
            <ClientHeader />
            <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border2}` }}>
              {lines.map((l) => (
                <div key={l.itemId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 13.5 }}>
                  <span style={{ fontSize: 14 }}>{iconFor(l.type)}</span>
                  <span style={{ flex: 1 }}>{l.name}{l.qty > 1 ? ` × ${l.qty}` : ""}{l.sellerName ? <span style={{ color: T.muted }}> · {l.sellerName}</span> : null}</span>
                  <span className="mono" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>{fmtCOP(l.unit * l.qty)}</span>
                </div>
              ))}
            </div>

            {/* método de pago */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border2}` }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Método de pago</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {METHODS.map((m) => {
                  const on = method === m.key;
                  return (
                    <button key={m.key} onClick={() => setMethod(m.key)} style={{ padding: "11px 6px", borderRadius: R.md, border: `1.5px solid ${on ? T.ink : T.border}`, background: on ? T.ink : T.surface, color: on ? T.onInk : T.text, fontWeight: 700, fontSize: 12, fontFamily: FONT, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 16 }}>{m.icon}</span>{m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* propina */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border2}` }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Propina</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setGiveTip(false)} style={tipBtn(!giveTip)}>Sin propina</button>
                <button onClick={() => setGiveTip(true)} style={tipBtn(giveTip)}>+10% ({fmtCOP(Math.round(subtotal * 0.1))})</button>
              </div>
            </div>

            {/* FE DIAN */}
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Factura electrónica DIAN</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Emite y envía la factura al cobrar.</div>
                </div>
                <Toggle on={feOn} onClick={() => setFeOn((v) => !v)} />
              </div>
              {feOn && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setFeType("final")} style={tipBtn(feType === "final")}>Consumidor final</button>
                    <button onClick={() => setFeType("nit")} style={tipBtn(feType === "nit")}>Con NIT / cédula</button>
                  </div>
                  {feType === "nit" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ ...selStyle, flex: "none", width: 92 }}>
                        <option value="CC">CC</option>
                        <option value="NIT">NIT</option>
                        <option value="CE">CE</option>
                        <option value="PP">PP</option>
                      </select>
                      <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Número de documento" style={{ ...selStyle, flex: 1 }} />
                    </div>
                  )}
                  <input value={feEmail} onChange={(e) => setFeEmail(e.target.value)} placeholder="Correo para la factura" type="email" style={selStyle} />
                </div>
              )}
            </div>
          </div>

          {/* derecha: panel oscuro de cobro */}
          <div style={{ background: T.ink, color: T.onInk, borderRadius: R.xxl, padding: 22, position: "sticky", top: 12 }}>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", fontWeight: 600 }}>Total a cobrar</div>
            <div className="mono" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: 34, margin: "4px 0 16px" }}>{fmtCOP(grand)}</div>
            <DarkRow label="Subtotal" value={fmtCOP(subtotal)} />
            {tip > 0 && <DarkRow label="Propina (10%)" value={fmtCOP(tip)} />}
            <DarkRow label="Método" value={METHODS.find((m) => m.key === method)?.label || method} />
            {feOn && <DarkRow label="Factura" value={feType === "final" ? "DIAN · Consumidor final" : "DIAN · Con documento"} />}
            <button onClick={confirmPay} disabled={charging} style={{ width: "100%", marginTop: 18, padding: "14px", borderRadius: R.md, border: 0, background: T.green, color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: FONT, cursor: "pointer", opacity: charging ? 0.6 : 1 }}>
              {charging ? "Cobrando…" : "Confirmar pago"}
            </button>
            <button onClick={() => setPhase("ticket")} style={{ width: "100%", marginTop: 9, padding: "12px", borderRadius: R.md, border: "1px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(255,255,255,.85)", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
              Volver al ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ FASE 3: CONFIRMACIÓN (paidDone) ============
  const fe = result?.fe;
  const feEmitted = fe && fe.success && fe.cufe;
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: "34px 28px", textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32, color: T.green }}>✓</div>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.4px" }}>Ticket cobrado</div>
        <div style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>
          {client.name} · <strong style={{ color: T.text }}>{fmtCOP(grand)}</strong> · {METHODS.find((m) => m.key === method)?.label || method}
        </div>

        {feEmitted ? (
          <div style={{ marginTop: 18, background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: R.md, padding: "12px 16px", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.greenDark }}>🧾 Factura electrónica enviada a la DIAN</div>
            {fe.cufe && <div style={{ fontSize: 11, color: T.muted, marginTop: 4, wordBreak: "break-all" }}>CUFE: {fe.cufe}</div>}
            {fe.dian_status && <div style={{ fontSize: 11.5, color: T.green, marginTop: 2, fontWeight: 700 }}>{fe.dian_status}</div>}
          </div>
        ) : feOn && fe && fe.success === false ? (
          <div style={{ marginTop: 18, background: T.amberBg, border: `1px solid ${T.amber}33`, borderRadius: R.md, padding: "12px 16px", textAlign: "left", fontSize: 12.5, color: T.amber, fontWeight: 600 }}>
            El cobro quedó registrado, pero la factura DIAN no se pudo emitir{fe.error ? `: ${fe.error}` : ". Revisa la configuración de facturación."}
          </div>
        ) : null}

        {result?.invoice_emailed && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: T.muted }}>Comprobante enviado a {feEmail}</div>
        )}

        {split.length > 0 && (
          <div style={{ marginTop: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: T.muted, marginBottom: 8 }}>SE REPARTIÓ AUTOMÁTICAMENTE</div>
            {split.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: R.md, marginBottom: 7 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: colorFor(s.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{initials(s.name)}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{s.name}</span>
                <span className="mono" style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 14, color: T.green }}>{fmtCOP(s.total)}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onExit} style={{ ...btnInk, width: "100%", padding: "14px", fontSize: 14.5, marginTop: 22 }}>Volver a Operación</button>
      </div>
    </div>
  );
};

// ── sub-componentes / estilos ───────────────────────────────────
const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13.5 }}>
    <span style={{ color: T.muted }}>{label}</span>
    <span style={{ fontWeight: 700, color: muted ? T.muted : T.text }}>{value}</span>
  </div>
);

const DarkRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13, color: "rgba(255,255,255,.7)" }}>
    <span>{label}</span>
    <span style={{ fontWeight: 700, color: "#fff" }}>{value}</span>
  </div>
);

const selStyle: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "10px 12px", fontWeight: 600, fontSize: 13.5, fontFamily: FONT, color: T.text, width: "100%", cursor: "pointer" };
const btnInk: React.CSSProperties = { background: T.ink, color: T.onInk, border: 0, borderRadius: R.md, padding: "11px 16px", fontWeight: 700, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "11px 16px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };
const tipBtn = (on: boolean): React.CSSProperties => ({ flex: 1, padding: "10px", borderRadius: R.md, border: `1.5px solid ${on ? T.green : T.border}`, background: on ? T.greenBg : T.surface, color: on ? T.greenDark : T.text, fontWeight: 700, fontSize: 12.5, fontFamily: FONT, cursor: "pointer" });

export default TicketView;
