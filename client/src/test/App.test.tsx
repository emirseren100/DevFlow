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
    expect(screen.getByText('Phase 1 scaffolding is complete.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(await screen.findByText('API status: ok')).toBeInTheDocument();
  });

  it('renders the login placeholder route', () => {
    renderApp('/login');

    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
  });
});
