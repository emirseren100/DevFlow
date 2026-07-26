import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { parseQuery } from '../../lib/parseQuery.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import { projectContext, requireProject } from '../projects/project.authorization.js';
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
} from '../workspaces/workspace.authorization.js';
import {
  createSprintSchema,
  listSprintsQuerySchema,
  updateSprintSchema,
} from './sprint.schemas.js';
import { createSprint, deleteSprint, listSprints, updateSprint } from './sprint.service.js';

export const sprintRouter = Router();

const BASE = '/workspaces/:workspaceId/projects/:projectId/sprints';

/** Member of the workspace, and the project really lives in that workspace. */
const projectMember = [attachSession, requireAuth, requireWorkspaceMember, requireProject];

/** Sprint management is an OWNER and ADMIN job. */
const projectAdmin = [
  attachSession,
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireProject,
];

sprintRouter.get(BASE, projectMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(listSprintsQuerySchema, req.query);
    const sprints = await listSprints(projectContext(req).projectId, query);

    res.json({ success: true, data: { sprints } });
  } catch (error) {
    next(error);
  }
});

sprintRouter.post(BASE, projectAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseBody(createSprintSchema, req.body);
    const sprint = await createSprint(projectContext(req).projectId, input);

    res.status(201).json({ success: true, data: { sprint } });
  } catch (error) {
    next(error);
  }
});

sprintRouter.patch(
  `${BASE}/:sprintId`,
  projectAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseBody(updateSprintSchema, req.body);
      const sprint = await updateSprint(
        projectContext(req).projectId,
        pathParam(req, 'sprintId'),
        input,
      );

      res.json({ success: true, data: { sprint } });
    } catch (error) {
      next(error);
    }
  },
);

sprintRouter.delete(
  `${BASE}/:sprintId`,
  projectAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteSprint(projectContext(req).projectId, pathParam(req, 'sprintId'));

      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
);
