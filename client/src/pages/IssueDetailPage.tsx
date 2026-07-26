import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ActivityFeed from '../components/ActivityFeed';
import Breadcrumbs from '../components/Breadcrumbs';
import CommentSection from '../components/CommentSection';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import { PRIORITY_LABELS, PriorityBadge, StatusBadge, TypeBadge } from '../components/badges';
import { ErrorState, LoadingState, PermissionNotice } from '../components/states';
import { errorMessage } from '../lib/apiClient';
import { listIssueActivities } from '../lib/collaborationApi';
import type { IssueDetail, IssueInput, IssuePriority, IssueStatus, IssueType } from '../lib/projectApi';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
  deleteIssue,
  getIssue,
  listSprints,
  updateIssue,
} from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';
import { listMembers } from '../lib/workspaceApi';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

/** `2026-07-26T00:00:00.000Z` becomes `2026-07-26` for a date input. */
function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

export default function IssueDetailPage() {
  const { workspaceId = '', projectId = '', issueId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('TASK');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [status, setStatus] = useState<IssueStatus>('BACKLOG');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Three independent queries for one screen. The member list and the sprint
  // list are shared with the create page, so opening both reuses the cache.
  const [issueQuery, membersQuery, sprintsQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.issue(workspaceId, projectId, issueId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getIssue(workspaceId, projectId, issueId, signal),
      },
      {
        queryKey: queryKeys.workspaceMembers(workspaceId),
        queryFn: ({ signal }: { signal: AbortSignal }) => listMembers(workspaceId, signal),
      },
      {
        queryKey: queryKeys.sprints(workspaceId, projectId),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          listSprints(workspaceId, projectId, signal),
      },
    ],
  });

  const issue = issueQuery.data;

  // The edit form is filled from the server copy whenever a different issue is
  // loaded, and never while the user is typing in it.
  useEffect(() => {
    if (!issue || isEditing) {
      return;
    }

    setTitle(issue.title);
    setDescription(issue.description ?? '');
    setType(issue.type);
    setPriority(issue.priority);
    setStatus(issue.status);
    setAssigneeId(issue.assignee?.id ?? '');
    setSprintId(issue.sprint?.id ?? '');
    setDueDate(toDateInput(issue.dueDate));
  }, [issue, isEditing]);

  /**
   * Saving an issue changes its detail, every list it appears in, the project
   * summary, the board, the feeds and the workspace metrics.
   */
  function invalidateAfterIssueChange() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.issueLists(workspaceId, projectId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.project(workspaceId, projectId),
      exact: true,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.board(workspaceId, projectId) });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.projectActivity(workspaceId, projectId),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });
  }

  const updateMutation = useMutation({
    mutationFn: (input: Partial<IssueInput>) =>
      updateIssue(workspaceId, projectId, issueId, input),
    onSuccess: (updated: IssueDetail) => {
      setActionError(null);
      setIsEditing(false);
      queryClient.setQueryData(queryKeys.issue(workspaceId, projectId, issueId), updated);
      invalidateAfterIssueChange();
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIssue(workspaceId, projectId, issueId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.issue(workspaceId, projectId, issueId) });
      invalidateAfterIssueChange();
      navigate(`/app/workspaces/${workspaceId}/projects/${projectId}`);
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (issueQuery.isPending) {
    return <LoadingState label="Loading issue…" />;
  }

  if (issueQuery.isError) {
    return (
      <ErrorState
        error={issueQuery.error}
        onRetry={() => void issueQuery.refetch()}
        backTo={`/app/workspaces/${workspaceId}/projects/${projectId}`}
        backLabel="Back to the project"
      />
    );
  }

  const detail = issueQuery.data;
  const members = membersQuery.data ?? [];
  const sprints = sprintsQuery.data ?? [];
  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  function handleSave(event: FormEvent) {
    event.preventDefault();

    updateMutation.mutate({
      title,
      description,
      type,
      priority,
      status,
      assigneeId: assigneeId || null,
      sprintId: sprintId || null,
      dueDate: dueDate || null,
    });
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: 'Projects', to: `/app/workspaces/${workspaceId}/projects` },
          {
            label: detail.project.key,
            to: `/app/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: detail.displayKey },
        ]}
      />

      <PageHeader
        title={detail.title}
        actions={
          <>
            {detail.permissions.canUpdate && !isEditing && (
              <button type="button" onClick={() => setIsEditing(true)}>
                Edit issue
              </button>
            )}

            {detail.permissions.canDelete && (
              <button
                type="button"
                className="btn--danger"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isBusy}
              >
                Delete issue
              </button>
            )}
          </>
        }
      />

      <p className="record__meta">
        <span className="issue-key">{detail.displayKey}</span>
        <StatusBadge status={detail.status} />
        <PriorityBadge priority={detail.priority} />
        <TypeBadge type={detail.type} />
      </p>

      <section className="panel stack--tight" aria-labelledby="issue-description-heading">
        <h2 id="issue-description-heading">Description</h2>
        <p className="issue-description">{detail.description ?? 'No description.'}</p>
      </section>

      <dl className="panel meta-grid">
        <div>
          <dt>Type</dt>
          <dd>{TYPE_LABELS[detail.type]}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STATUS_LABELS[detail.status]}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{PRIORITY_LABELS[detail.priority]}</dd>
        </div>
        <div>
          <dt>Reporter</dt>
          <dd>{detail.reporter.name}</dd>
        </div>
        <div>
          <dt>Assignee</dt>
          <dd>{detail.assignee ? detail.assignee.name : 'Unassigned'}</dd>
        </div>
        <div>
          <dt>Sprint</dt>
          <dd>{detail.sprint ? detail.sprint.name : 'No sprint'}</dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{formatDate(detail.dueDate)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(detail.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDate(detail.updatedAt)}</dd>
        </div>
      </dl>

      {/* The server decided these two flags; the page only reads them. */}
      {!detail.permissions.canUpdate && (
        <PermissionNotice>
          You may only edit issues you reported or are assigned to.
        </PermissionNotice>
      )}

      {detail.permissions.canUpdate && isEditing && (
        <form className="panel form" onSubmit={handleSave}>
          <h2>Edit issue</h2>

          <div className="field">
            <label htmlFor="issue-title">Title</label>
            <input
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              minLength={2}
              maxLength={200}
            />
          </div>

          <div className="field">
            <label htmlFor="issue-description">Description</label>
            <textarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={10000}
            />
          </div>

          <div className="form__row">
            <div className="field" style={{ flex: '1 1 8rem' }}>
              <label htmlFor="issue-type">Type</label>
              <select
                id="issue-type"
                value={type}
                onChange={(event) => setType(event.target.value as IssueType)}
              >
                {ISSUE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ flex: '1 1 8rem' }}>
              <label htmlFor="issue-status">Status</label>
              <select
                id="issue-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as IssueStatus)}
              >
                {ISSUE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ flex: '1 1 8rem' }}>
              <label htmlFor="issue-priority">Priority</label>
              <select
                id="issue-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as IssuePriority)}
              >
                {ISSUE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="issue-assignee">Assignee</label>
            <select
              id="issue-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="issue-sprint">Sprint</label>
            <select
              id="issue-sprint"
              value={sprintId}
              onChange={(event) => setSprintId(event.target.value)}
            >
              <option value="">No sprint</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="issue-due-date">Due date</label>
            <input
              id="issue-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          <div className="form__row">
            <button type="submit" disabled={isBusy}>
              Save issue
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={isBusy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {detail.permissions.canDelete && isConfirmingDelete && (
        <ConfirmDialog
          title={`Delete ${detail.displayKey}?`}
          confirmLabel="Confirm delete"
          cancelLabel="Cancel delete"
          isBusy={isBusy}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
        >
          Deleting this issue also removes its comments and cannot be undone.
        </ConfirmDialog>
      )}

      {actionError && (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      )}

      <CommentSection workspaceId={workspaceId} projectId={projectId} issueId={issueId} />

      {/* Comments and activity stay two separate things: one is what people
          wrote, the other is what the system recorded. */}
      <ActivityFeed
        heading="Issue history"
        queryKey={queryKeys.issueActivity(workspaceId, projectId, issueId)}
        load={(page, signal) =>
          listIssueActivities(workspaceId, projectId, issueId, page, undefined, signal)
        }
        emptyText="No recorded change yet."
      />
    </>
  );
}
