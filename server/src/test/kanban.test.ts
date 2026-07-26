import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  addMember,
  app,
  cleanupDomain,
  createIssue,
  createProject,
  prisma,
  setupRoles,
  signUp,
} from './phase5.helpers.js';
import type { RoleFixture, TestUser } from './phase5.helpers.js';

const DOMAIN = 'kanbantest.local';

let roles: RoleFixture;
let projectId: string;
let otherProjectId: string;
/** A second plain MEMBER who neither reported nor is assigned anything. */
let colleague: TestUser;

beforeAll(() => cleanupDomain(DOMAIN));

beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  colleague = await signUp(DOMAIN, 'Colleague Person');
  await addMember(roles.owner, roles.workspaceId, colleague, 'MEMBER');

  projectId = (await createProject(roles.owner, roles.workspaceId)).id;
  otherProjectId = (await createProject(roles.owner, roles.workspaceId)).id;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function projectPath(project = projectId): string {
  return `/api/workspaces/${roles.workspaceId}/projects/${project}`;
}

function movePath(issueId: string, project = projectId): string {
  return `${projectPath(project)}/issues/${issueId}/move`;
}

/** Creates an issue directly in a status column and returns its id. */
async function issueIn(
  status: string,
  body: Record<string, unknown> = {},
  actor: TestUser = roles.owner,
): Promise<string> {
  const response = await createIssue(actor, roles.workspaceId, projectId, { status, ...body });

  expect(response.status).toBe(201);

  return response.body.data.issue.id as string;
}

function move(actor: TestUser, issueId: string, targetStatus: string, targetIndex: number) {
  return actor.agent.patch(movePath(issueId)).send({ targetStatus, targetIndex });
}

interface BoardCard {
  id: string;
  position: number;
  description?: string;
  reporter: Record<string, unknown>;
  permissions: { canMove: boolean; canEdit: boolean };
}

interface Board {
  columns: { status: string; issues: BoardCard[] }[];
}

/** The cards of one column, in the order the board returns them. */
function columnCards(board: Board, status: string): BoardCard[] {
  return board.columns.find((column) => column.status === status)?.issues ?? [];
}

function columnIds(board: Board, status: string): string[] {
  return columnCards(board, status).map((card) => card.id);
}

/** The first card of a column, with a clear failure when the column is empty. */
function firstCard(board: Board, status: string): BoardCard {
  const [card] = columnCards(board, status);

  if (!card) {
    throw new Error(`Expected a card in the ${status} column.`);
  }

  return card;
}

async function positionsOf(status: string): Promise<number[]> {
  const issues = await prisma.issue.findMany({
    where: { projectId, status: status as 'TODO' },
    orderBy: { position: 'asc' },
    select: { position: true },
  });

  return issues.map((issue) => issue.position);
}

describe('GET .../board', () => {
  it('rejects a request without a session', async () => {
    const response = await request(app).get(`${projectPath()}/board`);

    expect(response.status).toBe(401);
  });

  it('does not let an outsider read the board', async () => {
    const response = await roles.outsider.agent.get(`${projectPath()}/board`);

    expect(response.status).toBe(403);
  });

  it('returns the five columns in board order with the issues in position order', async () => {
    const first = await issueIn('TODO');
    const second = await issueIn('TODO');
    const done = await issueIn('DONE');

    const response = await roles.member.agent.get(`${projectPath()}/board`);
    const board = response.body.data.board;

    expect(response.status).toBe(200);
    expect(board.columns.map((column: { status: string }) => column.status)).toEqual([
      'BACKLOG',
      'TODO',
      'IN_PROGRESS',
      'IN_REVIEW',
      'DONE',
    ]);
    expect(columnIds(board, 'TODO')).toEqual([first, second]);
    expect(columnIds(board, 'DONE')).toEqual([done]);
    expect(columnIds(board, 'BACKLOG')).toEqual([]);
  });

  it('sends a card summary without the description and with safe people', async () => {
    await issueIn('TODO', { description: 'A long description nobody needs on a card.' });

    const response = await roles.member.agent.get(`${projectPath()}/board`);
    const card = firstCard(response.body.data.board, 'TODO');

    expect(card.description).toBeUndefined();
    expect(Object.keys(card.reporter)).toEqual(['id', 'name', 'email']);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|tokenHash/i);
  });

  it('tells each role which cards it may move', async () => {
    await issueIn('TODO', {}, roles.member);

    const asMember = await roles.member.agent.get(`${projectPath()}/board`);
    const asColleague = await colleague.agent.get(`${projectPath()}/board`);
    const asAdmin = await roles.admin.agent.get(`${projectPath()}/board`);

    expect(firstCard(asMember.body.data.board, 'TODO').permissions).toEqual({
      canMove: true,
      canEdit: true,
    });
    expect(firstCard(asColleague.body.data.board, 'TODO').permissions).toEqual({
      canMove: false,
      canEdit: false,
    });
    expect(firstCard(asAdmin.body.data.board, 'TODO').permissions.canMove).toBe(true);
  });
});

describe('move authorization', () => {
  it('lets the OWNER move an issue reported by somebody else', async () => {
    const id = await issueIn('TODO', {}, roles.member);

    const response = await move(roles.owner, id, 'DONE', 0);

    expect(response.status).toBe(200);
  });

  it('lets an ADMIN move an issue reported by somebody else', async () => {
    const id = await issueIn('TODO', {}, roles.member);

    const response = await move(roles.admin, id, 'DONE', 0);

    expect(response.status).toBe(200);
  });

  it('lets a MEMBER move an issue they reported', async () => {
    const id = await issueIn('TODO', {}, roles.member);

    const response = await move(roles.member, id, 'IN_PROGRESS', 0);

    expect(response.status).toBe(200);
  });

  it('lets a MEMBER move an issue assigned to them', async () => {
    const id = await issueIn('TODO', { assigneeId: colleague.id });

    const response = await move(colleague, id, 'IN_PROGRESS', 0);

    expect(response.status).toBe(200);
  });

  it('does not let an unrelated MEMBER move the issue', async () => {
    const id = await issueIn('TODO');

    const response = await move(colleague, id, 'DONE', 0);

    expect(response.status).toBe(403);
    expect(
      (await prisma.issue.findUniqueOrThrow({ where: { id }, select: { status: true } })).status,
    ).toBe('TODO');
  });

  it('does not let an outsider move the issue', async () => {
    const id = await issueIn('TODO');

    const response = await move(roles.outsider, id, 'DONE', 0);

    expect(response.status).toBe(403);
  });

  it('does not accept an issue from another project through this route', async () => {
    const id = await issueIn('TODO');

    const response = await roles.owner.agent
      .patch(movePath(id, otherProjectId))
      .send({ targetStatus: 'DONE', targetIndex: 0 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
  });
});

describe('move validation', () => {
  it('rejects a negative target index', async () => {
    const id = await issueIn('TODO');

    const response = await move(roles.owner, id, 'DONE', -1);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown target status', async () => {
    const id = await issueIn('TODO');

    const response = await move(roles.owner, id, 'ARCHIVED', 0);

    expect(response.status).toBe(400);
  });

  it('clamps a target index past the end of the destination column', async () => {
    const first = await issueIn('DONE');
    const moved = await issueIn('TODO');

    const response = await move(roles.owner, moved, 'DONE', 99);

    expect(response.status).toBe(200);
    expect(columnIds(response.body.data.board, 'DONE')).toEqual([first, moved]);
    expect(await positionsOf('DONE')).toEqual([0, 1]);
  });
});

describe('ordering', () => {
  it('reorders inside one column and keeps the positions contiguous', async () => {
    const a = await issueIn('TODO');
    const b = await issueIn('TODO');
    const c = await issueIn('TODO');

    const response = await move(roles.owner, c, 'TODO', 0);

    expect(columnIds(response.body.data.board, 'TODO')).toEqual([c, a, b]);
    expect(await positionsOf('TODO')).toEqual([0, 1, 2]);
  });

  it('moves across columns and repacks both sides', async () => {
    const a = await issueIn('TODO');
    const b = await issueIn('TODO');
    const c = await issueIn('TODO');
    const done = await issueIn('DONE');

    const response = await move(roles.owner, b, 'DONE', 0);
    const board = response.body.data.board;

    expect(columnIds(board, 'TODO')).toEqual([a, c]);
    expect(columnIds(board, 'DONE')).toEqual([b, done]);
    expect(await positionsOf('TODO')).toEqual([0, 1]);
    expect(await positionsOf('DONE')).toEqual([0, 1]);
    expect(
      (await prisma.issue.findUniqueOrThrow({ where: { id: b }, select: { status: true } })).status,
    ).toBe('DONE');
  });

  it('ignores a client position and writes the server order', async () => {
    const a = await issueIn('TODO');
    const b = await issueIn('TODO');

    await prisma.issue.update({ where: { id: a }, data: { position: 40 } });
    await prisma.issue.update({ where: { id: b }, data: { position: 41 } });

    const response = await move(roles.owner, b, 'TODO', 0);

    expect(columnIds(response.body.data.board, 'TODO')).toEqual([b, a]);
    expect(await positionsOf('TODO')).toEqual([0, 1]);
  });
});

describe('move activity', () => {
  it('writes exactly one ISSUE_STATUS_CHANGED row for a column change', async () => {
    const id = await issueIn('TODO');

    await move(roles.owner, id, 'IN_REVIEW', 0);

    const activities = await prisma.activityLog.findMany({
      where: { issueId: id },
      select: { type: true, metadata: true },
    });

    expect(activities.map((activity) => activity.type)).toEqual([
      'ISSUE_CREATED',
      'ISSUE_STATUS_CHANGED',
    ]);
    expect(activities[1]?.metadata).toEqual({
      previousStatus: 'TODO',
      nextStatus: 'IN_REVIEW',
    });
  });

  it('writes no activity for a reorder inside the same column', async () => {
    const a = await issueIn('TODO');
    const b = await issueIn('TODO');

    await move(roles.owner, b, 'TODO', 0);

    expect(await prisma.activityLog.count({ where: { issueId: b, type: 'ISSUE_STATUS_CHANGED' } }))
      .toBe(0);
    expect(await prisma.activityLog.count({ where: { issueId: a, type: 'ISSUE_UPDATED' } })).toBe(0);
  });

  it('leaves the previous order untouched when the move is rejected', async () => {
    const a = await issueIn('TODO');
    const b = await issueIn('TODO');

    // Rejected by validation, so the transaction never starts.
    const response = await move(roles.owner, b, 'TODO', -5);

    expect(response.status).toBe(400);
    expect(await positionsOf('TODO')).toEqual([0, 1]);

    const board = (await roles.owner.agent.get(`${projectPath()}/board`)).body.data.board;

    expect(columnIds(board, 'TODO')).toEqual([a, b]);
  });
});
