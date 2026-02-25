// Ubicación: pages/Pages/Profile/Settings/datostenant.tsx

import React, { ChangeEvent } from "react";
import { Row, Col, Input, Label, Button, Spinner, Card, CardBody } from "reactstrap";
import classnames from "classnames";

/* ===== Tipos locales ===== */
export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export type DayState = { active: boolean; start: string; end: string };
export type WorkingHoursPerDay = Record<DayKey, DayState>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: "monday",    label: "Lunes" },
  { key: "tuesday",   label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday",  label: "Jueves" },
  { key: "friday",    label: "Viernes" },
  { key: "saturday",  label: "Sábado" },
  { key: "sunday",    label: "Domingo" },
];

/* ===== Plan gating helpers ===== */
const PLAN_ORDER = ["free", "pro", "business", "enterprise"];
const PLAN_MODULES: Record<string, string[]> = {
  free: [],
  pro: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips"],
  business: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot"],
  enterprise: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot", "shared_stylists", "branch_color"],
};
const PLAN_LABELS: Record<string, string> = { free: "Gratis", pro: "Pro", business: "Business", enterprise: "Enterprise" };

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
  name: string; phone: string; address: string; email: string; website: string; ivaRate: string; adminFee: string;
  setName: (v: string) => void; setPhone: (v: string) => void; setAddress: (v: string) => void; setEmail: (v: string) => void;
  setWebsite: (v: string) => void; setIvaRate: (v: string) => void; setAdminFee: (v: string) => void;

  productsForStaff: boolean; setProductsForStaff: (v: boolean) => void;
  adminFeeEnabled: boolean; setAdminFeeEnabled: (v: boolean) => void;
  loansToStaff: boolean; setLoansToStaff: (v: boolean) => void;
  allowPastAppointments: boolean; setAllowPastAppointments: (v: boolean) => void;

  sharedStylistsEnabled: boolean; setSharedStylistsEnabled: (v: boolean) => void;
  tipSalonPercent: string; setTipSalonPercent: (v: string) => void;
  branchColor: string; setBranchColor: (v: string) => void;
  hasBranches: boolean;

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
  const iconBgClass = locked ? "bg-light text-muted" : (iconColors[color] || "bg-light text-muted");

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
                  {PLAN_LABELS[requiredPlan] || requiredPlan}
                </span>
              )}
            </h6>
            <p className="text-muted mb-0 mt-1">
              {locked ? `Disponible desde el plan ${PLAN_LABELS[requiredPlan || "pro"] || requiredPlan}` : description}
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
  name, phone, address, email, website, ivaRate, adminFee,
  setName, setPhone, setAddress, setEmail, setWebsite, setIvaRate, setAdminFee,
  productsForStaff, setProductsForStaff,
  adminFeeEnabled, setAdminFeeEnabled,
  loansToStaff, setLoansToStaff,
  allowPastAppointments, setAllowPastAppointments,
  sharedStylistsEnabled, setSharedStylistsEnabled,
  tipSalonPercent, setTipSalonPercent,
  branchColor, setBranchColor,
  hasBranches,
  perDay, toggleDay, changeHour, applyMondayToAll,
  plan = "free",
  saving = false,
  onSubmit, onCancel,
}) => {

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
        Información del Negocio
      </h5>
      <Row className="g-3">
        <Col md={6}>
          <Label htmlFor="tenant-name" className="form-label">Nombre</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-building-line"></i></span>
            <Input id="tenant-name" value={name} onChange={handleInputChange(setName)} placeholder="Ej: Bunker Barber Shop" required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-phone" className="form-label">Teléfono</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-phone-line"></i></span>
            <Input id="tenant-phone" value={phone} onChange={handleInputChange(setPhone)} placeholder="Ej: 3001234567" required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-address" className="form-label">Dirección</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-map-pin-line"></i></span>
            <Input id="tenant-address" value={address} onChange={handleInputChange(setAddress)} placeholder="Ej: Calle 123 #45-67" required />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-email" className="form-label">Email</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-mail-line"></i></span>
            <Input id="tenant-email" type="email" value={email} onChange={handleInputChange(setEmail)} placeholder="contacto@mi-peluqueria.com" />
          </div>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-website" className="form-label">Página web</Label>
          <div className="input-group">
            <span className="input-group-text"><i className="ri-global-line"></i></span>
            <Input id="tenant-website" type="text" value={getWebsiteDisplayValue()} onChange={handleWebsiteChange} placeholder="www.mipagina.com o mipagina.com" />
          </div>
          <p className="text-muted fs-12 mt-1">Puedes escribir: www.mipagina.com o simplemente mipagina.com</p>
        </Col>
        <Col md={6}>
          <Label htmlFor="tenant-iva" className="form-label">IVA (%)</Label>
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
        Módulos y Configuraciones
      </h5>
      <Row className="g-3 mb-3">
        <Col md={6}>
          <ModuleCard
            icon="ri-money-dollar-circle-line" color="warning"
            title="% Administrativo" description="¿Cobras porcentaje administrativo?"
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
            title="Productos para staff" description="Productos de uso interno del personal"
            checked={productsForStaff} onChange={setProductsForStaff} switchId="products-for-staff-switch"
            locked={!allowed("products_for_staff")} requiredPlan={minPlan("products_for_staff")}
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-hand-coin-line" color="primary"
            title="Préstamos al personal" description="Módulo de préstamos y adelantos en nómina"
            checked={loansToStaff} onChange={setLoansToStaff} switchId="loans-to-staff-switch"
            locked={!allowed("loans_to_staff")} requiredPlan={minPlan("loans_to_staff")}
          />
        </Col>
        <Col md={6}>
          <ModuleCard
            icon="ri-calendar-check-line" color="danger"
            title="Citas en fechas pasadas" description="Agendar citas en fechas u horas pasadas"
            checked={allowPastAppointments} onChange={setAllowPastAppointments} switchId="allow-past-appointments-switch"
            locked={!allowed("allow_past_appointments")} requiredPlan={minPlan("allow_past_appointments")}
            extraContent={
              <div className="alert alert-warning mb-0">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-alert-line"></i>
                  <span><strong>Modo especial activo:</strong> Se pueden crear y modificar citas en fechas pasadas.</span>
                </div>
              </div>
            }
          />
        </Col>
        {hasBranches && (
          <Col md={6}>
            <ModuleCard
              icon="ri-user-shared-line" color="success"
              title="Estilistas compartidos" description="Estilistas asignados a varias sedes"
              checked={sharedStylistsEnabled} onChange={setSharedStylistsEnabled} switchId="shared-stylists-switch"
              locked={!allowed("shared_stylists")} requiredPlan={minPlan("shared_stylists")}
            />
          </Col>
        )}
        <Col md={6}>
          <ModuleCard
            icon="ri-hand-heart-line" color="success"
            title="Propinas" description="Porcentaje de propina para el salón"
            checked={Number(tipSalonPercent) > 0}
            onChange={(v) => { if (!v) setTipSalonPercent("0"); else setTipSalonPercent("10"); }}
            switchId="tip-salon-switch"
            locked={!allowed("tips")} requiredPlan={minPlan("tips")}
            extraContent={
              <div>
                <Label htmlFor="tip-salon-percent" className="form-label fs-12">% de propina para el salón</Label>
                <div className="input-group" style={{ maxWidth: "200px" }}>
                  <Input id="tip-salon-percent" type="number" min={0} max={100} step="0.01" value={tipSalonPercent} onChange={(e) => setTipSalonPercent(e.target.value)} placeholder="10" />
                  <span className="input-group-text">%</span>
                </div>
                <p className="text-muted fs-12 mt-1">El resto de la propina va al estilista.</p>
              </div>
            }
          />
        </Col>
        {hasBranches && (
          <Col md={6}>
            <ModuleCard
              icon="ri-palette-line" color="primary"
              title="Color de sede" description="Color para el supercalendario"
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
          Cancelar
        </Button>
        <Button color="primary" type="submit" disabled={saving}>
          {saving && <Spinner size="sm" className="me-1" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );

  /* ------- UI: Horario ------- */
  const HorarioForm = (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(e); }}>
      <h5 className="fw-semibold mb-3 d-flex align-items-center gap-2">
        <i className="ri-calendar-schedule-line text-primary"></i>
        Horario de Atención
      </h5>
      <div>
        {DAYS.map(({ key, label }) => {
          const day = perDay[key];
          const isMonday = key === "monday";
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
                    {label} {day.active ? "(Abierto)" : "(Cerrado)"}
                  </Label>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {day.active && (
                    <>
                      <div className="d-flex align-items-center gap-2">
                        <Label className="fs-12 text-muted mb-0" htmlFor={`start-${key}`}>Inicio</Label>
                        <Input id={`start-${key}`} type="time" value={day.start} onChange={(e) => changeHour(key, "start", e.target.value)} bsSize="sm" />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Label className="fs-12 text-muted mb-0" htmlFor={`end-${key}`}>Fin</Label>
                        <Input id={`end-${key}`} type="time" value={day.end} onChange={(e) => changeHour(key, "end", e.target.value)} bsSize="sm" />
                      </div>
                    </>
                  )}
                  {isMonday && (
                    <Button color="soft-primary" size="sm" type="button" onClick={applyMondayToAll}>
                      <i className="ri-file-copy-line me-1"></i>Aplicar a todos
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div className="d-flex justify-content-end gap-2 pt-3">
          <Button color="light" type="button" onClick={() => onCancel?.()}>
            Cancelar
          </Button>
          <Button color="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-1" />}
            Guardar horarios
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
