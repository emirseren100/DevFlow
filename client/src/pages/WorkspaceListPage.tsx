import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { WorkspaceSummary } from '../lib/workspaceApi';
import { createWorkspace, listWorkspaces } from '../lib/workspaceApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // One request on mount. The workspace list is server data, so it is kept in
  // component state only and never written to localStorage.
  useEffect(() => {
    let active = true;

    listWorkspaces()
      .then((data) => {
        if (active) setWorkspaces(data);
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
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const workspace = await createWorkspace(name);

      setWorkspaces((current) => [...current, workspace]);
      setName('');
      navigate(`/app/workspaces/${workspace.id}`);
    } catch (error) {
      setCreateError(messageOf(error));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section>
      <h1>Workspaces</h1>

      {isLoading && <p role="status">Loading workspaces…</p>}

      {loadError && <p role="alert">{loadError}</p>}

      {!isLoading && !loadError && workspaces.length === 0 && (
        <p>You do not belong to any workspace yet. Create your first one below.</p>
      )}

      {workspaces.length > 0 && (
        <ul>
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link to={`/app/workspaces/${workspace.id}`}>{workspace.name}</Link>
              <span> — {workspace.role}</span>
              <span>
                {' '}
                — {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate}>
        <h2>Create a workspace</h2>

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

        {createError && <p role="alert">{createError}</p>}

        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating…' : 'Create workspace'}
        </button>
      </form>
    </section>
  );
}
