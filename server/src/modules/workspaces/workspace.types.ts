import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';

/** Workspace shape as returned by the list endpoint. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Workspace shape as returned by the detail endpoint. */
export interface WorkspaceDetail extends WorkspaceSummary {
  owner: SafeUser;
}

/** Member shape as returned by the member endpoints: never any secret. */
export interface SafeMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

/**
 * What the authorization layer resolved for the current request: which
 * workspace, and which role the signed-in user really has in it according to
 * the database.
 */
export interface WorkspaceContext {
  workspaceId: string;
  role: WorkspaceRole;
  membershipId: string;
}

// The workspace context is attached by the workspace authorization middleware,
// exactly like requireAuth attaches the user.
declare global {
  namespace Express {
    interface Request {
      /** Set by requireWorkspaceMember. Undefined outside workspace routes. */
      workspace?: WorkspaceContext;
    }
  }
}
