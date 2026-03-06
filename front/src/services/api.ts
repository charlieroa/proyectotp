// services/api.ts
import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "./auth";

// --- LÍNEA CORREGIDA ---
// Ahora, esta variable DEBE venir de tu archivo .env o .env.local.
// Si no la encuentra durante el build, el proceso fallará, avisándote del problema.
const API_BASE_URL = process.env.REACT_APP_API_URL;

/** Instancia única de Axios para toda la app */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    // No fijamos "Content-Type" aquí para no romper FormData; lo seteamos en el request si hace falta.
  },
});

/**
 * Determina si una URL NO necesita Authorization header.
 * Solo las rutas públicas de auth (login, register) se excluyen.
 * /auth/switch-tenant SÍ necesita token.
 */
const PUBLIC_AUTH_PATHS = ["/auth/login", "/auth/register-tenant", "/auth/forgot-password", "/auth/reset-password"];

const isAuthRoute = (url?: string): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url, api.defaults.baseURL || API_BASE_URL);
    return PUBLIC_AUTH_PATHS.some((p) => u.pathname.endsWith(p));
  } catch {
    return PUBLIC_AUTH_PATHS.some((p) => url.endsWith(p));
  }
};

/** Interceptor de REQUEST: agrega Authorization salvo rutas públicas de auth y cuida Content-Type */
api.interceptors.request.use((config) => {
  // Asegurar headers como objeto mutable
  config.headers = config.headers ?? {};

  // Establecer Content-Type solo cuando NO sea FormData y no esté ya definido
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (!isFormData && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  // Token en todas las rutas menos las públicas de auth (login, register)
  const token = getToken();
  const authRoute = isAuthRoute(config.url);
  if (token && !authRoute) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  } else if (authRoute && (config.headers as any).Authorization) {
    delete (config.headers as any).Authorization;
  }

  return config;
});

/** Interceptor de RESPONSE: manejo global de 401 */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Token inválido/expirado → limpiar y redirigir a login
      clearToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(err);
  }
);

/** (Opcional) cambiar baseURL en runtime si lo necesitas */
export const setApiBaseURL = (baseURL: string) => {
  api.defaults.baseURL = baseURL;
};

/** Returns the base URL for /uploads paths (strips /api suffix) */
export const getUploadsBaseUrl = (): string =>
  (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

export default api;