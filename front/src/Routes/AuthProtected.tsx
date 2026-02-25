import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { setAuthorization } from "../helpers/api_helper";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify';

import { useProfile } from "../Components/Hooks/UserHooks";

import { logoutUser } from "../slices/auth/login/thunk";
import { selectTenantPlan, isPlanAtLeast } from "../slices/Settings/settingsSlice";

// Rutas protegidas por plan
const PLAN_PROTECTED_ROUTES: Record<string, string> = {
  '/inventory': 'pro',
  '/payroll': 'pro',
  '/assistant': 'pro',
  '/checkout': 'pro',
  '/geo': 'enterprise',
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

  // Verificar restricción de plan para la ruta actual
  const requiredPlan = getRequiredPlan(location.pathname);
  if (requiredPlan && !isPlanAtLeast(tenantPlan, requiredPlan)) {
    toast.info(
      `Esta sección requiere el plan ${PLAN_NAMES[requiredPlan] || requiredPlan}. Ve a Configuración → Planes para actualizar.`,
      { toastId: 'plan-upgrade', autoClose: 5000 }
    );
    return <Navigate to="/settings?tab=6" replace />;
  }

  return <>{props.children}</>;
};


export default AuthProtected;
