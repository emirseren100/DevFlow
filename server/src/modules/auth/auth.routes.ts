import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../../lib/apiError.js';
import { attachSession, requireAuth } from './auth.middleware.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  registerUser,
  setSessionCookie,
  verifyCredentials,
} from './auth.service.js';

export const authRouter = Router();

/** Turns a Zod failure into `{ field: [messages] }` for the client form. */
function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'form';
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return fieldErrors;
}

function parseBody<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.validation(toFieldErrors(error));
    }

    throw error;
  }
}

// Every auth route may need to know about an existing session.
authRouter.use(attachSession);

authRouter.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseBody(registerSchema, req.body);
    const user = await registerUser(input);
    const token = await createSession(user.id);

    setSessionCookie(res, token);
    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseBody(loginSchema, req.body);
    const user = await verifyCredentials(input);
    const token = await createSession(user.id);

    setSessionCookie(res, token);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/auth/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId) {
      await deleteSession(req.sessionId);
    }

    // Always succeeds: logging out twice is not an error.
    clearSessionCookie(res);
    res.json({ success: true, data: { loggedOut: true } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});
