// Clientes (CRM) — pantalla del rediseño /v2. Replica la sección "CLIENTES" del
// mockup, cableada a datos reales del backend:
//   GET /users/tenant/:tenantId/clients  →  Array<{
//     id, name, email, phone, img, tags: string[], cantidadServicios: number }>
//   (tags = últimos hasta 5 servicios, más reciente primero).
// El backend no expone flag de WhatsApp ni fecha de última visita, así que:
//   - "Vía WhatsApp" se deriva del email temporal `@whatsapp.temp`.
//   - "últ." muestra el nombre del servicio más reciente (tags[0]), no una fecha.
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../../services/api";
import { ScreenProps } from "../types";
import { T, FONT, colorFor, initials } from "../theme";
import { Kpi, KpiGrid, Avatar, Badge, Empty, Loading } from "../components/ui";

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  img: string | null;
  tags: string[];
  cantidadServicios: number;
}

const isWhatsApp = (c: ClientRow): boolean =>
  (c.email || "").toLowerCase().endsWith("@whatsapp.temp");

// Segmento derivado del número de servicios (el backend no lo entrega).
const segmentOf = (n: number): { label: string; color: string; bg: string } => {
  if (n >= 5) return { label: "Frecuente", color: T.green, bg: T.greenBg };
  if (n >= 1) return { label: "Regular", color: T.purple, bg: T.purpleBg2 };
  return { label: "Nuevo", color: T.amber, bg: T.amberBg };
};

const Clientes: React.FC<ScreenProps> = ({ tenantId }) => {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    let alive = true;
    setClients(null);
    setError(null);
    api
      .get(`/users/tenant/${tenantId}/clients`)
      .then(({ data }) => {
        if (!alive) return;
        setClients(Array.isArray(data) ? data : []);
      })
      .catch(() => alive && setError("No se pudieron cargar los clientes."));
    return () => {
      alive = false;
    };
  }, [tenantId]);

  // KPIs sobre el universo completo (no sobre el filtrado).
  const kpis = useMemo(() => {
    const list = clients || [];
    return {
      total: list.length,
      whatsapp: list.filter(isWhatsApp).length,
      conCitas: list.filter((c) => c.cantidadServicios > 0).length,
      servicios: list.reduce((s, c) => s + (c.cantidadServicios || 0), 0),
    };
  }, [clients]);

  const filtered = useMemo(() => {
    const list = clients || [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c) => {
      const hay = [c.name, c.phone || "", ...(c.tags || [])].join(" ").toLowerCase();
      return hay.includes(term);
    });
  }, [clients, q]);

  if (!tenantId) return <Empty title="Sin tenant" hint="Selecciona un salón para ver sus clientes." />;

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.7px" }}>Clientes</h1>
      <p style={{ margin: "5px 0 18px", color: T.muted, fontSize: 14 }}>
        Tu CRM. Cada cliente con su historial de servicios y contacto por WhatsApp.
      </p>

      {/* KPIs */}
      <KpiGrid cols={4}>
        <Kpi label="Total clientes" value={String(kpis.total)} icon={<Chip bg={T.purpleBg}>{iconUser}</Chip>} />
        <Kpi label="Vía WhatsApp" value={String(kpis.whatsapp)} icon={<Chip bg={T.greenBg}>💬</Chip>} />
        <Kpi label="Con citas" value={String(kpis.conCitas)} icon={<Chip bg="#eaf7ff">📅</Chip>} />
        <Kpi label="Servicios totales" value={String(kpis.servicios)} icon={<Chip bg={T.amberBg}>⭐</Chip>} />
      </KpiGrid>

      {/* Búsqueda + acción */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "9px 14px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="1.9" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, teléfono o servicio…"
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              fontFamily: FONT,
              fontSize: 13.5,
              color: T.text,
            }}
          />
        </div>
        <button
          onClick={() => console.log("Agregar cliente")}
          style={{
            background: T.ink,
            color: T.onInk,
            border: 0,
            borderRadius: 12,
            padding: "12px 18px",
            fontWeight: 700,
            fontSize: 13.5,
            fontFamily: FONT,
            cursor: "pointer",
            flex: "none",
          }}
        >
          + Agregar cliente
        </button>
      </div>

      {/* Grilla de tarjetas */}
      {error ? (
        <Empty icon="⚠️" title="No se pudo cargar" hint={error} />
      ) : clients === null ? (
        <Loading label="Cargando clientes…" />
      ) : filtered.length === 0 ? (
        <Empty
          icon="🧑"
          title={q ? "Sin resultados" : "Sin clientes"}
          hint={q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes registrados en este salón."}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {filtered.map((c) => {
            const seg = segmentOf(c.cantidadServicios);
            const last = (c.tags || [])[0];
            return (
              <div
                key={c.id}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 16,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar ini={initials(c.name)} color={colorFor(c.name)} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name || "Cliente"}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted }}>{c.phone || "Sin teléfono"}</div>
                  </div>
                  {isWhatsApp(c) && (
                    <Badge color={T.green} bg={T.greenBg}>
                      💬 WhatsApp
                    </Badge>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Badge color={seg.color} bg={seg.bg}>
                    {seg.label}
                  </Badge>
                  <span style={{ fontSize: 12, color: T.dim, fontWeight: 600 }}>
                    {c.cantidadServicios} servicios{last ? ` · últ. ${last}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Chip cuadrado para el icono de KPI (replica el <span> coloreado del mockup).
const Chip: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <span
    style={{
      width: 26,
      height: 26,
      borderRadius: 8,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      flex: "none",
    }}
  >
    {children}
  </span>
);

const iconUser = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.purple2} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);

export default Clientes;
