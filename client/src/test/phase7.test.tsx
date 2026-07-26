import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

/**
 * Phase 7: the authenticated shell, the workspace dashboard and the shared
 * loading, empty and error states.
 *
 * Only the API boundary is mocked. Nothing here asserts how TanStack Query
 * works internally — only what the user ends up seeing.
 */

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };
const OTHER = { id: 'u2', name: 'Kerem Demir', email: 'kerem@devflow.local' };

const WORKSPACE_ONE = {
  id: 'w1',
  name: 'Acme Team',
  slug: 'acme-team',
  role: 'OWNER',
  memberCount: 3,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const WORKSPACE_TWO = { ...WORKSPACE_ONE, id: 'w2', name: 'Side Project', slug: 'side-project' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Handler = () => Response | Promise<Response>;

const ok = (data: unknown): Handler => () => jsonResponse({ success: true, data });

const failure = (code: string, status: number): Handler => () =>
  jsonResponse({ success: false, error: { code, message: `Request failed: ${code}` } }, status);

function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const handler = handlers[key];

    return Promise.resolve(handler ? handler() : failure('NOT_FOUND', 404)());
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

interface DashboardOverrides {
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  activeProjectCount?: number;
  openIssues?: number;
  assignedToMe?: number;
  overdueIssues?: number;
  statusDistribution?: Record<string, number>;
  recentIssues?: unknown[];
  recentActivity?: unknown[];
}

function dashboardBody(overrides: DashboardOverrides = {}) {
  return {
    dashboard: {
      workspace: {
        id: 'w1',
        name: 'Acme Team',
        slug: 'acme-team',
        role: overrides.role ?? 'OWNER',
        memberCount: 3,
        activeProjectCount: overrides.activeProjectCount ?? 2,
        archivedProjectCount: 1,
      },
      issueMetrics: {
        openIssues: overrides.openIssues ?? 7,
        assignedToMe: overrides.assignedToMe ?? 2,
        overdueIssues: overrides.overdueIssues ?? 1,
        unassignedIssues: 3,
      },
      statusDistribution: overrides.statusDistribution ?? {
        BACKLOG: 4,
        TODO: 2,
        IN_PROGRESS: 1,
        IN_REVIEW: 0,
        DONE: 5,
      },
      priorityDistribution: { LOW: 1, MEDIUM: 6, HIGH: 4, URGENT: 1 },
      recentIssues: overrides.recentIssues ?? [
        {
          id: 'i1',
          number: 5,
          displayKey: 'API-5',
          title: 'Login screen flickers',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          updatedAt: '2026-07-25T08:00:00.000Z',
          project: { id: 'p1', name: 'Orbit API', key: 'API' },
          assignee: OTHER,
        },
      ],
      recentActivity: overrides.recentActivity ?? [
        {
          id: 'a1',
          type: 'ISSUE_CREATED',
          createdAt: '2026-07-25T08:00:00.000Z',
          actor: USER,
          project: { id: 'p1', name: 'Orbit API', key: 'API' },
          issue: { id: 'i1', number: 5, displayKey: 'API-5', title: 'Login screen flickers' },
          metadata: {},
        },
      ],
      generatedAt: '2026-07-26T12:00:00.000Z',
    },
  };
}

function baseHandlers(overrides: DashboardOverrides = {}): Record<string, Handler> {
  return {
    'GET /api/auth/me': ok({ user: USER }),
    'GET /api/workspaces': ok({
      workspaces: [
        { ...WORKSPACE_ONE, role: overrides.role ?? 'OWNER' },
        { ...WORKSPACE_TWO, role: overrides.role ?? 'OWNER' },
      ],
    }),
    'GET /api/workspaces/w1/dashboard': ok(dashboardBody(overrides)),
    'GET /api/workspaces/w2/dashboard': ok(dashboardBody(overrides)),
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

describe('authenticated application shell', () => {
  it('renders the brand, the workspace navigation and the current user', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    expect(await screen.findByRole('link', { name: 'DevFlow' })).toBeInTheDocument();
    expect(screen.getByText(USER.name)).toBeInTheDocument();
    expect(screen.getByText(USER.email)).toBeInTheDocument();

    const nav = await screen.findByRole('navigation', { name: 'Workspace navigation' });

    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/app/workspaces/w1/dashboard',
    );
    expect(within(nav).getByRole('link', { name: 'Projects' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Members' })).toBeInTheDocument();
  });

  it('exposes one main landmark and one page heading', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    await screen.findByRole('heading', { level: 1, name: 'Acme Team' });

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('signs the user out from the shell', async () => {
    mockApi({
      ...baseHandlers(),
      'POST /api/auth/logout': ok({ loggedOut: true }),
    });
    renderApp('/app/workspaces/w1/dashboard');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
  });

  it('opens and closes the navigation with a keyboard-reachable menu button', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    const toggle = await screen.findByRole('button', { name: 'Menu' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'app-shell-navigation');

    await userEvent.click(toggle);

    const openToggle = screen.getByRole('button', { name: 'Close menu' });

    expect(openToggle).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(openToggle);

    // Closing hands focus back to the control that opened the panel.
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });

  it('fetches the workspace list once for the shell and the page together', async () => {
    const fetchMock = mockApi({
      ...baseHandlers(),
      'GET /api/workspaces': ok({ workspaces: [WORKSPACE_ONE, WORKSPACE_TWO] }),
    });
    renderApp('/app/workspaces');

    await screen.findByRole('heading', { level: 1, name: 'Workspaces' });

    await waitFor(() => {
      expect(screen.getByLabelText('Current workspace')).toBeInTheDocument();
    });

    const listCalls = fetchMock.mock.calls.filter(([input]) =>
      String(input).endsWith('/api/workspaces'),
    );

    expect(listCalls).toHaveLength(1);
  });
});

describe('workspace switcher', () => {
  it('shows a loading state while the workspaces are being fetched', async () => {
    mockApi({
      'GET /api/auth/me': ok({ user: USER }),
      'GET /api/workspaces': () => new Promise<Response>(() => undefined),
    });
    renderApp('/app/workspaces/w1/dashboard');

    expect((await screen.findAllByText('Loading workspaces…')).length).toBeGreaterThan(0);
  });

  it('lists only the workspaces the user belongs to and marks the current one', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    const switcher = (await screen.findByLabelText('Current workspace')) as HTMLSelectElement;

    expect(switcher.value).toBe('w1');
    expect(within(switcher).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Acme Team',
      'Side Project',
    ]);
  });

  it('opens the overview of the selected workspace', async () => {
    mockApi({
      ...baseHandlers(),
      'GET /api/workspaces/w2/dashboard': ok({
        dashboard: {
          ...dashboardBody().dashboard,
          workspace: { ...dashboardBody().dashboard.workspace, id: 'w2', name: 'Side Project' },
        },
      }),
    });
    renderApp('/app/workspaces/w1/dashboard');

    await userEvent.selectOptions(await screen.findByLabelText('Current workspace'), 'w2');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Side Project' }),
    ).toBeInTheDocument();
  });

  it('offers a way forward when the user has no workspace at all', async () => {
    mockApi({
      'GET /api/auth/me': ok({ user: USER }),
      'GET /api/workspaces': ok({ workspaces: [] }),
    });
    renderApp('/app/workspaces');

    expect(await screen.findByText(/no workspace yet/i)).toBeInTheDocument();
  });
});

describe('workspace dashboard', () => {
  it('shows a loading state while the overview is being fetched', async () => {
    mockApi({
      ...baseHandlers(),
      'GET /api/workspaces/w1/dashboard': () => new Promise<Response>(() => undefined),
    });
    renderApp('/app/workspaces/w1/dashboard');

    expect(await screen.findByText('Loading the workspace overview…')).toBeInTheDocument();
  });

  it('shows an error state with a retry action', async () => {
    mockApi({
      ...baseHandlers(),
      'GET /api/workspaces/w1/dashboard': failure('INTERNAL_ERROR', 500),
    });
    renderApp('/app/workspaces/w1/dashboard');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Something went wrong');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('renders the summary metrics with their labels', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    const summary = (await screen.findByRole('heading', { name: 'At a glance' })).closest(
      'section',
    ) as HTMLElement;

    for (const [label, value] of [
      ['Active projects', '2'],
      ['Open issues', '7'],
      ['Assigned to me', '2'],
      ['Overdue issues', '1'],
      ['Members', '3'],
    ] as const) {
      const card = within(summary).getByText(label).closest('li');

      expect(card).not.toBeNull();
      expect(card).toHaveTextContent(value);
    }
  });

  it('renders every status of the distribution, zeros included', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    const heading = await screen.findByRole('heading', { name: 'Issues by status' });
    const section = heading.closest('section');

    expect(section).not.toBeNull();

    for (const label of ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done']) {
      expect(within(section as HTMLElement).getByText(label)).toBeInTheDocument();
    }

    // In Review has no issue and is still shown as an explicit zero.
    const row = within(section as HTMLElement).getByText('In Review').closest('li');

    expect(row).toHaveTextContent('0');
  });

  it('links a recent issue to its nested issue route', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    expect(
      await screen.findByRole('link', { name: 'API-5 Login screen flickers' }),
    ).toHaveAttribute('href', '/app/workspaces/w1/projects/p1/issues/i1');
  });

  it('renders a readable sentence for a recent activity row', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/dashboard');

    expect(await screen.findByText(/Ada Yilmaz created API-5/)).toBeInTheDocument();
  });

  it('explains the empty workspace instead of showing sample data', async () => {
    mockApi(
      baseHandlers({
        activeProjectCount: 0,
        openIssues: 0,
        assignedToMe: 0,
        overdueIssues: 0,
        statusDistribution: { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
        recentIssues: [],
        recentActivity: [],
      }),
    );
    renderApp('/app/workspaces/w1/dashboard');

    // The seeded fixture still reports one archived project, so the empty state
    // that matters here is the issue one.
    expect(await screen.findByText('No issue yet')).toBeInTheDocument();
    expect(screen.getByText('Nothing has happened yet')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is assigned to you right now/)).toBeInTheDocument();
    expect(screen.getByText(/No issue is overdue/)).toBeInTheDocument();
  });

  it('offers project creation to an owner', async () => {
    mockApi(baseHandlers({ role: 'OWNER' }));
    renderApp('/app/workspaces/w1/dashboard');

    expect(await screen.findByRole('link', { name: 'Create a project' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Choose a project to create an issue' }),
    ).toBeInTheDocument();
  });

  it('hides project creation from a plain member', async () => {
    mockApi(baseHandlers({ role: 'MEMBER' }));
    renderApp('/app/workspaces/w1/dashboard');

    await screen.findByRole('heading', { level: 1, name: 'Acme Team' });

    expect(screen.queryByRole('link', { name: 'Create a project' })).not.toBeInTheDocument();
    // The workspace navigation follows the same rule.
    const nav = screen.getByRole('navigation', { name: 'Workspace navigation' });

    expect(within(nav).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });
});

describe('error routes', () => {
  it('explains a forbidden workspace instead of showing an empty page', async () => {
    mockApi({
      ...baseHandlers(),
      'GET /api/workspaces/w1/dashboard': failure('FORBIDDEN', 403),
    });
    renderApp('/app/workspaces/w1/dashboard');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('You do not have permission');
    expect(within(alert).getByRole('link', { name: 'Back to workspaces' })).toBeInTheDocument();
    // A 403 will not change by asking again, so no retry is offered.
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows a not-found page for an unknown address inside the application', async () => {
    mockApi(baseHandlers());
    renderApp('/app/this-route-does-not-exist');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your workspaces' })).toBeInTheDocument();
  });
});

describe('mutation invalidation', () => {
  it('re-reads the member list after a member is added', async () => {
    let members = [
      {
        id: 'm1',
        userId: USER.id,
        name: USER.name,
        email: USER.email,
        role: 'OWNER',
        joinedAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    const fetchMock = mockApi({
      ...baseHandlers(),
      'GET /api/workspaces/w1': ok({ workspace: { ...WORKSPACE_ONE, owner: USER } }),
      'GET /api/workspaces/w1/members': () =>
        jsonResponse({ success: true, data: { members } }),
      'POST /api/workspaces/w1/members': () => {
        members = [
          ...members,
          {
            id: 'm2',
            userId: OTHER.id,
            name: OTHER.name,
            email: OTHER.email,
            role: 'MEMBER',
            joinedAt: '2026-07-05T00:00:00.000Z',
          },
        ];

        return jsonResponse({ success: true, data: { member: members[1] } });
      },
    });
    renderApp('/app/workspaces/w1/members');

    await userEvent.type(await screen.findByLabelText('Member email'), OTHER.email);
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText(/Kerem Demir \(kerem@devflow\.local\)/)).toBeInTheDocument();

    const memberCalls = fetchMock.mock.calls.filter(
      ([input, init]) =>
        String(input).endsWith('/members') && (init as RequestInit | undefined)?.method !== 'POST',
    );

    expect(memberCalls.length).toBeGreaterThan(1);
  });
});
