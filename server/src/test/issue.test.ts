import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupDomain,
  createIssue,
  createProject,
  prisma,
  setupRoles,
  signUp,
} from './phase5.helpers.js';
import type { RoleFixture, TestUser } from './phase5.helpers.js';

const DOMAIN = 'issuetest.local';

let roles: RoleFixture;
let projectId: string;
let projectKey: string;

beforeAll(() => cleanupDomain(DOMAIN));

beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  const project = await createProject(roles.owner, roles.workspaceId);
  projectId = project.id;
  projectKey = project.key;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function issuesUrl(project = projectId): string {
  return `/api/workspaces/${roles.workspaceId}/projects/${project}/issues`;
}

function createSprint(actor: TestUser, project = projectId, name = 'Sprint 1') {
  return actor.agent
    .post(`/api/workspaces/${roles.workspaceId}/projects/${project}/sprints`)
    .send({ name });
}

describe('POST .../issues', () => {
  it('lets every workspace role create an issue', async () => {
    for (const actor of [roles.owner, roles.admin, roles.member]) {
      const response = await createIssue(actor, roles.workspaceId, projectId);

      expect(response.status).toBe(201);
    }
  });

  it('does not let an outsider create an issue', async () => {
    const response = await createIssue(roles.outsider, roles.workspaceId, projectId);

    expect(response.status).toBe(403);
  });

  it('always uses the signed-in user as the reporter', async () => {
    const response = await createIssue(roles.member, roles.workspaceId, projectId, {
      reporterId: roles.owner.id,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.issue.reporter.id).toBe(roles.member.id);
  });

  it('numbers issues per project and builds the display key', async () => {
    const first = await createIssue(roles.owner, roles.workspaceId, projectId);
    const second = await createIssue(roles.owner, roles.workspaceId, projectId);

    expect(first.body.data.issue.number).toBe(1);
    expect(second.body.data.issue.number).toBe(2);
    expect(second.body.data.issue.displayKey).toBe(`${projectKey}-2`);
  });

  it('gives each project its own number 1', async () => {
    const other = await createProject(roles.owner, roles.workspaceId);

    const here = await createIssue(roles.owner, roles.workspaceId, projectId);
    const there = await createIssue(roles.owner, roles.workspaceId, other.id);

    expect(here.body.data.issue.number).toBe(1);
    expect(there.body.data.issue.number).toBe(1);
    expect(there.body.data.issue.displayKey).toBe(`${other.key}-1`);
  });

  it('never hands out the same number to concurrent requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => createIssue(roles.owner, roles.workspaceId, projectId)),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);

    const numbers = responses.map((response) => response.body.data.issue.number).sort((a, b) => a - b);

    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('rejects an assignee who is not a workspace member', async () => {
    const stranger = await signUp(DOMAIN, 'Stranger');

    const response = await createIssue(roles.owner, roles.workspaceId, projectId, {
      assigneeId: stranger.id,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('accepts an assignee who is a workspace member', async () => {
    const response = await createIssue(roles.owner, roles.workspaceId, projectId, {
      assigneeId: roles.member.id,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.issue.assignee.id).toBe(roles.member.id);
  });

  it('rejects a sprint that belongs to another project', async () => {
    const other = await createProject(roles.owner, roles.workspaceId);
    const sprint = await createSprint(roles.owner, other.id);

    const response = await createIssue(roles.owner, roles.workspaceId, projectId, {
      sprintId: sprint.body.data.sprint.id,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SPRINT');
  });

  it('defaults the status to BACKLOG and records an ISSUE_CREATED activity', async () => {
    const response = await createIssue(roles.owner, roles.workspaceId, projectId);

    expect(response.body.data.issue.status).toBe('BACKLOG');

    const activities = await prisma.activityLog.findMany({
      where: { issueId: response.body.data.issue.id },
      select: { type: true },
    });

    expect(activities).toEqual([{ type: 'ISSUE_CREATED' }]);
  });
});

describe('GET .../issues', () => {
  it('filters by status, type, assignee and unassigned', async () => {
    await createIssue(roles.owner, roles.workspaceId, projectId, {
      title: 'Assigned bug',
      type: 'BUG',
      status: 'TODO',
      assigneeId: roles.member.id,
    });
    await createIssue(roles.owner, roles.workspaceId, projectId, { title: 'Free task' });

    const bugs = await roles.member.agent.get(issuesUrl()).query({ type: 'BUG' });
    const todo = await roles.member.agent.get(issuesUrl()).query({ status: 'TODO' });
    const mine = await roles.member.agent.get(issuesUrl()).query({ assigneeId: roles.member.id });
    const free = await roles.member.agent.get(issuesUrl()).query({ unassigned: 'true' });

    expect(bugs.body.data.issues.map((i: { title: string }) => i.title)).toEqual(['Assigned bug']);
    expect(todo.body.data.issues).toHaveLength(1);
    expect(mine.body.data.issues).toHaveLength(1);
    expect(free.body.data.issues.map((i: { title: string }) => i.title)).toEqual(['Free task']);
    expect(free.body.data.filters).toMatchObject({ unassigned: true });
  });

  it('searches title, description and issue number', async () => {
    await createIssue(roles.owner, roles.workspaceId, projectId, {
      title: 'Login screen flickers',
      description: 'Only on Safari.',
    });
    await createIssue(roles.owner, roles.workspaceId, projectId, { title: 'Unrelated work' });

    const byTitle = await roles.member.agent.get(issuesUrl()).query({ search: 'flicker' });
    const byDescription = await roles.member.agent.get(issuesUrl()).query({ search: 'safari' });
    const byKey = await roles.member.agent.get(issuesUrl()).query({ search: `${projectKey}-1` });

    expect(byTitle.body.data.issues).toHaveLength(1);
    expect(byDescription.body.data.issues).toHaveLength(1);
    expect(byKey.body.data.issues[0].number).toBe(1);
  });

  it('returns correct pagination metadata', async () => {
    for (let index = 0; index < 5; index += 1) {
      await createIssue(roles.owner, roles.workspaceId, projectId, { title: `Issue ${index}` });
    }

    const page = await roles.member.agent.get(issuesUrl()).query({ limit: 2, page: 2 });

    expect(page.body.data.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    });
    expect(page.body.data.issues).toHaveLength(2);
  });

  it('rejects a limit above the maximum', async () => {
    const response = await roles.member.agent.get(issuesUrl()).query({ limit: 500 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILTER');
  });

  it('does not let an outsider read the issues', async () => {
    await createIssue(roles.owner, roles.workspaceId, projectId);

    const response = await roles.outsider.agent.get(issuesUrl());

    expect(response.status).toBe(403);
  });
});

describe('GET .../issues/:issueId', () => {
  it('returns the detail with the display key and the caller permissions', async () => {
    const created = await createIssue(roles.member, roles.workspaceId, projectId);

    const response = await roles.member.agent.get(`${issuesUrl()}/${created.body.data.issue.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.issue).toMatchObject({
      displayKey: `${projectKey}-1`,
      permissions: { canUpdate: true, canDelete: false },
      project: { id: projectId, key: projectKey },
    });
    expect(response.body.data.issue.comments).toBeUndefined();
  });

  it('cannot be reached through another project id', async () => {
    const created = await createIssue(roles.owner, roles.workspaceId, projectId);
    const other = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.owner.agent.get(
      `${issuesUrl(other.id)}/${created.body.data.issue.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
  });
});

describe('PATCH .../issues/:issueId', () => {
  it('lets the reporter update their own issue', async () => {
    const created = await createIssue(roles.member, roles.workspaceId, projectId);

    const response = await roles.member.agent
      .patch(`${issuesUrl()}/${created.body.data.issue.id}`)
      .send({ title: 'Updated by the reporter' });

    expect(response.status).toBe(200);
    expect(response.body.data.issue.title).toBe('Updated by the reporter');
  });

  it('lets the current assignee update the issue', async () => {
    const created = await createIssue(roles.owner, roles.workspaceId, projectId, {
      assigneeId: roles.member.id,
    });

    const response = await roles.member.agent
      .patch(`${issuesUrl()}/${created.body.data.issue.id}`)
      .send({ status: 'IN_PROGRESS' });

    expect(response.status).toBe(200);
    expect(response.body.data.issue.status).toBe('IN_PROGRESS');
  });

  it('does not let an unrelated MEMBER update the issue', async () => {
    const created = await createIssue(roles.owner, roles.workspaceId, projectId);

    const response = await roles.member.agent
      .patch(`${issuesUrl()}/${created.body.data.issue.id}`)
      .send({ title: 'Not mine' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lets an OWNER and an ADMIN update any issue', async () => {
    const created = await createIssue(roles.member, roles.workspaceId, projectId);
    const issueId = created.body.data.issue.id as string;

    const byAdmin = await roles.admin.agent
      .patch(`${issuesUrl()}/${issueId}`)
      .send({ priority: 'URGENT' });
    const byOwner = await roles.owner.agent
      .patch(`${issuesUrl()}/${issueId}`)
      .send({ status: 'DONE' });

    expect(byAdmin.body.data.issue.priority).toBe('URGENT');
    expect(byOwner.body.data.issue.status).toBe('DONE');
  });

  it('ignores a reporter, number or project change sent by the client', async () => {
    const created = await createIssue(roles.member, roles.workspaceId, projectId);
    const other = await createProject(roles.owner, roles.workspaceId);

    await roles.owner.agent.patch(`${issuesUrl()}/${created.body.data.issue.id}`).send({
      title: 'Only the title moves',
      reporterId: roles.owner.id,
      number: 99,
      projectId: other.id,
    });

    const stored = await prisma.issue.findUnique({
      where: { id: created.body.data.issue.id },
      select: { reporterId: true, number: true, projectId: true, title: true },
    });

    expect(stored).toEqual({
      reporterId: roles.member.id,
      number: 1,
      projectId,
      title: 'Only the title moves',
    });
  });

  it('writes a status and an assignment activity, but nothing for a no-op', async () => {
    const created = await createIssue(roles.owner, roles.workspaceId, projectId, {
      status: 'TODO',
      priority: 'LOW',
    });
    const issueId = created.body.data.issue.id as string;

    await roles.owner.agent
      .patch(`${issuesUrl()}/${issueId}`)
      .send({ status: 'IN_PROGRESS', assigneeId: roles.member.id });

    // Exactly the same values again: nothing really changes.
    await roles.owner.agent
      .patch(`${issuesUrl()}/${issueId}`)
      .send({ status: 'IN_PROGRESS', assigneeId: roles.member.id, priority: 'LOW' });

    const activities = await prisma.activityLog.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      select: { type: true },
    });

    expect(activities.map((activity) => activity.type)).toEqual([
      'ISSUE_CREATED',
      'ISSUE_STATUS_CHANGED',
      'ISSUE_ASSIGNED',
    ]);
  });

  it('rejects an assignee from outside the workspace', async () => {
    const created = await createIssue(roles.owner, roles.workspaceId, projectId);

    const response = await roles.owner.agent
      .patch(`${issuesUrl()}/${created.body.data.issue.id}`)
      .send({ assigneeId: roles.outsider.id });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ASSIGNEE');
  });
});

describe('DELETE .../issues/:issueId', () => {
  it('does not let a MEMBER delete an issue they reported', async () => {
    const created = await createIssue(roles.member, roles.workspaceId, projectId);

    const response = await roles.member.agent.delete(`${issuesUrl()}/${created.body.data.issue.id}`);

    expect(response.status).toBe(403);
  });

  it('lets an OWNER and an ADMIN delete an issue', async () => {
    const first = await createIssue(roles.member, roles.workspaceId, projectId);
    const second = await createIssue(roles.member, roles.workspaceId, projectId);

    const byOwner = await roles.owner.agent.delete(`${issuesUrl()}/${first.body.data.issue.id}`);
    const byAdmin = await roles.admin.agent.delete(`${issuesUrl()}/${second.body.data.issue.id}`);

    expect(byOwner.status).toBe(200);
    expect(byAdmin.status).toBe(200);
    expect(await prisma.issue.count({ where: { projectId } })).toBe(0);
  });
});
