import { z } from 'zod';

/**
 * Comment bodies are plain text.
 *
 * `trim()` runs before the length checks, so "   " has length 0 and is rejected
 * as an empty comment instead of being stored as invisible whitespace.
 */
const commentBody = z
  .string()
  .trim()
  .min(1, 'A comment cannot be empty.')
  .max(5000, 'A comment must be at most 5000 characters.');

export const createCommentSchema = z.object({ body: commentBody });

/** The author may only change the text; nothing else about a comment moves. */
export const updateCommentSchema = z.object({ body: commentBody });

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
