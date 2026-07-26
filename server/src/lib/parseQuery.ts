import { ZodError } from 'zod';

import { ApiError } from './apiError.js';

/**
 * Validation entry point for list endpoints.
 *
 * A bad query string is not a form mistake, so it does not become a
 * VALIDATION_ERROR with field errors. A wrong sort or order gets INVALID_SORT
 * and every other bad filter value gets INVALID_FILTER, which are the two
 * stable codes the client can react to.
 */
export function parseQuery<T>(schema: { parse: (value: unknown) => T }, query: unknown): T {
  try {
    return schema.parse(query);
  } catch (error) {
    if (!(error instanceof ZodError)) {
      throw error;
    }

    const first = error.issues[0];
    const field = first?.path[0];
    const message = first?.message ?? 'This query is not supported.';

    if (field === 'sort' || field === 'order') {
      throw ApiError.invalidSort(message);
    }

    throw ApiError.invalidFilter(message);
  }
}
