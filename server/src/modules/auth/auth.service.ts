import { createHash, randomBytes } from 'node:crypto';

import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import type { Response } from 'express';

import { SESSION_TTL_MS, config } from '../../config.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { SafeUser } from './auth.types.js';

const ARGON2ID = { algorithm: Algorithm.Argon2id } as const;

/**
 * Hash of a throwaway password. When the email is unknown we still verify
 * against it, so a wrong email and a wrong password take about the same time
 * and cannot be told apart from the outside.
 */
const DUMMY_PASSWORD_HASH = await argonHash(randomBytes(32).toString('hex'), ARGON2ID);

/** Columns that are safe to send to a client. */
const safeUserSelect = { id: true, name: true, email: true } as const;

/**
 * Session tokens are opaque random strings, not encoded data, so they carry no
 * meaning and cannot be forged. Only their SHA-256 hash is stored: a stolen
 * database dump therefore contains no usable token. SHA-256 (not Argon2) is
 * correct here because the input is already 32 random bytes and cannot be
 * guessed by brute force.
 */
function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(userId: string): Promise<string> {
  const token = createSessionToken();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return token;
}

export interface SessionContext {
  user: SafeUser;
  sessionId: string;
}

/**
 * Resolves the raw cookie token to a session. Expired sessions are deleted and
 * treated as missing, so a stale cookie can never authenticate anyone.
 */
export async function getSessionContext(token: string): Promise<SessionContext | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, expiresAt: true, user: { select: safeUserSelect } },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return { user: session.user, sessionId: session.id };
}

export async function deleteSession(sessionId: string): Promise<void> {
  // Logout must succeed even if the row is already gone.
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true, // JavaScript in the page cannot read it, so XSS cannot steal it.
    sameSite: 'lax', // The browser does not send it on cross-site POST requests.
    secure: config.isProduction, // HTTPS only in production; http://localhost in development.
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
  });
}

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.emailInUse();
  }

  const passwordHash = await argonHash(input.password, ARGON2ID);

  // One transaction: a user without a password, or a password without a user,
  // must never exist.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email },
      select: safeUserSelect,
    });

    await tx.passwordCredential.create({ data: { userId: user.id, passwordHash } });

    return user;
  });
}

export async function verifyCredentials(input: LoginInput): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...safeUserSelect, passwordCredential: { select: { passwordHash: true } } },
  });

  const passwordHash = user?.passwordCredential?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordMatches = await argonVerify(passwordHash, input.password);

  if (!user || !passwordMatches) {
    throw ApiError.invalidCredentials();
  }

  return { id: user.id, name: user.name, email: user.email };
}
