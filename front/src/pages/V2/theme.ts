// V2 — Rediseño "Luxe claro" de Tupelukeria (mockup Tupelukeria.dc.html de Claude Design).
// Tokens de diseño extraídos del mockup. Todas las pantallas de /v2 los reutilizan
// para que el shell y cada sección sean visualmente consistentes.

export const T = {
  // superficies
  bg: "#f4f4f1",
  surface: "#ffffff",
  surface2: "#fafafa",
  surface3: "#f0efeb",
  // texto
  text: "#15171c",
  muted: "#80858d",
  dim: "#a3a3ac",
  faint: "#b3b3ad",
  // bordes
  border: "#e7e7e2",
  border2: "#eeeeea",
  border3: "#f3f3ef",
  // marca / acento oscuro (botones primarios, logos)
  ink: "#15171c",
  // verde (dinero, éxito)
  green: "#14a05a",
  greenDark: "#0f7a44",
  greenBg: "#e7f6ee",
  greenBg2: "#ecfaf1",
  greenBorder: "#bfe9d0",
  // morado / azul (info, IA)
  purple: "#6d5ce7",
  purple2: "#5b6ef5",
  purpleBg: "#eef0fe",
  purpleBg2: "#f0ecfb",
  purpleBorder: "#d4d9fb",
  // ámbar (advertencia, abierto)
  amber: "#e0892a",
  amberBg: "#fff2e3",
  // rojo (peligro, egresos)
  red: "#d04444",
  red2: "#e0392b",
  redBg: "#fdf4f4",
  redBg2: "#fdf0f0",
  redBorder: "#f0dcdc",
} as const;

export const FONT = "'Plus Jakarta Sans',system-ui,-apple-system,sans-serif";
export const MONO = "'JetBrains Mono',monospace";

// radios
export const R = { sm: 8, md: 11, lg: 13, xl: 16, xxl: 18, pill: 999 } as const;

// ── helpers de formato ──────────────────────────────────────
export const fmtCOP = (n: number): string =>
  `$ ${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

export const fmtCOPShort = (n: number): string => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$ ${Math.round(v / 1000)}k`;
  return `$ ${Math.round(v)}`;
};

export const initials = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// color estable por string (para avatares)
const AV_COLORS = ["#6d5ce7", "#2f6fed", "#e0892a", "#14a05a", "#d04444", "#8b5cf6", "#0ea5a4", "#db2777"];
export const colorFor = (s: string): string => {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
};

// estilos reutilizables (objetos de estilo React)
export const card: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: R.xl,
};

export const btnPrimary: React.CSSProperties = {
  background: T.ink,
  color: "#fff",
  border: 0,
  borderRadius: R.md,
  padding: "11px 16px",
  fontWeight: 700,
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
};

export const btnGhost: React.CSSProperties = {
  background: T.surface,
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: R.md,
  padding: "11px 16px",
  fontWeight: 700,
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
};

export const h1: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: "-.7px",
};

export const sub: React.CSSProperties = {
  margin: "5px 0 18px",
  color: T.muted,
  fontSize: 14,
};
