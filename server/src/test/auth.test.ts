import { createHash, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { requireTestDatabaseUrl } from '../../prisma/testDbUrl.js';

// The guard runs before the app (and therefore Prisma) is imported, so a wrong
// DATABASE_URL stops the run instead of touching the development database.
requireTestDatabaseUrl();

const { app } = await import('../app.js');
const { prisma } = await import('../lib/prisma.js');
const { config } = await import('../config.js');

/** Every account created here uses this domain, so cleanup can target it. */
const TEST_EMAIL_DOMAIN = 'authtest.local';
const PASSWORD = 'CorrectHorse42';

function uniqueEmail(): string {
  return `user-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

function newAccount() {
  return { name: 'Test Person', email: uniqueEmail(), password: PASSWORD };
}

/** Deletes only accounts this file created; credentials and sessions cascade. */
async function cleanupTestUsers(): Promise<void> {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } });
}

function sessionCookie(response: request.Response): string | undefined {
  const cookies = response.headers['set-cookie'];
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];

  return list.find((cookie) => cookie.startsWith(`${config.sessionCookieName}=`));
}

function tokenFromCookie(cookie: string): string {
  return decodeURIComponent(cookie.split(';')[0]?.split('=')[1] ?? '');
}

beforeAll(cleanupTestUsers);

afterAll(async () => {
  await cleanupTestUsers();
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates the user, returns safe data and sets an HTTP-only cookie', async () => {
    const account = newAccount();
    const response = await request(app).post('/api/auth/register').send(account);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toEqual({
      id: expect.any(String),
      name: account.name,
      email: account.email,
    });

    const cookie = sessionCookie(response);
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    // secure is production-only, so local http://localhost keeps working.
    expect(cookie).not.toContain('Secure');
  });

  it('rejects an email that is already registered with 409', async () => {
    const account = newAccount();
    await request(app).post('/api/auth/register').send(account);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...account, name: 'Someone Else' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects an invalid payload with field errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fieldErrors).sort()).toEqual([
      'email',
      'name',
      'password',
    ]);
  });

  it('stores an Argon2id hash instead of the password', async () => {
    const account = newAccount();
    await request(app).post('/api/auth/register').send(account);

    const credential = await prisma.passwordCredential.findFirst({
      where: { user: { email: account.email } },
      select: { passwordHash: true },
    });

    expect(credential?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(credential?.passwordHash).not.toContain(account.password);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the correct password and normalizes the email', async () => {
    const account = newAccount();
    await request(app).post('/api/auth/register').send(account);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: `  ${account.email.toUpperCase()}  `, password: account.password });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(account.email);
    expect(sessionCookie(response)).toBeDefined();
  });

  it('returns the same generic error for a wrong password and an unknown email', async () => {
    const account = newAccount();
    await request(app).post('/api/auth/register').send(account);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: account.email, password: 'WrongPassword1' });

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: account.password });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
    expect(unknownEmail.body.error).toEqual(wrongPassword.body.error);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the current user for a valid session', async () => {
    const agent = request.agent(app);
    const account = newAccount();
    await agent.post('/api/auth/register').send(account);

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.data.user).toEqual({
      id: expect.any(String),
      name: account.name,
      email: account.email,
    });
  });

  it('rejects an expired session and removes it from the database', async () => {
    const agent = request.agent(app);
    const account = newAccount();
    const registration = await agent.post('/api/auth/register').send(account);
    const token = tokenFromCookie(sessionCookie(registration) ?? '');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await prisma.session.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(await prisma.session.findUnique({ where: { tokenHash } })).toBeNull();
  });
});

describe('POST /api/auth/logout', () => {
  it('deletes the database session and clears the cookie', async () => {
    const agent = request.agent(app);
    const account = newAccount();
    const registration = await agent.post('/api/auth/register').send(account);
    const tokenHash = createHash('sha256')
      .update(tokenFromCookie(sessionCookie(registration) ?? ''))
      .digest('hex');

    const logout = await agent.post('/api/auth/logout').send();

    expect(logout.status).toBe(200);
    expect(await prisma.session.findUnique({ where: { tokenHash } })).toBeNull();
    expect(sessionCookie(logout)).toContain(`${config.sessionCookieName}=;`);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('succeeds when no session cookie is present', async () => {
    const response = await request(app).post('/api/auth/logout').send();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('secret handling', () => {
  it('never persists the raw token and never returns secrets', async () => {
    const agent = request.agent(app);
    const account = newAccount();
    const registration = await agent.post('/api/auth/register').send(account);
    const token = tokenFromCookie(sessionCookie(registration) ?? '');

    const stored = await prisma.session.findMany({
      where: { user: { email: account.email } },
      select: { tokenHash: true },
    });

    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toBe(token);
    expect(stored[0]?.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));

    const me = await agent.get('/api/auth/me');
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: account.email, password: account.password });

    for (const body of [registration.body, me.body, login.body]) {
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('argon2');
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('tokenHash');
      expect(serialized).not.toContain(account.password);
      expect(serialized).not.toContain(token);
    }
  });
});
