import { Link, useNavigate } from 'react-router-dom';

import { useCurrentWorkspaceId, useWorkspacesQuery } from '../hooks/useWorkspaces';

/**
 * Switches between the workspaces the user belongs to.
 *
 * The options come from `GET /api/workspaces`, which only ever returns the
 * caller's own memberships, so the control cannot even name a workspace the
 * user has no access to. Selecting one opens its dashboard.
 *
 * Nothing is written to localStorage: the URL already says which workspace is
 * open, and a remembered id would only be a second, staler source of truth.
 */
export default function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const workspaceId = useCurrentWorkspaceId();
  const { data: workspaces, isPending, isError } = useWorkspacesQuery();

  if (isPending) {
    return (
      <p className="switcher" role="status">
        Loading workspaces…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="switcher">
        <Link to="/app/workspaces">Workspaces</Link>
      </p>
    );
  }

  if (workspaces.length === 0) {
    return (
      <p className="switcher">
        No workspace yet. <Link to="/app/workspaces">Create your first one</Link>.
      </p>
    );
  }

  // An id in the URL that is not in the list stays unselected, so the switcher
  // never claims the user is inside a workspace they cannot open.
  const selected = workspaces.some((workspace) => workspace.id === workspaceId)
    ? (workspaceId as string)
    : '';

  return (
    <div className="switcher">
      <label htmlFor="workspace-switcher">Current workspace</label>
      <select
        id="workspace-switcher"
        value={selected}
        onChange={(event) => navigate(`/app/workspaces/${event.target.value}/dashboard`)}
      >
        {selected === '' && <option value="">Choose a workspace</option>}
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>

      <Link className="faint" to="/app/workspaces">
        All workspaces
      </Link>
    </div>
  );
}
