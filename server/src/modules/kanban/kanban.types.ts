import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  ProjectStatus,
} from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { IssueSprintRef } from '../issues/issue.types.js';

/** What the current user may do with this card, decided by the server. */
export interface BoardIssuePermissions {
  canMove: boolean;
  canEdit: boolean;
}

/**
 * Summary shown on a card. Descriptions and comments are deliberately absent:
 * a board with a hundred cards would otherwise ship a hundred long texts.
 */
export interface BoardIssue {
  id: string;
  number: number;
  displayKey: string;
  title: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  position: number;
  assignee: SafeUser | null;
  reporter: SafeUser;
  sprint: IssueSprintRef | null;
  dueDate: Date | null;
  permissions: BoardIssuePermissions;
}

export interface BoardColumn {
  status: IssueStatus;
  issues: BoardIssue[];
}

export interface BoardResult {
  project: { id: string; name: string; key: string; status: ProjectStatus };
  /** Always the five statuses in board order, empty columns included. */
  columns: BoardColumn[];
}
