import { Algorithm, hash as argonHash } from '@node-rs/argon2';

import { prisma } from '../src/lib/prisma.js';

/**
 * Deterministic development seed.
 *
 * Every record uses an explicit `seed_*` id and is written with `upsert`, so
 * running the seed twice updates the same rows instead of creating duplicates.
 * All identities are fictional and use `.local` addresses.
 */

/**
 * Shared password for every seeded account. Local development only: these
 * accounts and this password must never exist in a deployed environment.
 */
const SEED_PASSWORD = 'DevFlow123!';

const users = [
  { id: 'seed_user_ada', email: 'ada@devflow.local', name: 'Ada Yilmaz' },
  { id: 'seed_user_boris', email: 'boris@devflow.local', name: 'Boris Kaya' },
  { id: 'seed_user_ceyda', email: 'ceyda@devflow.local', name: 'Ceyda Demir' },
] as const;

const workspace = {
  id: 'seed_ws_orbit',
  name: 'Orbit Labs',
  slug: 'orbit-labs',
  ownerId: 'seed_user_ada',
};

const members = [
  { id: 'seed_member_ada', userId: 'seed_user_ada', role: 'OWNER' },
  { id: 'seed_member_boris', userId: 'seed_user_boris', role: 'ADMIN' },
  { id: 'seed_member_ceyda', userId: 'seed_user_ceyda', role: 'MEMBER' },
] as const;

const projects = [
  {
    id: 'seed_prj_api',
    name: 'Orbit API',
    key: 'api',
    description: 'Backend service for the Orbit product.',
    createdById: 'seed_user_ada',
  },
  {
    id: 'seed_prj_web',
    name: 'Orbit Web',
    key: 'web',
    description: 'Customer facing web client.',
    createdById: 'seed_user_boris',
  },
] as const;

const sprints = [
  {
    id: 'seed_sprint_api_1',
    projectId: 'seed_prj_api',
    name: 'API Sprint 1',
    goal: 'Ship the first working endpoints.',
    status: 'ACTIVE',
  },
  {
    id: 'seed_sprint_api_2',
    projectId: 'seed_prj_api',
    name: 'API Sprint 2',
    goal: 'Harden validation and error handling.',
    status: 'PLANNED',
  },
  {
    id: 'seed_sprint_web_1',
    projectId: 'seed_prj_web',
    name: 'Web Sprint 1',
    goal: 'Build the application shell.',
    status: 'ACTIVE',
  },
] as const;

const issues = [
  {
    id: 'seed_issue_01',
    number: 1,
    projectId: 'seed_prj_api',
    sprintId: 'seed_sprint_api_1',
    reporterId: 'seed_user_ada',
    assigneeId: 'seed_user_boris',
    title: 'Design the workspace membership model',
    description: 'Decide roles and the composite unique constraint.',
    type: 'TASK',
    status: 'DONE',
    priority: 'HIGH',
    position: 0,
  },
  {
    id: 'seed_issue_02',
    number: 2,
    projectId: 'seed_prj_api',
    sprintId: 'seed_sprint_api_1',
    reporterId: 'seed_user_ada',
    assigneeId: 'seed_user_ada',
    title: 'Add health endpoint monitoring notes',
    description: 'Document why the health check stays database independent.',
    type: 'TASK',
    status: 'IN_REVIEW',
    priority: 'LOW',
    position: 1,
  },
  {
    id: 'seed_issue_03',
    number: 3,
    projectId: 'seed_prj_api',
    sprintId: 'seed_sprint_api_1',
    reporterId: 'seed_user_boris',
    assigneeId: 'seed_user_ceyda',
    title: 'Issue list returns duplicated rows',
    description: 'A join produces duplicates when an issue has many comments.',
    type: 'BUG',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    position: 2,
  },
  {
    id: 'seed_issue_04',
    number: 4,
    projectId: 'seed_prj_api',
    sprintId: 'seed_sprint_api_2',
    reporterId: 'seed_user_ada',
    assigneeId: null,
    title: 'Plan pagination for the issue list',
    description: null,
    type: 'TASK',
    status: 'TODO',
    priority: 'MEDIUM',
    position: 3,
  },
  {
    id: 'seed_issue_05',
    number: 5,
    projectId: 'seed_prj_api',
    sprintId: null,
    reporterId: 'seed_user_ceyda',
    assigneeId: null,
    title: 'Investigate slow workspace query',
    description: 'Check whether the workspace index is used.',
    type: 'BUG',
    status: 'BACKLOG',
    priority: 'MEDIUM',
    position: 4,
  },
  {
    id: 'seed_issue_06',
    number: 6,
    projectId: 'seed_prj_api',
    sprintId: null,
    reporterId: 'seed_user_ada',
    assigneeId: 'seed_user_boris',
    title: 'Write activity log helper',
    description: 'One helper so every mutation records the same fields.',
    type: 'TASK',
    status: 'BACKLOG',
    priority: 'LOW',
    position: 5,
  },
  {
    id: 'seed_issue_07',
    number: 1,
    projectId: 'seed_prj_web',
    sprintId: 'seed_sprint_web_1',
    reporterId: 'seed_user_boris',
    assigneeId: 'seed_user_ceyda',
    title: 'Build the Kanban column layout',
    description: 'Five columns matching IssueStatus.',
    type: 'TASK',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    position: 0,
  },
  {
    id: 'seed_issue_08',
    number: 2,
    projectId: 'seed_prj_web',
    sprintId: 'seed_sprint_web_1',
    reporterId: 'seed_user_ceyda',
    assigneeId: 'seed_user_boris',
    title: 'Navigation link stays highlighted',
    description: 'The active class is not cleared after navigating away.',
    type: 'BUG',
    status: 'TODO',
    priority: 'MEDIUM',
    position: 1,
  },
  {
    id: 'seed_issue_09',
    number: 3,
    projectId: 'seed_prj_web',
    sprintId: 'seed_sprint_web_1',
    reporterId: 'seed_user_ada',
    assigneeId: null,
    title: 'Add loading and empty states',
    description: null,
    type: 'TASK',
    status: 'BACKLOG',
    priority: 'LOW',
    position: 2,
  },
  {
    id: 'seed_issue_10',
    number: 4,
    projectId: 'seed_prj_web',
    sprintId: null,
    reporterId: 'seed_user_boris',
    assigneeId: 'seed_user_ada',
    title: 'Filter bar keeps stale query parameters',
    description: 'Clearing a filter should remove it from the URL.',
    type: 'BUG',
    status: 'DONE',
    priority: 'HIGH',
    position: 3,
  },
] as const;

const comments = [
  {
    id: 'seed_comment_1',
    issueId: 'seed_issue_03',
    authorId: 'seed_user_ada',
    body: 'Reproduced it: the comment join needs a distinct select.',
  },
  {
    id: 'seed_comment_2',
    issueId: 'seed_issue_03',
    authorId: 'seed_user_ceyda',
    body: 'Fix in progress, adding a regression test as well.',
  },
  {
    id: 'seed_comment_3',
    issueId: 'seed_issue_07',
    authorId: 'seed_user_boris',
    body: 'Column order should follow the IssueStatus enum order.',
  },
] as const;

const activities = [
  { id: 'seed_act_1', type: 'WORKSPACE_CREATED', actorId: 'seed_user_ada' },
  { id: 'seed_act_2', type: 'MEMBER_ADDED', actorId: 'seed_user_ada' },
  {
    id: 'seed_act_3',
    type: 'PROJECT_CREATED',
    actorId: 'seed_user_ada',
    projectId: 'seed_prj_api',
  },
  {
    id: 'seed_act_4',
    type: 'ISSUE_CREATED',
    actorId: 'seed_user_boris',
    projectId: 'seed_prj_api',
    issueId: 'seed_issue_03',
  },
  {
    id: 'seed_act_5',
    type: 'ISSUE_STATUS_CHANGED',
    actorId: 'seed_user_ceyda',
    projectId: 'seed_prj_api',
    issueId: 'seed_issue_03',
    metadata: { from: 'TODO', to: 'IN_PROGRESS' },
  },
  {
    id: 'seed_act_6',
    type: 'COMMENT_CREATED',
    actorId: 'seed_user_ada',
    projectId: 'seed_prj_api',
    issueId: 'seed_issue_03',
  },
] as const;

async function main(): Promise<void> {
  for (const user of users) {
    const email = user.email.toLowerCase();
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email, name: user.name },
      create: { id: user.id, email, name: user.name },
    });
  }

  // One credential row per seeded user. Hashed on every run, but upserted on a
  // fixed id, so repeated seeding never creates a second credential.
  for (const user of users) {
    const passwordHash = await argonHash(SEED_PASSWORD, { algorithm: Algorithm.Argon2id });

    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash },
      create: { id: `seed_cred_${user.id}`, userId: user.id, passwordHash },
    });
  }

  await prisma.workspace.upsert({
    where: { id: workspace.id },
    update: { name: workspace.name, slug: workspace.slug, ownerId: workspace.ownerId },
    create: workspace,
  });

  for (const member of members) {
    await prisma.workspaceMember.upsert({
      where: { id: member.id },
      update: { role: member.role },
      create: {
        id: member.id,
        workspaceId: workspace.id,
        userId: member.userId,
        role: member.role,
      },
    });
  }

  for (const project of projects) {
    const key = project.key.toUpperCase();
    await prisma.project.upsert({
      where: { id: project.id },
      update: {
        name: project.name,
        key,
        description: project.description,
        createdById: project.createdById,
      },
      create: {
        id: project.id,
        workspaceId: workspace.id,
        createdById: project.createdById,
        name: project.name,
        key,
        description: project.description,
      },
    });
  }

  for (const sprint of sprints) {
    await prisma.sprint.upsert({
      where: { id: sprint.id },
      update: { name: sprint.name, goal: sprint.goal, status: sprint.status },
      create: { ...sprint },
    });
  }

  for (const issue of issues) {
    await prisma.issue.upsert({
      where: { id: issue.id },
      update: {
        number: issue.number,
        sprintId: issue.sprintId,
        assigneeId: issue.assigneeId,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        status: issue.status,
        priority: issue.priority,
        position: issue.position,
      },
      create: { ...issue },
    });
  }

  // The counter is only ever moved forward, so a re-run cannot push it back
  // below issues that were created through the API in the meantime.
  for (const project of projects) {
    const highest = await prisma.issue.aggregate({
      where: { projectId: project.id },
      _max: { number: true },
    });

    const stored = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { nextIssueNumber: true },
    });

    const nextIssueNumber = Math.max(stored.nextIssueNumber, (highest._max.number ?? 0) + 1);

    if (nextIssueNumber !== stored.nextIssueNumber) {
      await prisma.project.update({ where: { id: project.id }, data: { nextIssueNumber } });
    }
  }

  for (const comment of comments) {
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: { body: comment.body },
      create: { ...comment },
    });
  }

  for (const activity of activities) {
    await prisma.activityLog.upsert({
      where: { id: activity.id },
      update: {},
      create: { ...activity, workspaceId: workspace.id },
    });
  }

  console.log(
    `Seed complete: ${users.length} users (with development password credentials), ` +
      `${projects.length} projects, ${sprints.length} sprints, ${issues.length} issues, ` +
      `${comments.length} comments. No login sessions are seeded.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
