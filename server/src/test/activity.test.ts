import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  app,
  cleanupDomain,
  createIssue,
  createProject,
  prisma,
  setupRoles,
} from './phase5.helpers.js';
import type { RoleFixture } from './phase5.helpers.js';

const DOMAIN = 'activitytest.local';

let roles: RoleFixture;
let projectId: string;
let otherProjectId: string;
let issueId: string;

beforeAll(() => cleanupDomain(DOMAIN));

beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  projectId = (await createProject(roles.owner, roles.workspaceId)).id;
  otherProjectId = (await createProject(roles.owner, roles.workspaceId)).id;

  const issue = await createIssue(roles.owner, roles.workspaceId, projectId);
  issueId = issue.body.data.issue.id;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function projectPath(project = projectId): string {
  return `/api/workspaces/${roles.workspaceId}/projects/${project}`;
}

function issuePath(issue = issueId, project = projectId): string {
  return `${projectPath(project)}/issues/${issue}`;
}

describe('GET .../activities', () => {
  it('rejects a request without a session', async () => {
    const response = await request(app).get(`${projectPath()}/activities`);

    expect(response.status).toBe(401);
  });

  it('does not let an outsider read the feed', async () => {
    const response = await roles.outsider.agent.get(`${projectPath()}/activities`);

    expect(response.status).toBe(403);
  });

  it('is scoped to the project in the URL', async () => {
    await createIssue(roles.owner, roles.workspaceId, otherProjectId, { title: 'Other project' });

    const response = await roles.member.agent.get(`${projectPath()}/activities`);

    expect(response.status).toBe(200);
    expect(response.body.data.activities).toHaveLength(2);
    expect(
      response.body.data.activities.every(
        (activity: { project: { id: string } | null }) => activity.project?.id === projectId,
      ),
    ).toBe(true);
  });

  it('shows the issue display key and a safe actor', async () => {
    const response = await roles.member.agent.get(`${projectPath()}/activities?type=ISSUE_CREATED`);
    const [activity] = response.body.data.activities;

    expect(activity.type).toBe('ISSUE_CREATED');
    expect(activity.issue.displayKey).toMatch(/-1$/);
    expect(Object.keys(activity.actor)).toEqual(['id', 'name', 'email']);
  });

  it('returns correct pagination metadata', async () => {
    for (let index = 0; index < 3; index += 1) {
      await createIssue(roles.owner, roles.workspaceId, projectId, { title: `Issue ${index}` });
    }

    const response = await roles.member.agent.get(`${projectPath()}/activities?limit=2`);

    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    });
    expect(response.body.data.activities).toHaveLength(2);
  });

  it('rejects a limit above the maximum', async () => {
    const response = await roles.member.agent.get(`${projectPath()}/activities?limit=500`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILTER');
  });

  it('orders newest first and pages without repeating a row', async () => {
    for (let index = 0; index < 3; index += 1) {
      await createIssue(roles.owner, roles.workspaceId, projectId, { title: `Issue ${index}` });
    }

    const first = await roles.member.agent.get(`${projectPath()}/activities?limit=2&page=1`);
    const second = await roles.member.agent.get(`${projectPath()}/activities?limit=2&page=2`);

    const dates = first.body.data.activities.map((a: { createdAt: string }) => a.createdAt);

    expect(new Date(dates[0]).getTime()).toBeGreaterThanOrEqual(new Date(dates[1]).getTime());

    const ids = [
      ...first.body.data.activities.map((a: { id: string }) => a.id),
      ...second.body.data.activities.map((a: { id: string }) => a.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops metadata keys that are not on the whitelist', async () => {
    await prisma.activityLog.create({
      data: {
        workspaceId: roles.workspaceId,
        projectId,
        issueId,
        actorId: roles.owner.id,
        type: 'ISSUE_UPDATED',
        metadata: { changedFields: ['title'], tokenHash: 'leak', password: 'leak' },
      },
    });

    const response = await roles.member.agent.get(`${projectPath()}/activities?type=ISSUE_UPDATED`);

    expect(response.body.data.activities[0].metadata).toEqual({ changedFields: ['title'] });
    expect(JSON.stringify(response.body)).not.toContain('leak');
  });
});

describe('GET .../issues/:issueId/activities', () => {
  it('is scoped to the selected issue', async () => {
    const other = await createIssue(roles.owner, roles.workspaceId, projectId, {
      title: 'Second issue',
    });

    const response = await roles.member.agent.get(`${issuePath()}/activities`);

    expect(response.status).toBe(200);
    expect(response.body.data.activities).toHaveLength(1);
    expect(response.body.data.activities[0].issue.id).toBe(issueId);
    expect(response.body.data.activities[0].issue.id).not.toBe(other.body.data.issue.id);
  });

  it('does not let an outsider read the issue history', async () => {
    const response = await roles.outsider.agent.get(`${issuePath()}/activities`);

    expect(response.status).toBe(403);
  });

  it('cannot read an issue through another project', async () => {
    const response = await roles.member.agent.get(`${issuePath(issueId, otherProjectId)}/activities`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
  });

  it('records a status change once with previous and next values', async () => {
    await roles.owner.agent.patch(issuePath()).send({ status: 'IN_PROGRESS' });

    const response = await roles.member.agent.get(
      `${issuePath()}/activities?type=ISSUE_STATUS_CHANGED`,
    );

    expect(response.body.data.activities).toHaveLength(1);
    expect(response.body.data.activities[0].metadata).toEqual({
      previousStatus: 'BACKLOG',
      nextStatus: 'IN_PROGRESS',
    });
  });

  it('writes nothing for an update that changes no value', async () => {
    const before = await prisma.activityLog.count({ where: { issueId } });

    await roles.owner.agent.patch(issuePath()).send({ status: 'BACKLOG', title: 'A test issue' });

    expect(await prisma.activityLog.count({ where: { issueId } })).toBe(before);
  });
});
