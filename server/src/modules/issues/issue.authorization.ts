import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import type { IssuePermissions } from './issue.types.js';

/**
 * Issue authorization.
 *
 * Workspace membership already decided who may *see* the project. These rules
 * decide who may change one particular issue, and they depend on the row
 * itself: a plain member may edit the issue they reported or the issue that is
 * currently assigned to them, and nothing else.
 */
export function canUpdateIssue(
  role: WorkspaceRole,
  actorId: string,
  issue: { reporterId: string; assigneeId: string | null },
): boolean {
  if (role === 'OWNER' || role === 'ADMIN') {
    return true;
  }

  return issue.reporterId === actorId || issue.assigneeId === actorId;
}

/** Deletion stays with the two roles that manage the workspace. */
export function canDeleteIssue(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function issuePermissions(
  role: WorkspaceRole,
  actorId: string,
  issue: { reporterId: string; assigneeId: string | null },
): IssuePermissions {
  return {
    canUpdate: canUpdateIssue(role, actorId, issue),
    canDelete: canDeleteIssue(role),
  };
}

export function assertCanUpdateIssue(
  role: WorkspaceRole,
  actorId: string,
  issue: { reporterId: string; assigneeId: string | null },
): void {
  if (!canUpdateIssue(role, actorId, issue)) {
    throw ApiError.forbidden('You may only update issues you reported or are assigned to.');
  }
}
