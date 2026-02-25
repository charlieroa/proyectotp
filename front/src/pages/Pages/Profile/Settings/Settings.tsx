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
import { setSetupProgress } from '../../../../slices/Settings/settingsSlice';

import progileBg from '../../../../assets/images/profile-bg.jpg';
import avatar1 from '../../../../assets/images/users/avatar-1.jpg';
import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

// Vistas hijas y componentes comunes
import Personal from "./personal";
import DatosTenant, { DayKey, DayState, WorkingHoursPerDay } from "./datostenant";
import CategoryManagerModal from '../../../../Components/Common/CategoryManagerModal';

import WhatsAppConfig from "./WhatsAppConfig";

// --- Tipos y Helpers ---
type Tenant = {
  id: string;
  name?: string | null;
  address?: string | null;
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
  shared_stylists_enabled?: boolean;
  tip_salon_percent?: number | null;
  branch_color?: string | null;
  parent_tenant_id?: string | null;
  working_hours?: Record<string, string | null> | null;
  plan?: string | null;
  created_at?: string;
  updated_at?: string;
};

const PLAN_CONFIG: Record<string, { label: string; color: string; price: string }> = {
  free: { label: "Gratis", color: "secondary", price: "$0" },
  pro: { label: "Pro", color: "primary", price: "$29.900/mes" },
  business: { label: "Business", color: "info", price: "$49.900/mes" },
  enterprise: { label: "Enterprise", color: "warning", price: "$99.900/mes" },
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
  for (const { key, label } of DAYS) {
    const d = perDay[key];
    if (d.active) {
      const [sh, sm] = toTime(d.start).split(":").map(Number);
      const [eh, em] = toTime(d.end).split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) return `El horario de ${label} es inválido: fin debe ser mayor que inicio.`;
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
}> = ({ isOpen, onClose, onSaved, categories, onCategoryCreated, tenantId, edit, onManageCategories }) => {
  const [saving, setSaving] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [description, setDescription] = useState<string>("");

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
      } else {
        setCategoryId(categories[0]?.id || "");
        setName(""); setPrice(""); setDuration(""); setDescription("");
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
      Swal.fire({ icon: 'success', title: '!Categoria creada!', timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo crear la categoria', 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!categoryId || !name.trim() || !price || !duration) {
      Swal.fire('Campos incompletos', 'Por favor completa categoria, nombre, precio y duracion.', 'warning');
      return;
    }
    const body: any = {
      category_id: categoryId, name: name.trim(), price: Number(price),
      duration_minutes: Number(duration), description: description.trim() || null,
    };
    setSaving(true);
    try {
      if (edit) {
        await api.put(`/services/${edit.id}`, body);
      } else {
        body.tenant_id = tenantId;
        await api.post(`/services`, body);
      }
      Swal.fire({ icon: 'success', title: edit ? '!Servicio actualizado!' : '!Servicio Creado!', showConfirmButton: false, timer: 1500 });
      onSaved();
      onClose();
    } catch (e: any) {
      Swal.fire('Error al guardar', e?.response?.data?.message || 'No se pudo guardar el servicio', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
      <ModalHeader toggle={onClose}>{edit ? "Editar servicio" : "Nuevo servicio"}</ModalHeader>
      <ModalBody>
        <div className="vstack gap-3">
          <div>
            <Label className="form-label">Categoria</Label>
            <div className="d-flex gap-2">
              <div className="flex-grow-1">
                <CreatableSelect
                  isClearable isSearchable
                  options={categoryOptions}
                  value={categoryOptions.find(opt => opt.value === categoryId)}
                  onChange={(selected) => setCategoryId(selected ? selected.value : "")}
                  onCreateOption={handleCreateCategory}
                  placeholder="Busca o crea una categoria..."
                  formatCreateLabel={inputValue => `Crear nueva categoria: "${inputValue}"`}
                  isLoading={saving}
                  isDisabled={saving}
                />
              </div>
              <Button type="button" color="light" onClick={onManageCategories} className="d-inline-flex align-items-center justify-content-center" title="Gestionar categorias">
                <i className="ri-settings-3-line"></i>
              </Button>
            </div>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <Label className="form-label">Nombre del servicio</Label>
              <Input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Corte para Dama" />
            </Col>
            <Col md={6}>
              <Label className="form-label">Duracion (minutos)</Label>
              <Input type="number" min={1} className="form-control" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej: 60" />
            </Col>
          </Row>
          <div>
            <Label className="form-label">Precio</Label>
            <Input
              type="text"
              inputMode="numeric"
              className="form-control"
              value={formatCOPString(price)}
              onChange={(e) => setPrice(onlyDigits(e.target.value))}
              placeholder="$50.000"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose}>Cancelar</Button>
        <Button color="primary" onClick={save} disabled={saving}>
          {saving && <Spinner size="sm" className="me-1" />} Guardar
        </Button>
      </ModalFooter>
    </Modal>
  );
};

/* ================= Pagina Settings ================= */
const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"1" | "2" | "3" | "4" | "5" | "6">(() => {
    const t = searchParams.get("tab");
    return (t && ["1","2","3","4","5","6"].includes(t)) ? t as any : "1";
  });

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
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
  const [tipSalonPercent, setTipSalonPercent] = useState<string>("10");
  const [branchColor, setBranchColor] = useState<string>("#3788d8");
  const [hasBranches, setHasBranches] = useState<boolean>(false);
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

  const tabChange = (tab: "1" | "2" | "3" | "4" | "5" | "6") => { if (activeTab !== tab) setActiveTab(tab); };

  const updateStateFromTenant = (tenantData: Tenant | null) => {
    if (!tenantData) return;
    setTenant(tenantData);
    setName(tenantData.name ?? "");
    setPhone(tenantData.phone ?? "");
    setAddress(tenantData.address ?? "");
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
    setTipSalonPercent(tenantData.tip_salon_percent != null ? String(tenantData.tip_salon_percent) : "10");
    setBranchColor(tenantData.branch_color ?? "#3788d8");
    setHasBranches(!!tenantData.parent_tenant_id);
    const baseUrl = api.defaults.baseURL || '';
    let finalDisplayUrl = "";
    if (tenantData.logo_url) {
      finalDisplayUrl = tenantData.logo_url.startsWith('http') ? tenantData.logo_url : `${baseUrl}${tenantData.logo_url}`;
    }
    setLogoUrl(finalDisplayUrl);
  };

  useEffect(() => {
    document.title = "Configuracion | Peluqueria";
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const tenantId = decodeTenantId();
        if (!tenantId) {
          setError("No se encontro el tenant en tu sesion. Inicia sesion nuevamente.");
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
        setError(e?.response?.data?.message || e?.message || "No se pudo cargar la informacion.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveAll = async () => {
    setSaving(true); setError(null);
    try {
      const tenantId = tenant?.id || decodeTenantId();
      if (!tenantId) throw new Error("No se encontro el tenant para actualizar.");

      const hoursErr = validateWorkingHours(perDay);
      if (hoursErr) {
        Swal.fire({ icon: 'error', title: 'Horario Invalido', text: hoursErr });
        setSaving(false);
        return;
      }

      let logoUrlForPayload = tenant?.logo_url || null;

      if (logoUrlForPayload && logoUrlForPayload.startsWith('http')) {
        const baseUrl = api.defaults.baseURL;
        if (baseUrl && logoUrlForPayload.startsWith(baseUrl)) {
          logoUrlForPayload = logoUrlForPayload.replace(baseUrl, '');
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
            throw new Error("La URL del logo no se recibio correctamente.");
          }
        } catch (uploadError: any) {
          Swal.fire({ icon: 'error', title: 'Error de Carga', text: uploadError?.response?.data?.message || uploadError?.message || "No se pudo subir el logo." });
          setUploadingLogo(false); setSaving(false); return;
        } finally {
          setUploadingLogo(false);
        }
      }

      const payload = {
        name: name.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
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
        tip_salon_percent: ensureNumber(tipSalonPercent),
        branch_color: branchColor,
      } as any;

      await api.put(`/tenants/${tenantId}`, payload);
      const { data: freshTenantData } = await api.get(`/tenants/${tenantId}`);
      updateStateFromTenant(freshTenantData);
      Swal.fire({ icon: 'success', title: '!Guardado!', text: 'Los cambios se guardaron correctamente.', timer: 2000, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error al Guardar', text: e?.response?.data?.message || e?.message || "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };
  const handleSaveHours = async (e?: React.FormEvent) => { e?.preventDefault(); await saveAll(); };

  // Manual plan change
  const changePlan = async (newPlan: string) => {
    const tid = tenant?.id || decodeTenantId();
    if (!tid) return;
    try {
      setSaving(true);
      await api.put(`/tenants/${tid}`, { plan: newPlan });
      const { data: fresh } = await api.get(`/tenants/${tid}`);
      updateStateFromTenant(fresh);
      Swal.fire({ icon: 'success', title: '!Plan actualizado!', text: `Tu plan ahora es ${(PLAN_CONFIG[newPlan] || PLAN_CONFIG.free).label}.`, timer: 2000, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: e?.response?.data?.message || 'No se pudo cambiar el plan.' });
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
    catch (e: any) { setError(e?.response?.data?.message || e?.message || 'No se pudieron cargar las categorias'); }
    finally { setCatLoading(false); }
  };
  const loadServices = async () => {
    if (!tenantId) return;
    setSvcLoading(true);
    try {
      const { data } = await api.get(`/services/tenant/${tenantId}`);
      setServices(Array.isArray(data) ? data : []);
    }
    catch (e: any) { setError(e?.response?.data?.message || e?.message || 'No se pudieron cargar los servicios'); }
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
      title: `Eliminar "${svc.name}"?`, text: "Esta accion no se puede deshacer.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Si, eliminar!', cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await api.delete(`/services/${svc.id}`);
        await loadServices();
        Swal.fire('Eliminado!', 'El servicio ha sido eliminado.', 'success');
      }
      catch (e: any) {
        Swal.fire({ icon: 'error', title: 'Error', text: e?.response?.data?.message || e?.message || 'No se pudo eliminar el servicio' });
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
      Swal.fire({ icon: 'success', title: '!Actualizada!', text: 'La categoria ha sido actualizada.', timer: 1500, showConfirmButton: false });
      await loadCategories();
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo actualizar la categoria', 'error');
    }
  };

  const handleDeleteServiceCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      handleCategoryDeleted(id);
      Swal.fire({ icon: 'success', title: '!Eliminada!', text: 'La categoria ha sido eliminada.', timer: 1500, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire('Error', e?.response?.data?.error || 'No se pudo eliminar la categoria', 'error');
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
                  <span className="text-muted">Cargando configuracion...</span>
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
                    <div className="position-relative d-inline-block cursor-pointer mb-3" onClick={openLogoPicker} title="Cambiar logo">
                      <img src={logoUrl || avatar1} className="rounded-circle border border-4 border-white shadow object-fit-cover" style={{ width: '96px', height: '96px' }} alt="logo" />
                      <span className="position-absolute bottom-0 end-0 d-flex align-items-center justify-content-center rounded-circle bg-primary text-white border border-2 border-white shadow" style={{ width: '32px', height: '32px' }}>
                        <i className="ri-image-edit-line fs-12"></i>
                      </span>
                      <input ref={logoInputRef} type="file" accept="image/*" className="d-none" onChange={onLogoInputChange} />
                    </div>
                    <div className="fs-12 text-muted mb-2">
                      {uploadingLogo ? "Subiendo logo..." : (logoFile ? "Logo listo para guardar" : "Haz clic en el logo para cambiarlo")}
                    </div>
                    <h5 className="fs-16 fw-semibold mb-1">{name || "Mi peluqueria"}</h5>
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
                            <div className="flex-grow-1"><h5 className="fw-semibold mb-0">Mi Plan</h5></div>
                            <div className="flex-shrink-0">
                              <span className={`badge bg-${planInfo.color}-subtle text-${planInfo.color} rounded-pill`}>{planInfo.price}</span>
                            </div>
                          </div>
                          <div className="text-center mb-3">
                            <span className={`badge bg-${badgeColor}-subtle text-${badgeColor} rounded-pill fs-14 px-3 py-2`}>
                              {planInfo.label}
                            </span>
                          </div>
                          <Button
                            type="button"
                            color="soft-primary"
                            className="w-100 d-inline-flex align-items-center justify-content-center gap-2"
                            onClick={() => tabChange("6")}
                          >
                            <i className="ri-vip-crown-line"></i> Upgrade de Plan
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
                      <div className="flex-grow-1"><h5 className="fw-semibold mb-0">Avance de configuracion</h5></div>
                      <div className="flex-shrink-0">
                        <span className={`badge ${progress === 100 ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'} rounded-pill`}>
                          {progress === 100 ? "Completo" : "Parcial"}
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
                        <span className="flex-grow-1">Datos de la peluqueria</span>
                        {!datosOk && (
                          <button onClick={() => tabChange("1")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            Ir <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${horariosOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">Horarios de atencion</span>
                        {!horariosOk && (
                          <button onClick={() => tabChange("2")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            Ir <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${serviciosOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">Servicios creados</span>
                        {!serviciosOk && (
                          <button onClick={() => tabChange("3")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            Ir <i className="ri-arrow-right-s-line"></i>
                          </button>
                        )}
                      </li>
                      <li className="d-flex align-items-center gap-2">
                        <i className={`fs-16 ${personalOk ? 'ri-checkbox-circle-fill text-success' : 'ri-checkbox-blank-circle-line text-muted'}`}></i>
                        <span className="flex-grow-1">
                          Personal registrado {staffLoading && <Spinner size="sm" className="ms-1" />}
                        </span>
                        {!personalOk && !staffLoading && (
                          <button onClick={() => tabChange("4")} className="btn btn-link btn-sm text-primary p-0 fw-medium">
                            Ir <i className="ri-arrow-right-s-line"></i>
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
              <Card className="overflow-hidden">
                {/* Title + Tabs header */}
                <CardHeader className="p-0">
                  <div className="d-flex align-items-center px-4 pt-3 pb-2">
                    <h4 className="fw-semibold mb-0">
                      <i className="ri-settings-3-line me-2 text-primary"></i>
                      Configuración
                    </h4>
                  </div>
                  <Nav tabs className="nav-tabs-custom px-4">
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "1" })}
                        onClick={() => tabChange("1")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-home-line me-1"></i>
                        Datos de la peluqueria
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "2" })}
                        onClick={() => tabChange("2")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-time-line me-1"></i>
                        Horario
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
                        Servicios
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
                        Personal
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
                        Configura tu bot
                      </NavLink>
                    </NavItem>
                    <NavItem>
                      <NavLink
                        className={classnames({ active: activeTab === "6" })}
                        onClick={() => tabChange("6")}
                        style={{ cursor: 'pointer' }}
                      >
                        <i className="ri-vip-crown-line me-1"></i>
                        Planes
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
                      name={name} phone={phone} address={address} email={email} website={website} ivaRate={ivaRate} adminFee={adminFee}
                      setName={setName} setPhone={setPhone} setAddress={setAddress} setEmail={setEmail} setWebsite={setWebsite} setIvaRate={setIvaRate} setAdminFee={setAdminFee}
                      productsForStaff={productsForStaff} setProductsForStaff={setProductsForStaff}
                      adminFeeEnabled={adminFeeEnabled} setAdminFeeEnabled={setAdminFeeEnabled}
                      loansToStaff={loansToStaff} setLoansToStaff={setLoansToStaff}
                      allowPastAppointments={allowPastAppointments} setAllowPastAppointments={setAllowPastAppointments}
                      sharedStylistsEnabled={sharedStylistsEnabled} setSharedStylistsEnabled={setSharedStylistsEnabled}
                      tipSalonPercent={tipSalonPercent} setTipSalonPercent={setTipSalonPercent}
                      branchColor={branchColor} setBranchColor={setBranchColor}
                      hasBranches={hasBranches}
                      perDay={perDay} toggleDay={() => { }} changeHour={() => { }} applyMondayToAll={() => { }}
                      plan={currentPlan}
                      saving={saving} onSubmit={handleSaveInfo} onCancel={() => updateStateFromTenant(tenant)}
                    />
                  )}

                  {activeTab === "2" && (
                    <DatosTenant
                      section="horario"
                      name={name} phone={phone} address={address} email={email} website={website} ivaRate={ivaRate} adminFee={adminFee}
                      setName={() => { }} setPhone={() => { }} setAddress={() => { }} setEmail={() => { }} setWebsite={() => { }} setIvaRate={() => { }} setAdminFee={() => { }}
                      productsForStaff={productsForStaff} setProductsForStaff={setProductsForStaff}
                      adminFeeEnabled={adminFeeEnabled} setAdminFeeEnabled={setAdminFeeEnabled}
                      loansToStaff={loansToStaff} setLoansToStaff={setLoansToStaff}
                      allowPastAppointments={allowPastAppointments} setAllowPastAppointments={setAllowPastAppointments}
                      sharedStylistsEnabled={sharedStylistsEnabled} setSharedStylistsEnabled={setSharedStylistsEnabled}
                      tipSalonPercent={tipSalonPercent} setTipSalonPercent={setTipSalonPercent}
                      branchColor={branchColor} setBranchColor={setBranchColor}
                      hasBranches={hasBranches}
                      perDay={perDay} toggleDay={toggleDay} changeHour={changeHour} applyMondayToAll={applyMondayToAll}
                      saving={saving} onSubmit={handleSaveHours} onCancel={() => updateStateFromTenant(tenant)}
                    />
                  )}

                  {activeTab === "3" && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fs-16 fw-semibold d-flex align-items-center gap-2 mb-0">
                          <i className="ri-scissors-2-line text-primary"></i>Servicios
                        </h5>
                        <div className="d-flex align-items-center gap-2">
                          {svcLoading && <Spinner size="sm" color="primary" />}
                          <Button color="primary" onClick={openNewService}>
                            <i className="ri-add-line me-1" /> Nuevo servicio
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
                            Todas ({services.length})
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
                              <th>Servicio</th>
                              <th>Categoria</th>
                              <th>Duracion</th>
                              <th>Precio</th>
                              <th style={{ width: 100 }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedServices.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center py-4">
                                  <i className="ri-scissors-2-line fs-36 text-muted d-block mb-3"></i>
                                  <h6 className="fw-medium mb-1">
                                    {svcCategoryFilter !== "all" ? "No hay servicios en esta categoria" : "No has creado ningun servicio todavia"}
                                  </h6>
                                  <p className="text-muted mb-3">
                                    {svcCategoryFilter !== "all" ? "Prueba con otra categoria o crea un nuevo servicio." : "Crea tu primer servicio para que tus clientes puedan agendarlo."}
                                  </p>
                                  <Button color="primary" size="sm" onClick={openNewService}>
                                    <i className="ri-add-line me-1"></i> Crear servicio
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
                                  <td className="fw-semibold">{formatterCOP.format(s.price)}</td>
                                  <td>
                                    <div className="d-flex gap-2">
                                      <Button color="soft-primary" size="sm" className="btn-icon" onClick={() => openEditService(s)} title="Editar">
                                        <i className="ri-edit-line" />
                                      </Button>
                                      <Button color="soft-danger" size="sm" className="btn-icon" onClick={() => deleteService(s)} title="Eliminar">
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
                            key: "free", name: "Gratis", price: "$0", period: "para siempre",
                            icon: "ri-gift-line", color: "secondary", features: [
                              { text: "Calendario y agenda basica", included: true },
                              { text: "Enlace de reservas web", included: true },
                              { text: "1 Perfil de Staff (Admin)", included: true },
                              { text: "Servicios y personal", included: false },
                              { text: "Modulos avanzados", included: false },
                              { text: "Asistente IA WhatsApp", included: false },
                              { text: "Multiples sucursales", included: false },
                            ],
                          },
                          {
                            key: "pro", name: "Pro", price: "$29.900", period: "COP / mes",
                            icon: "ri-rocket-line", color: "primary", features: [
                              { text: "Todo lo del plan Gratis", included: true },
                              { text: "Servicios y catalogo completo", included: true },
                              { text: "Staff ilimitado y comisiones", included: true },
                              { text: "Modulos: nomina, inventario, prestamos", included: true },
                              { text: "QR para clientes", included: true },
                              { text: "Campanas de recuperacion", included: true },
                              { text: "Asistente IA WhatsApp", included: false },
                              { text: "Multiples sucursales", included: false },
                            ],
                          },
                          {
                            key: "business", name: "Business", price: "$49.900", period: "COP / mes",
                            icon: "ri-building-2-line", color: "info", highlighted: true, features: [
                              { text: "Todo lo del plan Pro", included: true },
                              { text: "Asistente IA por WhatsApp", included: true },
                              { text: "Sitio web profesional incluido", included: true },
                              { text: "Panel administrador avanzado", included: true },
                              { text: "Reportes y analitica", included: true },
                              { text: "Multiples sucursales", included: false },
                            ],
                          },
                          {
                            key: "enterprise", name: "Enterprise", price: "$99.900", period: "COP / mes",
                            icon: "ri-global-line", color: "warning", features: [
                              { text: "Todo lo del plan Business", included: true },
                              { text: "Multiples sucursales (Multisite)", included: true },
                              { text: "Estilistas compartidos entre sedes", included: true },
                              { text: "Analitica global avanzada", included: true },
                              { text: "Soporte VIP 24/7", included: true },
                            ],
                          },
                        ];
                        const currentIdx = PLAN_ORDER.indexOf(currentPlan);
                        return (
                          <>
                            <div className="text-center mb-4">
                              <h5 className="fs-16 fw-semibold mb-1 d-flex align-items-center justify-content-center gap-2">
                                <i className="ri-vip-crown-line text-warning"></i>
                                Planes Tupelukeria
                              </h5>
                              <p className="text-muted">Elige el plan que mejor se adapte a tu negocio. Todos los modulos se desbloquean al activar el plan correspondiente.</p>
                            </div>
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
                                          <span className="badge bg-primary-subtle text-primary rounded-pill">Recomendado</span>
                                        </div>
                                      )}
                                      {isCurrent && (
                                        <div className="text-center pt-3">
                                          <span className="badge bg-success-subtle text-success rounded-pill">
                                            <i className="ri-check-line me-1"></i>Tu plan actual
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
                                          <span className="fs-24 fw-bold">{plan.price}</span>
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
                                              <i className="ri-check-double-line me-1"></i> Plan Activo
                                            </Button>
                                          ) : isDowngrade ? (
                                            <Button
                                              color="soft-secondary"
                                              className="w-100"
                                              onClick={() => {
                                                Swal.fire({
                                                  title: `Cambiar a ${plan.name}?`,
                                                  html: `<p>Vas a cambiar al plan <strong>${plan.name}</strong>. Perderas acceso a funcionalidades de tu plan actual.</p>`,
                                                  icon: "warning",
                                                  showCancelButton: true,
                                                  confirmButtonText: "Si, cambiar",
                                                  cancelButtonText: "Cancelar",
                                                  confirmButtonColor: "#f06548",
                                                }).then((result) => {
                                                  if (result.isConfirmed) changePlan(plan.key);
                                                });
                                              }}
                                            >
                                              Cambiar a {plan.name}
                                            </Button>
                                          ) : (
                                            <Button
                                              color={plan.highlighted ? "primary" : "soft-primary"}
                                              className="w-100"
                                              disabled={saving}
                                              onClick={() => {
                                                Swal.fire({
                                                  title: `Activar plan ${plan.name}`,
                                                  html: `<p>Deseas activar el plan <strong>${plan.name} (${plan.price}/mes)</strong>?</p><p class="text-muted small">Se desbloquearan todos los modulos incluidos en este plan.</p>`,
                                                  icon: "question",
                                                  showCancelButton: true,
                                                  confirmButtonText: `Activar ${plan.name}`,
                                                  cancelButtonText: "Cancelar",
                                                  confirmButtonColor: "#0ab39c",
                                                }).then((result) => {
                                                  if (result.isConfirmed) changePlan(plan.key);
                                                });
                                              }}
                                            >
                                              {saving ? <Spinner size="sm" /> : <><i className="ri-vip-crown-line me-1"></i> Activar {plan.name}</>}
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
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        toggle={() => setCategoryManagerOpen(false)}
        title="Gestionar Categorias de Servicios"
        categories={categories}
        onSave={handleUpdateServiceCategory}
        onDelete={handleDeleteServiceCategory}
      />
    </React.Fragment>
  );
};

export default Settings;
