// Archivo: src/pages/Settings/personal.tsx

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "reactstrap";
import { jwtDecode } from "jwt-decode";
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
type RoleFilter = "all" | 2 | 3;

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

const DAYS_UI: { key: DayKey; label: string }[] = [
    { key: "lunes", label: "Lunes" }, { key: "martes", label: "Martes" }, { key: "miercoles", label: "Miércoles" },
    { key: "jueves", label: "Jueves" }, { key: "viernes", label: "Viernes" }, { key: "sabado", label: "Sábado" }, { key: "domingo", label: "Domingo" },
];

const validateWeek = (week: WeekState): string | null => {
    for (const { key, label } of DAYS_UI) {
        const d = week[key];
        if (d.active) {
            const [sh, sm] = toTime(d.open).split(":").map(Number);
            const [eh, em] = toTime(d.close).split(":").map(Number);
            if (eh * 60 + em <= sh * 60 + sm) {
                return `El horario de ${label} es inválido: fin debe ser mayor que inicio.`;
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
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <button
            type="button"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
              catFilter === "all"
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => onCatFilter("all")}
          >
            Todas las categorías
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              type="button"
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                catFilter === c.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => onCatFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <span>
              {selectedCount === 0 ? "Selecciona servicios…" : selectedCount === 1 ? "1 servicio seleccionado" : `${selectedCount} servicios seleccionados`}
            </span>
            <i className={`ri-arrow-down-s-line transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-[360px] overflow-y-auto p-2">
              <input
                ref={searchRef}
                placeholder="Buscar servicios…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm mb-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div>
                {filtered.length === 0 && <div className="text-gray-400 px-2 py-1 text-sm">Sin resultados</div>}
                {filtered.map(s => {
                  const checked = selectedIds.includes(s.id);
                  const catName = categories.find(c => c.id === s.category_id)?.name || "—";
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-gray-50 text-left"
                      onClick={() => onToggle(s.id)}
                    >
                      <div className="mr-2">
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.duration_minutes} min · ${s.price.toLocaleString()} · {catName}</div>
                      </div>
                      <i className={`ri-check-line text-indigo-600 ${checked ? '' : 'invisible'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2">
          {selectedIds.length === 0 && <span className="text-sm text-gray-400">No hay servicios seleccionados.</span>}
          {selectedIds.map(id => {
            const s = services.find(x => x.id === id);
            if (!s) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 mr-1 mb-1 cursor-pointer hover:bg-gray-200 transition-colors"
                title="Quitar"
                onClick={() => onToggle(id)}
              >
                {s.name} <i className="ri-close-line ml-1" />
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
      const err = validateWeek(week);
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
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El nombre es obligatorio.' });
            return;
        }

        if (roleId === 3 && !commissionValue.trim()) {
            Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'El porcentaje de comisión es requerido.' });
            return;
        }

        const isStylist = roleId === 3;
        let working_hours: any | null = null;
        if (isStylist) {
            try {
                working_hours = buildWorkingHoursPayload();
            } catch (e: any) {
                Swal.fire({ icon: 'error', title: 'Horario Inválido', text: e?.message || "Por favor revisa los horarios." });
                return;
            }
        }

        setSaving(true);
        try {
            const baseBody = {
                first_name: firstName.trim(),
                last_name: lastName.trim() || null,
                email: email.trim() || null,
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
                    Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'La contraseña es obligatoria para crear personal.' });
                    setSaving(false);
                    return;
                }
                const createBody = { ...baseBody, tenant_id: tenantId, password: password.trim() };
                const { data: created } = await api.post(`/users`, createBody);
                if (created?.id && isStylist) await saveAssignments(created.id);
            }

            Swal.fire({ icon: 'success', title: edit ? '¡Personal actualizado!' : '¡Personal creado!', showConfirmButton: false, timer: 1500 });
            onSaved();
            onClose();
        } catch (e:any) {
            Swal.fire({ icon: 'error', title: 'Error al guardar', text: e?.response?.data?.message || e?.response?.data?.error || e?.message || 'No se pudo guardar el personal' });
        } finally {
            setSaving(false);
        }
    };

    const roleName = roleId === 2 ? "Cajero" : "Estilista";

    return (
        <Modal isOpen={isOpen} toggle={onClose} size="lg" centered>
            <ModalHeader toggle={onClose}>{edit ? `Editar ${roleName}` : `Nuevo Personal`}</ModalHeader>
            <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!edit && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Personal</label>
                            <select
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={roleId}
                                onChange={(e) => setRoleId(Number(e.target.value))}
                            >
                                <option value={3}>Estilista</option>
                                <option value={2}>Cajero</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ej: Marcos"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                        <input
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Ej: Barbero"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="marcos@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="3001234567"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                            {edit && <small className="block text-gray-400 font-normal">(dejar vacío para no cambiar)</small>}
                        </label>
                        <div className="flex rounded-lg shadow-sm">
                            <input
                                type={showPass ? "text" : "password"}
                                className="block w-full rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={edit ? "Dejar vacío para no cambiar" : "••••••••"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 hover:bg-gray-100 transition-colors"
                                title={showPass ? "Ocultar" : "Mostrar"}
                            >
                                <i className={showPass ? "ri-eye-off-line" : "ri-eye-line"} />
                            </button>
                        </div>
                    </div>

                    {roleId === 3 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(e.target.value)}
                                placeholder="Ej: 55"
                            />
                            <small className="text-xs text-gray-400 mt-1">Porcentaje que recibe por servicio</small>
                        </div>
                    )}

                    {roleId === 3 && (
                        <div className="md:col-span-2">
                            <div className="border-b border-gray-200 mb-4">
                                <nav className="-mb-px flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setTab("services")}
                                        className={`whitespace-nowrap border-b-2 pb-3 px-1 text-sm font-medium transition-colors ${
                                            tab === "services"
                                                ? 'border-indigo-500 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                    >
                                        <i className="ri-scissors-2-line mr-1" /> Servicios que realiza
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTab("hours")}
                                        className={`whitespace-nowrap border-b-2 pb-3 px-1 text-sm font-medium transition-colors ${
                                            tab === "hours"
                                                ? 'border-indigo-500 text-indigo-600'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                    >
                                        <i className="ri-time-line mr-1" /> Horarios
                                    </button>
                                    {sharedStylistsEnabled && branches.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setTab("branches")}
                                            className={`whitespace-nowrap border-b-2 pb-3 px-1 text-sm font-medium transition-colors ${
                                                tab === "branches"
                                                    ? 'border-indigo-500 text-indigo-600'
                                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                            }`}
                                        >
                                            <i className="ri-building-2-line mr-1" /> Sedes
                                        </button>
                                    )}
                                </nav>
                            </div>

                            {tab === "services" && (
                                <ServiceMultiSelect services={services} categories={categories} selectedIds={selectedServiceIds} onToggle={toggleService} catFilter={catFilter} onCatFilter={setCatFilter} />
                            )}

                            {tab === "hours" && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={inheritTenant}
                                            onClick={() => setInheritTenant(v => !v)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${inheritTenant ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${inheritTenant ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                        <label className="text-sm text-gray-700">
                                            Usar el mismo horario del negocio. Si desmarcas, puedes elegir su propio horario.
                                        </label>
                                    </div>
                                    {!inheritTenant && (
                                        <>
                                            {DAYS_UI.map(({ key, label }) => {
                                                const d = week[key];
                                                const isMonday = key === "lunes";
                                                return (
                                                    <div className="border border-gray-200 rounded-lg p-3 mb-3" key={key}>
                                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    role="switch"
                                                                    aria-checked={d.active}
                                                                    onClick={() => toggleDay(key)}
                                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${d.active ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                                >
                                                                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${d.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                                                </button>
                                                                <span className="text-sm font-semibold text-gray-900">
                                                                    {label} {d.active ? "(Abierto)" : "(Cerrado)"}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-sm text-gray-700" htmlFor={`open-${key}`}>Inicio</label>
                                                                    <input
                                                                        id={`open-${key}`}
                                                                        type="time"
                                                                        value={d.open}
                                                                        disabled={!d.active}
                                                                        onChange={(e) => changeHour(key, "open", e.target.value)}
                                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-sm text-gray-700" htmlFor={`close-${key}`}>Fin</label>
                                                                    <input
                                                                        id={`close-${key}`}
                                                                        type="time"
                                                                        value={d.close}
                                                                        disabled={!d.active}
                                                                        onChange={(e) => changeHour(key, "close", e.target.value)}
                                                                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                                                                    />
                                                                </div>
                                                                {isMonday && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={applyMondayToAll}
                                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors ml-2"
                                                                    >
                                                                        Aplicar a todos
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
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-500 mb-3">Selecciona las sedes donde este estilista puede trabajar:</p>
                                    <div className="space-y-2">
                                        {branches.map(branch => (
                                            <label key={branch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBranchIds.includes(branch.id)}
                                                    onChange={() => toggleBranch(branch.id)}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                />
                                                <span
                                                    className="inline-block w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: branch.branch_color || '#3788d8' }}
                                                />
                                                <span className="text-sm text-gray-900">{branch.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={save}
                    disabled={saving}
                >
                    {saving && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    )}
                    Guardar
                </button>
            </ModalFooter>
        </Modal>
    );
};

/* Personal Component */
const Personal: React.FC<PersonalProps> = ({ services, categories, onStaffChange }) => {
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
        const { data } = await api.get(`/users/tenant/${tenantId}`, { params: { role_ids: '2,3' } });
        const allStaff = Array.isArray(data) ? data : [];
        const filteredStaffData = allStaff.filter(user => user.role_id === 2 || user.role_id === 3);
        setStaff(filteredStaffData);
        await loadAssignedForStaff(filteredStaffData);
        setPage(1);
      } catch (e:any) {
        setError(e?.response?.data?.message || e?.message || 'No se pudo cargar el personal');
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
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Vas a eliminar a ${u.first_name}${u.last_name ? ` ${u.last_name}` : ""}. ¡Esta acción no se puede deshacer!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/users/${u.id}`);
                await refreshStaff();
                Swal.fire('¡Eliminado!', `${u.first_name} ha sido eliminado del personal.`, 'success');
            } catch (e:any) {
                Swal.fire({ icon: 'error', title: 'Error', text: e?.response?.data?.message || e?.message || 'No se pudo eliminar el personal.' });
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
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          );
        }
        return items;
    };

    const handleRoleFilterToggle = () => {
      if (roleFilter === "all") {
        setRoleFilter(3);
      } else if (roleFilter === 3) {
        setRoleFilter(2);
      } else {
        setRoleFilter("all");
      }
      setPage(1);
    };

    const stylistsCount = staff.filter(u => u.role_id === 3).length;
    const cashiersCount = staff.filter(u => u.role_id === 2).length;

    return (
      <div>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-3">
            <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-team-line text-indigo-600"></i>Personal
            </h5>
            <div className="flex items-center gap-2">
              {staffLoading && (
                <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                onClick={openNewStaff}
              >
                <i className="ri-add-line" /> Nuevo Personal
              </button>
            </div>
        </div>

        {/* Role filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => { setRoleFilter("all"); setPage(1); }}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === "all"
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => { setRoleFilter(3); setPage(1); }}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 3
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i className="ri-scissors-line mr-1"></i>Estilistas ({stylistsCount})
          </button>
          <button
            type="button"
            onClick={() => { setRoleFilter(2); setPage(1); }}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === 2
                ? 'bg-sky-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <i className="ri-cash-line mr-1"></i>Cajeros ({cashiersCount})
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
            <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Comisión</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Servicios que realiza</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{width: 120}}>Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <i className="ri-team-line text-5xl text-gray-300 block mb-3"></i>
                      <h6 className="text-sm font-medium text-gray-900 mb-1">
                        {roleFilter === "all" ? "No hay personal registrado" : roleFilter === 3 ? "No hay estilistas registrados" : "No hay cajeros registrados"}
                      </h6>
                      <p className="text-sm text-gray-500 mb-4">
                        {roleFilter === "all" ? "Agrega a tu equipo para gestionar citas y servicios." : "Prueba con otro filtro o agrega nuevo personal."}
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
                        onClick={openNewStaff}
                      >
                        <i className="ri-add-line"></i> Agregar personal
                      </button>
                    </td>
                  </tr>
                )}
                {paginatedStaff.map(u => {
                  const svcs = assignedByStaff[u.id] || [];
                  const show = svcs.slice(0, 3);
                  const more = Math.max(0, svcs.length - show.length);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${
                            u.role_id === 3 ? 'bg-emerald-100' : 'bg-sky-100'
                          }`}>
                            <span className={`text-sm font-medium ${
                              u.role_id === 3 ? 'text-emerald-700' : 'text-sky-700'
                            }`}>
                              {u.first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-sm text-gray-900">{u.first_name} {u.last_name || ""}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.role_id === 2
                          ? <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">Cajero</span>
                          : <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Estilista</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.role_id === 3 && u.commission_rate ? (
                          <span className="font-semibold text-gray-900">{(u.commission_rate * 100).toFixed(0)}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          {u.email && <div className="text-xs text-gray-600"><i className="ri-mail-line mr-1 text-gray-400"></i>{u.email}</div>}
                          {u.phone && <div className="text-xs text-gray-600"><i className="ri-phone-line mr-1 text-gray-400"></i>{u.phone}</div>}
                          {!u.email && !u.phone && <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.role_id === 3 ? (
                          <>
                            {show.length === 0 && <span className="text-gray-400 text-xs">Sin asignar</span>}
                            {show.map(s => (
                              <span key={s.id} className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 mr-1 mb-1">{s.name}</span>
                            ))}
                            {more > 0 && <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 mb-1">+{more}</span>}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            onClick={() => openEditStaff(u)}
                            title="Editar"
                          >
                            <i className="ri-edit-line text-base" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => deleteStaff(u)}
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line text-base" />
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
          <nav className="flex items-center justify-end gap-1 mt-4">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(1)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-left-double-line text-sm" />
              </button>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-left-s-line text-sm" />
              </button>
              {renderPageNumbers()}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-right-s-line text-sm" />
              </button>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-right-double-line text-sm" />
              </button>
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