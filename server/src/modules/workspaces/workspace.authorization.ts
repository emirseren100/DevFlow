import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { pathParam } from '../../lib/pathParam.js';
import { prisma } from '../../lib/prisma.js';
import './workspace.types.js';

/**
 * Workspace authorization.
 *
 * Authentication already answered "who is the user?". These helpers answer the
 * separate question "what may this user do *inside this workspace*?".
 *
 * The role is always read from PostgreSQL. A role sent by the client is never
 * trusted, because anyone can craft a request by hand.
 */

/**
 * Loads the workspace and the caller's own membership in one query.
 *
 * A workspace that does not exist gives 404. A workspace that exists but does
 * not include the caller gives 403 — the same answer for every outsider, so the
 * response never depends on what is inside the workspace.
 */
export const requireWorkspaceMember: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user) {
      throw ApiError.unauthenticated();
    }

    const workspaceId = pathParam(req, 'workspaceId');

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, members: { where: { userId: user.id }, select: { id: true, role: true } } },
    });

    if (!workspace) {
      throw ApiError.workspaceNotFound();
    }

    const membership = workspace.members[0];

    if (!membership) {
      throw ApiError.forbidden('You are not a member of this workspace.');
    }

    req.workspace = {
      workspaceId: workspace.id,
      role: membership.role,
      membershipId: membership.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/** Runs after requireWorkspaceMember and narrows the allowed roles. */
function requireWorkspaceRole(...allowed: WorkspaceRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const context = req.workspace;

    if (!context) {
      next(ApiError.forbidden());
      return;
    }

    if (!allowed.includes(context.role)) {
      next(ApiError.forbidden());
      return;
    }

    next();
  };
}

/** Workspace administration: renaming and member management. */
export const requireWorkspaceAdmin = requireWorkspaceRole('OWNER', 'ADMIN');

/** Destructive or ownership-level actions. */
export const requireWorkspaceOwner = requireWorkspaceRole('OWNER');

/** Guaranteed by requireWorkspaceMember; keeps route code free of null checks. */
export function workspaceContext(req: Request) {
  const context = req.workspace;

  if (!context) {
    throw ApiError.forbidden();
  }

  return context;
}

/**
 * An OWNER may hand out ADMIN or MEMBER. An ADMIN may only hand out MEMBER, so
 * an admin can never create a peer who could then act against them.
 */
export function assertCanAssignRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole): void {
  if (actorRole === 'OWNER') {
    return;
  }

  if (actorRole === 'ADMIN' && targetRole === 'MEMBER') {
    return;
  }

  throw ApiError.forbidden('You are not allowed to add a member with this role.');
}

/** Mirror rule for removal: an ADMIN may only remove plain members. */
export function assertCanRemoveMember(actorRole: WorkspaceRole, targetRole: WorkspaceRole): void {
  if (actorRole === 'OWNER' && targetRole !== 'OWNER') {
    return;
  }

  if (actorRole === 'ADMIN' && targetRole === 'MEMBER') {
    return;
  }

  throw ApiError.forbidden('You are not allowed to remove this member.');
}
