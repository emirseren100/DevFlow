import type { NextFunction, Request, Response } from 'express';

import { config } from '../../config.js';
import { ApiError } from '../../lib/apiError.js';
import { getSessionContext } from './auth.service.js';
import './auth.types.js';

function readSessionToken(req: Request): string | undefined {
  const token: unknown = req.cookies?.[config.sessionCookieName];

  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

/**
 * Reads the session cookie without failing. Routes that behave differently for
 * a guest (logout) use this; routes that need a user use requireAuth.
 */
export async function attachSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = readSessionToken(req);

    if (token) {
      const session = await getSessionContext(token);

      if (session) {
        req.user = session.user;
        req.sessionId = session.sessionId;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Gate for every protected route. Runs after attachSession and rejects the
 * request with 401 when no valid, unexpired session was found.
 * Authorization (who may do what inside a workspace) arrives in Phase 4.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(ApiError.unauthenticated());
    return;
  }

  next();
}
