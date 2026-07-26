import { z } from 'zod';

const projectName = z
  .string()
  .trim()
  .min(2, 'Project name must be at least 2 characters.')
  .max(100, 'Project name must be at most 100 characters.');

const projectDescription = z
  .string()
  .trim()
  .max(1000, 'Description must be at most 1000 characters.');

/**
 * The key is uppercased before the pattern is checked, so "api" and "API" are
 * the same key and the client never has to shout.
 */
const projectKey = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Project key must be at least 2 characters.')
  .max(10, 'Project key must be at most 10 characters.')
  .regex(/^[A-Z0-9]+$/, 'Project key may only contain letters and numbers.');

const projectStatus = z.enum(['ACTIVE', 'ARCHIVED'], {
  message: 'Status must be ACTIVE or ARCHIVED.',
});

export const createProjectSchema = z.object({
  name: projectName,
  key: projectKey,
  description: projectDescription.optional(),
});

/**
 * Partial on purpose: a PATCH may carry one field. `key`, `workspaceId` and
 * `createdById` are simply absent here, so they can never be changed.
 */
export const updateProjectSchema = z
  .object({
    name: projectName.optional(),
    description: projectDescription.nullable().optional(),
    status: projectStatus.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  });

export const listProjectsQuerySchema = z.object({
  status: projectStatus.optional(),
  search: z.string().trim().max(100, 'Search text is too long.').optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Deleting a project is permanent, so the request has to say so out loud. A
 * stray DELETE without a body can never remove a project by accident.
 */
export const deleteProjectSchema = z.object({
  confirm: z.literal(true, { message: 'Send confirm: true to delete this project.' }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
