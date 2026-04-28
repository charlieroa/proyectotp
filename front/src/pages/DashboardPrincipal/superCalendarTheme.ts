// Tokens y helpers compartidos del SuperCalendar y vistas hermanas.
// Inspirado en el mockup Luxe (variants A/B) pero traducido a light theme
// para alinear con el resto del app (Velzon/Bootstrap).

export const SC = {
  // Surfaces
  bg: "#f9fafb",
  surface: "#ffffff",
  surface2: "#f3f4f6",
  border: "#f1f5f9",
  border2: "#e5e7eb",

  // Text
  text: "#1f2937",
  muted: "#6b7280",
  dim: "#9ca3af",

  // Accents
  ink: "#0a0a0a",          // CTA tipo mockup (negro alto contraste)
  success: "#059669",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  warn: "#b45309",
  warnBg: "#fffbeb",
  warnBorder: "#fde68a",
  danger: "#b91c1c",
  dangerBg: "#fef2f2",
  dangerBorder: "#fecaca",
  info: "#0891b2",
  infoBg: "#ecfeff",
  infoBorder: "#a5f3fc",

  // Status pills
  statusColor: {
    scheduled: "#9ca3af",
    rescheduled: "#9ca3af",
    pending_approval: "#a78bfa",
    checked_in: "#f59e0b",
    checked_out: "#06b6d4",
    completed: "#059669",
    cancelled: "#ef4444",
  } as Record<string, string>,
};

// Type scale
export const FS = { xs: 9, sm: 11, base: 12, md: 13, lg: 14, xl: 16, h2: 18, h1: 22, hero: 28 };
// Spacing
export const SP = { xs: 4, sm: 6, md: 8, lg: 12, xl: 14, xxl: 16, xxxl: 20 };
// Radii
export const RAD = { sm: 6, md: 8, lg: 12, xl: 14, xxl: 18, pill: 999 };

// ── Helpers compartidos ────────────────────────────────────
const AVATAR_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#0ea5e9", "#a855f7",
];

export function colorFromString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
