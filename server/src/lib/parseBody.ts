import { ZodError } from 'zod';

import { ApiError } from './apiError.js';

/** Turns a Zod failure into `{ field: [messages] }` for the client form. */
function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'form';
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}

/**
 * Single validation entry point for every route: unknown request data goes in,
 * a typed value comes out, and a failure always becomes the same
 * VALIDATION_ERROR response.
 */
export function parseBody<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.validation(toFieldErrors(error));
    }

    throw error;
  }
}
