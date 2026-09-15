/**
 * The source-reachability check.
 *
 * This exists because of a failure nothing local could see: Greek City Times
 * answers a laptop with 200 and answers the deployed service with 403, so the
 * news stopped arriving and every test still passed. The endpoint's whole job
 * is to ask the question from the machine that is actually being refused — so
 * what is worth testing here is that it is reachable only with the secret,
 * and that a refusal is reported rather than thrown away.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.IMPORT_SECRET = 'test-import-secret';
process.env.NEWS_FEED_URL = 'https://example.test/feed/';

const app = require('../app');

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
});

/** A response shaped like the bits the endpoint reads. */
const reply = ({ status = 200, body = '', headers = {} }) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  text: async () => body,
});

describe('GET /api/import/check', () => {
  it('refuses without the secret', async () => {
    const res = await request(app).get('/api/import/check');
    expect(res.status).toBe(401);
  });

  it('refuses a wrong secret', async () => {
    const res = await request(app).get('/api/import/check').set('x-import-secret', 'nope');
    expect(res.status).toBe(401);
  });

  it('reports a block rather than failing, and says which door was shut', async () => {
    global.fetch = jest.fn(async (url) =>
      String(url).includes('wp-json')
        ? reply({
            status: 403,
            body: '<html><title>Attention Required! | Cloudflare</title>',
            headers: { server: 'cloudflare', 'cf-ray': '8a1b2c3d4e5f' },
          })
        : reply({
            status: 200,
            body: '<?xml version="1.0"?><rss><channel><title>News</title>',
            headers: { 'content-type': 'application/rss+xml' },
          })
    );

    const res = await request(app)
      .get('/api/import/check')
      .set('x-import-secret', 'test-import-secret');

    expect(res.status).toBe(200);

    const { api, rss } = res.body.data.results;

    expect(api.status).toBe(403);
    expect(api.ok).toBe(false);
    expect(api.server).toBe('cloudflare');
    expect(api.cfRay).toBe('8a1b2c3d4e5f');
    expect(api.snippet).toContain('Cloudflare');

    expect(rss.status).toBe(200);
    expect(rss.ok).toBe(true);
  });

  it('reports a network failure as a result, not a 500', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND example.test');
    });

    const res = await request(app)
      .get('/api/import/check')
      .set('x-import-secret', 'test-import-secret');

    expect(res.status).toBe(200);
    expect(res.body.data.results.rss.error).toContain('ENOTFOUND');
    expect(res.body.data.results.api.error).toContain('ENOTFOUND');
  });

  it('checks both the feed and the API, and says which agent it asked as', async () => {
    const seen = [];
    global.fetch = jest.fn(async (url) => {
      seen.push(String(url));
      return reply({ status: 200, body: 'ok' });
    });

    const res = await request(app)
      .get('/api/import/check')
      .set('x-import-secret', 'test-import-secret');

    expect(seen).toHaveLength(2);
    expect(seen.some((u) => u.includes('/feed/'))).toBe(true);
    expect(seen.some((u) => u.includes('/wp-json/wp/v2/posts'))).toBe(true);
    expect(res.body.data.userAgent).toContain('TheKKFactor');
  });
});
