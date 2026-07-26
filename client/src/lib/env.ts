/**
 * The single place the client reads its build-time configuration.
 *
 * Only `VITE_`-prefixed variables reach the browser bundle, and everything that
 * does is public: it is compiled into JavaScript that anybody can read. No
 * secret ever belongs here — the session lives in an HTTP-only cookie the
 * browser manages, which is exactly why the client needs no token at all.
 */

const FALLBACK_API_URL = 'http://localhost:4000/api';

/**
 * Base URL of the API, ending with `/api` and never with a trailing slash, so
 * every caller can write `` `${API_URL}/workspaces` `` without guessing.
 */
function readApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (!configured) {
    return FALLBACK_API_URL;
  }

  try {
    // Proves the value is an absolute URL before the first request fails with a
    // confusing browser error.
    new URL(configured);
  } catch {
    console.warn(`VITE_API_URL is not a valid URL, falling back to ${FALLBACK_API_URL}.`);

    return FALLBACK_API_URL;
  }

  return configured.replace(/\/+$/, '');
}

export const API_URL = readApiUrl();
