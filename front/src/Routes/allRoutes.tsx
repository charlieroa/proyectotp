import React, { Suspense } from "react";
import { Navigate } from "react-router-dom";

// Spinner for lazy-loaded pages
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

// Helper to wrap lazy components with Suspense
const Loadable = (Component: React.LazyExoticComponent<any>) => (props?: any) => (
  <Suspense fallback={<PageLoader />}>
    <Component {...props} />
  </Suspense>
);

// --- Lazy-loaded Page Components ---

// Dashboard
const DashboardPrincipal = Loadable(React.lazy(() => import("../pages/DashboardPrincipal")));
const DashboardV2 = Loadable(React.lazy(() => import("../pages/DashboardV2")));

// Calendario
const Calendar = Loadable(React.lazy(() => import("../pages/Calendar")));

// Estilistas
const CandidateList = Loadable(React.lazy(() => import("../pages/Crm/CrmContacts")));
const SimplePage = Loadable(React.lazy(() => import("../pages/Pages/Profile/SimplePage/SimplePage")));

// Inventario
const EcommerceProducts = Loadable(React.lazy(() => import("../pages/Ecommerce/EcommerceProducts/index")));
const EcommerceProductDetail = Loadable(React.lazy(() => import("../pages/Ecommerce/EcommerceProducts/EcommerceProductDetail")));

// Punto de Venta
const PointOfSale = Loadable(React.lazy(() => import("../pages/PointOfSale")));

// Nómina
const PayrollPage = Loadable(React.lazy(() => import("../pages/Payroll")));
const PayrollPreview = Loadable(React.lazy(() => import("../pages/Payroll/PayrollPreview")));

// Autenticación y Perfil
const Login = Loadable(React.lazy(() => import("../pages/Authentication/Login")));
const Logout = Loadable(React.lazy(() => import("../pages/Authentication/Logout")));
const Register = Loadable(React.lazy(() => import("../pages/Authentication/Register")));
const UserProfile = Loadable(React.lazy(() => import("../pages/Authentication/user-profile")));
const TenantRegister = Loadable(React.lazy(() => import("../pages/Authentication/TenantRegister")));
const ForgetPassword = Loadable(React.lazy(() => import("../pages/Authentication/ForgetPassword")));
const ResetPassword = Loadable(React.lazy(() => import("../pages/Authentication/ResetPassword")));
const Settings = Loadable(React.lazy(() => import("../pages/Pages/Profile/Settings/Settings")));

// CRM
const CRMPage = Loadable(React.lazy(() => import("../pages/CRMPage")));

// Mensajes
const MessagesPage = Loadable(React.lazy(() => import("../pages/Mensajes")));

// Campañas
const CreateCampaign = Loadable(React.lazy(() => import("../pages/Campaigns/CreateCampaign")));
const CampaignDetail = Loadable(React.lazy(() => import("../pages/Campaigns/CampaignDetail")));

// Fichero Digital
const FicheroDigital = Loadable(React.lazy(() => import("../pages/Fichero")));

// Página Web
const WebPage = Loadable(React.lazy(() => import("../pages/WebPage")));

// Asistente IA
const AIAssistant = Loadable(React.lazy(() => import("../pages/AIAssistant")));

// Super Admin
const SuperAdminDashboard = Loadable(React.lazy(() => import("../pages/SuperAdmin")));

// Portal del estilista de Coworking (renter)
const MiCoworking = Loadable(React.lazy(() => import("../pages/StylistPortal/MiCoworking")));
const MiAgenda = Loadable(React.lazy(() => import("../pages/StylistPortal/MiAgenda")));

// --- NUESTRAS RUTAS PROTEGIDAS ---
const authProtectedRoutes = [
  // Asistente IA
  { path: "/assistant", component: <div className="page-content page-content-flush">{AIAssistant()}</div> },

  // Dashboard
  { path: "/dashboard", component: DashboardPrincipal() },
  // Dashboard v2 — preview del rediseño Luxe (sin lógica real, datos mock)
  { path: "/dashboard-v2", component: DashboardV2() },

  // Super Admin
  { path: "/super-admin", component: SuperAdminDashboard() },

  // Portal del estilista de Coworking (renter)
  { path: "/mi-coworking", component: MiCoworking() },
  { path: "/mi-agenda", component: MiAgenda() },

  // Calendario
  { path: "/calendar", component: Calendar() },

  // Punto de Venta
  { path: "/checkout", component: PointOfSale() },

  // Estilistas
  { path: "/stylists", component: CandidateList() },
  { path: "/stylists/:id", component: SimplePage() },

  // Inventario
  { path: "/inventory", component: EcommerceProducts() },
  { path: "/inventory/:id", component: EcommerceProductDetail() },

  // Nómina
  { path: "/payroll", component: PayrollPage() },
  { path: "/payroll/preview", component: PayrollPreview() },

  // Fichero Digital
  { path: "/fichero", component: FicheroDigital() },

  // Página Web
  { path: "/web-page", component: WebPage() },

  // CRM
  { path: "/crm", component: CRMPage() },

  // Mensajes
  { path: "/messages", component: MessagesPage() },

  // Campañas (sub-routes)
  { path: "/campaigns/new", component: CreateCampaign() },
  { path: "/campaigns/:id", component: CampaignDetail() },

  // Configuración y Perfil
  { path: "/settings", component: Settings() },
  { path: "/profile", component: UserProfile() },

  // Catch-all redirige al dashboard
  { path: "*", component: <Navigate to="/dashboard" /> },
];


// --- NUESTRAS RUTAS PÚBLICAS ---
const publicRoutes = [
  // Redirect root to login (landing is separate at /landing.html)
  { path: "/", component: <Navigate to="/login" /> },

  // Rutas de Autenticación
  { path: "/logout", component: Logout() },
  { path: "/login", component: Login() },
  { path: "/register", component: Register() },
  { path: "/register-tenant", component: TenantRegister() },
  { path: "/forgot-password", component: ForgetPassword() },
  { path: "/reset-password/:token", component: ResetPassword() },
];

export { authProtectedRoutes, publicRoutes };
