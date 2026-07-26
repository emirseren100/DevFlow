import type {
  IssuePriority,
  IssueStatus,
  WorkspaceRole,
} from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import { activitySelect, toActivityItem } from '../activities/activity.service.js';
import { displayKey } from '../issues/issue.service.js';
import type { WorkspaceDashboard } from './dashboard.types.js';

/** Board order. Used to seed every distribution with an explicit zero. */
const ISSUE_STATUSES: IssueStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const ISSUE_PRIORITIES: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** How many rows each "recent" list carries. Small on purpose: this is a summary. */
const RECENT_ISSUE_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;

const safeUserSelect = { id: true, name: true, email: true } as const;

/**
 * Turns a Prisma `groupBy` result into a complete record.
 *
 * A status nobody used is missing from the group rows, so the seed of zeros is
 * what guarantees the client always receives all five keys.
 */
function toDistribution<K extends string, R extends { _count: { _all: number } }>(
  keys: K[],
  rows: R[],
  keyOf: (row: R) => K,
): Record<K, number> {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;

  for (const row of rows) {
    result[keyOf(row)] = row._count._all;
  }

  return result;
}

/**
 * Everything one dashboard screen needs, in one round of parallel queries.
 *
 * Membership was already proven by `requireWorkspaceMember`, and every query
 * below is filtered by the workspace id from the URL — directly, or through
 * `project: { workspaceId }` — so no row of another workspace can be counted.
 *
 * "Open" always means "not DONE". Overdue uses the server clock; a date sent by
 * the browser is never read, because a client could then invent its own count.
 */
export async function getWorkspaceDashboard(
  workspaceId: string,
  role: WorkspaceRole,
  userId: string,
): Promise<WorkspaceDashboard> {
  const now = new Date();
  const inWorkspace = { project: { workspaceId } };
  const open = { ...inWorkspace, status: { not: 'DONE' as IssueStatus } };

  const [
    workspace,
    projectGroups,
    openIssues,
    assignedToMe,
    overdueIssues,
    unassignedIssues,
    statusGroups,
    priorityGroups,
    recentIssues,
    recentActivity,
  ] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, _count: { select: { members: true } } },
    }),
    prisma.project.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.issue.count({ where: open }),
    prisma.issue.count({ where: { ...open, assigneeId: userId } }),
    prisma.issue.count({ where: { ...open, dueDate: { lt: now } } }),
    prisma.issue.count({ where: { ...open, assigneeId: null } }),
    prisma.issue.groupBy({
      by: ['status'],
      where: inWorkspace,
      _count: { _all: true },
    }),
    prisma.issue.groupBy({
      by: ['priority'],
      where: inWorkspace,
      _count: { _all: true },
    }),
    prisma.issue.findMany({
      where: inWorkspace,
      // The id breaks ties, so two issues saved in the same millisecond keep a
      // stable order between two requests.
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: RECENT_ISSUE_LIMIT,
      // No description: a summary card never needs the whole issue body.
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: safeUserSelect },
      },
    }),
    prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: RECENT_ACTIVITY_LIMIT,
      select: activitySelect,
    }),
  ]);

  if (!workspace) {
    throw ApiError.workspaceNotFound();
  }

  const projectCounts = toDistribution(
    ['ACTIVE', 'ARCHIVED'],
    projectGroups,
    (row) => row.status,
  );

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role,
      memberCount: workspace._count.members,
      activeProjectCount: projectCounts.ACTIVE,
      archivedProjectCount: projectCounts.ARCHIVED,
    },
    issueMetrics: { openIssues, assignedToMe, overdueIssues, unassignedIssues },
    statusDistribution: toDistribution(ISSUE_STATUSES, statusGroups, (row) => row.status),
    priorityDistribution: toDistribution(ISSUE_PRIORITIES, priorityGroups, (row) => row.priority),
    recentIssues: recentIssues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      displayKey: displayKey(issue.project.key, issue.number),
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      updatedAt: issue.updatedAt,
      project: issue.project,
      assignee: issue.assignee,
    })),
    // Reuses the feed's own mapper, so the metadata whitelist applies here too.
    recentActivity: recentActivity.map(toActivityItem),
    generatedAt: now,
  };
}
