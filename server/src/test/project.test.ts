import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  app,
  cleanupDomain,
  createProject,
  createWorkspace,
  prisma,
  randomKey,
  setupRoles,
} from './phase5.helpers.js';
import type { RoleFixture } from './phase5.helpers.js';

const DOMAIN = 'projecttest.local';

let roles: RoleFixture;

beforeAll(() => cleanupDomain(DOMAIN));

// Every test starts from a fresh workspace, so no test depends on another one.
beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function projectsUrl(workspaceId: string): string {
  return `/api/workspaces/${workspaceId}/projects`;
}

describe('project access', () => {
  it('returns 401 without a session', async () => {
    const response = await request(app).get(projectsUrl(roles.workspaceId));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 for a signed-in outsider', async () => {
    const response = await roles.outsider.agent.get(projectsUrl(roles.workspaceId));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('POST /api/workspaces/:workspaceId/projects', () => {
  it('lets an OWNER create a project', async () => {
    const response = await roles.owner.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Orbit API', key: 'ORB' });

    expect(response.status).toBe(201);
    expect(response.body.data.project).toMatchObject({ name: 'Orbit API', key: 'ORB', role: 'OWNER' });
  });

  it('lets an ADMIN create a project', async () => {
    const response = await roles.admin.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Admin Project', key: randomKey() });

    expect(response.status).toBe(201);
    expect(response.body.data.project.role).toBe('ADMIN');
  });

  it('does not let a MEMBER create a project', async () => {
    const response = await roles.member.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Member Project', key: randomKey() });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('normalizes the key to uppercase', async () => {
    const response = await roles.owner.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Lowercase Key', key: 'web1' });

    expect(response.status).toBe(201);
    expect(response.body.data.project.key).toBe('WEB1');
  });

  it('rejects a duplicate key inside the same workspace with 409', async () => {
    await createProject(roles.owner, roles.workspaceId, 'DUP');

    const response = await roles.owner.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Another', key: 'dup' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_KEY_IN_USE');
  });

  it('allows the same key in a different workspace', async () => {
    await createProject(roles.owner, roles.workspaceId, 'SHARED');

    const otherWorkspaceId = await createWorkspace(roles.owner);
    const response = await roles.owner.agent
      .post(projectsUrl(otherWorkspaceId))
      .send({ name: 'Shared elsewhere', key: 'SHARED' });

    expect(response.status).toBe(201);
  });

  it('rejects an invalid key with a validation error', async () => {
    const response = await roles.owner.agent
      .post(projectsUrl(roles.workspaceId))
      .send({ name: 'Bad key', key: 'AB-CD' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fieldErrors.key).toBeDefined();
  });

  it('records a PROJECT_CREATED activity', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const activities = await prisma.activityLog.findMany({
      where: { projectId: project.id },
      select: { type: true, actorId: true },
    });

    expect(activities).toEqual([{ type: 'PROJECT_CREATED', actorId: roles.owner.id }]);
  });
});

describe('GET /api/workspaces/:workspaceId/projects', () => {
  it('only returns projects of the workspace in the route', async () => {
    const mine = await createProject(roles.owner, roles.workspaceId, 'MINE');
    const otherWorkspaceId = await createWorkspace(roles.owner);
    await createProject(roles.owner, otherWorkspaceId, 'OTHER');

    const response = await roles.member.agent.get(projectsUrl(roles.workspaceId));

    expect(response.status).toBe(200);
    expect(response.body.data.projects).toHaveLength(1);
    expect(response.body.data.projects[0]).toMatchObject({ id: mine.id, key: 'MINE', role: 'MEMBER' });
  });

  it('filters by status and by search text', async () => {
    const archived = await createProject(roles.owner, roles.workspaceId, 'ARCH', 'Archived work');
    await createProject(roles.owner, roles.workspaceId, 'LIVE', 'Live work');

    await roles.owner.agent
      .patch(`${projectsUrl(roles.workspaceId)}/${archived.id}`)
      .send({ status: 'ARCHIVED' });

    const archivedOnly = await roles.owner.agent
      .get(projectsUrl(roles.workspaceId))
      .query({ status: 'ARCHIVED' });
    const searched = await roles.owner.agent
      .get(projectsUrl(roles.workspaceId))
      .query({ search: 'live' });

    expect(archivedOnly.body.data.projects.map((p: { key: string }) => p.key)).toEqual(['ARCH']);
    expect(searched.body.data.projects.map((p: { key: string }) => p.key)).toEqual(['LIVE']);
  });

  it('rejects an unsupported sort field', async () => {
    const response = await roles.owner.agent
      .get(projectsUrl(roles.workspaceId))
      .query({ sort: 'secret' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SORT');
  });
});

describe('GET /api/workspaces/:workspaceId/projects/:projectId', () => {
  it('returns the detail with counts, sprints and the creator', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.member.agent.get(
      `${projectsUrl(roles.workspaceId)}/${project.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.project).toMatchObject({
      id: project.id,
      role: 'MEMBER',
      sprints: [],
      createdBy: { id: roles.owner.id, email: roles.owner.email },
    });
    expect(response.body.data.project.issueCountsByStatus.BACKLOG).toBe(0);
  });

  it('cannot be reached through another workspace id', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);
    const otherWorkspaceId = await createWorkspace(roles.owner);

    const response = await roles.owner.agent.get(
      `${projectsUrl(otherWorkspaceId)}/${project.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
  });
});

describe('PATCH /api/workspaces/:workspaceId/projects/:projectId', () => {
  it('lets an OWNER and an ADMIN update the project', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const byOwner = await roles.owner.agent
      .patch(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ name: 'Renamed by owner' });
    const byAdmin = await roles.admin.agent
      .patch(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ status: 'ARCHIVED' });

    expect(byOwner.body.data.project.name).toBe('Renamed by owner');
    expect(byAdmin.body.data.project.status).toBe('ARCHIVED');
  });

  it('does not let a MEMBER update the project', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.member.agent
      .patch(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ name: 'Member rename' });

    expect(response.status).toBe(403);
  });

  it('ignores a key change sent by the client', async () => {
    const project = await createProject(roles.owner, roles.workspaceId, 'KEEP');

    await roles.owner.agent
      .patch(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ name: 'Still keep', key: 'NEWKEY' });

    const stored = await prisma.project.findUnique({
      where: { id: project.id },
      select: { key: true },
    });

    expect(stored?.key).toBe('KEEP');
  });
});

describe('DELETE /api/workspaces/:workspaceId/projects/:projectId', () => {
  it('lets an OWNER delete a confirmed project and keeps the workspace', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.owner.agent
      .delete(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ confirm: true });

    expect(response.status).toBe(200);
    expect(response.body.data.deleted).toBe(true);
    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    expect(
      await prisma.workspace.findUnique({ where: { id: roles.workspaceId } }),
    ).not.toBeNull();
    expect(await prisma.workspaceMember.count({ where: { workspaceId: roles.workspaceId } })).toBe(
      3,
    );
  });

  it('lets an ADMIN delete a project', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.admin.agent
      .delete(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ confirm: true });

    expect(response.status).toBe(200);
  });

  it('requires an explicit confirmation', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.owner.agent.delete(
      `${projectsUrl(roles.workspaceId)}/${project.id}`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not let a MEMBER delete a project', async () => {
    const project = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.member.agent
      .delete(`${projectsUrl(roles.workspaceId)}/${project.id}`)
      .send({ confirm: true });

    expect(response.status).toBe(403);
  });
});
