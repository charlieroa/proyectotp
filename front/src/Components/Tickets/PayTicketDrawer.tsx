import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Offcanvas,
  OffcanvasHeader,
  OffcanvasBody,
  Button,
  Input,
  Spinner,
  Label,
  Card,
  CardBody,
} from "reactstrap";
import Select from "react-select";
import Swal from "sweetalert2";
import { api } from "../../services/api";
import {
  SC,
  colorFromString,
  getInitials,
} from "../../pages/DashboardPrincipal/superCalendarTheme";

// ---------- Props ----------
//
// `tenantId` is OPTIONAL but required to load the service / product / stylist
// catalogs used by the "Add item" picker. Without it, the picker is hidden and
// the drawer falls back to read-only on the existing items. The parent
// (DashboardV2) should pass `tenantId={activeBranchId}` so cross-branch tickets
// can be edited.
interface PayTicketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  onPaid: () => void;
  onOpenFullPOS?: (ticketId: string) => void;
  tenantId?: string;
}

// ---------- Backend response types (relevant subset) ----------
interface UserSlim {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
}

interface InvoiceItem {
  id: string;
  item_type: "service" | "product" | "custom" | string;
  description: string | null;
  service_name?: string | null;
  product_name?: string | null;
  unit_price: number | string | null;
  quantity: number | string | null;
  total_price: number | string | null;
  seller_id: string | null;
  users?: UserSlim | null;
}

interface TicketResponse {
  id: string;
  status: string;
  total_amount: number | string | null;
  client_name_adhoc?: string | null;
  invoice_items: InvoiceItem[];
  users?: UserSlim | null;
}

interface CatalogService {
  id: string;
  name: string;
  price: number | string;
  commission_percent?: number | string | null;
}

interface CatalogProduct {
  id: string;
  name: string;
  sale_price: number | string;
  stock?: number | string | null;
}

// ---------- Local UI types ----------
type PaymentMethod = "cash" | "card" | "mixed";
type TipPreset = "none" | "10" | "15" | "20" | "custom";
type AddTab = "service" | "product";
type SelectOpt<T> = { value: string; label: string; data: T };

const TIP_PRESETS: { key: TipPreset; label: string; pct: number | null }[] = [
  { key: "none", label: "Sin", pct: 0 },
  { key: "10", label: "10%", pct: 10 },
  { key: "15", label: "15%", pct: 15 },
  { key: "20", label: "20%", pct: 20 },
  { key: "custom", label: "Personalizado", pct: null },
];

const SALON_RECIPIENT = "__salon_split__";

// ---------- Helpers ----------
const toNumber = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number): string => {
  const safe = Number.isFinite(n) ? Math.round(n) : 0;
  return `$ ${safe.toLocaleString("es-CO")}`;
};

const userFullName = (u: UserSlim | null | undefined): string => {
  if (!u) return "";
  const f = (u.first_name || "").trim();
  const l = (u.last_name || "").trim();
  return `${f} ${l}`.trim();
};

const itemLineName = (it: InvoiceItem): string => {
  if (it.service_name) return it.service_name;
  if (it.product_name) return it.product_name;
  if (it.description) return it.description;
  if (it.item_type === "service") return "Servicio";
  if (it.item_type === "product") return "Producto";
  return "Ítem";
};

const isValidEmail = (raw: string): boolean =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(raw || "").trim());

// Strip non-numeric chars and parse as integer (es-CO format-tolerant).
const parseAmount = (raw: string): number => {
  const cleaned = String(raw || "").replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const PayTicketDrawer: React.FC<PayTicketDrawerProps> = ({
  isOpen,
  onClose,
  ticketId,
  onPaid,
  onOpenFullPOS,
  tenantId,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketResponse | null>(null);

  // Catalogs
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [stylists, setStylists] = useState<UserSlim[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState<boolean>(false);

  // Picker UI state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerTab, setPickerTab] = useState<AddTab>("service");
  const [pickerService, setPickerService] = useState<SelectOpt<CatalogService> | null>(null);
  const [pickerProduct, setPickerProduct] = useState<SelectOpt<CatalogProduct> | null>(null);
  const [pickerSeller, setPickerSeller] = useState<SelectOpt<UserSlim> | null>(null);
  const [pickerQty, setPickerQty] = useState<number>(1);
  const [adding, setAdding] = useState<boolean>(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceivedRaw, setCashReceivedRaw] = useState<string>("");
  const [cardAmountRaw, setCardAmountRaw] = useState<string>("");
  const [mixedCashRaw, setMixedCashRaw] = useState<string>("");
  const [mixedCardRaw, setMixedCardRaw] = useState<string>("");
  const [voucher, setVoucher] = useState<string>("");

  // Tip state
  const [tipPreset, setTipPreset] = useState<TipPreset>("none");
  const [tipCustomRaw, setTipCustomRaw] = useState<string>("");
  const [tipRecipient, setTipRecipient] = useState<string>(SALON_RECIPIENT);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Factura por correo (el cliente la pide).
  const [wantsInvoice, setWantsInvoice] = useState<boolean>(false);
  const [invoiceEmail, setInvoiceEmail] = useState<string>("");

  // ---------- Reset on open / new ticket ----------
  useEffect(() => {
    if (!isOpen) return;
    setWantsInvoice(false);
    setInvoiceEmail("");
    setPaymentMethod("cash");
    setCashReceivedRaw("");
    setCardAmountRaw("");
    setMixedCashRaw("");
    setMixedCardRaw("");
    setVoucher("");
    setTipPreset("none");
    setTipCustomRaw("");
    setTipRecipient(SALON_RECIPIENT);
    setSubmitting(false);
    setPickerOpen(false);
    setPickerTab("service");
    setPickerService(null);
    setPickerProduct(null);
    setPickerSeller(null);
    setPickerQty(1);
  }, [isOpen, ticketId]);

  // ---------- Fetch ticket ----------
  const fetchTicket = useCallback(async (): Promise<void> => {
    if (!ticketId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<TicketResponse>(`/tickets/${ticketId}`);
      setTicket(res.data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo cargar el ticket.";
      setLoadError(String(msg));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!isOpen || !ticketId) return;
    void fetchTicket();
  }, [isOpen, ticketId, fetchTicket]);

  // ---------- Load catalogs (services / products / stylists) ----------
  const loadCatalogs = useCallback(async (): Promise<void> => {
    if (!tenantId || catalogsLoaded) return;
    try {
      const [svcRes, prodRes, stylRes] = await Promise.all([
        api
          .get<CatalogService[]>(`/services/tenant/${tenantId}`)
          .catch(() => ({ data: [] as CatalogService[] })),
        api
          .get<CatalogProduct[]>(`/products`, {
            params: { audience: "cliente", target_tenant_id: tenantId },
          })
          .catch(() => ({ data: [] as CatalogProduct[] })),
        api
          .get<UserSlim[]>(`/users/tenant/${tenantId}`, {
            params: { role_id: 3 },
          })
          .catch(() => ({ data: [] as UserSlim[] })),
      ]);
      setCatalogServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setCatalogProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      setStylists(Array.isArray(stylRes.data) ? stylRes.data : []);
      setCatalogsLoaded(true);
    } catch {
      // network errors swallowed — picker just stays empty
      setCatalogsLoaded(true);
    }
  }, [tenantId, catalogsLoaded]);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    void loadCatalogs();
  }, [isOpen, tenantId, loadCatalogs]);

  // ---------- Derived: subtotal / sellers in ticket / tip / total ----------
  const subtotal = useMemo<number>(() => {
    if (!ticket) return 0;
    return ticket.invoice_items.reduce(
      (acc, it) => acc + toNumber(it.total_price),
      0
    );
  }, [ticket]);

  const sellersFromTicket = useMemo<UserSlim[]>(() => {
    if (!ticket) return [];
    const map = new Map<string, UserSlim>();
    ticket.invoice_items.forEach((it) => {
      if (it.users && it.users.id && !map.has(it.users.id)) {
        map.set(it.users.id, it.users);
      }
    });
    return Array.from(map.values());
  }, [ticket]);

  const tipAmount = useMemo<number>(() => {
    if (tipPreset === "none") return 0;
    if (tipPreset === "custom") {
      return Math.round(parseAmount(tipCustomRaw));
    }
    const presetEntry = TIP_PRESETS.find((p) => p.key === tipPreset);
    const pct = presetEntry?.pct ?? 0;
    return Math.round((subtotal * pct) / 100);
  }, [tipPreset, tipCustomRaw, subtotal]);

  const grandTotal = subtotal + tipAmount;

  // Cash-only branch: "Recibido" → change calculation.
  const cashReceived = useMemo(() => parseAmount(cashReceivedRaw), [cashReceivedRaw]);
  const cashChange = paymentMethod === "cash" ? cashReceived - grandTotal : 0;

  // Card-only branch
  const cardAmount = useMemo(() => parseAmount(cardAmountRaw), [cardAmountRaw]);

  // Mixed branch
  const mixedCash = useMemo(() => parseAmount(mixedCashRaw), [mixedCashRaw]);
  const mixedCard = useMemo(() => parseAmount(mixedCardRaw), [mixedCardRaw]);
  const mixedSum = mixedCash + mixedCard;
  const mixedDiff = mixedSum - grandTotal;
  const mixedValid = Math.abs(mixedDiff) < 0.5;

  // ---------- Submit guard ----------
  const canSubmit = useMemo<boolean>(() => {
    if (!ticket || loading || submitting) return false;
    if (ticket.invoice_items.length === 0) return false;
    if (grandTotal <= 0) return false;
    // Si pidió factura, el correo debe ser válido antes de cobrar.
    if (wantsInvoice && !isValidEmail(invoiceEmail)) return false;
    if (paymentMethod === "cash") {
      // Allow cash even if no "received" entered (assume exact change).
      if (cashReceivedRaw.trim() !== "" && cashReceived < grandTotal) return false;
      return true;
    }
    if (paymentMethod === "card") {
      // Voucher recommended, not required.
      return true;
    }
    if (paymentMethod === "mixed") {
      return mixedValid && mixedCash > 0 && mixedCard > 0;
    }
    return false;
  }, [
    ticket, loading, submitting, grandTotal, paymentMethod,
    cashReceivedRaw, cashReceived, mixedValid, mixedCash, mixedCard,
    wantsInvoice, invoiceEmail,
  ]);

  // ---------- Side-effect helper ----------
  const dispatchTicketEvent = (): void => {
    try {
      window.dispatchEvent(new CustomEvent("ticketCreated"));
    } catch {
      // window unavailable — ignore
    }
  };

  // ---------- Add item ----------
  const handleAddItem = async (): Promise<void> => {
    if (!ticketId) return;
    if (pickerTab === "service" && (!pickerService || !pickerSeller)) return;
    if (pickerTab === "product" && (!pickerProduct || !pickerSeller)) return;
    setAdding(true);
    try {
      if (pickerTab === "service" && pickerService && pickerSeller) {
        const svc = pickerService.data;
        await api.post(`/tickets/${ticketId}/items`, {
          item_type: "service",
          related_id: svc.id,
          description: svc.name,
          quantity: Math.max(1, pickerQty || 1),
          unit_price: toNumber(svc.price),
          seller_id: pickerSeller.value,
        });
      } else if (pickerTab === "product" && pickerProduct && pickerSeller) {
        const prod = pickerProduct.data;
        await api.post(`/tickets/${ticketId}/items`, {
          item_type: "product",
          related_id: prod.id,
          description: prod.name,
          quantity: Math.max(1, pickerQty || 1),
          unit_price: toNumber(prod.sale_price),
          seller_id: pickerSeller.value,
        });
      }
      // Reset picker, keep open for rapid additions
      setPickerService(null);
      setPickerProduct(null);
      setPickerQty(1);
      await fetchTicket();
      dispatchTicketEvent();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo agregar el ítem.";
      await Swal.fire({ icon: "error", title: "Error", text: String(msg) });
    } finally {
      setAdding(false);
    }
  };

  // ---------- Delete item ----------
  const handleDeleteItem = async (itemId: string): Promise<void> => {
    if (!ticketId) return;
    setRemovingItemId(itemId);
    try {
      await api.delete(`/tickets/${ticketId}/items/${itemId}`);
      await fetchTicket();
      dispatchTicketEvent();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo eliminar el ítem.";
      await Swal.fire({ icon: "error", title: "Error", text: String(msg) });
    } finally {
      setRemovingItemId(null);
    }
  };

  // ---------- Submit (close ticket / pay) ----------
  const handleSubmit = async (): Promise<void> => {
    if (!ticket || !canSubmit) return;
    setSubmitting(true);
    try {
      const tipRecipientUserId =
        tipAmount > 0 && tipRecipient && tipRecipient !== SALON_RECIPIENT
          ? tipRecipient
          : undefined;

      const body: Record<string, unknown> = {
        tip_amount: tipAmount,
        payment_method: paymentMethod,
      };
      if (tipRecipientUserId) {
        body.tip_recipient_user_id = tipRecipientUserId;
      }
      if ((paymentMethod === "card" || paymentMethod === "mixed") && voucher.trim()) {
        body.voucher = voucher.trim();
      }
      const wantsInvoiceEmail = wantsInvoice && isValidEmail(invoiceEmail);
      if (wantsInvoiceEmail) {
        body.invoice_email = invoiceEmail.trim();
      }

      const { data } = await api.post(`/tickets/${ticket.id}/close`, body);

      dispatchTicketEvent();

      const emailed = wantsInvoiceEmail && (data as any)?.invoice_emailed;
      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: emailed ? "Pagado · factura enviada" : "Pagado",
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
      });
      if (wantsInvoiceEmail && !emailed) {
        // El cobro quedó hecho pero el correo falló; lo avisamos sin bloquear.
        void Swal.fire({
          icon: "warning",
          title: "Cobro exitoso, pero no se pudo enviar la factura",
          text: `Revisa el correo "${invoiceEmail.trim()}" e inténtalo de nuevo desde el detalle de la venta.`,
        });
      }

      onPaid();
      onClose();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo cerrar el ticket.";
      await Swal.fire({
        icon: "error",
        title: "Error en el cobro",
        text: String(msg),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Style fragments ----------
  const drawerStyle: React.CSSProperties = {
    width: 640,
    maxWidth: "100%",
  };

  const sectionEyebrow: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: SC.muted,
  };

  const methodTileStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    minHeight: 84,
    border: active ? `1.5px solid ${SC.success}` : `1px solid ${SC.border2}`,
    background: active ? SC.successBg : "#ffffff",
    color: active ? SC.success : SC.text,
    borderRadius: 12,
    cursor: submitting ? "not-allowed" : "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontWeight: 600,
    fontSize: 13,
    transition: "all 150ms ease",
    padding: 10,
  });

  const tipChipStyle = (active: boolean): React.CSSProperties => ({
    border: active ? `1.5px solid ${SC.warn}` : `1px solid ${SC.border2}`,
    background: active ? SC.warnBg : "#ffffff",
    color: active ? SC.warn : SC.text,
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: submitting ? "not-allowed" : "pointer",
    transition: "all 150ms ease",
  });

  const itemAvatar = (name: string): React.CSSProperties => ({
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: colorFromString(name || "?"),
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  const reactSelectStyles = useMemo(
    () => ({
      control: (base: any) => ({ ...base, minHeight: 36, fontSize: 13 }),
      menu: (base: any) => ({ ...base, fontSize: 13, zIndex: 5 }),
    }),
    []
  );

  // ---------- Render: header title ----------
  const headerTitle = (): React.ReactNode => {
    const clientName =
      userFullName(ticket?.users) ||
      ticket?.client_name_adhoc ||
      "Cliente";
    const ref = ticket ? ticket.id.slice(0, 8).toUpperCase() : "";
    return (
      <div className="d-flex flex-column" style={{ minWidth: 0 }}>
        <div
          className="fw-bold text-truncate"
          style={{ fontSize: 16, color: SC.text }}
        >
          {clientName}
        </div>
        <div className="d-flex align-items-center gap-2 mt-1">
          {ref && (
            <span
              className="badge bg-light text-muted"
              style={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              #{ref}
            </span>
          )}
          <span
            className="badge"
            style={{
              background: SC.warnBg,
              color: SC.warn,
              border: `1px solid ${SC.warnBorder}`,
              fontWeight: 600,
            }}
          >
            Abierto
          </span>
        </div>
      </div>
    );
  };

  // ---------- Render: items list ----------
  const renderItems = (): React.ReactNode => {
    if (!ticket) return null;
    if (ticket.invoice_items.length === 0) {
      return (
        <div
          className="d-flex flex-column align-items-center justify-content-center text-center py-4 px-3"
          style={{
            background: "#fafafa",
            borderRadius: 10,
            border: `1px dashed ${SC.border2}`,
            color: SC.muted,
          }}
        >
          <i
            className="ri-shopping-cart-2-line mb-2"
            style={{ fontSize: 28, color: SC.muted }}
          />
          <div style={{ fontSize: 13, fontWeight: 600, color: SC.text }}>
            Aún no hay items
          </div>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Agrega un servicio o producto para cobrar.
          </div>
        </div>
      );
    }
    return (
      <div className="d-flex flex-column" style={{ gap: 6 }}>
        {ticket.invoice_items.map((it) => {
          const name = itemLineName(it);
          const sellerName = userFullName(it.users);
          const qty = toNumber(it.quantity);
          const unit = toNumber(it.unit_price);
          const total = toNumber(it.total_price);
          const isProduct = it.item_type === "product";
          const removing = removingItemId === it.id;
          return (
            <div
              key={it.id}
              className="d-flex align-items-center gap-2 p-2"
              style={{
                background: "#ffffff",
                borderRadius: 10,
                border: `1px solid ${SC.border}`,
                borderLeft: `3px solid ${isProduct ? SC.info : SC.success}`,
              }}
            >
              {sellerName ? (
                <span
                  style={itemAvatar(sellerName)}
                  title={sellerName}
                  aria-label={sellerName}
                >
                  {getInitials(sellerName)}
                </span>
              ) : (
                <span
                  style={{
                    ...itemAvatar("?"),
                    background: SC.border2,
                    color: SC.muted,
                  }}
                  title="Sin estilista"
                  aria-label="Sin estilista"
                >
                  ?
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="text-truncate fw-semibold"
                  style={{ fontSize: 13, color: SC.text }}
                >
                  {name}
                </div>
                <div
                  className="text-muted"
                  style={{ fontSize: 11 }}
                >
                  {sellerName || "Sin estilista"} · {qty} x {fmtMoney(unit)}
                </div>
              </div>
              <div
                className="text-end fw-bold"
                style={{ fontSize: 13, color: SC.text, minWidth: 80 }}
              >
                {fmtMoney(total)}
              </div>
              <Button
                color="link"
                className="p-1 text-danger"
                onClick={() => void handleDeleteItem(it.id)}
                disabled={removing || submitting}
                title="Eliminar línea"
                style={{ lineHeight: 1 }}
              >
                {removing ? (
                  <Spinner size="sm" />
                ) : (
                  <i className="ri-delete-bin-line" style={{ fontSize: 16 }} />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------- Render: add picker ----------
  const serviceOptions: SelectOpt<CatalogService>[] = useMemo(
    () =>
      catalogServices.map((s) => ({
        value: s.id,
        label: `${s.name} — ${fmtMoney(toNumber(s.price))}`,
        data: s,
      })),
    [catalogServices]
  );

  const productOptions: SelectOpt<CatalogProduct>[] = useMemo(
    () =>
      catalogProducts.map((p) => ({
        value: p.id,
        label: `${p.name} — ${fmtMoney(toNumber(p.sale_price))}`,
        data: p,
      })),
    [catalogProducts]
  );

  const sellerOptions: SelectOpt<UserSlim>[] = useMemo(
    () =>
      stylists.map((s) => ({
        value: s.id,
        label: userFullName(s) || s.id.slice(0, 6),
        data: s,
      })),
    [stylists]
  );

  const renderPicker = (): React.ReactNode => {
    if (!pickerOpen) return null;
    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
      flex: 1,
      padding: "6px 10px",
      borderRadius: 8,
      border: active ? `1px solid ${SC.success}` : `1px solid ${SC.border2}`,
      background: active ? SC.successBg : "#ffffff",
      color: active ? SC.success : SC.text,
      fontWeight: 600,
      fontSize: 12,
      cursor: "pointer",
    });
    const canAdd =
      pickerTab === "service"
        ? !!pickerService && !!pickerSeller && !adding
        : !!pickerProduct && !!pickerSeller && !adding;
    return (
      <div
        className="mt-2 p-3"
        style={{
          background: "#fafafa",
          border: `1px solid ${SC.border}`,
          borderRadius: 10,
        }}
      >
        <div className="d-flex gap-2 mb-3">
          <button
            type="button"
            style={tabBtnStyle(pickerTab === "service")}
            onClick={() => setPickerTab("service")}
            disabled={adding}
          >
            <i className="ri-scissors-cut-line me-1" />
            Servicio
          </button>
          <button
            type="button"
            style={tabBtnStyle(pickerTab === "product")}
            onClick={() => setPickerTab("product")}
            disabled={adding}
          >
            <i className="ri-shopping-bag-3-line me-1" />
            Producto
          </button>
        </div>

        <div className="mb-2">
          <Label style={{ fontSize: 11, marginBottom: 4 }} className="text-muted fw-semibold">
            {pickerTab === "service" ? "Servicio" : "Producto"}
          </Label>
          {pickerTab === "service" ? (
            <Select
              isSearchable
              isClearable
              placeholder="Buscar servicio..."
              options={serviceOptions}
              value={pickerService}
              onChange={(opt: any) => setPickerService(opt as SelectOpt<CatalogService> | null)}
              isDisabled={adding || serviceOptions.length === 0}
              styles={reactSelectStyles}
              noOptionsMessage={() =>
                catalogsLoaded ? "Sin servicios" : "Cargando..."
              }
            />
          ) : (
            <Select
              isSearchable
              isClearable
              placeholder="Buscar producto..."
              options={productOptions}
              value={pickerProduct}
              onChange={(opt: any) => setPickerProduct(opt as SelectOpt<CatalogProduct> | null)}
              isDisabled={adding || productOptions.length === 0}
              styles={reactSelectStyles}
              noOptionsMessage={() =>
                catalogsLoaded ? "Sin productos" : "Cargando..."
              }
            />
          )}
        </div>

        <div className="row g-2">
          <div className="col-4">
            <Label style={{ fontSize: 11, marginBottom: 4 }} className="text-muted fw-semibold">
              Cantidad
            </Label>
            <Input
              type="number"
              min={1}
              value={pickerQty}
              onChange={(e) => setPickerQty(Math.max(1, Number(e.target.value) || 1))}
              disabled={adding}
              bsSize="sm"
              className="bg-white"
            />
          </div>
          <div className="col-8">
            <Label style={{ fontSize: 11, marginBottom: 4 }} className="text-muted fw-semibold">
              Estilista
            </Label>
            <Select
              isSearchable
              isClearable
              placeholder="Selecciona..."
              options={sellerOptions}
              value={pickerSeller}
              onChange={(opt: any) => setPickerSeller(opt as SelectOpt<UserSlim> | null)}
              isDisabled={adding || sellerOptions.length === 0}
              styles={reactSelectStyles}
              noOptionsMessage={() =>
                catalogsLoaded ? "Sin estilistas" : "Cargando..."
              }
            />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button
            color="light"
            size="sm"
            onClick={() => setPickerOpen(false)}
            disabled={adding}
          >
            Cancelar
          </Button>
          <Button
            color="success"
            size="sm"
            onClick={() => void handleAddItem()}
            disabled={!canAdd}
          >
            {adding ? (
              <>
                <Spinner size="sm" className="me-1" /> Agregando...
              </>
            ) : (
              <>
                <i className="ri-add-line me-1" />
                Añadir
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ---------- Main render ----------
  return (
    <Offcanvas
      isOpen={isOpen}
      toggle={() => {
        if (!submitting) onClose();
      }}
      direction="end"
      style={drawerStyle}
    >
      <OffcanvasHeader
        toggle={() => {
          if (!submitting) onClose();
        }}
        style={{ borderBottom: `1px solid ${SC.border}` }}
      >
        {headerTitle()}
      </OffcanvasHeader>

      <OffcanvasBody
        className="d-flex flex-column p-0"
        style={{ background: "#f8fafc" }}
      >
        {loading && (
          <div
            className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5"
            style={{ gap: 10 }}
          >
            <Spinner size="sm" />
            <div className="text-muted" style={{ fontSize: 12 }}>
              Cargando ticket...
            </div>
          </div>
        )}

        {!loading && loadError && (
          <div
            className="d-flex flex-column align-items-center justify-content-center flex-grow-1 px-3 py-5"
            style={{ gap: 12 }}
          >
            <i
              className="ri-error-warning-line"
              style={{ fontSize: 32, color: SC.danger }}
            />
            <div
              className="text-center"
              style={{ fontSize: 13, color: SC.text }}
            >
              {loadError}
            </div>
            <Button
              color="light"
              size="sm"
              onClick={() => void fetchTicket()}
            >
              <i className="ri-refresh-line me-1" />
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !loadError && ticket && (
          <>
            {/* Scrollable content */}
            <div
              className="flex-grow-1 overflow-auto p-3"
              style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}
            >
              {/* --- ITEMS CARD --- */}
              <Card className="border-0 shadow-sm">
                <CardBody className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div style={sectionEyebrow}>Items en el ticket</div>
                    {tenantId && (
                      <Button
                        color="success"
                        outline
                        size="sm"
                        onClick={() => setPickerOpen((v) => !v)}
                        disabled={submitting}
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        <i
                          className={
                            pickerOpen ? "ri-close-line me-1" : "ri-add-line me-1"
                          }
                        />
                        {pickerOpen ? "Cerrar" : "Agregar"}
                      </Button>
                    )}
                  </div>
                  {renderPicker()}
                  <div className={pickerOpen ? "mt-3" : ""}>
                    {renderItems()}
                  </div>
                </CardBody>
              </Card>

              {/* --- TIP CARD --- */}
              {ticket.invoice_items.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardBody className="p-3">
                    <div style={sectionEyebrow} className="mb-2">
                      Propina
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div className="d-flex flex-wrap" style={{ gap: 6 }}>
                        {TIP_PRESETS.map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              if (submitting) return;
                              setTipPreset(p.key);
                              if (p.key !== "custom") setTipCustomRaw("");
                            }}
                            style={tipChipStyle(tipPreset === p.key)}
                            disabled={submitting}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {tipPreset === "custom" && (
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={tipCustomRaw}
                          onChange={(e) => setTipCustomRaw(e.target.value)}
                          onBlur={() => {
                            const n = parseAmount(tipCustomRaw);
                            if (n > 0) setTipCustomRaw(n.toLocaleString("es-CO"));
                          }}
                          placeholder="$ 0"
                          disabled={submitting}
                          bsSize="sm"
                          className="bg-white"
                          style={{ maxWidth: 140 }}
                        />
                      )}
                      {tipAmount > 0 && (
                        <div className="ms-auto d-flex align-items-center gap-2">
                          <Label
                            className="text-muted mb-0"
                            style={{ fontSize: 11 }}
                          >
                            Para:
                          </Label>
                          <Input
                            type="select"
                            value={tipRecipient}
                            onChange={(e) => setTipRecipient(e.target.value)}
                            disabled={submitting}
                            bsSize="sm"
                            className="bg-white"
                            style={{ maxWidth: 220 }}
                          >
                            <option value={SALON_RECIPIENT}>
                              Salón (split entre estilistas)
                            </option>
                            {sellersFromTicket.map((s) => (
                              <option key={s.id} value={s.id}>
                                {userFullName(s) || s.id.slice(0, 6)}
                              </option>
                            ))}
                          </Input>
                        </div>
                      )}
                    </div>
                    {tipAmount > 0 && (
                      <div className="mt-2 text-info" style={{ fontSize: 12 }}>
                        Propina: <strong>{fmtMoney(tipAmount)}</strong>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* --- PAYMENT METHOD CARD --- */}
              {ticket.invoice_items.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardBody className="p-3">
                    <div style={sectionEyebrow} className="mb-2">
                      Método de pago
                    </div>
                    <div className="d-flex" style={{ gap: 8 }}>
                      <button
                        type="button"
                        style={methodTileStyle(paymentMethod === "cash")}
                        onClick={() => {
                          if (!submitting) setPaymentMethod("cash");
                        }}
                        disabled={submitting}
                      >
                        <i
                          className="ri-money-dollar-circle-line"
                          style={{ fontSize: 24 }}
                        />
                        <span>Efectivo</span>
                      </button>
                      <button
                        type="button"
                        style={methodTileStyle(paymentMethod === "card")}
                        onClick={() => {
                          if (!submitting) setPaymentMethod("card");
                        }}
                        disabled={submitting}
                      >
                        <i
                          className="ri-bank-card-line"
                          style={{ fontSize: 24 }}
                        />
                        <span>Tarjeta</span>
                      </button>
                      <button
                        type="button"
                        style={methodTileStyle(paymentMethod === "mixed")}
                        onClick={() => {
                          if (!submitting) setPaymentMethod("mixed");
                        }}
                        disabled={submitting}
                      >
                        <i
                          className="ri-swap-line"
                          style={{ fontSize: 24 }}
                        />
                        <span>Mixto</span>
                      </button>
                    </div>

                    {/* CASH branch */}
                    {paymentMethod === "cash" && (
                      <div className="mt-3">
                        <Label
                          className="text-muted fw-semibold"
                          style={{ fontSize: 11, marginBottom: 4 }}
                        >
                          Recibido
                        </Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={cashReceivedRaw}
                          onChange={(e) => setCashReceivedRaw(e.target.value)}
                          onBlur={() => {
                            const n = parseAmount(cashReceivedRaw);
                            if (n > 0) setCashReceivedRaw(n.toLocaleString("es-CO"));
                          }}
                          placeholder={fmtMoney(grandTotal)}
                          disabled={submitting}
                          bsSize="sm"
                          className="bg-white"
                        />
                        {cashReceivedRaw.trim() !== "" && (
                          <div
                            className="d-flex justify-content-between mt-2 p-2"
                            style={{
                              background: cashChange < 0 ? SC.dangerBg : SC.successBg,
                              border: `1px solid ${
                                cashChange < 0 ? SC.dangerBorder : SC.successBorder
                              }`,
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          >
                            <span
                              className="fw-semibold"
                              style={{
                                color: cashChange < 0 ? SC.danger : SC.success,
                              }}
                            >
                              {cashChange < 0 ? "Falta" : "Cambio"}
                            </span>
                            <span
                              className="fw-bold"
                              style={{
                                color: cashChange < 0 ? SC.danger : SC.success,
                              }}
                            >
                              {fmtMoney(Math.abs(cashChange))}
                            </span>
                          </div>
                        )}
                        <div
                          className="mt-2 text-muted"
                          style={{ fontSize: 11, fontStyle: "italic" }}
                        >
                          <i className="ri-information-line me-1" />
                          Para cobrar en efectivo necesitas tener una caja abierta.
                        </div>
                      </div>
                    )}

                    {/* CARD branch */}
                    {paymentMethod === "card" && (
                      <div className="mt-3 row g-2">
                        <div className="col-12">
                          <Label
                            className="text-muted fw-semibold"
                            style={{ fontSize: 11, marginBottom: 4 }}
                          >
                            Voucher / Referencia
                          </Label>
                          <Input
                            type="text"
                            value={voucher}
                            onChange={(e) => setVoucher(e.target.value)}
                            placeholder="Ej: 123456"
                            disabled={submitting}
                            bsSize="sm"
                            className="bg-white"
                          />
                        </div>
                        <div className="col-12">
                          <div
                            className="d-flex justify-content-between p-2"
                            style={{
                              background: SC.infoBg,
                              border: `1px solid ${SC.infoBorder}`,
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          >
                            <span className="text-muted">A cobrar a la tarjeta</span>
                            <span className="fw-bold" style={{ color: SC.info }}>
                              {fmtMoney(grandTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MIXED branch */}
                    {paymentMethod === "mixed" && (
                      <div className="mt-3">
                        <div className="row g-2">
                          <div className="col-6">
                            <Label
                              className="text-muted fw-semibold"
                              style={{ fontSize: 11, marginBottom: 4 }}
                            >
                              Efectivo
                            </Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={mixedCashRaw}
                              onChange={(e) => setMixedCashRaw(e.target.value)}
                              onBlur={() => {
                                const n = parseAmount(mixedCashRaw);
                                if (n > 0) setMixedCashRaw(n.toLocaleString("es-CO"));
                              }}
                              placeholder="$ 0"
                              disabled={submitting}
                              bsSize="sm"
                              className="bg-white"
                            />
                          </div>
                          <div className="col-6">
                            <Label
                              className="text-muted fw-semibold"
                              style={{ fontSize: 11, marginBottom: 4 }}
                            >
                              Tarjeta
                            </Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={mixedCardRaw}
                              onChange={(e) => setMixedCardRaw(e.target.value)}
                              onBlur={() => {
                                const n = parseAmount(mixedCardRaw);
                                if (n > 0) setMixedCardRaw(n.toLocaleString("es-CO"));
                              }}
                              placeholder="$ 0"
                              disabled={submitting}
                              bsSize="sm"
                              className="bg-white"
                            />
                          </div>
                          <div className="col-12">
                            <Label
                              className="text-muted fw-semibold"
                              style={{ fontSize: 11, marginBottom: 4 }}
                            >
                              Voucher / Referencia
                            </Label>
                            <Input
                              type="text"
                              value={voucher}
                              onChange={(e) => setVoucher(e.target.value)}
                              placeholder="Ej: 123456"
                              disabled={submitting}
                              bsSize="sm"
                              className="bg-white"
                            />
                          </div>
                        </div>
                        <div
                          className="mt-2 d-flex justify-content-between p-2"
                          style={{
                            background: mixedValid ? SC.successBg : SC.dangerBg,
                            border: `1px solid ${
                              mixedValid ? SC.successBorder : SC.dangerBorder
                            }`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          <span
                            className="fw-semibold"
                            style={{
                              color: mixedValid ? SC.success : SC.danger,
                            }}
                          >
                            Suma
                          </span>
                          <span
                            className="fw-bold"
                            style={{
                              color: mixedValid ? SC.success : SC.danger,
                            }}
                          >
                            {fmtMoney(mixedSum)} / {fmtMoney(grandTotal)}
                          </span>
                        </div>
                        {!mixedValid && (mixedCash > 0 || mixedCard > 0) && (
                          <div
                            className="mt-1 text-danger"
                            style={{ fontSize: 11 }}
                          >
                            La suma debe coincidir con el total ({fmtMoney(grandTotal)}).
                            {mixedDiff > 0
                              ? ` Sobran ${fmtMoney(mixedDiff)}.`
                              : ` Faltan ${fmtMoney(-mixedDiff)}.`}
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>

            {/* --- STICKY FOOTER --- */}
            <div
              style={{
                borderTop: `1px solid ${SC.border}`,
                padding: 16,
                background: "#ffffff",
                position: "sticky",
                bottom: 0,
              }}
            >
              {/* Factura por correo (el cliente la pide) */}
              <div className="mb-2">
                <div className="form-check form-switch">
                  <Input
                    type="switch"
                    role="switch"
                    id="pay-wants-invoice"
                    checked={wantsInvoice}
                    disabled={submitting}
                    onChange={(e) => setWantsInvoice(e.target.checked)}
                  />
                  <Label
                    for="pay-wants-invoice"
                    className="form-check-label text-body"
                    style={{ fontSize: 13, cursor: "pointer" }}
                  >
                    <i className="ri-mail-send-line me-1" />
                    El cliente pide factura por correo
                  </Label>
                </div>
                {wantsInvoice && (
                  <div className="mt-2">
                    <Input
                      type="email"
                      value={invoiceEmail}
                      onChange={(e) => setInvoiceEmail(e.target.value)}
                      placeholder="correo@cliente.com"
                      disabled={submitting}
                      bsSize="sm"
                      className="bg-white"
                      invalid={invoiceEmail.length > 0 && !isValidEmail(invoiceEmail)}
                    />
                    {invoiceEmail.length > 0 && !isValidEmail(invoiceEmail) && (
                      <div className="text-danger" style={{ fontSize: 11, marginTop: 2 }}>
                        Correo inválido.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div
                className="bg-light-subtle p-2 mb-2"
                style={{ borderRadius: 8 }}
              >
                <div
                  className="d-flex justify-content-between text-body"
                  style={{ fontSize: 12 }}
                >
                  <span>Subtotal</span>
                  <span className="fw-semibold">{fmtMoney(subtotal)}</span>
                </div>
                {tipAmount > 0 && (
                  <div
                    className="d-flex justify-content-between text-info mt-1"
                    style={{ fontSize: 12 }}
                  >
                    <span>Propina</span>
                    <span className="fw-semibold">{fmtMoney(tipAmount)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between align-items-center">
                  <span
                    className="text-dark fw-bold"
                    style={{ fontSize: 14 }}
                  >
                    Total
                  </span>
                  <span
                    className="text-dark fw-bold"
                    style={{ fontSize: 18 }}
                  >
                    {fmtMoney(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                {onOpenFullPOS && (
                  <Button
                    color="link"
                    className="p-0 text-muted"
                    onClick={() => {
                      if (!submitting && ticket) {
                        onOpenFullPOS(ticket.id);
                      }
                    }}
                    disabled={submitting}
                    style={{ fontSize: 12, textDecoration: "none" }}
                  >
                    <i className="ri-external-link-line me-1" />
                    Abrir POS completo
                  </Button>
                )}
                <Button
                  color="success"
                  size="lg"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="ms-auto flex-grow-1"
                  style={{
                    fontWeight: 700,
                    minWidth: 200,
                  }}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Procesando...
                    </>
                  ) : (
                    <>Cobrar {fmtMoney(grandTotal)}</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default PayTicketDrawer;
