import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../lib/apiClient';
import type { IssuePriority, IssueStatus, IssueType, SprintSummary } from '../lib/projectApi';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  createIssue,
  listSprints,
} from '../lib/projectApi';
import { listMembers } from '../lib/workspaceApi';
import type { WorkspaceMember } from '../lib/workspaceApi';

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export default function IssueCreatePage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [sprints, setSprints] = useState<SprintSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('TASK');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [status, setStatus] = useState<IssueStatus>('BACKLOG');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // The two option lists are the only reason this page loads anything: an
  // assignee is picked from the real workspace members and a sprint from the
  // project in the URL, so no free-text id can ever be sent.
  useEffect(() => {
    let active = true;

    Promise.all([listMembers(workspaceId), listSprints(workspaceId, projectId)])
      .then(([memberList, sprintList]) => {
        if (!active) return;

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
  }, [workspaceId, projectId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setFieldErrors({});

    try {
      const issue = await createIssue(workspaceId, projectId, {
        title,
        type,
        priority,
        status,
        ...(description ? { description } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(sprintId ? { sprintId } : {}),
        ...(dueDate ? { dueDate } : {}),
      });

      navigate(`/app/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`);
    } catch (error) {
      setSaveError(messageOf(error));

      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}`}>Back to the project</Link>
      </p>

      <h1>New issue</h1>

      {isLoading && <p role="status">Loading form…</p>}
      {loadError && <p role="alert">{loadError}</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="issue-title">Title</label>
        <input
          id="issue-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          maxLength={200}
        />
        {fieldErrors.title && <p role="alert">{fieldErrors.title[0]}</p>}

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

        <label htmlFor="issue-status">Initial status</label>
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

        {saveError && <p role="alert">{saveError}</p>}

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create issue'}
        </button>
      </form>
    </section>
  );
}
