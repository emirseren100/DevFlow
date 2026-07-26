import type {
  IssuePriority,
  IssueStatus,
  WorkspaceRole,
} from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { ActivityItem } from '../activities/activity.types.js';

/**
 * Shapes returned by `GET /api/workspaces/:workspaceId/dashboard`.
 *
 * One response for one screen: the client asks once instead of stitching six
 * list endpoints together in the browser.
 */

export interface DashboardWorkspace {
  id: string;
  name: string;
  slug: string;
  /** The caller's own role, read from the database by the authorization layer. */
  role: WorkspaceRole;
  memberCount: number;
  activeProjectCount: number;
  archivedProjectCount: number;
}

/** DONE counts as closed everywhere in this file. */
export interface DashboardIssueMetrics {
  openIssues: number;
  assignedToMe: number;
  overdueIssues: number;
  unassignedIssues: number;
}

/** Every status and every priority is present, so the client never guesses. */
export type StatusDistribution = Record<IssueStatus, number>;
export type PriorityDistribution = Record<IssuePriority, number>;

export interface DashboardIssue {
  id: string;
  number: number;
  displayKey: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  updatedAt: Date;
  project: { id: string; name: string; key: string };
  assignee: SafeUser | null;
}

export interface WorkspaceDashboard {
  workspace: DashboardWorkspace;
  issueMetrics: DashboardIssueMetrics;
  statusDistribution: StatusDistribution;
  priorityDistribution: PriorityDistribution;
  recentIssues: DashboardIssue[];
  recentActivity: ActivityItem[];
  /** Server time used for the overdue comparison, so the client can explain it. */
  generatedAt: Date;
}
