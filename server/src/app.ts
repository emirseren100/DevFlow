import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { healthRouter } from './routes/health.js';

/**
 * Builds the Express application without opening a port. Tests import this and
 * hand it to Supertest; only server.ts turns it into a listening server.
 */
export function createApp() {
  const app = express();

  // credentials is already enabled so the Phase 3 session cookie works.
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());

  app.use('/api', healthRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
