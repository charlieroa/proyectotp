// Primitivos UI compartidos del rediseño /v2. Los importan todas las pantallas
// para mantener consistencia visual con el mockup.
import React from "react";
import { T, R, MONO, FONT } from "../theme";

// KPI card (tarjeta de métrica)
export const Kpi: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  valueColor?: string;
  dark?: boolean;
}> = ({ label, value, sub, icon, valueColor, dark }) => (
  <div
    style={{
      background: dark ? T.ink : T.surface,
      border: dark ? "none" : `1px solid ${T.border}`,
      borderRadius: R.xl,
      padding: "15px 17px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 12,
        color: dark ? "rgba(255,255,255,.6)" : T.muted,
        fontWeight: 600,
      }}
    >
      {icon}
      {label}
    </div>
    <div
      className="mono"
      style={{
        fontFamily: MONO,
        fontSize: 21,
        fontWeight: 800,
        marginTop: 6,
        color: valueColor || (dark ? T.onInk : T.text),
      }}
    >
      {value}
    </div>
    {sub !== undefined && (
      <div style={{ fontSize: 12, color: dark ? "rgba(255,255,255,.5)" : T.faint, marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

export const KpiGrid: React.FC<{ cols?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  cols = 4,
  children,
  style,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 14,
      marginBottom: 18,
      ...style,
    }}
  >
    {children}
  </div>
);

// Avatar cuadrado con iniciales
export const Avatar: React.FC<{ ini: string; color: string; size?: number; radius?: number }> = ({
  ini,
  color,
  size = 44,
  radius = 13,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: color,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: size * 0.34,
      flex: "none",
    }}
  >
    {ini}
  </div>
);

// Badge / pill de estado
export const Badge: React.FC<{ children: React.ReactNode; color?: string; bg?: string; style?: React.CSSProperties }> = ({
  children,
  color = T.purple,
  bg = T.purpleBg2,
  style,
}) => (
  <span
    style={{
      background: bg,
      color,
      fontWeight: 700,
      fontSize: 11,
      padding: "4px 9px",
      borderRadius: 7,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

// Panel/tarjeta contenedora con título opcional
export const Panel: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  right,
  children,
  style,
}) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: R.xxl, overflow: "hidden", ...style }}>
    {(title || right) && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "15px 20px",
          borderBottom: `1px solid ${T.border2}`,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 15 }}>{title}</span>
        {right}
      </div>
    )}
    {children}
  </div>
);

// Toggle switch (visual)
export const Toggle: React.FC<{ on: boolean; onClick?: () => void }> = ({ on, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 42,
      height: 24,
      borderRadius: 12,
      background: on ? T.green : "#d8d8d2",
      position: "relative",
      border: 0,
      cursor: onClick ? "pointer" : "default",
      flex: "none",
      transition: "background .15s",
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 2,
        left: on ? 20 : 2,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        transition: "left .15s",
      }}
    />
  </button>
);

// Estado de carga / vacío
export const Loading: React.FC<{ label?: string }> = ({ label = "Cargando…" }) => (
  <div style={{ padding: 40, textAlign: "center", color: T.muted, fontFamily: FONT, fontSize: 14 }}>{label}</div>
);

export const Empty: React.FC<{ icon?: string; title: string; hint?: string }> = ({ icon = "📭", title, hint }) => (
  <div style={{ padding: "44px 20px", textAlign: "center" }}>
    <div style={{ fontSize: 30 }}>{icon}</div>
    <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{title}</div>
    {hint && <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{hint}</div>}
  </div>
);

// mono span helper
export const Mono: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span className="mono" style={{ fontFamily: MONO, ...style }}>
    {children}
  </span>
);
