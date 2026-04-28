import React from "react";
import { SC, getInitials, colorFromString } from "../../pages/DashboardPrincipal/superCalendarTheme";

export type AhoraHeroAppt = {
  id: string;
  status: string;
  service_name: string;
  service_price?: number;
  stylist_name: string;
  client_name: string;
};

interface Props {
  appt: AhoraHeroAppt;
  branchColor: string;
  formatCurrency: (n: number) => string;
  onClick: () => void;
  onPayNow?: () => void;
}

const AhoraHero: React.FC<Props> = ({ appt, branchColor, formatCurrency, onClick, onPayNow }) => {
  const isReadyToPay = appt.status === "checked_out";
  const stylistColor = colorFromString(appt.stylist_name || "?");
  const stylistFirstName = (appt.stylist_name || "").split(/\s+/)[0] || appt.stylist_name;
  const liveLabel = isReadyToPay ? "LISTO PARA COBRAR" : "EN VIVO · ATENDIENDO";
  const liveDotColor = isReadyToPay ? SC.info : "#f59e0b";

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        padding: 14,
        background: `linear-gradient(135deg, ${branchColor}1f 0%, ${branchColor}08 60%, ${SC.surface} 100%)`,
        border: `1px solid ${branchColor}40`,
        cursor: "pointer",
      }}
    >
      {/* glow decorativo */}
      <div
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${branchColor}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: "50%",
          border: `1px solid ${branchColor}33`,
          pointerEvents: "none",
        }}
      />

      {/* live badge */}
      <div className="d-flex align-items-center" style={{ gap: 6, marginBottom: 10, position: "relative" }}>
        <span
          className="pulse-dot"
          style={{ background: liveDotColor, width: 7, height: 7 }}
          aria-hidden
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 1.2,
            color: isReadyToPay ? SC.info : "#92400e",
            textTransform: "uppercase",
          }}
        >
          {liveLabel}
        </span>
      </div>

      {/* body */}
      <div className="d-flex align-items-center" style={{ gap: 12, position: "relative" }}>
        <div
          className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: stylistColor,
            color: "#fff",
            fontSize: 14,
            letterSpacing: 0.3,
          }}
        >
          {getInitials(appt.stylist_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fw-bold text-truncate" style={{ fontSize: 15, color: SC.text, lineHeight: 1.2 }}>
            {appt.client_name || "Cliente"}
          </div>
          <div className="text-truncate" style={{ fontSize: 12, color: SC.muted, marginTop: 2 }}>
            {appt.service_name} · con {stylistFirstName}
          </div>
        </div>
        {typeof appt.service_price === "number" && appt.service_price > 0 && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: SC.success,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCurrency(appt.service_price)}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="d-flex align-items-center mt-3" style={{ gap: 6, position: "relative" }}>
        {isReadyToPay && onPayNow ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPayNow();
              }}
              className="btn btn-sm flex-grow-1 d-flex align-items-center justify-content-center"
              style={{
                background: SC.ink,
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.6,
                gap: 6,
              }}
            >
              <i className="ri-money-dollar-circle-line" /> COBRAR AHORA
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="btn btn-sm d-flex align-items-center justify-content-center"
              style={{
                background: "transparent",
                color: SC.text,
                border: `1px solid ${SC.border2}`,
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 700,
              }}
              title="Ver detalle"
            >
              <i className="ri-eye-line" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-sm w-100 d-flex align-items-center justify-content-center"
            style={{
              background: SC.ink,
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.6,
              gap: 6,
            }}
          >
            VER DETALLE <i className="ri-arrow-right-line" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AhoraHero;
