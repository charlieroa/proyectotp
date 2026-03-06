// Contenido para tu archivo de Rutas (ej: src/routes/index.js)

import React from "react";
import { Navigate } from "react-router-dom";

// --- Nuestros Componentes de Página ---

// Dashboard
import DashboardPrincipal from "../pages/DashboardPrincipal";

// Calendario
import Calendar from "../pages/Calendar";

// Estilistas
import CandidateList from "../pages/Crm/CrmContacts"; // Lista de Estilistas
import SimplePage from "../pages/Pages/Profile/SimplePage/SimplePage"; // Detalle de Estilista

// Inventario
import EcommerceProducts from "../pages/Ecommerce/EcommerceProducts/index";
import EcommerceProductDetail from "../pages/Ecommerce/EcommerceProducts/EcommerceProductDetail";

// --- NUESTRO NUEVO COMPONENTE DE PUNTO DE VENTA ---
import PointOfSale from "../pages/PointOfSale";

// --- NUESTROS COMPONENTES DE NÓMINA ---
import PayrollPage from "../pages/Payroll"; // Página de la lista de nóminas
import PayrollPreview from "../pages/Payroll/PayrollPreview"; // <-- 1. IMPORTAMOS LA NUEVA VISTA DE DETALLE

// Autenticación y Perfil
import Login from "../pages/Authentication/Login";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register"; // Registro de Clientes
import UserProfile from "../pages/Authentication/user-profile";
import TenantRegister from "../pages/Authentication/TenantRegister"; // Registro de Dueños
import ForgetPassword from "../pages/Authentication/ForgetPassword";
import ResetPassword from "../pages/Authentication/ResetPassword";
import Settings from '../pages/Pages/Profile/Settings/Settings';

// CRM (tabbed page)
import CRMPage from "../pages/CRMPage";

// Mensajes (WhatsApp conversations)
import MessagesPage from "../pages/Mensajes";

// Campañas
import CreateCampaign from "../pages/Campaigns/CreateCampaign";
import CampaignDetail from "../pages/Campaigns/CampaignDetail";

// Fichero Digital
import FicheroDigital from "../pages/Fichero";

// Asistente IA
import AIAssistant from "../pages/AIAssistant";

// Super Admin
import SuperAdminDashboard from "../pages/SuperAdmin";

// Landing is now a separate static page (landing.html)
// "/" redirects to /login

// --- NUESTRAS RUTAS PROTEGIDAS ---
const authProtectedRoutes = [
  // Asistente IA
  { path: "/assistant", component: <div className="page-content page-content-flush"><AIAssistant /></div> },

  // Dashboard
  { path: "/dashboard", component: <DashboardPrincipal /> },

  // Super Admin
  { path: "/super-admin", component: <SuperAdminDashboard /> },

  // Calendario
  { path: "/calendar", component: <Calendar /> },

  // Punto de Venta
  { path: "/checkout", component: <PointOfSale /> },

  // Estilistas
  { path: "/stylists", component: <CandidateList /> },
  { path: "/stylists/:id", component: <SimplePage /> },

  // Inventario
  { path: "/inventory", component: <EcommerceProducts /> },
  { path: "/inventory/:id", component: <EcommerceProductDetail /> },

  // Nómina
  { path: "/payroll", component: <PayrollPage /> },
  { path: "/payroll/preview", component: <PayrollPreview /> },

  // Fichero Digital
  { path: "/fichero", component: <FicheroDigital /> },

  // CRM
  { path: "/crm", component: <CRMPage /> },

  // Mensajes
  { path: "/messages", component: <MessagesPage /> },

  // Campañas (sub-routes)
  { path: "/campaigns/new", component: <CreateCampaign /> },
  { path: "/campaigns/:id", component: <CampaignDetail /> },
  
  // Configuración y Perfil
  { path: "/settings", component: <Settings /> },
  { path: "/profile", component: <UserProfile /> },

  // Catch-all redirige al dashboard
  { path: "*", component: <Navigate to="/dashboard" /> },
];


// --- NUESTRAS RUTAS PÚBLICAS ---
const publicRoutes = [
  // Redirect root to login (landing is separate at /landing.html)
  { path: "/", component: <Navigate to="/login" /> },

  // Rutas de Autenticación
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/register", component: <Register /> }, // Registro de Clientes
  { path: "/register-tenant", component: <TenantRegister /> }, // Registro de Dueños
  { path: "/forgot-password", component: <ForgetPassword /> },
  { path: "/reset-password/:token", component: <ResetPassword /> },
];

export { authProtectedRoutes, publicRoutes };