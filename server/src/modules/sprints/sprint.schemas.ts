import { z } from 'zod';

const sprintName = z
  .string()
  .trim()
  .min(2, 'Sprint name must be at least 2 characters.')
  .max(80, 'Sprint name must be at most 80 characters.');

const sprintGoal = z.string().trim().max(1000, 'Goal must be at most 1000 characters.');

const sprintStatus = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED'], {
  message: 'Status must be PLANNED, ACTIVE or COMPLETED.',
});

/**
 * Dates arrive as JSON strings. `coerce` turns them into real Date objects and
 * rejects anything that is not a usable date, so no invalid date reaches the
 * database. `null` is allowed on purpose: it is how a date is cleared.
 */
const optionalDate = z.coerce.date({ message: 'Enter a valid date.' }).nullable().optional();

/** endDate before startDate is meaningless, so both endpoints refuse it. */
function endNotBeforeStart(value: {
  startDate?: Date | null | undefined;
  endDate?: Date | null | undefined;
}): boolean {
  if (!value.startDate || !value.endDate) {
    return true;
  }

  return value.endDate.getTime() >= value.startDate.getTime();
}

const DATE_RANGE_MESSAGE = {
  message: 'The end date cannot be before the start date.',
  path: ['endDate'],
};

export const createSprintSchema = z
  .object({
    name: sprintName,
    goal: sprintGoal.optional(),
    status: sprintStatus.optional().default('PLANNED'),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(endNotBeforeStart, DATE_RANGE_MESSAGE);

export const updateSprintSchema = z
  .object({
    name: sprintName.optional(),
    goal: sprintGoal.nullable().optional(),
    status: sprintStatus.optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Send at least one field to update.',
  })
  .refine(endNotBeforeStart, DATE_RANGE_MESSAGE);

export const listSprintsQuerySchema = z.object({
  status: sprintStatus.optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type ListSprintsQuery = z.infer<typeof listSprintsQuerySchema>;
