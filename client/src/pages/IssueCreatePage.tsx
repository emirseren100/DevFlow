import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import { ErrorState, LoadingState } from '../components/states';
import { ApiError, errorMessage } from '../lib/apiClient';
import type { IssueInput, IssuePriority, IssueStatus, IssueType } from '../lib/projectApi';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  createIssue,
  listSprints,
} from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';
import { listMembers } from '../lib/workspaceApi';

export default function IssueCreatePage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>('TASK');
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM');
  const [status, setStatus] = useState<IssueStatus>('BACKLOG');
  const [assigneeId, setAssigneeId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // The two option lists are the only reason this page loads anything: an
  // assignee is picked from the real workspace members and a sprint from the
  // project in the URL, so no free-text id can ever be sent.
  const [membersQuery, sprintsQuery] = useQueries({
    queries: [
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

  const createMutation = useMutation({
    mutationFn: (input: IssueInput) => createIssue(workspaceId, projectId, input),
    onSuccess: (issue) => {
      // A new issue shows up in the lists, the board, the project summary, the
      // feeds and the workspace metrics.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.issueLists(workspaceId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project(workspaceId, projectId),
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.board(workspaceId, projectId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectActivity(workspaceId, projectId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDashboard(workspaceId) });

      navigate(`/app/workspaces/${workspaceId}/projects/${projectId}/issues/${issue.id}`);
    },
    onError: (error) => {
      setSaveError(errorMessage(error));
      setFieldErrors(error instanceof ApiError ? error.fieldErrors : {});
    },
  });

  const members = membersQuery.data ?? [];
  const sprints = sprintsQuery.data ?? [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setFieldErrors({});

    createMutation.mutate({
      title,
      type,
      priority,
      status,
      ...(description ? { description } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(sprintId ? { sprintId } : {}),
      ...(dueDate ? { dueDate } : {}),
    });
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Workspaces', to: '/app/workspaces' },
          { label: 'Projects', to: `/app/workspaces/${workspaceId}/projects` },
          { label: 'Project', to: `/app/workspaces/${workspaceId}/projects/${projectId}` },
          { label: 'New issue' },
        ]}
      />

      <PageHeader
        title="New issue"
        description="The issue belongs to the project in the address bar, so there is no project to pick here."
      />

      <p>
        <Link to={`/app/workspaces/${workspaceId}/projects/${projectId}`}>Back to the project</Link>
      </p>

      {(membersQuery.isPending || sprintsQuery.isPending) && (
        <LoadingState label="Loading form…" />
      )}

      {membersQuery.isError && (
        <ErrorState error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      )}

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

        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating…' : 'Create issue'}
        </button>
      </form>
    </>
  );
}
