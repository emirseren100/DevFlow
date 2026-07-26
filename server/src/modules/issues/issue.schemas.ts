import { z } from 'zod';

const issueTitle = z
  .string()
  .trim()
  .min(2, 'Title must be at least 2 characters.')
  .max(200, 'Title must be at most 200 characters.');

const issueDescription = z
  .string()
  .trim()
  .max(10000, 'Description must be at most 10000 characters.');

const issueType = z.enum(['TASK', 'BUG'], { message: 'Type must be TASK or BUG.' });

const issueStatus = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], {
  message: 'Status must be a valid issue status.',
});

const issuePriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
  message: 'Priority must be LOW, MEDIUM, HIGH or URGENT.',
});

/** `null` clears the relation; the id itself is always checked in the service. */
const optionalId = z.string().trim().min(1).nullable().optional();

const optionalDate = z.coerce.date({ message: 'Enter a valid date.' }).nullable().optional();

/**
 * `reporterId`, `number`, `projectId` and `workspaceId` are deliberately absent
 * from both schemas: the reporter is the signed-in user, the number comes from
 * the project counter, and the project comes from the URL.
 */
export const createIssueSchema = z.object({
  title: issueTitle,
  description: issueDescription.optional(),
  type: issueType,
  priority: issuePriority,
  status: issueStatus.optional().default('BACKLOG'),
  assigneeId: optionalId,
  sprintId: optionalId,
  dueDate: optionalDate,
});

export const updateIssueSchema = z
  .object({
    title: issueTitle.optional(),
    description: issueDescription.nullable().optional(),
    type: issueType.optional(),
    status: issueStatus.optional(),
    priority: issuePriority.optional(),
    assigneeId: optionalId,
    sprintId: optionalId,
    dueDate: optionalDate,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  });

/** A page size is capped so one request can never ask for the whole table. */
const page = z.coerce.number().int().min(1, 'Page must be 1 or greater.').default(1);

const limit = z.coerce
  .number()
  .int()
  .min(1, 'Limit must be at least 1.')
  .max(100, 'Limit must be at most 100.')
  .default(20);

/** Query strings only ever contain text, so "true" is what the client sends. */
const booleanFlag = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((value) => value === true || value === 'true')
  .optional();

export const listIssuesQuerySchema = z.object({
  search: z.string().trim().max(200, 'Search text is too long.').optional(),
  status: issueStatus.optional(),
  type: issueType.optional(),
  priority: issuePriority.optional(),
  assigneeId: z.string().trim().min(1).optional(),
  reporterId: z.string().trim().min(1).optional(),
  sprintId: z.string().trim().min(1).optional(),
  unassigned: booleanFlag,
  page,
  limit,
  sort: z.enum(['number', 'createdAt', 'updatedAt', 'priority', 'dueDate']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
