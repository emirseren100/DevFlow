import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ProjectNav from '../components/ProjectNav';
import { ApiError } from '../lib/apiClient';
import type { Board, BoardColumn, BoardIssue } from '../lib/collaborationApi';
import { getBoard, moveIssue } from '../lib/collaborationApi';
import type { IssueStatus } from '../lib/projectApi';
import { ISSUE_STATUSES, STATUS_LABELS } from '../lib/projectApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

const COLUMN_PREFIX = 'column-';

/** Moves one card inside a board copy. Used for the optimistic update only. */
function withMovedCard(
  columns: BoardColumn[],
  issueId: string,
  targetStatus: IssueStatus,
  targetIndex: number,
): BoardColumn[] {
  const moved = columns.flatMap((column) => column.issues).find((issue) => issue.id === issueId);

  if (!moved) {
    return columns;
  }

  return columns.map((column) => {
    const issues = column.issues.filter((issue) => issue.id !== issueId);

    if (column.status !== targetStatus) {
      return { ...column, issues };
    }

    const index = Math.min(Math.max(targetIndex, 0), issues.length);

    issues.splice(index, 0, { ...moved, status: targetStatus });

    return { ...column, issues };
  });
}

interface CardProps {
  issue: BoardIssue;
  workspaceId: string;
  projectId: string;
  columnStatus: IssueStatus;
  onMoveToStatus: (issue: BoardIssue, status: IssueStatus) => void;
}

function BoardCard({ issue, workspaceId, projectId, columnStatus, onMoveToStatus }: CardProps) {
  // The server decided `canMove`; a card without it is not draggable at all.
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: issue.id,
    disabled: !issue.permissions.canMove,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={`${issue.displayKey} ${issue.title}, column ${STATUS_LABELS[columnStatus]}`}
    >
      <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`}>
        {issue.displayKey} {issue.title}
      </Link>
      <p>
        {issue.type} — {issue.priority} —{' '}
        {issue.assignee ? issue.assignee.name : 'Unassigned'}
        {issue.dueDate ? ` — due ${new Date(issue.dueDate).toLocaleDateString()}` : ''}
      </p>

      {issue.permissions.canMove && (
        <>
          {/* The handle carries the drag listeners, so keyboard users can pick the
              card up with the same control a mouse uses. */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${issue.displayKey}`}
          >
            Drag
          </button>

          {/* Dragging is never the only way to move a card. */}
          <label htmlFor={`move-${issue.id}`}>Move {issue.displayKey} to</label>
          <select
            id={`move-${issue.id}`}
            value={columnStatus}
            onChange={(event) => onMoveToStatus(issue, event.target.value as IssueStatus)}
          >
            {ISSUE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </>
      )}
    </li>
  );
}

interface ColumnProps extends Omit<CardProps, 'issue' | 'columnStatus'> {
  column: BoardColumn;
}

function Column({ column, ...cardProps }: ColumnProps) {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_PREFIX}${column.status}` });

  return (
    <section aria-labelledby={`column-heading-${column.status}`} ref={setNodeRef}>
      <h2 id={`column-heading-${column.status}`}>
        {STATUS_LABELS[column.status]} ({column.issues.length})
      </h2>

      {column.issues.length === 0 && <p>No issue in this column.</p>}

      <SortableContext
        items={column.issues.map((issue) => issue.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul>
          {column.issues.map((issue) => (
            <BoardCard
              key={issue.id}
              issue={issue}
              columnStatus={column.status}
              {...cardProps}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const { workspaceId = '', projectId = '' } = useParams();

  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError(null);

    getBoard(workspaceId, projectId)
      .then((result) => {
        if (active) setBoard(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(messageOf(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  /**
   * Optimistic, with a real rollback: the previous board is kept, the card is
   * moved locally, and the server answer replaces the whole board. If the
   * request fails the saved board comes back, so no card is ever duplicated or
   * lost.
   */
  const runMove = useCallback(
    async (issueId: string, targetStatus: IssueStatus, targetIndex: number) => {
      if (!board) {
        return;
      }

      const previous = board;

      setMoveError(null);
      setBoard({ ...board, columns: withMovedCard(board.columns, issueId, targetStatus, targetIndex) });

      try {
        setBoard(await moveIssue(workspaceId, projectId, issueId, targetStatus, targetIndex));
      } catch (error) {
        setBoard(previous);
        setMoveError(messageOf(error));
      }
    },
    [board, workspaceId, projectId],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !board) {
      return;
    }

    const overId = String(over.id);
    const activeId = String(active.id);

    if (overId.startsWith(COLUMN_PREFIX)) {
      const status = overId.slice(COLUMN_PREFIX.length) as IssueStatus;
      const column = board.columns.find((entry) => entry.status === status);

      void runMove(activeId, status, column ? column.issues.length : 0);

      return;
    }

    const column = board.columns.find((entry) =>
      entry.issues.some((issue) => issue.id === overId),
    );

    if (!column || overId === activeId) {
      return;
    }

    void runMove(activeId, column.status, column.issues.findIndex((issue) => issue.id === overId));
  }

  function handleMoveToStatus(issue: BoardIssue, status: IssueStatus) {
    if (!board || status === issue.status) {
      return;
    }

    const column = board.columns.find((entry) => entry.status === status);

    // The fallback control always appends; the server clamps the index anyway.
    void runMove(issue.id, status, column ? column.issues.length : 0);
  }

  if (isLoading) {
    return <p role="status">Loading board…</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!board) {
    return null;
  }

  return (
    <section>
      <ProjectNav workspaceId={workspaceId} projectId={projectId} />

      <h1>
        {board.project.key} board
      </h1>

      {moveError && <p role="alert">{moveError}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {board.columns.map((column) => (
          <Column
            key={column.status}
            column={column}
            workspaceId={workspaceId}
            projectId={projectId}
            onMoveToStatus={handleMoveToStatus}
          />
        ))}
      </DndContext>
    </section>
  );
}
