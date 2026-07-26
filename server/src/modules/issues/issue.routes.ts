import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { parseQuery } from '../../lib/parseQuery.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import type { SafeUser } from '../auth/auth.types.js';
import { projectContext, requireProject } from '../projects/project.authorization.js';
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  workspaceContext,
} from '../workspaces/workspace.authorization.js';
import { assertCanUpdateIssue } from './issue.authorization.js';
import { createIssueSchema, listIssuesQuerySchema, updateIssueSchema } from './issue.schemas.js';
import {
  createIssue,
  deleteIssue,
  getIssueDetail,
  listIssues,
  updateIssue,
} from './issue.service.js';

export const issueRouter = Router();

const BASE = '/workspaces/:workspaceId/projects/:projectId/issues';

function currentUser(req: Request): SafeUser {
  if (!req.user) {
    throw new Error('currentUser called on a route without requireAuth.');
  }

  return req.user;
}

/** Every issue route needs a workspace member and a project in that workspace. */
const projectMember = [attachSession, requireAuth, requireWorkspaceMember, requireProject];

/** Deleting an issue is an OWNER and ADMIN action. */
const projectAdmin = [
  attachSession,
  requireAuth,
  requireWorkspaceMember,
  requireWorkspaceAdmin,
  requireProject,
];

issueRouter.get(BASE, projectMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseQuery(listIssuesQuerySchema, req.query);
    const result = await listIssues(projectContext(req), query);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

issueRouter.post(BASE, projectMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, role } = workspaceContext(req);
    const input = parseBody(createIssueSchema, req.body);
    const issue = await createIssue(
      workspaceId,
      projectContext(req),
      role,
      currentUser(req).id,
      input,
    );

    res.status(201).json({ success: true, data: { issue } });
  } catch (error) {
    next(error);
  }
});

issueRouter.get(
  `${BASE}/:issueId`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const issue = await getIssueDetail(
        projectContext(req),
        pathParam(req, 'issueId'),
        workspaceContext(req).role,
        currentUser(req).id,
      );

      res.json({ success: true, data: { issue } });
    } catch (error) {
      next(error);
    }
  },
);

issueRouter.patch(
  `${BASE}/:issueId`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const project = projectContext(req);
      const actorId = currentUser(req).id;
      const input = parseBody(updateIssueSchema, req.body);

      // Who may edit depends on the row itself, so the issue is read first and
      // the permission is checked against the reporter and the assignee.
      const existing = await getIssueDetail(project, pathParam(req, 'issueId'), role, actorId);

      assertCanUpdateIssue(role, actorId, {
        reporterId: existing.reporter.id,
        assigneeId: existing.assignee?.id ?? null,
      });

      const issue = await updateIssue(workspaceId, project, existing.id, role, actorId, input);

      res.json({ success: true, data: { issue } });
    } catch (error) {
      next(error);
    }
  },
);

issueRouter.delete(
  `${BASE}/:issueId`,
  projectAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteIssue(projectContext(req).projectId, pathParam(req, 'issueId'));

      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
);
