import { describe, expect, it, vi } from 'vitest';

import { readApiUrl } from '../lib/env';

/**
 * Phase 9B — the client has two legitimate API bases:
 *
 * - `http://localhost:4000/api` for a local `npm run dev`, where the client and
 *   the API are two different origins
 * - `/api` for the production build, where one Express service serves both, so
 *   the session cookie never has to travel cross-site
 */
describe('readApiUrl', () => {
  it('accepts the same-origin production value', () => {
    expect(readApiUrl('/api')).toBe('/api');
  });

  it('accepts the absolute development value', () => {
    expect(readApiUrl('http://localhost:4000/api')).toBe('http://localhost:4000/api');
  });

  it('accepts a deployed absolute URL', () => {
    expect(readApiUrl('https://devflow.example.com/api')).toBe('https://devflow.example.com/api');
  });

  it('drops a trailing slash from either shape', () => {
    expect(readApiUrl('/api/')).toBe('/api');
    expect(readApiUrl('http://localhost:4000/api/')).toBe('http://localhost:4000/api');
  });

  it('trims whitespace and falls back when the value is empty', () => {
    expect(readApiUrl('  /api  ')).toBe('/api');
    expect(readApiUrl('')).toBe('http://localhost:4000/api');
    expect(readApiUrl(undefined)).toBe('http://localhost:4000/api');
  });

  it('refuses a protocol-relative value that only looks like a path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // `//evil.example/api` would send every request, and the cookie, to another
    // host.
    expect(readApiUrl('//evil.example/api')).toBe('http://localhost:4000/api');
    expect(warn).toHaveBeenCalled();
  });

  it('refuses a value that is neither a path nor an http(s) URL', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(readApiUrl('not a url')).toBe('http://localhost:4000/api');
    expect(readApiUrl('javascript:alert(1)')).toBe('http://localhost:4000/api');
  });
});
