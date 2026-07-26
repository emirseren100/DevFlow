/**
 * Error type every route may throw. The error handler turns it into the shared
 * `{ success: false, error: { code, message } }` response, so route code never
 * builds an error response by hand.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (fieldErrors) {
      this.fieldErrors = fieldErrors;
    }
  }

  static validation(fieldErrors: Record<string, string[]>): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', 'Invalid request data.', fieldErrors);
  }

  static emailInUse(): ApiError {
    return new ApiError(409, 'EMAIL_IN_USE', 'This email address is already registered.');
  }

  /** Same message for an unknown email and a wrong password, on purpose. */
  static invalidCredentials(): ApiError {
    return new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  static unauthenticated(): ApiError {
    return new ApiError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }
}
