import { ApiError } from '../../lib/apiError.js';
import { prisma } from '../../lib/prisma.js';
import type { SprintSummary } from '../projects/project.types.js';
import type { CreateSprintInput, ListSprintsQuery, UpdateSprintInput } from './sprint.schemas.js';

/** Sprint board order: what the team works on now comes first. */
const SPRINT_RANK = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2 } as const;

const sprintSelect = {
  id: true,
  name: true,
  goal: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  _count: { select: { issues: true } },
} as const;

type SprintRow = {
  id: string;
  name: string;
  goal: string | null;
  status: keyof typeof SPRINT_RANK;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  _count: { issues: number };
};

function toSummary(sprint: SprintRow): SprintSummary {
  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal,
    status: sprint.status,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    issueCount: sprint._count.issues,
  };
}

/**
 * PostgreSQL sorts an enum in declaration order (PLANNED, ACTIVE, COMPLETED),
 * which is not the order a board should show. The sprint list of one project is
 * small, so it is ordered here: ACTIVE, PLANNED, COMPLETED, then startDate,
 * then createdAt as the final tie-breaker.
 */
function inBoardOrder(sprints: SprintRow[]): SprintRow[] {
  return [...sprints].sort((left, right) => {
    const byStatus = SPRINT_RANK[left.status] - SPRINT_RANK[right.status];

    if (byStatus !== 0) {
      return byStatus;
    }

    // A sprint without a start date sorts after the scheduled ones.
    const leftStart = left.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightStart = right.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });
}

export async function listSprints(
  projectId: string,
  query: ListSprintsQuery = {},
): Promise<SprintSummary[]> {
  const sprints = await prisma.sprint.findMany({
    where: { projectId, ...(query.status ? { status: query.status } : {}) },
    select: sprintSelect,
  });

  return inBoardOrder(sprints).map(toSummary);
}

/** The project id comes from the verified route context, never from the body. */
export async function createSprint(
  projectId: string,
  input: CreateSprintInput,
): Promise<SprintSummary> {
  const sprint = await prisma.sprint.create({
    data: {
      projectId,
      name: input.name,
      status: input.status,
      ...(input.goal === undefined ? {} : { goal: input.goal }),
      ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
      ...(input.endDate === undefined ? {} : { endDate: input.endDate }),
    },
    select: sprintSelect,
  });

  return toSummary(sprint);
}

/** A sprint id from another project can never be reached through this project. */
export async function findSprintInProject(projectId: string, sprintId: string) {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { ...sprintSelect, startDate: true, endDate: true },
  });

  if (!sprint) {
    throw ApiError.sprintNotFound();
  }

  return sprint;
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  input: UpdateSprintInput,
): Promise<SprintSummary> {
  const current = await findSprintInProject(projectId, sprintId);

  // A PATCH may send only one of the two dates, so the range is checked against
  // the value that is already stored.
  const startDate = input.startDate === undefined ? current.startDate : input.startDate;
  const endDate = input.endDate === undefined ? current.endDate : input.endDate;

  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    throw ApiError.invalidDateRange();
  }

  const sprint = await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.goal === undefined ? {} : { goal: input.goal }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
      ...(input.endDate === undefined ? {} : { endDate: input.endDate }),
    },
    select: sprintSelect,
  });

  return toSummary(sprint);
}

/**
 * Only an empty sprint can be removed. Deleting a sprint that still holds work
 * would silently drop those issues back into the backlog, which is a decision
 * for the team, not a side effect of a delete button.
 */
export async function deleteSprint(projectId: string, sprintId: string): Promise<void> {
  const sprint = await findSprintInProject(projectId, sprintId);

  if (sprint._count.issues > 0) {
    throw ApiError.sprintHasIssues();
  }

  await prisma.sprint.delete({ where: { id: sprint.id } });
}
