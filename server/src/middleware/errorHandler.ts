import type { NextFunction, Request, Response } from 'express';

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
  console.error(error);

  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' },
  });
}
