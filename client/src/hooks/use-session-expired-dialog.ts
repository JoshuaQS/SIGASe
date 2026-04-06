import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authSession } from '@/auth/auth-session-store';

export interface SessionExpiredDialogState {
  open: boolean;
  onClose: () => void;
}

/**
 * Hook que monitorea cuando la sesión expira y muestra un diálogo.
 * Se dispara cuando una petición API detecta sesión expirada.
 */
export function useSessionExpiredDialog(): SessionExpiredDialogState {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = authSession.onSessionExpired(() => {
      setOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    // Redirigir al login después de un pequeño delay
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 300);
  };

  return {
    open,
    onClose: handleClose,
  };
}
