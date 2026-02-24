import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
  setToken,
  getToken,
  clearToken,
  getDecodedToken,
  isTokenExpired,
  setAuthUser,
  getAuthUser,
  clearAuthUser,
  type DecodedToken,
} from '@/lib/auth';
import { ROLES } from '@/lib/constants';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setupComplete: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(() => {
    const token = getToken();
    const decoded = token ? getDecodedToken() : null;
    const stored = getAuthUser<{ user?: User; setup_complete?: boolean }>();

    if (token && decoded && !isTokenExpired()) {
      return {
        token,
        user: (stored?.user as User) ?? (decoded.user as User) ?? null,
        setupComplete: stored?.setup_complete ?? true,
        isLoading: false,
      };
    }

    return { user: null, token: null, setupComplete: true, isLoading: false };
  });

  // Check token expiration on mount
  useEffect(() => {
    if (state.token && isTokenExpired()) {
      clearToken();
      clearAuthUser();
      setState({ user: null, token: null, setupComplete: true, isLoading: false });
    }
  }, [state.token]);

  const login = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, isLoading: true }));
      try {
        const res = await api.post('/auth/login', { email, password });

        if (!res.data?.token) {
          throw new Error('La respuesta de la API no incluyo un token.');
        }

        setToken(res.data.token);
        const user = res.data.user as User;
        const setupComplete = res.data.setup_complete ?? true;

        const authUser = {
          token: res.data.token,
          user,
          setup_complete: setupComplete,
        };
        setAuthUser(authUser);

        setState({
          token: res.data.token,
          user,
          setupComplete,
          isLoading: false,
        });

        // Navigate based on role
        if (user.role_id === ROLES.SUPER_ADMIN) {
          navigate('/super-admin');
        } else if (!setupComplete) {
          navigate('/settings');
        } else {
          navigate('/dashboard');
        }
      } catch (error: unknown) {
        setState((s) => ({ ...s, isLoading: false }));
        throw error;
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    clearToken();
    clearAuthUser();
    setState({ user: null, token: null, setupComplete: true, isLoading: false });
    window.location.assign('/login');
  }, []);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      const res = await api.post('/auth/switch-tenant', { tenant_id: tenantId });
      if (res.data?.token) {
        setToken(res.data.token);
        const decoded = getDecodedToken();
        setState((s) => ({
          ...s,
          token: res.data.token,
          user: (decoded?.user as User) ?? s.user,
        }));
        window.location.reload();
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ ...state, login, logout, switchTenant }),
    [state, login, logout, switchTenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
