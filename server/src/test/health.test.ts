import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../app.js';

describe('GET /api/health', () => {
  it('returns the standard success response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('allows requests from the configured client origin', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5174');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });
});

describe('unknown routes', () => {
  it('returns the standard 404 error response', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { message: 'Route not found' },
    });
  });
});
