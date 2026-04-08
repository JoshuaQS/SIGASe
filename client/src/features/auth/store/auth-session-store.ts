import type { AuthUser } from '../types/auth-user';
import {
  getAdminMe,
  loginAdmin as loginAdminRequest,
  logoutAdmin as logoutAdminRequest,
  getStudentMe,
  loginStudent as loginStudentRequest,
  loginStudentWithGoogle as loginStudentWithGoogleRequest,
  logoutStudent as logoutStudentRequest,
} from '@/features/auth/api/auth-api';
import { ApiClientError, cancelPendingRequests } from '@/shared/lib/http/api-client';
import { isAdminRole, ROLE_STUDENT } from '../types/auth-user';

const STORAGE_KEY = 'sigase.auth.user';

export type AuthSessionSnapshot = {
  user: AuthUser | null;
  isInitializing: boolean;
  isSessionValidated: boolean;
  bootstrapError: boolean;
};

type SessionExpiredListener = (reason: string) => void;

const SERVER_SNAPSHOT: AuthSessionSnapshot = {
  user: null,
  isInitializing: false,
  isSessionValidated: false,
  bootstrapError: false,
};

function readStorage(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

let cache: AuthUser | null = readStorage();
const hasBrowser = typeof window !== 'undefined';
const hasCachedToken = Boolean(cache?.token);

let isInitializing = hasBrowser && hasCachedToken;
let isSessionValidated = false;
let bootstrapError = false;
let snapshot: AuthSessionSnapshot = hasBrowser
  ? {
    user: cache,
    isInitializing,
    isSessionValidated,
    bootstrapError,
  }
  : SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
const sessionExpiredListeners = new Set<SessionExpiredListener>();

function buildPersonDisplayName(params: {
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null | undefined;
}) {
  return [params.name, params.lastNamePaternal, params.lastNameMaternal].filter(Boolean).join(' ');
}

function emit() {
  listeners.forEach((l) => l());
}

function syncSnapshot() {
  snapshot = {
    user: cache,
    isInitializing,
    isSessionValidated,
    bootstrapError,
  };
}

function setBootstrapState(next: { isInitializing?: boolean; isSessionValidated?: boolean; bootstrapError?: boolean }) {
  if (typeof next.isInitializing === 'boolean') {
    isInitializing = next.isInitializing;
  }
  if (typeof next.isSessionValidated === 'boolean') {
    isSessionValidated = next.isSessionValidated;
  }
  bootstrapError = next.bootstrapError ?? false;
  syncSnapshot();
  emit();
}

function persist(next: AuthUser | null) {
  cache = next;
  if (typeof window !== 'undefined') {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }
  syncSnapshot();
  emit();
}

function buildAdminSession(params: {
  id: string;
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  role: string;
  token: string;
  tokenType: string;
  expiresInSeconds: number;
}): AuthUser {
  return {
    id: params.id,
    email: params.email,
    displayName: buildPersonDisplayName(params),
    role: params.role,
    token: params.token,
    tokenType: params.tokenType,
    expiresInSeconds: params.expiresInSeconds,
    mustChangePassword: false,
  };
}

function buildStudentSession(params: {
  id: string;
  email: string;
  name: string;
  lastNamePaternal: string;
  lastNameMaternal: string | null;
  token: string;
  tokenType: string;
  mustChangePassword: boolean;
}): AuthUser {
  return {
    id: params.id,
    email: params.email,
    displayName: buildPersonDisplayName(params),
    role: ROLE_STUDENT,
    token: params.token,
    tokenType: params.tokenType,
    expiresInSeconds: 0,
    mustChangePassword: params.mustChangePassword,
  };
}

function isRecoverableUnauthorized(error: unknown) {
  return (
    error instanceof ApiClientError &&
    error.status === 401 &&
    (error.errorCode === 'INVALID_TOKEN' ||
      error.errorCode === 'SESSION_EXPIRED' ||
      error.errorCode === 'TOKEN_EXPIRED' ||
      error.errorCode === 'JWT_EXPIRED')
  );
}

export const authSession = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  onSessionExpired(fn: SessionExpiredListener) {
    sessionExpiredListeners.add(fn);
    return () => sessionExpiredListeners.delete(fn);
  },
  triggerSessionExpired(reason: string) {
    sessionExpiredListeners.forEach((listener) => listener(reason));
  },
  getSnapshot(): AuthSessionSnapshot {
    return snapshot;
  },
  getServerSnapshot(): AuthSessionSnapshot {
    return SERVER_SNAPSHOT;
  },
  setUser(next: AuthUser | null) {
    persist(next);
    setBootstrapState({ isInitializing: false, isSessionValidated: next ? !isAdminRole(next.role) : false });
  },
  clearSession() {
    persist(null);
    setBootstrapState({ isInitializing: false, isSessionValidated: false });
  },
  hydrateFromStorage() {
    cache = readStorage();
    isInitializing = Boolean(cache?.token);
    isSessionValidated = false;
    bootstrapError = false;
    syncSnapshot();
    emit();
  },
  async loginAdmin(email: string, password: string) {
    const login = await loginAdminRequest(email, password);
    const provisionalSession: AuthUser = {
      role: login.role,
      token: login.accessToken,
      tokenType: login.tokenType,
      expiresInSeconds: login.expiresInSeconds,
      mustChangePassword: false,
    };

    persist(provisionalSession);
    setBootstrapState({ isInitializing: true, isSessionValidated: false });

    try {
      return await this.fetchAdminProfile();
    } catch (error) {
      this.clearSession();
      throw error;
    }
  },
  async loginStudent(email: string, password: string) {
    const login = await loginStudentRequest(email, password);
    const provisionalSession: AuthUser = {
      role: ROLE_STUDENT,
      token: login.token,
      tokenType: 'Bearer',
      expiresInSeconds: 0,
      mustChangePassword: login.mustChangePassword,
    };

    persist(provisionalSession);
    setBootstrapState({ isInitializing: true, isSessionValidated: false });

    try {
      return await this.fetchStudentProfile();
    } catch (error) {
      this.clearSession();
      throw error;
    }
  },
  async loginStudentWithGoogle(idToken: string) {
    const login = await loginStudentWithGoogleRequest(idToken);
    const provisionalSession: AuthUser = {
      role: ROLE_STUDENT,
      token: login.token,
      tokenType: 'Bearer',
      expiresInSeconds: 0,
      mustChangePassword: login.mustChangePassword,
    };

    persist(provisionalSession);
    setBootstrapState({ isInitializing: true, isSessionValidated: false });

    try {
      return await this.fetchStudentProfile();
    } catch (error) {
      this.clearSession();
      throw error;
    }
  },
  async fetchAdminProfile() {
    const current = cache;
    if (!current?.token || !isAdminRole(current.role)) {
      this.clearSession();
      return null;
    }

    const profile = await getAdminMe();
    const next = buildAdminSession({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      lastNamePaternal: profile.lastNamePaternal,
      lastNameMaternal: profile.lastNameMaternal,
      role: profile.role,
      token: current.token,
      tokenType: current.tokenType || 'Bearer',
      expiresInSeconds: current.expiresInSeconds || 0,
    });
    persist(next);
    setBootstrapState({ isInitializing: false, isSessionValidated: true });
    return next;
  },
  async fetchStudentProfile() {
    const current = cache;
    if (!current?.token || current.role !== ROLE_STUDENT) {
      this.clearSession();
      return null;
    }

    const profile = await getStudentMe();
    const next = buildStudentSession({
      id: profile.id,
      email: profile.institutionalEmail,
      name: profile.name,
      lastNamePaternal: profile.lastNamePaternal,
      lastNameMaternal: profile.lastNameMaternal,
      token: current.token,
      tokenType: current.tokenType || 'Bearer',
      mustChangePassword: Boolean(current.mustChangePassword),
    });

    persist(next);
    setBootstrapState({ isInitializing: false, isSessionValidated: true });
    return next;
  },
  async initializeAuth() {
    this.hydrateFromStorage();

    const current = cache;
    if (!current?.token) {
      setBootstrapState({ isInitializing: false, isSessionValidated: false });
      return null;
    }

    setBootstrapState({ isInitializing: true, isSessionValidated: false });

    try {
      return isAdminRole(current.role)
        ? await this.fetchAdminProfile()
        : await this.fetchStudentProfile();
    } catch (error) {
      if (
        error instanceof ApiClientError &&
        error.status === 403 &&
        error.errorCode === 'PASSWORD_CHANGE_REQUIRED' &&
        current.role === ROLE_STUDENT
      ) {
        persist({ ...current, mustChangePassword: true });
        setBootstrapState({ isInitializing: false, isSessionValidated: true });
        return { ...current, mustChangePassword: true };
      }
      if (isRecoverableUnauthorized(error)) {
        this.clearSession();
        return null;
      }
      if (error instanceof ApiClientError && error.status === 401) {
        if (!cache?.token) {
          setBootstrapState({ isInitializing: false, isSessionValidated: false });
          return null;
        }
        // Keep the cached session and surface retry UI for ambiguous unauthorized responses.
        // This avoids aggressive logout loops for request-level 401 responses.
        setBootstrapState({ isInitializing: false, isSessionValidated: false, bootstrapError: true });
        return null;
      }
      setBootstrapState({ isInitializing: false, isSessionValidated: false, bootstrapError: true });
      return null;
    }
  },
  async logout() {
    const current = cache;
    cancelPendingRequests();
    try {
      if (current?.token && isAdminRole(current.role)) {
        await logoutAdminRequest();
      } else if (current?.token && current.role === ROLE_STUDENT) {
        await logoutStudentRequest();
      }
    } catch (error) {
      if (!isRecoverableUnauthorized(error)) {
        throw error;
      }
    } finally {
      this.clearSession();
    }
  },
};

syncSnapshot();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cache = readStorage();
      if (e.newValue === null) {
        // Key removed: another tab explicitly logged out or cleared the session.
        isInitializing = false;
        isSessionValidated = false;
        bootstrapError = false;
      }
      // Key written (non-null): another tab logged in or completed bootstrap.
      // Keep this tab's own validated state — do not reset isSessionValidated.
      syncSnapshot();
      emit();
    }
  });
}
