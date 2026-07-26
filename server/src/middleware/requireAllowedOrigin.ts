import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { config } from '../config.js';
import { ApiError } from '../lib/apiError.js';

/** Methods that only read. They never change state, so they are never blocked. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * A small, readable defence against cross-site request forgery.
 *
 * The session lives in a cookie, and the browser attaches a cookie to a request
 * no matter which page started it. `SameSite=Lax` already stops the common
 * cross-site `POST`, and CORS stops another origin from *reading* the answer —
 * but neither is a reason to skip the check on the server.
 *
 * The rule is deliberately simple: a state-changing request must either come
 * from the configured client origin, or come from something that is not a
 * browser at all.
 *
 * **Why a missing `Origin` is accepted outside production.** Browsers always
 * send `Origin` on `POST`, `PUT`, `PATCH` and `DELETE`, so a forged cross-site
 * request cannot hide it — `Origin` cannot be set by page JavaScript. A request
 * without the header therefore did not come from a browser: it is `curl`, a
 * test agent or a development script. In production that is refused as well,
 * because the deployed API should only ever be used by the deployed client.
 *
 * This is not a full CSRF-token implementation, and the deployment topology
 * (same site, different subdomain, or a proxy in front) has to be reviewed
 * again in the deployment phase, because it changes what `SameSite` does.
 */
export const requireAllowedOrigin: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');

  if (origin === config.clientOrigin) {
    next();
    return;
  }

  if (!origin && !config.isProduction) {
    next();
    return;
  }

  next(ApiError.invalidOrigin());
};
