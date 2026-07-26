import type { IssuePriority, IssueStatus } from '../lib/projectApi';
import { STATUS_LABELS } from '../lib/projectApi';

/**
 * Status and priority labels.
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
