// V2 — Rediseño "Luxe claro" de Tupelukeria (mockup Tupelukeria.dc.html de Claude Design).
// Tokens de diseño extraídos del mockup. Todas las pantallas de /v2 los reutilizan
// para que el shell y cada sección sean visualmente consistentes.

// Los tokens apuntan a variables CSS (--v2-*) para soportar modo claro/oscuro
// sin tocar cada pantalla. Las paletas viven en V2_THEME_CSS (abajo) y se
// alternan con [data-v2-theme="dark"] en <html>. onWhite/onInk son colores
// que NO cambian con el tema (texto sobre superficies de acento fijas).
export const T = {
  // superficies
  bg: "var(--v2-bg)",
  surface: "var(--v2-surface)",
  surface2: "var(--v2-surface2)",
  surface3: "var(--v2-surface3)",
  // texto
  text: "var(--v2-text)",
  muted: "var(--v2-muted)",
  dim: "var(--v2-dim)",
  faint: "var(--v2-faint)",
  // bordes
  border: "var(--v2-border)",
  border2: "var(--v2-border2)",
  border3: "var(--v2-border3)",
  // marca / acento oscuro (botones primarios, logos)
  ink: "var(--v2-ink)",
  onInk: "var(--v2-on-ink)", // texto/íconos sobre superficies "ink"
  // verde (dinero, éxito)
  green: "var(--v2-green)",
  greenDark: "var(--v2-green-dark)",
  greenBg: "var(--v2-green-bg)",
  greenBg2: "var(--v2-green-bg2)",
  greenBorder: "var(--v2-green-border)",
  // morado / azul (info, IA)
  purple: "var(--v2-purple)",
  purple2: "var(--v2-purple2)",
  purpleBg: "var(--v2-purple-bg)",
  purpleBg2: "var(--v2-purple-bg2)",
  purpleBorder: "var(--v2-purple-border)",
  // ámbar (advertencia, abierto)
  amber: "var(--v2-amber)",
  amberBg: "var(--v2-amber-bg)",
  // rojo (peligro, egresos)
  red: "var(--v2-red)",
  red2: "var(--v2-red2)",
  redBg: "var(--v2-red-bg)",
  redBg2: "var(--v2-red-bg2)",
  redBorder: "var(--v2-red-border)",
} as const;

// Paletas light/dark. Se inyecta una vez en el shell de /v2 (index.tsx).
export const V2_THEME_CSS = `
:root{
  --v2-bg:#f4f4f1; --v2-surface:#ffffff; --v2-surface2:#fafafa; --v2-surface3:#f0efeb;
  --v2-text:#15171c; --v2-muted:#80858d; --v2-dim:#a3a3ac; --v2-faint:#b3b3ad;
  --v2-border:#e7e7e2; --v2-border2:#eeeeea; --v2-border3:#f3f3ef;
  --v2-ink:#15171c; --v2-on-ink:#ffffff;
  --v2-green:#14a05a; --v2-green-dark:#0f7a44; --v2-green-bg:#e7f6ee; --v2-green-bg2:#ecfaf1; --v2-green-border:#bfe9d0;
  --v2-purple:#6d5ce7; --v2-purple2:#5b6ef5; --v2-purple-bg:#eef0fe; --v2-purple-bg2:#f0ecfb; --v2-purple-border:#d4d9fb;
  --v2-amber:#e0892a; --v2-amber-bg:#fff2e3;
  --v2-red:#d04444; --v2-red2:#e0392b; --v2-red-bg:#fdf4f4; --v2-red-bg2:#fdf0f0; --v2-red-border:#f0dcdc;
}
[data-v2-theme="dark"]{
  --v2-bg:#0e1013; --v2-surface:#171a1f; --v2-surface2:#1c2026; --v2-surface3:#22262d;
  --v2-text:#f2f3f1; --v2-muted:#9198a1; --v2-dim:#6b7078; --v2-faint:#565b62;
  --v2-border:#2a2f37; --v2-border2:#242830; --v2-border3:#1e2229;
  --v2-ink:#2e333c; --v2-on-ink:#ffffff;
  --v2-green:#2bb56e; --v2-green-dark:#34c47a; --v2-green-bg:#10281c; --v2-green-bg2:#12241a; --v2-green-border:#1f4d34;
  --v2-purple:#8b7cf0; --v2-purple2:#7d8cf7; --v2-purple-bg:#1a1d33; --v2-purple-bg2:#201d33; --v2-purple-border:#33385e;
  --v2-amber:#eaa24a; --v2-amber-bg:#33260f;
  --v2-red:#e0605f; --v2-red2:#ef5548; --v2-red-bg:#2e1717; --v2-red-bg2:#2e1515; --v2-red-border:#4a2a2a;
}
`;

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
