// src/pages/Pages/Profile/Settings/Settings.tsx

// --- Importaciones ---
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container, Row, Col, Card, CardBody, CardHeader, Nav, NavItem, NavLink,
  TabContent, TabPane, Input, Label, Button, Table, Progress, Badge, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';
import classnames from 'classnames';
import { jwtDecode } from "jwt-decode";
import CreatableSelect from 'react-select/creatable';

// --- NUEVO: Imports de Redux ---
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../../../contexts/CurrencyContext';
import { setSetupProgress } from '../../../../slices/Settings/settingsSlice';

import progileBg from '../../../../assets/images/profile-bg.jpg';
import avatar1 from '../../../../assets/images/users/avatar-1.jpg';
import { api, getUploadsBaseUrl } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

// Vistas hijas y componentes comunes
import Personal from "./personal";
import DatosTenant, { DayKey, DayState, WorkingHoursPerDay } from "./datostenant";
import CategoryManagerModal from '../../../../Components/Common/CategoryManagerModal';

import WhatsAppConfig from "./WhatsAppConfig";
import ChairRentalTab from "./ChairRentalTab";

// --- Tipos y Helpers ---
type Tenant = {
  id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  iva_rate?: number | null;
  admin_fee_percent?: number | null;
  logo_url?: string | null;
  products_for_staff_enabled?: boolean;
  admin_fee_enabled?: boolean;
  loans_to_staff_enabled?: boolean;
  allow_past_appointments?: boolean;
  price_override_enabled?: boolean;
  shared_stylists_enabled?: boolean;
  multi_stylist_enabled?: boolean;
  ticket_virtual_enabled?: boolean;
  cross_branch_schedule_block?: boolean;
  manage_all_branches_cash?: boolean;
  is_primary_branch?: boolean;
  tip_salon_percent?: number | null;
  branch_color?: string | null;
  parent_tenant_id?: string | null;
  working_hours?: Record<string, string | null> | null;
  plan?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  has_stripe_subscription?: boolean;
  created_at?: string;
  updated_at?: string;
};

const PLAN_CONFIG: Record<string, { label: string; color: string; priceUSD: number; priceCOP: number }> = {
  free: { label: "Gratis", color: "secondary", priceUSD: 0, priceCOP: 0 },
  pro: { label: "Pro", color: "primary", priceUSD: 10, priceCOP: 29900 },
  business: { label: "Business", color: "info", priceUSD: 19, priceCOP: 49900 },
  enterprise: { label: "Enterprise", color: "warning", priceUSD: 34.90, priceCOP: 129900 },
};

// Plan feature gating: which modules each plan unlocks
const PLAN_ORDER = ["free", "pro", "business", "enterprise"];
const PLAN_MODULES: Record<string, string[]> = {
  free: [],
  pro: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips"],
  business: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot"],
  enterprise: ["admin_fee", "products_for_staff", "loans_to_staff", "allow_past_appointments", "tips", "whatsapp_bot", "shared_stylists", "branch_color"],
};
// Tabs each plan can access: 1=Datos, 2=Horario, 3=Servicios, 4=Personal, 5=WhatsApp, 6=Planes
const PLAN_TABS: Record<string, string[]> = {
  free: ["1", "2", "6"],
  pro: ["1", "2", "3", "4", "6"],
  business: ["1", "2", "3", "4", "5", "6"],
  enterprise: ["1", "2", "3", "4", "5", "6"],
};
const getMinPlanForModule = (moduleKey: string): string => {
  for (const plan of PLAN_ORDER) {
    if (PLAN_MODULES[plan]?.includes(moduleKey)) return plan;
  }
  return "enterprise";
};
const isPlanAtLeast = (current: string, required: string): boolean => {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
};
type Category = { id: string; name: string; created_at?: string; updated_at?: string; };
type Service = {
  id: string;
  tenant_id?: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
  max_concurrent_stylists?: number;
};

// --- Helpers para formateo ---
const formatterCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const onlyDigits = (v: string) => (v || '').replace(/\D+/g, '');
const formatCOPString = (digits: string) => {
  if (!digits) return '';
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return '';
  return formatterCOP.format(n).replace(/\s/g, '');
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];
const DEFAULT_DAY: DayState = { active: false, start: "09:00", end: "17:00" };
const defaultWeek = (): WorkingHoursPerDay => ({
  monday: { ...DEFAULT_DAY },
  tuesday: { ...DEFAULT_DAY },
  wednesday: { ...DEFAULT_DAY },
  thursday: { ...DEFAULT_DAY },
  friday: { ...DEFAULT_DAY },
  saturday: { ...DEFAULT_DAY },
  sunday: { ...DEFAULT_DAY },
});
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toTime = (raw: string): string => {
  const s = (raw || "").trim();
  if (!s) return "09:00";
  const [hStr, mStr] = s.split(":");
  const h = Math.max(0, Math.min(23, Number(hStr || "0")));
  const m = Math.max(0, Math.min(59, Number(mStr ?? "0")));
  return `${pad2(h)}:${pad2(m)}`;
};
const parseRange = (range?: string | null): DayState => {
  if (!range || range.toLowerCase() === "cerrado") return { ...DEFAULT_DAY, active: false };
  const [start, end] = range.split("-").map(s => (s || "").trim());
  if (!start || !end) return { ...DEFAULT_DAY, active: false };
  return { active: true, start: toTime(start), end: toTime(end) };
};
const formatRange = (d: DayState): string => {
  if (!d.active) return "cerrado";
  if (!d.start || !d.end) return "cerrado";
  return `${toTime(d.start)}-${toTime(d.end)}`;
};
const ES_TO_EN: Record<string, DayKey> = {
  lunes: "monday", martes: "tuesday", miercoles: "wednesday", miércoles: "wednesday",
  jueves: "thursday", viernes: "friday", sabado: "saturday", sábado: "saturday", domingo: "sunday",
};
const normalizeWorkingHoursFromAPI = (wh: Tenant["working_hours"]): WorkingHoursPerDay => {
  const base = defaultWeek();
  if (!wh || typeof wh !== "object") return base;
  // Support both English and Spanish keys
  const normalized: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(wh)) {
    const enKey = ES_TO_EN[k.toLowerCase()] || k.toLowerCase();
    normalized[enKey] = v;
  }
  DAYS.forEach(({ key }) => { base[key] = parseRange(normalized[key] ?? null); });
  return base;
};
const buildWorkingHoursPayload = (perDay: WorkingHoursPerDay): Record<string, string> => {
  const out: Record<string, string> = {};
  DAYS.forEach(({ key }) => { out[key] = formatRange(perDay[key]); });
  return out;
};
const validateWorkingHours = (perDay: WorkingHoursPerDay): string | null => {
  for (const { key } of DAYS) {
    const d = perDay[key];
    if (d.active) {
      const [sh, sm] = toTime(d.start).split(":").map(Number);
      const [eh, em] = toTime(d.end).split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) return key;
    }
  }
  return null;
};
const decodeTenantId = (): string | null => {
  try {
    const t = getToken();
    if (!t) return null;
    const decoded: any = jwtDecode(t);
    return decoded?.user?.tenant_id || decoded?.tenant_id || null;
  } catch { return null; }
};
const decodeRoleId = (): number | null => {
  try {
    const t = getToken();
    if (!t) return null;
    const decoded: any = jwtDecode(t);
    return decoded?.user?.role_id ?? decoded?.role_id ?? null;
  } catch { return null; }
};
const ensureNumber = (v: string) => (v.trim() === "" ? null : Number(v));

// --- Bootstrap color maps for plan cards ---
const planBadgeColorMap: Record<string, string> = {
  free: "secondary",
  secondary: "secondary",
  pro: "primary",
  primary: "primary",
  business: "info",
  info: "info",
  enterprise: "warning",
  warning: "warning",
};

const planIconBgMap: Record<string, string> = {
  secondary: "bg-secondary-subtle text-secondary",
  primary: "bg-primary-subtle text-primary",
  info: "bg-info-subtle text-info",
  warning: "bg-warning-subtle text-warning",
};

/* =============== Modal Servicio =============== */
const ServiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  onCategoryCreated: (c: Category) => void;
  tenantId: string;
  edit?: Service | null;
  onManageCategories: () => void;
  multiStylistEnabled?: boolean;
}> = ({ isOpen, onClose, onSaved, categories, onCategoryCreated, tenantId, edit, onManageCategories, multiStylistEnabled }) => {
  const { t: tr } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [maxStylists, setMaxStylists] = useState<string>("1");

  const categoryOptions = useMemo(() =>
    categories.map(cat => ({ value: cat.id, label: cat.name })),
    [categories]);

  useEffect(() => {
    if (isOpen) {
      if (edit) {
        setCategoryId(edit.category_id);
        setName(edit.name);
        setPrice(String(edit.price));
        setDuration(String(edit.duration_minutes));
        setDescription(edit.description || "");
        setMaxStylists(String(edit.max_concurrent_stylists || 1));
      } else {
        setCategoryId(categories[0]?.id || "");
        setName(""); setPrice(""); setDuration(""); setDescription(""); setMaxStylists("1");
      }
    }
  }, [isOpen, edit, categories]);

  const handleCreateCategory = async (inputValue: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post('/categories', { name: inputValue.trim() });
      onCategoryCreated(data);
      setCategoryId(data.id);
      Swal.fire({ icon: 'success', title: tr('svc_modal_category_created'), timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire(tr('error'), e?.response?.data?.error || tr('svc_modal_category_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!categoryId || !name.trim() || !price || !duration) {
      Swal.fire(tr('svc_modal_incomplete'), tr('svc_modal_incomplete_text'), 'warning');
      return;
    }
    const body: any = {
      category_id: categoryId, name: name.trim(), price: Number(price),
      duration_minutes: Number(duration), description: description.trim() || null,
      max_concurrent_stylists: Math.max(1, Number(maxStylists) || 1),
    };
    setSaving(true);
    try {
      if (edit) {
        await api.put(`/services/${edit.id}`, body);
      } else {
        body.tenant_id = tenantId;
        await api.post(`/services`, body);
      }
      Swal.fire({ icon: 'success', title: edit ? tr('svc_modal_updated') : tr('svc_modal_created'), showConfirmButton: false, timer: 1500 });
      onSaved();
      onClose();
    } catch (e: any) {
      Swal.fire(tr('svc_modal_save_error'), e?.response?.data?.message || tr('svc_modal_save_error_text'), 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
      <ModalHeader toggle={onClose}>{edit ? tr('svc_modal_edit') : tr('svc_modal_new')}</ModalHeader>
      <ModalBody>
        <div className="vstack gap-3">
          <div>
            <Label className="form-label">{tr('svc_modal_category')}</Label>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <CreatableSelect
                  isClearable isSearchable
                  options={categoryOptions}
                  value={categoryOptions.find(opt => opt.value === categoryId)}
                  onChange={(selected) => setCategoryId(selected ? selected.value : "")}
                  onCreateOption={handleCreateCategory}
                  placeholder={tr('svc_modal_search_create')}
                  formatCreateLabel={inputValue => tr('svc_modal_create_category', { value: inputValue })}
                  isLoading={saving}
                  isDisabled={saving}
                />
              </div>
              <Button type="button" color="light" onClick={onManageCategories} className="d-inline-flex align-items-center justify-content-center" title={tr('svc_modal_manage_categories')}>
                <i className="ri-settings-3-line"></i>
              </Button>
            </div>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Label className="form-label">{tr('svc_modal_name')}</Label>
              <Input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('svc_modal_name_placeholder')} />
            </Col>
            <Col md={6}>
              <Label className="form-label">{tr('svc_modal_duration')}</Label>
              <Input type="number" min={1} className="form-control" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej: 60" />
            </Col>
          </Row>
          <Row className="g-3">
            <Col md={multiStylistEnabled ? 8 : 12}>
              <Label className="form-label">{tr('svc_modal_price')}</Label>
              <Input
                type="text"
                inputMode="numeric"
                className="form-control"
                value={formatCOPString(price)}
                onChange={(e) => setPrice(onlyDigits(e.target.value))}
                placeholder="$50.000"
              />
            </Col>
            {multiStylistEnabled && (
              <Col md={4}>
                <Label className="form-label">{tr('svc_modal_max_stylists') || 'Estilistas simultáneos'}</Label>
                <Input type="number" min={1} max={5} className="form-control" value={maxStylists} onChange={(e) => setMaxStylists(e.target.value)} placeholder="1" />
                <small className="text-muted">{tr('svc_modal_max_stylists_hint') || 'Ej: 2 para masaje a 4 manos'}</small>
              </Col>
            )}
          </Row>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose}>{tr('svc_modal_cancel')}</Button>
        <Button color="primary" onClick={save} disabled={saving}>
          {saving && <Spinner size="sm" className="me-1" />} {tr('svc_modal_save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

/* ================= Pagina Settings ================= */
const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const { t: tr } = useTranslation();
  const { formatCurrency: fmtCurrency, formatFromUSD } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"1" | "2" | "3" | "4" | "5" | "6" | "7">(() => {
    const t = searchParams.get("tab");
    return (t && ["1","2","3","4","5","6","7"].includes(t)) ? t as any : "1";
  });

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [ivaRate, setIvaRate] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [perDay, setPerDay] = useState<WorkingHoursPerDay>(defaultWeek());
  const [productsForStaff, setProductsForStaff] = useState<boolean>(true);
  const [adminFeeEnabled, setAdminFeeEnabled] = useState<boolean>(false);
  const [loansToStaff, setLoansToStaff] = useState<boolean>(false);
  const [allowPastAppointments, setAllowPastAppointments] = useState<boolean>(false);
  const [sharedStylistsEnabled, setSharedStylistsEnabled] = useState<boolean>(false);
  const [multiStylistEnabled, setMultiStylistEnabled] = useState<boolean>(false);
  const [ticketVirtualEnabled, setTicketVirtualEnabled] = useState<boolean>(false);
  const [crossBranchScheduleBlock, setCrossBranchScheduleBlock] = useState<boolean>(true);
  const [manageAllBranchesCash, setManageAllBranchesCash] = useState<boolean>(false);
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState<boolean>(false);
  const isAdmin = useMemo(() => decodeRoleId() === 1, []);
  const [tipSalonPercent, setTipSalonPercent] = useState<string>("10");
  const [branchColor, setBranchColor] = useState<string>("#3788d8");
  const [hasBranches, setHasBranches] = useState<boolean>(false);
  const [isPrimaryBranch, setIsPrimaryBranch] = useState<boolean>(true);
  const [catLoading, setCatLoading] = useState(false);
  const [svcLoading, setSvcLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [svModalOpen, setSvModalOpen] = useState(false);
  const [svEdit, setSvEdit] = useState<Service | null>(null);
  const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const SVC_PAGE_SIZE = 6;
  const [svcPage, setSvcPage] = useState<number>(1);
  const [svcCategoryFilter, setSvcCategoryFilter] = useState<string>("all");
  const filteredServices = useMemo(() => {
    if (svcCategoryFilter === "all") return services;
    return services.filter(s => s.category_id === svcCategoryFilter);
  }, [services, svcCategoryFilter]);
  const totalSvcPages = useMemo(() => Math.max(1, Math.ceil(filteredServices.length / SVC_PAGE_SIZE)), [filteredServices.length]);
  const paginatedServices = useMemo(() => {
    const start = (svcPage - 1) * SVC_PAGE_SIZE;
    return filteredServices.slice(start, start + SVC_PAGE_SIZE);
  }, [filteredServices, svcPage]);

  useEffect(() => {
    if (filteredServices.length > 0 && svcPage > totalSvcPages) {
      setSvcPage(totalSvcPages);
    }
  }, [filteredServices.length, totalSvcPages, svcPage]);

  useEffect(() => {
    setSvcPage(1);
  }, [svcCategoryFilter]);

  const [staffCount, setStaffCount] = useState<number>(0);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);

  const tabChange = (tab: "1" | "2" | "3" | "4" | "5" | "6" | "7") => { if (activeTab !== tab) setActiveTab(tab); };

  const updateStateFromTenant = (tenantData: Tenant | null) => {
    if (!tenantData) return;
    setTenant(tenantData);
    setName(tenantData.name ?? "");
    setPhone(tenantData.phone ?? "");
    setAddress(tenantData.address ?? "");
    setCity(tenantData.city ?? "");
    setEmail(tenantData.email ?? "");
    setWebsite(tenantData.website ?? "");
    setIvaRate(tenantData.iva_rate == null ? "" : String(tenantData.iva_rate));
    setAdminFee(tenantData.admin_fee_percent == null ? "" : String(tenantData.admin_fee_percent));
    setPerDay(normalizeWorkingHoursFromAPI(tenantData.working_hours));
    setProductsForStaff(tenantData.products_for_staff_enabled ?? true);
    setAdminFeeEnabled(tenantData.admin_fee_enabled ?? false);
    setLoansToStaff(tenantData.loans_to_staff_enabled ?? false);
    setAllowPastAppointments(tenantData.allow_past_appointments ?? false);
    setSharedStylistsEnabled(tenantData.shared_stylists_enabled ?? false);
    setMultiStylistEnabled(tenantData.multi_stylist_enabled ?? false);
    setTicketVirtualEnabled(tenantData.ticket_virtual_enabled ?? false);
    setCrossBranchScheduleBlock(tenantData.cross_branch_schedule_block !== false);
    setManageAllBranchesCash(tenantData.manage_all_branches_cash ?? false);
    setPriceOverrideEnabled(tenantData.price_override_enabled ?? false);
    setTipSalonPercent(tenantData.tip_salon_percent != null ? String(tenantData.tip_salon_percent) : "10");
    setBranchColor(tenantData.branch_color ?? "#3788d8");
    setHasBranches(!!tenantData.parent_tenant_id);
    setIsPrimaryBranch(tenantData.is_primary_branch !== false);
    const uploadsBase = getUploadsBaseUrl();
    let finalDisplayUrl = "";
    if (tenantData.logo_url) {
      finalDisplayUrl = tenantData.logo_url.startsWith('http') ? tenantData.logo_url : `${uploadsBase}${tenantData.logo_url}`;
    }
    setLogoUrl(finalDisplayUrl);
  };

  useEffect(() => {
    document.title = tr("settings_page_title");
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const tenantId = decodeTenantId();
        if (!tenantId) {
          setError(tr("settings_no_tenant"));
          return;
        }
        const { data } = await api.get(`/tenants/${tenantId}`);
        updateStateFromTenant(data);
        setLogoFile(null);
        // Check if tenant has branches for multi-sede features
        try {
          const { data: businesses } = await api.get('/tenants/my-businesses');
          if (Array.isArray(businesses) && businesses.length > 1) {
            setHasBranches(true);
          }
        } catch { /* ignore if endpoint not available */ }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || tr("settings_could_not_load"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Handle Stripe return (success/cancel)
  useEffect(() => {
    const stripeResult = searchParams.get('stripe');
    if (!stripeResult) return;

    // Remove ?stripe= from URL without reload
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('stripe');
    setSearchParams(newParams, { replace: true });

    if (stripeResult === 'success') {
      // Reload tenant data to get updated plan
      const reload = async () => {
        try {
          const tid = decodeTenantId();
          if (tid) {
            const { data } = await api.get(`/tenants/${tid}`);
            updateStateFromTenant(data);
          }
        } catch { /* ignore */ }
      };
      reload();
      Swal.fire({
        icon: 'success',
        title: tr('settings_payment_success_title'),
        text: tr('settings_payment_success_text'),
        timer: 3000,
        showConfirmButton: false,
      });
    } else if (stripeResult === 'cancel') {
      Swal.fire({
        icon: 'info',
        title: tr('settings_payment_cancel_title'),
        text: tr('settings_payment_cancel_text'),
        timer: 3000,
        showConfirmButton: false,
      });
    }
  }, []);

  const saveAll = async () => {
    setSaving(true); setError(null);
    try {
      const tenantId = tenant?.id || decodeTenantId();
      if (!tenantId) throw new Error(tr("settings_could_not_update"));

      const hoursErr = validateWorkingHours(perDay);
      if (hoursErr) {
        Swal.fire({ icon: 'error', title: tr('settings_invalid_schedule'), text: tr('schedule_invalid_end', { day: tr(`day_${hoursErr}`) }) });
        setSaving(false);
        return;
      }

      let logoUrlForPayload = tenant?.logo_url || null;

      if (logoUrlForPayload && logoUrlForPayload.startsWith('http')) {
        const uploadsBase = getUploadsBaseUrl();
        if (uploadsBase && logoUrlForPayload.startsWith(uploadsBase)) {
          logoUrlForPayload = logoUrlForPayload.replace(uploadsBase, '');
        }
      }

      if (logoFile) {
        try {
          setUploadingLogo(true);
          const form = new FormData();
          form.append('logo', logoFile);
          const { data } = await api.post(`/tenants/${tenantId}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (data?.url) {
            logoUrlForPayload = data.url;
            setLogoFile(null);
          } else {
            throw new Error(tr("settings_logo_url_error"));
          }
        } catch (uploadError: any) {
          Swal.fire({ icon: 'error', title: tr('settings_upload_error'), text: uploadError?.response?.data?.message || uploadError?.message || tr("settings_could_not_upload_logo") });
          setUploadingLogo(false); setSaving(false); return;
        } finally {
          setUploadingLogo(false);
        }
      }

      const payload = {
        name: name.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        working_hours: buildWorkingHoursPayload(perDay),
        iva_rate: ensureNumber(ivaRate),
        admin_fee_percent: adminFeeEnabled ? ensureNumber(adminFee) : null,
        logo_url: logoUrlForPayload,
        products_for_staff_enabled: productsForStaff,
        admin_fee_enabled: adminFeeEnabled,
        loans_to_staff_enabled: loansToStaff,
        allow_past_appointments: allowPastAppointments,
        shared_stylists_enabled: sharedStylistsEnabled,
        multi_stylist_enabled: multiStylistEnabled,
        ticket_virtual_enabled: ticketVirtualEnabled,
        cross_branch_schedule_block: crossBranchScheduleBlock,
        manage_all_branches_cash: manageAllBranchesCash,
        ...(isAdmin ? { price_override_enabled: priceOverrideEnabled } : {}),
        tip_salon_percent: ensureNumber(tipSalonPercent),
        branch_color: branchColor,
      } as any;

      await api.put(`/tenants/${tenantId}`, payload);
      const { data: freshTenantData } = await api.get(`/tenants/${tenantId}`);
      updateStateFromTenant(freshTenantData);
      Swal.fire({ icon: 'success', title: tr('settings_saved_title'), text: tr('settings_saved_text'), timer: 2000, showConfirmButton: false });
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: tr('settings_save_error'), text: e?.response?.data?.message || e?.message || tr("settings_could_not_save") });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };
  const handleSaveHours = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };

  // Plan change via Stripe Checkout (paid plans) or direct API (free)
  const changePlan = async (newPlan: string) => {
    const tid = tenant?.id || decodeTenantId();
    if (!tid) return;
    try {
      setSaving(true);
      if (newPlan === 'free') {
        // Step 1: Ask backend - it will offer 10% discount first
        const { data: step1 } = await api.post('/stripe/cancel-subscription');

        if (step1.offer_discount) {
          // Show retention modal with 10% offer
          const result = await Swal.fire({
            icon: 'warning',
            title: '¡Espera! No te vayas',
            html: `
              <div style="text-align:left">
                <p>Entendemos que quieras cancelar, pero queremos que sepas que valoramos tu confianza.</p>
                <div style="background:#d1fae5;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
                  <span style="font-size:32px">🎁</span>
                  <h4 style="color:#065f46;margin:8px 0 4px;font-weight:700">10% de descuento</h4>
                  <p style="color:#047857;margin:0">en tu próxima factura si decides quedarte</p>
                </div>
                <p class="text-muted" style="font-size:13px">El descuento se aplica automáticamente. Sin compromisos adicionales.</p>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: '🎉 ¡Me quedo con el 10%!',
            cancelButtonText: 'Cancelar de todas formas',
            confirmButtonColor: '#0ab39c',
            cancelButtonColor: '#f06548',
            reverseButtons: true,
          });

          if (result.isConfirmed) {
            // User accepts 10% discount - apply it
            await api.post('/stripe/apply-discount');
            const { data: fresh } = await api.get(`/tenants/${tid}`);
            updateStateFromTenant(fresh);
            Swal.fire({
              icon: 'success',
              title: '¡Gracias por quedarte!',
              html: '<p>Tu <strong>10% de descuento</strong> se aplicará en tu próxima factura automáticamente.</p>',
              timer: 3000,
              showConfirmButton: false,
            });
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            // User still wants to cancel - confirm with final message
            await api.post('/stripe/cancel-subscription', { confirm: true });
            const { data: fresh } = await api.get(`/tenants/${tid}`);
            updateStateFromTenant(fresh);
            Swal.fire({
              icon: 'info',
              title: 'Plan cancelado',
              html: '<p>Tu plan seguirá activo hasta el final del período pagado. <strong>Siempre puedes volver.</strong></p>',
              timer: 3000,
              showConfirmButton: false,
            });
          }
        } else {
          // Direct cancellation response (already confirmed)
          const { data: fresh } = await api.get(`/tenants/${tid}`);
          updateStateFromTenant(fresh);
        }
      } else {
        // Upgrade a plan pago: redirigir a Stripe Checkout
        const { data } = await api.post('/stripe/create-checkout-session', { plan: newPlan });
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: tr('error'), text: e?.response?.data?.error || tr('could_not_change_plan') });
    } finally {
      setSaving(false);
    }
  };

  const openLogoPicker = () => { logoInputRef.current?.click(); };
  const onLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setLogoFile(f);
      setLogoUrl(URL.createObjectURL(f));
    }
  };

  const toggleDay = (day: DayKey) => setPerDay(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  const changeHour = (day: DayKey, field: "start" | "end", value: string) =>
    setPerDay(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  const applyMondayToAll = () => {
    const monday = perDay.monday;
    setPerDay(prev => {
      const next = { ...prev } as WorkingHoursPerDay;
      for (const { key } of DAYS) {
        if (key === "monday") continue;
        next[key] = { ...next[key], active: monday.active, start: monday.start, end: monday.end };
      }
      return next;
    });
  };

  const tenantId = useMemo(() => decodeTenantId() || "", []);
  const loadCategories = async () => {
    if (!tenantId) return;
    setCatLoading(true);
    try { const { data } = await api.get('/categories'); setCategories(data || []); }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || tr('cat_could_not_load')); }
    finally { setCatLoading(false); }
  };
  const loadServices = async () => {
    if (!tenantId) return;
    setSvcLoading(true);
    try {
      const { data } = await api.get(`/services/tenant/${tenantId}`);
      setServices(Array.isArray(data) ? data : []);
    }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || tr('svc_could_not_load')); }
    finally { setSvcLoading(false); }
  };

  const loadStaffCount = async () => {
    if (!tenantId) return;
    setStaffLoading(true);
    try {
      const { data } = await api.get(`/users/tenant/${tenantId}?role_id=3`);
      setStaffCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setStaffCount(0);
    }
    finally { setStaffLoading(false); }
  };

  useEffect(() => {
    if (tenantId) {
      loadCategories();
      loadServices();
      loadStaffCount();
    }
  }, [tenantId]);

  const refreshAllServices = async () => {
    await loadServices();
  };

  const handleCategoryCreated = (newCategory: Category) => {
    setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleCategoryDeleted = (deletedId: string) => {
    setCategories(prev => prev.filter(c => c.id !== deletedId));
    loadServices();
  };

  const openNewService = () => { setSvEdit(null); setSvModalOpen(true); };
  const openEditService = (svc: Service) => { setSvEdit(svc); setSvModalOpen(true); };

  const deleteService = async (svc: Service) => {
    const result = await Swal.fire({
      title: tr('svc_delete_title', { name: svc.name }), text: tr('svc_delete_text'), icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: tr('svc_delete_confirm'), cancelButtonText: tr('cancel')
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/services/${svc.id}`);
        await loadServices();
        Swal.fire(tr('svc_deleted_title'), tr('svc_deleted_text'), 'success');
      }
      catch (e: any) {
        Swal.fire({ icon: 'error', title: tr('error'), text: e?.response?.data?.message || e?.message || tr('svc_delete_error') });
      }
    }
  };

  const currentPlan = tenant?.plan || "free";
  const allowedTabs = PLAN_TABS[currentPlan] || PLAN_TABS.free;

  const progress = useMemo(() => {
    const datosOk = !!(name.trim() && address.trim() && phone.trim());
    const hasActive = DAYS.some(({ key }) => perDay[key].active);
    const hoursErr = validateWorkingHours(perDay);
    const horariosOk = hasActive && hoursErr === null;
    const serviciosOk = services.length > 0;
    const personalOk = staffCount > 0;
    const score = (datosOk ? 1 : 0) + (horariosOk ? 1 : 0) + (serviciosOk ? 1 : 0) + (personalOk ? 1 : 0);
    return score * 25;
  }, [name, address, phone, perDay, services.length, staffCount]);

  useEffect(() => {
    if (!loading) {
      dispatch(setSetupProgress(progress));
    }
  }, [progress, loading, dispatch]);


  const renderSvcPageNumbers = () => {
    if (totalSvcPages <= 1) return null;
    const windowSize = 5;
    let start = Math.max(1, svcPage - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalSvcPages) { end = totalSvcPages; start = Math.max(1, end - windowSize + 1); }
    const items: JSX.Element[] = [];
    for (let p = start; p <= end; p++) {
      items.push(
        <li key={p} className={classnames("page-item", { active: p === svcPage })}>
          <button
            onClick={() => setSvcPage(p)}
            className="page-link"
          >
            {p}
          </button>
        </li>
      );
    }
    return items;
  };

  const handleUpdateServiceCategory = async (id: string, newName: string) => {
    try {
      await api.put(`/categories/${id}`, { name: newName });
      Swal.fire({ icon: 'success', title: tr('cat_updated_title'), text: tr('cat_updated_text'), timer: 1500, showConfirmButton: false });
      await loadCategories();
    } catch (e: any) {
      Swal.fire(tr('error'), e?.response?.data?.error || tr('cat_update_error'), 'error');
    }
  };

  const handleDeleteServiceCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      handleCategoryDeleted(id);
      Swal.fire({ icon: 'success', title: tr('cat_deleted_title'), text: tr('cat_deleted_text'), timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire(tr('error'), e?.response?.data?.error || tr('cat_delete_error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="d-flex justify-content-center">
            <div style={{ maxWidth: '28rem', width: '100%' }}>
              <Card className="mt-3">
                <CardBody className="text-center d-flex align-items-center justify-content-center gap-2">
                  <Spinner size="sm" color="primary" />
                  <span className="text-muted">{tr('settings_loading')}</span>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const datosOk = !!(name && phone && address);
  const horariosOk = DAYS.some(d => perDay[d.key].active) && validateWorkingHours(perDay) === null;
  const serviciosOk = services.length > 0;
  const personalOk = staffCount > 0;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* Profile background banner */}
          <div className="profile-foreground position-relative mx-n4">
            <div className="profile-wid-bg">
              <img src={progileBg} alt="" className="profile-wid-img" />
            </div>
          </div>

          <Row className="g-4">
            {/* Sidebar */}
            <Col xl={3}>
              <div className="vstack gap-3">
                {/* Logo card */}
                <Card className="overflow-hidden position-relative" style={{ zIndex: 1 }}>
                  <CardBody className="text-center">
                    <div className={`position-relative d-inline-block mb-3${isPrimaryBranch ? ' cursor-pointer' : ''}`} onClick={isPrimaryBranch ? openLogoPicker : undefined} title={isPrimaryBranch ? tr('sidebar_change_logo') : tr('sidebar_logo_primary_only')}>
                      <img src={logoUrl || avatar1} className="rounded-circle border border-4 border-white shadow object-fit-cover" style={{ width: '96px', height: '96px' }} alt="logo" />
                      {isPrimaryBranch && (
                        <span className="position-absolute bottom-0 end-0 d-flex align-items-center justify-content-center rounded-circle bg-primary text-white border border-2 border-white shadow" style={{ width: '32px', height: '32px' }}>
                          <i className="ri-image-edit-line fs-12"></i>
                        </span>
                      )}
                      {isPrimaryBranch && <input ref={logoInputRef} type="file" accept="image/*" className="d-none" onChange={onLogoInputChange} />}
                    </div>
                    <div className="fs-12 text-muted mb-2">
                      {!isPrimaryBranch ? tr('sidebar_logo_primary_only') : uploadingLogo ? tr('sidebar_uploading_logo') : (logoFile ? tr('sidebar_logo_ready') : tr('sidebar_logo_click_change'))}
                    </div>
                    <h5 className="fs-16 fw-semibold mb-1">{name || tr('sidebar_my_salon')}</h5>
                  </CardBody>
                </Card>

                {/* Plan card */}
                <Card>
                  <CardBody>
                    {(() => {
                      const planKey = tenant?.plan || "free";
                      const planInfo = PLAN_CONFIG[planKey] || PLAN_CONFIG.free;
                      const badgeColor = planBadgeColorMap[planKey] || "secondary";
                      return (
                        <>
                          <div className="d-flex align-items-center mb-3">
                            <div className="flex-grow-1"><h5 className="fw-semibold mb-0">{tr("my_plan")}</h5></div>
                            <div className="flex-shrink-0">
                              <span className={`badge bg-${planInfo.color}-subtle text-${planInfo.color} rounded-pill`}>{planInfo.priceCOP === 0 ? tr("free") : `$${planInfo.priceCOP.toLocaleString('es-CO')}/${tr("month_short")}`}</span>
                            </div>
                          </div>
                          <div className="text-center mb-3">
                            <span className={`badge bg-${badgeColor}-subtle text-${badgeColor} rounded-pill fs-14 px-3 py-2`}>
                              {planKey === "free" ? tr("free") : planInfo.label}
                            </span>
                          </div>
                          <Button
                            type="button"
                            color={planKey === "enterprise" ? "soft-success" : "soft-primary"}
                            className="w-100 d-inline-flex align-items-center justify-content-center gap-2"
                            onClick={() => tabChange("6")}
                          >
                            <i className={planKey === "enterprise" ? "ri-check-double-line" : "ri-vip-crown-line"}></i>
                            {planKey === "enterprise" ? tr('sidebar_full_plan') : tr('sidebar_upgrade_plan')}
                          </Button>
                        </>
                      );
                    })()}
                  </CardBody>
                </Card>

                {/* Progress card */}
                <Card>
                  <CardBody>
                    <div className="d-flex align-items-center mb-3">
                      <div className="flex-grow-1"><h5 className="fw-semibold mb-0">{tr('progress_title')}</h5></div>
                      <div className="flex-shrink-0">
                        <span className={`badge ${progress === 100 ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'} rounded-pill`}>
                          {progress === 100 ? tr('progress_complete') : tr('progress_partial')}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={Math.max(progress, 8)}
                      color={progress >= 100 ? 'success' : progress >= 50 ? 'warning' : 'danger'}
                      className="animated-progress"
                      style={{ height: '12px' }}
                    >
                      <span className="fw-bold" style={{ fontSize: '10px' }}>{progress}%</span>
                    </Progress>
                    <ul className="list-unstyled vstack gap-2 mt-3 mb-0">
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${datosOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">{tr('progress_salon_data')}</span>
                        {!datosOk && (
                          <button onClick={() => tabChange("1")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            {tr('progress_go')} <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${horariosOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">{tr('progress_schedule')}</span>
                        {!horariosOk && (
                          <button onClick={() => tabChange("2")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            {tr('progress_go')} <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${serviciosOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">{tr('progress_services')}</span>
                        {!serviciosOk && (
                          <button onClick={() => tabChange("3")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            {tr('progress_go')} <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${personalOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">
                          {tr('progress_staff')} {staffLoading && <Spinner size="sm" className="ms-1" />}
                        </span>
                        {!personalOk && !staffLoading && (
                          <button onClick={() => tabChange("4")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            {tr('progress_go')} <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                    </ul>
                  </CardBody>
                </Card>
              </div>
            </Col>

            {/* Main content */}
            <Col xl={9}>
              <Card>
                {/* Title + Tabs header */}
                <CardHeader className="p-0 border-0">
                  <div className="d-flex align-items-center px-4 pt-3 pb-2">
                    <h4 className="fw-semibold mb-0">
                      <i className="ri-settings-3-line me-2 text-primary"></i>
                      {tr('settings_configuration')}
                    </h4>
                  </div>
                  <Nav tabs className="nav-tabs-custom px-4 mb-0">
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "1" })}
                        onClick={() => tabChange("1")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-home-line me-1"></i>
                        {tr('tab_salon_data')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "2" })}
                        onClick={() => tabChange("2")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-time-line me-1"></i>
                        {tr('tab_schedule')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "3", disabled: !allowedTabs.includes("3") })}
                        onClick={() => allowedTabs.includes("3") ? tabChange("3") : tabChange("6")}
                        style={{ cursor: 'pointer' }}
                      >
                        {!allowedTabs.includes("3") && <i className="ri-lock-line text-muted me-1"></i>}
                        <i className="ri-scissors-2-line me-1"></i>
                        {tr('tab_services')}
                        {allowedTabs.includes("3") && services.length > 0 && (
                          <span className="badge bg-primary-subtle text-primary rounded-pill ms-1">{services.length}</span>
                        )}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "4", disabled: !allowedTabs.includes("4") })}
                        onClick={() => allowedTabs.includes("4") ? tabChange("4") : tabChange("6")}
                        style={{ cursor: 'pointer' }}
                      >
                        {!allowedTabs.includes("4") && <i className="ri-lock-line text-muted me-1"></i>}
                        <i className="ri-team-line me-1"></i>
                        {tr('tab_staff')}
                        {allowedTabs.includes("4") && staffCount > 0 && (
                          <span className="badge bg-primary-subtle text-primary rounded-pill ms-1">{staffCount}</span>
                        )}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "5", disabled: !allowedTabs.includes("5") })}
                        onClick={() => allowedTabs.includes("5") ? tabChange("5") : tabChange("6")}
                        style={{ cursor: 'pointer' }}
                      >
                        {!allowedTabs.includes("5") && <i className="ri-lock-line text-muted me-1"></i>}
                        <i className="ri-whatsapp-line me-1"></i>
                        {tr('tab_whatsapp_bot')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "6" })}
                        onClick={() => tabChange("6")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-vip-crown-line me-1"></i>
                        {tr('tab_plans')}
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "7" })}
                        onClick={() => tabChange("7")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-armchair-line me-1"></i>
                        Coworking
                      </NavLink>
                    </NavItem>
                  </Nav>
                </CardHeader>

                {/* Tab content */}
                <CardBody className="pt-4">
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <span>{error}</span>
                    </div>
                  )}

                  {activeTab === "1" && (
                    <DatosTenant
                      section="datos"
                      name={name} phone={phone} address={address} city={city} email={email} website={website} ivaRate={ivaRate} adminFee={adminFee}
                      setName={setName} setPhone={setPhone} setAddress={setAddress} setCity={setCity} setEmail={setEmail} setWebsite={setWebsite} setIvaRate={setIvaRate} setAdminFee={setAdminFee}
                      productsForStaff={productsForStaff} setProductsForStaff={setProductsForStaff}
                      adminFeeEnabled={adminFeeEnabled} setAdminFeeEnabled={setAdminFeeEnabled}
                      loansToStaff={loansToStaff} setLoansToStaff={setLoansToStaff}
                      allowPastAppointments={allowPastAppointments} setAllowPastAppointments={setAllowPastAppointments}
                      sharedStylistsEnabled={sharedStylistsEnabled} setSharedStylistsEnabled={setSharedStylistsEnabled}
                      multiStylistEnabled={multiStylistEnabled} setMultiStylistEnabled={setMultiStylistEnabled}
                      ticketVirtualEnabled={ticketVirtualEnabled} setTicketVirtualEnabled={setTicketVirtualEnabled}
                      crossBranchScheduleBlock={crossBranchScheduleBlock} setCrossBranchScheduleBlock={setCrossBranchScheduleBlock}
                      manageAllBranchesCash={manageAllBranchesCash} setManageAllBranchesCash={setManageAllBranchesCash}
                      priceOverrideEnabled={priceOverrideEnabled} setPriceOverrideEnabled={setPriceOverrideEnabled}
                      tipSalonPercent={tipSalonPercent} setTipSalonPercent={setTipSalonPercent}
                      branchColor={branchColor} setBranchColor={setBranchColor}
                      hasBranches={hasBranches}
                      isPrimaryBranch={isPrimaryBranch}
                      isAdmin={isAdmin}
                      perDay={perDay} toggleDay={() => { }} changeHour={() => { }} applyMondayToAll={() => { }}
                      plan={currentPlan}
                      saving={saving} onSubmit={handleSaveInfo} onCancel={() => updateStateFromTenant(tenant)}
                    />
                  )}

                  {activeTab === "2" && (
                    <DatosTenant
                      section="horario"
                      name={name} phone={phone} address={address} city={city} email={email} website={website} ivaRate={ivaRate} adminFee={adminFee}
                      setName={() => { }} setPhone={() => { }} setAddress={() => { }} setCity={() => { }} setEmail={() => { }} setWebsite={() => { }} setIvaRate={() => { }} setAdminFee={() => { }}
                      productsForStaff={productsForStaff} setProductsForStaff={setProductsForStaff}
                      adminFeeEnabled={adminFeeEnabled} setAdminFeeEnabled={setAdminFeeEnabled}
                      loansToStaff={loansToStaff} setLoansToStaff={setLoansToStaff}
                      allowPastAppointments={allowPastAppointments} setAllowPastAppointments={setAllowPastAppointments}
                      sharedStylistsEnabled={sharedStylistsEnabled} setSharedStylistsEnabled={setSharedStylistsEnabled}
                      multiStylistEnabled={multiStylistEnabled} setMultiStylistEnabled={setMultiStylistEnabled}
                      ticketVirtualEnabled={ticketVirtualEnabled} setTicketVirtualEnabled={setTicketVirtualEnabled}
                      crossBranchScheduleBlock={crossBranchScheduleBlock} setCrossBranchScheduleBlock={setCrossBranchScheduleBlock}
                      manageAllBranchesCash={manageAllBranchesCash} setManageAllBranchesCash={setManageAllBranchesCash}
                      priceOverrideEnabled={priceOverrideEnabled} setPriceOverrideEnabled={setPriceOverrideEnabled}
                      tipSalonPercent={tipSalonPercent} setTipSalonPercent={setTipSalonPercent}
                      branchColor={branchColor} setBranchColor={setBranchColor}
                      hasBranches={hasBranches}
                      isPrimaryBranch={isPrimaryBranch}
                      isAdmin={isAdmin}
                      perDay={perDay} toggleDay={toggleDay} changeHour={changeHour} applyMondayToAll={applyMondayToAll}
                      saving={saving} onSubmit={handleSaveHours} onCancel={() => updateStateFromTenant(tenant)}
                    />
                  )}

                  {activeTab === "3" && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fs-16 fw-semibold d-flex align-items-center gap-2 mb-0">
                          <i className="ri-scissors-2-line text-primary"></i>{tr('tab_services')}
                        </h5>
                        <div className="d-flex align-items-center gap-2">
                          {svcLoading && <Spinner size="sm" color="primary" />}
                          <Button color="primary" onClick={openNewService}>
                            <i className="ri-add-line me-1" /> {tr('svc_new_service')}
                          </Button>
                        </div>
                      </div>

                      {/* Category filter chips */}
                      {categories.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          <button
                            onClick={() => setSvcCategoryFilter("all")}
                            className={`btn btn-sm ${
                              svcCategoryFilter === "all"
                                ? 'btn-primary'
                                : 'btn-soft-secondary'
                            } rounded-pill`}
                          >
                            {tr('svc_all_filter')} ({services.length})
                          </button>
                          {categories.map(cat => {
                            const count = services.filter(s => s.category_id === cat.id).length;
                            if (count === 0) return null;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => setSvcCategoryFilter(cat.id)}
                                className={`btn btn-sm ${
                                  svcCategoryFilter === cat.id
                                    ? 'btn-primary'
                                    : 'btn-soft-secondary'
                                } rounded-pill`}
                              >
                                {cat.name} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="table-responsive">
                        <Table className="table-hover align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>{tr('svc_table_service')}</th>
                              <th>{tr('svc_table_category')}</th>
                              <th>{tr('svc_table_duration')}</th>
                              <th>{tr('svc_table_price')}</th>
                              <th style={{ width: 100 }}>{tr('svc_table_actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedServices.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center py-4">
                                  <i className="ri-scissors-2-line fs-36 text-muted d-block mb-3"></i>
                                  <h6 className="fw-medium mb-1">
                                    {svcCategoryFilter !== "all" ? tr('svc_no_services_category') : tr('svc_no_services_yet')}
                                  </h6>
                                  <p className="text-muted mb-3">
                                    {svcCategoryFilter !== "all" ? tr('svc_try_other_category') : tr('svc_create_first')}
                                  </p>
                                  <Button color="primary" size="sm" onClick={openNewService}>
                                    <i className="ri-add-line me-1"></i> {tr('svc_create_service')}
                                  </Button>
                                </td>
                              </tr>
                            )}
                            {paginatedServices.map(s => {
                              const catName = categories.find(c => c.id === s.category_id)?.name || "\u2014";
                              return (
                                <tr key={s.id}>
                                  <td className="fw-semibold">{s.name}</td>
                                  <td>
                                    <span className="badge bg-info-subtle text-info rounded-pill">{catName}</span>
                                  </td>
                                  <td>
                                    <i className="ri-time-line me-1 text-muted"></i>{s.duration_minutes} min
                                  </td>
                                  <td className="fw-semibold">{fmtCurrency(s.price)}</td>
                                  <td>
                                    <div className="d-flex gap-2">
                                      <Button color="soft-primary" size="sm" className="btn-icon" onClick={() => openEditService(s)} title={tr('edit')}>
                                        <i className="ri-edit-line" />
                                      </Button>
                                      <Button color="soft-danger" size="sm" className="btn-icon" onClick={() => deleteService(s)} title={tr('delete')}>
                                        <i className="ri-delete-bin-line" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>

                      {filteredServices.length > SVC_PAGE_SIZE && (
                        <div className="d-flex align-items-center justify-content-end mt-3">
                          <ul className="pagination pagination-sm mb-0">
                            <li className={classnames("page-item", { disabled: svcPage === 1 })}>
                              <button
                                disabled={svcPage === 1}
                                onClick={() => setSvcPage(1)}
                                className="page-link"
                              >
                                <i className="ri-arrow-left-double-line" />
                              </button>
                            </li>
                            <li className={classnames("page-item", { disabled: svcPage === 1 })}>
                              <button
                                disabled={svcPage === 1}
                                onClick={() => setSvcPage(p => Math.max(1, p - 1))}
                                className="page-link"
                              >
                                <i className="ri-arrow-left-s-line" />
                              </button>
                            </li>
                            {renderSvcPageNumbers()}
                            <li className={classnames("page-item", { disabled: svcPage === totalSvcPages })}>
                              <button
                                disabled={svcPage === totalSvcPages}
                                onClick={() => setSvcPage(p => Math.min(totalSvcPages, p + 1))}
                                className="page-link"
                              >
                                <i className="ri-arrow-right-s-line" />
                              </button>
                            </li>
                            <li className={classnames("page-item", { disabled: svcPage === totalSvcPages })}>
                              <button
                                disabled={svcPage === totalSvcPages}
                                onClick={() => setSvcPage(totalSvcPages)}
                                className="page-link"
                              >
                                <i className="ri-arrow-right-double-line" />
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}

                      <ServiceModal
                        isOpen={svModalOpen}
                        onClose={() => setSvModalOpen(false)}
                        onSaved={refreshAllServices}
                        categories={categories}
                        onCategoryCreated={handleCategoryCreated}
                        tenantId={tenantId}
                        edit={svEdit}
                        onManageCategories={() => setCategoryManagerOpen(true)}
                        multiStylistEnabled={multiStylistEnabled}
                      />
                    </>
                  )}

                  {activeTab === "4" && (
                    <Personal
                      services={services}
                      categories={categories}
                      onStaffChange={loadStaffCount}
                    />
                  )}

                  {activeTab === "5" && (
                    <WhatsAppConfig tenantId={tenantId} />
                  )}

                  {activeTab === "6" && (
                    <>
                      {(() => {
                        const plans = [
                          {
                            key: "free", name: tr("free"), priceUSD: 0, priceCOP: 0, period: tr("forever"),
                            icon: "ri-gift-line", color: "secondary", features: [
                              { text: tr("plan_feat_calendar"), included: true },
                              { text: tr("plan_feat_booking_link"), included: true },
                              { text: tr("plan_feat_1_staff"), included: true },
                              { text: tr("plan_feat_ai_scheduling"), included: false },
                              { text: tr("plan_feat_geo_queue"), included: false },
                              { text: tr("plan_feat_advanced_modules"), included: false },
                              { text: tr("plan_feat_ai_whatsapp"), included: false },
                            ],
                          },
                          {
                            key: "pro", name: "Pro", priceUSD: 10, priceCOP: 29900, period: `/ ${tr("month_short")}`,
                            icon: "ri-rocket-line", color: "primary", features: [
                              { text: tr("plan_feat_all_free"), included: true },
                              { text: tr("plan_feat_ai_scheduling"), included: true },
                              { text: tr("plan_feat_geo_queue"), included: true },
                              { text: tr("plan_feat_full_catalog"), included: true },
                              { text: tr("plan_feat_unlimited_staff"), included: true },
                              { text: tr("plan_feat_payroll_inventory"), included: true },
                              { text: tr("plan_feat_ai_whatsapp"), included: false },
                            ],
                          },
                          {
                            key: "business", name: "Business", priceUSD: 19, priceCOP: 49900, period: `/ ${tr("month_short")}`,
                            icon: "ri-building-2-line", color: "info", highlighted: true, features: [
                              { text: tr("plan_feat_all_pro"), included: true },
                              { text: tr("plan_feat_ai_complete"), included: true },
                              { text: tr("plan_feat_whatsapp_bot"), included: true },
                              { text: tr("plan_feat_floating_assistant"), included: true },
                              { text: tr("plan_feat_pro_website"), included: true },
                              { text: tr("plan_feat_multi_branch"), included: false },
                            ],
                          },
                          {
                            key: "enterprise", name: "Enterprise", priceUSD: 34.90, priceCOP: 129900, period: `/ ${tr("month_short")}`,
                            icon: "ri-global-line", color: "warning", features: [
                              { text: tr("plan_feat_all_business"), included: true },
                              { text: tr("plan_feat_multisite"), included: true },
                              { text: tr("plan_feat_shared_stylists"), included: true },
                              { text: tr("plan_feat_global_analytics"), included: true },
                              { text: tr("plan_feat_vip_support"), included: true },
                              { text: tr("plan_feat_electronic_invoice"), included: true },
                            ],
                          },
                        ];
                        const currentIdx = PLAN_ORDER.indexOf(currentPlan);
                        return (
                          <>
                            {/* Header */}
                            <div className="text-center mb-4">
                              <h5 className="fs-16 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-2">
                                <i className="ri-vip-crown-line text-warning"></i>
                                {tr("plans_title")}
                              </h5>
                              <p className="text-muted mb-0">{tr("plans_subtitle")}</p>
                            </div>

                            {/* Subscription status card */}
                            {tenant?.has_stripe_subscription && tenant?.subscription_status && (
                              <Card className={`mb-4 border ${
                                tenant.subscription_status === 'active' ? 'border-success' :
                                tenant.subscription_status === 'cancel_at_period_end' ? 'border-warning' :
                                tenant.subscription_status === 'past_due' ? 'border-danger' : 'border-secondary'
                              }`}>
                                <CardBody className="py-3">
                                  <Row className="align-items-center">
                                    <Col md={6}>
                                      <div className="d-flex align-items-center gap-3">
                                        <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                                          tenant.subscription_status === 'active' ? 'bg-success-subtle text-success' :
                                          tenant.subscription_status === 'cancel_at_period_end' ? 'bg-warning-subtle text-warning' :
                                          tenant.subscription_status === 'past_due' ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'
                                        }`} style={{ width: 44, height: 44, flexShrink: 0 }}>
                                          <i className={`fs-20 ${
                                            tenant.subscription_status === 'active' ? 'ri-checkbox-circle-fill' :
                                            tenant.subscription_status === 'cancel_at_period_end' ? 'ri-time-fill' :
                                            tenant.subscription_status === 'past_due' ? 'ri-error-warning-fill' : 'ri-close-circle-fill'
                                          }`}></i>
                                        </div>
                                        <div>
                                          <h6 className="mb-1 fw-semibold">
                                            Plan {(PLAN_CONFIG[currentPlan] || PLAN_CONFIG.free).label}
                                            <Badge color={
                                              tenant.subscription_status === 'active' ? 'success' :
                                              tenant.subscription_status === 'cancel_at_period_end' ? 'warning' :
                                              tenant.subscription_status === 'past_due' ? 'danger' : 'secondary'
                                            } className="ms-2" pill>
                                              {tenant.subscription_status === 'active' ? tr('subscription_active') :
                                               tenant.subscription_status === 'cancel_at_period_end' ? tr('cancels_at_period_end') :
                                               tenant.subscription_status === 'past_due' ? tr('payment_pending') : tr('subscription_cancelled')}
                                            </Badge>
                                          </h6>
                                          {tenant.current_period_end && (tenant.subscription_status === 'active' || tenant.subscription_status === 'cancel_at_period_end') && (
                                            <small className="text-muted">
                                              <i className="ri-calendar-line me-1"></i>
                                              {tenant.subscription_status === 'cancel_at_period_end' ? tr("plan_active_until") : tr("next_billing")}{' '}
                                              {new Date(tenant.current_period_end).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </small>
                                          )}
                                        </div>
                                      </div>
                                    </Col>
                                    <Col md={6} className="mt-3 mt-md-0">
                                      <div className="d-flex justify-content-md-end gap-2">
                                        <Button size="sm" color="primary" outline onClick={async () => {
                                          try {
                                            const { data } = await api.post('/stripe/billing-portal');
                                            if (data.url) window.open(data.url, '_blank');
                                          } catch (e: any) {
                                            Swal.fire({ icon: 'error', title: 'Error', text: e?.response?.data?.error || 'No se pudo abrir el portal.' });
                                          }
                                        }}>
                                          <i className="ri-bank-card-line me-1"></i>{tr("manage_payment")}
                                        </Button>
                                        <Button size="sm" color="info" outline onClick={async () => {
                                          try {
                                            const { data } = await api.get('/stripe/invoices');
                                            if (!data.invoices?.length) {
                                              Swal.fire({ icon: 'info', title: tr('invoices_history'), text: tr('no_invoices') });
                                              return;
                                            }
                                            const invoiceHtml = data.invoices.map((inv: any) =>
                                              `<tr>
                                                <td class="py-2">${new Date(inv.date).toLocaleDateString('es-CO')}</td>
                                                <td class="py-2 fw-semibold">$${(inv.amount / 100).toLocaleString('es-CO')}</td>
                                                <td class="py-2"><span class="badge bg-${inv.status === 'paid' ? 'success' : 'warning'}-subtle text-${inv.status === 'paid' ? 'success' : 'warning'} rounded-pill">${inv.status === 'paid' ? 'Pagada' : inv.status}</span></td>
                                                <td class="py-2">${inv.pdf_url ? `<a href="${inv.pdf_url}" target="_blank" class="text-primary"><i class="ri-download-2-line"></i> PDF</a>` : '-'}</td>
                                              </tr>`
                                            ).join('');
                                            Swal.fire({
                                              title: `<i class="ri-file-list-3-line me-2"></i>${tr('invoices_title')}`,
                                              html: `<div class="table-responsive"><table class="table table-hover table-sm text-start mb-0"><thead class="table-light"><tr><th>Fecha</th><th>Monto</th><th>Estado</th><th></th></tr></thead><tbody>${invoiceHtml}</tbody></table></div>`,
                                              width: 650,
                                              showConfirmButton: true,
                                              confirmButtonText: 'Cerrar',
                                              confirmButtonColor: '#405189',
                                            });
                                          } catch (e: any) {
                                            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las facturas.' });
                                          }
                                        }}>
                                          <i className="ri-file-list-3-line me-1"></i>{tr("invoices_history")}
                                        </Button>
                                      </div>
                                    </Col>
                                  </Row>
                                </CardBody>
                              </Card>
                            )}
                            {/* Banner "Vuelve" for cancelled/free users */}
                            {currentPlan === 'free' && (tenant?.subscription_status === 'canceled' || tenant?.subscription_status === 'expired') && (
                              <Card className="mb-3 border border-primary" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' }}>
                                <CardBody className="py-3">
                                  <Row className="align-items-center">
                                    <Col md={8}>
                                      <div className="d-flex align-items-center gap-3">
                                        <span style={{ fontSize: 36 }}>👋</span>
                                        <div>
                                          <h5 className="fw-bold mb-1 text-primary">¡Te extrañamos! Vuelve a tu plan</h5>
                                          <p className="text-muted mb-0 small">
                                            Tu salón funcionaba mejor con las herramientas avanzadas: agenda inteligente, geolocalización, reportes y más.
                                            <strong> Reactiva tu plan y recupera todo al instante.</strong>
                                          </p>
                                        </div>
                                      </div>
                                    </Col>
                                    <Col md={4} className="text-md-end mt-2 mt-md-0">
                                      <Badge color="primary" className="fs-13 px-3 py-2">
                                        <i className="ri-arrow-go-back-line me-1"></i> {tr("come_back") || "¡Vuelve!"}
                                      </Badge>
                                    </Col>
                                  </Row>
                                </CardBody>
                              </Card>
                            )}

                            <Row className="g-3">
                              {plans.map((plan) => {
                                const isCurrent = plan.key === currentPlan;
                                const planIdx = PLAN_ORDER.indexOf(plan.key);
                                const isDowngrade = planIdx < currentIdx;
                                const iconBgClass = planIconBgMap[plan.color] || planIconBgMap.secondary;
                                return (
                                  <Col md={6} xl={3} key={plan.key}>
                                    <Card className={`h-100 border-2 ${
                                      isCurrent ? 'border-success shadow' : plan.highlighted ? 'border-primary shadow' : ''
                                    }`}>
                                      {plan.highlighted && !isCurrent && (
                                        <div className="text-center pt-3">
                                          <span className="badge bg-primary-subtle text-primary rounded-pill">{tr("recommended")}</span>
                                        </div>
                                      )}
                                      {isCurrent && (
                                        <div className="text-center pt-3">
                                          <span className="badge bg-success-subtle text-success rounded-pill">
                                            <i className="ri-check-line me-1"></i>{tr("your_current_plan")}
                                          </span>
                                        </div>
                                      )}
                                      <CardBody className="d-flex flex-column">
                                        <div className="text-center mb-3">
                                          <div className={`mx-auto mb-2 rounded-circle d-flex align-items-center justify-content-center fs-20 ${iconBgClass}`} style={{ width: '48px', height: '48px' }}>
                                            <i className={plan.icon}></i>
                                          </div>
                                          <h5 className="fw-bold mb-0">{plan.name}</h5>
                                        </div>
                                        <div className="text-center mb-3">
                                          <span className="fs-24 fw-bold">{plan.priceCOP === 0 ? tr("free") : `$${plan.priceCOP.toLocaleString('es-CO')}`}</span>
                                          <small className="text-muted d-block">{plan.period}</small>
                                        </div>
                                        <hr className="my-2" />
                                        <ul className="list-unstyled vstack gap-2 flex-grow-1 mb-3">
                                          {plan.features.map((f, i) => (
                                            <li key={i} className={`d-flex align-items-start gap-2 ${f.included ? '' : 'text-muted'}`}>
                                              <i className={`mt-1 flex-shrink-0 ${f.included ? 'ri-check-line text-success' : 'ri-close-line text-muted'}`}></i>
                                              <span>{f.text}</span>
                                            </li>
                                          ))}
                                        </ul>
                                        <div className="mt-auto">
                                          {isCurrent ? (
                                            <Button disabled color="success" outline className="w-100">
                                              <i className="ri-check-double-line me-1"></i> {tr("plan_active")}
                                            </Button>
                                          ) : isDowngrade ? (
                                            <Button
                                              color="soft-secondary"
                                              className="w-100"
                                              onClick={() => {
                                                Swal.fire({
                                                  title: `${tr("switch_to")} ${plan.name}?`,
                                                  html: plan.key === 'free' && tenant?.has_stripe_subscription
                                                    ? `<p>${tr("cancel_subscription_warning")}</p>`
                                                    : `<p>${tr("downgrade_warning")} <strong>${plan.name}</strong>.</p>`,
                                                  icon: "warning",
                                                  showCancelButton: true,
                                                  confirmButtonText: plan.key === 'free' ? tr("cancel_subscription") : tr("yes_switch"),
                                                  cancelButtonText: tr("go_back"),
                                                  confirmButtonColor: "#f06548",
                                                }).then((result) => {
                                                  if (result.isConfirmed) changePlan(plan.key);
                                                });
                                              }}
                                            >
                                              {tr("switch_to")} {plan.name}
                                            </Button>
                                          ) : (
                                            <Button
                                              color={plan.highlighted ? "primary" : "soft-primary"}
                                              className="w-100"
                                              disabled={saving}
                                              onClick={() => {
                                                Swal.fire({
                                                  title: `${tr("activate_plan")} ${plan.name}`,
                                                  html: `<p>${tr("activate_plan_confirm")} <strong>${plan.name} ($${plan.priceCOP.toLocaleString('es-CO')}/${tr("month_short")})</strong>?</p><p class="text-muted small">${tr("redirect_to_payment")}</p>`,
                                                  icon: "question",
                                                  showCancelButton: true,
                                                  confirmButtonText: tr("go_to_pay"),
                                                  cancelButtonText: tr("cancel"),
                                                  confirmButtonColor: "#0ab39c",
                                                }).then((result) => {
                                                  if (result.isConfirmed) changePlan(plan.key);
                                                });
                                              }}
                                            >
                                              {saving ? <Spinner size="sm" /> : <><i className="ri-vip-crown-line me-1"></i> {tr("activate")} {plan.name}</>}
                                            </Button>
                                          )}
                                        </div>
                                      </CardBody>
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {activeTab === "7" && <ChairRentalTab />}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        toggle={() => setCategoryManagerOpen(false)}
        title={tr('cat_manager_title')}
        categories={categories}
        onSave={handleUpdateServiceCategory}
        onDelete={handleDeleteServiceCategory}
      />
    </React.Fragment>
  );
};

export default Settings;
