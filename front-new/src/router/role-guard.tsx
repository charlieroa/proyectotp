import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface RoleGuardProps {
  allowedRoles: number[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role_id)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
