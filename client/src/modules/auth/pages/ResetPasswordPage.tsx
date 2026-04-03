import { useLocation, useNavigate } from 'react-router-dom';
import RecoveryCard from '@/modules/auth/components/RecoveryCard';
import { confirmStudentPasswordReset } from '@/lib/api/auth-api';
import { StudentForcePasswordChangeView } from '@/modules/student/components/ForcePasswordChangeForm';

type ResetLocationState = {
  mode?: 'student' | 'admin';
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const queryMode = params.get('mode');
  const stateMode = (location.state as ResetLocationState | null)?.mode;
  const audience = queryMode === 'admin' || stateMode === 'admin' ? 'admin' : 'student';

  if (audience === 'student' && token) {
    return (
      <StudentForcePasswordChangeView
        onSubmit={async ({ newPassword }) => {
          try {
            await confirmStudentPasswordReset(token, newPassword);
            return {
              success: true,
              message: 'Contraseña configurada correctamente. Redirigiendo al inicio de sesión...',
            };
          } catch (error) {
            return {
              success: false,
              message: error instanceof Error
                ? error.message
                : 'No se pudo configurar la contraseña.',
            };
          }
        }}
        onCompleted={() =>
          navigate('/login?mode=student', { replace: true, state: { mode: 'student' } })
        }
        onLogout={() =>
          navigate('/login?mode=student', { replace: true, state: { mode: 'student' } })
        }
      />
    );
  }

  return (
    <RecoveryCard
      mode="reset"
      audience={audience}
      token={token}
      onBackToLogin={() =>
        navigate('/login', { state: { mode: audience } })
      }
    />
  );
}
