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

const DOMAIN = 'commenttest.local';

let roles: RoleFixture;
let projectId: string;
let issueId: string;
/** A second plain MEMBER: a workspace colleague who wrote nothing here. */
let colleague: TestUser;

beforeAll(() => cleanupDomain(DOMAIN));

beforeEach(async () => {
  roles = await setupRoles(DOMAIN);
  colleague = await signUp(DOMAIN, 'Colleague Person');
  await addMember(roles.owner, roles.workspaceId, colleague, 'MEMBER');

  const project = await createProject(roles.owner, roles.workspaceId);
  projectId = project.id;

  // Reported by the OWNER, so the MEMBER is an unrelated third party.
  const issue = await createIssue(roles.owner, roles.workspaceId, projectId);
  issueId = issue.body.data.issue.id;
});

afterAll(async () => {
  await cleanupDomain(DOMAIN);
  await prisma.$disconnect();
});

function commentsUrl(issue = issueId, project = projectId): string {
  return `/api/workspaces/${roles.workspaceId}/projects/${project}/issues/${issue}/comments`;
}

function addComment(actor: TestUser, body = 'A first comment.', issue = issueId) {
  return actor.agent.post(commentsUrl(issue)).send({ body });
}

async function commentId(actor: TestUser, body = 'A first comment.'): Promise<string> {
  const response = await addComment(actor, body);

  expect(response.status).toBe(201);

  return response.body.data.comment.id as string;
}

describe('comment access', () => {
  it('rejects a request without a session', async () => {
    const response = await request(app).get(commentsUrl());

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('does not let an outsider read the comments', async () => {
    const response = await roles.outsider.agent.get(commentsUrl());

    expect(response.status).toBe(403);
  });

  it('lets a workspace member list the comments', async () => {
    await commentId(roles.owner, 'Visible to the team.');

    const response = await roles.member.agent.get(commentsUrl());

    expect(response.status).toBe(200);
    expect(response.body.data.comments).toHaveLength(1);
    expect(response.body.data.comments[0].body).toBe('Visible to the team.');
  });

  it('returns the comments in a deterministic order', async () => {
    await commentId(roles.owner, 'First.');
    await commentId(roles.member, 'Second.');
    await commentId(roles.admin, 'Third.');

    const response = await roles.member.agent.get(commentsUrl());

    expect(response.body.data.comments.map((c: { body: string }) => c.body)).toEqual([
      'First.',
      'Second.',
      'Third.',
    ]);
  });

  it('lets a plain member write a comment', async () => {
    const response = await addComment(roles.member, 'Looking into it.');

    expect(response.status).toBe(201);
    expect(response.body.data.comment.body).toBe('Looking into it.');
    expect(response.body.data.comment.isEdited).toBe(false);
  });

  it('always uses the signed-in user as the author', async () => {
    const response = await roles.member.agent
      .post(commentsUrl())
      .send({ body: 'Mine.', authorId: roles.owner.id });

    expect(response.status).toBe(201);
    expect(response.body.data.comment.author.id).toBe(roles.member.id);
  });

  it('rejects a whitespace-only comment', async () => {
    const response = await addComment(roles.member, '   \n  ');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a comment longer than 5000 characters', async () => {
    const response = await addComment(roles.member, 'x'.repeat(5001));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('stores the trimmed body', async () => {
    const response = await addComment(roles.member, '  padded  ');

    expect(response.body.data.comment.body).toBe('padded');
  });

  it('never exposes a credential, a session or a hash', async () => {
    await commentId(roles.member);

    const response = await roles.member.agent.get(commentsUrl());
    const payload = JSON.stringify(response.body);

    expect(payload).not.toMatch(/password/i);
    expect(payload).not.toMatch(/tokenHash|passwordHash|session/i);
    expect(Object.keys(response.body.data.comments[0].author)).toEqual(['id', 'name', 'email']);
  });

  it('records one COMMENT_CREATED activity that holds only the comment id', async () => {
    const id = await commentId(roles.member, 'Secret words that must not be copied.');

    const activities = await prisma.activityLog.findMany({
      where: { issueId, type: 'COMMENT_CREATED' },
      select: { actorId: true, metadata: true },
    });

    expect(activities).toHaveLength(1);
    expect(activities[0]?.actorId).toBe(roles.member.id);
    expect(activities[0]?.metadata).toEqual({ commentId: id });
  });
});

describe('editing a comment', () => {
  it('lets the author edit their own comment', async () => {
    const id = await commentId(roles.member, 'Frist draft.');

    const response = await roles.member.agent
      .patch(`${commentsUrl()}/${id}`)
      .send({ body: 'First draft.' });

    expect(response.status).toBe(200);
    expect(response.body.data.comment.body).toBe('First draft.');
  });

  it('does not let another member edit the comment', async () => {
    const id = await commentId(roles.member);

    const response = await colleague.agent
      .patch(`${commentsUrl()}/${id}`)
      .send({ body: 'Rewritten.' });

    expect(response.status).toBe(403);
  });

  it('does not let an outsider edit the comment', async () => {
    const id = await commentId(roles.member);

    const response = await roles.outsider.agent
      .patch(`${commentsUrl()}/${id}`)
      .send({ body: 'Rewritten.' });

    expect(response.status).toBe(403);
  });

  it('does not let an OWNER or an ADMIN edit another user\'s words', async () => {
    const id = await commentId(roles.member);

    for (const actor of [roles.owner, roles.admin]) {
      const response = await actor.agent
        .patch(`${commentsUrl()}/${id}`)
        .send({ body: 'Rewritten by a manager.' });

      expect(response.status).toBe(403);
    }

    const stored = await prisma.comment.findUniqueOrThrow({ where: { id }, select: { body: true } });

    expect(stored.body).toBe('A first comment.');
  });

  it('rejects an empty edit', async () => {
    const id = await commentId(roles.member);

    const response = await roles.member.agent.patch(`${commentsUrl()}/${id}`).send({ body: ' ' });

    expect(response.status).toBe(400);
  });

  it('cannot reach a comment through another issue', async () => {
    const id = await commentId(roles.member);
    const other = await createIssue(roles.owner, roles.workspaceId, projectId, {
      title: 'Another issue',
    });

    const response = await roles.member.agent
      .patch(`${commentsUrl(other.body.data.issue.id)}/${id}`)
      .send({ body: 'Wrong route.' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('COMMENT_NOT_FOUND');
  });

  it('cannot reach a comment through another project', async () => {
    const id = await commentId(roles.member);
    const otherProject = await createProject(roles.owner, roles.workspaceId);

    const response = await roles.member.agent
      .patch(`${commentsUrl(issueId, otherProject.id)}/${id}`)
      .send({ body: 'Wrong project.' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ISSUE_NOT_FOUND');
  });
});

describe('deleting a comment', () => {
  it('lets the author delete their own comment', async () => {
    const id = await commentId(roles.member);

    const response = await roles.member.agent.delete(`${commentsUrl()}/${id}`);

    expect(response.status).toBe(200);
    expect(await prisma.comment.findUnique({ where: { id } })).toBeNull();
  });

  it('lets the OWNER delete another user\'s comment', async () => {
    const id = await commentId(roles.member);

    const response = await roles.owner.agent.delete(`${commentsUrl()}/${id}`);

    expect(response.status).toBe(200);
  });

  it('lets an ADMIN delete another user\'s comment', async () => {
    const id = await commentId(roles.member);

    const response = await roles.admin.agent.delete(`${commentsUrl()}/${id}`);

    expect(response.status).toBe(200);
  });

  it('does not let an unrelated member delete the comment', async () => {
    const id = await commentId(roles.owner);

    const response = await colleague.agent.delete(`${commentsUrl()}/${id}`);

    expect(response.status).toBe(403);
    expect(await prisma.comment.findUnique({ where: { id } })).not.toBeNull();
  });

  it('keeps the issue itself', async () => {
    const id = await commentId(roles.member);

    await roles.member.agent.delete(`${commentsUrl()}/${id}`);

    expect(await prisma.issue.findUnique({ where: { id: issueId } })).not.toBeNull();
  });
});

describe('comment permissions in the response', () => {
  it('gives a colleague neither edit nor delete', async () => {
    await commentId(roles.member);

    const response = await colleague.agent.get(commentsUrl());

    expect(response.body.data.comments[0].permissions).toEqual({
      canEdit: false,
      canDelete: false,
    });
  });

  it('gives the author edit and delete, a manager delete only', async () => {
    await commentId(roles.member);

    const asAuthor = await roles.member.agent.get(commentsUrl());
    const asOwner = await roles.owner.agent.get(commentsUrl());
    const asAdmin = await roles.admin.agent.get(commentsUrl());

    expect(asAuthor.body.data.comments[0].permissions).toEqual({
      canEdit: true,
      canDelete: true,
    });
    expect(asOwner.body.data.comments[0].permissions).toEqual({
      canEdit: false,
      canDelete: true,
    });
    expect(asAdmin.body.data.comments[0].permissions).toEqual({
      canEdit: false,
      canDelete: true,
    });
  });
});
