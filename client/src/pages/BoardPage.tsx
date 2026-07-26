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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import ProjectNav from '../components/ProjectNav';
import { ErrorState, LoadingState } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import type { Board, BoardColumn, BoardIssue } from '../lib/collaborationApi';
import { getBoard, moveIssue } from '../lib/collaborationApi';
import type { IssueStatus } from '../lib/projectApi';
import { ISSUE_STATUSES, STATUS_LABELS } from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';

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
        {issue.type} — {issue.priority} — {issue.assignee ? issue.assignee.name : 'Unassigned'}
        {issue.dueDate ? ` — due ${new Date(issue.dueDate).toLocaleDateString()}` : ''}
      </p>

      {issue.permissions.canMove && (
        <>
          {/* The handle carries the drag listeners, so keyboard users can pick the
              card up with the same control a mouse uses. */}
          <button type="button" {...attributes} {...listeners} aria-label={`Drag ${issue.displayKey}`}>
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
            <BoardCard key={issue.id} issue={issue} columnStatus={column.status} {...cardProps} />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

export default function BoardPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [moveError, setMoveError] = useState<string | null>(null);

  const boardKey = queryKeys.board(workspaceId, projectId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const boardQuery = useQuery({
    queryKey: boardKey,
    queryFn: ({ signal }) => getBoard(workspaceId, projectId, signal),
  });

  /**
   * Optimistic, with a real rollback.
   *
   * The card moves in the cached board immediately, the server answer replaces
   * the whole board, and a failure puts the saved board back — so a rejected
   * move can never leave a duplicated or missing card.
   */
  const moveMutation = useMutation({
    mutationFn: (variables: {
      issueId: string;
      fromStatus: IssueStatus;
      targetStatus: IssueStatus;
      targetIndex: number;
    }) =>
      moveIssue(
        workspaceId,
        projectId,
        variables.issueId,
        variables.targetStatus,
        variables.targetIndex,
      ),
    onMutate: async (variables) => {
      setMoveError(null);
      // A refetch landing mid-move would overwrite the optimistic board.
      await queryClient.cancelQueries({ queryKey: boardKey });

      const previous = queryClient.getQueryData<Board>(boardKey);

      if (previous) {
        queryClient.setQueryData<Board>(boardKey, {
          ...previous,
          columns: withMovedCard(
            previous.columns,
            variables.issueId,
            variables.targetStatus,
            variables.targetIndex,
          ),
        });
      }

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(boardKey, context.previous);
      }

      setMoveError(errorMessage(error));
    },
    onSuccess: (confirmed, variables) => {
      // The response is the board the server actually stored.
      queryClient.setQueryData(boardKey, confirmed);

      // A reorder inside one column changes nothing else. A status change also
      // changes the issue, the project lists, the metrics and the feeds.
      if (variables.fromStatus === variables.targetStatus) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: queryKeys.issue(workspaceId, projectId, variables.issueId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.issueLists(workspaceId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project(workspaceId, projectId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectActivity(workspaceId, projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
    },
  });

  const board = boardQuery.data;

  function runMove(issue: BoardIssue, targetStatus: IssueStatus, targetIndex: number) {
    moveMutation.mutate({
      issueId: issue.id,
      fromStatus: issue.status,
      targetStatus,
      targetIndex,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !board) {
      return;
    }

    const overId = String(over.id);
    const moved = board.columns
      .flatMap((column) => column.issues)
      .find((issue) => issue.id === String(active.id));

    if (!moved) {
      return;
    }

    if (overId.startsWith(COLUMN_PREFIX)) {
      const status = overId.slice(COLUMN_PREFIX.length) as IssueStatus;
      const column = board.columns.find((entry) => entry.status === status);

      runMove(moved, status, column ? column.issues.length : 0);

      return;
    }

    const column = board.columns.find((entry) => entry.issues.some((issue) => issue.id === overId));

    if (!column || overId === moved.id) {
      return;
    }

    runMove(moved, column.status, column.issues.findIndex((issue) => issue.id === overId));
  }

  function handleMoveToStatus(issue: BoardIssue, status: IssueStatus) {
    if (!board || status === issue.status) {
      return;
    }

    const column = board.columns.find((entry) => entry.status === status);

    // The fallback control always appends; the server clamps the index anyway.
    runMove(issue, status, column ? column.issues.length : 0);
  }

  if (boardQuery.isPending) {
    return <LoadingState label="Loading board…" />;
  }

  if (boardQuery.isError) {
    return (
      <ErrorState
        error={boardQuery.error}
        onRetry={() => void boardQuery.refetch()}
        backTo={`/app/workspaces/${workspaceId}/projects`}
        backLabel="Back to projects"
      />
    );
  }

  const confirmed = boardQuery.data;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: 'Projects', to: `/app/workspaces/${workspaceId}/projects` },
          {
            label: confirmed.project.key,
            to: `/app/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: 'Board' },
        ]}
      />

      <ProjectNav workspaceId={workspaceId} projectId={projectId} />

      <PageHeader
        title={`${confirmed.project.key} board`}
        description="Drag a card, or use the labelled move control on the card itself."
      />

      {moveError && <p role="alert">{moveError}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        {/* The five columns scroll sideways on a narrow screen instead of being
            squeezed into unreadable strips. */}
        <div className="board">
          {confirmed.columns.map((column) => (
            <Column
              key={column.status}
              column={column}
              workspaceId={workspaceId}
              projectId={projectId}
              onMoveToStatus={handleMoveToStatus}
            />
          ))}
        </div>
      </DndContext>
    </>
  );
}
