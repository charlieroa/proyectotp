// Inventario — sección del rediseño /v2. Lista los productos reales del tenant
// (GET /products con target_tenant_id) y deriva los KPIs de stock/valor.
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../../services/api";
import { ScreenProps } from "../types";
import { T, R, FONT, fmtCOP, fmtCOPShort, colorFor } from "../theme";
import { Kpi, KpiGrid, Panel, Mono, Empty, Loading } from "../components/ui";

interface Prod {
  id: string;
  name: string;
  cost_price?: number | null;
  sale_price: number;
  staff_price?: number | null;
  stock: number;
  category_name?: string | null;
  audience_type?: string;
}

const LOW_STOCK = 5; // umbral "poco stock"

// nivel de stock → estilo del badge
const stockTone = (stock: number): { color: string; bg: string } => {
  if (stock <= 0) return { color: T.red, bg: T.redBg2 };
  if (stock <= LOW_STOCK) return { color: T.amber, bg: T.amberBg };
  return { color: T.green, bg: T.greenBg };
};

const num = (v: number | null | undefined): number => Number(v) || 0;

const Inventario: React.FC<ScreenProps> = ({ tenantId }) => {
  const [products, setProducts] = useState<Prod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get("/products", { params: { target_tenant_id: tenantId } })
      .then(({ data }) => {
        if (!alive) return;
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.response?.data?.error || "No se pudieron cargar los productos.");
        setProducts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tenantId]);

  const kpis = useMemo(() => {
    let low = 0;
    let out = 0;
    let value = 0;
    products.forEach((p) => {
      const stock = num(p.stock);
      if (stock <= 0) out += 1;
      else if (stock <= LOW_STOCK) low += 1;
      // valor a costo si existe, si no a precio de venta
      const unit = p.cost_price != null ? num(p.cost_price) : num(p.sale_price);
      value += unit * stock;
    });
    return { total: products.length, low, out, value };
  }, [products]);

  if (!tenantId) {
    return (
      <div>
        <Header />
        <Empty icon="📦" title="Sin negocio seleccionado" hint="Elige un negocio para ver su inventario." />
      </div>
    );
  }

  return (
    <div>
      <Header />

      <KpiGrid cols={4}>
        <Kpi label="Total productos" value={String(kpis.total)} />
        <Kpi label="Poco stock" value={String(kpis.low)} valueColor={T.amber} />
        <Kpi label="Agotados" value={String(kpis.out)} valueColor={T.red} />
        <Kpi label="Valor inventario" value={fmtCOPShort(kpis.value)} valueColor={T.green} />
      </KpiGrid>

      <Panel
        title="Productos"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={btnGhost}>Carga masiva</button>
            <button style={btnDark}>+ Agregar producto</button>
          </div>
        }
      >
        {loading ? (
          <Loading label="Cargando productos…" />
        ) : error ? (
          <Empty icon="⚠️" title="No se pudo cargar" hint={error} />
        ) : products.length === 0 ? (
          <Empty icon="📦" title="Sin productos" hint="Agrega tu primer producto para empezar a vender." />
        ) : (
          <>
            {/* encabezado de columnas */}
            <div style={headRow}>
              <span>PRODUCTO</span>
              <span>CATEGORÍA</span>
              <span style={{ textAlign: "right" }}>P. VENTA</span>
              <span style={{ textAlign: "right" }}>P. STAFF</span>
              <span style={{ textAlign: "right" }}>STOCK</span>
            </div>
            {products.map((p) => {
              const tone = stockTone(num(p.stock));
              const catColor = p.category_name ? colorFor(p.category_name) : T.dim;
              return (
                <div key={p.id} style={dataRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: catColor + "22",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        flex: "none",
                      }}
                    >
                      📦
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </span>
                  </div>
                  <span>
                    {p.category_name ? (
                      <span
                        style={{
                          background: catColor + "1f",
                          color: catColor,
                          fontWeight: 700,
                          fontSize: 10.5,
                          padding: "3px 9px",
                          borderRadius: 6,
                        }}
                      >
                        {p.category_name}
                      </span>
                    ) : (
                      <span style={{ color: T.dim, fontSize: 12.5 }}>—</span>
                    )}
                  </span>
                  <Mono style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, color: T.green }}>
                    {fmtCOP(num(p.sale_price))}
                  </Mono>
                  <Mono style={{ textAlign: "right", fontWeight: 600, fontSize: 13, color: T.muted }}>
                    {p.staff_price != null ? fmtCOP(num(p.staff_price)) : "—"}
                  </Mono>
                  <span style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        background: tone.bg,
                        color: tone.color,
                        fontWeight: 700,
                        fontSize: 12.5,
                        padding: "3px 10px",
                        borderRadius: 7,
                      }}
                    >
                      {num(p.stock)}
                    </span>
                  </span>
                </div>
              );
            })}
          </>
        )}
      </Panel>
    </div>
  );
};

const Header: React.FC = () => (
  <div style={{ marginBottom: 18 }}>
    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-.7px" }}>Inventario</h1>
    <p style={{ margin: "5px 0 0", color: T.muted, fontSize: 14 }}>
      Productos para venta y para uso interno. La venta al cliente genera comisión.
    </p>
  </div>
);

const GRID = "2fr 1fr 1fr 1fr 1fr";

const headRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: GRID,
  gap: 0,
  padding: "11px 20px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".5px",
  color: T.dim,
  background: T.surface2,
};

const dataRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: GRID,
  gap: 0,
  alignItems: "center",
  padding: "13px 20px",
  borderTop: `1px solid ${T.border3}`,
};

const btnGhost: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: R.md,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 12.5,
  fontFamily: FONT,
  cursor: "pointer",
  color: T.text,
};

const btnDark: React.CSSProperties = {
  background: T.ink,
  color: T.onInk,
  border: 0,
  borderRadius: R.md,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 12.5,
  fontFamily: FONT,
  cursor: "pointer",
};

export default Inventario;
