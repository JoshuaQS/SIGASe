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
  'UNAUTHORIZED',
  'INVALID_TOKEN',
  'SESSION_EXPIRED',
  'TOKEN_EXPIRED',
  'JWT_EXPIRED',
]);

export class ApiClientError extends Error {
  status: number;
  errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function cancelPendingRequests() {
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

async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { user } = authSession.getSnapshot();
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

  pendingControllers.add(controller);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      const error = await parseErrorResponse(response);
      const shouldInvalidateSession = error.errorCode
        ? AUTH_INVALID_ERROR_CODES.has(error.errorCode)
        : false;
      if (shouldInvalidateSession) {
        authSession.clearSession();
      }
      throw new ApiClientError(error.message, response.status, error.errorCode);
    }

    if (response.status === 403) {
      const error = await parseErrorResponse(response);
      const currentUser = authSession.getSnapshot().user;
      if (
        error.errorCode === 'PASSWORD_CHANGE_REQUIRED' &&
        currentUser?.role === ROLE_STUDENT
      ) {
        authSession.setUser({ ...currentUser, mustChangePassword: true });
      }
      throw new ApiClientError(error.message || 'No tienes permisos para realizar esta acción.', response.status, error.errorCode);
    }

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      throw new ApiClientError(error.message, response.status, error.errorCode);
    }

    if (response.status === 204) {
      return null as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    throw error;
  } finally {
    pendingControllers.delete(controller);
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
