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

  /** The user is signed in but may not perform this action. */
  static forbidden(message = 'You are not allowed to perform this action.'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static workspaceNotFound(): ApiError {
    return new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found.');
  }

  static memberNotFound(): ApiError {
    return new ApiError(404, 'MEMBER_NOT_FOUND', 'Member not found in this workspace.');
  }

  static userNotFound(): ApiError {
    return new ApiError(404, 'USER_NOT_FOUND', 'No registered user has this email address.');
  }

  static alreadyMember(): ApiError {
    return new ApiError(409, 'ALREADY_MEMBER', 'This user is already a workspace member.');
  }

  static invalidRole(message = 'This role change is not allowed.'): ApiError {
    return new ApiError(400, 'INVALID_ROLE', message);
  }

  static ownerMembershipImmutable(): ApiError {
    return new ApiError(
      403,
      'OWNER_MEMBERSHIP_IMMUTABLE',
      'The owner membership cannot be changed or removed.',
    );
  }

  static selfRemovalNotAllowed(): ApiError {
    return new ApiError(
      403,
      'SELF_REMOVAL_NOT_ALLOWED',
      'You cannot remove your own membership through member management.',
    );
  }
}
