import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Bot,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  Settings,
  BarChart3,
  MapPin,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { ROLES } from '@/lib/constants';
import logoSm from '@/assets/images/logo-sm.png';
import logoLight from '@/assets/images/logo-light.png';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: number[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { path: '/calendar', label: 'Calendario', icon: <Calendar className="h-5 w-5" /> },
  { path: '/assistant', label: 'Asistente IA', icon: <Bot className="h-5 w-5" /> },
  { path: '/checkout', label: 'Punto de Venta', icon: <ShoppingCart className="h-5 w-5" /> },
  { path: '/stylists', label: 'Estilistas', icon: <Users className="h-5 w-5" /> },
  { path: '/inventory', label: 'Inventario', icon: <Package className="h-5 w-5" /> },
  { path: '/payroll', label: 'Nomina', icon: <Wallet className="h-5 w-5" />, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER] },
  { path: '/reports', label: 'Reportes', icon: <BarChart3 className="h-5 w-5" /> },
  { path: '/geo', label: 'Geolocalizacion', icon: <MapPin className="h-5 w-5" />, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER] },
  { path: '/settings', label: 'Configuracion', icon: <Settings className="h-5 w-5" /> },
  { path: '/super-admin', label: 'Super Admin', icon: <Shield className="h-5 w-5" />, roles: [ROLES.SUPER_ADMIN] },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const roleId = user?.role_id ?? 0;

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(roleId),
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logoSm} alt="Logo" className="h-8 w-8" />
            <img src={logoLight} alt="Tupelukeria" className="h-6" />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn('sidebar-link', isActive && 'active')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-3">
          <p className="text-xs text-slate-500">Tupelukeria v2.0</p>
        </div>
      </aside>
    </>
  );
}
