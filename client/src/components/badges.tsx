import type { IssuePriority, IssueStatus, IssueType, ProjectStatus } from '../lib/projectApi';
import { PROJECT_STATUS_LABELS, STATUS_LABELS, TYPE_LABELS } from '../lib/projectApi';
import type { WorkspaceRole } from '../lib/workspaceApi';
import { ROLE_LABELS } from '../lib/workspaceApi';

/**
 * Status, priority, type, project state and role labels.
 *
 * Colour is decoration only: every badge spells the value out in words, so the
 * meaning survives a greyscale screen, a colour-blind reader and a screen
 * reader. Priority also carries a text marker, never a red/yellow/green dot on
 * its own.
 */

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`badge badge--status badge--${status.toLowerCase()}`}>
      Status: {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span className={`badge badge--priority badge--${priority.toLowerCase()}`}>
      Priority: {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function TypeBadge({ type }: { type: IssueType }) {
  return <span className={`badge badge--type badge--${type.toLowerCase()}`}>{TYPE_LABELS[type]}</span>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`badge badge--project-status badge--${status.toLowerCase()}`}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function RoleBadge({ role }: { role: WorkspaceRole }) {
  return <span className={`badge badge--role badge--${role.toLowerCase()}`}>{ROLE_LABELS[role]}</span>;
}
