import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { parseQuery } from '../../lib/parseQuery.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import type { SafeUser } from '../auth/auth.types.js';
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  workspaceContext,
} from '../workspaces/workspace.authorization.js';
import { projectContext, requireProject } from './project.authorization.js';
import {
  createProjectSchema,
  deleteProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './project.schemas.js';
import {
  createProject,
  deleteProject,
  getProjectDetail,
  listProjects,
  updateProject,
} from './project.service.js';

export const projectRouter = Router();

function currentUser(req: Request): SafeUser {
  if (!req.user) {
    throw new Error('currentUser called on a route without requireAuth.');
  }

  return req.user;
}

/** Signed in, and a real member of the workspace named in the URL. */
const workspaceMember = [attachSession, requireAuth, requireWorkspaceMember];

/** The same, narrowed to the two roles that may manage projects. */
const workspaceAdmin = [...workspaceMember, requireWorkspaceAdmin];

projectRouter.get(
  '/workspaces/:workspaceId/projects',
  workspaceMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const query = parseQuery(listProjectsQuerySchema, req.query);
      const projects = await listProjects(workspaceId, role, query);

      res.json({ success: true, data: { projects } });
    } catch (error) {
      next(error);
    }
  },
);

projectRouter.post(
  '/workspaces/:workspaceId/projects',
  workspaceAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const input = parseBody(createProjectSchema, req.body);
      const project = await createProject(workspaceId, currentUser(req).id, role, input);

      res.status(201).json({ success: true, data: { project } });
    } catch (error) {
      next(error);
    }
  },
);

projectRouter.get(
  '/workspaces/:workspaceId/projects/:projectId',
  [...workspaceMember, requireProject],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await getProjectDetail(projectContext(req).projectId, workspaceContext(req).role);

      res.json({ success: true, data: { project } });
    } catch (error) {
      next(error);
    }
  },
);

projectRouter.patch(
  '/workspaces/:workspaceId/projects/:projectId',
  [...workspaceAdmin, requireProject],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseBody(updateProjectSchema, req.body);
      const project = await updateProject(
        projectContext(req).projectId,
        workspaceContext(req).role,
        input,
      );

      res.json({ success: true, data: { project } });
    } catch (error) {
      next(error);
    }
  },
);

projectRouter.delete(
  '/workspaces/:workspaceId/projects/:projectId',
  [...workspaceAdmin, requireProject],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      parseBody(deleteProjectSchema, req.body);
      await deleteProject(projectContext(req).projectId);

      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
);
