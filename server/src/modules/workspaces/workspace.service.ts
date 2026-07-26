import type { WorkspaceRole } from '../../generated/prisma/enums.js';
import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import type { SafeUser } from '../auth/auth.types.js';
import { assertCanAssignRole, assertCanRemoveMember } from './workspace.authorization.js';
import type { AddMemberInput } from './workspace.schemas.js';
import type { SafeMember, WorkspaceDetail, WorkspaceSummary } from './workspace.types.js';

/** Columns that are safe to send to a client. Never a hash, never a session. */
const safeUserSelect = { id: true, name: true, email: true } as const;

const workspaceSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Prisma reports a violated unique index with this code. */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

// Turkish letters have no accent-free equivalent in NFKD, so they are mapped
// explicitly before the generic cleanup runs.
/** Combining accent marks left behind by NFKD normalization. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

const TRANSLITERATION: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

/**
 * Deterministic, URL-friendly base slug. The same name always produces the same
 * base; only the uniqueness suffix can differ.
 */
export function slugBase(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[çğıöşü]/g, (letter) => TRANSLITERATION[letter] ?? letter)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');

  // A name written entirely in a non-Latin script would otherwise be empty.
  return base || 'workspace';
}

/** Picks the first free slug: `acme`, then `acme-2`, `acme-3`, … */
async function nextFreeSlug(base: string): Promise<string> {
  const taken = new Set(
    (
      await prisma.workspace.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((workspace) => workspace.slug),
  );

  if (!taken.has(base)) {
    return base;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(`No free slug for base "${base}".`);
}

/**
 * Creates the workspace, its OWNER membership and the activity record in one
 * transaction: a workspace without an owner membership must never exist.
 *
 * Two people can pick the same name at the same moment, so a lost race on the
 * unique slug index is retried instead of failing the request.
 */
export async function createWorkspace(actor: SafeUser, name: string): Promise<WorkspaceDetail> {
  const base = slugBase(name);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = await nextFreeSlug(base);

    try {
      return await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: { name, slug, ownerId: actor.id },
          select: workspaceSelect,
        });

        await tx.workspaceMember.create({
          data: { workspaceId: workspace.id, userId: actor.id, role: 'OWNER' },
        });

        await tx.activityLog.create({
          data: {
            workspaceId: workspace.id,
            actorId: actor.id,
            type: 'WORKSPACE_CREATED',
            metadata: { slug },
          },
        });

        return { ...workspace, role: 'OWNER' as WorkspaceRole, memberCount: 1, owner: actor };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new Error(`Could not generate a unique workspace slug for "${name}".`);
}

/** Only workspaces the user actually belongs to. Ownership is not enough. */
export async function listWorkspacesForUser(userId: string): Promise<WorkspaceSummary[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: {
      role: true,
      workspace: {
        select: { ...workspaceSelect, _count: { select: { members: true } } },
      },
    },
  });

  return memberships.map(({ role, workspace }) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role,
    memberCount: workspace._count.members,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  }));
}

/** Membership is checked by the middleware before this runs. */
export async function getWorkspaceDetail(
  workspaceId: string,
  role: WorkspaceRole,
): Promise<WorkspaceDetail> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ...workspaceSelect,
      owner: { select: safeUserSelect },
      _count: { select: { members: true } },
    },
  });

  if (!workspace) {
    throw ApiError.workspaceNotFound();
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    role,
    memberCount: workspace._count.members,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    owner: workspace.owner,
  };
}

/**
 * Renames the workspace. The slug stays as it was: links and bookmarks that
 * already exist keep working, which matters more in this MVP than a slug that
 * always matches the current name.
 */
export async function updateWorkspaceName(
  workspaceId: string,
  name: string,
  role: WorkspaceRole,
): Promise<WorkspaceDetail> {
  await prisma.workspace.update({ where: { id: workspaceId }, data: { name } });

  return getWorkspaceDetail(workspaceId, role);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  // Members, projects and activity rows are removed by the cascade rules that
  // were chosen deliberately in the Phase 2 schema.
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

/**
 * Stable ordering: OWNER, then ADMIN, then MEMBER, and inside a role the
 * oldest membership first. PostgreSQL sorts an enum by declaration order, which
 * is exactly OWNER, ADMIN, MEMBER.
 */
export async function listMembers(workspaceId: string): Promise<SafeMember[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    select: { id: true, role: true, joinedAt: true, user: { select: safeUserSelect } },
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    joinedAt: member.joinedAt,
  }));
}

/**
 * Adds an already registered DevFlow user. Email invitations are out of scope,
 * so an unknown address is a 404 rather than a pending invite.
 */
export async function addMember(
  workspaceId: string,
  actorRole: WorkspaceRole,
  actorId: string,
  input: AddMemberInput,
): Promise<SafeMember> {
  assertCanAssignRole(actorRole, input.role);

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: safeUserSelect,
  });

  if (!user) {
    throw ApiError.userNotFound();
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: { id: true },
  });

  if (existing) {
    throw ApiError.alreadyMember();
  }

  try {
    const membership = await prisma.$transaction(async (tx) => {
      const created = await tx.workspaceMember.create({
        data: { workspaceId, userId: user.id, role: input.role },
        select: { id: true, role: true, joinedAt: true },
      });

      await tx.activityLog.create({
        data: {
          workspaceId,
          actorId,
          type: 'MEMBER_ADDED',
          metadata: { addedUserId: user.id, assignedRole: input.role },
        },
      });

      return created;
    });

    return {
      id: membership.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  } catch (error) {
    // The composite unique index on (workspaceId, userId) is what actually
    // prevents a double membership, including two simultaneous requests.
    if (isUniqueConstraintError(error)) {
      throw ApiError.alreadyMember();
    }

    throw error;
  }
}

async function findMembership(workspaceId: string, memberId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    // workspaceId is part of the filter, so a member id from another workspace
    // can never be reached through this workspace's URL.
    where: { id: memberId, workspaceId },
    select: { id: true, role: true, joinedAt: true, user: { select: safeUserSelect } },
  });

  if (!membership) {
    throw ApiError.memberNotFound();
  }

  return membership;
}

/** OWNER-only, and the owner membership itself is never a valid target. */
export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
): Promise<SafeMember> {
  const membership = await findMembership(workspaceId, memberId);

  if (membership.role === 'OWNER') {
    throw ApiError.ownerMembershipImmutable();
  }

  if (membership.role === role) {
    throw ApiError.invalidRole('This member already has that role.');
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: membership.id },
    data: { role },
    select: { id: true, role: true, joinedAt: true },
  });

  return {
    id: updated.id,
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: updated.role,
    joinedAt: updated.joinedAt,
  };
}

export async function removeMember(
  workspaceId: string,
  memberId: string,
  actorRole: WorkspaceRole,
  actorId: string,
): Promise<void> {
  const membership = await findMembership(workspaceId, memberId);

  if (membership.role === 'OWNER') {
    throw ApiError.ownerMembershipImmutable();
  }

  if (membership.user.id === actorId) {
    // Leaving a workspace yourself is a separate feature, not a management one.
    throw ApiError.selfRemovalNotAllowed();
  }

  assertCanRemoveMember(actorRole, membership.role);

  await prisma.workspaceMember.delete({ where: { id: membership.id } });
}
