import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

import { config } from '../config.js';
import { ApiError } from '../lib/apiError.js';

/**
 * Attempt limit for `POST /api/auth/login` and `POST /api/auth/register`.
 *
 * Only those two routes are limited. They are the ones worth guessing at, and a
 * limit on every endpoint would punish a normal session — a Kanban board alone
 * makes several requests per screen.
 *
 * The counter is per IP and lives in memory, which is the right size for a
 * single-process MVP: it is lost on restart and it is not shared between
 * instances. A deployment with several instances needs a shared store, and that
 * belongs to the deployment phase.
 */
export function buildAuthRateLimiter(options: {
  max: number;
  windowMs: number;
}): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    // The modern `RateLimit` headers only; the legacy `X-RateLimit-*` set is
    // redundant and tells a scanner more than it needs to know.
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // The refusal goes through the normal error handler, so a blocked attempt
    // has the same `{ success: false, error: { code, message } }` shape as
    // everything else — and its message is identical for a known and an
    // unknown email, so the limiter never becomes a way to find accounts.
    handler: (_req, _res, next) => next(ApiError.rateLimited()),
  });
}

/**
 * The limiter the application actually installs.
 *
 * Tests must not sit through a 15-minute window, and they legitimately register
 * dozens of accounts from one address, so the limiter is disabled under
 * `NODE_ENV=test`. The behaviour itself is still covered: the security test
 * builds its own limiter with a small maximum through `buildAuthRateLimiter`.
 */
export function createAuthRateLimiter(): RequestHandler {
  if (config.isTest) {
    return (_req, _res, next) => next();
  }

  return buildAuthRateLimiter(config.authRateLimit);
}
