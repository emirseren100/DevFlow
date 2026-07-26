import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { IssueDetail, IssuePriority, IssueStatus, IssueType, SprintSummary } from '../lib/projectApi';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  deleteIssue,
  getIssue,
  listSprints,
  updateIssue,
} from '../lib/projectApi';
import { listMembers } from '../lib/workspaceApi';
import type { WorkspaceMember } from '../lib/workspaceApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

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

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [sprints, setSprints] = useState<SprintSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('TASK');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [status, setStatus] = useState<IssueStatus>('BACKLOG');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');

  function fillForm(detail: IssueDetail): void {
    setTitle(detail.title);
    setDescription(detail.description ?? '');
    setType(detail.type);
    setPriority(detail.priority);
    setStatus(detail.status);
    setAssigneeId(detail.assignee?.id ?? '');
    setSprintId(detail.sprint?.id ?? '');
    setDueDate(toDateInput(detail.dueDate));
  }

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      getIssue(workspaceId, projectId, issueId),
      listMembers(workspaceId),
      listSprints(workspaceId, projectId),
    ])
      .then(([detail, memberList, sprintList]) => {
        if (!active) return;

        setIssue(detail);
        fillForm(detail);
        setMembers(memberList);
        setSprints(sprintList);
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
  }, [workspaceId, projectId, issueId]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setActionError(null);

    try {
      const updated = await updateIssue(workspaceId, projectId, issueId, {
        title,
        description,
        type,
        priority,
        status,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
        dueDate: dueDate || null,
      });

      setIssue(updated);
      fillForm(updated);
      setIsEditing(false);
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    setIsBusy(true);
    setActionError(null);

    try {
      await deleteIssue(workspaceId, projectId, issueId);
      navigate(`/app/workspaces/${workspaceId}/projects/${projectId}`);
    } catch (error) {
      setActionError(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  }

  if (isLoading) {
    return <p role="status">Loading issue…</p>;
  }

  if (loadError) {
    return <p role="alert">{loadError}</p>;
  }

  if (!issue) {
    return null;
  }

  return (
    <section>
      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}`}>Back to the project</Link>
      </p>

      <h1>
        {issue.displayKey} {issue.title}
      </h1>

      <dl>
        <dt>Description</dt>
        <dd>{issue.description ?? 'No description.'}</dd>
        <dt>Type</dt>
        <dd>{issue.type}</dd>
        <dt>Status</dt>
        <dd>{issue.status}</dd>
        <dt>Priority</dt>
        <dd>{issue.priority}</dd>
        <dt>Reporter</dt>
        <dd>{issue.reporter.name}</dd>
        <dt>Assignee</dt>
        <dd>{issue.assignee ? issue.assignee.name : 'Unassigned'}</dd>
        <dt>Sprint</dt>
        <dd>{issue.sprint ? issue.sprint.name : 'No sprint'}</dd>
        <dt>Due date</dt>
        <dd>{formatDate(issue.dueDate)}</dd>
        <dt>Created</dt>
        <dd>{formatDate(issue.createdAt)}</dd>
        <dt>Updated</dt>
        <dd>{formatDate(issue.updatedAt)}</dd>
      </dl>

      {/* The server decided these two flags; the page only reads them. */}
      {!issue.permissions.canUpdate && (
        <p>You may only edit issues you reported or are assigned to.</p>
      )}

      {issue.permissions.canUpdate && !isEditing && (
        <button type="button" onClick={() => setIsEditing(true)}>
          Edit issue
        </button>
      )}

      {issue.permissions.canUpdate && isEditing && (
        <form onSubmit={handleSave}>
          <h2>Edit issue</h2>

          <label htmlFor="issue-title">Title</label>
          <input
            id="issue-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={2}
            maxLength={200}
          />

          <label htmlFor="issue-description">Description</label>
          <textarea
            id="issue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={10000}
          />

          <label htmlFor="issue-type">Type</label>
          <select
            id="issue-type"
            value={type}
            onChange={(event) => setType(event.target.value as IssueType)}
          >
            {ISSUE_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <label htmlFor="issue-status">Status</label>
          <select
            id="issue-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as IssueStatus)}
          >
            {ISSUE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <label htmlFor="issue-priority">Priority</label>
          <select
            id="issue-priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as IssuePriority)}
          >
            {ISSUE_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

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

          <label htmlFor="issue-due-date">Due date</label>
          <input
            id="issue-due-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />

          <button type="submit" disabled={isBusy}>
            Save issue
          </button>
          <button type="button" onClick={() => setIsEditing(false)} disabled={isBusy}>
            Cancel
          </button>
        </form>
      )}

      {issue.permissions.canDelete &&
        (isConfirmingDelete ? (
          <>
            <p role="alert">Deleting this issue cannot be undone.</p>
            <button type="button" onClick={handleDelete} disabled={isBusy}>
              Confirm delete
            </button>
            <button type="button" onClick={() => setIsConfirmingDelete(false)} disabled={isBusy}>
              Cancel delete
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setIsConfirmingDelete(true)} disabled={isBusy}>
            Delete issue
          </button>
        ))}

      {actionError && <p role="alert">{actionError}</p>}
    </section>
  );
}
