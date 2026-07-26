import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };
const OTHER = { id: 'u2', name: 'Kerem Demir', email: 'kerem@devflow.local' };

const MEMBERS = [
  { id: 'm1', userId: USER.id, name: USER.name, email: USER.email, role: 'OWNER', joinedAt: '' },
  { id: 'm2', userId: OTHER.id, name: OTHER.name, email: OTHER.email, role: 'MEMBER', joinedAt: '' },
];

function workspace(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  return {
    id: 'w1',
    name: 'Acme Team',
    slug: 'acme-team',
    role,
    memberCount: 2,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    owner: USER,
  };
}

const PROJECT = {
  id: 'p1',
  name: 'Orbit API',
  key: 'API',
  description: 'Backend service.',
  status: 'ACTIVE',
  issueCount: 3,
  openIssueCount: 2,
  role: 'OWNER',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const SPRINT = {
  id: 's1',
  name: 'API Sprint 1',
  goal: 'Ship endpoints.',
  status: 'ACTIVE',
  startDate: null,
  endDate: null,
  issueCount: 2,
};

function projectDetail(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  return {
    ...PROJECT,
    role,
    createdBy: USER,
    issueCountsByStatus: { BACKLOG: 1, TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 0, DONE: 1 },
    sprints: [SPRINT],
  };
}

const ISSUE = {
  id: 'i1',
  number: 1,
  displayKey: 'API-1',
  title: 'Login screen flickers',
  type: 'BUG',
  status: 'TODO',
  priority: 'HIGH',
  reporter: USER,
  assignee: OTHER,
  sprint: { id: SPRINT.id, name: SPRINT.name, status: 'ACTIVE' },
  dueDate: null,
  updatedAt: '2026-07-02T00:00:00.000Z',
};

function issueList(issues: unknown[] = [ISSUE]) {
  return {
    issues,
    pagination: {
      page: 1,
      limit: 20,
      total: issues.length,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    filters: {},
  };
}

function issueDetail(permissions: { canUpdate: boolean; canDelete: boolean }) {
  return {
    ...ISSUE,
    description: 'Only on Safari.',
    project: { id: PROJECT.id, name: PROJECT.name, key: PROJECT.key, status: 'ACTIVE' },
    permissions,
    createdAt: '2026-07-01T00:00:00.000Z',
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>;

const ok =
  (data: unknown): Handler =>
  () =>
    jsonResponse({ success: true, data });

const failure =
  (code: string, status: number): Handler =>
  () =>
    jsonResponse({ success: false, error: { code, message: `Request failed: ${code}` } }, status);

/** Mocks the API boundary only, keyed by method and path. */
function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const handler = handlers[key];

    return Promise.resolve(
      handler ? handler(url, init) : failure('NOT_FOUND', 404)(url, init),
    );
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

const authenticated = ok({ user: USER });

const PROJECTS_PATH = '/api/workspaces/w1/projects';
const PROJECT_PATH = `${PROJECTS_PATH}/p1`;

function baseHandlers(role: 'OWNER' | 'ADMIN' | 'MEMBER'): Record<string, Handler> {
  return {
    'GET /api/auth/me': authenticated,
    'GET /api/workspaces/w1': ok({ workspace: workspace(role) }),
    'GET /api/workspaces/w1/members': ok({ members: MEMBERS }),
    [`GET ${PROJECTS_PATH}`]: ok({ projects: [PROJECT] }),
    [`GET ${PROJECT_PATH}`]: ok({ project: projectDetail(role) }),
    [`GET ${PROJECT_PATH}/sprints`]: ok({ sprints: [SPRINT] }),
    [`GET ${PROJECT_PATH}/issues`]: ok(issueList()),
  };
}

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('project list page', () => {
  it('shows a loading state while the projects are being fetched', async () => {
    mockApi({
      ...baseHandlers('OWNER'),
      [`GET ${PROJECTS_PATH}`]: () => new Promise<Response>(() => undefined),
    });
    renderApp('/app/workspaces/w1/projects');

    expect(await screen.findByText('Loading projects…')).toBeInTheDocument();
  });

  it('shows an empty state when the workspace has no project', async () => {
    mockApi({ ...baseHandlers('OWNER'), [`GET ${PROJECTS_PATH}`]: ok({ projects: [] }) });
    renderApp('/app/workspaces/w1/projects');

    expect(await screen.findByText(/no project matches/i)).toBeInTheDocument();
  });

  it('shows an API error state', async () => {
    mockApi({ ...baseHandlers('OWNER'), [`GET ${PROJECTS_PATH}`]: failure('FORBIDDEN', 403) });
    renderApp('/app/workspaces/w1/projects');

    expect(await screen.findByRole('alert')).toHaveTextContent('FORBIDDEN');
  });

  it('lists each project with its key and issue counts', async () => {
    mockApi(baseHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/projects');

    expect(await screen.findByRole('link', { name: /API — Orbit API/ })).toBeInTheDocument();
    expect(screen.getByText(/2 open of 3 issues/)).toBeInTheDocument();
  });

  it('hides the create form from a MEMBER', async () => {
    mockApi(baseHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/projects');

    await screen.findByRole('link', { name: /Orbit API/ });

    expect(screen.queryByRole('button', { name: /create project/i })).not.toBeInTheDocument();
  });

  it('shows the create form to an ADMIN and sends the typed values', async () => {
    const fetchMock = mockApi({
      ...baseHandlers('ADMIN'),
      [`POST ${PROJECTS_PATH}`]: ok({ project: PROJECT }),
    });
    renderApp('/app/workspaces/w1/projects');

    await userEvent.type(await screen.findByLabelText('Project name'), 'Orbit Web');
    await userEvent.type(screen.getByLabelText('Project key'), 'web');
    await userEvent.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');

      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ name: 'Orbit Web', key: 'WEB' });
    });
  });

  it('reports an API error from the create form', async () => {
    mockApi({
      ...baseHandlers('OWNER'),
      [`POST ${PROJECTS_PATH}`]: failure('PROJECT_KEY_IN_USE', 409),
    });
    renderApp('/app/workspaces/w1/projects');

    await userEvent.type(await screen.findByLabelText('Project name'), 'Orbit Web');
    await userEvent.type(screen.getByLabelText('Project key'), 'API');
    await userEvent.click(screen.getByRole('button', { name: /create project/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('PROJECT_KEY_IN_USE');
  });
});

describe('project detail page', () => {
  it('shows the project, its sprints and its issues', async () => {
    mockApi(baseHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/projects/p1');

    expect(await screen.findByRole('heading', { name: /API — Orbit API/ })).toBeInTheDocument();
    expect(screen.getByText(/API Sprint 1 — ACTIVE — 2 issues/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /API-1 Login screen flickers/ })).toBeInTheDocument();
  });

  it('hides the project settings from a MEMBER', async () => {
    mockApi(baseHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/projects/p1');

    await screen.findByRole('heading', { name: /Orbit API/ });

    expect(screen.queryByRole('button', { name: /delete project/i })).not.toBeInTheDocument();
  });

  it('asks for a confirmation before deleting the project', async () => {
    const fetchMock = mockApi({
      ...baseHandlers('OWNER'),
      [`DELETE ${PROJECT_PATH}`]: ok({ deleted: true }),
    });
    renderApp('/app/workspaces/w1/projects/p1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete project' }));

    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');

      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ confirm: true });
    });
  });

  it('sends a chosen status filter to the server', async () => {
    const fetchMock = mockApi(baseHandlers('OWNER'));
    renderApp('/app/workspaces/w1/projects/p1');

    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'IN_PROGRESS');

    await waitFor(() => {
      const called = fetchMock.mock.calls.some(([input]) =>
        String(input).includes('/issues?status=IN_PROGRESS'),
      );

      expect(called).toBe(true);
    });
  });

  it('restores the filters from the URL query', async () => {
    const fetchMock = mockApi(baseHandlers('OWNER'));
    renderApp('/app/workspaces/w1/projects/p1?status=TODO&type=BUG&search=flicker');

    await screen.findByRole('heading', { name: /Orbit API/ });

    expect(await screen.findByLabelText('Search issues')).toHaveValue('flicker');
    expect(screen.getByLabelText('Status')).toHaveValue('TODO');
    expect(screen.getByLabelText('Type')).toHaveValue('BUG');
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = new URL(String(input));

        return (
          url.pathname.endsWith('/issues') &&
          url.searchParams.get('status') === 'TODO' &&
          url.searchParams.get('search') === 'flicker'
        );
      }),
    ).toBe(true);
  });
});

describe('issue creation page', () => {
  it('offers the workspace members as assignees and the project sprints', async () => {
    mockApi(baseHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/projects/p1/issues/new');

    // The options only appear once the member and sprint requests have landed.
    await screen.findByRole('option', { name: 'Kerem Demir' });

    const assignee = screen.getByLabelText('Assignee');
    const sprint = screen.getByLabelText('Sprint');

    expect(within(assignee).getByRole('option', { name: 'Kerem Demir' })).toBeInTheDocument();
    expect(within(sprint).getByRole('option', { name: 'API Sprint 1' })).toBeInTheDocument();
  });

  it('sends the form values and never a reporter id', async () => {
    const fetchMock = mockApi({
      ...baseHandlers('MEMBER'),
      [`POST ${PROJECT_PATH}/issues`]: ok({ issue: issueDetail({ canUpdate: true, canDelete: false }) }),
      [`GET ${PROJECT_PATH}/issues/i1`]: ok({
        issue: issueDetail({ canUpdate: true, canDelete: false }),
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Broken login');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'BUG');
    await userEvent.selectOptions(screen.getByLabelText('Assignee'), OTHER.id);
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      const body = JSON.parse(String(call?.[1]?.body));

      expect(body).toMatchObject({ title: 'Broken login', type: 'BUG', assigneeId: OTHER.id });
      expect(body.reporterId).toBeUndefined();
    });
  });

  it('reports an API error', async () => {
    mockApi({
      ...baseHandlers('MEMBER'),
      [`POST ${PROJECT_PATH}/issues`]: failure('INVALID_ASSIGNEE', 400),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Broken login');
    await userEvent.click(screen.getByRole('button', { name: /create issue/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('INVALID_ASSIGNEE');
  });
});

describe('issue detail page', () => {
  it('renders the issue with its display key and fields', async () => {
    mockApi({
      ...baseHandlers('MEMBER'),
      [`GET ${PROJECT_PATH}/issues/i1`]: ok({
        issue: issueDetail({ canUpdate: false, canDelete: false }),
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    expect(
      await screen.findByRole('heading', { name: /API-1 Login screen flickers/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('Only on Safari.')).toBeInTheDocument();
    expect(screen.getByText('Kerem Demir')).toBeInTheDocument();
  });

  it('hides the edit and delete controls when the server says so', async () => {
    mockApi({
      ...baseHandlers('MEMBER'),
      [`GET ${PROJECT_PATH}/issues/i1`]: ok({
        issue: issueDetail({ canUpdate: false, canDelete: false }),
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    expect(await screen.findByText(/only edit issues you reported/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit issue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete issue' })).not.toBeInTheDocument();
  });

  it('shows the edit form and saves the changed status', async () => {
    const fetchMock = mockApi({
      ...baseHandlers('OWNER'),
      [`GET ${PROJECT_PATH}/issues/i1`]: ok({
        issue: issueDetail({ canUpdate: true, canDelete: true }),
      }),
      [`PATCH ${PROJECT_PATH}/issues/i1`]: ok({
        issue: { ...issueDetail({ canUpdate: true, canDelete: true }), status: 'DONE' },
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit issue' }));
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'DONE');
    await userEvent.click(screen.getByRole('button', { name: 'Save issue' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');

      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ status: 'DONE' });
    });
  });

  it('asks for a confirmation before deleting the issue', async () => {
    const fetchMock = mockApi({
      ...baseHandlers('OWNER'),
      [`GET ${PROJECT_PATH}/issues/i1`]: ok({
        issue: issueDetail({ canUpdate: true, canDelete: true }),
      }),
      [`DELETE ${PROJECT_PATH}/issues/i1`]: ok({ deleted: true }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete issue' }));

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
    });
  });
});
