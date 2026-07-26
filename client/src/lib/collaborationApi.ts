import { apiRequest, get } from './apiClient';
import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  Pagination,
  ProjectStatus,
  SafeUser,
} from './projectApi';

/**
 * Phase 6 endpoints: comments, activity feeds and the Kanban board. They share
 * the same centralized client, so every call still sends the session cookie and
 * still unwraps the shared success/error envelope.
 */

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  author: SafeUser;
  permissions: { canEdit: boolean; canDelete: boolean };
}

export type ActivityType =
  | 'WORKSPACE_CREATED'
  | 'MEMBER_ADDED'
  | 'PROJECT_CREATED'
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'ISSUE_STATUS_CHANGED'
  | 'ISSUE_ASSIGNED'
  | 'COMMENT_CREATED';

/** Small values only, exactly as the server whitelisted them. */
export type ActivityMetadata = Record<string, string | number | boolean | null | string[]>;

export interface ActivityItem {
  id: string;
  type: ActivityType;
  createdAt: string;
  actor: SafeUser | null;
  project: { id: string; name: string; key: string } | null;
  issue: { id: string; number: number; displayKey: string; title: string } | null;
  metadata: ActivityMetadata;
}

export interface ActivityListResult {
  activities: ActivityItem[];
  pagination: Pagination;
}

export interface BoardIssue {
  id: string;
  number: number;
  displayKey: string;
  title: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  position: number;
  assignee: SafeUser | null;
  reporter: SafeUser;
  sprint: { id: string; name: string; status: string } | null;
  dueDate: string | null;
  permissions: { canMove: boolean; canEdit: boolean };
}

export interface BoardColumn {
  status: IssueStatus;
  issues: BoardIssue[];
}

export interface Board {
  project: { id: string; name: string; key: string; status: ProjectStatus };
  columns: BoardColumn[];
}

function issuePath(workspaceId: string, projectId: string, issueId: string): string {
  return `/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`;
}

export function listComments(
  workspaceId: string,
  projectId: string,
  issueId: string,
  signal?: AbortSignal,
): Promise<Comment[]> {
  return apiRequest<{ comments: Comment[] }>(
    `${issuePath(workspaceId, projectId, issueId)}/comments`,
    get(signal),
  ).then((data) => data.comments);
}

export function createComment(
  workspaceId: string,
  projectId: string,
  issueId: string,
  body: string,
): Promise<Comment> {
  return apiRequest<{ comment: Comment }>(
    `${issuePath(workspaceId, projectId, issueId)}/comments`,
    { method: 'POST', body: { body } },
  ).then((data) => data.comment);
}

export function updateComment(
  workspaceId: string,
  projectId: string,
  issueId: string,
  commentId: string,
  body: string,
): Promise<Comment> {
  return apiRequest<{ comment: Comment }>(
    `${issuePath(workspaceId, projectId, issueId)}/comments/${commentId}`,
    { method: 'PATCH', body: { body } },
  ).then((data) => data.comment);
}

export function deleteComment(
  workspaceId: string,
  projectId: string,
  issueId: string,
  commentId: string,
): Promise<void> {
  return apiRequest(`${issuePath(workspaceId, projectId, issueId)}/comments/${commentId}`, {
    method: 'DELETE',
  }).then(() => undefined);
}

function pageQuery(page: number, limit?: number): string {
  const params = new URLSearchParams({ page: String(page) });

  if (limit !== undefined) {
    params.set('limit', String(limit));
  }

  return `?${params.toString()}`;
}

export function listProjectActivities(
  workspaceId: string,
  projectId: string,
  page = 1,
  limit?: number,
  signal?: AbortSignal,
): Promise<ActivityListResult> {
  return apiRequest<ActivityListResult>(
    `/workspaces/${workspaceId}/projects/${projectId}/activities${pageQuery(page, limit)}`,
    get(signal),
  );
}

export function listIssueActivities(
  workspaceId: string,
  projectId: string,
  issueId: string,
  page = 1,
  limit?: number,
  signal?: AbortSignal,
): Promise<ActivityListResult> {
  return apiRequest<ActivityListResult>(
    `${issuePath(workspaceId, projectId, issueId)}/activities${pageQuery(page, limit)}`,
    get(signal),
  );
}

export function getBoard(
  workspaceId: string,
  projectId: string,
  signal?: AbortSignal,
): Promise<Board> {
  return apiRequest<{ board: Board }>(
    `/workspaces/${workspaceId}/projects/${projectId}/board`,
    get(signal),
  ).then((data) => data.board);
}

/**
 * The only request that changes a status or an order.
 *
 * Deliberately three values and nothing else: no role, no reporter, no assignee
 * and no board state. The server reads the real order and decides the result.
 */
export function moveIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  targetStatus: IssueStatus,
  targetIndex: number,
): Promise<Board> {
  return apiRequest<{ board: Board }>(`${issuePath(workspaceId, projectId, issueId)}/move`, {
    method: 'PATCH',
    body: { targetStatus, targetIndex },
  }).then((data) => data.board);
}
