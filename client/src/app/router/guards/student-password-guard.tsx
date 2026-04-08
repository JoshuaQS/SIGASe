import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_STUDENT } from '@/features/auth/types/auth-user';
import { useAuthUser } from '@/features/auth/hooks/use-auth-user';

export const FORCE_PASSWORD_CHANGE_PATH = '/student/force-password-change';

/** Redirects students who must change their password to the forced change flow. */
export function StudentMustChangePasswordGuard() {
  const user = useAuthUser();

  if (
    user?.role === ROLE_STUDENT &&
    user.mustChangePassword
  ) {
    return <Navigate to={FORCE_PASSWORD_CHANGE_PATH} replace />;
  }

  return <Outlet />;
}

/** Only students with mustChangePassword can access the forced password change page. */
export function ForcePasswordChangeGuard() {
  const location = useLocation();
  const user = useAuthUser();
  const hasOnboardingToken = new URLSearchParams(location.search).has('token');

  if (!user && !hasOnboardingToken) {
    return <Navigate to="/login" replace />;
  }
  if (!user && hasOnboardingToken) {
    return <Outlet />;
  }
  if (user.role !== ROLE_STUDENT) {
    return <Navigate to="/login" replace />;
  }
  if (!user.mustChangePassword) {
    return <Navigate to="/student/portal" replace />;
  }

  return <Outlet />;
}
