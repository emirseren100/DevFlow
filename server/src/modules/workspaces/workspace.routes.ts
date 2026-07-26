import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import type { SafeUser } from '../auth/auth.types.js';
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  workspaceContext,
} from './workspace.authorization.js';
import {
  addMemberSchema,
  createWorkspaceSchema,
  updateMemberRoleSchema,
  updateWorkspaceSchema,
} from './workspace.schemas.js';
import {
  addMember,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetail,
  listMembers,
  listWorkspacesForUser,
  removeMember,
  updateMemberRole,
  updateWorkspaceName,
} from './workspace.service.js';

export const workspaceRouter = Router();

/** Guaranteed by requireAuth; keeps the handlers free of null checks. */
function currentUser(req: Request): SafeUser {
  if (!req.user) {
    throw new Error('currentUser called on a route without requireAuth.');
  }

  return req.user;
}

/**
 * Every workspace route needs a signed-in user. This is attached per route, not
 * with `router.use`, so a request for an unknown path still reaches the shared
 * 404 handler instead of being answered with 401.
 */
const authenticated = [attachSession, requireAuth];

workspaceRouter.get(
  '/workspaces',
  authenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaces = await listWorkspacesForUser(currentUser(req).id);

      res.json({ success: true, data: { workspaces } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.post(
  '/workspaces',
  authenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseBody(createWorkspaceSchema, req.body);
      const workspace = await createWorkspace(currentUser(req), input.name);

      res.status(201).json({ success: true, data: { workspace } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.get(
  '/workspaces/:workspaceId',
  authenticated,
  requireWorkspaceMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const workspace = await getWorkspaceDetail(workspaceId, role);

      res.json({ success: true, data: { workspace } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.patch(
  '/workspaces/:workspaceId',
  authenticated,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const input = parseBody(updateWorkspaceSchema, req.body);
      const workspace = await updateWorkspaceName(workspaceId, input.name, role);

      res.json({ success: true, data: { workspace } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.delete(
  '/workspaces/:workspaceId',
  authenticated,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWorkspace(workspaceContext(req).workspaceId);

      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.get(
  '/workspaces/:workspaceId/members',
  authenticated,
  requireWorkspaceMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await listMembers(workspaceContext(req).workspaceId);

      res.json({ success: true, data: { members } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.post(
  '/workspaces/:workspaceId/members',
  authenticated,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const input = parseBody(addMemberSchema, req.body);
      const member = await addMember(workspaceId, role, currentUser(req).id, input);

      res.status(201).json({ success: true, data: { member } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.patch(
  '/workspaces/:workspaceId/members/:memberId',
  authenticated,
  requireWorkspaceMember,
  requireWorkspaceOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = workspaceContext(req);
      const input = parseBody(updateMemberRoleSchema, req.body);
      const member = await updateMemberRole(workspaceId, pathParam(req, 'memberId'), input.role);

      res.json({ success: true, data: { member } });
    } catch (error) {
      next(error);
    }
  },
);

workspaceRouter.delete(
  '/workspaces/:workspaceId/members/:memberId',
  authenticated,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);

      await removeMember(workspaceId, pathParam(req, 'memberId'), role, currentUser(req).id);

      res.json({ success: true, data: { removed: true } });
    } catch (error) {
      next(error);
    }
  },
);
