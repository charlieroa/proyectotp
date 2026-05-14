// Ubicación: pages/Pages/Profile/Settings/datostenant.tsx

import React, { ChangeEvent } from "react";
import { Row, Col, Input, Label, Button, Spinner, Card, CardBody } from "reactstrap";
import classnames from "classnames";
import { useTranslation } from "react-i18next";

/* ===== Tipos locales ===== */
export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type DayState = { active: boolean; start: string; end: string };
export type WorkingHoursPerDay = Record<DayKey, DayState>;

const DAY_KEYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/* ===== Plan gating helpers ===== */
const PLAN_ORDER = ["free", "pro", "business", "enterprise"];
const PLAN_MODULES: Record<string, string[]> = {
  free: [],
  pro: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips"],
  business: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot"],
  enterprise: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot", "shared_stylists", "branch_color", "cross_branch_schedule"],
};
const PLAN_LABEL_KEYS: Record<string, string> = { free: "settings_plan_free", pro: "settings_plan_pro", business: "settings_plan_business", enterprise: "settings_plan_enterprise" };

const isModuleAllowed = (plan: string, moduleKey: string): boolean => {
  const idx = PLAN_ORDER.indexOf(plan);
  for (let i = idx; i >= 0; i--) {
    if (PLAN_MODULES[PLAN_ORDER[i]]?.includes(moduleKey)) return true;
  }
  return false;
};
const getMinPlanForModule = (moduleKey: string): string => {
  for (const p of PLAN_ORDER) {
    if (PLAN_MODULES[p]?.includes(moduleKey)) return p;
  }
  return "enterprise";
};

/* ===== Props ===== */
export type DatosTenantProps = {
  section: "datos" | "horario";
  name: string; phone: string; address: string; city: string; email: string; website: string; ivaRate: string; adminFee: string;
  setName: (v: string) => void; setPhone: (v: string) => void; setAddress: (v: string) => void; setCity: (v: string) => void; setEmail: (v: string) => void;
  setWebsite: (v: string) => void; setIvaRate: (v: string) => void; setAdminFee: (v: string) => void;

  productsForStaff: boolean; setProductsForStaff: (v: boolean) => void;
  adminFeeEnabled: boolean; setAdminFeeEnabled: (v: boolean) => void;
  loansToStaff: boolean; setLoansToStaff: (v: boolean) => void;
  allowPastAppointments: boolean; setAllowPastAppointments: (v: boolean) => void;

  sharedStylistsEnabled: boolean; setSharedStylistsEnabled: (v: boolean) => void;
  multiStylistEnabled: boolean; setMultiStylistEnabled: (v: boolean) => void;
  ticketVirtualEnabled: boolean; setTicketVirtualEnabled: (v: boolean) => void;
  crossBranchScheduleBlock: boolean; setCrossBranchScheduleBlock: (v: boolean) => void;
  manageAllBranchesCash: boolean; setManageAllBranchesCash: (v: boolean) => void;
  priceOverrideEnabled: boolean; setPriceOverrideEnabled: (v: boolean) => void;
  tipSalonPercent: string; setTipSalonPercent: (v: string) => void;
  branchColor: string; setBranchColor: (v: string) => void;
  hasBranches: boolean;
  isPrimaryBranch: boolean;
  isAdmin: boolean;

  perDay: WorkingHoursPerDay;
  toggleDay: (day: DayKey) => void;
  changeHour: (day: DayKey, field: "start" | "end", value: string) => void;
  applyMondayToAll: () => void;

  plan?: string;
  saving?: boolean;
  onSubmit?: (e?: React.FormEvent) => void;
  onCancel?: () => void;
};

/* ===== Icon color mapping ===== */
const iconColors: Record<string, string> = {
  warning: "bg-warning-subtle text-warning",
  info: "bg-info-subtle text-info",
  primary: "bg-primary-subtle text-primary",
  danger: "bg-danger-subtle text-danger",
  success: "bg-success-subtle text-success",
};

/* ===== Componente de tarjeta de módulo ===== */
type ModuleCardProps = {
  icon: string;
  color: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  switchId: string;
  locked?: boolean;
  requiredPlan?: string;
  extraContent?: React.ReactNode;
};

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, color, title, description, checked, onChange, switchId, locked, requiredPlan, extraContent }) => {
  const { t } = useTranslation();
  const iconBgClass = locked ? "bg-light text-muted" : (iconColors[color] || "bg-light text-muted");
  const planLabel = requiredPlan ? (t(PLAN_LABEL_KEYS[requiredPlan] || "") || requiredPlan) : "";

  return (
    <Card className={classnames("h-100", { "opacity-75": locked })}>
      <CardBody>
        <div className="d-flex align-items-center gap-3">
          <div className="flex-shrink-0">
            <div className={`${iconBgClass} rounded avatar-sm d-flex align-items-center justify-content-center fs-20`}>
              <i className={locked ? "ri-lock-line" : icon}></i>
            </div>
          </div>
          <div className="flex-grow-1 min-w-0">
            <h6 className="fw-semibold mb-0 d-flex align-items-center gap-2">
              {title}
              {locked && requiredPlan && (
                <span className="badge bg-warning-subtle text-warning rounded-pill">
                  {planLabel}
                </span>
              )}
            </h6>
            <p className="text-muted mb-0 mt-1">
              {locked ? t("settings_available_from_plan", { plan: planLabel }) : description}
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="form-check form-switch">
              <Input
                type="switch"
                className="form-check-input"
                id={switchId}
                checked={locked ? false : checked}
                onChange={() => { if (!locked) onChange(!checked); }}
                disabled={locked}
              />
            </div>
          </div>
        </div>
        {!locked && checked && extraContent && (
          <div className="mt-3 pt-3 border-top">
            {extraContent}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const DatosTenant: React.FC<DatosTenantProps> = ({
  section,
  name, phone, address, city, email, website, ivaRate, adminFee,
  setName, setPhone, setAddress, setCity, setEmail, setWebsite, setIvaRate, setAdminFee,
  productsForStaff, setProductsForStaff,
  adminFeeEnabled, setAdminFeeEnabled,
  loansToStaff, setLoansToStaff,
  allowPastAppointments, setAllowPastAppointments,
  sharedStylistsEnabled, setSharedStylistsEnabled,
  multiStylistEnabled, setMultiStylistEnabled,
  ticketVirtualEnabled, setTicketVirtualEnabled,
  crossBranchScheduleBlock, setCrossBranchScheduleBlock,
  manageAllBranchesCash, setManageAllBranchesCash,
  priceOverrideEnabled, setPriceOverrideEnabled,
  tipSalonPercent, setTipSalonPercent,
  branchColor, setBranchColor,
  hasBranches,
  isPrimaryBranch,
  isAdmin,
  perDay, toggleDay, changeHour, applyMondayToAll,
  plan = "free",
  saving = false,
  onSubmit, onCancel,
}) => {

  const { t } = useTranslation();

  const handleInputChange = (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
  };

  const handleWebsiteChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    if (value === "") { setWebsite(""); return; }
    if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
      if (value.startsWith("www.")) value = value.substring(4);
      value = "https://www." + value;
    }
    setWebsite(value);
  };

  const getWebsiteDisplayValue = () => website || "";

  // Helper: check if module is allowed by current plan
  const allowed = (moduleKey: string) => isModuleAllowed(plan, moduleKey);
  const minPlan = (moduleKey: string) => getMinPlanForModule(moduleKey);

  /* ------- UI: Datos del Negocio ------- */
  const DatosForm = (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}>
      <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <i className="ri-store-2-line text-primary"></i>
        {t("settings_business_info")}
      </h5>
      <Row className="g-3">
        <Col md={6}>
          <Label htmlFor="tenant-name" className="form-label">{t("name")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-building-line"></i></span>
            <Input id="tenant-name" value={name} onChange={handleInputChange(setName)} placeholder={t("settings_name_placeholder")} required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-phone" className="form-label">{t("phone")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-phone-line"></i></span>
            <Input id="tenant-phone" value={phone} onChange={handleInputChange(setPhone)} placeholder={t("settings_phone_placeholder")} required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-address" className="form-label">{t("settings_address")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-map-pin-line"></i></span>
            <Input id="tenant-address" value={address} onChange={handleInputChange(setAddress)} placeholder={t("settings_address_placeholder")} required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-city" className="form-label">{t("settings_city")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-building-4-line"></i></span>
            <Input id="tenant-city" value={city} onChange={handleInputChange(setCity)} placeholder={t("settings_city_placeholder")} />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-email" className="form-label">{t("email")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-mail-line"></i></span>
            <Input id="tenant-email" type="email" value={email} onChange={handleInputChange(setEmail)} placeholder={t("settings_email_placeholder")} />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-website" className="form-label">{t("settings_website")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-global-line"></i></span>
            <Input id="tenant-website" type="text" value={getWebsiteDisplayValue()} onChange={handleWebsiteChange} placeholder={t("settings_website_placeholder")} />
          </div>
          <p className="text-muted fs-12 mt-1">{t("settings_website_hint")}</p>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-iva" className="form-label">{t("settings_iva")}</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-percent-line"></i></span>
            <Input id="tenant-iva" type="number" min={0} max={100} step="0.01" value={ivaRate} onChange={handleInputChange(setIvaRate)} placeholder="19" />
          </div>
        </Col>
      </Row>

      {/* --- MÓDULOS Y CONFIGURACIONES --- */}
      <div className="border-top my-4"></div>
      <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <i className="ri-settings-3-line text-primary"></i>
        {t("settings_modules_config")}
      </h5>
      <Row className="g-3 mb-3">
        <Col md={6}>
          <ModuleCard
            icon="ri-money-dollar-circle-line" color="warning"
            title={t("settings_admin_fee")} description={t("settings_admin_fee_desc")}
            checked={adminFeeEnabled} onChange={setAdminFeeEnabled} switchId="admin-fee-switch"
            locked={!allowed("admin_fee")} requiredPlan={minPlan("admin_fee")}
            extraContent={
              <div className="input-group" style={{ maxWidth: "200px" }}>
                <Input id="tenant-admin-fee" type="number" min={0} max={100} step="0.01" value={adminFee} onChange={handleInputChange(setAdminFee)} placeholder="10" />
                <span className="input-group-text">%</span>
              </div>
            }
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-shopping-bag-line" color="info"
            title={t("settings_products_staff")} description={t("settings_products_staff_desc")}
            checked={productsForStaff} onChange={setProductsForStaff} switchId="products-for-staff-switch"
            locked={!allowed("products_for_staff")} requiredPlan={minPlan("products_for_staff")}
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-hand-coin-line" color="primary"
            title={t("settings_loans_staff")} description={t("settings_loans_staff_desc")}
            checked={loansToStaff} onChange={setLoansToStaff} switchId="loans-to-staff-switch"
            locked={!allowed("loans_to_staff")} requiredPlan={minPlan("loans_to_staff")}
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-calendar-check-line" color="danger"
            title={t("settings_past_appointments")} description={t("settings_past_appointments_desc")}
            checked={allowPastAppointments} onChange={setAllowPastAppointments} switchId="allow-past-appointments-switch"
            locked={!allowed("allow_past_appointments")} requiredPlan={minPlan("allow_past_appointments")}
            extraContent={
              <div className="alert alert-warning mb-0">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-alert-line"></i>
                  <span><strong>{t("settings_special_mode")}:</strong> {t("settings_special_mode_desc")}</span>
                </div>
              </div>
            }
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-team-line" color="info"
            title={t("settings_multi_stylist") || "Servicio Multi-Estilista"}
            description={t("settings_multi_stylist_desc") || "Permite que un servicio sea atendido por más de un estilista simultáneamente. Configurable por servicio."}
            checked={multiStylistEnabled} onChange={setMultiStylistEnabled} switchId="multi-stylist-switch"
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-bill-line" color="primary"
            title={t("settings_ticket_virtual") || "Ticket virtual (sin cita previa)"}
            description={t("settings_ticket_virtual_desc") || "Activa una nueva sección 'Tickets' en el menú y un botón '+ Ticket' en la barra superior. Sirve para clientes que llegan sin cita: se abre un ticket, se le van agregando servicios/productos (pueden ser varios estilistas en el mismo ticket, cada uno agrega lo suyo) y al final la cajera lo cobra como cualquier factura — entra a la sesión de caja del día y las comisiones se congelan igual que en el punto de venta normal."}
            checked={ticketVirtualEnabled} onChange={setTicketVirtualEnabled} switchId="ticket-virtual-switch"
            extraContent={
              <div className="alert alert-info mb-0">
                <div className="d-flex align-items-start gap-2">
                  <i className="ri-information-line mt-1"></i>
                  <span className="small">
                    <strong>Úsalo cuando:</strong> llega un walk-in, alguien agrega un extra en el momento (manicure después del corte), o quieres abrir la cuenta sin que esté en la agenda. <br />
                    <strong>Para cobrar en efectivo</strong> se necesita la caja abierta.
                  </span>
                </div>
              </div>
            }
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-edit-2-line" color="warning"
            title={t("settings_price_override") || "Modificar precio en caja y tickets"}
            description={t("settings_price_override_desc") || "Permite que el cajero cambie el precio de un servicio o producto en el momento del cobro — tanto en el punto de venta como dentro de un ticket virtual (ej. flequillo en lugar de corte completo). Requiere motivo y queda auditado con el usuario que hizo el cambio."}
            checked={priceOverrideEnabled}
            onChange={(v) => { if (isAdmin) setPriceOverrideEnabled(v); }}
            switchId="price-override-switch"
            locked={!isAdmin}
            extraContent={!isAdmin ? undefined : (
              <div className="alert alert-warning mb-0">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-shield-user-line"></i>
                  <span><strong>{t("settings_admin_only") || "Solo administrador"}:</strong> {t("settings_price_override_hint") || "Cada cambio de precio queda registrado con motivo y usuario."}</span>
                </div>
              </div>
            )}
          />
          {!isAdmin && (
            <p className="text-muted fs-12 mt-2 mb-0 ps-2">
              <i className="ri-lock-line me-1"></i>
              {t("settings_admin_only_hint") || "Solo el administrador puede habilitar esta opcion."}
            </p>
          )}
        </Col>
        {hasBranches && (
          <Col md={6}>
            <ModuleCard
              icon="ri-user-shared-line" color="success"
              title={t("settings_shared_stylists")} description={t("settings_shared_stylists_desc")}
              checked={sharedStylistsEnabled} onChange={setSharedStylistsEnabled} switchId="shared-stylists-switch"
              locked={!allowed("shared_stylists")} requiredPlan={minPlan("shared_stylists")}
            />
          </Col>
        )}
        <Col md={6}>
          <ModuleCard
            icon="ri-hand-heart-line" color="success"
            title={t("settings_tips")} description={t("settings_tips_desc")}
            checked={Number(tipSalonPercent) > 0}
            onChange={(v) => { if (!v) setTipSalonPercent("0"); else setTipSalonPercent("10"); }}
            switchId="tip-salon-switch"
            locked={!allowed("tips")} requiredPlan={minPlan("tips")}
            extraContent={
              <div>
                <Label htmlFor="tip-salon-percent" className="form-label fs-12">{t("settings_tip_salon_pct")}</Label>
                <div className="input-group" style={{ maxWidth: "200px" }}>
                  <Input id="tip-salon-percent" type="number" min={0} max={100} step="0.01" value={tipSalonPercent} onChange={(e) => setTipSalonPercent(e.target.value)} placeholder="10" />
                  <span className="input-group-text">%</span>
                </div>
                <p className="text-muted fs-12 mt-1">{t("settings_tip_rest_stylist")}</p>
              </div>
            }
          />
        </Col>
        {hasBranches && isPrimaryBranch && (
          <Col md={6}>
            <ModuleCard
              icon="ri-calendar-close-line" color="danger"
              title={t("settings_cross_branch_block")}
              description={t("settings_cross_branch_block_desc")}
              checked={crossBranchScheduleBlock} onChange={setCrossBranchScheduleBlock} switchId="cross-branch-schedule-switch"
              locked={!allowed("cross_branch_schedule")} requiredPlan={minPlan("cross_branch_schedule")}
            />
          </Col>
        )}
        {hasBranches && isPrimaryBranch && (
          <Col md={6}>
            <ModuleCard
              icon="ri-bank-line" color="info"
              title={t("settings_manage_branches_cash")}
              description={t("settings_manage_branches_cash_desc")}
              checked={manageAllBranchesCash} onChange={setManageAllBranchesCash} switchId="manage-branches-cash-switch"
              locked={!allowed("cross_branch_schedule")} requiredPlan={minPlan("cross_branch_schedule")}
            />
          </Col>
        )}
        {hasBranches && (
          <Col md={6}>
            <ModuleCard
              icon="ri-palette-line" color="primary"
              title={t("settings_branch_color")} description={t("settings_branch_color_desc")}
              checked={true} onChange={() => {}} switchId="branch-color-switch"
              locked={!allowed("branch_color")} requiredPlan={minPlan("branch_color")}
              extraContent={
                <div className="d-flex align-items-center gap-2">
                  <Input id="branch-color" type="color" value={branchColor} onChange={(e) => setBranchColor(e.target.value)} className="form-control form-control-color" style={{ width: 48, height: 40 }} />
                  <Input type="text" value={branchColor} onChange={(e) => setBranchColor(e.target.value)} placeholder="#3788d8" style={{ width: 112 }} />
                </div>
              }
            />
          </Col>
        )}
      </Row>

      <div className="d-flex justify-content-end gap-2 pt-3">
        <Button color="light" type="button" onClick={() => onCancel?.()}>
          {t("cancel")}
        </Button>
        <Button color="primary" type="submit" disabled={saving}>
          {saving && <Spinner size="sm" className="me-1" />}
          {t("settings_save_changes")}
        </Button>
      </div>
    </form>
  );

  /* ------- UI: Horario ------- */
  const HorarioForm = (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}>
      <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <i className="ri-calendar-schedule-line text-primary"></i>
        {t("settings_working_hours")}
      </h5>
      <div>
        {DAY_KEYS.map((key) => {
          const day = perDay[key];
          const isMonday = key === "monday";
          const label = t(`settings_day_${key}`);
          return (
            <div
              key={key}
              className={classnames("rounded p-3 mb-3 border", {
                "bg-success-subtle border-success-subtle": day.active,
                "bg-light border-light": !day.active,
                "opacity-75": !day.active,
              })}
            >
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={classnames("ri-time-line fs-20", { "text-success": day.active, "text-muted": !day.active })}></i>
                  <div className="form-check form-switch mb-0">
                    <Input
                      type="switch"
                      className="form-check-input"
                      id={`active-${key}`}
                      checked={day.active}
                      onChange={() => toggleDay(key)}
                    />
                  </div>
                  <Label htmlFor={`active-${key}`} className={classnames("mb-0 fw-semibold", { "text-muted": !day.active })} style={{ cursor: "pointer" }}>
                    {label} {day.active ? `(${t("settings_open")})` : `(${t("settings_closed")})`}
                  </Label>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {day.active && (
                    <>
                      <div className="d-flex align-items-center gap-2">
                        <Label className="fs-12 text-muted mb-0" htmlFor={`start-${key}`}>{t("settings_start")}</Label>
                        <Input id={`start-${key}`} type="time" value={day.start} onChange={(e) => changeHour(key, "start", e.target.value)} bsSize="sm" />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Label className="fs-12 text-muted mb-0" htmlFor={`end-${key}`}>{t("settings_end")}</Label>
                        <Input id={`end-${key}`} type="time" value={day.end} onChange={(e) => changeHour(key, "end", e.target.value)} bsSize="sm" />
                      </div>
                    </>
                  )}
                  {isMonday && (
                    <Button color="soft-primary" size="sm" type="button" onClick={applyMondayToAll}>
                      <i className="ri-file-copy-line me-1"></i>{t("settings_apply_all")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div className="d-flex justify-content-end gap-2 pt-3">
          <Button color="light" type="button" onClick={() => onCancel?.()}>
            {t("cancel")}
          </Button>
          <Button color="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            {t("settings_save_hours")}
          </Button>
        </div>
      </div>
    </form>
  );

  if (section === "datos") return DatosForm;
  if (section === "horario") return HorarioForm;
  return null;
};

export default DatosTenant;
