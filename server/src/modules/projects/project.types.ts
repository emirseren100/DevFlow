import type { ProjectStatus, SprintStatus, WorkspaceRole } from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';

/** Project shape as returned by the list endpoint. */
export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  issueCount: number;
  openIssueCount: number;
  /** The caller's own role in the owning workspace, straight from the database. */
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface SprintSummary {
  id: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: Date | null;
  endDate: Date | null;
  issueCount: number;
}

/** Project shape as returned by the detail endpoint. */
export interface ProjectDetail extends ProjectSummary {
  createdBy: SafeUser;
  /** How many issues sit in each IssueStatus, including the empty ones. */
  issueCountsByStatus: Record<string, number>;
  sprints: SprintSummary[];
}

/**
 * What the project authorization middleware resolved: the project really does
 * exist *inside the workspace named in the URL*.
 */
export interface ProjectContext {
  projectId: string;
  key: string;
  name: string;
  status: ProjectStatus;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by requireProject. Undefined outside project routes. */
      project?: ProjectContext;
    }
  }
}
