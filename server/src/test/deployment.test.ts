import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { parseServerEnv } from '../config.js';
import { notFound } from '../middleware/notFound.js';
import {
  createClientRouter,
  hasClientBuild,
  resolveClientDistPath,
} from '../middleware/serveClient.js';

/**
 * Phase 9B — the behaviour the same-origin deployment depends on.
 *
 * Nothing here needs a network, a real Render variable or a live deployment:
 * the environment parser is a pure function, and the client router is mounted
 * on a throwaway Express app over a throwaway directory.
 */

const PRODUCTION_BASE = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:secret@db:5432/devflow',
};

describe('production origin resolution', () => {
  it('refuses to start in production without any trusted origin', () => {
    expect(() => parseServerEnv({ ...PRODUCTION_BASE })).toThrow(/CLIENT_ORIGIN/);
  });

  it('trusts the platform address when no origin is configured by hand', () => {
    const env = parseServerEnv({
      ...PRODUCTION_BASE,
      RENDER_EXTERNAL_URL: 'https://devflow.onrender.com',
    });

    expect(env.CLIENT_ORIGIN).toBe('https://devflow.onrender.com');
  });

  it('tolerates a trailing slash on the platform address', () => {
    const env = parseServerEnv({
      ...PRODUCTION_BASE,
      RENDER_EXTERNAL_URL: 'https://devflow.onrender.com/',
    });

    expect(env.CLIENT_ORIGIN).toBe('https://devflow.onrender.com');
  });

  it('prefers an explicitly configured origin over the platform address', () => {
    const env = parseServerEnv({
      ...PRODUCTION_BASE,
      CLIENT_ORIGIN: 'https://devflow.example.com',
      RENDER_EXTERNAL_URL: 'https://devflow.onrender.com',
    });

    expect(env.CLIENT_ORIGIN).toBe('https://devflow.example.com');
  });

  it('refuses a platform address that is not an origin', () => {
    expect(() =>
      parseServerEnv({ ...PRODUCTION_BASE, RENDER_EXTERNAL_URL: 'devflow.onrender.com' }),
    ).toThrow(/RENDER_EXTERNAL_URL/);
  });

  it('still falls back to the local client origin outside production', () => {
    const env = parseServerEnv({ DATABASE_URL: PRODUCTION_BASE.DATABASE_URL });

    expect(env.CLIENT_ORIGIN).toBe('http://localhost:5174');
  });

  it('reads the platform port and keeps 4000 as the local fallback', () => {
    expect(parseServerEnv({ ...PRODUCTION_BASE, PORT: '10000', CLIENT_ORIGIN: 'https://a.example.com' }).PORT).toBe(
      10000,
    );
    expect(parseServerEnv({ DATABASE_URL: PRODUCTION_BASE.DATABASE_URL }).PORT).toBe(4000);
  });
});

/** A directory that looks exactly like a Vite build, without running one. */
function createFakeClientBuild(): string {
  const distPath = mkdtempSync(path.join(tmpdir(), 'devflow-client-'));

  mkdirSync(path.join(distPath, 'assets'));
  writeFileSync(path.join(distPath, 'index.html'), '<!doctype html><title>DevFlow</title>');
  writeFileSync(path.join(distPath, 'assets', 'app.js'), 'console.log("devflow");');
  writeFileSync(path.join(distPath, 'assets', 'app.js.map'), '{"version":3}');

  return distPath;
}

/** The production middleware order: API, API 404, then the client. */
function createProductionLikeApp(distPath: string) {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api', notFound);
  app.use(createClientRouter(distPath));
  app.use(notFound);

  return app;
}

describe('the client build path', () => {
  it('resolves next to the server output by default', () => {
    expect(resolveClientDistPath()).toMatch(/client[\\/]dist$/);
  });

  it('honours an explicitly configured directory', () => {
    const distPath = createFakeClientBuild();

    expect(resolveClientDistPath(distPath)).toBe(path.resolve(distPath));
    expect(hasClientBuild(distPath)).toBe(true);
  });

  it('reports a directory without a built client', () => {
    expect(hasClientBuild(mkdtempSync(path.join(tmpdir(), 'devflow-empty-')))).toBe(false);
  });
});

describe('Express serving the built client', () => {
  const app = createProductionLikeApp(createFakeClientBuild());

  it('keeps the health endpoint public and JSON', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('answers an unknown API route with JSON, never with the application shell', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: { message: 'Route not found' } });
    expect(response.text).not.toContain('<!doctype html>');
  });

  it('returns the client entry for a nested React Router address', async () => {
    const response = await request(app).get('/app/workspaces/abc/projects/def/board');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<!doctype html>');
  });

  it('serves a real static asset instead of the fallback', async () => {
    const response = await request(app).get('/assets/app.js');

    expect(response.status).toBe(200);
    expect(response.text).toContain('devflow');
  });

  it('never serves a source map', async () => {
    const response = await request(app).get('/assets/app.js.map');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: { message: 'Route not found' } });
  });

  it('does not turn an unknown POST into a page', async () => {
    const response = await request(app).post('/not-a-page').send({});

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
