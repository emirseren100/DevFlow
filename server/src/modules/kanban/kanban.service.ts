import type { IssueStatus, WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import { canUpdateIssue } from '../issues/issue.authorization.js';
import { displayKey, findIssueRef } from '../issues/issue.service.js';
import type { ProjectContext } from '../projects/project.types.js';
import type { MoveIssueInput } from './kanban.schemas.js';
import type { BoardIssue, BoardResult } from './kanban.types.js';

/** Column order of the board. The client renders exactly this order. */
export const BOARD_STATUSES: IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

const boardSelect = {
  id: true,
  number: true,
  title: true,
  type: true,
  status: true,
  priority: true,
  position: true,
  dueDate: true,
  reporterId: true,
  assigneeId: true,
  reporter: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  sprint: { select: { id: true, name: true, status: true } },
} as const;

/** Positions are column-local, so the issue number breaks any remaining tie. */
function boardOrder() {
  return [{ position: 'asc' as const }, { number: 'asc' as const }];
}

/**
 * The whole board is one query.
 *
 * Grouping happens in memory afterwards, which keeps it at a single round trip
 * instead of one query per column and one query per card author.
 */
export async function getBoard(
  project: ProjectContext,
  role: WorkspaceRole,
  actorId: string,
): Promise<BoardResult> {
  const issues = await prisma.issue.findMany({
    where: { projectId: project.projectId },
    orderBy: [{ status: 'asc' }, ...boardOrder()],
    select: boardSelect,
  });

  const cards: BoardIssue[] = issues.map((issue) => ({
    id: issue.id,
    number: issue.number,
    displayKey: displayKey(project.key, issue.number),
    title: issue.title,
    type: issue.type,
    priority: issue.priority,
    status: issue.status,
    position: issue.position,
    assignee: issue.assignee,
    reporter: issue.reporter,
    sprint: issue.sprint,
    dueDate: issue.dueDate,
    permissions: {
      // Moving a card is an issue update, so it follows the same rule.
      canMove: canUpdateIssue(role, actorId, issue),
      canEdit: canUpdateIssue(role, actorId, issue),
    },
  }));

  return {
    project: {
      id: project.projectId,
      name: project.name,
      key: project.key,
      status: project.status,
    },
    columns: BOARD_STATUSES.map((status) => ({
      status,
      issues: cards.filter((card) => card.status === status),
    })),
  };
}

/** Two concurrent moves can conflict; a couple of retries is enough. */
const MAX_MOVE_ATTEMPTS = 3;

/** Prisma reports a serialization failure or a deadlock as P2034. */
function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
}

/**
 * Moves an issue to a status column and to a place inside that column.
 *
 * The client sends only the issue, the target status and the target index. The
 * server reads the real order from PostgreSQL and writes the final positions
 * itself, so a hand-made request cannot invent an ordering for other people's
 * cards. Everything happens in one serializable transaction: a failure leaves
 * the previous order completely untouched.
 */
export async function moveIssue(
  workspaceId: string,
  project: ProjectContext,
  issueId: string,
  role: WorkspaceRole,
  actorId: string,
  input: MoveIssueInput,
): Promise<BoardResult> {
  const issue = await findIssueRef(project.projectId, issueId);

  if (!canUpdateIssue(role, actorId, issue)) {
    throw ApiError.forbidden('You may only move issues you reported or are assigned to.');
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      await runMove(workspaceId, project.projectId, issue.id, actorId, input);
      break;
    } catch (error) {
      if (attempt >= MAX_MOVE_ATTEMPTS || !isTransactionConflict(error)) {
        throw error;
      }
    }
  }

  return getBoard(project, role, actorId);
}

async function runMove(
  workspaceId: string,
  projectId: string,
  issueId: string,
  actorId: string,
  input: MoveIssueInput,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const current = await tx.issue.findFirst({
        where: { id: issueId, projectId },
        select: { id: true, status: true },
      });

      if (!current) {
        throw ApiError.issueNotFound();
      }

      const statusChanged = current.status !== input.targetStatus;

      // The destination column as it really is right now, without the card that
      // is being moved.
      const destination = (
        await tx.issue.findMany({
          where: { projectId, status: input.targetStatus, id: { not: current.id } },
          orderBy: boardOrder(),
          select: { id: true },
        })
      ).map((row) => row.id);

      // Clamped, never rejected: "drop below the last card" is a normal gesture.
      const index = Math.min(input.targetIndex, destination.length);

      destination.splice(index, 0, current.id);

      // Reassigning every position keeps the column contiguous: 0, 1, 2, 3.
      for (const [position, id] of destination.entries()) {
        await tx.issue.update({
          where: { id },
          data: {
            position,
            ...(id === current.id && statusChanged ? { status: input.targetStatus } : {}),
          },
        });
      }

      if (!statusChanged) {
        // A reorder inside one column changes no state worth a feed entry.
        return;
      }

      // The moved issue already left the source column, so this query closes the
      // gap it left behind.
      const source = await tx.issue.findMany({
        where: { projectId, status: current.status },
        orderBy: boardOrder(),
        select: { id: true },
      });

      for (const [position, row] of source.entries()) {
        await tx.issue.update({ where: { id: row.id }, data: { position } });
      }

      await tx.activityLog.create({
        data: {
          workspaceId,
          projectId,
          issueId: current.id,
          actorId,
          // One row for one move: the status change is the meaningful event.
          type: 'ISSUE_STATUS_CHANGED',
          metadata: { previousStatus: current.status, nextStatus: input.targetStatus },
        },
      });
    },
    // Serializable, so two people reordering the same column cannot interleave
    // their reads and write a broken order.
    { isolationLevel: 'Serializable' },
  );
}
