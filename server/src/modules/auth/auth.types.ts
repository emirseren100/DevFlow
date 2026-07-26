import type { Request } from 'express';

/**
 * The only user shape that leaves the server. Password hashes and session
 * hashes are not part of it, so they cannot reach a response by accident.
 */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
}

// Express type augmentation: requireAuth attaches only safe data to a request.
declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Undefined on public routes. */
      user?: SafeUser;
      /** Session row id of the current request. Used by logout. */
      sessionId?: string;
    }
  }
}

/** A request that already passed requireAuth, so `user` is guaranteed. */
export type AuthenticatedRequest = Request & { user: SafeUser; sessionId: string };
