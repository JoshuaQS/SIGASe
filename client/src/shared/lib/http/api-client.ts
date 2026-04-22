import { authSession } from '@/features/auth/store/auth-session-store';
import { ROLE_STUDENT } from '@/features/auth/types/auth-user';

type ViteRuntimeEnv = {
  VITE_API_URL?: string;
  VITE_API_DEBUG?: string;
};

const viteEnv = (import.meta as ImportMeta & { env?: ViteRuntimeEnv }).env;
const BASE_URL = viteEnv?.VITE_API_URL || 'http://localhost:8080/api/v1';
const API_DEBUG_ENABLED = viteEnv?.VITE_API_DEBUG === 'true';
const pendingControllers = new Set<AbortController>();

type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  errorCode?: string;
  code?: string;
  status?: number;
};

const AUTH_INVALID_ERROR_CODES = new Set([
  'INVALID_TOKEN',
  'SESSION_EXPIRED',
  'TOKEN_EXPIRED',
  'JWT_EXPIRED',
]);

const SESSION_PROBE_ENDPOINTS = new Set([
  '/auth/admin/me',
  '/auth/student/me',
]);

function isSessionSensitiveEndpoint(endpoint: string) {
  if (SESSION_PROBE_ENDPOINTS.has(endpoint)) {
    return true;
  }

  // Notification polling must stop immediately when auth becomes invalid.
  if (endpoint.startsWith('/notifications')) {
    return true;
  }

  return false;
}

export class ApiClientError extends Error {
  status: number;
  errorCode?: string;
  endpoint: string;
  method: string;

  constructor(message: string, status: number, errorCode: string | undefined, endpoint: string, method: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
    this.endpoint = endpoint;
    this.method = method;
  }
}

type DownloadResponse = {
  blob: Blob;
  headers: Headers;
};

function debugApi(event: string, detail: Record<string, unknown>) {
  if (!API_DEBUG_ENABLED) {
    return;
  }

  console.debug(`[API][${event}]`, detail);
}

function shouldInvalidateSessionOnUnauthorized(
  endpoint: string,
  options: { errorCode?: string; message?: string; hadToken: boolean },
) {
  // If request was sent without token, don't force a global logout.
  // This avoids false "session expired" dialogs from transient/race requests.
  if (!options.hadToken) {
    return false;
  }

  if (options.errorCode && AUTH_INVALID_ERROR_CODES.has(options.errorCode)) {
    return true;
  }

  // Login/reset-password flows can return 401 by business rules and should not force a global logout.
  if (endpoint.startsWith('/auth/')) {
    return false;
  }

  if (isSessionSensitiveEndpoint(endpoint)) {
    const normalizedMessage = (options.message || '').trim().toLowerCase();
    const genericUnauthenticated =
      options.errorCode === 'UNAUTHORIZED' &&
      (normalizedMessage === 'no autenticado.' || normalizedMessage === 'no autenticado');

    // Generic "No autenticado" on session probes is ambiguous (often header/race related).
    // Keep session and let next request confirm whether token is actually invalid.
    if (genericUnauthenticated) {
      return false;
    }
    return true;
  }

  return false;
}

function buildSessionExpiredReason(error: { message?: string; errorCode?: string }) {
  const normalizedMessage = (error.message || '').trim();
  const cleanedMessage = normalizedMessage
    .replace(/^sesi[oó]n expirada\.?\s*/i, '')
    .replace(/^inicia sesi[oó]n nuevamente\.?\s*/i, '')
    .trim();

  if (error.errorCode === 'SESSION_EXPIRED') {
    if (cleanedMessage.length > 0) {
      return `Motivo: sesión expirada (${error.errorCode}). ${cleanedMessage}`;
    }
    return `Motivo: sesión expirada (${error.errorCode}).`;
  }

  if (error.errorCode === 'JWT_EXPIRED' || error.errorCode === 'TOKEN_EXPIRED') {
    if (cleanedMessage.length > 0) {
      return `Motivo: token expirado (${error.errorCode}). ${cleanedMessage}`;
    }
    return `Motivo: token expirado (${error.errorCode}).`;
  }

  if (error.errorCode === 'INVALID_TOKEN') {
    if (cleanedMessage.length > 0) {
      return `Motivo: token inválido (${error.errorCode}). ${cleanedMessage}`;
    }
    return `Motivo: token inválido (${error.errorCode}).`;
  }

  if (cleanedMessage.length > 0) {
    return `Motivo: ${cleanedMessage}`;
  }

  if (error.errorCode) {
    return `Motivo: sesión inválida (${error.errorCode}).`;
  }

  return 'Motivo: la sesión ya no es válida.';
}

export function cancelPendingRequests() {
  debugApi('CANCEL_PENDING', {
    count: pendingControllers.size,
  });

  pendingControllers.forEach((controller) => controller.abort());
  pendingControllers.clear();
}

async function parseErrorResponse(response: Response) {
  try {
    const errorData = (await response.json()) as ApiErrorPayload;

    return {
      message: errorData.message || 'Ocurrió un error al procesar la solicitud.',
      errorCode: errorData.errorCode || errorData.code,
    };
  } catch {
    const fallbackMessage = (await response.text()) || response.statusText || 'Ocurrió un error al procesar la solicitud.';

    return {
      message: fallbackMessage,
      errorCode: undefined,
    };
  }
}

async function performRequest(endpoint: string, options: RequestInit = {}) {
  const snapshot = authSession.getSnapshot();
  const user = snapshot.user;
  const token = user?.token;
  const controller = new AbortController();

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    signal: options.signal ?? controller.signal,
  };

  const method = String(config.method || 'GET').toUpperCase();
  const url = `${BASE_URL}${endpoint}`;

  debugApi('REQ', {
    endpoint,
    method,
    userRole: user?.role,
    hasBody: options.body !== undefined,
    isFormData: options.body instanceof FormData,
  });

  pendingControllers.add(controller);

  try {
    const response = await fetch(url, config);

    debugApi('RES', {
      endpoint,
      method,
      status: response.status,
      ok: response.ok,
    });

    if (response.status === 401) {
      const error = await parseErrorResponse(response);
      const shouldInvalidateSession = shouldInvalidateSessionOnUnauthorized(endpoint, {
        errorCode: error.errorCode,
        message: error.message,
        hadToken: Boolean(token),
      });

      debugApi('401', {
        endpoint,
        method,
        errorCode: error.errorCode,
        hadToken: Boolean(token),
        shouldInvalidateSession,
      });

      if (shouldInvalidateSession) {
        authSession.triggerSessionExpired(buildSessionExpiredReason(error));
        authSession.clearSession();
      }

      throw new ApiClientError(error.message, response.status, error.errorCode, endpoint, method);
    }

    if (response.status === 403) {
      const error = await parseErrorResponse(response);
      const currentUser = authSession.getSnapshot().user;

      debugApi('403', {
        endpoint,
        method,
        errorCode: error.errorCode,
        currentUserRole: currentUser?.role,
      });

      if (
        error.errorCode === 'PASSWORD_CHANGE_REQUIRED' &&
        currentUser?.role === ROLE_STUDENT
      ) {
        debugApi('PASSWORD_CHANGE_REQUIRED', {
          endpoint,
          method,
          userRole: currentUser.role,
        });

        authSession.setUser({ ...currentUser, mustChangePassword: true });
      }

      throw new ApiClientError(
        error.message || 'No tienes permisos para realizar esta acción.',
        response.status,
        error.errorCode,
        endpoint,
        method
      );
    }

    if (!response.ok) {
      const error = await parseErrorResponse(response);

      debugApi('NON_OK', {
        endpoint,
        method,
        status: response.status,
        errorCode: error.errorCode,
      });

      throw new ApiClientError(error.message, response.status, error.errorCode, endpoint, method);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      debugApi('ABORTED', {
        endpoint,
        method,
      });
      throw error;
    }

    debugApi('UNEXPECTED_ERROR', {
      endpoint,
      method,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });

    throw error;
  } finally {
    pendingControllers.delete(controller);

    debugApi('FINALLY', {
      endpoint,
      method,
      pendingRequestsAfterCleanup: pendingControllers.size,
    });
  }
}

async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await performRequest(endpoint, options);

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function downloadClient(endpoint: string, options: RequestInit = {}): Promise<DownloadResponse> {
  const response = await performRequest(endpoint, options);

  return {
    blob: await response.blob(),
    headers: response.headers,
  };
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body:
        data === undefined
          ? undefined
          : data instanceof FormData
            ? data
            : JSON.stringify(data),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchClient<T>(endpoint, { ...options, method: 'DELETE' }),

  download: (endpoint: string, options?: RequestInit) =>
    downloadClient(endpoint, { ...options, method: options?.method ?? 'GET' }),
};
