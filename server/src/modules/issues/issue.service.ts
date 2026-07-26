import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import type { ProjectContext } from '../projects/project.types.js';
import { issuePermissions } from './issue.authorization.js';
import type { CreateIssueInput, ListIssuesQuery, UpdateIssueInput } from './issue.schemas.js';
import type { IssueDetail, IssueListResult, IssueRef, IssueSummary } from './issue.types.js';

const safeUserSelect = { id: true, name: true, email: true } as const;

const sprintRefSelect = { id: true, name: true, status: true } as const;

/**
 * One select for lists and one row shape for both endpoints. The reporter,
 * assignee and sprint are joined here, so a list of twenty issues is still a
 * single query instead of twenty extra lookups.
 */
const issueSelect = {
  id: true,
  number: true,
  title: true,
  description: true,
  type: true,
  status: true,
  priority: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  reporterId: true,
  assigneeId: true,
  reporter: { select: safeUserSelect },
  assignee: { select: safeUserSelect },
  sprint: { select: sprintRefSelect },
} as const;

type IssueRow = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: IssueSummary['type'];
  status: IssueSummary['status'];
  priority: IssueSummary['priority'];
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reporterId: string;
  assigneeId: string | null;
  reporter: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string } | null;
  sprint: { id: string; name: string; status: string } | null;
};

/** "API" + 14 becomes "API-14". The key is the only place this lives. */
export function displayKey(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}

function toSummary(issue: IssueRow, projectKey: string): IssueSummary {
  return {
    id: issue.id,
    number: issue.number,
    displayKey: displayKey(projectKey, issue.number),
    title: issue.title,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    reporter: issue.reporter,
    assignee: issue.assignee,
    sprint: issue.sprint,
    dueDate: issue.dueDate,
    updatedAt: issue.updatedAt,
  };
}

/**
 * Lets people search with what they see on screen: "14", "API-14" or "api-14"
 * all find issue number 14. Anything else is treated as plain text.
 */
function searchedNumber(search: string, projectKey: string): number | null {
  const withoutKey = search.replace(new RegExp(`^${projectKey}-`, 'i'), '');

  if (!/^\d{1,9}$/.test(withoutKey)) {
    return null;
  }

  return Number(withoutKey);
}

export async function listIssues(
  project: ProjectContext,
  query: ListIssuesQuery,
): Promise<IssueListResult> {
  const search = query.search?.trim();
  const number = search ? searchedNumber(search, project.key) : null;

  const where = {
    projectId: project.projectId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.reporterId ? { reporterId: query.reporterId } : {}),
    ...(query.sprintId ? { sprintId: query.sprintId } : {}),
    // "unassigned" wins over an assignee id: asking for both is contradictory.
    ...(query.unassigned
      ? { assigneeId: null }
      : query.assigneeId
        ? { assigneeId: query.assigneeId }
        : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            ...(number === null ? [] : [{ number }]),
          ],
        }
      : {}),
  };

  // The count and the page are two queries, never one query per row.
  const [total, issues] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.findMany({
      where,
      // The issue number is the final tie-breaker, so a page is never ambiguous
      // when two issues share the same updatedAt.
      orderBy: [{ [query.sort]: query.order }, { number: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: issueSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  const filters: Record<string, string | boolean> = {
    ...(search ? { search } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assigneeId && !query.unassigned ? { assigneeId: query.assigneeId } : {}),
    ...(query.reporterId ? { reporterId: query.reporterId } : {}),
    ...(query.sprintId ? { sprintId: query.sprintId } : {}),
    ...(query.unassigned ? { unassigned: true } : {}),
  };

  return {
    issues: issues.map((issue) => toSummary(issue, project.key)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    },
    filters,
  };
}

/**
 * An assignee has to be a current member of the workspace that owns the issue.
 * A registered user from somewhere else is rejected, so a hand-made request can
 * never park work on an outsider.
 */
async function assertAssigneeIsMember(
  workspaceId: string,
  assigneeId: string | null | undefined,
): Promise<void> {
  if (!assigneeId) {
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
    select: { id: true },
  });

  if (!membership) {
    throw ApiError.invalidAssignee();
  }
}

/** A sprint belongs to exactly one project, and it must be this one. */
async function assertSprintInProject(
  projectId: string,
  sprintId: string | null | undefined,
): Promise<void> {
  if (!sprintId) {
    return;
  }

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });

  if (!sprint) {
    throw ApiError.invalidSprint();
  }
}

async function findIssueRow(projectId: string, issueId: string): Promise<IssueRow> {
  const issue = await prisma.issue.findFirst({
    // projectId is part of the filter, so an issue id from another project can
    // never be reached through this project's URL.
    where: { id: issueId, projectId },
    select: issueSelect,
  });

  if (!issue) {
    throw ApiError.issueNotFound();
  }

  return issue;
}

/**
 * Minimal issue lookup shared by the comment, activity and Kanban modules.
 *
 * `projectId` is part of the filter, so an issue id that belongs to another
 * project can never be reached through this project's URL.
 */
export async function findIssueRef(projectId: string, issueId: string): Promise<IssueRef> {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      position: true,
      reporterId: true,
      assigneeId: true,
    },
  });

  if (!issue) {
    throw ApiError.issueNotFound();
  }

  return issue;
}

function toDetail(
  issue: IssueRow,
  project: ProjectContext,
  role: WorkspaceRole,
  actorId: string,
): IssueDetail {
  return {
    ...toSummary(issue, project.key),
    description: issue.description,
    project: {
      id: project.projectId,
      name: project.name,
      key: project.key,
      status: project.status,
    },
    permissions: issuePermissions(role, actorId, issue),
    createdAt: issue.createdAt,
  };
}

export async function getIssueDetail(
  project: ProjectContext,
  issueId: string,
  role: WorkspaceRole,
  actorId: string,
): Promise<IssueDetail> {
  return toDetail(await findIssueRow(project.projectId, issueId), project, role, actorId);
}

/**
 * Creates an issue and gives it the next number of its project.
 *
 * The counter lives on the project row. Incrementing it inside the transaction
 * makes PostgreSQL lock that row, so a second request that arrives at the same
 * moment waits and receives the following number. Counting existing issues
 * instead would let two requests read the same total and write the same number.
 */
export async function createIssue(
  workspaceId: string,
  project: ProjectContext,
  role: WorkspaceRole,
  actorId: string,
  input: CreateIssueInput,
): Promise<IssueDetail> {
  await assertAssigneeIsMember(workspaceId, input.assigneeId);
  await assertSprintInProject(project.projectId, input.sprintId);

  const issue = await prisma.$transaction(async (tx) => {
    const counter = await tx.project.update({
      where: { id: project.projectId },
      data: { nextIssueNumber: { increment: 1 } },
      select: { nextIssueNumber: true },
    });

    // update returns the value *after* the increment, so the number this issue
    // may use is the one just before it.
    const number = counter.nextIssueNumber - 1;

    // Phase 6: `position` orders a Kanban column, so a new issue lands at the
    // end of the column it starts in. Counting inside the same transaction is
    // enough here; the board query breaks any remaining tie by issue number.
    const position = await tx.issue.count({
      where: { projectId: project.projectId, status: input.status },
    });

    const created = await tx.issue.create({
      data: {
        projectId: project.projectId,
        number,
        // The reporter is always the signed-in user, never a body field.
        reporterId: actorId,
        title: input.title,
        type: input.type,
        status: input.status,
        priority: input.priority,
        position,
        ...(input.description ? { description: input.description } : {}),
        ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
        ...(input.sprintId ? { sprintId: input.sprintId } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      },
      select: issueSelect,
    });

    await tx.activityLog.create({
      data: {
        workspaceId,
        projectId: project.projectId,
        issueId: created.id,
        actorId,
        type: 'ISSUE_CREATED',
        metadata: { number },
      },
    });

    return created;
  });

  return toDetail(issue, project, role, actorId);
}

export async function updateIssue(
  workspaceId: string,
  project: ProjectContext,
  issueId: string,
  role: WorkspaceRole,
  actorId: string,
  input: UpdateIssueInput,
): Promise<IssueDetail> {
  const current = await findIssueRow(project.projectId, issueId);

  if (input.assigneeId !== undefined) {
    await assertAssigneeIsMember(workspaceId, input.assigneeId);
  }

  if (input.sprintId !== undefined) {
    await assertSprintInProject(project.projectId, input.sprintId);
  }

  const statusChanged = input.status !== undefined && input.status !== current.status;
  const assigneeChanged =
    input.assigneeId !== undefined && (input.assigneeId ?? null) !== current.assigneeId;

  // Only fields that really differ count as a change, so re-saving a form
  // without touching anything writes no activity row at all.
  const changedFields = [
    ...(input.title !== undefined && input.title !== current.title ? ['title'] : []),
    ...(input.description !== undefined && (input.description ?? null) !== current.description
      ? ['description']
      : []),
    ...(input.type !== undefined && input.type !== current.type ? ['type'] : []),
    ...(input.priority !== undefined && input.priority !== current.priority ? ['priority'] : []),
    ...(input.sprintId !== undefined && (input.sprintId ?? null) !== (current.sprint?.id ?? null)
      ? ['sprintId']
      : []),
    ...(input.dueDate !== undefined &&
    (input.dueDate?.getTime() ?? null) !== (current.dueDate?.getTime() ?? null)
      ? ['dueDate']
      : []),
  ];

  const issue = await prisma.$transaction(async (tx) => {
    // A status change through this endpoint also moves the issue to the end of
    // its new Kanban column, so `position` never keeps a value that belonged to
    // a different column. Reordering inside a column is the /move endpoint.
    const position =
      statusChanged && input.status !== undefined
        ? await tx.issue.count({
            where: { projectId: project.projectId, status: input.status, id: { not: current.id } },
          })
        : undefined;

    const updated = await tx.issue.update({
      where: { id: current.id },
      // Only the fields listed here can move. The number, the reporter, the
      // project and the workspace are not among them.
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(position === undefined ? {} : { position }),
        ...(input.priority === undefined ? {} : { priority: input.priority }),
        ...(input.assigneeId === undefined ? {} : { assigneeId: input.assigneeId }),
        ...(input.sprintId === undefined ? {} : { sprintId: input.sprintId }),
        ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
      },
      select: issueSelect,
    });

    const events = [
      ...(statusChanged
        ? [
            {
              type: 'ISSUE_STATUS_CHANGED' as const,
              metadata: { previousStatus: current.status, nextStatus: updated.status },
            },
          ]
        : []),
      ...(assigneeChanged
        ? [
            {
              type: 'ISSUE_ASSIGNED' as const,
              metadata: {
                previousAssigneeId: current.assigneeId,
                nextAssigneeId: updated.assigneeId,
              },
            },
          ]
        : []),
      ...(changedFields.length > 0
        ? [{ type: 'ISSUE_UPDATED' as const, metadata: { changedFields } }]
        : []),
    ];

    for (const event of events) {
      await tx.activityLog.create({
        data: {
          workspaceId,
          projectId: project.projectId,
          issueId: updated.id,
          actorId,
          type: event.type,
          metadata: event.metadata,
        },
      });
    }

    return updated;
  });

  return toDetail(issue, project, role, actorId);
}

/** Permanent: comments of the issue cascade with it, the project does not. */
export async function deleteIssue(projectId: string, issueId: string): Promise<void> {
  const issue = await findIssueRow(projectId, issueId);

  await prisma.issue.delete({ where: { id: issue.id } });
}
