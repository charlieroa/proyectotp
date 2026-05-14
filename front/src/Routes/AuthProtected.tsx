import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setAuthorization } from "../helpers/api_helper";
import { useDispatch, useSelector } from "react-redux";
import { sileo } from 'sileo';

import { useProfile } from "../Components/Hooks/UserHooks";
import { getRoleFromToken } from "../services/auth";

import { logoutUser } from "../slices/auth/login/thunk";
import { selectTenantPlan, isPlanAtLeast } from "../slices/Settings/settingsSlice";

// Rutas protegidas por plan
const PLAN_PROTECTED_ROUTES: Record<string, string> = {
  '/inventory': 'pro',
  '/payroll': 'pro',
  '/checkout': 'pro',
  '/campaigns': 'enterprise',
};

// Rutas bloqueadas por rol (rol -> rutas que NO puede acceder)
const ROLE_BLOCKED_ROUTES: Record<number, string[]> = {
  2: ['/assistant', '/inventory', '/payroll', '/settings'], // Cajero: sin asistente, inventario, nómina, config
  6: ['/assistant', '/checkout', '/inventory', '/payroll', '/settings'], // Recepcionista: sin asistente, caja, inventario, nómina, config
};

/**
 * Verifica si la ruta actual requiere un plan superior al que tiene el tenant.
 */
function getRequiredPlan(pathname: string): string | null {
  for (const [route, plan] of Object.entries(PLAN_PROTECTED_ROUTES)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return plan;
    }
  }
  return null;
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

const AuthProtected = (props : any) =>{
  const dispatch : any = useDispatch();
  const { userProfile, loading, token } = useProfile();
  const location = useLocation();
  const tenantPlan = useSelector(selectTenantPlan);

  useEffect(() => {
    if (userProfile && !loading && token) {
      setAuthorization(token);
    } else if (!userProfile && loading && !token) {
      dispatch(logoutUser());
    }
  }, [token, userProfile, loading, dispatch]);

  if (!userProfile && loading && !token) {
    return (
      <React.Fragment>
        <Navigate to={{ pathname: "/login"}} />
      </React.Fragment>
    );
  }

  // Verificar restricción de rol para la ruta actual (ej: Cajera no puede acceder a /checkout)
  const userRole = getRoleFromToken();
  const blockedRoutes = userRole ? ROLE_BLOCKED_ROUTES[userRole] : undefined;
  if (blockedRoutes && blockedRoutes.some(r => location.pathname === r || location.pathname.startsWith(r + '/'))) {
    return <Navigate to="/dashboard-v2" replace />;
  }

  // Verificar restricción de plan para la ruta actual
  const requiredPlan = getRequiredPlan(location.pathname);
  if (requiredPlan && !isPlanAtLeast(tenantPlan, requiredPlan)) {
    sileo.info({
      title: "Plan requerido",
      description: `Esta sección requiere el plan ${PLAN_NAMES[requiredPlan] || requiredPlan}. Ve a Configuración → Planes para actualizar.`,
    });
    return <Navigate to="/settings?tab=6" replace />;
  }

  return <>{props.children}</>;
};


export default AuthProtected;
