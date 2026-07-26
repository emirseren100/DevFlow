import 'dotenv/config';

import { z } from 'zod';

/**
 * The single place that reads `process.env`.
 *
 * Everything else imports `config`, so an environment variable is never read
 * from two different spots — and a missing or malformed one stops the process
 * at startup instead of producing a confusing failure hours later.
 */

/** A number written as a string in the environment. */
function numeric(label: string) {
  return z
    .string()
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number.`)
    .transform(Number);
}

/** `http://localhost:5174` — an absolute origin with no path and no trailing slash. */
const originSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);

      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.pathname === '/' &&
        !value.endsWith('/')
      );
    } catch {
      return false;
    }
  }, 'CLIENT_ORIGIN must be an absolute http(s) origin without a path, for example http://localhost:5174.');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: numeric('PORT').default(4000),
  CLIENT_ORIGIN: originSchema.default('http://localhost:5174'),
  // No default: a wrong database URL should fail loudly, not silently connect
  // somewhere unexpected. Only database code reads this value.
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required.'),
  // How many PostgreSQL connections the pool may open at once. The local
  // disposable `prisma dev` server drops connections past a handful, which
  // corrupts requests that run in parallel, so it is configurable per machine.
  DATABASE_POOL_MAX: numeric('DATABASE_POOL_MAX').default(10),
  // The session cookie carries the raw opaque token; only its SHA-256 hash is
  // stored. The same lifetime is used for the cookie and for the Session row.
  SESSION_COOKIE_NAME: z.string().trim().min(1).default('devflow_session'),
  SESSION_TTL_DAYS: numeric('SESSION_TTL_DAYS').default(7),
  // Attempts allowed per IP on login and register inside the window below.
  AUTH_RATE_LIMIT_MAX: numeric('AUTH_RATE_LIMIT_MAX').default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: numeric('AUTH_RATE_LIMIT_WINDOW_MINUTES').default(15),
});

export type ServerEnv = z.infer<typeof envSchema>;

/**
 * Turns Zod's report into a short list of names and reasons.
 *
 * Only the variable *name* and the rule it broke are printed. A value is never
 * echoed, because `DATABASE_URL` contains a password.
 */
function describeFailure(error: z.ZodError): string {
  const lines = error.issues.map((issue) => `  - ${String(issue.path[0])}: ${issue.message}`);

  return `Invalid server environment:\n${lines.join('\n')}`;
}

export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(describeFailure(result.error));
  }

  return result.data;
}

const env = parseServerEnv(process.env);

const isProduction = env.NODE_ENV === 'production';

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction,
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  databasePoolMax: env.DATABASE_POOL_MAX,
  sessionCookieName: env.SESSION_COOKIE_NAME,
  sessionTtlDays: env.SESSION_TTL_DAYS,
  authRateLimit: {
    max: env.AUTH_RATE_LIMIT_MAX,
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  },
} as const;

export const SESSION_TTL_MS = config.sessionTtlDays * 24 * 60 * 60 * 1000;
