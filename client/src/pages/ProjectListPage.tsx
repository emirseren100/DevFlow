import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState, LoadingState, PermissionNotice } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import { canManageProjects, createProject, listProjects } from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';
import { getWorkspace } from '../lib/workspaceApi';

export default function ProjectListPage() {
  const { workspaceId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: ({ signal }) => getWorkspace(workspaceId, signal),
  });

  // The filters are part of the key, so each combination is cached separately
  // and a stale answer for an older filter can never replace the current list.
  const projectsQuery = useQuery({
    queryKey: queryKeys.projectList(workspaceId, { status, search }),
    queryFn: ({ signal }) => listProjects(workspaceId, { status, search }, signal),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; key: string; description?: string }) =>
      createProject(workspaceId, input),
    onSuccess: (project) => {
      setCreateError(null);
      // A new project changes the list and the workspace summary, nothing else.
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectLists(workspaceId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
      navigate(`/app/workspaces/${workspaceId}/projects/${project.id}`);
    },
    onError: (error) => setCreateError(errorMessage(error)),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({ name, key, ...(description ? { description } : {}) });
  }

  const workspace = workspaceQuery.data;
  const projects = projectsQuery.data ?? [];
  const canManage = workspace ? canManageProjects(workspace.role) : false;

  if (workspaceQuery.isError) {
    return (
      <ErrorState error={workspaceQuery.error} onRetry={() => void workspaceQuery.refetch()} />
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          ...(workspace
            ? [{ label: workspace.name, to: `/app/workspaces/${workspaceId}/dashboard` }]
            : []),
          { label: 'Projects' },
        ]}
      />

      <PageHeader
        title="Projects"
        {...(workspace
          ? { description: `Workspace ${workspace.name} — your role is ${workspace.role}.` }
          : {})}
      />

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

      {projectsQuery.isPending && <LoadingState label="Loading projects…" />}

      {projectsQuery.isError && (
        <ErrorState error={projectsQuery.error} onRetry={() => void projectsQuery.refetch()} />
      )}

      {projectsQuery.isSuccess && projects.length === 0 && (
        <EmptyState
          title="No project matches this view"
          description={
            canManage
              ? 'Clear the filters, or create a project with the form below.'
              : 'Clear the filters, or ask an owner or admin to create one.'
          }
        />
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
      {canManage ? (
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

          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create project'}
          </button>
        </form>
      ) : (
        workspace && (
          <PermissionNotice>
            Only an owner or an admin can create a project in this workspace.
          </PermissionNotice>
        )
      )}
    </>
  );
}
