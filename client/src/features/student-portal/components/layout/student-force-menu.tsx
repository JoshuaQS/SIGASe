import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { authSession } from '@/features/auth/store/auth-session-store';
import { useAppToast } from '@/shared/components/ui/app-toast-provider';
import { Button } from '@/shared/components/ui/button';

const StudentForceMenu = () => {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const handleLogout = async () => {
    try {
      await authSession.logout();
      showToast({
        severity: 'success',
        title: 'Sesión cerrada',
        description: 'Tu sesión de estudiante ha finalizado.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesión.';
      showToast({
        severity: 'error',
        title: 'Error al cerrar sesión',
        description: message,
      });
      } finally {
        navigate('/login?mode=student', { replace: true, state: { mode: 'student' } });
      }
  };

  return (
    <>
</>
  );
};

export default StudentForceMenu;
