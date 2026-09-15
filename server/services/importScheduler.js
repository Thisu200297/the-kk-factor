const config = require('../config/env');
const { importNews } = require('./newsImporter');
const { importEpisodes } = require('./episodeImporter');
const { sendDueReminders } = require('./reminders');

/**
 * Keeps the news feed and the episode archive fresh.
 *
 * There are deliberately three ways in, because no single one is reliable on
 * the hosting this site runs on:
 *
 *   1. On boot — so a fresh deploy is never empty.
 *   2. On a timer — fine while the service is awake.
 *   3. POST /api/import/run — the one that actually matters in production.
 *      Render's free plan stops the service after fifteen idle minutes, and a
 *      stopped service runs no timers, so an outside scheduler (cron-job.org
 *      is free) calling this endpoint is what guarantees the feed keeps
 *      moving. It doubles as the "refresh now" button in the dashboard.
 *
 * Runs never overlap: a pass still in flight is returned to the next caller
 * rather than started again, so a stuck feed cannot stack up requests.
 *
 * The weekly reminder email rides along with the same pass. It could have had
 * its own scheduled job, and then the client would have had two to set up and
 * one to forget — and forgetting this one is silent, because a reminder that
 * never goes out looks exactly like a reminder nobody subscribed to. It
 * decides for itself whether there is anything due, so calling it every half
 * hour costs one query when there is not.
 */

/** One line saying what an importer did, or why it did nothing. */
function report(name, result) {
  if (!result) return;

  if (result.failed) {
    // eslint-disable-next-line no-console
    console.error(`[${name}] FAILED: ${result.reason}`);
    return;
  }

  if (result.skipped) {
    // eslint-disable-next-line no-console
    console.log(`[${name}] skipped: ${result.reason}`);
    return;
  }

  const bits = [];
  if (result.via) bits.push(`via ${result.via}`);
  if (result.mode) bits.push(result.mode);
  if (result.seen !== undefined) bits.push(`${result.seen} seen`);
  if (result.imported) bits.push(`${result.imported} new`);
  if (result.updated) bits.push(`${result.updated} updated`);
  if (result.sent) bits.push(`${result.sent} sent`);
  if (result.failed) bits.push(`${result.failed} failed`);

  // eslint-disable-next-line no-console
  console.log(`[${name}] ${bits.join(', ') || 'nothing to do'}`);
}

let inFlight = null;
let timer = null;
let lastRun = null;

/** Runs both importers, tolerating either one failing. */
async function runImports(options = {}) {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const startedAt = new Date();
    const settled = await Promise.allSettled([
      importNews(options.news || {}),
      importEpisodes(options.episodes || {}),
      sendDueReminders(),
    ]);

    const unwrap = (result) =>
      result.status === 'fulfilled'
        ? result.value
        : { failed: true, reason: result.reason?.message || 'failed', imported: 0, updated: 0 };

    lastRun = {
      startedAt,
      finishedAt: new Date(),
      ms: Date.now() - startedAt.getTime(),
      news: unwrap(settled[0]),
      episodes: unwrap(settled[1]),
      reminders: unwrap(settled[2]),
    };

    /**
     * Say what happened, every time.
     *
     * allSettled means a thrown importer is caught and the run reports
     * success anyway, and none of the importers logged their own result — so
     * a feed that had stopped arriving looked exactly like a feed with
     * nothing new in it. The site ran for over a week on news from the day it
     * was deployed and said nothing about it. One line per importer costs
     * nothing and is the difference between noticing that in a log and
     * noticing it when the client asks why the news is a week old.
     */
    report('news', lastRun.news);
    report('episodes', lastRun.episodes);
    report('reminders', lastRun.reminders);

    return lastRun;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** What the dashboard shows under "last refreshed". */
function getLastRun() {
  return lastRun;
}

function start() {
  const minutes = config.imports.intervalMinutes;
  if (!minutes) return;

  // A moment after boot, so the first request is not competing with an import.
  setTimeout(() => {
    runImports().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[imports] First run failed:', error.message);
    });
  }, 8000).unref();

  timer = setInterval(() => {
    runImports().catch((error) => {
      // eslint-disable-next-line no-console
      console.error('[imports] Scheduled run failed:', error.message);
    });
  }, minutes * 60 * 1000);
  timer.unref();

  // eslint-disable-next-line no-console
  console.log(
    `[imports] Feeds refresh every ${minutes} minutes (and on demand); reminders ride along`
  );
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { runImports, getLastRun, start, stop };
