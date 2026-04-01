import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAdminRole } from '@/auth/auth-user';
import { useAuthSession } from '@/hooks/use-auth-user';
import AdminLoginCard from '@/modules/auth/components/AdminLoginCard';
import StudentsLoginCard from '@/modules/auth/components/StudentsLoginCard';

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
  const [mode, setMode] = useState<LoginMode>('student');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSessionValidated } = useAuthSession();

  useEffect(() => {
    const next = resolveLoginMode(
      location.search,
      (location.state as LoginLocationState | null)?.mode,
    );
    if (next === 'student' || next === 'admin') {
      setMode(next);
    }
  }, [location.search, location.state]);

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
      onSwitchToAdmin={() => setMode('admin')}
      onForgotPassword={() =>
        navigate('/forgot-password', {
          state: { returnLoginMode: 'student' satisfies LoginMode },
        })
      }
    />
  ) : (
    <AdminLoginCard
      onSwitchToStudent={() => setMode('student')}
      onForgotPassword={() =>
        navigate('/forgot-password', {
          state: { returnLoginMode: 'admin' satisfies LoginMode },
        })
      }
    />
  );
}
