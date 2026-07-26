import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import { requireWorkspaceMember, workspaceContext } from '../workspaces/workspace.authorization.js';
import { getWorkspaceDashboard } from './dashboard.service.js';

export const dashboardRouter = Router();

/**
 * One read-only endpoint. Every workspace member may see the summary of their
 * own workspace; `requireWorkspaceMember` answers 404 for an unknown workspace
 * and 403 for an outsider, exactly like every other workspace route.
 */
dashboardRouter.get(
  '/workspaces/:workspaceId/dashboard',
  [attachSession, requireAuth, requireWorkspaceMember],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);

      if (!req.user) {
        throw new Error('dashboard route reached without requireAuth.');
      }

      const dashboard = await getWorkspaceDashboard(workspaceId, role, req.user.id);

      res.json({ success: true, data: { dashboard } });
    } catch (error) {
      next(error);
    }
  },
);
