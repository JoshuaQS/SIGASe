import { useSyncExternalStore } from 'react';
import { authSession } from '@/features/auth/store/auth-session-store';
import type { AuthUser } from '@/features/auth/types/auth-user';
import type { AuthSessionSnapshot } from '@/features/auth/store/auth-session-store';

export function useAuthSession(): AuthSessionSnapshot {
  return useSyncExternalStore(authSession.subscribe, authSession.getSnapshot, authSession.getServerSnapshot);
}

export function useAuthUser(): AuthUser | null {
  return useAuthSession().user;
}
