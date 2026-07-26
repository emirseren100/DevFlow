import { apiRequest, get } from './apiClient';
import type { WorkspaceRole } from './workspaceApi';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';
export type IssueType = 'TASK' | 'BUG';
export type IssueStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** The five statuses, in board order. Used to build filters and summaries. */
export const ISSUE_STATUSES: IssueStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

/** Readable column names. The database keeps the enum, the UI shows these. */
export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const ISSUE_TYPES: IssueType[] = ['TASK', 'BUG'];

export const ISSUE_PRIORITIES: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * The remaining enums, in the same shape. A raw `IN_PROGRESS` is a database
 * value, not something a user should ever have to read on a screen.
 */
export const TYPE_LABELS: Record<IssueType, string> = {
  TASK: 'Task',
  BUG: 'Bug',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
};

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

export interface SafeUser {
  id: string;
  name: string;
  email: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  issueCount: number;
  openIssueCount: number;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface SprintSummary {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  issueCount: number;
}

export interface ProjectDetail extends ProjectSummary {
  createdBy: SafeUser;
  issueCountsByStatus: Record<string, number>;
  sprints: SprintSummary[];
}

export interface IssueSummary {
  id: string;
  number: number;
  displayKey: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: SafeUser;
  assignee: SafeUser | null;
  sprint: { id: string; name: string; status: string } | null;
  dueDate: string | null;
  updatedAt: string;
}

export interface IssueDetail extends IssueSummary {
  description: string | null;
  project: { id: string; name: string; key: string; status: ProjectStatus };
  permissions: { canUpdate: boolean; canDelete: boolean };
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface IssueListResult {
  issues: IssueSummary[];
  pagination: Pagination;
  filters: Record<string, string | boolean>;
}

/** Filters the issue list understands. Empty values are dropped by the caller. */
export interface IssueFilters {
  search?: string;
  status?: string;
  type?: string;
  priority?: string;
  assigneeId?: string;
  sprintId?: string;
  unassigned?: boolean;
  page?: number;
  sort?: string;
  order?: string;
}

function projectsPath(workspaceId: string): string {
  return `/workspaces/${workspaceId}/projects`;
}

function projectPath(workspaceId: string, projectId: string): string {
  return `${projectsPath(workspaceId)}/${projectId}`;
}

/** Leaves out empty values so the URL never carries `status=`. */
function toQuery(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();

  return query ? `?${query}` : '';
}

export function listProjects(
  workspaceId: string,
  options: { status?: string; search?: string } = {},
  signal?: AbortSignal,
): Promise<ProjectSummary[]> {
  return apiRequest<{ projects: ProjectSummary[] }>(
    `${projectsPath(workspaceId)}${toQuery(options)}`,
    get(signal),
  ).then((data) => data.projects);
}

export function createProject(
  workspaceId: string,
  input: { name: string; key: string; description?: string },
): Promise<ProjectSummary> {
  return apiRequest<{ project: ProjectSummary }>(projectsPath(workspaceId), {
    method: 'POST',
    body: input,
  }).then((data) => data.project);
}

export function getProject(
  workspaceId: string,
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectDetail> {
  return apiRequest<{ project: ProjectDetail }>(
    projectPath(workspaceId, projectId),
    get(signal),
  ).then((data) => data.project);
}

export function updateProject(
  workspaceId: string,
  projectId: string,
  input: { name?: string; description?: string | null; status?: ProjectStatus },
): Promise<ProjectDetail> {
  return apiRequest<{ project: ProjectDetail }>(projectPath(workspaceId, projectId), {
    method: 'PATCH',
    body: input,
  }).then((data) => data.project);
}

/** The confirmation is part of the request: deletion is permanent. */
export function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  return apiRequest(projectPath(workspaceId, projectId), {
    method: 'DELETE',
    body: { confirm: true },
  }).then(() => undefined);
}

export function listSprints(
  workspaceId: string,
  projectId: string,
  signal?: AbortSignal,
): Promise<SprintSummary[]> {
  return apiRequest<{ sprints: SprintSummary[] }>(
    `${projectPath(workspaceId, projectId)}/sprints`,
    get(signal),
  ).then((data) => data.sprints);
}

export function listIssues(
  workspaceId: string,
  projectId: string,
  filters: IssueFilters = {},
  signal?: AbortSignal,
): Promise<IssueListResult> {
  return apiRequest<IssueListResult>(
    `${projectPath(workspaceId, projectId)}/issues${toQuery({ ...filters })}`,
    get(signal),
  );
}

export interface IssueInput {
  title: string;
  description?: string;
  type: IssueType;
  priority: IssuePriority;
  status?: IssueStatus;
  assigneeId?: string | null;
  sprintId?: string | null;
  dueDate?: string | null;
}

export function createIssue(
  workspaceId: string,
  projectId: string,
  input: IssueInput,
): Promise<IssueDetail> {
  return apiRequest<{ issue: IssueDetail }>(`${projectPath(workspaceId, projectId)}/issues`, {
    method: 'POST',
    body: input,
  }).then((data) => data.issue);
}

export function getIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  signal?: AbortSignal,
): Promise<IssueDetail> {
  return apiRequest<{ issue: IssueDetail }>(
    `${projectPath(workspaceId, projectId)}/issues/${issueId}`,
    get(signal),
  ).then((data) => data.issue);
}

export function updateIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  input: Partial<IssueInput>,
): Promise<IssueDetail> {
  return apiRequest<{ issue: IssueDetail }>(
    `${projectPath(workspaceId, projectId)}/issues/${issueId}`,
    { method: 'PATCH', body: input },
  ).then((data) => data.issue);
}

export function deleteIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
): Promise<void> {
  return apiRequest(`${projectPath(workspaceId, projectId)}/issues/${issueId}`, {
    method: 'DELETE',
  }).then(() => undefined);
}

/**
 * The same rules the server enforces, used only to decide which controls are
 * worth showing. Hiding a button is a convenience, never the protection: the
 * server checks every request again.
 */
export function canManageProjects(role: WorkspaceRole): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}
