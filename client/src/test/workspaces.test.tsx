import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };

const WORKSPACE = {
  id: 'w1',
  name: 'Acme Team',
  slug: 'acme-team',
  role: 'OWNER',
  memberCount: 2,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  owner: USER,
};

const OWNER_MEMBER = {
  id: 'm1',
  userId: USER.id,
  name: USER.name,
  email: USER.email,
  role: 'OWNER',
  joinedAt: '2026-07-01T00:00:00.000Z',
};

const PLAIN_MEMBER = {
  id: 'm2',
  userId: 'u2',
  name: 'Kerem Demir',
  email: 'kerem@devflow.local',
  role: 'MEMBER',
  joinedAt: '2026-07-02T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const ok = (data: unknown) => () => jsonResponse({ success: true, data });

const failure = (code: string, status: number) => () =>
  jsonResponse({ success: false, error: { code, message: `Request failed: ${code}` } }, status);

type Handler = () => Response | Promise<Response>;

/**
 * Mocks the API boundary only, keyed by method and path, so the tests say
 * nothing about how the components fetch internally.
 */
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

const authenticated = ok({ user: USER });

/** An empty but well-formed dashboard, for the routes that redirect onto it. */
function dashboard(role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  return ok({
    dashboard: {
      workspace: {
        ...WORKSPACE,
        role,
        activeProjectCount: 0,
        archivedProjectCount: 0,
      },
      issueMetrics: { openIssues: 0, assignedToMe: 0, overdueIssues: 0, unassignedIssues: 0 },
      statusDistribution: { BACKLOG: 0, TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
      priorityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      recentIssues: [],
      recentActivity: [],
      generatedAt: '2026-07-26T12:00:00.000Z',
    },
  });
}

/** Handlers for one workspace seen with the given role. */
function workspaceHandlers(role: 'OWNER' | 'ADMIN' | 'MEMBER'): Record<string, Handler> {
  return {
    'GET /api/auth/me': authenticated,
    'GET /api/workspaces': ok({ workspaces: [{ ...WORKSPACE, role }] }),
    'GET /api/workspaces/w1': ok({ workspace: { ...WORKSPACE, role } }),
    'GET /api/workspaces/w1/members': ok({ members: [OWNER_MEMBER, PLAIN_MEMBER] }),
    'GET /api/workspaces/w1/dashboard': dashboard(role),
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

describe('workspace list page', () => {
  it('shows a loading state while the workspaces are being fetched', async () => {
    mockApi({
      'GET /api/auth/me': authenticated,
      'GET /api/workspaces': () => new Promise<Response>(() => undefined),
    });
    renderApp('/app/workspaces');

    // The shell switcher and the page both wait on the same request.
    expect((await screen.findAllByText('Loading workspaces…')).length).toBeGreaterThan(0);
  });

  it('shows an empty state when the user belongs to no workspace', async () => {
    mockApi({
      'GET /api/auth/me': authenticated,
      'GET /api/workspaces': ok({ workspaces: [] }),
    });
    renderApp('/app/workspaces');

    expect(await screen.findByText(/do not belong to any workspace/i)).toBeInTheDocument();
  });

  it('shows an API error state', async () => {
    mockApi({
      'GET /api/auth/me': authenticated,
      'GET /api/workspaces': failure('INTERNAL_ERROR', 500),
    });
    renderApp('/app/workspaces');

    expect(await screen.findByRole('alert')).toHaveTextContent('INTERNAL_ERROR');
  });

  it('lists each workspace with its role and member count', async () => {
    mockApi({
      'GET /api/auth/me': authenticated,
      'GET /api/workspaces': ok({ workspaces: [WORKSPACE] }),
    });
    renderApp('/app/workspaces');

    const item = await screen.findByRole('listitem');

    expect(within(item).getByRole('link', { name: 'Acme Team' })).toHaveAttribute(
      'href',
      '/app/workspaces/w1/dashboard',
    );
    expect(item).toHaveTextContent('OWNER');
    expect(item).toHaveTextContent('2 members');
  });

  it('creates a workspace and opens its overview', async () => {
    mockApi({
      ...workspaceHandlers('OWNER'),
      'GET /api/workspaces': ok({ workspaces: [] }),
      'POST /api/workspaces': ok({ workspace: WORKSPACE }),
    });
    renderApp('/app/workspaces');

    await userEvent.type(await screen.findByLabelText('Workspace name'), 'Acme Team');
    await userEvent.click(screen.getByRole('button', { name: 'Create workspace' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Acme Team' }),
    ).toBeInTheDocument();
  });
});

describe('workspace settings page', () => {
  it('renders the workspace and its owner', async () => {
    mockApi(workspaceHandlers('OWNER'));
    renderApp('/app/workspaces/w1/settings');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Acme Team' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Slug: acme-team')).toBeInTheDocument();
    expect(screen.getByText('Your role: OWNER')).toBeInTheDocument();
    expect(screen.getByText(`Owner: ${USER.name} (${USER.email})`)).toBeInTheDocument();
  });

  it('hides management controls from a plain member', async () => {
    mockApi(workspaceHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/settings');

    await screen.findByRole('heading', { level: 1, name: 'Acme Team' });

    expect(screen.queryByRole('button', { name: 'Save name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete workspace' })).not.toBeInTheDocument();
  });

  it('lets an admin rename but not delete the workspace', async () => {
    mockApi(workspaceHandlers('ADMIN'));
    renderApp('/app/workspaces/w1/settings');

    await screen.findByRole('heading', { level: 1, name: 'Acme Team' });

    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete workspace' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting the workspace', async () => {
    const fetchMock = mockApi({
      ...workspaceHandlers('OWNER'),
      'DELETE /api/workspaces/w1': ok({ deleted: true }),
    });
    renderApp('/app/workspaces/w1/settings');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete workspace' }));

    expect(screen.getByRole('alert')).toHaveTextContent('cannot be undone');
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
      ),
    ).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Workspaces' })).toBeInTheDocument();
    });
  });
});

describe('workspace members page', () => {
  it('renders the members of the workspace', async () => {
    mockApi(workspaceHandlers('OWNER'));
    renderApp('/app/workspaces/w1/members');

    expect(await screen.findByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument();
    expect(screen.getByText(/Kerem Demir \(kerem@devflow\.local\)/)).toBeInTheDocument();
  });

  it('hides member management from a plain member', async () => {
    mockApi(workspaceHandlers('MEMBER'));
    renderApp('/app/workspaces/w1/members');

    await screen.findByRole('heading', { level: 1, name: 'Members' });

    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Only an owner or an admin can add or remove/i)).toBeInTheDocument();
  });

  it('offers an admin only the MEMBER role', async () => {
    mockApi(workspaceHandlers('ADMIN'));
    renderApp('/app/workspaces/w1/members');

    await screen.findByRole('heading', { level: 1, name: 'Members' });

    expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Member role')).queryByRole('option', { name: 'ADMIN' }),
    ).not.toBeInTheDocument();
  });

  it('adds a member and shows the refreshed list', async () => {
    let members = [OWNER_MEMBER, PLAIN_MEMBER];
    const created = {
      id: 'm3',
      userId: 'u3',
      name: 'Selin Kaya',
      email: 'selin@devflow.local',
      role: 'MEMBER',
      joinedAt: '2026-07-03T00:00:00.000Z',
    };

    mockApi({
      ...workspaceHandlers('OWNER'),
      'GET /api/workspaces/w1/members': () =>
        jsonResponse({ success: true, data: { members } }),
      'POST /api/workspaces/w1/members': () => {
        members = [...members, created];

        return jsonResponse({ success: true, data: { member: created } });
      },
    });
    renderApp('/app/workspaces/w1/members');

    await userEvent.type(await screen.findByLabelText('Member email'), 'selin@devflow.local');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText(/Selin Kaya \(selin@devflow\.local\)/)).toBeInTheDocument();
  });

  it('shows the server error when the email belongs to no account', async () => {
    mockApi({
      ...workspaceHandlers('OWNER'),
      'POST /api/workspaces/w1/members': failure('USER_NOT_FOUND', 404),
    });
    renderApp('/app/workspaces/w1/members');

    await userEvent.type(await screen.findByLabelText('Member email'), 'nobody@devflow.local');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('USER_NOT_FOUND');
  });
});
