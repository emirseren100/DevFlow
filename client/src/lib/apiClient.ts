// Same convention as HealthStatus: the base URL already ends with /api.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** Thrown for every non-successful response, so callers handle one error type. */
export class ApiError extends Error {
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? {};
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

/**
 * Small wrapper around fetch.
 *
 * `credentials: 'include'` makes the browser send and store the session cookie.
 * No token is ever kept in JavaScript, so there is nothing here to read from
 * localStorage.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!payload) {
    throw new ApiError({ code: 'NETWORK_ERROR', message: 'The server sent an unreadable reply.' });
  }

  if (!payload.success) {
    throw new ApiError(payload.error);
  }

  return payload.data;
}
