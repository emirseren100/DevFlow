import { prisma } from '../../lib/prisma.js';
import { displayKey, findIssueRef } from '../issues/issue.service.js';
import type { ProjectContext } from '../projects/project.types.js';
import type { ListActivitiesQuery } from './activity.schemas.js';
import type { ActivityItem, ActivityListResult, ActivityMetadata } from './activity.types.js';

const activitySelect = {
  id: true,
  type: true,
  createdAt: true,
  metadata: true,
  actor: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, key: true } },
  issue: { select: { id: true, number: true, title: true } },
} as const;

/**
 * The only metadata keys that may leave the server.
 *
 * A whitelist, not a blacklist: a future writer that stores something careless
 * cannot leak it through the feed, because an unknown key is simply dropped.
 */
const ALLOWED_METADATA_KEYS = new Set([
  'previousStatus',
  'nextStatus',
  'previousAssigneeId',
  'nextAssigneeId',
  'changedFields',
  'commentId',
  'number',
  'key',
  'slug',
  'addedUserId',
  'assignedRole',
]);

/** Keeps whitelisted keys whose value is a small scalar or a list of strings. */
function sanitizeMetadata(metadata: unknown): ActivityMetadata {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return {};
  }

  const safe: ActivityMetadata = {};

  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      continue;
    }

    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      safe[key] = value as string | number | boolean | null;
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      safe[key] = value as string[];
    }
  }

  return safe;
}

type ActivityRow = {
  id: string;
  type: ActivityItem['type'];
  createdAt: Date;
  metadata: unknown;
  actor: { id: string; name: string; email: string } | null;
  project: { id: string; name: string; key: string } | null;
  issue: { id: string; number: number; title: string } | null;
};

function toItem(activity: ActivityRow): ActivityItem {
  return {
    id: activity.id,
    type: activity.type,
    createdAt: activity.createdAt,
    actor: activity.actor,
    project: activity.project,
    issue: activity.issue
      ? {
          id: activity.issue.id,
          number: activity.issue.number,
          // The key comes from the joined project, so the feed can show "API-14"
          // without a second query per row.
          displayKey: displayKey(activity.project?.key ?? '', activity.issue.number),
          title: activity.issue.title,
        }
      : null,
    metadata: sanitizeMetadata(activity.metadata),
  };
}

/**
 * One page of a feed.
 *
 * `where` always carries the workspace and the project from the URL, so a feed
 * can never contain a row from another project. The order is newest first with
 * the id as the tie-breaker, so two rows written in the same millisecond never
 * swap places between two requests.
 */
async function listActivities(
  where: { workspaceId: string; projectId: string; issueId?: string; type?: ActivityItem['type'] },
  query: ListActivitiesQuery,
): Promise<ActivityListResult> {
  const filter = { ...where, ...(query.type ? { type: query.type } : {}) };

  const [total, activities] = await Promise.all([
    prisma.activityLog.count({ where: filter }),
    prisma.activityLog.findMany({
      where: filter,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: activitySelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    activities: activities.map(toItem),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    },
  };
}

export function listProjectActivities(
  workspaceId: string,
  project: ProjectContext,
  query: ListActivitiesQuery,
): Promise<ActivityListResult> {
  return listActivities({ workspaceId, projectId: project.projectId }, query);
}

export async function listIssueActivities(
  workspaceId: string,
  project: ProjectContext,
  issueId: string,
  query: ListActivitiesQuery,
): Promise<ActivityListResult> {
  // Proves the issue belongs to the project in the URL before anything is read.
  const issue = await findIssueRef(project.projectId, issueId);

  return listActivities(
    { workspaceId, projectId: project.projectId, issueId: issue.id },
    query,
  );
}
