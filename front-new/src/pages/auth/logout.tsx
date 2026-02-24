import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return null;
}
