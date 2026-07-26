import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import ConfirmDialog from '../components/ConfirmDialog';

/**
 * Phase 9A: the shared behaviour the visual pass introduced.
 *
 * Only three things are worth a test here, because only these three are
 * behaviour rather than styling: the collapsible navigation, the confirmation
 * dialog and the wording of the shared error state. Nothing in this file
 * asserts a colour, a class name or a pixel.
 */

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };

const WORKSPACE = {
  id: 'w1',
  name: 'Acme Team',
  slug: 'acme-team',
  role: 'OWNER',
  memberCount: 2,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Handler = () => Response;

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

describe('collapsible application navigation', () => {
  const handlers = {
    'GET /api/auth/me': ok({ user: USER }),
    'GET /api/workspaces': ok({ workspaces: [WORKSPACE] }),
  };

  it('reports its state through aria-expanded and controls the navigation panel', async () => {
    mockApi(handlers);
    renderApp('/app/workspaces');

    const toggle = await screen.findByRole('button', { name: 'Menu' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'app-shell-navigation');

    await userEvent.click(toggle);

    const opened = screen.getByRole('button', { name: 'Close menu' });

    expect(opened).toHaveAttribute('aria-expanded', 'true');
  });

  it('returns focus to the toggle when the panel is closed again', async () => {
    mockApi(handlers);
    renderApp('/app/workspaces');

    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));

    // A keyboard user is put back on the control they used, not at the top of
    // the document.
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
  });
});

describe('confirmation dialog', () => {
  function renderDialog(onConfirm = vi.fn(), onCancel = vi.fn()) {
    render(
      <ConfirmDialog
        title="Delete WEB-1?"
        confirmLabel="Confirm delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        This cannot be undone.
      </ConfirmDialog>,
    );

    return { onConfirm, onCancel };
  }

  it('is a modal dialog named by its own heading', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Delete WEB-1?');
  });

  it('opens with focus on the safe choice', async () => {
    renderDialog();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
  });

  it('closes on Escape without confirming', async () => {
    const { onConfirm, onCancel } = renderDialog();

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms only when the destructive button is pressed', async () => {
    const { onConfirm } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('shared error state', () => {
  it('explains a 403 and offers no retry, because retrying cannot help', async () => {
    mockApi({
      'GET /api/auth/me': ok({ user: USER }),
      'GET /api/workspaces': ok({ workspaces: [WORKSPACE] }),
      'GET /api/workspaces/w1/dashboard': failure('FORBIDDEN', 403),
    });
    renderApp('/app/workspaces/w1/dashboard');

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('You do not have permission');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    // Never a dead end: there is always a way out of the page.
    expect(screen.getByRole('link', { name: 'Back to workspaces' })).toBeInTheDocument();
  });
});
