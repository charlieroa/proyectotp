// Configuración — pantalla del rediseño /v2. Muestra la config real del negocio en
// pestañas: Datos, Personal, Servicios, Comisiones, Horarios, Bot, Planes.
// Es una vista de LECTURA fiel al mockup: cablea datos reales donde es directo
// (/tenants, /users, /services, /categories, /users/:id/working-hours) y NO ejecuta
// acciones destructivas — los botones Guardar/Agregar son visuales (console.log).
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../services/api";
import { ScreenProps } from "../types";
import { T, R, FONT, fmtCOP, colorFor, initials } from "../theme";
import { Toggle, Mono, Loading, Empty, Avatar } from "../components/ui";

type TabKey = "datos" | "personal" | "servicios" | "comisiones" | "horarios" | "bot" | "planes";

type Tenant = {
  id: string;
  name?: string | null; city?: string | null; phone?: string | null; address?: string | null;
  email?: string | null; iva_rate?: number | null;
  admin_fee_enabled?: boolean; admin_fee_percent?: number | null;
  products_for_staff_enabled?: boolean; tip_salon_percent?: number | null;
  working_hours?: Record<string, string | null> | null;
  plan?: string | null;
};
type Staff = {
  id: string; first_name: string; last_name?: string | null;
  role_id: number; commission_rate?: number | null; email?: string | null;
  employment_type?: string | null;
};
type Category = { id: string; name: string };
type Service = { id: string; name: string; category_id: string; price: number; duration_minutes: number };

type DayHours = { active: boolean; start: string; end: string };

// ── días ──────────────────────────────────────────────────────
const DAYS: { key: string; lbl: string; short: string }[] = [
  { key: "monday", lbl: "Lunes", short: "Lun" },
  { key: "tuesday", lbl: "Martes", short: "Mar" },
  { key: "wednesday", lbl: "Miércoles", short: "Mié" },
  { key: "thursday", lbl: "Jueves", short: "Jue" },
  { key: "friday", lbl: "Viernes", short: "Vie" },
  { key: "saturday", lbl: "Sábado", short: "Sáb" },
  { key: "sunday", lbl: "Domingo", short: "Dom" },
];
const ES_TO_EN: Record<string, string> = {
  lunes: "monday", martes: "tuesday", miercoles: "wednesday", "miércoles": "wednesday",
  jueves: "thursday", viernes: "friday", sabado: "saturday", "sábado": "saturday", domingo: "sunday",
};

// working_hours del tenant vienen como "09:00-17:00" | "cerrado" (claves ES o EN)
const parseSalonHours = (wh: Tenant["working_hours"]): Record<string, DayHours> => {
  const out: Record<string, DayHours> = {};
  DAYS.forEach((d) => { out[d.key] = { active: false, start: "", end: "" }; });
  if (!wh || typeof wh !== "object") return out;
  for (const [k, v] of Object.entries(wh)) {
    const key = ES_TO_EN[k.toLowerCase()] || k.toLowerCase();
    if (!out[key]) continue;
    const raw = (v || "").toString().trim().toLowerCase();
    if (!raw || raw === "cerrado" || raw === "closed") { out[key] = { active: false, start: "", end: "" }; continue; }
    const [start, end] = raw.split("-").map((s) => s.trim());
    if (start && end) out[key] = { active: true, start, end };
  }
  return out;
};

// /users/:id/working-hours → { monday: { active, open, close } } | null (hereda del salón)
const parseStylistHours = (data: any): Record<string, DayHours> | null => {
  if (data == null || typeof data !== "object") return null;
  const out: Record<string, DayHours> = {};
  DAYS.forEach((d) => {
    const raw = data[d.key];
    out[d.key] = raw && raw.active
      ? { active: true, start: (raw.open || "").slice(0, 5), end: (raw.close || "").slice(0, 5) }
      : { active: false, start: "", end: "" };
  });
  return out;
};

const ROLE: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Admin", color: T.purple, bg: T.purpleBg2 },
  2: { label: "Cajera", color: T.purple2, bg: T.purpleBg },
  3: { label: "Estilista", color: T.green, bg: T.greenBg },
  6: { label: "Recepción", color: T.amber, bg: T.amberBg },
};
const roleOf = (id: number) => ROLE[id] || { label: "Equipo", color: T.muted, bg: "#f0f0ec" };

// ── planes (fiel al mockup, resalta el plan real del tenant) ──
const PLANS = [
  { key: "free", name: "Free", price: "$0", desc: "Para empezar a ordenar la agenda.", feats: ["Agenda y citas", "1 sede", "Hasta 3 estilistas", "Soporte por correo"] },
  { key: "pro", name: "Pro", price: "$29.900", desc: "El salón que ya factura en serio.", feats: ["Todo lo de Free", "Punto de venta y caja", "Comisiones y nómina", "Estilistas ilimitados"] },
  { key: "enterprise", name: "Enterprise", price: "$129.900", desc: "Varias sedes, bot y automatización.", feats: ["Todo lo de Pro", "Bot de WhatsApp", "Multi-sede y coworking", "Reportes avanzados"] },
];

const Configuracion: React.FC<ScreenProps> = ({ tenantId, tenantName }) => {
  const [tab, setTab] = useState<TabKey>("datos");
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // horarios por estilista (lazy)
  const [selStylist, setSelStylist] = useState<string | null>(null);
  const [stylistHours, setStylistHours] = useState<Record<string, Record<string, DayHours> | null>>({});
  const [stylistLoading, setStylistLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get(`/tenants/${tenantId}`),
      api.get(`/users/tenant/${tenantId}`, { params: { role_ids: "1,2,3,6" } }),
      api.get(`/services/tenant/${tenantId}`),
      api.get(`/categories`),
    ]).then(([tRes, uRes, sRes, cRes]) => {
      if (!alive) return;
      if (tRes.status === "fulfilled") setTenant(tRes.value.data || null);
      if (uRes.status === "fulfilled") setStaff(Array.isArray(uRes.value.data) ? uRes.value.data : []);
      if (sRes.status === "fulfilled") setServices(Array.isArray(sRes.value.data) ? sRes.value.data : []);
      if (cRes.status === "fulfilled") setCategories(Array.isArray(cRes.value.data) ? cRes.value.data : []);
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tenantId]);

  const stylists = useMemo(() => staff.filter((u) => u.role_id === 3), [staff]);
  const catName = useCallback((id: string) => categories.find((c) => c.id === id)?.name || "General", [categories]);
  const salonWeek = useMemo(() => parseSalonHours(tenant?.working_hours), [tenant]);

  // selección inicial de estilista al entrar a Horarios
  useEffect(() => {
    if (tab === "horarios" && !selStylist && stylists.length) setSelStylist(stylists[0].id);
  }, [tab, selStylist, stylists]);

  // cargar horario del estilista seleccionado
  useEffect(() => {
    if (!selStylist || selStylist in stylistHours) return;
    let alive = true;
    setStylistLoading(true);
    api.get(`/users/${selStylist}/working-hours`)
      .then(({ data }) => { if (alive) setStylistHours((p) => ({ ...p, [selStylist]: parseStylistHours(data) })); })
      .catch(() => { if (alive) setStylistHours((p) => ({ ...p, [selStylist]: null })); })
      .finally(() => { if (alive) setStylistLoading(false); });
    return () => { alive = false; };
  }, [selStylist, stylistHours]);

  if (!tenantId) return <Empty icon="⚙️" title="Sin negocio" hint="No hay un negocio seleccionado." />;
  if (loading) return <Loading label="Cargando configuración…" />;

  const plan = (tenant?.plan || "free").toLowerCase();

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "datos", label: "Datos" },
    { key: "personal", label: "Personal", count: staff.length },
    { key: "servicios", label: "Servicios", count: services.length },
    { key: "comisiones", label: "Comisiones" },
    { key: "horarios", label: "Horarios" },
    { key: "bot", label: "Bot" },
    { key: "planes", label: "Planes" },
  ];

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.7px" }}>Configuración</h1>
      <p style={{ margin: "5px 0 18px", color: T.muted, fontSize: 14 }}>
        Todo tu negocio en pestañas: personal, servicios, comisiones, horarios, bot y planes.
      </p>

      {/* barra de pestañas */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 22, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map((tb) => {
          const on = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                background: "transparent", border: 0, borderBottom: `2px solid ${on ? T.ink : "transparent"}`,
                color: on ? T.text : T.muted, fontWeight: 700, fontSize: 13.5, fontFamily: FONT,
                padding: "11px 13px", cursor: "pointer", marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {tb.label}
              {tb.count !== undefined && (
                <span style={{ background: on ? T.ink : T.surface3, color: on ? "#fff" : T.dim, fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 999 }}>{tb.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "datos" && <DatosTab tenant={tenant} />}
      {tab === "personal" && <PersonalTab staff={staff} salon={tenantName} />}
      {tab === "servicios" && <ServiciosTab services={services} catName={catName} />}
      {tab === "comisiones" && <ComisionesTab stylists={stylists} tenant={tenant} />}
      {tab === "horarios" && (
        <HorariosTab
          salonWeek={salonWeek}
          stylists={stylists}
          selStylist={selStylist}
          setSelStylist={setSelStylist}
          stylistHours={stylistHours}
          stylistLoading={stylistLoading}
        />
      )}
      {tab === "bot" && <BotTab salon={tenantName} />}
      {tab === "planes" && <PlanesTab plan={plan} />}
    </div>
  );
};

// ── DATOS ─────────────────────────────────────────────────────
const Field: React.FC<{ label: string; value: React.ReactNode; span2?: boolean }> = ({ label, value, span2 }) => (
  <div style={span2 ? { gridColumn: "span 2" } : undefined}>
    <label style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>{label}</label>
    <div style={{ marginTop: 6, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "11px 13px", fontSize: 13.5, fontWeight: 600, background: T.surface2 }}>
      {value || <span style={{ color: T.dim }}>—</span>}
    </div>
  </div>
);
const DatosTab: React.FC<{ tenant: Tenant | null }> = ({ tenant }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22 }}>
    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Datos de la peluquería</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Field label="Nombre" value={tenant?.name} />
      <Field label="Ciudad" value={tenant?.city} />
      <Field label="Teléfono" value={tenant?.phone} />
      <Field label="IVA (%)" value={tenant?.iva_rate != null ? `${tenant.iva_rate}%` : ""} />
      <Field label="Dirección" value={tenant?.address} span2 />
    </div>
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
      <button onClick={() => console.log("[v2] guardar datos (no-op)")} style={btnDark}>Guardar cambios</button>
    </div>
  </div>
);

// ── PERSONAL ──────────────────────────────────────────────────
const PersonalTab: React.FC<{ staff: Staff[]; salon: string }> = ({ staff, salon }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Tu personal</div>
        <div style={{ fontSize: 12.5, color: T.muted }}>Estilistas, cajeras y administradores. Cada uno con su rol y comisión.</div>
      </div>
      <button onClick={() => console.log("[v2] agregar personal (no-op)")} style={btnDark}>+ Agregar personal</button>
    </div>
    {staff.length === 0 ? (
      <Empty icon="👥" title="Sin personal" hint="Aún no hay personal registrado." />
    ) : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {staff.map((p) => {
          const r = roleOf(p.role_id);
          const name = `${p.first_name} ${p.last_name || ""}`.trim();
          const hasComm = p.role_id === 3 && p.commission_rate != null;
          return (
            <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xl, padding: 18, display: "flex", alignItems: "center", gap: 13 }}>
              <Avatar ini={initials(name)} color={colorFor(name)} size={46} radius={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                  <span style={{ background: r.bg, color: r.color, fontWeight: 700, fontSize: 11.5, padding: "3px 9px", borderRadius: 7 }}>{r.label}</span>
                  <span style={{ fontSize: 11.5, color: T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{salon}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flex: "none" }}>
                <Mono style={{ fontWeight: 800, fontSize: 15, color: hasComm ? T.green : T.dim }}>
                  {hasComm ? `${Math.round((p.commission_rate || 0) * 100)}%` : "—"}
                </Mono>
                <div style={{ fontSize: 10.5, color: T.dim }}>comisión</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </>
);

// ── SERVICIOS ─────────────────────────────────────────────────
const ServiciosTab: React.FC<{ services: Service[]; catName: (id: string) => string }> = ({ services, catName }) => (
  <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Servicios</div>
        <div style={{ fontSize: 12.5, color: T.muted }}>El menú que se cobra en el ticket. Precio y duración.</div>
      </div>
      <button onClick={() => console.log("[v2] agregar servicio (no-op)")} style={btnDark}>+ Agregar servicio</button>
    </div>
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "11px 20px", fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim, background: T.surface2 }}>
        <span>SERVICIO</span><span>CATEGORÍA</span><span style={{ textAlign: "center" }}>DURACIÓN</span><span style={{ textAlign: "right" }}>PRECIO</span>
      </div>
      {services.length === 0 ? (
        <Empty icon="✂️" title="Sin servicios" hint="Aún no hay servicios en el menú." />
      ) : services.map((s) => (
        <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", alignItems: "center", padding: "13px 20px", borderTop: `1px solid ${T.border3}` }}>
          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</span>
          <span>
            <span style={{ background: T.purpleBg2, color: T.purple, fontWeight: 700, fontSize: 10.5, padding: "3px 9px", borderRadius: 6 }}>{catName(s.category_id)}</span>
          </span>
          <span style={{ textAlign: "center", fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{s.duration_minutes} min</span>
          <Mono style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, color: T.green }}>{fmtCOP(s.price)}</Mono>
        </div>
      ))}
    </div>
  </>
);

// ── COMISIONES ────────────────────────────────────────────────
const ComisionesTab: React.FC<{ stylists: Staff[]; tenant: Tenant | null }> = ({ stylists, tenant }) => {
  const adminOn = !!tenant?.admin_fee_enabled;
  const adminPct = tenant?.admin_fee_percent;
  const prodOn = !!tenant?.products_for_staff_enabled;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 4 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💰</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Comisión por estilista</div>
          <div style={{ fontSize: 12.5, color: T.muted }}>Ej. servicio $80.000 → estilista 60% ($48.000), salón 40%.</div>
        </div>
      </div>
      <div style={{ marginTop: 14, border: `1px solid ${T.border2}`, borderRadius: R.lg, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", background: T.surface2, padding: "11px 16px", fontSize: 11, fontWeight: 700, letterSpacing: ".5px", color: T.dim }}>
          <span>ESTILISTA</span><span style={{ textAlign: "center" }}>% ESTILISTA</span><span style={{ textAlign: "center" }}>% SALÓN</span>
        </div>
        {stylists.length === 0 ? (
          <Empty icon="✂️" title="Sin estilistas" hint="Registra estilistas para definir comisiones." />
        ) : stylists.map((c) => {
          const name = `${c.first_name} ${c.last_name || ""}`.trim();
          const pct = c.commission_rate != null ? Math.round(c.commission_rate * 100) : null;
          return (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${T.border3}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar ini={initials(name)} color={colorFor(name)} size={28} radius={8} />
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{name}</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <Mono><span style={{ background: T.greenBg, color: T.green, fontWeight: 700, fontSize: 13, padding: "5px 12px", borderRadius: 8 }}>{pct != null ? `${pct}%` : "—"}</span></Mono>
              </div>
              <div style={{ textAlign: "center" }}>
                <Mono style={{ color: T.muted, fontWeight: 600, fontSize: 13 }}>{pct != null ? `${100 - pct}%` : "—"}</Mono>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: R.lg, padding: "14px 16px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>% Administrativo</div>
            <div style={{ fontSize: 11.5, color: T.dim }}>Sobre la parte del salón</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mono style={{ fontWeight: 700, fontSize: 15 }}>{adminOn && adminPct != null ? `${adminPct}%` : "—"}</Mono>
            <Toggle on={adminOn} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: R.lg, padding: "14px 16px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Comisión por productos</div>
            <div style={{ fontSize: 11.5, color: T.dim }}>Al vender producto al cliente</div>
          </div>
          <Toggle on={prodOn} />
        </div>
      </div>
    </div>
  );
};

// ── HORARIOS ──────────────────────────────────────────────────
const WeekGrid: React.FC<{ week: Record<string, DayHours> }> = ({ week }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8 }}>
    {DAYS.map((d) => {
      const h = week[d.key];
      const open = h && h.active;
      return (
        <div key={d.key} style={{ background: open ? T.surface : T.surface2, border: `1px solid ${open ? T.border : T.border3}`, borderRadius: R.md, padding: "10px 8px", textAlign: "center", opacity: open ? 1 : 0.7 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.dim }}>{d.short}</div>
          <Mono style={{ fontSize: 11, fontWeight: 600, marginTop: 6, display: "block", color: open ? T.text : T.dim }}>
            {open ? `${h.start}–${h.end}` : "Cerrado"}
          </Mono>
        </div>
      );
    })}
  </div>
);

const HorariosTab: React.FC<{
  salonWeek: Record<string, DayHours>;
  stylists: Staff[];
  selStylist: string | null;
  setSelStylist: (id: string) => void;
  stylistHours: Record<string, Record<string, DayHours> | null>;
  stylistLoading: boolean;
}> = ({ salonWeek, stylists, selStylist, setSelStylist, stylistHours, stylistLoading }) => {
  const raw = selStylist ? stylistHours[selStylist] : undefined;
  const inherits = selStylist != null && selStylist in stylistHours && raw == null;
  const week = raw || salonWeek; // si hereda, muestra el del salón

  return (
    <>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Horario de la peluquería</div>
        <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>Cuándo abre el salón. Limita la agenda y el bot de reservas.</div>
        {DAYS.map((d) => {
          const h = salonWeek[d.key];
          const open = h && h.active;
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 0", borderBottom: `1px solid ${T.border3}` }}>
              <span style={{ width: 90, fontWeight: 700, fontSize: 13.5 }}>{d.lbl}</span>
              <Toggle on={!!open} />
              <Mono style={{ fontSize: 13, color: open ? T.text : T.dim }}>{open ? `${h.start} – ${h.end}` : "Cerrado"}</Mono>
            </div>
          );
        })}
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Horario por estilista</div>
        <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>Cada quien su jornada. Si trabaja en otra sede a esa hora, no aparece disponible.</div>
        {stylists.length === 0 ? (
          <Empty icon="✂️" title="Sin estilistas" hint="Registra estilistas para ver su jornada." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {stylists.map((s) => {
                const name = `${s.first_name} ${s.last_name || ""}`.trim();
                const on = selStylist === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelStylist(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: FONT,
                      background: on ? T.ink : T.surface, color: on ? "#fff" : T.text,
                      border: `1px solid ${on ? T.ink : T.border}`, borderRadius: R.md, padding: "7px 11px", fontWeight: 700, fontSize: 12.5,
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: colorFor(name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 9.5 }}>{initials(name)}</span>
                    {name}
                  </button>
                );
              })}
            </div>
            {inherits && (
              <div style={{ fontSize: 12, color: T.dim, marginBottom: 10 }}>Hereda el horario del salón.</div>
            )}
            {stylistLoading && !(selStylist && selStylist in stylistHours) ? <Loading label="Cargando jornada…" /> : <WeekGrid week={week} />}
          </>
        )}
      </div>
    </>
  );
};

// ── BOT (vista fiel al mockup, semi-estática) ─────────────────
const chipTone = (on: boolean) => ({
  background: on ? T.ink : T.surface2, color: on ? "#fff" : T.muted,
  border: on ? "0" : `1px solid ${T.border}`, fontWeight: 700, fontSize: 12.5, padding: "8px 16px", borderRadius: 9,
});
const BotTab: React.FC<{ salon: string }> = ({ salon }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
      <span style={{ width: 36, height: 36, borderRadius: R.md, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Bot de WhatsApp</div>
        <div style={{ fontSize: 12.5, color: T.muted }}>Responde a tus clientes y agenda citas solo.</div>
      </div>
      <Toggle on={true} />
    </div>
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.muted }}>Mensaje de bienvenida</label>
      <div style={{ marginTop: 6, border: `1px solid ${T.border}`, borderRadius: R.md, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5, background: T.surface2, color: "#3a3f47" }}>
        ¡Hola! 👋 Soy el asistente de {salon || "tu peluquería"}. ¿Quieres agendar una cita? Dime el día y la hora que prefieres.
      </div>
    </div>
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: "block", marginBottom: 7 }}>Tono del bot</label>
      <div style={{ display: "flex", gap: 7 }}>
        <span style={chipTone(false)}>Formal</span>
        <span style={chipTone(true)}>Cercano</span>
        <span style={chipTone(false)}>Divertido</span>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: R.lg, padding: "14px 16px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Puede agendar citas</div>
          <div style={{ fontSize: 11.5, color: T.dim }}>Crea la cita en la agenda</div>
        </div>
        <Toggle on={true} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}`, borderRadius: R.lg, padding: "14px 16px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Responde fuera de horario</div>
          <div style={{ fontSize: 11.5, color: T.dim }}>Atiende 24/7 aunque esté cerrado</div>
        </div>
        <Toggle on={true} />
      </div>
    </div>
  </div>
);

// ── PLANES ────────────────────────────────────────────────────
const PlanesTab: React.FC<{ plan: string }> = ({ plan }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
    {PLANS.map((pl) => {
      const current = pl.key === plan;
      return (
        <div key={pl.key} style={{ position: "relative", background: current ? T.ink : T.surface, color: current ? "#fff" : T.text, border: current ? "0" : `1px solid ${T.border}`, borderRadius: R.xxl, padding: 22 }}>
          {current && (
            <span style={{ position: "absolute", top: 16, right: 16, background: T.green, color: "#fff", fontWeight: 700, fontSize: 10.5, padding: "4px 10px", borderRadius: 7 }}>TU PLAN</span>
          )}
          <div style={{ fontWeight: 800, fontSize: 16 }}>{pl.name}</div>
          <div style={{ margin: "10px 0 4px" }}>
            <Mono style={{ fontSize: 30, fontWeight: 800 }}>{pl.price}</Mono>
            <span style={{ fontSize: 12.5, color: current ? "rgba(255,255,255,.6)" : T.muted }}>/mes</span>
          </div>
          <div style={{ fontSize: 12.5, color: current ? "rgba(255,255,255,.7)" : T.muted, marginBottom: 16 }}>{pl.desc}</div>
          {pl.feats.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", fontSize: 13, color: current ? "rgba(255,255,255,.9)" : T.text }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={current ? "#fff" : T.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
              {f}
            </div>
          ))}
          <button
            onClick={() => console.log("[v2] cambiar plan (no-op)", pl.key)}
            style={{
              width: "100%", marginTop: 16, borderRadius: R.md, padding: "11px 16px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer",
              border: current ? "1px solid rgba(255,255,255,.3)" : `1px solid ${T.border}`,
              background: current ? "transparent" : (pl.key === "enterprise" ? T.ink : T.surface),
              color: current ? "#fff" : (pl.key === "enterprise" ? "#fff" : T.text),
            }}
          >
            {current ? "Plan actual" : "Elegir plan"}
          </button>
        </div>
      );
    })}
  </div>
);

const btnDark: React.CSSProperties = { background: T.ink, color: "#fff", border: 0, borderRadius: R.md, padding: "11px 18px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" };

export default Configuracion;
