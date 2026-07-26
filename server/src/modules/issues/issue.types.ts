import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  ProjectStatus,
} from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';

/** Sprint reference shown next to an issue. Never the whole sprint. */
export interface IssueSprintRef {
  id: string;
  name: string;
  status: string;
}

/** Issue shape as returned by the list endpoint. */
export interface IssueSummary {
  id: string;
  number: number;
  /** Derived from the project key: "API-14". Never stored a second time. */
  displayKey: string;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: SafeUser;
  assignee: SafeUser | null;
  sprint: IssueSprintRef | null;
  dueDate: Date | null;
  updatedAt: Date;
}

/**
 * Just enough of an issue row to check a permission or to scope a nested
 * resource. Used by the comment, activity and Kanban modules.
 */
export interface IssueRef {
  id: string;
  number: number;
  title: string;
  status: IssueStatus;
  position: number;
  reporterId: string;
  assigneeId: string | null;
}

/** What the current user may do with this issue, decided by the server. */
export interface IssuePermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

export interface IssueDetail extends IssueSummary {
  description: string | null;
  project: { id: string; name: string; key: string; status: ProjectStatus };
  permissions: IssuePermissions;
  createdAt: Date;
}

/** Everything the client needs to render pager controls. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface IssueListResult {
  issues: IssueSummary[];
  pagination: Pagination;
  /** Only the filters that are actually in use, so an empty search stays quiet. */
  filters: Record<string, string | boolean>;
}
