// Capa de datos compartida de /v2. Provee tenant activo, nombre del salón,
// sucursales y datos del usuario logueado, reutilizando el servicio api y los
// helpers de auth existentes. Cada pantalla además hace sus propios fetches.
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../services/api";
import { getTenantIdFromToken, getRoleFromToken, getAuthUser } from "../../../services/auth";

export const ROLE_LABEL: Record<number, string> = {
  1: "Administrador",
  2: "Cajero",
  3: "Estilista",
  4: "Cliente",
  5: "Super Admin",
  6: "Recepcionista",
};

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface CurrentUser {
  name: string;
  roleLabel: string;
  initials: string;
}

export function useCurrentUser(): CurrentUser {
  const user = getAuthUser<any>() || {};
  const role = getRoleFromToken() || 0;
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.name ||
    user.email ||
    "Usuario";
  const ini = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase();
  return { name, roleLabel: ROLE_LABEL[role] || "Usuario", initials: ini || "U" };
}

export interface TenantInfo {
  id: string | null;
  name: string;
  city: string;
  loading: boolean;
}

export function useTenant(): TenantInfo {
  const tenantId = getTenantIdFromToken();
  const [info, setInfo] = useState<TenantInfo>({ id: tenantId, name: "", city: "", loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!tenantId) {
      setInfo({ id: null, name: "", city: "", loading: false });
      return;
    }
    api
      .get(`/tenants/${tenantId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setInfo({
          id: tenantId,
          name: data?.name || "Mi salón",
          city: data?.city || data?.address || "",
          loading: false,
        });
      })
      .catch(() => !cancelled && setInfo({ id: tenantId, name: "Mi salón", city: "", loading: false }));
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return info;
}

// Sucursales del hub (branches-day) — reutiliza el endpoint del dashboard v2.
export interface V2Branch {
  id: string;
  name: string;
  color: string;
  stylists: { total: number; in_salon: number };
  appointments: any;
  pending_payment: { count: number; amount: number };
  open_tickets: { count: number; amount: number };
  revenue_today: number;
  low_stock: { count: number; products: any[] };
}

export function useBranchesDay(date: string) {
  const [branches, setBranches] = useState<V2Branch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/dashboard-v2/branches-day", { params: { date } })
      .then(({ data }) => {
        if (cancelled) return;
        const bs: V2Branch[] = data?.branches || [];
        setBranches(bs);
        setActiveId((prev) => (prev && bs.find((b) => b.id === prev) ? prev : bs[0]?.id || null));
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || "Error");
        setBranches([]);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, tick]);

  return { branches, activeId, setActiveId, loading, error, refresh };
}
