import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../services/api";
import { useCurrency } from "../../contexts/CurrencyContext";

export type QuickPayAppointment = {
  id: string;
  client_id?: string;
  client_name: string;
  service_id?: string;
  service_name: string;
  service_price: number;
  stylist_id?: string;
  stylist_name: string;
};

interface QuickPayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: QuickPayAppointment | null;
  onPaid: () => void;
  onOpenFullPOS: () => void;
}

type PaymentMethod = "cash" | "credit_card";
type TipRecipientMode = "stylist" | "split";

const AVATAR_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
];

const getInitials = (name: string): string => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return (first + last).toUpperCase();
};

const colorFromString = (s: string): string => {
  if (!s) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const parseNumeric = (raw: string): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const num = Number(cleaned);
  return isFinite(num) && num > 0 ? num : 0;
};

const QuickPayDrawer: React.FC<QuickPayDrawerProps> = ({
  isOpen,
  onClose,
  appointment,
  onPaid,
  onOpenFullPOS,
}) => {
  const { formatCurrency } = useCurrency();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [cardVoucher, setCardVoucher] = useState<string>("");
  const [tipEnabled, setTipEnabled] = useState<boolean>(false);
  const [tipAmountRaw, setTipAmountRaw] = useState<string>("");
  const [tipRecipientMode, setTipRecipientMode] = useState<TipRecipientMode>("stylist");
  const [processing, setProcessing] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Reset state whenever the drawer opens for a new appointment
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("cash");
      setCashReceived("");
      setCardVoucher("");
      setTipEnabled(false);
      setTipAmountRaw("");
      setTipRecipientMode("stylist");
      setProcessing(false);
    }
  }, [isOpen, appointment?.id]);

  // Slide-in animation: mount frame then animate
  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => setMounted(true), 10);
      return () => {
        window.clearTimeout(t);
      };
    }
    setMounted(false);
    return undefined;
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const total = useMemo<number>(() => {
    if (!appointment) return 0;
    return Number(appointment.service_price) || 0;
  }, [appointment]);

  const tipAmount = useMemo<number>(() => {
    if (!tipEnabled) return 0;
    return parseNumeric(tipAmountRaw);
  }, [tipEnabled, tipAmountRaw]);

  const cashReceivedNum = useMemo<number>(() => parseNumeric(cashReceived), [cashReceived]);
  const change = useMemo<number>(() => {
    if (paymentMethod !== "cash") return 0;
    if (cashReceivedNum <= total) return 0;
    return cashReceivedNum - total;
  }, [paymentMethod, cashReceivedNum, total]);

  if (!isOpen || !appointment) {
    return null;
  }

  const stylistInitials = getInitials(appointment.stylist_name || "");
  const stylistColor = colorFromString(appointment.stylist_name || appointment.id || "x");
  const priceIsZero = total <= 0;

  const handleSubmit = async () => {
    if (priceIsZero || processing) return;
    setProcessing(true);
    try {
      const tipRecipientId =
        tipAmount > 0
          ? tipRecipientMode === "stylist"
            ? appointment.stylist_id || null
            : null
          : null;

      const payload = {
        client_id: appointment.client_id || null,
        services: appointment.service_id ? [appointment.service_id] : [],
        products: [],
        payments:
          paymentMethod === "cash"
            ? [{ payment_method: "cash", amount: total }]
            : [
                {
                  payment_method: "credit_card",
                  amount: total,
                  voucher: cardVoucher ? cardVoucher : undefined,
                },
              ],
        tip_amount: tipAmount,
        tip_recipient_user_id: tipRecipientId,
      };

      await api.post("/payments", payload);
      await Swal.fire("¡Cobrado!", "Pago registrado correctamente.", "success");
      onPaid();
      onClose();
    } catch (e: any) {
      const message = e?.response?.data?.error || e?.message || "Error desconocido";
      await Swal.fire("Error en el cobro", message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    zIndex: 1080,
    opacity: mounted ? 1 : 0,
    transition: "opacity 250ms ease",
  };

  const panelWidth = typeof window !== "undefined" && window.innerWidth <= 640 ? "100%" : "420px";

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: panelWidth,
    maxWidth: "100%",
    background: "#ffffff",
    color: "#1f2937",
    zIndex: 1090,
    boxShadow: "-12px 0 32px rgba(15, 23, 42, 0.12)",
    transform: mounted ? "translateX(0)" : "translateX(100%)",
    transition: "transform 250ms ease",
    display: "flex",
    flexDirection: "column",
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px 8px 22px",
    borderBottom: "1px solid #f1f5f9",
    background: "#ffffff",
  };

  const grabberStyle: React.CSSProperties = {
    width: 44,
    height: 5,
    borderRadius: 999,
    background: "#e5e7eb",
    margin: "10px auto 4px auto",
  };

  const closeBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #f1f5f9",
    background: "#fff",
    color: "#6b7280",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "16px 22px 16px 22px",
    background: "#ffffff",
  };

  const summaryCardStyle: React.CSSProperties = {
    background: "#f9fafb",
    border: "1px solid #f1f5f9",
    borderRadius: 8,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const avatarStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: stylistColor,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const stylistRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 6,
  };

  const totalStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    color: "#059669",
    whiteSpace: "nowrap",
    lineHeight: 1.1,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  };

  const methodRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  };

  const methodPillStyle = (active: boolean): React.CSSProperties => ({
    height: 56,
    borderRadius: 12,
    border: active ? "1.5px solid #059669" : "1px solid #f1f5f9",
    background: active ? "rgba(5, 150, 105, 0.08)" : "#ffffff",
    color: active ? "#047857" : "#374151",
    fontWeight: 600,
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#1f2937",
    fontSize: 14,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
    fontWeight: 500,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#059669",
    marginTop: 6,
    fontWeight: 600,
  };

  const tipToggleRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    border: "1px solid #f1f5f9",
    borderRadius: 10,
    background: "#fafafa",
  };

  const switchStyle = (on: boolean): React.CSSProperties => ({
    width: 36,
    height: 20,
    borderRadius: 999,
    background: on ? "#059669" : "#d1d5db",
    position: "relative",
    cursor: "pointer",
    transition: "background 150ms ease",
    flexShrink: 0,
  });

  const switchKnobStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 2,
    left: on ? 18 : 2,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#ffffff",
    transition: "left 150ms ease",
    boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
  });

  const segmentRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 10,
  };

  const segmentBtnStyle = (active: boolean): React.CSSProperties => ({
    height: 38,
    borderRadius: 8,
    border: active ? "1.5px solid #059669" : "1px solid #f1f5f9",
    background: active ? "rgba(5, 150, 105, 0.08)" : "#ffffff",
    color: active ? "#047857" : "#374151",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  });

  const footerStyle: React.CSSProperties = {
    padding: "14px 22px 18px 22px",
    borderTop: "1px solid #f1f5f9",
    background: "#ffffff",
  };

  const ctaStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: "none",
    background: priceIsZero ? "#a7f3d0" : "#059669",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 15,
    cursor: priceIsZero || processing ? "not-allowed" : "pointer",
    opacity: priceIsZero || processing ? 0.85 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  const ghostLinkStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 13,
    marginTop: 10,
    cursor: "pointer",
    textAlign: "center",
    padding: "6px 0",
    fontWeight: 500,
  };

  const warnBoxStyle: React.CSSProperties = {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 8,
    background: "#fef3c7",
    color: "#92400e",
    fontSize: 12,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const ctaTotal = total + tipAmount;

  return (
    <>
      <div
        style={backdropStyle}
        onClick={() => {
          if (!processing) onClose();
        }}
        aria-hidden="true"
      />
      <aside
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Cobrar cita"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={grabberStyle} aria-hidden="true" />
        <div style={headerStyle}>
          <h5 className="mb-0 fw-bold" style={{ fontSize: 17, color: "#1f2937" }}>
            Cobrar cita
          </h5>
          <button
            type="button"
            onClick={() => {
              if (!processing) onClose();
            }}
            style={closeBtnStyle}
            aria-label="Cerrar"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div style={bodyStyle}>
          {/* Summary card */}
          <div style={summaryCardStyle}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={stylistRowStyle}>
                <span style={avatarStyle}>{stylistInitials || "?"}</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {appointment.stylist_name || "Sin estilista"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1f2937",
                  marginBottom: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {appointment.client_name || "Cliente"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {appointment.service_name || "Servicio"}
              </div>
            </div>
            <div style={totalStyle}>{formatCurrency(total)}</div>
          </div>

          {priceIsZero && (
            <div style={warnBoxStyle}>
              <i className="ri-error-warning-line" style={{ fontSize: 16 }} />
              El servicio no tiene un precio configurado. No se puede cobrar.
            </div>
          )}

          {/* Method picker */}
          <div style={sectionTitleStyle}>Método de pago</div>
          <div style={methodRowStyle}>
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              style={methodPillStyle(paymentMethod === "cash")}
              disabled={processing}
            >
              <i className="ri-money-dollar-circle-line" style={{ fontSize: 18 }} />
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("credit_card")}
              style={methodPillStyle(paymentMethod === "credit_card")}
              disabled={processing}
            >
              <i className="ri-bank-card-line" style={{ fontSize: 18 }} />
              Tarjeta
            </button>
          </div>

          {/* Method-specific inputs */}
          {paymentMethod === "cash" && (
            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Recibido (opcional)</div>
              <input
                type="text"
                inputMode="decimal"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0"
                style={inputStyle}
                disabled={processing}
              />
              {change > 0 && (
                <div style={helperStyle}>Vuelto: {formatCurrency(change)}</div>
              )}
            </div>
          )}

          {paymentMethod === "credit_card" && (
            <div style={{ marginTop: 14 }}>
              <div style={labelStyle}>Voucher #</div>
              <input
                type="text"
                value={cardVoucher}
                onChange={(e) => setCardVoucher(e.target.value)}
                placeholder="Opcional"
                style={inputStyle}
                disabled={processing}
              />
            </div>
          )}

          {/* Tip */}
          <div style={sectionTitleStyle}>Propina</div>
          <div style={tipToggleRowStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i
                className="ri-hand-coin-line"
                style={{ fontSize: 18, color: "#6b7280" }}
              />
              <span style={{ fontSize: 14, color: "#1f2937", fontWeight: 500 }}>
                Agregar propina
              </span>
            </div>
            <div
              style={switchStyle(tipEnabled)}
              role="switch"
              aria-checked={tipEnabled}
              tabIndex={0}
              onClick={() => {
                if (!processing) setTipEnabled((v) => !v);
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !processing) {
                  e.preventDefault();
                  setTipEnabled((v) => !v);
                }
              }}
            >
              <span style={switchKnobStyle(tipEnabled)} />
            </div>
          </div>

          {tipEnabled && (
            <div style={{ marginTop: 12 }}>
              <div style={labelStyle}>Monto de propina</div>
              <input
                type="text"
                inputMode="decimal"
                value={tipAmountRaw}
                onChange={(e) => setTipAmountRaw(e.target.value)}
                placeholder="0"
                style={inputStyle}
                disabled={processing}
              />
              <div style={segmentRowStyle}>
                <button
                  type="button"
                  onClick={() => setTipRecipientMode("stylist")}
                  style={segmentBtnStyle(tipRecipientMode === "stylist")}
                  disabled={processing}
                >
                  <i className="ri-user-line" />
                  Para: {appointment.stylist_name || "estilista"}
                </button>
                <button
                  type="button"
                  onClick={() => setTipRecipientMode("split")}
                  style={segmentBtnStyle(tipRecipientMode === "split")}
                  disabled={processing}
                >
                  <i className="ri-team-line" />
                  Repartir entre todos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer / CTA */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={priceIsZero || processing}
            style={ctaStyle}
          >
            {processing ? (
              <>
                <i className="ri-loader-4-line" style={{ animation: "spin 1s linear infinite" }} />
                Procesando...
              </>
            ) : (
              <>Cobrar {formatCurrency(ctaTotal)}</>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!processing) onOpenFullPOS();
            }}
            style={ghostLinkStyle}
            disabled={processing}
          >
            Editar en POS completo →
          </button>
        </div>
      </aside>
    </>
  );
};

export default QuickPayDrawer;
