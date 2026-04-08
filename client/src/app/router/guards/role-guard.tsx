import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/hooks/use-auth-user';

interface RoleGuardProps {
  allowedRoles: readonly string[];
  redirectTo?: string;
}

export function RoleGuard({ allowedRoles, redirectTo = '/login' }: RoleGuardProps) {
  const { user } = useAuthSession();
  const location = useLocation();

  if (!user || !allowedRoles.includes(user.role as string)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
