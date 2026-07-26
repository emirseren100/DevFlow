import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import { projectContext, requireProject } from '../projects/project.authorization.js';
import { requireWorkspaceMember, workspaceContext } from '../workspaces/workspace.authorization.js';
import { moveIssueSchema } from './kanban.schemas.js';
import { getBoard, moveIssue } from './kanban.service.js';

export const kanbanRouter = Router();

const PROJECT_BASE = '/workspaces/:workspaceId/projects/:projectId';

const projectMember = [attachSession, requireAuth, requireWorkspaceMember, requireProject];

function actorId(req: Request): string {
  if (!req.user) {
    throw new Error('actorId called on a route without requireAuth.');
  }

  return req.user.id;
}

/** Every workspace member may read the board; the cards carry their own flags. */
kanbanRouter.get(
  `${PROJECT_BASE}/board`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = workspaceContext(req);
      const board = await getBoard(projectContext(req), role, actorId(req));

      res.json({ success: true, data: { board } });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * The single endpoint that changes a status and an order. The response is the
 * confirmed board, so the client never has to guess what the server decided.
 */
kanbanRouter.patch(
  `${PROJECT_BASE}/issues/:issueId/move`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, role } = workspaceContext(req);
      const input = parseBody(moveIssueSchema, req.body);
      const board = await moveIssue(
        workspaceId,
        projectContext(req),
        pathParam(req, 'issueId'),
        role,
        actorId(req),
        input,
      );

      res.json({ success: true, data: { board } });
    } catch (error) {
      next(error);
    }
  },
);
