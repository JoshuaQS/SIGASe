import { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAdminRole } from '@/features/auth/types/auth-user';
import { useAuthSession } from '@/features/auth/hooks/use-auth-user';
import AdminLoginCard from '@/features/auth/components/admin-login-card';
import StudentsLoginCard from '@/features/auth/components/students-login-card';

type LoginMode = 'student' | 'admin';

type LoginLocationState = { mode?: LoginMode };

function resolveLoginMode(search: string, stateMode?: LoginMode): LoginMode | null {
  const params = new URLSearchParams(search);
  const queryMode = params.get('mode');
  if (queryMode === 'student' || queryMode === 'admin') {
    return queryMode;
  }
  if (stateMode === 'student' || stateMode === 'admin') {
    return stateMode;
  }
  return null;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSessionValidated } = useAuthSession();
  const routeMode = useMemo(
    () => resolveLoginMode(
      location.search,
      (location.state as LoginLocationState | null)?.mode,
    ),
    [location.search, location.state],
  );
  const mode = routeMode ?? 'student';

  useEffect(() => {
    if (!isSessionValidated || !user) return;

    if (isAdminRole(user.role)) {
      navigate('/admin/monitoreo-reportes', { replace: true });
      return;
    }

    if (user.mustChangePassword) {
      navigate('/student/force-password-change', { replace: true });
      return;
    }

    navigate('/student/portal', { replace: true });
  }, [isSessionValidated, navigate, user]);

  return mode === 'student' ? (
    <StudentsLoginCard
      onSwitchToAdmin={() =>
        navigate('/login?mode=admin', { replace: true, state: { mode: 'admin' satisfies LoginMode } })
      }
      onForgotPassword={() =>
        navigate('/forgot-password', {
          state: { returnLoginMode: 'student' satisfies LoginMode },
        })
      }
    />
  ) : (
    <AdminLoginCard
      onSwitchToStudent={() =>
        navigate('/login?mode=student', { replace: true, state: { mode: 'student' satisfies LoginMode } })
      }
      onForgotPassword={() =>
        navigate('/forgot-password', {
          state: { returnLoginMode: 'admin' satisfies LoginMode },
        })
      }
    />
  );
}
