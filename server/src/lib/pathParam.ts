import type { Request } from 'express';

/**
 * Express types a route parameter as `string | string[]`, because a wildcard
 * pattern can match several segments. Every DevFlow route parameter is a single
 * id, so this returns one string and never lets an array reach a database query.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];

  return typeof value === 'string' ? value : '';
}
