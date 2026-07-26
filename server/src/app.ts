import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { issueRouter } from './modules/issues/issue.routes.js';
import { projectRouter } from './modules/projects/project.routes.js';
import { sprintRouter } from './modules/sprints/sprint.routes.js';
import { workspaceRouter } from './modules/workspaces/workspace.routes.js';
import { healthRouter } from './routes/health.js';

/**
 * Builds the Express application without opening a port. Tests import this and
 * hand it to Supertest; only server.ts turns it into a listening server.
 */
export function createApp() {
  const app = express();

  // A single exact origin, never "*": a wildcard origin is not allowed together
  // with credentials, and the session cookie needs credentials.
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Health stays public; /api/auth/me and every workspace route need a session.
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', workspaceRouter);
  app.use('/api', projectRouter);
  app.use('/api', sprintRouter);
  app.use('/api', issueRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
