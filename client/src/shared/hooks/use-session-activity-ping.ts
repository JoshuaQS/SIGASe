import { useEffect, useRef } from 'react';
import { useAuthSession } from '@/features/auth/hooks/use-auth-user';
import { api } from '@/shared/lib/http/api-client';

type ActivityEvent = keyof WindowEventMap;

const DEFAULT_EVENTS: ActivityEvent[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export function useSessionActivityPing(params?: {
  events?: ActivityEvent[];
  minIntervalMs?: number;
}) {
  const { user, isSessionValidated } = useAuthSession();
  const lastPingAtRef = useRef<number>(0);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!user?.token || !isSessionValidated) {
      return;
    }

    const events = params?.events ?? DEFAULT_EVENTS;
    const minIntervalMs = Math.max(5_000, params?.minIntervalMs ?? 30_000);

    const ping = async () => {
      const now = Date.now();
      if (pendingRef.current) return;
      if (now - lastPingAtRef.current < minIntervalMs) return;

      pendingRef.current = true;
      lastPingAtRef.current = now;

      try {
        // Endpoint ligero y “session-sensitive” para mantener viva la sesión por actividad del usuario.
        // Si el token ya no es válido, el api-client dispara el flujo global de sesión expirada.
        await api.get(user.role === 'STUDENT' ? '/auth/student/me' : '/auth/admin/me');
      } finally {
        pendingRef.current = false;
      }
    };

    const onActivity = () => {
      void ping();
    };

    events.forEach((eventName) => window.addEventListener(eventName, onActivity, { passive: true }));
    // Primer ping al montar (para inicializar last_activity_at si está nulo).
    void ping();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [user?.token, user?.role, isSessionValidated, params?.events, params?.minIntervalMs]);
}

