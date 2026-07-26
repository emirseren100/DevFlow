import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import type { CommentPermissions } from './comment.types.js';

/**
 * Comment authorization.
 *
 * Workspace membership already decided who may read and write comments at all.
 * These rules decide what may happen to one existing comment, and they are
 * deliberately asymmetric:
 *
 * - editing is the author's own voice, so only the author may rewrite it, not
 *   even an OWNER or an ADMIN;
 * - deleting is moderation, so the author plus the two managing roles may do it.
 *
 * The author id always comes from the stored row, never from the request.
 */
export function canEditComment(actorId: string, authorId: string): boolean {
  return actorId === authorId;
}

export function canDeleteComment(
  role: WorkspaceRole,
  actorId: string,
  authorId: string,
): boolean {
  return actorId === authorId || role === 'OWNER' || role === 'ADMIN';
}

export function commentPermissions(
  role: WorkspaceRole,
  actorId: string,
  authorId: string,
): CommentPermissions {
  return {
    canEdit: canEditComment(actorId, authorId),
    canDelete: canDeleteComment(role, actorId, authorId),
  };
}

export function assertCanEditComment(actorId: string, authorId: string): void {
  if (!canEditComment(actorId, authorId)) {
    throw ApiError.forbidden('You may only edit your own comments.');
  }
}

export function assertCanDeleteComment(
  role: WorkspaceRole,
  actorId: string,
  authorId: string,
): void {
  if (!canDeleteComment(role, actorId, authorId)) {
    throw ApiError.forbidden('You may only delete your own comments.');
  }
}
