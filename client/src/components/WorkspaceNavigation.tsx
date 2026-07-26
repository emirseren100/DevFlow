import { NavLink } from 'react-router-dom';

import { useCurrentWorkspace } from '../hooks/useWorkspaces';
import { canManageWorkspace } from '../lib/workspaceApi';

/**
 * The pages of one workspace.
 *
 * "Settings" only appears for a role that can actually use it. That is a
 * courtesy, not a protection: the route still loads and the server still
 * refuses the request from anyone else.
 */
export default function WorkspaceNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const workspace = useCurrentWorkspace();

  if (!workspace) {
    return null;
  }

  const base = `/app/workspaces/${workspace.id}`;

  const links = [
    { to: `${base}/dashboard`, label: 'Overview' },
    { to: `${base}/projects`, label: 'Projects' },
    { to: `${base}/members`, label: 'Members' },
    ...(canManageWorkspace(workspace.role) ? [{ to: `${base}/settings`, label: 'Settings' }] : []),
  ];

  return (
    <nav aria-label="Workspace navigation" className="workspace-nav">
      <p className="workspace-nav__title">{workspace.name}</p>

      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
