import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createAuthRateLimiter } from './middleware/rateLimit.js';
import { requireAllowedOrigin } from './middleware/requireAllowedOrigin.js';
import {
  createClientRouter,
  hasClientBuild,
  resolveClientDistPath,
} from './middleware/serveClient.js';
import { activityRouter } from './modules/activities/activity.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { commentRouter } from './modules/comments/comment.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { issueRouter } from './modules/issues/issue.routes.js';
import { kanbanRouter } from './modules/kanban/kanban.routes.js';
import { projectRouter } from './modules/projects/project.routes.js';
import { sprintRouter } from './modules/sprints/sprint.routes.js';
import { workspaceRouter } from './modules/workspaces/workspace.routes.js';
import { healthRouter } from './routes/health.js';

/** Largest JSON body the API accepts. A 10 000-character issue description is ~10kb. */
const JSON_BODY_LIMIT = '100kb';

/**
 * Builds the Express application without opening a port. Tests import this and
 * hand it to Supertest; only server.ts turns it into a listening server.
 *
 * Middleware order matters and is deliberate:
 *
 * 1. security headers        — on every response, including error responses
 * 2. CORS                    — must answer the preflight before anything refuses it
 * 3. body parsing            — with a size limit
 * 4. cookies                 — the session token arrives as one
 * 5. allowed-origin check    — after CORS, so `OPTIONS` still works
 * 6. routes
 * 7. 404, then the error handler
 */
export function createApp() {
  const app = express();

  // "X-Powered-By: Express" tells an attacker which stack to look up exploits
  // for and helps nobody else.
  app.disable('x-powered-by');

  // Behind the platform's HTTPS proxy (Render), the client address arrives in
  // `X-Forwarded-For`. Trusting exactly one hop makes `req.ip` the real caller
  // again, which is what the login rate limiter counts. More than one hop is
  // not trusted, because anyone could then forge the header.
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  // Sensible security headers. A Content-Security-Policy protects a *document*,
  // so it is switched on exactly when this process serves one: in the
  // same-origin production deployment. When the API answers JSON only (local
  // development, and the Docker Compose stack where nginx serves the client)
  // there is no document here to protect. `crossOriginResourcePolicy` stays
  // `cross-origin` for that split setup.
  app.use(
    helmet({
      contentSecurityPolicy: config.serveClient
        ? {
            useDefaults: false,
            directives: {
              defaultSrc: ["'self'"],
              baseUri: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              formAction: ["'self'"],
              scriptSrc: ["'self'"],
              // React writes layout through style attributes, and Vite inlines
              // a small style block; neither is user content.
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              fontSrc: ["'self'", 'data:'],
              // Same origin only — the client never calls a third-party API.
              connectSrc: ["'self'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // A single exact origin, never "*": a wildcard origin is not allowed together
  // with credentials, and the session cookie needs credentials.
  app.use(cors({ origin: config.clientOrigin, credentials: true }));

  // An unbounded body is a free denial-of-service: anyone could stream
  // gigabytes into memory. Anything larger is refused as 413.
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  // Every POST/PUT/PATCH/DELETE must come from the configured client origin.
  app.use(requireAllowedOrigin);

  // Only the two guessable endpoints are rate limited, not the whole API.
  const authRateLimiter = createAuthRateLimiter();

  app.use('/api/auth/login', authRateLimiter);
  app.use('/api/auth/register', authRateLimiter);

  // Health stays public; /api/auth/me and every workspace route need a session.
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', workspaceRouter);
  app.use('/api', projectRouter);
  app.use('/api', sprintRouter);
  app.use('/api', issueRouter);
  app.use('/api', commentRouter);
  app.use('/api', activityRouter);
  app.use('/api', kanbanRouter);
  app.use('/api', dashboardRouter);

  // An unknown /api address is answered here, before the client router exists.
  // The API always speaks JSON: a caller expecting JSON must never be handed
  // the single-page application's HTML document instead.
  app.use('/api', notFound);

  // Production only: the same origin also serves the built React client.
  if (config.serveClient) {
    const clientDistPath = resolveClientDistPath(config.clientDistPath);

    if (hasClientBuild(clientDistPath)) {
      app.use(createClientRouter(clientDistPath));
    } else {
      // The API is still perfectly usable — the Docker Compose server image, for
      // example, contains no client at all — so this is a warning, not a crash.
      console.warn(`No client build found at ${clientDistPath}; serving the API only.`);
    }
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
