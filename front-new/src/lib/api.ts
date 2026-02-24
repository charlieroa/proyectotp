import axios, { type AxiosError } from 'axios';
import { getToken, clearToken } from './auth';
import { API_URL } from './constants';

/** Instancia unica de Axios para toda la app */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register-tenant'];

const isAuthRoute = (url?: string): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url, api.defaults.baseURL || API_URL);
    return PUBLIC_AUTH_PATHS.some((p) => u.pathname.endsWith(p));
  } catch {
    return PUBLIC_AUTH_PATHS.some((p) => url.endsWith(p));
  }
};

/** Interceptor de REQUEST: agrega Authorization salvo rutas publicas de auth */
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  const authRoute = isAuthRoute(config.url);
  if (token && !authRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (authRoute && config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

/** Interceptor de RESPONSE: manejo global de 401 */
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  },
);

export default api;
