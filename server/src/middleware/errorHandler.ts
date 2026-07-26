import type { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';
import { ApiError } from '../lib/apiError.js';

/** Shape `express.json()` uses for a body it refused to accept. */
interface BodyParserError {
  type?: string;
  status?: number;
}

/**
 * Recognises the two failures `express.json()` produces before any route runs,
 * and turns them into ordinary API errors instead of anonymous 500s.
 */
function asBodyError(error: unknown): ApiError | null {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return null;
  }

  const { type } = error as BodyParserError;

  if (type === 'entity.too.large') {
    return ApiError.payloadTooLarge();
  }

  if (type === 'entity.parse.failed') {
    return ApiError.malformedJson();
  }

  return null;
}

/**
 * Last middleware in the chain. Express recognizes it as an error handler
 * because it takes four arguments, so every thrown error ends up here and the
 * client always receives the same response shape.
 *
 * Nothing internal ever leaves this function: no stack trace, no Prisma
 * message, no file path and no environment value. An unexpected failure is one
 * fixed sentence plus `INTERNAL_ERROR`, and the details stay in the server log
 * where a developer — and only a developer — can read them.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const classified = error instanceof ApiError ? error : asBodyError(error);

  if (classified) {
    // Expected, already-classified failures. Not a server fault, so they are
    // not logged as errors and never carry internal details to the client.
    res.status(classified.status).json({
      success: false,
      error: {
        code: classified.code,
        message: classified.message,
        ...(classified.fieldErrors ? { fieldErrors: classified.fieldErrors } : {}),
      },
    });
    return;
  }

  // Tests exercise failure paths on purpose; printing their stack traces would
  // bury the actual test output.
  if (!config.isTest) {
    console.error(error);
  }

  // Unexpected errors: no message, no stack trace leaves the server.
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
