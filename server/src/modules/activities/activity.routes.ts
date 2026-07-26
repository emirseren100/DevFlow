import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseQuery } from '../../lib/parseQuery.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import { projectContext, requireProject } from '../projects/project.authorization.js';
import { requireWorkspaceMember, workspaceContext } from '../workspaces/workspace.authorization.js';
import { listActivitiesQuerySchema } from './activity.schemas.js';
import { listIssueActivities, listProjectActivities } from './activity.service.js';

export const activityRouter = Router();

const PROJECT_BASE = '/workspaces/:workspaceId/projects/:projectId';

/** Reading a feed is a plain member action; writing rows is done by services. */
const projectMember = [attachSession, requireAuth, requireWorkspaceMember, requireProject];

activityRouter.get(
  `${PROJECT_BASE}/activities`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseQuery(listActivitiesQuerySchema, req.query);
      const result = await listProjectActivities(
        workspaceContext(req).workspaceId,
        projectContext(req),
        query,
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);

activityRouter.get(
  `${PROJECT_BASE}/issues/:issueId/activities`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = parseQuery(listActivitiesQuerySchema, req.query);
      const result = await listIssueActivities(
        workspaceContext(req).workspaceId,
        projectContext(req),
        pathParam(req, 'issueId'),
        query,
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
);
