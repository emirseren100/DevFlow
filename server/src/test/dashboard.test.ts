import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  app,
  cleanupDomain,
  createIssue,
  createProject,
  createWorkspace,
  prisma,
  setupRoles,
} from './phase5.helpers.js';
import type { RoleFixture } from './phase5.helpers.js';

const DOMAIN = 'dashboardtest.local';

let roles: RoleFixture;
let projectId: string;

beforeAll(() => cleanupDomain(DOMAIN));

// Every test builds its own workspace, so no test depends on another one or on
// development seed data.
beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  projectId = (await createProject(roles.owner, roles.workspaceId)).id;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function dashboardPath(workspaceId = roles.workspaceId): string {
  return `/api/workspaces/${workspaceId}/dashboard`;
}

/** Creates an issue and returns its id, failing loudly on a rejected request. */
async function issue(body: Record<string, unknown> = {}): Promise<string> {
  const response = await createIssue(roles.owner, roles.workspaceId, projectId, body);

  expect(response.status).toBe(201);

  return response.body.data.issue.id as string;
}

describe('GET /api/workspaces/:workspaceId/dashboard — access', () => {
  it('rejects a request without a session', async () => {
    const response = await request(app).get(dashboardPath());

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('answers 403 for a signed-in user who is not a member', async () => {
    const response = await roles.outsider.agent.get(dashboardPath());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('answers 404 for a workspace that does not exist', async () => {
    const response = await roles.owner.agent.get(dashboardPath('missing-workspace-id'));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('WORKSPACE_NOT_FOUND');
  });

  it('lets a plain member read the dashboard with their real role', async () => {
    const response = await roles.member.agent.get(dashboardPath());

    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.workspace.role).toBe('MEMBER');
  });
});

describe('GET /api/workspaces/:workspaceId/dashboard — workspace summary', () => {
  it('reports the member count', async () => {
    const response = await roles.owner.agent.get(dashboardPath());

    // owner + admin + member, created by the shared fixture.
    expect(response.body.data.dashboard.workspace.memberCount).toBe(3);
  });

  it('separates active and archived projects', async () => {
    const archived = await createProject(roles.owner, roles.workspaceId);

    await roles.owner.agent
      .patch(`/api/workspaces/${roles.workspaceId}/projects/${archived.id}`)
      .send({ status: 'ARCHIVED' });

    const { workspace } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(workspace.activeProjectCount).toBe(1);
    expect(workspace.archivedProjectCount).toBe(1);
  });
});

describe('GET /api/workspaces/:workspaceId/dashboard — issue metrics', () => {
  it('counts open issues and excludes DONE', async () => {
    await issue({ status: 'TODO' });
    await issue({ status: 'IN_PROGRESS' });
    await issue({ status: 'DONE' });

    const { issueMetrics } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(issueMetrics.openIssues).toBe(2);
  });

  it('counts the open issues assigned to the caller only', async () => {
    await issue({ assigneeId: roles.owner.id });
    await issue({ assigneeId: roles.admin.id });
    await issue({ assigneeId: roles.owner.id, status: 'DONE' });

    const ownerView = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;
    const adminView = (await roles.admin.agent.get(dashboardPath())).body.data.dashboard;

    expect(ownerView.issueMetrics.assignedToMe).toBe(1);
    expect(adminView.issueMetrics.assignedToMe).toBe(1);
  });

  it('counts overdue issues by the server clock and ignores DONE ones', async () => {
    await issue({ dueDate: '2020-01-01', status: 'TODO' });
    await issue({ dueDate: '2020-01-02', status: 'DONE' });
    await issue({ dueDate: '2999-01-01', status: 'TODO' });
    await issue({ status: 'TODO' });

    const { issueMetrics } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(issueMetrics.overdueIssues).toBe(1);
  });

  it('counts unassigned open issues', async () => {
    await issue();
    await issue();
    await issue({ assigneeId: roles.member.id });
    await issue({ status: 'DONE' });

    const { issueMetrics } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(issueMetrics.unassignedIssues).toBe(2);
  });
});

describe('GET /api/workspaces/:workspaceId/dashboard — distributions', () => {
  it('returns every status, including the ones with no issue', async () => {
    await issue({ status: 'TODO' });
    await issue({ status: 'DONE' });

    const { statusDistribution } = (await roles.owner.agent.get(dashboardPath())).body.data
      .dashboard;

    expect(statusDistribution).toEqual({
      BACKLOG: 0,
      TODO: 1,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 1,
    });
  });

  it('returns every priority, including the ones with no issue', async () => {
    await issue({ priority: 'URGENT' });

    const { priorityDistribution } = (await roles.owner.agent.get(dashboardPath())).body.data
      .dashboard;

    expect(priorityDistribution).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 1 });
  });
});

describe('GET /api/workspaces/:workspaceId/dashboard — recent lists', () => {
  it('returns the most recently updated issues first and limits the list', async () => {
    const ids: string[] = [];

    for (let index = 0; index < 7; index += 1) {
      ids.push(await issue({ title: `Issue number ${index}` }));
    }

    const { recentIssues } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(recentIssues).toHaveLength(5);

    const updated = recentIssues.map((entry: { updatedAt: string }) =>
      new Date(entry.updatedAt).getTime(),
    );

    expect([...updated].sort((a: number, b: number) => b - a)).toEqual(updated);
    // The two oldest of the seven never reach the list.
    expect(recentIssues.map((entry: { id: string }) => entry.id)).not.toContain(ids[0]);
  });

  it('describes a recent issue without its description', async () => {
    await issue({ title: 'Readable title', description: 'A secret internal note.' });

    const [entry] = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard
      .recentIssues;

    expect(entry.displayKey).toMatch(/-1$/);
    expect(entry.title).toBe('Readable title');
    expect(entry.project.key).toBeDefined();
    expect(entry).not.toHaveProperty('description');
  });

  it('orders recent activity newest first and limits it', async () => {
    for (let index = 0; index < 9; index += 1) {
      await issue({ title: `Activity issue ${index}` });
    }

    const { recentActivity } = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(recentActivity).toHaveLength(8);

    const times = recentActivity.map((entry: { createdAt: string }) =>
      new Date(entry.createdAt).getTime(),
    );

    expect([...times].sort((a: number, b: number) => b - a)).toEqual(times);
  });

  it('keeps actor and assignee data to the safe columns only', async () => {
    await issue({ assigneeId: roles.member.id });

    const { recentIssues, recentActivity } = (await roles.owner.agent.get(dashboardPath())).body
      .data.dashboard;

    expect(Object.keys(recentIssues[0].assignee).sort()).toEqual(['email', 'id', 'name']);
    expect(Object.keys(recentActivity[0].actor).sort()).toEqual(['email', 'id', 'name']);
    expect(JSON.stringify(recentActivity)).not.toMatch(/passwordHash|tokenHash/);
  });
});

describe('GET /api/workspaces/:workspaceId/dashboard — scoping', () => {
  it('never counts or lists data from another workspace', async () => {
    const otherWorkspaceId = await createWorkspace(roles.owner);
    const otherProject = await createProject(roles.owner, otherWorkspaceId);

    await createIssue(roles.owner, otherWorkspaceId, otherProject.id, {
      title: 'Issue of the other workspace',
    });
    await issue({ title: 'Issue of this workspace' });

    const dashboard = (await roles.owner.agent.get(dashboardPath())).body.data.dashboard;

    expect(dashboard.workspace.id).toBe(roles.workspaceId);
    expect(dashboard.workspace.activeProjectCount).toBe(1);
    expect(dashboard.issueMetrics.openIssues).toBe(1);
    expect(dashboard.recentIssues).toHaveLength(1);
    expect(dashboard.recentIssues[0].title).toBe('Issue of this workspace');
    expect(JSON.stringify(dashboard)).not.toContain('Issue of the other workspace');
  });
});
