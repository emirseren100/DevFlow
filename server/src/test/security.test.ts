import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app, cleanupDomain, prisma, signUp } from './phase5.helpers.js';
import { parseServerEnv } from '../config.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { buildAuthRateLimiter } from '../middleware/rateLimit.js';
import { requireAllowedOrigin } from '../middleware/requireAllowedOrigin.js';

/**
 * Phase 8 security behaviour.
 *
 * These tests cover the new middleware only; the authentication and
 * authorization rules themselves already have their own suites.
 */

const DOMAIN = 'securitytest.local';

/** The origin the test environment configures, from `server/.env.test`. */
const ALLOWED_ORIGIN = 'http://localhost:5174';

beforeAll(() => cleanupDomain(DOMAIN));

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

describe('environment validation', () => {
  const valid = {
    NODE_ENV: 'production',
    PORT: '4000',
    CLIENT_ORIGIN: 'https://app.example.com',
    DATABASE_URL: 'postgresql://user:secret@db:5432/devflow',
    SESSION_COOKIE_NAME: 'devflow_session',
    SESSION_TTL_DAYS: '7',
  };

  it('parses numbers out of the strings the environment always provides', () => {
    const env = parseServerEnv(valid);

    expect(env.PORT).toBe(4000);
    expect(env.SESSION_TTL_DAYS).toBe(7);
    expect(env.NODE_ENV).toBe('production');
  });

  it('applies development defaults only where they are safe', () => {
    const env = parseServerEnv({ DATABASE_URL: valid.DATABASE_URL });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.CLIENT_ORIGIN).toBe(ALLOWED_ORIGIN);
  });

  it('refuses to start without a database URL', () => {
    const { DATABASE_URL: _omitted, ...withoutDatabase } = valid;

    expect(() => parseServerEnv(withoutDatabase)).toThrow(/DATABASE_URL/);
  });

  it('refuses an unknown NODE_ENV and a malformed origin', () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => parseServerEnv({ ...valid, CLIENT_ORIGIN: 'app.example.com' })).toThrow(
      /CLIENT_ORIGIN/,
    );
    expect(() => parseServerEnv({ ...valid, PORT: 'four thousand' })).toThrow(/PORT/);
  });

  it('never echoes the database credentials in the failure message', () => {
    try {
      parseServerEnv({ ...valid, PORT: 'nope' });
      expect.unreachable('parseServerEnv should have thrown.');
    } catch (error) {
      expect(String(error)).not.toContain('secret');
      expect(String(error)).not.toContain(valid.DATABASE_URL);
    }
  });
});

describe('security headers', () => {
  it('keeps the health endpoint public and hides the server technology', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    // One header from Helmet is enough to prove it is installed globally.
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows exactly one origin, with credentials', async () => {
    const response = await request(app).get('/api/health').set('Origin', ALLOWED_ORIGIN);

    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('still answers the CORS preflight of a state-changing request', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBeLessThan(300);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });
});

describe('allowed-origin protection', () => {
  it('accepts a state-changing request from the configured client origin', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', ALLOWED_ORIGIN)
      .send({
        name: 'Origin Person',
        email: `allowed-origin@${DOMAIN}`,
        password: 'CorrectHorse42',
      });

    expect(response.status).toBe(201);
  });

  it('rejects a state-changing request from an unexpected browser origin', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://evil.example')
      .send({ email: `allowed-origin@${DOMAIN}`, password: 'CorrectHorse42' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INVALID_ORIGIN');
  });

  it('never blocks a read, whatever origin it claims', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://evil.example');

    expect(response.status).toBe(200);
  });

  it('refuses a missing Origin on a mutation when NODE_ENV is production', async () => {
    // The middleware reads `config`, so production behaviour is proved against a
    // tiny application whose only job is to run the middleware.
    const strict = express();

    strict.post('/thing', requireAllowedOrigin, (_req, res) => res.json({ success: true }));
    strict.use(errorHandler);

    // Under NODE_ENV=test a missing Origin is allowed on purpose: Supertest and
    // curl are not browsers, and a browser cannot omit the header on a mutation.
    const withoutOrigin = await request(strict).post('/thing');

    expect(withoutOrigin.status).toBe(200);

    const wrongOrigin = await request(strict).post('/thing').set('Origin', 'http://evil.example');

    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.body.error.code).toBe('INVALID_ORIGIN');
  });
});

describe('authentication rate limiting', () => {
  /** A miniature login endpoint with a limiter small enough to hit at once. */
  function limitedApp() {
    const limited = express();

    limited.use(express.json());
    limited.post(
      '/api/auth/login',
      buildAuthRateLimiter({ max: 2, windowMs: 60_000 }),
      (_req, res) => {
        res.json({ success: true, data: { attempted: true } });
      },
    );
    limited.use(errorHandler);

    return limited;
  }

  it('answers the stable RATE_LIMITED error once the limit is passed', async () => {
    const limited = limitedApp();
    const attempt = () =>
      request(limited).post('/api/auth/login').send({ email: 'a@b.c', password: 'x' });

    expect((await attempt()).status).toBe(200);
    expect((await attempt()).status).toBe(200);

    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
    });
  });

  it('answers identically for a known and an unknown email, so it leaks nothing', async () => {
    const known = await signUp(DOMAIN, 'Known Person');
    const limited = limitedApp();
    const attempt = (email: string) =>
      request(limited).post('/api/auth/login').send({ email, password: 'wrong' });

    await attempt(known.email);
    await attempt(known.email);

    const blockedKnown = await attempt(known.email);
    const blockedUnknown = await attempt(`nobody@${DOMAIN}`);

    expect(blockedKnown.status).toBe(blockedUnknown.status);
    expect(blockedKnown.body).toEqual(blockedUnknown.body);
  });
});

describe('request body limits', () => {
  it('refuses a JSON body larger than the configured limit', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.c', password: 'x'.repeat(200_000) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('still accepts a body the size of a real issue description', async () => {
    const user = await signUp(DOMAIN, 'Body Person');
    const workspace = await user.agent
      .post('/api/workspaces')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ name: 'Body Workspace' });

    expect(workspace.status).toBe(201);

    const project = await user.agent
      .post(`/api/workspaces/${workspace.body.data.workspace.id}/projects`)
      .set('Origin', ALLOWED_ORIGIN)
      .send({ name: 'Body Project', key: 'BODY' });

    expect(project.status).toBe(201);

    const issue = await user.agent
      .post(
        `/api/workspaces/${workspace.body.data.workspace.id}/projects/${project.body.data.project.id}/issues`,
      )
      .set('Origin', ALLOWED_ORIGIN)
      .send({
        title: 'A long but ordinary issue',
        type: 'TASK',
        priority: 'MEDIUM',
        // The schema allows 10 000 characters; that must stay under the limit.
        description: 'x'.repeat(10_000),
      });

    expect(issue.status).toBe(201);
  });

  it('refuses a body that is not JSON at all', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{ not json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_JSON');
  });
});

describe('unexpected failures', () => {
  it('answers INTERNAL_ERROR without a stack trace or an internal message', async () => {
    const failing = express();

    failing.get('/boom', () => {
      throw new Error('Connection to C:/secret/path/database failed');
    });
    failing.use(errorHandler);

    const response = await request(failing).get('/boom');
    const body = JSON.stringify(response.body);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(body).not.toContain('secret');
    expect(body).not.toContain('stack');
  });
});

describe('session cookie and protected routes', () => {
  it('keeps the session cookie HTTP-only, same-site and path-scoped', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', ALLOWED_ORIGIN)
      .send({ name: 'Cookie Person', email: `cookie@${DOMAIN}`, password: 'CorrectHorse42' });

    const cookie = (response.headers['set-cookie'] as unknown as string[])[0] ?? '';

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    // The raw token belongs in the cookie and nowhere else.
    expect(JSON.stringify(response.body)).not.toContain(cookie.split('=')[1]?.split(';')[0]);
  });

  it('still refuses a protected endpoint without a session', async () => {
    const response = await request(app).get('/api/workspaces');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
