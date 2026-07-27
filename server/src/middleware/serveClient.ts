import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express, { type NextFunction, type Request, type Response, type Router } from 'express';

/**
 * Serving the built React client from the API process.
 *
 * In production DevFlow is **one** service on **one** origin: Express answers
 * `/api/*` and hands every other address the built single-page application.
 * That is what keeps the session cookie same-origin, so no cross-site cookie,
 * no second domain and no CORS exception is needed anywhere.
 *
 * In development nothing here runs: the Vite dev server keeps serving the
 * client on 5174 with hot reload, and the API stays on 4000.
 */

/** The directory of this module — `server/dist/middleware` once compiled. */
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where the built client lives.
 *
 * The relative walk is the same from the compiled output and from the
 * TypeScript source, because both sit two directories below `server/`:
 *
 *   server/dist/middleware/serveClient.js  →  ../../../client/dist
 *   server/src/middleware/serveClient.ts   →  ../../../client/dist
 *
 * `CLIENT_DIST_PATH` overrides it for an image that arranges the files
 * differently.
 */
export function resolveClientDistPath(configuredPath?: string): string {
  if (configuredPath && configuredPath.trim()) {
    return path.resolve(configuredPath.trim());
  }

  return path.resolve(moduleDir, '..', '..', '..', 'client', 'dist');
}

/** True when that directory really holds a built client. */
export function hasClientBuild(distPath: string): boolean {
  return existsSync(path.join(distPath, 'index.html'));
}

/**
 * Static assets first, then the SPA fallback.
 *
 * This router is mounted **after** every `/api` route and after the API's own
 * 404, so an unknown `/api/...` address is already answered with JSON and can
 * never fall through to `index.html` — a client asking for JSON must never
 * receive an HTML document.
 */
export function createClientRouter(distPath: string): Router {
  const router = express.Router();
  const indexHtmlPath = path.join(distPath, 'index.html');

  router.use((req: Request, _res: Response, next: NextFunction) => {
    // Source maps would hand the reader the original TypeScript. Vite does not
    // emit them for a production build; this makes it true regardless.
    if (req.path.endsWith('.map')) {
      next('router');
      return;
    }

    next();
  });

  router.use(
    express.static(distPath, {
      // The fallback below owns index.html, so the static layer never answers
      // a directory request itself.
      index: false,
      // Vite fingerprints everything under /assets, so those files are safe to
      // cache for a long time. index.html is served by the fallback and is not
      // cached, which is what makes a new deployment visible immediately.
      maxAge: '1h',
      // A missing file is a client route, not a 404 — let the fallback decide.
      fallthrough: true,
      dotfiles: 'ignore',
    }),
  );

  // React Router owns the remaining addresses: a refresh on
  // /app/workspaces/123/board has to return the same document the first load
  // returned. Only readable methods qualify; a POST to an unknown path stays a
  // 404 instead of pretending to be a page.
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    res.sendFile(indexHtmlPath, (error: unknown) => {
      if (error) {
        next(error);
      }
    });
  });

  return router;
}
