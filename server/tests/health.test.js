const request = require('supertest');
const { app } = require('../src/index');

describe('Health Endpoint Headers', () => {
  it('adds X-Response-Time and Server-Timing on /api/*', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);

    expect(res.headers['x-response-time']).toMatch(/^\d+(\.\d+)?ms$/);
    expect(res.headers['server-timing']).toMatch(/app;dur=\d+(\.\d+)?/);
  });

  it('adds timing headers for HEAD requests (curl -I)', async () => {
    const res = await request(app).head('/api/health');
    expect(res.statusCode).toBe(200);

    expect(res.headers['x-response-time']).toMatch(/^\d+(\.\d+)?ms$/);
    expect(res.headers['server-timing']).toMatch(/app;dur=\d+(\.\d+)?/);
  });

  it('does not add timing headers on non-API routes', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-response-time']).toBeUndefined();
    expect(res.headers['server-timing']).toBeUndefined();
  });
});
