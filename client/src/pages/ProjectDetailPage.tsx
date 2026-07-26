import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { IssueListResult, ProjectDetail } from '../lib/projectApi';
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

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

/** Filter names that live in the URL, so a link restores the same view. */
const FILTER_KEYS = ['search', 'status', 'type', 'priority', 'assigneeId', 'sprintId', 'sort'];

export default function ProjectDetailPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [result, setResult] = useState<IssueListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // The URL is the single source of truth for the filters, so state is only
  // ever written from a user action and the effect below just reads it back.
  const query = searchParams.toString();
  const page = Number(searchParams.get('page') ?? '1');

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

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(query);
    const filters = Object.fromEntries(
      [...FILTER_KEYS, 'page'].flatMap((key) => {
        const value = params.get(key);

        return value ? [[key, value] as const] : [];
      }),
    );

    setIsLoading(true);
    setLoadError(null);

    Promise.all([getProject(workspaceId, projectId), listIssues(workspaceId, projectId, filters)])
      .then(([detail, issues]) => {
        if (!active) return;

        setProject(detail);
        setName(detail.name);
        setResult(issues);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageOf(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, projectId, query]);

  async function runAction(action: () => Promise<void>) {
    setIsBusy(true);
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  }

  function handleRename(event: FormEvent) {
    event.preventDefault();

    return runAction(async () => {
      setProject(await updateProject(workspaceId, projectId, { name }));
    });
  }

  function handleArchiveToggle() {
    return runAction(async () => {
      const status = project?.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';

      setProject(await updateProject(workspaceId, projectId, { status }));
    });
  }

  function handleDelete() {
    return runAction(async () => {
      await deleteProject(workspaceId, projectId);
      navigate(`/app/workspaces/${workspaceId}/projects`);
    });
  }

  const canManage = project ? canManageProjects(project.role) : false;

  if (isLoading) {
    return <p role="status">Loading project…</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!project) {
    return null;
  }

  return (
    <section>
      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects`}>Back to projects</Link>
      </p>

      <h1>
        {project.key} — {project.name}
      </h1>
      <p>{project.description ?? 'No description yet.'}</p>
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

      {result && result.issues.length === 0 && <p>No issue matches these filters.</p>}

      {result && result.issues.length > 0 && (
        <ul>
          {result.issues.map((issue) => (
            <li key={issue.id}>
              <Link
                to={`/app/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`}
              >
                {issue.displayKey} {issue.title}
              </Link>
              <span>
                {' '}
                — {issue.status} — {issue.priority} —{' '}
                {issue.assignee ? issue.assignee.name : 'Unassigned'}
              </span>
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

          <button type="button" onClick={handleArchiveToggle} disabled={isBusy}>
            {project.status === 'ARCHIVED' ? 'Reactivate project' : 'Archive project'}
          </button>

          {/* Deleting is permanent, so it always takes a second, explicit click. */}
          {isConfirmingDelete ? (
            <>
              <p role="alert">
                Deleting this project also removes its sprints and issues. This cannot be undone.
              </p>
              <button type="button" onClick={handleDelete} disabled={isBusy}>
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
    </section>
  );
}
