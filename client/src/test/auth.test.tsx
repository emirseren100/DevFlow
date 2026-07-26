import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const USER = { id: 'u1', name: 'Ada Yilmaz', email: 'ada@devflow.local' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mocks the API boundary only: routes are matched by path, so the tests say
 * nothing about how the components fetch internally.
 */
function mockApi(handlers: Record<string, () => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const handler = Object.entries(handlers).find(([path]) => url.includes(path))?.[1];

    return Promise.resolve(
      handler
        ? handler()
        : jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'x' } }, 404),
    );
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

const unauthenticated = () =>
  jsonResponse({ success: false, error: { code: 'UNAUTHENTICATED', message: 'x' } }, 401);

const authenticated = () => jsonResponse({ success: true, data: { user: USER } });

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

describe('login page', () => {
  it('shows accessible email and password fields', async () => {
    mockApi({ '/api/auth/me': unauthenticated });
    renderApp('/login');

    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create one' })).toBeInTheDocument();
  });

  it('shows the generic server error when the credentials are wrong', async () => {
    mockApi({
      '/api/auth/me': unauthenticated,
      '/api/auth/login': () =>
        jsonResponse(
          { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } },
          401,
        ),
    });
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'ada@devflow.local');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });
});

describe('register page', () => {
  it('shows accessible name, email and password fields', async () => {
    mockApi({ '/api/auth/me': unauthenticated });
    renderApp('/register');

    expect(await screen.findByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('protected /app route', () => {
  it('shows a loading state while the session is being checked', () => {
    mockApi({ '/api/auth/me': unauthenticated });
    renderApp('/app');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  });

  it('redirects an unauthenticated visitor to the login page', async () => {
    mockApi({ '/api/auth/me': unauthenticated });
    renderApp('/app');

    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
  });

  it('renders the current user when a session exists', async () => {
    mockApi({ '/api/auth/me': authenticated });
    renderApp('/app');

    expect(await screen.findByText('Signed in as Ada Yilmaz')).toBeInTheDocument();
    expect(screen.getByText(USER.email)).toBeInTheDocument();
  });

  it('signs the user out and returns to the login page', async () => {
    mockApi({
      '/api/auth/me': authenticated,
      '/api/auth/logout': () => jsonResponse({ success: true, data: { loggedOut: true } }),
    });
    renderApp('/app');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
    });
  });
});
