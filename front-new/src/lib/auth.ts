import { jwtDecode } from 'jwt-decode';

export const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEY = 'authToken';
const AUTH_USER_KEY = 'authUser';

// =============================
// Token helpers
// =============================
export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

export const isAuthenticated = (): boolean => !!getToken();

export type DecodedToken = {
  exp?: number;
  iat?: number;
  user?: {
    id?: string;
    tenant_id?: string;
    email?: string;
    name?: string;
    role_id?: number;
    [k: string]: unknown;
  };
  tenant_id?: string;
  [k: string]: unknown;
};

export const getDecodedToken = (): DecodedToken | null => {
  const token = getToken();
  if (!token) return null;
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
};

export const getTenantIdFromToken = (): string | null => {
  const dec = getDecodedToken();
  return dec?.user?.tenant_id || dec?.tenant_id || null;
};

export const getRoleFromToken = (): number | null => {
  const dec = getDecodedToken();
  return dec?.user?.role_id ?? null;
};

export const isTokenExpired = (): boolean => {
  const dec = getDecodedToken();
  if (!dec?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return dec.exp < now;
};

// =============================
// AuthUser helpers
// =============================
export const setAuthUser = (user: unknown) => {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const getAuthUser = <T = unknown>(): T | null => {
  const raw = sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const clearAuthUser = () => {
  sessionStorage.removeItem(AUTH_USER_KEY);
};

export const logout = () => {
  clearToken();
  clearAuthUser();
};
