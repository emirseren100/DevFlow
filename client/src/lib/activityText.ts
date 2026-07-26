import type { ActivityItem } from './collaborationApi';
import type { IssueStatus } from './projectApi';
import { STATUS_LABELS } from './projectApi';

/**
 * Turns a stored activity row into one readable sentence.
 *
 * The database keeps structured fields only (a type plus small metadata), so the
 * wording can change here without a migration and without rewriting history.
 */

function actorName(activity: ActivityItem): string {
  return activity.actor?.name ?? 'System';
}

function statusLabel(value: unknown): string | null {
  return typeof value === 'string' && value in STATUS_LABELS
    ? STATUS_LABELS[value as IssueStatus]
    : null;
}

/**
 * A status change whose metadata is incomplete still happened, so it is still
 * reported — just without the half of the sentence that cannot be filled in.
 * "from unknown to unknown" reads like a bug; "changed the status" does not.
 */
function statusChangeText(who: string, issue: string, metadata: ActivityItem['metadata']): string {
  const from = statusLabel(metadata.previousStatus);
  const to = statusLabel(metadata.nextStatus);

  if (from && to) {
    return `${who} moved ${issue} from ${from} to ${to}`;
  }

  if (to) {
    return `${who} moved ${issue} to ${to}`;
  }

  return `${who} changed the status of ${issue}`;
}

function issueLabel(activity: ActivityItem): string {
  return activity.issue?.displayKey ?? 'an issue';
}

export function activityText(activity: ActivityItem): string {
  const who = actorName(activity);
  const issue = issueLabel(activity);

  switch (activity.type) {
    case 'WORKSPACE_CREATED':
      return `${who} created the workspace`;
    case 'MEMBER_ADDED':
      return `${who} added a workspace member`;
    case 'PROJECT_CREATED':
      return `${who} created the project ${activity.project?.key ?? ''}`.trim();
    case 'ISSUE_CREATED':
      return `${who} created ${issue}`;
    case 'ISSUE_STATUS_CHANGED':
      return statusChangeText(who, issue, activity.metadata);
    case 'ISSUE_ASSIGNED':
      return activity.metadata.nextAssigneeId
        ? `${who} changed the assignee of ${issue}`
        : `${who} removed the assignee of ${issue}`;
    case 'ISSUE_UPDATED': {
      const fields = activity.metadata.changedFields;

      return Array.isArray(fields) && fields.length > 0
        ? `${who} updated ${issue} (${fields.join(', ')})`
        : `${who} updated ${issue}`;
    }
    case 'COMMENT_CREATED':
      return `${who} commented on ${issue}`;
    default:
      return `${who} changed something`;
  }
}
