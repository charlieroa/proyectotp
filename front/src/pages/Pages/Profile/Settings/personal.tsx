// Archivo: src/pages/Settings/personal.tsx

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { jwtDecode } from "jwt-decode";
import { useTranslation } from 'react-i18next';
import { api } from "../../../../services/api";
import { getToken } from "../../../../services/auth";

/* TIPOS */
type PaymentType = "salary" | "commission";

type Staff = {
  id: string;
  tenant_id?: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_id: number;
  is_active?: boolean;
  payment_type?: PaymentType;
  base_salary?: number | null;
  commission_rate?: number | null;
  employment_type?: 'employee' | 'renter' | null;
  rental_status?: 'active' | 'past_due' | 'blocked' | null;
};

const coworkingBadge = (u: Staff) => {
  if (u.employment_type !== 'renter') return null;
  const map: Record<string, { label: string; cls: string }> = {
    active:   { label: 'Coworking · Activo',         cls: 'bg-success-subtle text-success' },
    past_due: { label: 'Coworking · Pago pendiente', cls: 'bg-warning-subtle text-warning' },
    blocked:  { label: 'Coworking · Bloqueado',      cls: 'bg-danger-subtle text-danger' },
  };
  const m = map[u.rental_status || 'past_due'] || map.past_due;
  return (
    <span className={`badge ${m.cls} rounded-pill ms-2`} title="Estilista en modalidad coworking">
      <i className="ri-armchair-line me-1" />{m.label}
    </span>
  );
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

type AssignedSvc = { id: string; name: string };
type DayKey = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";
type DayState = { active: boolean; open: string; close: string };
type WeekState = Record<DayKey, DayState>;
type RoleFilter = "all" | 2 | 3 | 6;

interface PersonalProps {
  services: Service[];
  categories: Category[];
  onStaffChange: () => void;
}

/* HELPERS */
const decodeTenantId = (): string | null => {
    try {
      const t = getToken();
      if (!t) return null;
      const decoded: any = jwtDecode(t);
      return decoded?.user?.tenant_id || decoded?.tenant_id || null;
    } catch { return null; }
};

const formatCOP = (raw: string): string => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    const n = Number(digits);
    try {
        return `$${new Intl.NumberFormat("es-CO").format(n)}`;
    } catch {
        return `$${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    }
};

const parseCOPToNumber = (masked: string): number => {
    const digits = (masked || "").replace(/\D/g, "");
    return digits ? Number(digits) : 0;
};

const parsePercentToDecimal = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const cleaned = value.replace(/%/g, "").trim();
    const n = parseFloat(cleaned);
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(100, n)) / 100;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toTime = (raw: string): string => {
    const s = (raw || "").trim();
    if (!s) return "09:00";
    const [hStr, mStr] = s.split(":");
    const h = Math.max(0, Math.min(23, Number(hStr || "0")));
    const m = Math.max(0, Math.min(59, Number(mStr ?? "0")));
    return `${pad2(h)}:${pad2(m)}`;
};

const DEFAULT_DAY: DayState = { active: false, open: "09:00", close: "17:00" };

const defaultWeek = (): WeekState => ({
    lunes: { ...DEFAULT_DAY }, martes: { ...DEFAULT_DAY }, miercoles: { ...DEFAULT_DAY },
    jueves: { ...DEFAULT_DAY }, viernes: { ...DEFAULT_DAY }, sabado: { ...DEFAULT_DAY }, domingo: { ...DEFAULT_DAY },
});

const DAYS_UI: { key: DayKey; labelKey: string }[] = [
    { key: "lunes", labelKey: "staff_monday" }, { key: "martes", labelKey: "staff_tuesday" }, { key: "miercoles", labelKey: "staff_wednesday" },
    { key: "jueves", labelKey: "staff_thursday" }, { key: "viernes", labelKey: "staff_friday" }, { key: "sabado", labelKey: "staff_saturday" }, { key: "domingo", labelKey: "staff_sunday" },
];

const validateWeek = (week: WeekState, t: (key: string, opts?: any) => string): string | null => {
    for (const { key, labelKey } of DAYS_UI) {
        const d = week[key];
        if (d.active) {
            const [sh, sm] = toTime(d.open).split(":").map(Number);
            const [eh, em] = toTime(d.close).split(":").map(Number);
            if (eh * 60 + em <= sh * 60 + sm) {
                return t("staff_invalid_schedule_day", { day: t(labelKey) });
            }
        }
    }
    return null;
};

/* ServiceMultiSelect */
const ServiceMultiSelect: React.FC<{
    services: Service[];
    categories: Category[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    catFilter: string | "all";
    onCatFilter: (id: string | "all") => void;
}> = ({ services, categories, selectedIds, onToggle, catFilter, onCatFilter }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const searchRef = useRef<HTMLInputElement | null>(null);

    const filtered = useMemo(() => {
      const base = catFilter === "all" ? services : services.filter(s => s.category_id === catFilter);
      const q = query.trim().toLowerCase();
      if (!q) return base;
      return base.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (categories.find(c => c.id === s.category_id)?.name.toLowerCase() || "").includes(q)
      );
    }, [services, categories, catFilter, query]);

    const selectedCount = selectedIds.length;

    useEffect(() => {
      if (open) {
        setTimeout(() => searchRef.current?.focus(), 0);
      } else {
        setQuery("");
      }
    }, [open]);

    return (
      <div>
        <div className="d-flex align-items-center flex-wrap gap-1 mb-2">
          <button
            type="button"
            className={`btn btn-sm rounded-pill ${catFilter === "all" ? 'btn-primary' : 'btn-light'}`}
            onClick={() => onCatFilter("all")}
          >
            {t("staff_all_categories")}
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              className={`btn btn-sm rounded-pill ${catFilter === c.id ? 'btn-primary' : 'btn-light'}`}
              onClick={() => onCatFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="position-relative">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="form-select text-start"
          >
            {selectedCount === 0 ? t("staff_select_services") : t("staff_services_selected", { count: selectedCount })}
          </button>
          {open && (
            <div className="position-absolute w-100 mt-1 border rounded bg-white shadow" style={{ zIndex: 10, maxHeight: 360, overflowY: 'auto' }}>
              <div className="p-2">
                <input
                  ref={searchRef}
                  placeholder={t("staff_search_services")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="form-control form-control-sm mb-2"
                />
                {filtered.length === 0 && <div className="text-muted small px-2 py-1">{t("no_results")}</div>}
                {filtered.map(s => {
                  const checked = selectedIds.includes(s.id);
                  const catName = categories.find(c => c.id === s.category_id)?.name || "—";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="d-flex align-items-center justify-content-between w-100 border-0 bg-transparent px-2 py-1 rounded text-start"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onToggle(s.id)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="me-2">
                        <div className="fw-medium">{s.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.duration_minutes} min · ${s.price.toLocaleString()} · {catName}</div>
                      </div>
                      {checked && <i className="ri-check-line text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2">
          {selectedIds.length === 0 && <span className="text-muted small">{t("staff_no_services_selected")}</span>}
          {selectedIds.map(id => {
            const s = services.find(x => x.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="badge bg-primary-subtle text-primary rounded-pill me-1 mb-1"
                style={{ cursor: 'pointer' }}
                title={t("staff_remove")}
                onClick={() => onToggle(id)}
              >
                {s.name} <i className="ri-close-line ms-1" />
              </span>
            );
          })}
        </div>
      </div>
    );
};

/* StaffModal */
const StaffModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    tenantId: string;
    services: Service[];
    categories: Category[];
    edit?: Staff | null;
}> = ({ isOpen, onClose, onSaved, tenantId, services, categories, edit }) => {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<"services" | "hours" | "branches">("services");
    const [roleId, setRoleId] = useState<number>(3);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [commissionValue, setCommissionValue] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPass, setShowPass] = useState<boolean>(false);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [catFilter, setCatFilter] = useState<string | "all">("all");
    const [inheritTenant, setInheritTenant] = useState<boolean>(true);
    const [week, setWeek] = useState<WeekState>(defaultWeek());
    const [branches, setBranches] = useState<{id: string; name: string; branch_color?: string}[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
    const [sharedStylistsEnabled, setSharedStylistsEnabled] = useState<boolean>(false);

    const toggleService = (id: string) => {
      setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleBranch = (id: string) => {
      setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleDay = (day: DayKey) => setWeek(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
    const changeHour = (day: DayKey, field: "open" | "close", value: string) => setWeek(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const applyMondayToAll = () => {
      const monday = week.lunes;
      setWeek(prev => {
        const next: WeekState = { ...prev };
        (Object.keys(next) as DayKey[]).forEach(k => {
          if (k === "lunes") return;
          next[k] = { ...next[k], active: monday.active, open: monday.open, close: monday.close };
        });
        return next;
      });
    };

    useEffect(() => {
      const isEditing = !!edit;
      const currentRoleId = isEditing ? edit.role_id : 3;
      setRoleId(currentRoleId);
      setFirstName(isEditing ? edit.first_name : "");
      setLastName(isEditing ? edit.last_name || "" : "");
      setEmail(isEditing ? edit.email || "" : "");
      setPhone(isEditing ? edit.phone || "" : "");
      setCommissionValue(isEditing && edit.commission_rate != null ? String(edit.commission_rate * 100) : "");
      setPassword("");
      setShowPass(false);
      setSelectedServiceIds([]);
      setCatFilter("all");
      setTab("services");
      setInheritTenant(true);
      setWeek(defaultWeek());

      let alive = true;
      // Load branches for multi-sede
      const fetchBranches = async () => {
          try {
              const { data: businesses } = await api.get('/tenants/my-businesses');
              if (!alive) return;
              if (Array.isArray(businesses) && businesses.length > 1) {
                  setBranches(businesses.map((b: any) => ({ id: b.id, name: b.name, branch_color: b.branch_color })));
                  // Check if shared_stylists_enabled
                  const { data: tenantInfo } = await api.get(`/tenants/${tenantId}`);
                  if (alive) setSharedStylistsEnabled(!!tenantInfo?.shared_stylists_enabled);
              } else {
                  setBranches([]);
                  setSharedStylistsEnabled(false);
              }
          } catch { setBranches([]); }
      };
      fetchBranches();

      if (isEditing && edit.role_id === 3) {
          const fetchAssigned = async () => {
              try {
                  const { data } = await api.get(`/stylists/${edit.id}/services`);
                  const ids = Array.isArray(data) ? data.map((s: AssignedSvc) => s.id).filter(Boolean) : [];
                  if (alive) setSelectedServiceIds(ids);
              } catch { }
          };
          const fetchWorkingHours = async () => {
              const keyMap: Record<DayKey, string> = { lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday" };
              try {
                  const { data } = await api.get(`/users/${edit.id}/working-hours`);
                  if (!alive) return;
                  if (data == null) {
                      setInheritTenant(true);
                      setWeek(defaultWeek());
                  } else {
                      const w: WeekState = defaultWeek();
                      (Object.keys(w) as DayKey[]).forEach(k => {
                          const keyEnIngles = keyMap[k];
                          const dayData = data[keyEnIngles];
                          if (dayData) {
                              w[k] = { active: !!dayData.active, open: dayData.open ? toTime(dayData.open) : "09:00", close: dayData.close ? toTime(dayData.close) : "17:00" };
                          }
                      });
                      setInheritTenant(false);
                      setWeek(w);
                  }
              } catch { }
          };
          const fetchBranchAssignments = async () => {
              try {
                  const { data } = await api.get(`/stylists/${edit.id}/branches`);
                  if (alive && Array.isArray(data)) {
                      setSelectedBranchIds(data.map((b: any) => b.id));
                  }
              } catch { }
          };
          fetchAssigned();
          fetchWorkingHours();
          fetchBranchAssignments();
      }
      return () => { alive = false; };
    }, [isOpen, edit]);

    const buildWorkingHoursPayload = (): any | null => {
      if (inheritTenant) return null;
      const err = validateWeek(week, t);
      if (err) throw new Error(err);
      const keyMapToEnglish: Record<DayKey, string> = { lunes: "monday", martes: "tuesday", miercoles: "wednesday", jueves: "thursday", viernes: "friday", sabado: "saturday", domingo: "sunday" };
      const out: any = {};
      (Object.keys(week) as DayKey[]).forEach(k => {
        const d = week[k];
        const keyEnIngles = keyMapToEnglish[k];
        out[keyEnIngles] = d.active ? { active: true, open: toTime(d.open), close: toTime(d.close) } : { active: false, open: null, close: null };
      });
      return out;
    };

    const saveAssignments = async (stylistId: string) => {
      await api.post(`/stylists/${stylistId}/services`, { service_ids: selectedServiceIds });
      if (sharedStylistsEnabled && branches.length > 1) {
        await api.post(`/stylists/${stylistId}/branches`, { branch_ids: selectedBranchIds });
      }
    };

    const save = async () => {
        if (!firstName.trim()) {
            Swal.fire({ icon: 'warning', title: t("required_field"), text: t("staff_name_required") });
            return;
        }

        if (roleId === 3 && !commissionValue.trim()) {
            Swal.fire({ icon: 'warning', title: t("required_field"), text: t("staff_commission_required") });
            return;
        }

        const isStylist = roleId === 3;
        let working_hours: any | null = null;
        if (isStylist) {
            try {
                working_hours = buildWorkingHoursPayload();
            } catch (e: any) {
                Swal.fire({ icon: 'error', title: t("staff_invalid_schedule"), text: e?.message || t("staff_check_schedules") });
                return;
            }
        }

        setSaving(true);
        try {
            const baseBody = {
                first_name: firstName.trim(),
                last_name: lastName.trim() || null,
                email: email.trim().toLowerCase() || null,
                phone: phone.trim() || null,
                role_id: roleId,
                payment_type: "commission" as PaymentType,
                base_salary: 0,
                commission_rate: isStylist ? parsePercentToDecimal(commissionValue) : null,
                working_hours: isStylist ? working_hours : undefined,
            };

            if (edit) {
                // Si hay contraseña en edición, agregarla al body
                const updateBody = password.trim() ? { ...baseBody, password: password.trim() } : baseBody;
                await api.put(`/users/${edit.id}`, updateBody);
                if (isStylist) await saveAssignments(edit.id);
            } else {
                if (!password.trim()) {
                    Swal.fire({ icon: 'warning', title: t("required_field"), text: t("staff_password_required") });
                    setSaving(false);
                    return;
                }
                const createBody = { ...baseBody, tenant_id: tenantId, password: password.trim() };
                const { data: created } = await api.post(`/users`, createBody);
                if (created?.id && isStylist) await saveAssignments(created.id);

                // Mostrar credenciales al admin
                await Swal.fire({
                    icon: 'success',
                    title: t("staff_created"),
                    html: `<div style="text-align:left">
                        <p><b>${t("email")}:</b> ${(email.trim() || '').toLowerCase()}</p>
                        <p><b>${t("password")}:</b> <code>${password.trim()}</code></p>
                        <hr/>
                        <small class="text-muted">${t("staff_share_credentials")}</small>
                    </div>`,
                    confirmButtonText: t("got_it"),
                });
            }

            if (edit) {
                Swal.fire({ icon: 'success', title: t("staff_updated"), showConfirmButton: false, timer: 1500 });
            }
            onSaved();
            onClose();
        } catch (e:any) {
            Swal.fire({ icon: 'error', title: t("staff_save_error"), text: e?.response?.data?.message || e?.response?.data?.error || e?.message || t("staff_could_not_save") });
        } finally {
            setSaving(false);
        }
    };

    const roleName = roleId === 2 ? t("staff_cashier") : roleId === 6 ? t("staff_receptionist") : t("staff_stylist");

    return (
        <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
            <ModalHeader toggle={onClose}>{edit ? `${t("edit")} ${roleName}` : t("staff_new_staff")}</ModalHeader>
            <ModalBody>
                <div className="row g-3">
                    {!edit && (
                        <div className="col-12">
                            <label className="form-label">{t("staff_type")}</label>
                            <select
                                className="form-select"
                                value={roleId}
                                onChange={(e) => setRoleId(Number(e.target.value))}
                            >
                                <option value={3}>{t("staff_stylist")}</option>
                                <option value={2}>{t("staff_cashier")}</option>
                                <option value={6}>{t("staff_receptionist")}</option>
                            </select>
                        </div>
                    )}

                    <div className="col-md-6">
                        <label className="form-label">{t("name")}</label>
                        <input
                            className="form-control"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder={t("staff_name_placeholder")}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">{t("last_name")}</label>
                        <input
                            className="form-control"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder={t("staff_last_name_placeholder")}
                        />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">{t("email")}</label>
                        <input
                            type="email"
                            className="form-control"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="marcos@example.com"
                        />
                    </div>
                    {/* Teléfono removido — no es necesario para personal */}

                    <div className="col-md-6">
                        <label className="form-label">
                            {t("password")}
                            {edit && <small className="d-block text-muted fw-normal">{t("staff_leave_empty")}</small>}
                        </label>
                        <div className="input-group">
                            <input
                                type={showPass ? "text" : "password"}
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={edit ? t("staff_leave_empty") : "••••••••"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                className="btn btn-light border"
                                title={showPass ? t("staff_hide") : t("staff_show")}
                            >
                                <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                            </button>
                        </div>
                    </div>

                    {roleId === 3 && (
                        <div className="col-md-6">
                            <label className="form-label">{t("staff_commission_pct")}</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                className="form-control"
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(e.target.value)}
                                placeholder={t("staff_commission_placeholder")}
                            />
                            <small className="text-muted">{t("staff_commission_hint")}</small>
                        </div>
                    )}

                    {roleId === 3 && (
                        <div className="col-12">
                            <ul className="nav nav-tabs nav-tabs-custom mb-3">
                                <li className="nav-item">
                                    <button type="button" onClick={() => setTab("services")}
                                        className={`nav-link ${tab === "services" ? 'active' : ''}`}>
                                        <i className="ri-scissors-2-line me-1" /> {t("services")}
                                    </button>
                                </li>
                                <li className="nav-item">
                                    <button type="button" onClick={() => setTab("hours")}
                                        className={`nav-link ${tab === "hours" ? 'active' : ''}`}>
                                        <i className="ri-time-line me-1" /> {t("staff_schedules")}
                                    </button>
                                </li>
                                {sharedStylistsEnabled && branches.length > 1 && (
                                    <li className="nav-item">
                                        <button type="button" onClick={() => setTab("branches")}
                                            className={`nav-link ${tab === "branches" ? 'active' : ''}`}>
                                            <i className="ri-building-2-line me-1" /> {t("staff_branches")}
                                        </button>
                                    </li>
                                )}
                            </ul>

                            {tab === "services" && (
                                <ServiceMultiSelect services={services} categories={categories} selectedIds={selectedServiceIds} onToggle={toggleService} catFilter={catFilter} onCatFilter={setCatFilter} />
                            )}

                            {tab === "hours" && (
                                <div className="border rounded p-3">
                                    <div className="form-check form-switch mb-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id="inheritTenantSwitch"
                                            checked={inheritTenant}
                                            onChange={() => setInheritTenant(v => !v)}
                                        />
                                        <label className="form-check-label small" htmlFor="inheritTenantSwitch">
                                            {t("staff_inherit_schedule")}
                                        </label>
                                    </div>
                                    {!inheritTenant && (
                                        <>
                                            {DAYS_UI.map(({ key, labelKey }) => {
                                                const d = week[key];
                                                const isMonday = key === "lunes";
                                                return (
                                                    <div className="border rounded p-2 mb-2" key={key}>
                                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="form-check form-switch mb-0">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        role="switch"
                                                                        checked={d.active}
                                                                        onChange={() => toggleDay(key)}
                                                                    />
                                                                </div>
                                                                <span className="fw-semibold small">
                                                                    {t(labelKey)} {d.active ? <span className="text-success">({t("staff_open")})</span> : <span className="text-muted">({t("staff_closed")})</span>}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <label className="small text-muted mb-0" htmlFor={`open-${key}`}>{t("staff_start")}</label>
                                                                <input
                                                                    id={`open-${key}`}
                                                                    type="time"
                                                                    value={d.open}
                                                                    disabled={!d.active}
                                                                    onChange={(e) => changeHour(key, "open", e.target.value)}
                                                                    className="form-control form-control-sm"
                                                                    style={{ width: 120 }}
                                                                />
                                                                <label className="small text-muted mb-0" htmlFor={`close-${key}`}>{t("staff_end")}</label>
                                                                <input
                                                                    id={`close-${key}`}
                                                                    type="time"
                                                                    value={d.close}
                                                                    disabled={!d.active}
                                                                    onChange={(e) => changeHour(key, "close", e.target.value)}
                                                                    className="form-control form-control-sm"
                                                                    style={{ width: 120 }}
                                                                />
                                                                {isMonday && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={applyMondayToAll}
                                                                        className="btn btn-soft-primary btn-sm ms-1"
                                                                    >
                                                                        {t("staff_apply_to_all")}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            )}

                            {tab === "branches" && sharedStylistsEnabled && branches.length > 1 && (
                                <div className="border rounded p-3">
                                    <p className="text-muted small mb-3">{t("staff_select_branches")}</p>
                                    {branches.map(branch => (
                                        <div key={branch.id} className="form-check d-flex align-items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedBranchIds.includes(branch.id)}
                                                onChange={() => toggleBranch(branch.id)}
                                                id={`branch-${branch.id}`}
                                            />
                                            <span
                                                className="d-inline-block rounded-circle"
                                                style={{ width: 12, height: 12, backgroundColor: branch.branch_color || '#3788d8' }}
                                            />
                                            <label className="form-check-label" htmlFor={`branch-${branch.id}`}>{branch.name}</label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <button type="button" className="btn btn-light" onClick={onClose}>
                    {t("cancel")}
                </button>
                <button type="button" className="btn btn-primary d-flex align-items-center gap-1" onClick={save} disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm" />}
                    {t("save")}
                </button>
            </ModalFooter>
        </Modal>
    );
};

/* Personal Component */
const Personal: React.FC<PersonalProps> = ({ services, categories, onStaffChange }) => {
    const { t } = useTranslation();
    const tenantId = useMemo(() => decodeTenantId() || "", []);
    const [error, setError] = useState<string | null>(null);
    const [staffLoading, setStaffLoading] = useState(false);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [assignedByStaff, setAssignedByStaff] = useState<Record<string, AssignedSvc[]>>({});
    const [stModalOpen, setStModalOpen] = useState(false);
    const [stEdit, setStEdit] = useState<Staff | null>(null);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const PAGE_SIZE = 6;
    const [page, setPage] = useState<number>(1);

    const filteredStaff = useMemo(() => {
      if (roleFilter === "all") return staff;
      return staff.filter(u => u.role_id === roleFilter);
    }, [staff, roleFilter]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE)), [filteredStaff.length]);
    const paginatedStaff = useMemo(() => filteredStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredStaff, page]);

    useEffect(() => {
      if (page > totalPages) setPage(totalPages);
      if (filteredStaff.length === 0) setPage(1);
    }, [filteredStaff.length, totalPages, page]);

    const loadAssignedForStaff = async (list: Staff[]) => {
      const stylists = list.filter(u => u.role_id === 3);
      if (stylists.length === 0) {
          setAssignedByStaff({});
          return;
      }
      const entries = await Promise.all(
          stylists.map(async (u) => {
          try {
            const { data } = await api.get(`/stylists/${u.id}/services`);
            return [u.id, Array.isArray(data) ? data : []] as [string, AssignedSvc[]];
          } catch {
            return [u.id, []] as [string, AssignedSvc[]];
          }
        })
      );
      setAssignedByStaff(Object.fromEntries(entries));
    };

    const loadStaff = async () => {
      setStaffLoading(true);
      try {
        const { data } = await api.get(`/users/tenant/${tenantId}`, { params: { role_ids: '2,3,6' } });
        const allStaff = Array.isArray(data) ? data : [];
        const filteredStaffData = allStaff.filter(user => [2, 3, 6].includes(user.role_id));
        setStaff(filteredStaffData);
        await loadAssignedForStaff(filteredStaffData);
        setPage(1);
      } catch (e:any) {
        setError(e?.response?.data?.message || e?.message || t("staff_could_not_load"));
      } finally {
        setStaffLoading(false);
      }
    };

    useEffect(() => {
      if (!tenantId) return;
      loadStaff();
    }, [tenantId]);

    const refreshStaff = async () => {
        await loadStaff();
        onStaffChange();
    };

    const openNewStaff = () => { setStEdit(null); setStModalOpen(true); };
    const openEditStaff = (u: Staff) => { setStEdit(u); setStModalOpen(true); };

    const deleteStaff = async (u: Staff) => {
        const fullName = `${u.first_name}${u.last_name ? ` ${u.last_name}` : ""}`;
        const result = await Swal.fire({
            title: t("staff_confirm_delete_title"),
            text: t("staff_confirm_delete_text", { name: fullName }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: t("staff_yes_delete"),
            cancelButtonText: t("cancel")
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/users/${u.id}`);
                await refreshStaff();
                Swal.fire(t("staff_deleted"), t("staff_deleted_text", { name: u.first_name }), 'success');
            } catch (e:any) {
                Swal.fire({ icon: 'error', title: t("error"), text: e?.response?.data?.message || e?.message || t("staff_could_not_delete") });
            }
        }
    };

    const renderPageNumbers = () => {
        const windowSize = 5;
        let start = Math.max(1, page - Math.floor(windowSize / 2));
        let end = start + windowSize - 1;
        if (end > totalPages) {
          end = totalPages;
          start = Math.max(1, end - windowSize + 1);
        }
        const items = [];
        for (let p = start; p <= end; p++) {
          items.push(
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setPage(p)}>{p}</button>
            </li>
          );
        }
        return items;
    };

    const handleRoleFilterToggle = () => {
      if (roleFilter === "all") {
        setRoleFilter(3);
      } else if (roleFilter === 3) {
        setRoleFilter(2);
      } else if (roleFilter === 2) {
        setRoleFilter(6);
      } else {
        setRoleFilter("all");
      }
      setPage(1);
    };

    const stylistsCount = staff.filter(u => u.role_id === 3).length;
    const cashiersCount = staff.filter(u => u.role_id === 2).length;
    const receptionistsCount = staff.filter(u => u.role_id === 6).length;

    return (
      <div>
        {error && (
          <div className="alert alert-danger mb-3">
            <span>{error}</span>
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-semibold mb-0 d-flex align-items-center gap-2">
              <i className="ri-team-line text-primary"></i>{t("staff_title")}
            </h5>
            <div className="d-flex align-items-center gap-2">
              {staffLoading && <span className="spinner-border spinner-border-sm text-primary"></span>}
              <button type="button" className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={openNewStaff}>
                <i className="ri-add-line" /> {t("staff_new_staff")}
              </button>
            </div>
        </div>

        {/* Role filter chips */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" onClick={() => { setRoleFilter("all"); setPage(1); }}
            className={`btn btn-sm rounded-pill ${roleFilter === "all" ? 'btn-primary' : 'btn-light'}`}>
            {t("all")} ({staff.length})
          </button>
          <button type="button" onClick={() => { setRoleFilter(3); setPage(1); }}
            className={`btn btn-sm rounded-pill ${roleFilter === 3 ? 'btn-success' : 'btn-light'}`}>
            <i className="ri-scissors-line me-1"></i>{t("staff_stylists")} ({stylistsCount})
          </button>
          <button type="button" onClick={() => { setRoleFilter(2); setPage(1); }}
            className={`btn btn-sm rounded-pill ${roleFilter === 2 ? 'btn-info' : 'btn-light'}`}>
            <i className="ri-cash-line me-1"></i>{t("staff_cashiers")} ({cashiersCount})
          </button>
          <button type="button" onClick={() => { setRoleFilter(6); setPage(1); }}
            className={`btn btn-sm rounded-pill ${roleFilter === 6 ? 'btn-warning' : 'btn-light'}`}>
            <i className="ri-customer-service-2-line me-1"></i>{t("staff_receptionists")} ({receptionistsCount})
          </button>
        </div>

        <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("staff_role")}</th>
                  <th>{t("staff_commission")}</th>
                  <th>{t("staff_contact")}</th>
                  <th>{t("services")}</th>
                  <th style={{width: 100}}>{t("actions")}</th>
                </tr>
            </thead>
            <tbody>
                {paginatedStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <i className="ri-team-line fs-36 text-muted d-block mb-2"></i>
                      <h6 className="fw-medium mb-1">
                        {roleFilter === "all" ? t("staff_no_staff") : roleFilter === 3 ? t("staff_no_stylists") : roleFilter === 6 ? t("staff_no_receptionists") : t("staff_no_cashiers")}
                      </h6>
                      <p className="text-muted fs-13 mb-3">
                        {roleFilter === "all" ? t("staff_add_team_hint") : t("staff_try_other_filter")}
                      </p>
                      <button type="button" className="btn btn-primary btn-sm" onClick={openNewStaff}>
                        <i className="ri-add-line me-1"></i> {t("staff_add_staff")}
                      </button>
                    </td>
                  </tr>
                )}
                {paginatedStaff.map(u => {
                  const svcs = assignedByStaff[u.id] || [];
                  const show = svcs.slice(0, 3);
                  const more = Math.max(0, svcs.length - show.length);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className={`avatar-xs rounded-circle d-flex align-items-center justify-content-center ${
                            u.role_id === 3 ? 'bg-success-subtle' : u.role_id === 6 ? 'bg-warning-subtle' : 'bg-info-subtle'
                          }`}>
                            <span className={`fw-medium ${u.role_id === 3 ? 'text-success' : u.role_id === 6 ? 'text-warning' : 'text-info'}`}>
                              {u.first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="fw-medium">{u.first_name} {u.last_name || ""}</span>
                          {coworkingBadge(u)}
                        </div>
                      </td>
                      <td>
                        {u.role_id === 2
                          ? <span className="badge bg-info-subtle text-info rounded-pill">{t("staff_cashier")}</span>
                          : u.role_id === 6
                          ? <span className="badge bg-warning-subtle text-warning rounded-pill">{t("staff_receptionist")}</span>
                          : <span className="badge bg-success-subtle text-success rounded-pill">{t("staff_stylist")}</span>
                        }
                      </td>
                      <td>
                        {u.role_id === 3 && u.commission_rate ? (
                          <span className="fw-semibold">{(u.commission_rate * 100).toFixed(0)}%</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div>
                          {u.email && <div className="fs-12 text-muted"><i className="ri-mail-line me-1"></i>{u.email}</div>}
                          {u.phone && <div className="fs-12 text-muted"><i className="ri-phone-line me-1"></i>{u.phone}</div>}
                          {!u.email && !u.phone && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      <td>
                        {u.role_id === 3 ? (
                          <>
                            {show.length === 0 && <span className="text-muted fs-12">{t("staff_unassigned")}</span>}
                            {show.map(s => (
                              <span key={s.id} className="badge bg-primary-subtle text-primary rounded-pill me-1 mb-1">{s.name}</span>
                            ))}
                            {more > 0 && <span className="badge bg-light text-muted rounded-pill mb-1">+{more}</span>}
                          </>
                        ) : (
                          <span className="text-muted fs-12">N/A</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button type="button" className="btn btn-soft-primary btn-sm" onClick={() => openEditStaff(u)} title={t("edit")}>
                            <i className="ri-edit-line" />
                          </button>
                          <button type="button" className="btn btn-soft-danger btn-sm" onClick={() => deleteStaff(u)} title={t("delete")}>
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            </table>
        </div>

        {filteredStaff.length > PAGE_SIZE && (
          <nav className="d-flex justify-content-end mt-3">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(1)}><i className="ri-arrow-left-double-line" /></button>
              </li>
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}><i className="ri-arrow-left-s-line" /></button>
              </li>
              {renderPageNumbers()}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}><i className="ri-arrow-right-s-line" /></button>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(totalPages)}><i className="ri-arrow-right-double-line" /></button>
              </li>
            </ul>
          </nav>
        )}

        <StaffModal
            isOpen={stModalOpen}
            onClose={() => setStModalOpen(false)}
            onSaved={refreshStaff}
            tenantId={tenantId}
            services={services}
            categories={categories}
            edit={stEdit}
        />
      </div>
    );
};

export default Personal;