import { useSyncExternalStore } from 'react';
import { authSession } from '@//auth/auth-session-store';
import type { AuthUser } from '@//auth/auth-user';
import type { AuthSessionSnapshot } from '@//auth/auth-session-store';

export function useAuthSession(): AuthSessionSnapshot {
  return useSyncExternalStore(authSession.subscribe, authSession.getSnapshot, authSession.getServerSnapshot);
}

export function useAuthUser(): AuthUser | null {
  return useAuthSession().user;
}
