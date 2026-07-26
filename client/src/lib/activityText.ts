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

function statusLabel(value: unknown): string {
  return typeof value === 'string' && value in STATUS_LABELS
    ? STATUS_LABELS[value as IssueStatus]
    : 'unknown';
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
      return `${who} moved ${issue} from ${statusLabel(activity.metadata.previousStatus)} to ${statusLabel(activity.metadata.nextStatus)}`;
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
