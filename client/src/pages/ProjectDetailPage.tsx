import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import ProjectNav from '../components/ProjectNav';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import type { IssueFilters, ProjectStatus } from '../lib/projectApi';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  canManageProjects,
  deleteProject,
  getProject,
  listIssues,
  updateProject,
} from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';

/** Filter names that live in the URL, so a link restores the same view. */
const FILTER_KEYS = ['search', 'status', 'type', 'priority', 'assigneeId', 'sprintId', 'sort'];

export default function ProjectDetailPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // The URL is the single source of truth for the filters. It survives a
  // reload, it can be shared, and browser back/forward moves between views.
  const page = Number(searchParams.get('page') ?? '1');

  const filters: IssueFilters = Object.fromEntries(
    [...FILTER_KEYS, 'page'].flatMap((key) => {
      const value = searchParams.get(key);

      return value ? [[key, value] as const] : [];
    }),
  );

  function filterValue(key: string): string {
    return searchParams.get(key) ?? '';
  }

  function setFilter(key: string, value: string): void {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    // Any filter change starts again at the first page.
    next.delete('page');
    setSearchParams(next);
  }

  function goToPage(nextPage: number): void {
    const next = new URLSearchParams(searchParams);

    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  const projectQuery = useQuery({
    queryKey: queryKeys.project(workspaceId, projectId),
    queryFn: ({ signal }) => getProject(workspaceId, projectId, signal),
  });

  // A different filter set is different data, so it gets its own key and its
  // own cache entry instead of overwriting the previous answer.
  const issuesQuery = useQuery({
    queryKey: queryKeys.issueList(workspaceId, projectId, filters),
    queryFn: ({ signal }) => listIssues(workspaceId, projectId, filters, signal),
  });

  const loadedName = projectQuery.data?.name;

  useEffect(() => {
    if (loadedName !== undefined) {
      setName(loadedName);
    }
  }, [loadedName, projectId]);

  /**
   * Renaming or archiving a project changes the project itself, the lists it
   * appears in and the workspace metrics. `exact` keeps the issues, the board
   * and the feeds below it untouched.
   */
  function invalidateProject() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.project(workspaceId, projectId),
      exact: true,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projectLists(workspaceId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
  }

  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; status?: ProjectStatus }) =>
      updateProject(workspaceId, projectId, input),
    onSuccess: () => {
      setActionError(null);
      invalidateProject();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(workspaceId, projectId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.project(workspaceId, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectLists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
      navigate(`/app/workspaces/${workspaceId}/projects`);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (projectQuery.isPending) {
    return <LoadingState label="Loading project…" />;
  }

  if (projectQuery.isError) {
    return (
      <ErrorState
        error={projectQuery.error}
        onRetry={() => void projectQuery.refetch()}
        backTo={`/app/workspaces/${workspaceId}/projects`}
        backLabel="Back to projects"
      />
    );
  }

  const project = projectQuery.data;
  const result = issuesQuery.data;
  const canManage = canManageProjects(project.role);
  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  function handleRename(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate({ name });
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: 'Projects', to: `/app/workspaces/${workspaceId}/projects` },
          { label: project.key },
        ]}
      />

      <ProjectNav workspaceId={workspaceId} projectId={projectId} />

      <PageHeader
        title={`${project.key} — ${project.name}`}
        description={project.description ?? 'No description yet.'}
      />

      <p>Status: {project.status}</p>

      <h2>Issue summary</h2>
      <ul>
        {ISSUE_STATUSES.map((status) => (
          <li key={status}>
            {status}: {project.issueCountsByStatus[status] ?? 0}
          </li>
        ))}
      </ul>

      <h2>Sprints</h2>
      {project.sprints.length === 0 ? (
        <p>This project has no sprint yet.</p>
      ) : (
        <ul>
          {project.sprints.map((sprint) => (
            <li key={sprint.id}>
              {sprint.name} — {sprint.status} — {sprint.issueCount} issues
            </li>
          ))}
        </ul>
      )}

      <h2>Issues</h2>

      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}/issues/new`}>
          Create an issue
        </Link>
      </p>

      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="issue-search">Search issues</label>
        <input
          id="issue-search"
          value={filterValue('search')}
          onChange={(event) => setFilter('search', event.target.value)}
        />

        <label htmlFor="issue-status">Status</label>
        <select
          id="issue-status"
          value={filterValue('status')}
          onChange={(event) => setFilter('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <label htmlFor="issue-type">Type</label>
        <select
          id="issue-type"
          value={filterValue('type')}
          onChange={(event) => setFilter('type', event.target.value)}
        >
          <option value="">All types</option>
          {ISSUE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label htmlFor="issue-priority">Priority</label>
        <select
          id="issue-priority"
          value={filterValue('priority')}
          onChange={(event) => setFilter('priority', event.target.value)}
        >
          <option value="">All priorities</option>
          {ISSUE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>

        <label htmlFor="issue-sprint">Sprint</label>
        <select
          id="issue-sprint"
          value={filterValue('sprintId')}
          onChange={(event) => setFilter('sprintId', event.target.value)}
        >
          <option value="">All sprints</option>
          {project.sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name}
            </option>
          ))}
        </select>
      </form>

      {/* Only the list waits, so changing a filter never blanks the whole page. */}
      {issuesQuery.isPending && <LoadingState label="Loading issues…" />}

      {issuesQuery.isError && (
        <ErrorState error={issuesQuery.error} onRetry={() => void issuesQuery.refetch()} />
      )}

      {result && result.issues.length === 0 && (
        <EmptyState
          title="No issue matches these filters"
          description="Clear a filter above, or create the first issue of this project."
        />
      )}

      {result && result.issues.length > 0 && (
        <ul>
          {result.issues.map((issue) => (
            <li key={issue.id}>
              <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`}>
                {issue.displayKey} {issue.title}
              </Link>{' '}
              <StatusBadge status={issue.status} /> <PriorityBadge priority={issue.priority} />{' '}
              <span>{issue.assignee ? issue.assignee.name : 'Unassigned'}</span>
            </li>
          ))}
        </ul>
      )}

      {result && (
        <nav aria-label="Issue pages">
          <p>
            Page {result.pagination.page} of {result.pagination.totalPages} —{' '}
            {result.pagination.total} issues
          </p>
          <button
            type="button"
            disabled={!result.pagination.hasPreviousPage}
            onClick={() => goToPage(page - 1)}
          >
            Previous page
          </button>
          <button
            type="button"
            disabled={!result.pagination.hasNextPage}
            onClick={() => goToPage(page + 1)}
          >
            Next page
          </button>
        </nav>
      )}

      {canManage && (
        <>
          <h2>Project settings</h2>

          <form onSubmit={handleRename}>
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
            <button type="submit" disabled={isBusy}>
              Save name
            </button>
          </form>

          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              updateMutation.mutate({
                status: project.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED',
              })
            }
          >
            {project.status === 'ARCHIVED' ? 'Reactivate project' : 'Archive project'}
          </button>

          {/* Deleting is permanent, so it always takes a second, explicit click. */}
          {isConfirmingDelete ? (
            <>
              <p role="alert">
                Deleting this project also removes its sprints and issues. This cannot be undone.
              </p>
              <button type="button" onClick={() => deleteMutation.mutate()} disabled={isBusy}>
                Confirm delete
              </button>
              <button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isBusy}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsConfirmingDelete(true)} disabled={isBusy}>
              Delete project
            </button>
          )}

          {actionError && <p role="alert">{actionError}</p>}
        </>
      )}
    </>
  );
}
