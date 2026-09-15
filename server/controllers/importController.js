const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { runImports, getLastRun } = require('../services/importScheduler');

/**
 * POST /api/import/run
 *
 * Two callers, one handler:
 *
 *   - an admin pressing "Refresh now" in the dashboard (Bearer token), and
 *   - an outside scheduler, which cannot sign in and instead sends the shared
 *     secret. That path exists because Render's free plan stops the service
 *     after fifteen idle minutes, and a stopped service runs no timers — so
 *     something outside has to knock.
 *
 * The secret is compared in constant time. It is a low-value credential, but a
 * timing-safe comparison costs one function call and removes the question.
 */
const crypto = require('crypto');

function secretMatches(given) {
  const expected = config.imports.secret;
  if (!expected || !given) return false;

  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const run = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const token = req.get('x-import-secret') || req.query.secret;

  if (!isAdmin && !secretMatches(token)) {
    throw ApiError.unauthorized('Sign in as an administrator, or send a valid import secret');
  }

  const result = await runImports();
  return res.json({ success: true, data: result });
});

/** GET /api/import/status (admin) — what the dashboard shows. */
const status = asyncHandler(async (_req, res) =>
  res.json({
    success: true,
    data: {
      lastRun: getLastRun(),
      intervalMinutes: config.imports.intervalMinutes,
      news: {
        feedUrl: config.news.feedUrl,
        sourceName: config.news.sourceName,
        mode: config.news.fullText ? 'fullText' : 'linkOut',
      },
      show: { channelId: config.show.channelId },
    },
  })
);

/**
 * GET /api/import/check — does the source answer *this* machine?
 *
 * Greek City Times answers a laptop and a development container with 200 and
 * answers Render with 403: the block is on where the request comes from, not
 * on what it asks for. Nothing reproducible locally can tell us that, and the
 * importer's own log says only which door it tried. So this asks both doors
 * from inside the running service and reports exactly what came back.
 *
 * It fetches the two public URLs the importer already fetches and returns
 * nothing but status codes, timings and the first few characters of the body
 * — enough to tell a WAF challenge page from a genuine feed, and not enough
 * to be a way of laundering requests through this server.
 */
const check = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const token = req.get('x-import-secret') || req.query.secret;

  if (!isAdmin && !secretMatches(token)) {
    throw ApiError.unauthorized('Sign in as an administrator, or send a valid import secret');
  }

  const { apiRootFrom } = require('../services/wpApi');
  const { USER_AGENT } = require('../services/feeds');

  const feedUrl = config.news.feedUrl;
  const apiRoot = config.news.apiUrl || apiRootFrom(feedUrl);

  const targets = [
    { name: 'rss', url: feedUrl, accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' },
    { name: 'api', url: apiRoot ? `${apiRoot}/posts?per_page=1` : '', accept: 'application/json' },
  ];

  const results = {};

  for (const target of targets) {
    if (!target.url) {
      results[target.name] = { url: null, error: 'not configured' };
      continue;
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(target.url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT, Accept: target.accept },
      });

      // Read a little of the body: a 403 from Cloudflare looks nothing like a
      // 403 from WordPress, and the first line says which.
      const body = (await response.text()).slice(0, 300);

      results[target.name] = {
        url: target.url,
        status: response.status,
        ok: response.ok,
        ms: Date.now() - startedAt,
        server: response.headers.get('server') || null,
        contentType: response.headers.get('content-type') || null,
        // The headers a WAF leaves behind, if it left any.
        cfRay: response.headers.get('cf-ray') || null,
        snippet: body.replace(/\s+/g, ' ').trim(),
      };
    } catch (error) {
      results[target.name] = {
        url: target.url,
        ms: Date.now() - startedAt,
        error: error.name === 'AbortError' ? 'timed out after 20s' : error.message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return res.json({
    success: true,
    data: { userAgent: USER_AGENT, checkedAt: new Date().toISOString(), results },
  });
});

module.exports = { run, status, check };
