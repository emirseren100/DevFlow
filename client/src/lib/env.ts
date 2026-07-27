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
 *
 * Two shapes are accepted:
 *
 * - an absolute URL — `http://localhost:4000/api`, what a local `npm run dev`
 *   uses, because the client (5174) and the API (4000) are two origins
 * - a same-origin path — `/api`, what the production build uses, because one
 *   Express service answers the API *and* serves this bundle. Every request
 *   then goes to the page's own origin, so the session cookie stays
 *   same-origin and no cross-site cookie is ever needed.
 */
export function readApiUrl(rawValue: string | undefined): string {
  const configured = rawValue?.trim();

  if (!configured) {
    return FALLBACK_API_URL;
  }

  // `//evil.example/api` is a protocol-relative URL: it looks like a path but
  // points at another host. Only a single leading slash is a real path.
  if (configured.startsWith('/') && !configured.startsWith('//')) {
    return configured.replace(/\/+$/, '') || '/';
  }

  try {
    // Proves the value is an absolute URL before the first request fails with a
    // confusing browser error.
    const url = new URL(configured);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol.');
    }
  } catch {
    console.warn(`VITE_API_URL is not a valid URL, falling back to ${FALLBACK_API_URL}.`);

    return FALLBACK_API_URL;
  }

  return configured.replace(/\/+$/, '');
}

export const API_URL = readApiUrl(import.meta.env.VITE_API_URL);
