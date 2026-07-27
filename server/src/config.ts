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
function originSchemaFor(label: string) {
  return z
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
    }, `${label} must be an absolute http(s) origin without a path, for example http://localhost:5174.`);
}

const originSchema = originSchemaFor('CLIENT_ORIGIN');

/** The origin a local `npm run dev` uses. Never applied in production. */
const LOCAL_CLIENT_ORIGIN = 'http://localhost:5174';

/**
 * Render publishes the service address as `RENDER_EXTERNAL_URL`. It is written
 * without a trailing slash, but one is stripped anyway so a hand-typed value in
 * the dashboard cannot fail the origin rule.
 */
const renderExternalUrlSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\/+$/, ''))
  .pipe(originSchemaFor('RENDER_EXTERNAL_URL'));

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Render (and every other platform) assigns the port; 4000 is the local
  // fallback only.
  PORT: numeric('PORT').default(4000),
  // No default here: the default depends on NODE_ENV and is applied below, so
  // production can never silently trust http://localhost:5174.
  CLIENT_ORIGIN: originSchema.optional(),
  RENDER_EXTERNAL_URL: renderExternalUrlSchema.optional(),
  // Whether this process also serves the built React client. Defaults to
  // "production", which is the same-origin deployment; a value here is only
  // needed to switch it off, or on for a local production rehearsal.
  SERVE_CLIENT: z.enum(['true', 'false']).optional(),
  // Where the built client lives, when it is not next to the server output.
  CLIENT_DIST_PATH: z.string().trim().min(1).optional(),
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

/**
 * Resolves the one origin the deployed application is served from.
 *
 * Exactly one origin is trusted, in this order:
 *
 * 1. `CLIENT_ORIGIN` — set by hand, for a custom domain
 * 2. `RENDER_EXTERNAL_URL` — the address the platform itself publishes
 * 3. `http://localhost:5174` — **outside production only**
 *
 * Production has no fallback on purpose. Guessing an origin would either block
 * the real client or trust an address nobody chose, and both are worse than a
 * container that refuses to start with a readable message.
 */
const envSchema = baseEnvSchema.transform((env, ctx) => {
  const resolvedOrigin =
    env.CLIENT_ORIGIN ??
    env.RENDER_EXTERNAL_URL ??
    (env.NODE_ENV === 'production' ? undefined : LOCAL_CLIENT_ORIGIN);

  if (!resolvedOrigin) {
    ctx.addIssue({
      code: 'custom',
      path: ['CLIENT_ORIGIN'],
      message:
        'CLIENT_ORIGIN is required in production when RENDER_EXTERNAL_URL is not provided, for example https://devflow.example.com.',
    });

    return z.NEVER;
  }

  return { ...env, CLIENT_ORIGIN: resolvedOrigin };
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
  // The same process answers the API and serves the built client in the
  // same-origin deployment; a local `npm run dev` keeps using the Vite server.
  serveClient: env.SERVE_CLIENT ? env.SERVE_CLIENT === 'true' : isProduction,
  clientDistPath: env.CLIENT_DIST_PATH,
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
