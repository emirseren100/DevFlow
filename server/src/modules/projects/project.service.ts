import type { IssueStatus, WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import { listSprints } from '../sprints/sprint.service.js';
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from './project.schemas.js';
import type { ProjectDetail, ProjectSummary } from './project.types.js';

/** Columns that are safe to send to a client. Never a hash, never a session. */
const safeUserSelect = { id: true, name: true, email: true } as const;

const projectSelect = {
  id: true,
  name: true,
  key: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Every status an issue can have, so an empty status still reports 0. */
export const ISSUE_STATUSES: IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

/** "Open" simply means not finished; DONE is the only closing status. */
const OPEN_STATUSES = ISSUE_STATUSES.filter((status) => status !== 'DONE');

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Counts issues per project and status with one grouped query instead of one
 * query per project, which is what an N+1 would look like here.
 */
async function issueCountsByProject(
  projectIds: string[],
): Promise<Map<string, Record<string, number>>> {
  const counts = new Map<string, Record<string, number>>();

  if (projectIds.length === 0) {
    return counts;
  }

  const rows = await prisma.issue.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });

  for (const row of rows) {
    const byStatus = counts.get(row.projectId) ?? {};
    byStatus[row.status] = row._count._all;
    counts.set(row.projectId, byStatus);
  }

  return counts;
}

function emptyStatusCounts(): Record<string, number> {
  return Object.fromEntries(ISSUE_STATUSES.map((status) => [status, 0]));
}

function totalOf(byStatus: Record<string, number>, statuses: IssueStatus[]): number {
  return statuses.reduce((total, status) => total + (byStatus[status] ?? 0), 0);
}

export async function listProjects(
  workspaceId: string,
  role: WorkspaceRole,
  query: ListProjectsQuery,
): Promise<ProjectSummary[]> {
  const search = query.search?.trim();

  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      // A short search text is matched against both the readable name and the
      // key, because people look projects up either way.
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { key: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: { [query.sort]: query.order },
    select: projectSelect,
  });

  const counts = await issueCountsByProject(projects.map((project) => project.id));

  return projects.map((project) => {
    const byStatus = counts.get(project.id) ?? {};

    return {
      ...project,
      issueCount: totalOf(byStatus, ISSUE_STATUSES),
      openIssueCount: totalOf(byStatus, OPEN_STATUSES),
      role,
    };
  });
}

export async function getProjectDetail(
  projectId: string,
  role: WorkspaceRole,
): Promise<ProjectDetail> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ...projectSelect, createdBy: { select: safeUserSelect } },
  });

  if (!project) {
    throw ApiError.projectNotFound();
  }

  const counts = await issueCountsByProject([projectId]);
  const byStatus = { ...emptyStatusCounts(), ...(counts.get(projectId) ?? {}) };
  const sprints = await listSprints(projectId);

  return {
    ...project,
    issueCount: totalOf(byStatus, ISSUE_STATUSES),
    openIssueCount: totalOf(byStatus, OPEN_STATUSES),
    issueCountsByStatus: byStatus,
    role,
    sprints,
  };
}

/**
 * Creates the project and its PROJECT_CREATED activity in one transaction.
 *
 * The key was already uppercased by the schema. Two people can still send the
 * same key at the same moment, so the composite unique index is what really
 * prevents a duplicate; the lookup below only produces a friendlier error.
 */
export async function createProject(
  workspaceId: string,
  actorId: string,
  role: WorkspaceRole,
  input: CreateProjectInput,
): Promise<ProjectSummary> {
  const existing = await prisma.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: input.key } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.projectKeyInUse();
  }

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          workspaceId,
          createdById: actorId,
          name: input.name,
          key: input.key,
          ...(input.description ? { description: input.description } : {}),
        },
        select: projectSelect,
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          projectId: created.id,
          actorId,
          type: 'PROJECT_CREATED',
          metadata: { key: created.key },
        },
      });

      return created;
    });

    return { ...project, issueCount: 0, openIssueCount: 0, role };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw ApiError.projectKeyInUse();
    }

    throw error;
  }
}

/** The key stays as created: existing issue keys such as "API-14" must not move. */
export async function updateProject(
  projectId: string,
  role: WorkspaceRole,
  input: UpdateProjectInput,
): Promise<ProjectDetail> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.status === undefined ? {} : { status: input.status }),
    },
  });

  return getProjectDetail(projectId, role);
}

/**
 * Permanent deletion. The Phase 2 schema cascades a project to its sprints and
 * issues (and issues to their comments); activity rows keep their history with
 * a null projectId. Users, memberships and the workspace itself are untouched.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await prisma.project.delete({ where: { id: projectId } });
}
