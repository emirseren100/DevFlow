import { NavLink } from 'react-router-dom';

interface ProjectNavProps {
  workspaceId: string;
  projectId: string;
}

/**
 * The three views of a project. Plain links, not a tab framework: the URL stays
 * the source of truth, so every view can be shared and reloaded.
 */
export default function ProjectNav({ workspaceId, projectId }: ProjectNavProps) {
  const base = `/app/workspaces/${workspaceId}/projects/${projectId}`;

  return (
    <nav className="project-nav" aria-label="Project views">
      <NavLink to={base} end>
        Issues
      </NavLink>
      <NavLink to={`${base}/board`}>Board</NavLink>
      <NavLink to={`${base}/activity`}>Activity</NavLink>
    </nav>
  );
}
