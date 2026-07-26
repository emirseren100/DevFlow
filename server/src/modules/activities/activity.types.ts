import type { ActivityType } from '../../generated/prisma/enums.js';
import type { SafeUser } from '../auth/auth.types.js';
import type { Pagination } from '../issues/issue.types.js';

/** Small values only. Anything outside the whitelist is dropped before sending. */
export type ActivityMetadata = Record<string, string | number | boolean | null | string[]>;

/** Issue reference shown next to an activity. Never the whole issue. */
export interface ActivityIssueRef {
  id: string;
  number: number;
  displayKey: string;
  title: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  createdAt: Date;
  /** `null` for a future system action; the client renders it as "System". */
  actor: SafeUser | null;
  project: { id: string; name: string; key: string } | null;
  issue: ActivityIssueRef | null;
  metadata: ActivityMetadata;
}

export interface ActivityListResult {
  activities: ActivityItem[];
  pagination: Pagination;
}
