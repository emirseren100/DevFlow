import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import { findIssueRef } from '../issues/issue.service.js';
import type { ProjectContext } from '../projects/project.types.js';
import { assertCanDeleteComment, assertCanEditComment, commentPermissions } from './comment.authorization.js';
import type { CreateCommentInput, UpdateCommentInput } from './comment.schemas.js';
import type { CommentResponse } from './comment.types.js';

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  // Only the three safe profile fields. The password credential and the
  // sessions live in other tables, so they cannot be selected by accident.
  author: { select: { id: true, name: true, email: true } },
} as const;

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  author: { id: string; name: string; email: string };
};

/**
 * `updatedAt` is written on every save, so it is a few milliseconds past
 * `createdAt` even for a brand new comment. One second of tolerance keeps the
 * "edited" marker for real edits only.
 */
const EDIT_TOLERANCE_MS = 1000;

function toResponse(
  comment: CommentRow,
  role: WorkspaceRole,
  actorId: string,
): CommentResponse {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited:
      comment.updatedAt.getTime() - comment.createdAt.getTime() > EDIT_TOLERANCE_MS,
    author: comment.author,
    permissions: commentPermissions(role, actorId, comment.authorId),
  };
}

/**
 * Loads one comment of one issue.
 *
 * `issueId` is part of the filter, so a comment id copied from another issue
 * gives 404 instead of being edited or deleted through the wrong URL.
 */
async function findCommentRow(issueId: string, commentId: string): Promise<CommentRow> {
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, issueId },
    select: commentSelect,
  });

  if (!comment) {
    throw ApiError.commentNotFound();
  }

  return comment;
}

export async function listComments(
  project: ProjectContext,
  issueId: string,
  role: WorkspaceRole,
  actorId: string,
): Promise<CommentResponse[]> {
  const issue = await findIssueRef(project.projectId, issueId);

  const comments = await prisma.comment.findMany({
    where: { issueId: issue.id },
    // The id is the tie-breaker, so two comments written in the same
    // millisecond still come back in the same order on every request.
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: commentSelect,
  });

  return comments.map((comment) => toResponse(comment, role, actorId));
}

export async function createComment(
  workspaceId: string,
  project: ProjectContext,
  issueId: string,
  role: WorkspaceRole,
  actorId: string,
  input: CreateCommentInput,
): Promise<CommentResponse> {
  const issue = await findIssueRef(project.projectId, issueId);

  // The comment and its activity row are one unit of work: a feed entry for a
  // comment that was never stored would be a lie.
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: {
        issueId: issue.id,
        // The author is always the signed-in user, never a body field.
        authorId: actorId,
        body: input.body,
      },
      select: commentSelect,
    });

    await tx.activityLog.create({
      data: {
        workspaceId,
        projectId: project.projectId,
        issueId: issue.id,
        actorId,
        type: 'COMMENT_CREATED',
        // Only the id: the feed links to the comment, it does not copy it.
        metadata: { commentId: created.id },
      },
    });

    return created;
  });

  return toResponse(comment, role, actorId);
}

/** Editing is the author's own voice, so no role can take it over. */
export async function updateComment(
  project: ProjectContext,
  issueId: string,
  commentId: string,
  role: WorkspaceRole,
  actorId: string,
  input: UpdateCommentInput,
): Promise<CommentResponse> {
  const issue = await findIssueRef(project.projectId, issueId);
  const existing = await findCommentRow(issue.id, commentId);

  assertCanEditComment(actorId, existing.authorId);

  const updated = await prisma.comment.update({
    where: { id: existing.id },
    data: { body: input.body },
    select: commentSelect,
  });

  return toResponse(updated, role, actorId);
}

/** Deletion removes the row; the issue itself is never touched. */
export async function deleteComment(
  project: ProjectContext,
  issueId: string,
  commentId: string,
  role: WorkspaceRole,
  actorId: string,
): Promise<void> {
  const issue = await findIssueRef(project.projectId, issueId);
  const existing = await findCommentRow(issue.id, commentId);

  assertCanDeleteComment(role, actorId, existing.authorId);

  await prisma.comment.delete({ where: { id: existing.id } });
}
