import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from '../components/PageHeader';
import { PRIORITY_LABELS, PriorityBadge, StatusBadge } from '../components/badges';
import { EmptyState, ErrorState, LoadingState, RefreshingHint } from '../components/states';
import { activityText } from '../lib/activityText';
import { getWorkspaceDashboard } from '../lib/dashboardApi';
import type { WorkspaceDashboard } from '../lib/dashboardApi';
import type { IssuePriority, IssueStatus } from '../lib/projectApi';
import { ISSUE_PRIORITIES, ISSUE_STATUSES, STATUS_LABELS, canManageProjects } from '../lib/projectApi';
import { queryKeys } from '../lib/queryKeys';
import { ROLE_LABELS } from '../lib/workspaceApi';

/**
 * The workspace overview.
 *
 * One query, one endpoint: every number on this page comes from the same
 * aggregation, so the counts always describe the same moment instead of six
 * responses that arrived at six different times.
 */

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

/**
 * A labelled count. It links somewhere only when there is a page that really
 * shows the same thing; a card that leads nowhere useful stays plain text.
 */
function SummaryCard({ label, value, to }: { label: string; value: number; to?: string }) {
  return (
    <li className="card">
      <p className="card__label">{label}</p>
      <p className="card__value">{value}</p>
      {to && (
        <Link className="card__link" to={to}>
          View
        </Link>
      )}
    </li>
  );
}

/**
 * A distribution as plain rows with a CSS bar.
 *
 * The bar is `aria-hidden`: the number next to it already carries the
 * information, so a screen reader is not read a decorative element, and the
 * page stays readable with no colour at all. Five counts do not justify a
 * charting library.
 */
function Distribution({
  heading,
  rows,
}: {
  heading: string;
  rows: { key: string; label: string; value: number }[];
}) {
  const largest = Math.max(...rows.map((row) => row.value), 1);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section
      className="panel"
      aria-labelledby={`distribution-${heading.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="panel__header">
        <h2 id={`distribution-${heading.replace(/\s+/g, '-').toLowerCase()}`}>{heading}</h2>
        <span className="faint">{total} issues</span>
      </div>

      {total === 0 ? (
        <p className="muted">No issue to summarise yet.</p>
      ) : (
        <ul className="distribution">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="distribution__label">{row.label}</span>
              <span className="distribution__bar" aria-hidden="true">
                <span style={{ width: `${(row.value / largest) * 100}%` }} />
              </span>
              <span className="distribution__value">{row.value}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentIssues({
  dashboard,
  workspaceId,
}: {
  dashboard: WorkspaceDashboard;
  workspaceId: string;
}) {
  if (dashboard.recentIssues.length === 0) {
    return (
      <section className="panel" aria-labelledby="recent-issues-heading">
        <div className="panel__header">
          <h2 id="recent-issues-heading">Recent issues</h2>
        </div>
        <EmptyState
          title="No issue yet"
          description="Open a project and create the first issue to see activity here."
          action={
            <Link className="btn-link" to={`/app/workspaces/${workspaceId}/projects`}>
              Go to projects
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="recent-issues-heading">
      <div className="panel__header">
        <h2 id="recent-issues-heading">Recent issues</h2>
        <Link className="faint" to={`/app/workspaces/${workspaceId}/projects`}>
          All projects
        </Link>
      </div>

      <ul className="record-list">
        {dashboard.recentIssues.map((issue) => (
          <li key={issue.id}>
            <Link
              className="record__title"
              to={`/app/workspaces/${workspaceId}/projects/${issue.project.id}/issues/${issue.id}`}
            >
              <span className="issue-key">{issue.displayKey}</span>
              {issue.title}
            </Link>

            <p className="record__meta">
              <span>
                {issue.project.key} — {issue.project.name}
              </span>
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              <span>{issue.assignee ? issue.assignee.name : 'Unassigned'}</span>
              <time dateTime={issue.updatedAt}>Updated {formatDateTime(issue.updatedAt)}</time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DashboardPage() {
  const { workspaceId = '' } = useParams();

  const dashboardQuery = useQuery({
    queryKey: queryKeys.workspaceDashboard(workspaceId),
    queryFn: ({ signal }) => getWorkspaceDashboard(workspaceId, signal),
  });

  if (dashboardQuery.isPending) {
    return <LoadingState label="Loading the workspace overview…" />;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />
    );
  }

  const dashboard = dashboardQuery.data;
  const { workspace, issueMetrics } = dashboard;
  const base = `/app/workspaces/${workspace.id}`;
  const projectCount = workspace.activeProjectCount + workspace.archivedProjectCount;
  const canManage = canManageProjects(workspace.role);

  return (
    <>
      <Breadcrumbs
        items={[{ label: 'Workspaces', to: '/app/workspaces' }, { label: workspace.name }]}
      />

      <PageHeader
        title={workspace.name}
        description={`Overview of the whole workspace. Your role here is ${ROLE_LABELS[workspace.role]}.`}
        actions={
          <>
            {canManage && (
              <Link className="btn-link" to={`${base}/projects`}>
                Create a project
              </Link>
            )}
            {projectCount > 0 && (
              <Link className="btn-link btn-link--secondary" to={`${base}/projects`}>
                Open a project
              </Link>
            )}
          </>
        }
      />

      <RefreshingHint isRefreshing={dashboardQuery.isFetching} />

      {projectCount === 0 ? (
        <EmptyState
          title="This workspace has no project yet"
          description={
            canManage
              ? 'A project holds the sprints and issues of one piece of work. Create the first one to get started.'
              : 'An owner or an admin has to create the first project before there is anything to see here.'
          }
          action={
            <Link className="btn-link" to={`${base}/projects`}>
              Go to projects
            </Link>
          }
        />
      ) : null}

      <section className="stack" aria-labelledby="summary-heading">
        <h2 id="summary-heading">At a glance</h2>

        <ul className="cards">
          <SummaryCard
            label="Active projects"
            value={workspace.activeProjectCount}
            to={`${base}/projects`}
          />
          <SummaryCard label="Open issues" value={issueMetrics.openIssues} />
          <SummaryCard label="Assigned to me" value={issueMetrics.assignedToMe} />
          <SummaryCard label="Overdue issues" value={issueMetrics.overdueIssues} />
          <SummaryCard label="Members" value={workspace.memberCount} to={`${base}/members`} />
        </ul>

        <p className="muted">
          {issueMetrics.assignedToMe === 0
            ? 'Nothing is assigned to you right now.'
            : `You have ${issueMetrics.assignedToMe} open issue(s) assigned to you.`}{' '}
          {issueMetrics.overdueIssues === 0
            ? 'No issue is overdue.'
            : `${issueMetrics.overdueIssues} issue(s) passed their due date.`}{' '}
          {issueMetrics.unassignedIssues > 0 &&
            `${issueMetrics.unassignedIssues} open issue(s) have no assignee.`}
        </p>

        {/* An issue is overdue when the server, not the browser, says so. */}
        <p className="faint">
          Overdue is measured against the server time{' '}
          <time dateTime={dashboard.generatedAt}>{formatDateTime(dashboard.generatedAt)}</time>.
        </p>
      </section>

      <Distribution
        heading="Issues by status"
        rows={ISSUE_STATUSES.map((status: IssueStatus) => ({
          key: status,
          label: STATUS_LABELS[status],
          value: dashboard.statusDistribution[status],
        }))}
      />

      <Distribution
        heading="Issues by priority"
        rows={ISSUE_PRIORITIES.map((priority: IssuePriority) => ({
          key: priority,
          label: PRIORITY_LABELS[priority],
          value: dashboard.priorityDistribution[priority],
        }))}
      />

      <RecentIssues dashboard={dashboard} workspaceId={workspace.id} />

      <section className="panel" aria-labelledby="recent-activity-heading">
        <div className="panel__header">
          <h2 id="recent-activity-heading">Recent activity</h2>
        </div>

        {dashboard.recentActivity.length === 0 ? (
          <EmptyState
            title="Nothing has happened yet"
            description="Creating projects, issues and comments will show up here."
          />
        ) : (
          <ul className="activity">
            {dashboard.recentActivity.map((activity) => (
              <li key={activity.id}>
                {/* The sentence is built in the client from structured fields;
                    the database never stores a formatted line. */}
                <span>{activityText(activity)}</span>
                <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
