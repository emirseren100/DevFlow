import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { parseBody } from '../../lib/parseBody.js';
import { pathParam } from '../../lib/pathParam.js';
import { attachSession, requireAuth } from '../auth/auth.middleware.js';
import { projectContext, requireProject } from '../projects/project.authorization.js';
import { requireWorkspaceMember, workspaceContext } from '../workspaces/workspace.authorization.js';
import { createCommentSchema, updateCommentSchema } from './comment.schemas.js';
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from './comment.service.js';

export const commentRouter = Router();

const BASE = '/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments';

/**
 * Every comment route walks the whole chain: a valid session, a membership in
 * the workspace from the URL, and a project that really belongs to that
 * workspace. The service then proves that the issue belongs to that project and
 * that the comment belongs to that issue.
 */
const projectMember = [attachSession, requireAuth, requireWorkspaceMember, requireProject];

function actorId(req: Request): string {
  if (!req.user) {
    throw new Error('actorId called on a route without requireAuth.');
  }

  return req.user.id;
}

commentRouter.get(BASE, projectMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await listComments(
      projectContext(req),
      pathParam(req, 'issueId'),
      workspaceContext(req).role,
      actorId(req),
    );

    res.json({ success: true, data: { comments } });
  } catch (error) {
    next(error);
  }
});

commentRouter.post(BASE, projectMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, role } = workspaceContext(req);
    const input = parseBody(createCommentSchema, req.body);
    const comment = await createComment(
      workspaceId,
      projectContext(req),
      pathParam(req, 'issueId'),
      role,
      actorId(req),
      input,
    );

    res.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
});

commentRouter.patch(
  `${BASE}/:commentId`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = parseBody(updateCommentSchema, req.body);
      const comment = await updateComment(
        projectContext(req),
        pathParam(req, 'issueId'),
        pathParam(req, 'commentId'),
        workspaceContext(req).role,
        actorId(req),
        input,
      );

      res.json({ success: true, data: { comment } });
    } catch (error) {
      next(error);
    }
  },
);

commentRouter.delete(
  `${BASE}/:commentId`,
  projectMember,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteComment(
        projectContext(req),
        pathParam(req, 'issueId'),
        pathParam(req, 'commentId'),
        workspaceContext(req).role,
        actorId(req),
      );

      res.json({ success: true, data: { deleted: true } });
    } catch (error) {
      next(error);
    }
  },
);
