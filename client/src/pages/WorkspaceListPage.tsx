import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { RoleBadge } from '../components/badges';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useWorkspacesQuery } from '../hooks/useWorkspaces';
import { errorMessage } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import { createWorkspace } from '../lib/workspaceApi';

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // The same query the shell's switcher uses, so opening this page does not
  // fetch the list a second time.
  const workspacesQuery = useWorkspacesQuery();

  const createMutation = useMutation({
    mutationFn: (workspaceName: string) => createWorkspace(workspaceName),
    onSuccess: (workspace) => {
      setName('');
      setCreateError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceList() });
      navigate(`/app/workspaces/${workspace.id}/dashboard`);
    },
    onError: (error) => setCreateError(errorMessage(error)),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(name);
  }

  const workspaces = workspacesQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Workspaces"
        description="A workspace groups the projects, issues and people of one team."
      />

      {workspacesQuery.isPending && <LoadingState label="Loading workspaces…" />}

      {workspacesQuery.isError && (
        <ErrorState
          error={workspacesQuery.error}
          onRetry={() => void workspacesQuery.refetch()}
          backTo="/app"
          backLabel="Back to the application"
        />
      )}

      {workspacesQuery.isSuccess && workspaces.length === 0 && (
        <EmptyState
          title="You do not belong to any workspace yet"
          description="Create your first one below, or ask a colleague to add you to theirs."
        />
      )}

      {workspaces.length > 0 && (
        <ul className="cards">
          {workspaces.map((workspace) => (
            <li className="card" key={workspace.id}>
              <Link className="record__title" to={`/app/workspaces/${workspace.id}/dashboard`}>
                {workspace.name}
              </Link>
              <p className="record__meta">
                <RoleBadge role={workspace.role} />
                <span>
                  {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <form className="panel form" onSubmit={handleCreate}>
        <h2>Create a workspace</h2>

        <div className="field">
          <label htmlFor="workspace-name">Workspace name</label>
          <input
            id="workspace-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={80}
          />
          <span className="field__hint">You become the owner of the workspaces you create.</span>
        </div>

        {createError && (
          <p className="form-error" role="alert">
            {createError}
          </p>
        )}

        <div className="form__row">
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </>
  );
}
