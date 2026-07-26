import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ApiError } from '../../lib/apiError.js';
import { pathParam } from '../../lib/pathParam.js';
import { prisma } from '../../lib/prisma.js';
import './project.types.js';

/**
 * Project authorization.
 *
 * The workspace middleware already proved that the caller is a member of the
 * workspace in the URL. This step proves the second half: that the project in
 * the URL really belongs to *that* workspace.
 *
 * Without it, swapping the workspace id in the address bar would be enough to
 * read another team's project, because the project id alone is a valid key.
 */
export const requireProject: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const workspace = req.workspace;

    if (!workspace) {
      throw ApiError.forbidden();
    }

    const project = await prisma.project.findFirst({
      // workspaceId is part of the filter, never a check afterwards.
      where: { id: pathParam(req, 'projectId'), workspaceId: workspace.workspaceId },
      select: { id: true, key: true, name: true, status: true },
    });

    if (!project) {
      // The same answer for "does not exist" and "belongs to somebody else", so
      // the response never confirms that a foreign project id is real.
      throw ApiError.projectNotFound();
    }

    req.project = {
      projectId: project.id,
      key: project.key,
      name: project.name,
      status: project.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/** Guaranteed by requireProject; keeps route code free of null checks. */
export function projectContext(req: Request) {
  const context = req.project;

  if (!context) {
    throw ApiError.projectNotFound();
  }

  return context;
}
