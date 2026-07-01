// /v2 — Rediseño "Luxe claro" de Tupelukeria. Shell: sidebar + header + drawer IA.
// Cada sección es una pantalla propia bajo screens/, cableada a datos reales.
import React, { useState, useMemo, useEffect } from "react";
import { T, FONT, MONO, colorFor, V2_THEME_CSS } from "./theme";
import { SectionKey } from "./types";
import { useTenant, useCurrentUser, todayISO } from "./data/useV2Data";
import AIDrawer from "./components/AIDrawer";
import SedeSwitcher from "./components/SedeSwitcher";
import Operacion from "./screens/Operacion";
import Clientes from "./screens/Clientes";
import Inventario from "./screens/Inventario";
import Nomina from "./screens/Nomina";
import Configuracion from "./screens/Configuracion";

const fmtDateLong = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${dias[d.getDay()]} · ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const shiftDate = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Sidebar ──────────────────────────────────────────────────
const NAV: { key: SectionKey; label: string; group: string; icon: React.ReactNode }[] = [
  { key: "op", group: "EL DÍA", label: "Operación", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6.5h18M3 12h18M3 17.5h18" /></svg> },
  { key: "crm", group: "GESTIÓN", label: "Clientes", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3 3 0 0 1 0 5.6M17 14.5a6 6 0 0 1 4.5 5.5" /></svg> },
  { key: "inv", group: "GESTIÓN", label: "Inventario", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></svg> },
  { key: "nomina", group: "GESTIÓN", label: "Nómina", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /></svg> },
  { key: "config", group: "AJUSTES", label: "Configuración", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4" /></svg> },
];

const BrandMark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.3, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-12H12z" /></svg>
  </div>
);

const V2: React.FC = () => {
  const [section, setSection] = useState<SectionKey>("op");
  const [date, setDate] = useState<string>(todayISO());
  const [showAI, setShowAI] = useState(false);
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("v2-theme") === "dark");
  const tenant = useTenant();
  const user = useCurrentUser();

  document.title = "Tupelukeria · v2";

  useEffect(() => {
    document.documentElement.setAttribute("data-v2-theme", dark ? "dark" : "light");
    localStorage.setItem("v2-theme", dark ? "dark" : "light");
  }, [dark]);

  const goTo = (s: SectionKey) => setSection(s);
  const screenProps = { tenantId: tenant.id, tenantName: tenant.name, date, onOpenAI: () => setShowAI(true), goTo };

  const Screen = useMemo(() => {
    switch (section) {
      case "crm": return <Clientes {...screenProps} />;
      case "inv": return <Inventario {...screenProps} />;
      case "nomina": return <Nomina {...screenProps} />;
      case "config": return <Configuracion {...screenProps} />;
      default: return <Operacion {...screenProps} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, tenant.id, tenant.name, date]);

  // agrupar nav por sección
  const groups: string[] = [];
  NAV.forEach((n) => { if (!groups.includes(n.group)) groups.push(n.group); });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: FONT, WebkitFontSmoothing: "antialiased" }}>
      <style>{V2_THEME_CSS}</style>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .v2-mono{font-family:${MONO};font-feature-settings:'tnum'}
        .v2-nav:hover{background:var(--v2-surface3)}
        .v2-root ::-webkit-scrollbar{width:9px;height:9px}
        .v2-root ::-webkit-scrollbar-thumb{background:rgba(0,0,0,.13);border-radius:8px}
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 236, flex: "none", background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 14px", display: "flex", alignItems: "center", gap: 9 }}>
          <BrandMark />
          <div style={{ fontWeight: 800, fontSize: 15.5, letterSpacing: "-.4px" }}>
            tupelukeria<span style={{ color: T.dim, fontWeight: 600 }}>.com</span>
          </div>
        </div>

        <div style={{ padding: "6px 14px 8px" }}>
          <button onClick={() => setSection("op")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, justifyContent: "center", background: T.ink, color: "#fff", border: 0, borderRadius: 12, padding: 11, fontWeight: 700, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg> Nueva atención
          </button>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", flex: 1 }}>
          {groups.map((g) => (
            <React.Fragment key={g}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.1px", color: T.faint, padding: "12px 10px 7px" }}>{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = n.key === section;
                return (
                  <a
                    key={n.key}
                    className="v2-nav"
                    onClick={() => setSection(n.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, padding: "10px 10px", borderRadius: 10,
                      cursor: "pointer", textDecoration: "none",
                      color: active ? T.text : T.muted,
                      background: active ? T.surface3 : "transparent",
                      fontWeight: active ? 700 : 600, fontSize: 13.5,
                    }}
                  >
                    {n.icon}
                    <span style={{ flex: 1 }}>{n.label}</span>
                  </a>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div style={{ padding: 12, margin: "0 12px 14px", borderTop: `1px solid ${T.border2}`, paddingTop: 14 }}>
          <SedeSwitcher name={tenant.name} city={tenant.city} />
        </div>
      </aside>

      {/* Main column */}
      <div className="v2-root" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 62, flex: "none", background: T.bg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14, padding: "0 26px", position: "sticky", top: 0, zIndex: 30 }}>
          {/* Date nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "7px 8px" }}>
            <button onClick={() => setDate(shiftDate(date, -1))} style={{ border: 0, background: "transparent", cursor: "pointer", display: "flex", color: T.muted }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <span style={{ fontWeight: 700, fontSize: 13.5, padding: "0 4px" }}>{fmtDateLong(date)}</span>
            <button onClick={() => setDate(shiftDate(date, 1))} style={{ border: 0, background: "transparent", cursor: "pointer", display: "flex", color: T.muted }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <button onClick={() => setDate(todayISO())} style={{ border: 0, background: "transparent", color: T.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>Hoy</button>

          <div style={{ display: "flex", alignItems: "center", gap: 9, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 11, padding: "9px 13px", width: 240, color: T.dim, fontSize: 13.5 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
            <span>Buscar cliente, ticket o estilista…</span>
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => setShowAI(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: T.ink, color: "#fff", border: 0, borderRadius: 11, padding: "10px 15px", fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c4b5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z" /></svg>
            Hablar con IA
          </button>

          <button onClick={() => setDark((d) => !d)} title={dark ? "Modo claro" : "Modo oscuro"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, background: T.surface, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 11, cursor: "pointer", flex: "none" }}>
            {dark
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.3" /><path d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" /></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>}
          </button>

          <div style={{ width: 1, height: 26, background: T.border }} />

          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: colorFor(user.name), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
              {user.initials}
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: T.dim }}>{user.roleLabel}</div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "26px 30px 60px", overflow: "auto" }}>{Screen}</main>
      </div>

      <AIDrawer open={showAI} onClose={() => setShowAI(false)} userName={user.name} />
    </div>
  );
};

export default V2;
