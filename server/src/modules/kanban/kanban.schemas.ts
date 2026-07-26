import { z } from 'zod';

/**
 * A move is only ever two values: where the card should land and how far down.
 *
 * A negative index is rejected as a validation error. An index past the end of
 * the destination column is *clamped* to the end instead, because dropping a
 * card below the last one is a normal gesture, not a mistake.
 */
export const moveIssueSchema = z.object({
  targetStatus: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], {
    message: 'Status must be a valid issue status.',
  }),
  targetIndex: z
    .number({ message: 'Target index must be a whole number.' })
    .int('Target index must be a whole number.')
    .min(0, 'Target index must be 0 or greater.'),
});

export type MoveIssueInput = z.infer<typeof moveIssueSchema>;
