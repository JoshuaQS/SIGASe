import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authSession } from '@/features/auth/store/auth-session-store';

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
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = authSession.onSessionExpired(() => {
      setOpen(true);
    });

    return () => {
      unsubscribe();
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      navigate('/login', { replace: true });
      closeTimerRef.current = null;
    }, 300);
  }, [navigate]);

  return {
    open,
    onClose: handleClose,
  };
}
