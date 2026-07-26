import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { requireTestDatabaseUrl } from '../../prisma/testDbUrl.js';

// The guard runs before the app (and therefore Prisma) is imported, so a wrong
// DATABASE_URL stops the run instead of touching the development database.
requireTestDatabaseUrl();

const { app } = await import('../app.js');
const { prisma } = await import('../lib/prisma.js');

/** Every account created here uses this domain, so cleanup can target it. */
const TEST_EMAIL_DOMAIN = 'workspacetest.local';
const PASSWORD = 'CorrectHorse42';

interface TestUser {
  agent: request.Agent;
  id: string;
  email: string;
  name: string;
}

function uniqueEmail(): string {
  return `user-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
}

/** A registered, signed-in user. The agent keeps the session cookie. */
async function signUp(): Promise<TestUser> {
  const agent = request.agent(app);
  const account = { name: 'Test Person', email: uniqueEmail(), password: PASSWORD };
  const response = await agent.post('/api/auth/register').send(account);

  return { agent, id: response.body.data.user.id, email: account.email, name: account.name };
}

async function createWorkspace(owner: TestUser, name = `Workspace ${randomUUID().slice(0, 8)}`) {
  const response = await owner.agent.post('/api/workspaces').send({ name });

  expect(response.status).toBe(201);

  return response.body.data.workspace as { id: string; slug: string; name: string };
}

/** Adds an existing user through the API, as the given actor. */
function addMember(actor: TestUser, workspaceId: string, target: TestUser, role?: string) {
  return actor.agent
    .post(`/api/workspaces/${workspaceId}/members`)
    .send(role ? { email: target.email, role } : { email: target.email });
}

async function memberIdOf(workspaceId: string, userId: string): Promise<string> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { id: true },
  });

  return membership?.id ?? '';
}

/**
 * Workspaces are deleted first: the owner relation uses onDelete: Restrict, so
 * a user that still owns a workspace cannot be removed.
 */
async function cleanup(): Promise<void> {
  const emailFilter = { endsWith: `@${TEST_EMAIL_DOMAIN}` };

  await prisma.workspace.deleteMany({ where: { owner: { email: emailFilter } } });
  await prisma.user.deleteMany({ where: { email: emailFilter } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('authentication gate', () => {
  it('returns 401 for workspace routes without a session', async () => {
    const list = await request(app).get('/api/workspaces');
    const create = await request(app).post('/api/workspaces').send({ name: 'Anonymous' });

    expect(list.status).toBe(401);
    expect(list.body.error.code).toBe('UNAUTHENTICATED');
    expect(create.status).toBe(401);
  });
});

describe('POST /api/workspaces', () => {
  it('creates the workspace with an OWNER membership and a server-made slug', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner, '  Acme Product Team  ');

    expect(workspace.name).toBe('Acme Product Team');
    expect(workspace.slug).toMatch(/^acme-product-team(-\d+)?$/);

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id },
      select: { userId: true, role: true },
    });

    expect(membership).toEqual({ userId: owner.id, role: 'OWNER' });
  });

  it('records a WORKSPACE_CREATED activity', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner);

    const activities = await prisma.activityLog.findMany({
      where: { workspaceId: workspace.id },
      select: { type: true, actorId: true },
    });

    expect(activities).toEqual([{ type: 'WORKSPACE_CREATED', actorId: owner.id }]);
  });

  it('rejects a name that is too short', async () => {
    const owner = await signUp();
    const response = await owner.agent.post('/api/workspaces').send({ name: ' a ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps slugs unique when two workspaces share a name', async () => {
    const owner = await signUp();
    const first = await createWorkspace(owner, 'Duplicate Slug Team');
    const second = await createWorkspace(owner, 'Duplicate Slug Team');

    expect(second.slug).not.toBe(first.slug);
  });
});

describe('GET /api/workspaces', () => {
  it('returns only workspaces the current user belongs to', async () => {
    const owner = await signUp();
    const outsider = await signUp();
    const workspace = await createWorkspace(owner);

    const ownerList = await owner.agent.get('/api/workspaces');
    const outsiderList = await outsider.agent.get('/api/workspaces');

    expect(ownerList.status).toBe(200);
    expect(ownerList.body.data.workspaces).toHaveLength(1);
    expect(ownerList.body.data.workspaces[0]).toMatchObject({
      id: workspace.id,
      role: 'OWNER',
      memberCount: 1,
    });
    expect(outsiderList.body.data.workspaces).toEqual([]);
  });
});

describe('GET /api/workspaces/:workspaceId', () => {
  it('lets a member view the workspace with the owner details', async () => {
    const owner = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, member);

    const response = await member.agent.get(`/api/workspaces/${workspace.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.workspace).toMatchObject({
      id: workspace.id,
      role: 'MEMBER',
      memberCount: 2,
      owner: { id: owner.id, name: owner.name, email: owner.email },
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('returns 403 for an authenticated outsider', async () => {
    const owner = await signUp();
    const outsider = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await outsider.agent.get(`/api/workspaces/${workspace.id}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for a workspace that does not exist', async () => {
    const user = await signUp();
    const response = await user.agent.get('/api/workspaces/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('WORKSPACE_NOT_FOUND');
  });
});

describe('PATCH /api/workspaces/:workspaceId', () => {
  it('lets the OWNER rename the workspace without changing the slug', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner, 'Original Name');

    const response = await owner.agent
      .patch(`/api/workspaces/${workspace.id}`)
      .send({ name: 'Renamed Workspace' });

    expect(response.status).toBe(200);
    expect(response.body.data.workspace.name).toBe('Renamed Workspace');
    expect(response.body.data.workspace.slug).toBe(workspace.slug);
  });

  it('lets an ADMIN rename the workspace', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');

    const response = await admin.agent
      .patch(`/api/workspaces/${workspace.id}`)
      .send({ name: 'Admin Renamed' });

    expect(response.status).toBe(200);
    expect(response.body.data.workspace.name).toBe('Admin Renamed');
  });

  it('refuses a rename by a MEMBER', async () => {
    const owner = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, member);

    const response = await member.agent
      .patch(`/api/workspaces/${workspace.id}`)
      .send({ name: 'Member Rename' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /api/workspaces/:workspaceId', () => {
  it('allows the OWNER only', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');
    await addMember(owner, workspace.id, member);

    const byMember = await member.agent.delete(`/api/workspaces/${workspace.id}`);
    const byAdmin = await admin.agent.delete(`/api/workspaces/${workspace.id}`);

    expect(byMember.status).toBe(403);
    expect(byAdmin.status).toBe(403);

    const byOwner = await owner.agent.delete(`/api/workspaces/${workspace.id}`);

    expect(byOwner.status).toBe(200);
    expect(await prisma.workspace.findUnique({ where: { id: workspace.id } })).toBeNull();
  });
});

describe('GET /api/workspaces/:workspaceId/members', () => {
  it('lists safe member data ordered OWNER, ADMIN, MEMBER', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, member);
    await addMember(owner, workspace.id, admin, 'ADMIN');

    const response = await member.agent.get(`/api/workspaces/${workspace.id}/members`);

    expect(response.status).toBe(200);
    expect(response.body.data.members.map((entry: { role: string }) => entry.role)).toEqual([
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);
    expect(Object.keys(response.body.data.members[0]).sort()).toEqual([
      'email',
      'id',
      'joinedAt',
      'name',
      'role',
      'userId',
    ]);
  });
});

describe('POST /api/workspaces/:workspaceId/members', () => {
  it('lets the OWNER add a MEMBER and records a MEMBER_ADDED activity', async () => {
    const owner = await signUp();
    const target = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await addMember(owner, workspace.id, target);

    expect(response.status).toBe(201);
    expect(response.body.data.member).toMatchObject({ userId: target.id, role: 'MEMBER' });

    const activity = await prisma.activityLog.findFirst({
      where: { workspaceId: workspace.id, type: 'MEMBER_ADDED' },
      select: { metadata: true },
    });

    expect(activity?.metadata).toEqual({ addedUserId: target.id, assignedRole: 'MEMBER' });
  });

  it('lets the OWNER add an ADMIN', async () => {
    const owner = await signUp();
    const target = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await addMember(owner, workspace.id, target, 'ADMIN');

    expect(response.status).toBe(201);
    expect(response.body.data.member.role).toBe('ADMIN');
  });

  it('lets an ADMIN add a MEMBER but not another ADMIN', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const target = await signUp();
    const other = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');

    const asMember = await addMember(admin, workspace.id, target);
    const asAdmin = await addMember(admin, workspace.id, other, 'ADMIN');

    expect(asMember.status).toBe(201);
    expect(asAdmin.status).toBe(403);
    expect(asAdmin.body.error.code).toBe('FORBIDDEN');
  });

  it('refuses a MEMBER adding anyone', async () => {
    const owner = await signUp();
    const member = await signUp();
    const target = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, member);

    const response = await addMember(member, workspace.id, target);

    expect(response.status).toBe(403);
  });

  it('rejects OWNER as an assignable role', async () => {
    const owner = await signUp();
    const target = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await addMember(owner, workspace.id, target, 'OWNER');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for a duplicate membership', async () => {
    const owner = await signUp();
    const target = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, target);

    const response = await addMember(owner, workspace.id, target);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('returns 404 for an email that belongs to no registered user', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await owner.agent
      .post(`/api/workspaces/${workspace.id}/members`)
      .send({ email: uniqueEmail() });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });
});

describe('PATCH /api/workspaces/:workspaceId/members/:memberId', () => {
  it('lets the OWNER change an ADMIN into a MEMBER', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');
    const memberId = await memberIdOf(workspace.id, admin.id);

    const response = await owner.agent
      .patch(`/api/workspaces/${workspace.id}/members/${memberId}`)
      .send({ role: 'MEMBER' });

    expect(response.status).toBe(200);
    expect(response.body.data.member.role).toBe('MEMBER');
  });

  it('refuses a role change by an ADMIN', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');
    await addMember(owner, workspace.id, member);
    const memberId = await memberIdOf(workspace.id, member.id);

    const response = await admin.agent
      .patch(`/api/workspaces/${workspace.id}/members/${memberId}`)
      .send({ role: 'ADMIN' });

    expect(response.status).toBe(403);
  });

  it('never modifies the OWNER membership', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner);
    const ownerMemberId = await memberIdOf(workspace.id, owner.id);

    const response = await owner.agent
      .patch(`/api/workspaces/${workspace.id}/members/${ownerMemberId}`)
      .send({ role: 'MEMBER' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('OWNER_MEMBERSHIP_IMMUTABLE');
  });

  it('rejects a no-op role change', async () => {
    const owner = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, member);
    const memberId = await memberIdOf(workspace.id, member.id);

    const response = await owner.agent
      .patch(`/api/workspaces/${workspace.id}/members/${memberId}`)
      .send({ role: 'MEMBER' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ROLE');
  });
});

describe('DELETE /api/workspaces/:workspaceId/members/:memberId', () => {
  it('lets the OWNER remove an ADMIN and a MEMBER', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');
    await addMember(owner, workspace.id, member);

    const removedAdmin = await owner.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, admin.id)}`,
    );
    const removedMember = await owner.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, member.id)}`,
    );

    expect(removedAdmin.status).toBe(200);
    expect(removedMember.status).toBe(200);
    expect(await prisma.workspaceMember.count({ where: { workspaceId: workspace.id } })).toBe(1);
  });

  it('lets an ADMIN remove a MEMBER but not another ADMIN', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const otherAdmin = await signUp();
    const member = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');
    await addMember(owner, workspace.id, otherAdmin, 'ADMIN');
    await addMember(owner, workspace.id, member);

    const removedMember = await admin.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, member.id)}`,
    );
    const removedAdmin = await admin.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, otherAdmin.id)}`,
    );

    expect(removedMember.status).toBe(200);
    expect(removedAdmin.status).toBe(403);
  });

  it('never removes the OWNER membership', async () => {
    const owner = await signUp();
    const workspace = await createWorkspace(owner);

    const response = await owner.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, owner.id)}`,
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('OWNER_MEMBERSHIP_IMMUTABLE');
  });

  it('rejects self removal through member management', async () => {
    const owner = await signUp();
    const admin = await signUp();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, admin, 'ADMIN');

    const response = await admin.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(workspace.id, admin.id)}`,
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('SELF_REMOVAL_NOT_ALLOWED');
  });

  it('returns 404 for a membership from another workspace', async () => {
    const owner = await signUp();
    const other = await signUp();
    const workspace = await createWorkspace(owner);
    const foreignWorkspace = await createWorkspace(other);

    const response = await owner.agent.delete(
      `/api/workspaces/${workspace.id}/members/${await memberIdOf(foreignWorkspace.id, other.id)}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MEMBER_NOT_FOUND');
  });
});
