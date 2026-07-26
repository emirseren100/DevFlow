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

  /** Also used when a project exists but belongs to another workspace. */
  static projectNotFound(): ApiError {
    return new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found in this workspace.');
  }

  static projectKeyInUse(): ApiError {
    return new ApiError(409, 'PROJECT_KEY_IN_USE', 'This project key is already used here.');
  }

  static sprintNotFound(): ApiError {
    return new ApiError(404, 'SPRINT_NOT_FOUND', 'Sprint not found in this project.');
  }

  static sprintHasIssues(): ApiError {
    return new ApiError(
      409,
      'SPRINT_HAS_ISSUES',
      'This sprint still has issues. Move them out before deleting it.',
    );
  }

  static issueNotFound(): ApiError {
    return new ApiError(404, 'ISSUE_NOT_FOUND', 'Issue not found in this project.');
  }

  /** Also used when a comment exists but belongs to another issue. */
  static commentNotFound(): ApiError {
    return new ApiError(404, 'COMMENT_NOT_FOUND', 'Comment not found on this issue.');
  }

  static invalidAssignee(): ApiError {
    return new ApiError(400, 'INVALID_ASSIGNEE', 'The assignee must be a workspace member.');
  }

  static invalidSprint(): ApiError {
    return new ApiError(400, 'INVALID_SPRINT', 'The sprint must belong to the same project.');
  }

  static invalidDateRange(): ApiError {
    return new ApiError(400, 'INVALID_DATE_RANGE', 'The end date cannot be before the start date.');
  }

  static invalidFilter(message = 'This filter value is not supported.'): ApiError {
    return new ApiError(400, 'INVALID_FILTER', message);
  }

  static invalidSort(message = 'This sort field is not supported.'): ApiError {
    return new ApiError(400, 'INVALID_SORT', message);
  }

  /**
   * Too many login or register attempts. The message is deliberately identical
   * for a known and an unknown email, so the limiter never becomes a way to
   * find out which addresses have an account.
   */
  static rateLimited(): ApiError {
    return new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please try again later.');
  }

  /** A state-changing request arrived from an origin that is not the client. */
  static invalidOrigin(): ApiError {
    return new ApiError(403, 'INVALID_ORIGIN', 'This request came from an unexpected origin.');
  }

  static payloadTooLarge(): ApiError {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }

  /** Body that is not the JSON the API contract requires. */
  static malformedJson(): ApiError {
    return new ApiError(400, 'MALFORMED_JSON', 'The request body is not valid JSON.');
  }
}
