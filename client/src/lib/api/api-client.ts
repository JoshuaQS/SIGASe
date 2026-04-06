import { authSession } from '@//auth/auth-session-store';
import { ROLE_STUDENT } from '@//auth/auth-user';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const BASE_URL = viteEnv?.VITE_API_URL || 'http://localhost:8080/api/v1';
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

function shouldInvalidateSessionOnUnauthorized(endpoint: string, errorCode?: string) {
  if (SESSION_PROBE_ENDPOINTS.has(endpoint)) {
    return true;
  }

  // Login/reset-password flows can return 401 by business rules and should not force a global logout.
  if (endpoint.startsWith('/auth/')) {
    return false;
  }

  if (errorCode && AUTH_INVALID_ERROR_CODES.has(errorCode)) {
    return true;
  }

  return false;
}

export function cancelPendingRequests() {
  console.warn('[API][CANCEL_PENDING] aborting pending requests', {
    count: pendingControllers.size,
  });

  pendingControllers.forEach((controller) => controller.abort());
  pendingControllers.clear();
}

async function parseErrorResponse(response: Response) {
  try {
    const errorData = (await response.json()) as ApiErrorPayload;

    console.error('[API][PARSE_ERROR_JSON]', {
      status: response.status,
      message: errorData.message,
      errorCode: errorData.errorCode || errorData.code,
      raw: errorData,
    });

    return {
      message: errorData.message || 'Ocurrió un error al procesar la solicitud.',
      errorCode: errorData.errorCode || errorData.code,
    };
  } catch {
    const fallbackMessage = (await response.text()) || response.statusText || 'Ocurrió un error al procesar la solicitud.';

    console.error('[API][PARSE_ERROR_TEXT]', {
      status: response.status,
      message: fallbackMessage,
    });

    return {
      message: fallbackMessage,
      errorCode: undefined,
    };
  }
}

async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  console.log('[API][REQ]', {
    endpoint,
    url,
    method,
    hasUser: !!user,
    userRole: user?.role,
    hasToken: !!token,
    authHeader: headers.has('Authorization') ? 'present' : 'missing',
    hasBody: options.body !== undefined,
    isFormData: options.body instanceof FormData,
    body: options.body instanceof FormData ? '[FormData]' : options.body,
  });

  pendingControllers.add(controller);

  try {
    const response = await fetch(url, config);

    console.log('[API][RES]', {
      endpoint,
      url,
      method,
      status: response.status,
      ok: response.ok,
    });

    if (response.status === 401) {
      const error = await parseErrorResponse(response);
      const shouldInvalidateSession = shouldInvalidateSessionOnUnauthorized(endpoint, error.errorCode);

      console.error('[API][401]', {
        endpoint,
        url,
        method,
        status: response.status,
        errorCode: error.errorCode,
        message: error.message,
        shouldInvalidateSession,
      });

      if (shouldInvalidateSession) {
        console.error('[AUTH][CLEAR_SESSION_FROM_API]', {
          endpoint,
          url,
          method,
          errorCode: error.errorCode,
          message: error.message,
          stack: new Error().stack,
        });

        authSession.triggerSessionExpired(error.message || 'Tu sesión ha expirado.');
        authSession.clearSession();
      }

      throw new ApiClientError(error.message, response.status, error.errorCode, endpoint, method);
    }

    if (response.status === 403) {
      const error = await parseErrorResponse(response);
      const currentUser = authSession.getSnapshot().user;

      console.error('[API][403]', {
        endpoint,
        url,
        method,
        status: response.status,
        errorCode: error.errorCode,
        message: error.message,
        currentUserRole: currentUser?.role,
      });

      if (
        error.errorCode === 'PASSWORD_CHANGE_REQUIRED' &&
        currentUser?.role === ROLE_STUDENT
      ) {
        console.warn('[AUTH][PASSWORD_CHANGE_REQUIRED]', {
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

      console.error('[API][NON_OK]', {
        endpoint,
        url,
        method,
        status: response.status,
        errorCode: error.errorCode,
        message: error.message,
      });

      throw new ApiClientError(error.message, response.status, error.errorCode, endpoint, method);
    }

    if (response.status === 204) {
      console.log('[API][NO_CONTENT]', {
        endpoint,
        url,
        method,
      });

      return null as T;
    }

    const data = (await response.json()) as T;

    console.log('[API][JSON_OK]', {
      endpoint,
      url,
      method,
      status: response.status,
      data,
    });

    return data;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[API][ABORTED]', {
        endpoint,
        url,
        method,
      });
      throw error;
    }

    console.error('[API][UNEXPECTED_ERROR]', {
      endpoint,
      url,
      method,
      error,
    });

    throw error;
  } finally {
    pendingControllers.delete(controller);

    console.log('[API][FINALLY]', {
      endpoint,
      url,
      method,
      pendingRequestsAfterCleanup: pendingControllers.size,
    });
  }
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
};