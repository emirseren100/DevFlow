import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';

/**
 * Single place that reads process.env. Everything else imports `config`, so an
 * environment variable is never read from two different spots.
 * Zod-based validation replaces these defaults in a later phase.
 */
export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5174',
  // No default: a wrong database URL should fail loudly, not silently connect
  // somewhere unexpected. Only database code reads this value.
  databaseUrl: process.env.DATABASE_URL ?? '',
  // The session cookie carries the raw opaque token; only its SHA-256 hash is
  // stored. The same lifetime is used for the cookie and for the Session row.
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'devflow_session',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7),
} as const;

export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000;
