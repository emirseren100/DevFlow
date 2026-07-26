import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { ProjectSummary } from '../lib/projectApi';
import { canManageProjects, createProject, listProjects } from '../lib/projectApi';
import { getWorkspace } from '../lib/workspaceApi';
import type { WorkspaceDetail } from '../lib/workspaceApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export default function ProjectListPage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // The workspace gives the page its heading and the caller's real role; the
  // project list is refetched whenever a filter changes.
  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError(null);

    Promise.all([getWorkspace(workspaceId), listProjects(workspaceId, { status, search })])
      .then(([detail, list]) => {
        if (!active) return;

        setWorkspace(detail);
        setProjects(list);
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
  }, [workspaceId, status, search]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const project = await createProject(workspaceId, {
        name,
        key,
        ...(description ? { description } : {}),
      });

      navigate(`/app/workspaces/${workspaceId}/projects/${project.id}`);
    } catch (error) {
      setCreateError(messageOf(error));
    } finally {
      setIsCreating(false);
    }
  }

  const canManage = workspace ? canManageProjects(workspace.role) : false;

  return (
    <section>
      <h1>Projects</h1>

      {workspace && (
        <p>
          Workspace: <Link to={`/app/workspaces/${workspaceId}`}>{workspace.name}</Link> — your role
          is {workspace.role}
        </p>
      )}

      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="project-search">Search projects</label>
        <input
          id="project-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <label htmlFor="project-status">Status</label>
        <select
          id="project-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </form>

      {isLoading && <p role="status">Loading projects…</p>}

      {loadError && <p role="alert">{loadError}</p>}

      {!isLoading && !loadError && projects.length === 0 && (
        <p>No project matches this view yet.</p>
      )}

      {projects.length > 0 && (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <Link to={`/app/workspaces/${workspaceId}/projects/${project.id}`}>
                {project.key} — {project.name}
              </Link>
              <span> — {project.status}</span>
              <span>
                {' '}
                — {project.openIssueCount} open of {project.issueCount} issues
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Only OWNER and ADMIN see this form. The server refuses the request from
          anybody else even if the form is recreated by hand. */}
      {canManage && (
        <form onSubmit={handleCreate}>
          <h2>Create a project</h2>

          <label htmlFor="project-name">Project name</label>
          <input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={100}
          />

          <label htmlFor="project-key">Project key</label>
          <input
            id="project-key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            required
            minLength={2}
            maxLength={10}
          />

          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
          />

          {createError && <p role="alert">{createError}</p>}

          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      )}
    </section>
  );
}
