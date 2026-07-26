import type { SafeUser } from '../auth/auth.types.js';

/** What the current user may do with one particular comment. */
export interface CommentPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Everything the client is allowed to see about a comment. The author is a safe
 * user summary, never the full user row.
 */
export interface CommentResponse {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  /** True once the body was changed after the comment was written. */
  isEdited: boolean;
  author: SafeUser;
  permissions: CommentPermissions;
}
