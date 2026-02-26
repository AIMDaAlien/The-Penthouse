const request = require('supertest');
const { app } = require('../src/index');

const findAssetRefs = (html) => {
  const refs = [];
  const regex = /(?:href|src)="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const ref = match[1];
    if (ref.startsWith('/_expo/static/') || ref.startsWith('/expo/static/')) {
      refs.push(ref);
    }
  }
  return refs;
};

describe('Web App Static Asset Serving', () => {
  it('serves /app/ HTML and referenced expo assets from root paths', async () => {
    const appRes = await request(app).get('/app/');
    expect(appRes.statusCode).toBe(200);
    expect(appRes.headers['content-type']).toMatch(/text\/html/);

    const refs = findAssetRefs(appRes.text || '');
    expect(refs.length).toBeGreaterThan(0);

    for (const ref of refs) {
      const res = await request(app).get(ref);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).not.toMatch(/text\/html/);
    }
  });
});
