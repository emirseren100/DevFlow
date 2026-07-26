import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupDomain,
  createIssue,
  createProject,
  prisma,
  setupRoles,
} from './phase5.helpers.js';
import type { RoleFixture, TestUser } from './phase5.helpers.js';

const DOMAIN = 'sprinttest.local';

let roles: RoleFixture;
let projectId: string;

beforeAll(() => cleanupDomain(DOMAIN));

beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  projectId = (await createProject(roles.owner, roles.workspaceId)).id;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function sprintsUrl(workspaceId: string, project: string): string {
  return `/api/workspaces/${workspaceId}/projects/${project}/sprints`;
}

function createSprint(actor: TestUser, project = projectId, body: Record<string, unknown> = {}) {
  return actor.agent
    .post(sprintsUrl(roles.workspaceId, project))
    .send({ name: 'Sprint 1', ...body });
}

describe('POST .../sprints', () => {
  it('lets an OWNER create a sprint', async () => {
    const response = await createSprint(roles.owner);

    expect(response.status).toBe(201);
    expect(response.body.data.sprint).toMatchObject({ name: 'Sprint 1', status: 'PLANNED' });
  });

  it('lets an ADMIN create a sprint', async () => {
    const response = await createSprint(roles.admin, projectId, { name: 'Admin sprint' });

    expect(response.status).toBe(201);
  });

  it('does not let a MEMBER create a sprint', async () => {
    const response = await createSprint(roles.member);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an end date before the start date', async () => {
    const response = await createSprint(roles.owner, projectId, {
      startDate: '2026-03-10',
      endDate: '2026-03-01',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fieldErrors.endDate).toBeDefined();
  });

  it('rejects a name that is too short', async () => {
    const response = await createSprint(roles.owner, projectId, { name: 'A' });

    expect(response.status).toBe(400);
    expect(response.body.error.fieldErrors.name).toBeDefined();
  });
});

describe('GET .../sprints', () => {
  it('orders ACTIVE before PLANNED before COMPLETED', async () => {
    await createSprint(roles.owner, projectId, { name: 'Done one', status: 'COMPLETED' });
    await createSprint(roles.owner, projectId, { name: 'Planned one', status: 'PLANNED' });
    await createSprint(roles.owner, projectId, { name: 'Active one', status: 'ACTIVE' });

    const response = await roles.member.agent.get(sprintsUrl(roles.workspaceId, projectId));

    expect(response.status).toBe(200);
    expect(response.body.data.sprints.map((sprint: { name: string }) => sprint.name)).toEqual([
      'Active one',
      'Planned one',
      'Done one',
    ]);
  });

  it('filters by status', async () => {
    await createSprint(roles.owner, projectId, { name: 'Active one', status: 'ACTIVE' });
    await createSprint(roles.owner, projectId, { name: 'Planned one' });

    const response = await roles.member.agent
      .get(sprintsUrl(roles.workspaceId, projectId))
      .query({ status: 'ACTIVE' });

    expect(response.body.data.sprints).toHaveLength(1);
  });
});

describe('PATCH .../sprints/:sprintId', () => {
  it('cannot reach a sprint that belongs to another project', async () => {
    const sprint = await createSprint(roles.owner);
    const otherProject = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.owner.agent
      .patch(`${sprintsUrl(roles.workspaceId, otherProject.id)}/${sprint.body.data.sprint.id}`)
      .send({ name: 'Stolen sprint' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('SPRINT_NOT_FOUND');
  });

  it('rejects a new end date that falls before the stored start date', async () => {
    const sprint = await createSprint(roles.owner, projectId, { startDate: '2026-03-10' });

    const response = await roles.owner.agent
      .patch(`${sprintsUrl(roles.workspaceId, projectId)}/${sprint.body.data.sprint.id}`)
      .send({ endDate: '2026-03-01' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
  });

  it('updates name, goal and status for an ADMIN', async () => {
    const sprint = await createSprint(roles.owner);

    const response = await roles.admin.agent
      .patch(`${sprintsUrl(roles.workspaceId, projectId)}/${sprint.body.data.sprint.id}`)
      .send({ name: 'Renamed sprint', goal: 'Ship it', status: 'ACTIVE' });

    expect(response.status).toBe(200);
    expect(response.body.data.sprint).toMatchObject({
      name: 'Renamed sprint',
      goal: 'Ship it',
      status: 'ACTIVE',
    });
  });
});

describe('DELETE .../sprints/:sprintId', () => {
  it('refuses to delete a sprint that still has issues', async () => {
    const sprint = await createSprint(roles.owner);
    const sprintId = sprint.body.data.sprint.id as string;

    await createIssue(roles.member, roles.workspaceId, projectId, { sprintId });

    const response = await roles.owner.agent
      .delete(`${sprintsUrl(roles.workspaceId, projectId)}/${sprintId}`)
      .send();

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('SPRINT_HAS_ISSUES');
    expect(await prisma.sprint.findUnique({ where: { id: sprintId } })).not.toBeNull();
  });

  it('deletes an empty sprint for an authorized user', async () => {
    const sprint = await createSprint(roles.owner);
    const sprintId = sprint.body.data.sprint.id as string;

    const response = await roles.owner.agent
      .delete(`${sprintsUrl(roles.workspaceId, projectId)}/${sprintId}`)
      .send();

    expect(response.status).toBe(200);
    expect(await prisma.sprint.findUnique({ where: { id: sprintId } })).toBeNull();
  });

  it('does not let a MEMBER delete a sprint', async () => {
    const sprint = await createSprint(roles.owner);

    const response = await roles.member.agent
      .delete(`${sprintsUrl(roles.workspaceId, projectId)}/${sprint.body.data.sprint.id}`)
      .send();

    expect(response.status).toBe(403);
  });
});
