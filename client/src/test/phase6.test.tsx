import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };
const OTHER = { id: 'u2', name: 'Kerem Demir', email: 'kerem@devflow.local' };

const PROJECT_PATH = '/api/workspaces/w1/projects/p1';
const ISSUE_PATH = `${PROJECT_PATH}/issues/i1`;

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

    return Promise.resolve(handler ? handler(url, init) : failure('NOT_FOUND', 404)(url, init));
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function card(
  id: string,
  number: number,
  status: string,
  position: number,
  canMove: boolean,
  title = `Card ${number}`,
) {
  return {
    id,
    number,
    displayKey: `API-${number}`,
    title,
    type: 'TASK',
    priority: 'MEDIUM',
    status,
    position,
    assignee: canMove ? OTHER : null,
    reporter: USER,
    sprint: null,
    dueDate: null,
    permissions: { canMove, canEdit: canMove },
  };
}

const BOARD_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

function board(cards: ReturnType<typeof card>[]) {
  return {
    project: { id: 'p1', name: 'Orbit API', key: 'API', status: 'ACTIVE' },
    columns: BOARD_STATUSES.map((status) => ({
      status,
      issues: cards.filter((entry) => entry.status === status),
    })),
  };
}

function comment(
  id: string,
  body: string,
  author = USER,
  permissions = { canEdit: true, canDelete: true },
  isEdited = false,
) {
  return {
    id,
    body,
    createdAt: '2026-07-02T10:00:00.000Z',
    updatedAt: '2026-07-02T10:00:00.000Z',
    isEdited,
    author,
    permissions,
  };
}

function activity(id: string, type: string, metadata: Record<string, unknown> = {}) {
  return {
    id,
    type,
    createdAt: '2026-07-03T09:00:00.000Z',
    actor: USER,
    project: { id: 'p1', name: 'Orbit API', key: 'API' },
    issue: { id: 'i1', number: 1, displayKey: 'API-1', title: 'Login screen flickers' },
    metadata,
  };
}

function activityPage(activities: unknown[], hasNextPage = false, page = 1) {
  return {
    activities,
    pagination: {
      page,
      limit: 20,
      total: hasNextPage ? activities.length + 1 : activities.length,
      totalPages: hasNextPage ? page + 1 : page,
      hasPreviousPage: page > 1,
      hasNextPage,
    },
  };
}

const ISSUE_DETAIL = {
  id: 'i1',
  number: 1,
  displayKey: 'API-1',
  title: 'Login screen flickers',
  type: 'BUG',
  status: 'TODO',
  priority: 'HIGH',
  reporter: USER,
  assignee: OTHER,
  sprint: null,
  dueDate: null,
  updatedAt: '2026-07-02T00:00:00.000Z',
  description: 'Only on Safari.',
  project: { id: 'p1', name: 'Orbit API', key: 'API', status: 'ACTIVE' },
  permissions: { canUpdate: false, canDelete: false },
  createdAt: '2026-07-01T00:00:00.000Z',
};

function baseHandlers(): Record<string, Handler> {
  return {
    'GET /api/auth/me': ok({ user: USER }),
    'GET /api/workspaces/w1/members': ok({ members: [] }),
    [`GET ${PROJECT_PATH}/sprints`]: ok({ sprints: [] }),
    [`GET ${ISSUE_PATH}`]: ok({ issue: ISSUE_DETAIL }),
    [`GET ${ISSUE_PATH}/comments`]: ok({ comments: [] }),
    [`GET ${ISSUE_PATH}/activities`]: ok(activityPage([])),
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

describe('Kanban board page', () => {
  it('shows a loading state while the board is being fetched', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: () => new Promise<Response>(() => undefined),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    expect(await screen.findByText('Loading board…')).toBeInTheDocument();
  });

  it('renders the five columns and an empty state per column', async () => {
    mockApi({ ...baseHandlers(), [`GET ${PROJECT_PATH}/board`]: ok({ board: board([]) }) });
    renderApp('/app/workspaces/w1/projects/p1/board');

    for (const name of ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done']) {
      expect(await screen.findByRole('heading', { name: `${name} 0` })).toBeInTheDocument();
    }

    expect(screen.getAllByText('No issue in this column.')).toHaveLength(5);
  });

  it('renders the cards in their columns with a card summary', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: ok({
        board: board([card('i1', 1, 'TODO', 0, true), card('i2', 2, 'DONE', 0, false)]),
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    expect(await screen.findByRole('link', { name: 'API-1 Card 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API-2 Card 2' })).toBeInTheDocument();
    // Type, priority and assignee are three separate labels on the card.
    expect(screen.getAllByText('Task').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Priority: Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kerem Demir').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'To Do 1' })).toBeInTheDocument();
  });

  it('gives no drag handle and no move control to a card the server locked', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: ok({ board: board([card('i2', 2, 'DONE', 0, false)]) }),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    await screen.findByRole('link', { name: 'API-2 Card 2' });

    expect(screen.queryByRole('button', { name: 'Drag API-2' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Move API-2 to')).not.toBeInTheDocument();
  });

  it('moves a card through the accessible status control and shows the confirmed board', async () => {
    const moved = card('i1', 1, 'IN_PROGRESS', 0, true);
    const fetchMock = mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: ok({ board: board([card('i1', 1, 'TODO', 0, true)]) }),
      [`PATCH ${ISSUE_PATH}/move`]: ok({ board: board([moved]) }),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    await userEvent.selectOptions(await screen.findByLabelText('Move API-1 to'), 'IN_PROGRESS');

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');

      expect(JSON.parse(String(call?.[1]?.body))).toEqual({
        targetStatus: 'IN_PROGRESS',
        targetIndex: 0,
      });
    });

    expect(await screen.findByRole('heading', { name: 'In Progress 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To Do 0' })).toBeInTheDocument();
  });

  it('never sends a role, a reporter or a board state with a move', async () => {
    const fetchMock = mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: ok({ board: board([card('i1', 1, 'TODO', 0, true)]) }),
      [`PATCH ${ISSUE_PATH}/move`]: ok({ board: board([card('i1', 1, 'DONE', 0, true)]) }),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    await userEvent.selectOptions(await screen.findByLabelText('Move API-1 to'), 'DONE');

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
      const body = JSON.parse(String(call?.[1]?.body));

      expect(Object.keys(body).sort()).toEqual(['targetIndex', 'targetStatus']);
    });
  });

  it('restores the previous board and reports the error when a move fails', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/board`]: ok({ board: board([card('i1', 1, 'TODO', 0, true)]) }),
      [`PATCH ${ISSUE_PATH}/move`]: failure('FORBIDDEN', 403),
    });
    renderApp('/app/workspaces/w1/projects/p1/board');

    await userEvent.selectOptions(await screen.findByLabelText('Move API-1 to'), 'DONE');

    expect(await screen.findByRole('alert')).toHaveTextContent('FORBIDDEN');
    expect(await screen.findByRole('heading', { name: 'To Do 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done 0' })).toBeInTheDocument();
    // Rolled back, not duplicated.
    expect(screen.getAllByRole('link', { name: 'API-1 Card 1' })).toHaveLength(1);
  });

  it('shows an API error state when the board cannot be read', async () => {
    mockApi({ ...baseHandlers(), [`GET ${PROJECT_PATH}/board`]: failure('FORBIDDEN', 403) });
    renderApp('/app/workspaces/w1/projects/p1/board');

    expect(await screen.findByRole('alert')).toHaveTextContent('FORBIDDEN');
  });
});

describe('comments on the issue page', () => {
  it('shows an empty state when the issue has no comment', async () => {
    mockApi(baseHandlers());
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    expect(await screen.findByText(/no comment yet/i)).toBeInTheDocument();
  });

  it('sends the typed comment and adds it to the list', async () => {
    // The list is re-read after a successful write, so the mock behaves like a
    // real server: the new comment is there the next time it is asked.
    const stored: ReturnType<typeof comment>[] = [];
    const fetchMock = mockApi({
      ...baseHandlers(),
      [`GET ${ISSUE_PATH}/comments`]: () => jsonResponse({ success: true, data: { comments: stored } }),
      [`POST ${ISSUE_PATH}/comments`]: () => {
        const created = comment('c1', 'On it.');

        stored.push(created);

        return jsonResponse({ success: true, data: { comment: created } });
      },
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.type(await screen.findByLabelText('Add a comment'), 'On it.');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');

      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ body: 'On it.' });
    });

    expect(await screen.findByText('On it.')).toBeInTheDocument();
  });

  it('reports a rejected comment', async () => {
    mockApi({
      ...baseHandlers(),
      [`POST ${ISSUE_PATH}/comments`]: failure('VALIDATION_ERROR', 400),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.type(await screen.findByLabelText('Add a comment'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('VALIDATION_ERROR');
  });

  it('offers edit and delete only where the server allows them', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${ISSUE_PATH}/comments`]: ok({
        comments: [
          comment('c1', 'Mine.', USER, { canEdit: true, canDelete: true }),
          comment('c2', 'Theirs.', OTHER, { canEdit: false, canDelete: true }),
          comment('c3', 'Locked.', OTHER, { canEdit: false, canDelete: false }),
        ],
      }),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await screen.findByText('Mine.');

    expect(screen.getAllByRole('button', { name: 'Edit comment' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete comment' })).toHaveLength(2);
  });

  it('sends an edited body for the author\'s own comment', async () => {
    let stored = [comment('c1', 'Frist.')];
    const fetchMock = mockApi({
      ...baseHandlers(),
      [`GET ${ISSUE_PATH}/comments`]: () => jsonResponse({ success: true, data: { comments: stored } }),
      [`PATCH ${ISSUE_PATH}/comments/c1`]: () => {
        const updated = { ...comment('c1', 'First.'), isEdited: true };

        stored = [updated];

        return jsonResponse({ success: true, data: { comment: updated } });
      },
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit comment' }));
    await userEvent.clear(screen.getByLabelText('Edit comment'));
    await userEvent.type(screen.getByLabelText('Edit comment'), 'First.');
    await userEvent.click(screen.getByRole('button', { name: 'Save comment' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');

      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ body: 'First.' });
    });

    expect(await screen.findByText('edited')).toBeInTheDocument();
  });

  it('asks for a confirmation before deleting a comment', async () => {
    let stored = [comment('c1', 'Mine.')];
    const fetchMock = mockApi({
      ...baseHandlers(),
      [`GET ${ISSUE_PATH}/comments`]: () => jsonResponse({ success: true, data: { comments: stored } }),
      [`DELETE ${ISSUE_PATH}/comments/c1`]: () => {
        stored = [];

        return jsonResponse({ success: true, data: { deleted: true } });
      },
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete comment' }));

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete comment' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByText('Mine.')).not.toBeInTheDocument();
    });
  });
});

describe('activity', () => {
  it('renders a readable sentence per activity row', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/activities`]: ok(
        activityPage([
          activity('a1', 'ISSUE_CREATED'),
          activity('a2', 'ISSUE_STATUS_CHANGED', {
            previousStatus: 'TODO',
            nextStatus: 'IN_PROGRESS',
          }),
          activity('a3', 'COMMENT_CREATED', { commentId: 'c1' }),
        ]),
      ),
    });
    renderApp('/app/workspaces/w1/projects/p1/activity');

    expect(await screen.findByText(/Ada Yilmaz created API-1/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ada Yilmaz moved API-1 from To Do to In Progress/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Yilmaz commented on API-1/)).toBeInTheDocument();
  });

  it('shows an empty state for a project without activity', async () => {
    mockApi({ ...baseHandlers(), [`GET ${PROJECT_PATH}/activities`]: ok(activityPage([])) });
    renderApp('/app/workspaces/w1/projects/p1/activity');

    expect(await screen.findByText(/nothing has happened/i)).toBeInTheDocument();
  });

  it('loads the next page and keeps the rows already shown', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${PROJECT_PATH}/activities`]: (url) =>
        jsonResponse({
          success: true,
          data:
            url.searchParams.get('page') === '2'
              ? activityPage([activity('a2', 'COMMENT_CREATED')], false, 2)
              : activityPage([activity('a1', 'ISSUE_CREATED')], true, 1),
        }),
    });
    renderApp('/app/workspaces/w1/projects/p1/activity');

    await userEvent.click(await screen.findByRole('button', { name: 'Load more activity' }));

    expect(await screen.findByText(/commented on API-1/)).toBeInTheDocument();
    expect(screen.getByText(/created API-1/)).toBeInTheDocument();
  });

  it('reports an API error from the feed', async () => {
    mockApi({ ...baseHandlers(), [`GET ${PROJECT_PATH}/activities`]: failure('FORBIDDEN', 403) });
    renderApp('/app/workspaces/w1/projects/p1/activity');

    expect(await screen.findByRole('alert')).toHaveTextContent('FORBIDDEN');
  });

  it('shows the issue history on the issue page', async () => {
    mockApi({
      ...baseHandlers(),
      [`GET ${ISSUE_PATH}/activities`]: ok(activityPage([activity('a1', 'ISSUE_CREATED')])),
    });
    renderApp('/app/workspaces/w1/projects/p1/issues/i1');

    const history = await screen.findByRole('region', { name: 'Issue history' });

    expect(await within(history).findByText(/created API-1/)).toBeInTheDocument();
  });
});
