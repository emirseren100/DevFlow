import 'dotenv/config';

/**
 * Single place that reads process.env. Everything else imports `config`, so an
 * environment variable is never read from two different spots.
 * Zod-based validation replaces these defaults in a later phase.
 */
export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5174',
} as const;
