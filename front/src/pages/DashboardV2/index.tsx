// DashboardV2 — réplica del prototipo standalone (usaeste.html) con
// los estilos del proyecto (reactstrap + Bootstrap utilities + tokens
// SC del SuperCalendar). Datos placeholder; la lógica del dashboard 1
// se conectará en el siguiente paso (endpoints /dashboard-v2/*).
import React from "react";
import { Container, Card, CardBody, Button, Input } from "reactstrap";
import {
  SC,
  FS,
  SP,
  RAD,
  getInitials,
  colorFromString,
} from "../DashboardPrincipal/superCalendarTheme";

// ─── Mock data ─────────────────────────────────────────────
const BRANCHES = [
  {
    id: "centro",
    name: "Centro",
    color: "#4f46e5",
    sub: "5/6 estilistas · 24 citas",
    pill: { text: "Viendo", status: "checked_in" as const },
    kpis: { ingreso: "$ 1.8M", cobrado: "$ 1.4M", tickets: "3 abiertos" },
    alerts: [
      { tone: "amber" as const, icon: "ri-alarm-warning-line", label: "44 tickets sin cobrar", value: "$ 2.3M" },
      { tone: "red" as const, icon: "ri-archive-line", label: "Stock bajo", value: "145 prods" },
    ],
  },
  {
    id: "norte",
    name: "Norte",
    color: "#0d9488",
    sub: "3/4 estilistas · 16 citas",
    pill: null,
    kpis: { ingreso: "$ 980k", cobrado: "$ 820k", tickets: "1 abiertos" },
    alerts: [
      { tone: "amber" as const, icon: "ri-alarm-warning-line", label: "12 tickets sin cobrar", value: "$ 540k" },
    ],
  },
  {
    id: "sur",
    name: "Sur",
    color: "#c026d3",
    sub: "0/3 estilistas · 0 citas",
    pill: null,
    kpis: { ingreso: "$ 0", cobrado: "$ 0", tickets: "0 abiertos" },
    alerts: [
      { tone: "amber" as const, icon: "ri-alarm-warning-line", label: "8 tickets sin cobrar", value: "$ 320k" },
      { tone: "red" as const, icon: "ri-archive-line", label: "Stock bajo", value: "22 prods" },
    ],
  },
];

type Appt = {
  time: string;
  title: string;
  client: string;
  initials: string;
  present?: boolean;
  ref?: string;
  price?: string;
};

const TIMELINE: { hour: string; isNow?: boolean; items: Appt[] }[] = [
  { hour: "08:00", items: [{ time: "08:30", title: "Maquillaje social", client: "Carolina Arce · Martha Mendoza", initials: "MM", present: true, ref: "T-1041" }] },
  {
    hour: "09:00",
    items: [
      { time: "09:00", title: "Color completo", client: "Juana Pérez · Karen Ruiz", initials: "KR", present: true, ref: "T-1043" },
      { time: "09:00", title: "Corte de damas", client: "Andrea Mejía · Fernando Quiroz", initials: "FQ", present: true, price: "$ 40k" },
      { time: "09:30", title: "Manicure semi", client: "Daniela Cruz · Marlen Rojas", initials: "MR", present: true, price: "$ 55k" },
      { time: "09:30", title: "Mechas californianas", client: "Tatiana Reyes · Luisa Patiño", initials: "LP", present: true, ref: "T-1047" },
    ],
  },
  {
    hour: "10:00",
    items: [
      { time: "10:00", title: "Corte de caballero", client: "Sergio Pinto · Fernando Quiroz", initials: "FQ", present: true, price: "$ 35k" },
      { time: "10:00", title: "Corte infantil", client: "Mateo (8) · Daniela Soto", initials: "DS", price: "$ 30k" },
      { time: "10:30", title: "Tinte raíz", client: "Mariana Sosa · Karen Ruiz", initials: "KR", present: true, ref: "T-1061" },
    ],
  },
  {
    hour: "11:00",
    items: [
      { time: "11:00", title: "Corte + barba", client: "Juan D. Gómez · Fernando Quiroz", initials: "FQ", present: true, price: "$ 55k" },
      { time: "11:00", title: "Pedicure", client: "Camila Estrada · Marlen Rojas", initials: "MR", present: true, price: "$ 60k" },
      { time: "11:00", title: "Maquillaje novia", client: "Isabela P. · Martha Mendoza", initials: "MM", present: true, price: "$ 280k" },
    ],
  },
  {
    hour: "12:00",
    items: [
      { time: "12:00", title: "Balayage", client: "Camila Ríos · Karen Ruiz", initials: "KR", present: true, ref: "T-1052" },
      { time: "12:00", title: "Tinte raíz", client: "Sandra Roldán · Luisa Patiño", initials: "LP", present: true, price: "$ 95k" },
    ],
  },
  {
    hour: "13:00",
    items: [
      { time: "13:00", title: "Corte de damas", client: "Patricia Niño · Fernando Quiroz", initials: "FQ", present: true, ref: "T-1058" },
      { time: "13:00", title: "Corte de damas", client: "Helena S. · Daniela Soto", initials: "DS", price: "$ 40k" },
      { time: "13:30", title: "Mani + Pedi", client: "Laura Arias · Marlen Rojas", initials: "MR", present: true, price: "$ 95k" },
    ],
  },
  {
    hour: "14:00",
    isNow: true,
    items: [
      { time: "14:00", title: "Cejas + pestañas", client: "Lina Castro · Martha Mendoza", initials: "MM", present: true, price: "$ 80k" },
      { time: "14:30", title: "Corte + brushing", client: "Lina Ortiz · Karen Ruiz", initials: "KR", present: true, price: "$ 75k" },
      { time: "14:30", title: "Corte + tratamiento", client: "Diana Marín · Luisa Patiño", initials: "LP", present: true, price: "$ 110k" },
    ],
  },
  { hour: "15:00", items: [{ time: "15:00", title: "Corte infantil", client: "Tomás (5) · Fernando Quiroz", initials: "FQ", present: true, price: "$ 30k" }] },
  {
    hour: "16:00",
    items: [
      { time: "16:00", title: "Hidratación", client: "Sara Bermudez · Karen Ruiz", initials: "KR", present: true, price: "$ 60k" },
      { time: "16:00", title: "Manicure clásico", client: "Ana M. Vega · Marlen Rojas", initials: "MR", present: true, price: "$ 35k" },
    ],
  },
];

type Ticket = {
  client: string;
  ref: string;
  meta: string;
  stylists: string[];
  amount: string;
  cobrar?: boolean;
};

const TICKETS = {
  enCobro: [
    { client: "Camila Ríos", ref: "T-1052", meta: "12:00 · 3 items · desde cita", stylists: ["KR", "MR"], amount: "$ 360.000", cobrar: true },
    { client: "Mariana Sosa", ref: "T-1061", meta: "10:30 · 1 item · desde cita", stylists: ["KR"], amount: "$ 95.000", cobrar: true },
  ] as Ticket[],
  abiertos: [
    { client: "Patricia Niño", ref: "T-1058", meta: "13:00 · 1 item · desde cita", stylists: ["FQ"], amount: "$ 40.000" },
  ] as Ticket[],
  pagadosHoy: [
    { client: "Carolina Arce", ref: "T-1041", meta: "08:30 · 1 item · desde cita", stylists: ["MM"], amount: "$ 150.000" },
    { client: "Juana Pérez", ref: "T-1043", meta: "09:00 · 1 item · desde cita", stylists: ["KR"], amount: "$ 180.000" },
    { client: "Tatiana Reyes", ref: "T-1047", meta: "09:30 · 2 items · desde cita", stylists: ["LP"], amount: "$ 312.000" },
  ] as Ticket[],
};

const FOOTER_KPIS = [
  { icon: "ri-team-line", label: "En salón", value: "8/13" },
  { icon: "ri-calendar-event-line", label: "Citas hoy", value: "40", sub: "3 en curso" },
  { icon: "ri-checkbox-circle-line", label: "Cobrado", value: "$ 2.3M" },
  { icon: "ri-money-dollar-circle-line", label: "Facturado", value: "$ 2.8M" },
  { icon: "ri-bill-line", label: "Sin cobrar", value: "64", sub: "$ 3.1M" },
  { icon: "ri-archive-line", label: "Stock bajo", value: "167", sub: "productos" },
];

// ─── Helpers ───────────────────────────────────────────────
const ALERT_TONE: Record<string, { icon: string; bg: string; bd: string }> = {
  amber: { icon: SC.warn, bg: SC.warnBg, bd: SC.warnBorder },
  red: { icon: SC.danger, bg: SC.dangerBg, bd: SC.dangerBorder },
  cyan: { icon: SC.info, bg: SC.infoBg, bd: SC.infoBorder },
};

// ─── Page ──────────────────────────────────────────────────
const DashboardV2: React.FC = () => {
  document.title = "Dashboard v2 | Tupelukeria";

  return (
    <div className="page-content page-content-flush">
      <style>{`
        .dv2-row:hover { background: ${SC.surface2}; }
        .dv2-pulse {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${SC.danger};
          display: inline-block;
          animation: dv2-pulse 1.5s infinite;
        }
        @keyframes dv2-pulse {
          0%   { box-shadow: 0 0 0 0 ${SC.danger}80; }
          70%  { box-shadow: 0 0 0 7px ${SC.danger}00; }
          100% { box-shadow: 0 0 0 0 ${SC.danger}00; }
        }
      `}</style>

      <Container fluid>
        <Toolbar />

        {/* Grid 3 sucursales */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: SP.xxl,
            marginTop: SP.lg,
          }}
        >
          {BRANCHES.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>

        {/* Card: Agenda · Centro */}
        <Card className="border shadow-sm mt-3">
          <CardBody className="p-0">
            <SectionTitle
              dotColor={BRANCHES[0].color}
              label="Agenda · Centro"
              count={24}
              right={
                <>
                  <div className="d-inline-flex" style={{ border: `1px solid ${SC.border2}`, borderRadius: RAD.sm, overflow: "hidden" }}>
                    <button
                      type="button"
                      className="border-0"
                      style={{ height: 26, padding: "0 10px", background: SC.surface2, color: SC.text, fontSize: FS.sm }}
                    >
                      <i className="ri-list-check" />
                    </button>
                    <button
                      type="button"
                      className="border-0"
                      style={{ height: 26, padding: "0 10px", background: "transparent", color: SC.muted, fontSize: FS.sm, borderLeft: `1px solid ${SC.border2}` }}
                    >
                      <i className="ri-calendar-2-line" />
                    </button>
                  </div>
                  <Input type="select" bsSize="sm" defaultValue="centro" style={{ maxWidth: 120, height: 28 }}>
                    <option value="centro">Centro</option>
                    <option value="norte">Norte</option>
                    <option value="sur">Sur</option>
                  </Input>
                </>
              }
            />
            <Timeline items={TIMELINE} />
          </CardBody>
        </Card>

        {/* Card: Tickets · Centro */}
        <Card className="border shadow-sm mt-3">
          <CardBody className="p-0">
            <SectionTitle
              dotColor={BRANCHES[0].color}
              icon="ri-file-list-3-line"
              label="Tickets · Centro"
              count={3}
              right={
                <>
                  <span className="dv2-pulse" />
                  <Button color="dark" size="sm" className="d-inline-flex align-items-center gap-1">
                    <i className="ri-add-line" /> Abrir ticket
                  </Button>
                </>
              }
            />
            <TicketGroup title="En cobro" count={2} icon="ri-coins-line" items={TICKETS.enCobro} branchColor={BRANCHES[0].color} />
            <TicketGroup title="Abiertos" count={1} icon="ri-file-list-3-line" items={TICKETS.abiertos} branchColor={BRANCHES[0].color} />
            <TicketGroup title="Pagados hoy" count={3} icon="ri-checkbox-circle-line" items={TICKETS.pagadosHoy} branchColor={BRANCHES[0].color} />
          </CardBody>
        </Card>

        {/* Footer KPI band */}
        <Card className="border shadow-sm mt-3 mb-3">
          <CardBody className="p-0">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              }}
            >
              {FOOTER_KPIS.map((k, i) => (
                <CompactKpi key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} divider={i < FOOTER_KPIS.length - 1} />
              ))}
            </div>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

// ─── Toolbar ───────────────────────────────────────────────
const Toolbar: React.FC = () => (
  <div
    className="d-flex flex-wrap align-items-center gap-2 mb-3 p-3"
    style={{ background: SC.surface, border: `1px solid ${SC.border}`, borderRadius: RAD.md }}
  >
    <h1 className="m-0" style={{ fontSize: FS.h2, fontWeight: 600, letterSpacing: "-0.015em", color: SC.text }}>
      Hoy · Mar 28 Abr 2026
    </h1>
    <div className="d-flex align-items-center gap-1">
      <Button color="light" size="sm" className="border" style={{ width: 28, height: 28, padding: 0 }}>
        <i className="ri-arrow-left-s-line" />
      </Button>
      <Input type="date" bsSize="sm" defaultValue="2026-04-28" style={{ maxWidth: 150, height: 28 }} />
      <Button color="light" size="sm" className="border" style={{ width: 28, height: 28, padding: 0 }}>
        <i className="ri-arrow-right-s-line" />
      </Button>
      <Button color="link" size="sm" className="text-muted px-2">
        Hoy
      </Button>
    </div>
    <label className="d-inline-flex align-items-center gap-1 m-0" style={{ fontSize: FS.sm, color: SC.muted, fontWeight: 500 }}>
      <input type="checkbox" defaultChecked={false} /> Auto-refresh 60s
    </label>
    <div className="flex-grow-1" />
    <Input bsSize="sm" placeholder="Buscar cliente, ticket, estilista..." style={{ maxWidth: 280, height: 28 }} />
    <Button color="dark" size="sm" className="d-inline-flex align-items-center gap-1">
      <i className="ri-add-line" /> Nueva cita
    </Button>
  </div>
);

// ─── Section title (reusable card header) ──────────────────
const SectionTitle: React.FC<{
  dotColor: string;
  icon?: string;
  label: string;
  count?: number;
  right?: React.ReactNode;
}> = ({ dotColor, icon, label, count, right }) => (
  <div
    className="d-flex align-items-center gap-2"
    style={{ padding: "10px 14px", borderBottom: `1px solid ${SC.border}` }}
  >
    <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor }} />
    {icon && <i className={icon} style={{ color: SC.muted, fontSize: FS.md }} />}
    <span style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: SC.muted }}>
      {label}
    </span>
    {count !== undefined && (
      <span
        style={{
          fontSize: FS.xs,
          fontWeight: 600,
          color: SC.dim,
          background: SC.surface2,
          padding: "1px 6px",
          borderRadius: RAD.pill,
        }}
      >
        {count}
      </span>
    )}
    <span className="flex-grow-1" />
    <div className="d-flex align-items-center gap-2">{right}</div>
  </div>
);

// ─── Branch card ───────────────────────────────────────────
const BranchCard: React.FC<{ branch: typeof BRANCHES[number] }> = ({ branch }) => (
  <Card className="border shadow-sm overflow-hidden h-100" style={{ borderRadius: RAD.md }}>
    <div style={{ height: 4, background: branch.color }} />
    <div
      className="d-flex align-items-center gap-2"
      style={{ padding: SP.xl, borderBottom: `1px solid ${SC.border}` }}
    >
      <div
        className="d-grid"
        style={{
          width: 36, height: 36,
          borderRadius: 7,
          background: branch.color,
          color: "#fff",
          placeItems: "center",
          fontSize: FS.xl,
          flex: "none",
        }}
      >
        <i className="ri-store-2-line" />
      </div>
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="text-truncate" style={{ fontSize: FS.lg, fontWeight: 600, color: SC.text, letterSpacing: "-0.01em" }}>
          {branch.name}
        </div>
        <div className="text-truncate" style={{ fontSize: FS.sm, color: SC.dim, fontWeight: 500, fontFeatureSettings: "'tnum'" }}>
          {branch.sub}
        </div>
      </div>
      {branch.pill && (
        <span
          className="d-inline-flex align-items-center gap-1"
          style={{
            padding: "1px 7px",
            borderRadius: RAD.pill,
            fontSize: 10,
            fontWeight: 600,
            color: SC.info,
            background: SC.infoBg,
            border: `1px solid ${SC.infoBorder}`,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: SC.info }} />
          {branch.pill.text}
        </span>
      )}
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        borderBottom: `1px solid ${SC.border}`,
      }}
    >
      <KpiCell label="Ingreso" value={branch.kpis.ingreso} divider />
      <KpiCell label="Cobrado" value={branch.kpis.cobrado} divider />
      <KpiCell label="Tickets" value={branch.kpis.tickets} />
    </div>

    <div>
      {branch.alerts.map((a, i) => {
        const tone = ALERT_TONE[a.tone];
        return (
          <div
            key={i}
            className="dv2-row d-flex align-items-center gap-2"
            style={{
              padding: "9px 14px",
              borderBottom: i < branch.alerts.length - 1 ? `1px solid ${SC.border}` : "none",
              fontSize: FS.base,
              cursor: "pointer",
            }}
          >
            <i className={a.icon} style={{ color: tone.icon, fontSize: FS.lg }} />
            <span className="flex-grow-1 text-truncate" style={{ color: SC.text, fontWeight: 500 }}>
              {a.label}
            </span>
            <span style={{ fontWeight: 600, color: SC.text, fontFeatureSettings: "'tnum'", whiteSpace: "nowrap" }}>
              {a.value}
            </span>
            <i className="ri-arrow-right-s-line" style={{ color: SC.dim }} />
          </div>
        );
      })}
    </div>
  </Card>
);

const KpiCell: React.FC<{ label: string; value: string; divider?: boolean }> = ({ label, value, divider }) => (
  <div
    style={{
      padding: "10px 12px",
      borderRight: divider ? `1px solid ${SC.border}` : "none",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    <div style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: SC.muted }}>
      {label}
    </div>
    <div style={{ fontSize: FS.h2, fontWeight: 700, letterSpacing: "-0.02em", color: SC.text, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>
      {value}
    </div>
  </div>
);

// ─── Timeline (Agenda) ─────────────────────────────────────
const Timeline: React.FC<{ items: typeof TIMELINE }> = ({ items }) => (
  <div>
    {items.map((g, i) => (
      <div
        key={i}
        style={{
          display: "grid",
          gridTemplateColumns: "56px 1fr",
          borderBottom: i < items.length - 1 ? `1px solid ${SC.border}` : "none",
        }}
      >
        <div style={{ padding: "10px 12px", borderRight: `1px solid ${SC.border}` }}>
          <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: FS.sm, color: SC.muted, fontWeight: 500 }}>
            {g.hour}
          </span>
          {g.isNow && (
            <span
              className="ms-1"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: SC.danger,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              ahora
            </span>
          )}
        </div>
        <div>
          {g.items.map((a, j) => (
            <ApptRow key={j} appt={a} last={j === g.items.length - 1} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const ApptRow: React.FC<{ appt: Appt; last?: boolean }> = ({ appt, last }) => {
  const avatarBg = colorFromString(appt.initials);
  return (
    <div
      className="dv2-row"
      style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr auto auto",
        gap: 8,
        alignItems: "center",
        padding: "8px 14px",
        borderBottom: last ? "none" : `1px solid ${SC.border}`,
        fontSize: FS.base,
        cursor: "pointer",
      }}
    >
      <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: FS.sm, color: SC.muted, fontWeight: 500 }}>
        {appt.time}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="text-truncate" style={{ fontWeight: 500, color: SC.text }}>
          {appt.title}
        </div>
        <div className="text-truncate" style={{ fontSize: FS.sm, color: SC.dim }}>
          {appt.client}
        </div>
      </div>
      <span
        className="d-inline-grid"
        style={{
          width: 22, height: 22,
          borderRadius: 999,
          background: avatarBg,
          color: "#fff",
          fontSize: 9,
          fontWeight: 600,
          placeItems: "center",
          boxShadow: appt.present ? `0 0 0 2px ${SC.surface}, 0 0 0 4px ${SC.success}` : "none",
        }}
      >
        {appt.initials}
      </span>
      {appt.ref ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: SC.info,
            background: SC.infoBg,
            border: `1px solid ${SC.infoBorder}`,
            padding: "1px 5px",
            borderRadius: 4,
            fontFamily: "var(--font-mono, ui-monospace)",
            letterSpacing: "0.02em",
          }}
        >
          {appt.ref}
        </span>
      ) : (
        <span style={{ fontSize: FS.sm, fontWeight: 600, color: SC.text, fontFeatureSettings: "'tnum'" }}>
          {appt.price}
        </span>
      )}
    </div>
  );
};

// ─── Tickets group ─────────────────────────────────────────
const TicketGroup: React.FC<{
  title: string;
  count: number;
  icon: string;
  items: Ticket[];
  branchColor: string;
}> = ({ title, count, icon, items, branchColor }) => (
  <div>
    <div
      className="d-flex align-items-center gap-2"
      style={{
        padding: "8px 14px",
        background: SC.surface2,
        borderTop: `1px solid ${SC.border}`,
        borderBottom: `1px solid ${SC.border}`,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: SC.muted,
      }}
    >
      <i className={icon} />
      {title} · {count}
    </div>
    {items.map((t, i) => (
      <div
        key={i}
        className="dv2-row"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: i < items.length - 1 ? `1px solid ${SC.border}` : "none",
          cursor: "pointer",
          fontSize: FS.base,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: branchColor }} />
        <div style={{ minWidth: 0 }}>
          <div className="d-flex align-items-center gap-1">
            <span className="text-truncate" style={{ fontWeight: 500, color: SC.text }}>
              {t.client}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: SC.info,
                background: SC.infoBg,
                border: `1px solid ${SC.infoBorder}`,
                padding: "1px 5px",
                borderRadius: 4,
                fontFamily: "var(--font-mono, ui-monospace)",
              }}
            >
              {t.ref}
            </span>
          </div>
          <div className="text-truncate" style={{ fontSize: FS.sm, color: SC.dim }}>
            {t.meta}
          </div>
        </div>
        <div className="d-flex" style={{ marginRight: 4 }}>
          {t.stylists.map((s, k) => (
            <span
              key={k}
              className="d-inline-grid"
              style={{
                width: 22, height: 22,
                borderRadius: 999,
                background: colorFromString(s),
                color: "#fff",
                fontSize: 9,
                fontWeight: 600,
                placeItems: "center",
                marginLeft: k === 0 ? 0 : -6,
                border: `2px solid ${SC.surface}`,
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600, color: SC.text, fontFeatureSettings: "'tnum'" }}>{t.amount}</div>
          {t.cobrar && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: SC.warn,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              cobrar
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

// ─── Compact KPI (footer band) ─────────────────────────────
const CompactKpi: React.FC<{
  icon: string;
  label: string;
  value: string;
  sub?: string;
  divider?: boolean;
}> = ({ icon, label, value, sub, divider }) => (
  <div
    style={{
      padding: "12px 14px",
      borderRight: divider ? `1px solid ${SC.border}` : "none",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}
  >
    <div className="d-flex align-items-center gap-1" style={{ color: SC.muted }}>
      <i className={icon} style={{ fontSize: FS.md }} />
      <span style={{ fontSize: FS.xs, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
    </div>
    <div style={{ fontSize: FS.h1, fontWeight: 700, letterSpacing: "-0.02em", color: SC.text, lineHeight: 1.1, fontFeatureSettings: "'tnum'" }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: FS.sm, fontWeight: 500, color: SC.dim }}>
        {sub}
      </div>
    )}
  </div>
);

export default DashboardV2;
