import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authSession } from '@/features/auth/store/auth-session-store';

export interface SessionExpiredDialogState {
  open: boolean;
  description: string;
  onClose: () => void;
}

/**
 * Hook que monitorea cuando la sesión expira y muestra un diálogo.
 * Se dispara cuando una petición API detecta sesión expirada.
 */
export function useSessionExpiredDialog(): SessionExpiredDialogState {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(
    'Tu sesión finalizó. Inicia sesión nuevamente para continuar.',
  );
  const navigate = useNavigate();
  const closeTimerRef = useRef<number | null>(null);

  const toBase64 = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return normalized + padding;
  };

  const resolveSessionMinutes = (token?: string, expiresInSeconds?: number) => {
    if (token) {
      try {
        const payload = token.split('.')[1];
        if (payload) {
          const parsed = JSON.parse(window.atob(toBase64(payload))) as {
            iat?: number;
            exp?: number;
          };
          if (
            typeof parsed.iat === 'number'
            && typeof parsed.exp === 'number'
            && parsed.exp > parsed.iat
          ) {
            return Math.max(1, Math.round((parsed.exp - parsed.iat) / 60));
          }
        }
      } catch {
        // Si no se puede decodificar JWT, se usa fallback por configuración local.
      }
    }

    if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
      return Math.max(1, Math.round(expiresInSeconds / 60));
    }

    return null;
  };

  const buildDescription = (reason: string, sessionMinutes: number | null) => {
    const normalizedReason = reason.trim();
    const isExpiredReason = /expirad|token_expired|session_expired|jwt_expired/i.test(
      normalizedReason,
    );
    const isInactivityReason = /inactividad|inactive|idle/i.test(normalizedReason);
    const hasExplicitReasonPrefix = /^motivo:/i.test(normalizedReason);

    if (isExpiredReason) {
      const baseMessage = isInactivityReason
        ? 'Tu sesión expiró por inactividad. Inicia sesión nuevamente para continuar.'
        : (sessionMinutes
          ? `Tu sesión expiró tras ${sessionMinutes} minutos de vigencia. Inicia sesión nuevamente para continuar.`
          : 'Tu sesión expiró. Inicia sesión nuevamente para continuar.');

      if (hasExplicitReasonPrefix) {
        if (isInactivityReason) {
          return baseMessage;
        }
        return `${baseMessage} ${normalizedReason}`;
      }

      if (normalizedReason.length > 0) {
        return `${baseMessage} Motivo: ${normalizedReason}`;
      }

      if (sessionMinutes) {
        return baseMessage;
      }
      return baseMessage;
    }

    if (normalizedReason.length > 0) {
      if (hasExplicitReasonPrefix) {
        return normalizedReason;
      }
      return `Tu sesión finalizó. Inicia sesión nuevamente para continuar. Motivo: ${normalizedReason}`;
    }

    return 'Tu sesión finalizó. Inicia sesión nuevamente para continuar.';
  };

  useEffect(() => {
    const unsubscribe = authSession.onSessionExpired((reason) => {
      const user = authSession.getSnapshot().user;
      const sessionMinutes = resolveSessionMinutes(user?.token, user?.expiresInSeconds);
      setDescription(buildDescription(reason, sessionMinutes));
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
    description,
    onClose: handleClose,
  };
}
