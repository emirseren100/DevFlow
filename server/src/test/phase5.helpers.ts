import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { expect } from 'vitest';

import { requireTestDatabaseUrl } from '../../prisma/testDbUrl.js';

// The guard runs before the app (and therefore Prisma) is imported, so a wrong
// DATABASE_URL stops the run instead of touching the development database.
requireTestDatabaseUrl();

const { app } = await import('../app.js');
const { prisma } = await import('../lib/prisma.js');

export { app, prisma };

const PASSWORD = 'CorrectHorse42';

export interface TestUser {
  agent: request.Agent;
  id: string;
  email: string;
  name: string;
}

/**
 * A workspace with one user per role plus an outsider. Every Phase 5 test file
 * needs exactly this cast, which is the repetition worth sharing.
 */
export interface RoleFixture {
  workspaceId: string;
  owner: TestUser;
  admin: TestUser;
  member: TestUser;
  outsider: TestUser;
}

/** Each test file uses its own email domain, so cleanups never collide. */
export async function signUp(domain: string, name = 'Test Person'): Promise<TestUser> {
  const agent = request.agent(app);
  const account = { name, email: `user-${randomUUID()}@${domain}`, password: PASSWORD };
  const response = await agent.post('/api/auth/register').send(account);

  expect(response.status).toBe(201);

  return { agent, id: response.body.data.user.id, email: account.email, name };
}

export async function createWorkspace(owner: TestUser): Promise<string> {
  const response = await owner.agent
    .post('/api/workspaces')
    .send({ name: `Workspace ${randomUUID().slice(0, 8)}` });

  expect(response.status).toBe(201);

  return response.body.data.workspace.id as string;
}

export async function addMember(
  actor: TestUser,
  workspaceId: string,
  target: TestUser,
  role: 'ADMIN' | 'MEMBER',
): Promise<void> {
  const response = await actor.agent
    .post(`/api/workspaces/${workspaceId}/members`)
    .send({ email: target.email, role });

  expect(response.status).toBe(201);
}

export async function setupRoles(domain: string): Promise<RoleFixture> {
  const owner = await signUp(domain, 'Owner Person');
  const admin = await signUp(domain, 'Admin Person');
  const member = await signUp(domain, 'Member Person');
  const outsider = await signUp(domain, 'Outsider Person');
  const workspaceId = await createWorkspace(owner);

  await addMember(owner, workspaceId, admin, 'ADMIN');
  await addMember(owner, workspaceId, member, 'MEMBER');

  return { workspaceId, owner, admin, member, outsider };
}

/** Creates a project through the API, as an actor allowed to do so. */
export async function createProject(
  actor: TestUser,
  workspaceId: string,
  key = randomKey(),
  name = `Project ${key}`,
): Promise<{ id: string; key: string }> {
  const response = await actor.agent
    .post(`/api/workspaces/${workspaceId}/projects`)
    .send({ name, key });

  expect(response.status).toBe(201);

  return { id: response.body.data.project.id, key: response.body.data.project.key };
}

/** Uppercase, 2-10 alphanumeric characters, unique enough for one test run. */
export function randomKey(): string {
  return `K${randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;
}

export function createIssue(
  actor: TestUser,
  workspaceId: string,
  projectId: string,
  body: Record<string, unknown> = {},
) {
  return actor.agent
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/issues`)
    .send({ title: 'A test issue', type: 'TASK', priority: 'MEDIUM', ...body });
}

/**
 * Workspaces are deleted first: the owner relation uses onDelete: Restrict, so
 * a user that still owns a workspace cannot be removed.
 */
export async function cleanupDomain(domain: string): Promise<void> {
  const emailFilter = { endsWith: `@${domain}` };

  await prisma.workspace.deleteMany({ where: { owner: { email: emailFilter } } });
  await prisma.user.deleteMany({ where: { email: emailFilter } });
}
