import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('application shell', () => {
  it('renders the home page with navigation and the API status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    renderApp('/');

    expect(screen.getByRole('heading', { level: 1, name: 'DevFlow' })).toBeInTheDocument();
    expect(
      screen.getByText('Issue and sprint management for small software teams.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(await screen.findByText('API status: ok')).toBeInTheDocument();
  });

  it('renders the login route once the session check finishes', async () => {
    // No session: /api/auth/me answers 401 and the login page stays visible.
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'x' } }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    );

    renderApp('/login');

    expect(await screen.findByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
  });
});
