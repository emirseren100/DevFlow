import { z } from 'zod';

// A workspace name is trimmed first, so "  Acme  " and "Acme" are the same name
// and a name made only of spaces cannot pass the minimum length.
const workspaceName = z
  .string()
  .trim()
  .min(2, 'Workspace name must be at least 2 characters.')
  .max(80, 'Workspace name must be at most 80 characters.');

const memberEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Enter a valid email address.');

/**
 * OWNER is deliberately missing: ownership is decided when the workspace is
 * created and can never be granted through the member endpoints.
 */
const assignableRole = z.enum(['ADMIN', 'MEMBER'], {
  message: 'Role must be ADMIN or MEMBER.',
});

export const createWorkspaceSchema = z.object({ name: workspaceName });

export const updateWorkspaceSchema = z.object({ name: workspaceName });

export const addMemberSchema = z.object({
  email: memberEmail,
  role: assignableRole.optional().default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({ role: assignableRole });

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
