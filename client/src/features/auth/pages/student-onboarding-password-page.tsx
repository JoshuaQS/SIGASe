import { useLocation, useNavigate } from 'react-router-dom';
import { confirmStudentPasswordReset } from '@/features/auth/api/auth-api';
import { StudentForcePasswordChangeView } from '@/features/student-portal/components/force-password-change-form';

export default function StudentOnboardingPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  return (
    <StudentForcePasswordChangeView
      onSubmit={async ({ newPassword }) => {
        if (!token) {
          return {
            success: false,
            message: 'Enlace inválido o expirado. Solicita uno nuevo al administrador.',
          };
        }

        try {
          await confirmStudentPasswordReset(token, newPassword);
          return {
            success: true,
            message: 'Cuenta activada correctamente. Redirigiendo al inicio de sesión...',
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error
              ? error.message
              : 'No se pudo activar la cuenta.',
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
