import { apiRequest } from './apiClient';
import type { ActivityItem } from './collaborationApi';
import type { IssuePriority, IssueStatus, SafeUser } from './projectApi';
import type { WorkspaceRole } from './workspaceApi';

/**
 * One request for the whole workspace overview.
 *
 * The server aggregates the counts in PostgreSQL, so the browser never fetches
 * every issue just to count them, and the page never fires six requests that
 * arrive at six different moments.
 */

export interface DashboardWorkspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
  activeProjectCount: number;
  archivedProjectCount: number;
}

/** DONE is treated as closed, so "open" always means "not DONE". */
export interface DashboardIssueMetrics {
  openIssues: number;
  assignedToMe: number;
  overdueIssues: number;
  unassignedIssues: number;
}

export interface DashboardIssue {
  id: string;
  number: number;
  displayKey: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  updatedAt: string;
  project: { id: string; name: string; key: string };
  assignee: SafeUser | null;
}

export interface WorkspaceDashboard {
  workspace: DashboardWorkspace;
  issueMetrics: DashboardIssueMetrics;
  /** Always all five statuses, zeros included. */
  statusDistribution: Record<IssueStatus, number>;
  /** Always all four priorities, zeros included. */
  priorityDistribution: Record<IssuePriority, number>;
  recentIssues: DashboardIssue[];
  recentActivity: ActivityItem[];
  /** Server time the overdue count was measured against. */
  generatedAt: string;
}

export function getWorkspaceDashboard(
  workspaceId: string,
  signal?: AbortSignal,
): Promise<WorkspaceDashboard> {
  return apiRequest<{ dashboard: WorkspaceDashboard }>(`/workspaces/${workspaceId}/dashboard`, {
    ...(signal ? { signal } : {}),
  }).then((data) => data.dashboard);
}
