import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/apiError.js';

/**
 * Last middleware in the chain. Express recognizes it as an error handler
 * because it takes four arguments, so every thrown error ends up here and the
 * client always receives the same response shape.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    // Expected, already-classified failures. Not a server fault, so they are
    // not logged as errors and never carry internal details to the client.
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    });
    return;
  }

  console.error(error);

  // Unexpected errors: no message, no stack trace leaves the server.
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
