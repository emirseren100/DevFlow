import { prisma } from '../src/lib/prisma.js';

/**
 * Read-only database check. Confirms PostgreSQL is reachable, counts the main
 * models and verifies the seeded workspace relations. It never writes or
 * deletes anything, and it never prints the connection string.
 */
async function main(): Promise<void> {
  const [users, workspaces, members, projects, sprints, issues, comments, activities] =
    await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.workspaceMember.count(),
      prisma.project.count(),
      prisma.sprint.count(),
      prisma.issue.count(),
      prisma.comment.count(),
      prisma.activityLog.count(),
    ]);

  console.log('Database reachable.');
  console.log(
    `Counts — users: ${users}, workspaces: ${workspaces}, members: ${members}, ` +
      `projects: ${projects}, sprints: ${sprints}, issues: ${issues}, ` +
      `comments: ${comments}, activity: ${activities}`,
  );

  const workspace = await prisma.workspace.findUnique({
    where: { slug: 'orbit-labs' },
    include: {
      owner: { select: { email: true } },
      members: { select: { role: true } },
      projects: { select: { key: true, _count: { select: { issues: true } } } },
    },
  });

  if (!workspace) {
    console.error('Check failed: seeded workspace "orbit-labs" not found. Run npm run db:seed.');
    process.exitCode = 1;
    return;
  }

  const owner = workspace.members.filter((member) => member.role === 'OWNER').length;
  const projectSummary = workspace.projects
    .map((project) => `${project.key}(${project._count.issues})`)
    .join(', ');

  console.log(
    `Workspace "${workspace.slug}" — owner: ${workspace.owner.email}, ` +
      `members: ${workspace.members.length} (OWNER x${owner}), projects: ${projectSummary}`,
  );

  if (workspace.projects.length === 0 || owner === 0) {
    console.error('Check failed: workspace relations are incomplete.');
    process.exitCode = 1;
    return;
  }

  console.log('Database check passed.');
}

try {
  await main();
} catch (error) {
  console.error('Database check failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
