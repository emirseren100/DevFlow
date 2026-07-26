import type { IssueFilters } from './projectApi';

/**
 * Every TanStack Query key in the application is built here.
 *
 * Two rules make invalidation predictable:
 *
 * 1. A key is an array that reads like the URL it comes from, from the widest
 *    scope to the narrowest one.
 * 2. `list` and `detail` are separate segments, so invalidating a list never
 *    accidentally throws away every detail below it — and invalidating a parent
 *    segment on purpose (for example everything inside one workspace) still
 *    works, because TanStack Query matches keys by prefix.
 *
 * Nothing outside this file writes a query key by hand.
 *
 * Note that a scope key such as `project(w, p)` is the prefix of everything
 * inside that project. Invalidating it therefore refreshes the board, the
 * issues and the feeds as well — which is sometimes exactly what is wanted, and
 * sometimes far too much. Pass `exact: true` when only the detail itself
 * changed, and use the `…Lists` helpers when only the lists did.
 */
export const queryKeys = {
  currentUser: () => ['currentUser'] as const,

  workspaces: () => ['workspaces'] as const,
  workspaceList: () => ['workspaces', 'list'] as const,
  workspace: (workspaceId: string) => ['workspaces', 'detail', workspaceId] as const,
  workspaceMembers: (workspaceId: string) =>
    ['workspaces', 'detail', workspaceId, 'members'] as const,
  workspaceDashboard: (workspaceId: string) =>
    ['workspaces', 'detail', workspaceId, 'dashboard'] as const,

  projects: (workspaceId: string) => ['workspaces', 'detail', workspaceId, 'projects'] as const,
  /** Every filtered project list of one workspace, and nothing below a project. */
  projectLists: (workspaceId: string) =>
    ['workspaces', 'detail', workspaceId, 'projects', 'list'] as const,
  projectList: (workspaceId: string, filters: { status?: string; search?: string }) =>
    ['workspaces', 'detail', workspaceId, 'projects', 'list', filters] as const,
  project: (workspaceId: string, projectId: string) =>
    ['workspaces', 'detail', workspaceId, 'projects', 'detail', projectId] as const,

  sprints: (workspaceId: string, projectId: string) =>
    [...queryKeys.project(workspaceId, projectId), 'sprints'] as const,
  board: (workspaceId: string, projectId: string) =>
    [...queryKeys.project(workspaceId, projectId), 'board'] as const,
  projectActivity: (workspaceId: string, projectId: string) =>
    [...queryKeys.project(workspaceId, projectId), 'activities'] as const,

  issues: (workspaceId: string, projectId: string) =>
    [...queryKeys.project(workspaceId, projectId), 'issues'] as const,
  /** Every filtered issue list of one project, and no issue detail. */
  issueLists: (workspaceId: string, projectId: string) =>
    [...queryKeys.issues(workspaceId, projectId), 'list'] as const,
  /** The filters belong in the key: a different filter set is different data. */
  issueList: (workspaceId: string, projectId: string, filters: IssueFilters) =>
    [...queryKeys.issues(workspaceId, projectId), 'list', filters] as const,
  issue: (workspaceId: string, projectId: string, issueId: string) =>
    [...queryKeys.issues(workspaceId, projectId), 'detail', issueId] as const,

  comments: (workspaceId: string, projectId: string, issueId: string) =>
    [...queryKeys.issue(workspaceId, projectId, issueId), 'comments'] as const,
  issueActivity: (workspaceId: string, projectId: string, issueId: string) =>
    [...queryKeys.issue(workspaceId, projectId, issueId), 'activities'] as const,
};
