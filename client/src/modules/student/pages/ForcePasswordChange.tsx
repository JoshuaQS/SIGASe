import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { authSession } from '@/auth/auth-session-store';
import { ApiClientError } from '@/lib/api/api-client';
import { changeStudentPassword, confirmStudentPasswordReset } from '@/lib/api/auth-api';
import { useAppToast } from '@/components/ui/app-toast-provider';
import { useAuthUser } from '@/hooks/use-auth-user';
import { StudentForcePasswordChangeView } from '@/modules/student/components/ForcePasswordChangeForm';

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message || 'No se pudo actualizar la contraseña.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'No se pudo actualizar la contraseña.';
}

export default function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthUser();
  const { showToast } = useAppToast();
  const token = new URLSearchParams(location.search).get('token');
  const isOnboardingFromEmail = Boolean(token && !user);

  const handleSubmit = useCallback(
    async ({ newPassword }: { newPassword: string }) => {
      try {
        if (isOnboardingFromEmail && token) {
          await confirmStudentPasswordReset(token, newPassword);
        } else {
          await changeStudentPassword(newPassword);
          // The backend rotates tokenVersion after password changes, so current token becomes stale.
          authSession.clearSession();
        }

        showToast({
          severity: 'success',
          title: 'Contraseña actualizada',
          description: 'Inicia sesión con tu nueva contraseña para continuar.',
        });

        return {
          success: true,
          message: 'Contraseña actualizada. Redirigiendo a inicio de sesión...',
        };
      } catch (error) {
        const message = resolveErrorMessage(error);
        showToast({
          severity: 'error',
          title: 'No se pudo actualizar la contraseña',
          description: message,
        });
        return { success: false, message };
      }
    },
    [isOnboardingFromEmail, showToast, token],
  );

  const handleCompleted = useCallback(() => {
    navigate('/login?mode=student', { replace: true, state: { mode: 'student' } });
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    if (!isOnboardingFromEmail) {
      await authSession.logout();
    }
    navigate('/login?mode=student', { replace: true, state: { mode: 'student' } });
  }, [isOnboardingFromEmail, navigate]);

  return (
    <StudentForcePasswordChangeView
      studentName={user?.displayName}
      onSubmit={handleSubmit}
      onCompleted={handleCompleted}
      onLogout={handleLogout}
    />
  );
}
