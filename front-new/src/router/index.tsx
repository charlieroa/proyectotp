import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthWrapper } from './auth-wrapper';
import { ProtectedRoute } from './protected-route';
import { RoleGuard } from './role-guard';
import { ROLES } from '@/lib/constants';

// Layout
const AppLayout = lazy(() => import('@/components/layout/app-layout'));

// Auth pages
const Login = lazy(() => import('@/pages/auth/login'));
const RegisterTenant = lazy(() => import('@/pages/auth/register-tenant'));
const Logout = lazy(() => import('@/pages/auth/logout'));

// App pages
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Calendar = lazy(() => import('@/pages/calendar'));
const Settings = lazy(() => import('@/pages/settings'));
const AIAssistant = lazy(() => import('@/pages/ai-assistant'));
const Checkout = lazy(() => import('@/pages/checkout'));
const Stylists = lazy(() => import('@/pages/stylists'));
const StylistDetail = lazy(() => import('@/pages/stylists/detail'));
const Inventory = lazy(() => import('@/pages/inventory'));
const Payroll = lazy(() => import('@/pages/payroll'));
const PayrollPreview = lazy(() => import('@/pages/payroll/preview'));
const Reports = lazy(() => import('@/pages/reports'));
const Geo = lazy(() => import('@/pages/geo'));
const Profile = lazy(() => import('@/pages/profile'));
const SuperAdmin = lazy(() => import('@/pages/super-admin'));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AuthWrapper />,
    children: [
      // Public routes
      { path: '/login', element: <S><Login /></S> },
      { path: '/register-tenant', element: <S><RegisterTenant /></S> },
      { path: '/logout', element: <S><Logout /></S> },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <S><AppLayout /></S>,
            children: [
              { path: '/dashboard', element: <S><Dashboard /></S> },
              { path: '/calendar', element: <S><Calendar /></S> },
              { path: '/assistant', element: <S><AIAssistant /></S> },
              { path: '/checkout', element: <S><Checkout /></S> },
              { path: '/stylists', element: <S><Stylists /></S> },
              { path: '/stylists/:id', element: <S><StylistDetail /></S> },
              { path: '/inventory', element: <S><Inventory /></S> },
              { path: '/payroll', element: <S><Payroll /></S> },
              { path: '/payroll/preview', element: <S><PayrollPreview /></S> },
              { path: '/settings', element: <S><Settings /></S> },
              { path: '/reports', element: <S><Reports /></S> },
              { path: '/geo', element: <S><Geo /></S> },
              { path: '/profile', element: <S><Profile /></S> },
              {
                element: <RoleGuard allowedRoles={[ROLES.SUPER_ADMIN]} />,
                children: [
                  { path: '/super-admin', element: <S><SuperAdmin /></S> },
                ],
              },
            ],
          },
        ],
      },

      // Redirects
      { path: '/', element: <Navigate to="/login" replace /> },
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
]);
