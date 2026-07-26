import { z } from 'zod';

/** A page size is capped, so one request can never ask for the whole feed. */
const page = z.coerce.number().int().min(1, 'Page must be 1 or greater.').default(1);

const limit = z.coerce
  .number()
  .int()
  .min(1, 'Limit must be at least 1.')
  .max(100, 'Limit must be at most 100.')
  .default(20);

const activityType = z.enum(
  [
    'WORKSPACE_CREATED',
    'MEMBER_ADDED',
    'PROJECT_CREATED',
    'ISSUE_CREATED',
    'ISSUE_UPDATED',
    'ISSUE_STATUS_CHANGED',
    'ISSUE_ASSIGNED',
    'COMMENT_CREATED',
  ],
  { message: 'Type must be a valid activity type.' },
);

export const listActivitiesQuerySchema = z.object({
  page,
  limit,
  type: activityType.optional(),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
