// Same convention as HealthStatus: the base URL already ends with /api.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Thrown for every non-successful response, so callers handle one error type.
 *
 * `status` is the HTTP status and `code` the stable server error code. Both are
 * kept, because the UI decides what to show from the status (403 is a
 * permission screen, 404 a missing resource) while the code is what a developer
 * needs when troubleshooting.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(body: ApiErrorBody, status = 0) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
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

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Lets a caller (or TanStack Query) cancel a request that is no longer needed. */
  signal?: AbortSignal;
}

/**
 * The one place that talks to the API.
 *
 * `credentials: 'include'` makes the browser send and store the session cookie.
 * No token is ever kept in JavaScript, so there is nothing here to read from
 * localStorage.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch (error) {
    // A cancelled request is not a failure; it must not become an error screen.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError({ code: 'NETWORK_ERROR', message: 'The server could not be reached.' });
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!payload) {
    throw new ApiError(
      { code: 'NETWORK_ERROR', message: 'The server sent an unreadable reply.' },
      response.status,
    );
  }

  if (!payload.success) {
    throw new ApiError(payload.error, response.status);
  }

  return payload.data;
}

/**
 * Options for a GET whose only extra is an optional cancellation signal.
 *
 * `exactOptionalPropertyTypes` forbids passing `signal: undefined`, so the key
 * is left out entirely when there is no signal.
 */
export function get(signal?: AbortSignal): RequestOptions {
  return signal ? { signal } : {};
}

/** One readable sentence for any thrown value, never a stack trace. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

/** HTTP status of a failed request, or 0 when the request never arrived. */
export function errorStatus(error: unknown): number {
  return error instanceof ApiError ? error.status : 0;
}
