const config = require('../config/env');
const { Subscriber, Setting } = require('../models');
const { describeSchedule } = require('../utils/schedule');
const { sendMail, isConfigured } = require('./mailer');

/**
 * The weekly "we are on in an hour" email.
 *
 * WHY IT IS TRIGGERED FROM OUTSIDE. A free Render instance sleeps after
 * fifteen idle minutes, and a sleeping instance runs no timers — so a
 * setInterval waiting for Tuesday evening would simply not be running on
 * Tuesday evening. The same outside scheduler that keeps the feeds fresh
 * calls this, and this decides whether there is anything to do.
 *
 * WHY EACH SUBSCRIBER REMEMBERS WHICH BROADCAST THEY WERE TOLD ABOUT. The
 * scheduler ticks every half hour and the window is longer than that, so
 * without a marker everyone would be emailed twice. Keeping it per person
 * rather than as one global "last sent" means a run that fails halfway simply
 * picks up the people it missed on the next tick, instead of either
 * abandoning them or emailing the rest again.
 */

/** How long before the show a reminder may go out. */
const WINDOW_MINUTES = 95;

/** At most this many in one tick, so a run cannot stall on a big list. */
const BATCH = 200;

const SCHEDULE_KEY = 'show.schedule';

/** The site address, for links in the mail. */
function siteUrl() {
  return String(config.publicSiteUrl || '').replace(/\/+$/, '');
}

function formatWhen(startsAt, timezone) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: timezone || 'Australia/Melbourne',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startsAt));
}

/* ------------------------------------------------------------------ mail -- */

function confirmationMail({ email, token }) {
  const url = `${siteUrl()}/api/reminders/confirm?token=${encodeURIComponent(token)}`;

  const text = [
    'Almost there.',
    '',
    'Somebody asked for a reminder before THE KK FACTOR goes on air, using',
    `this address (${email}). If that was you, confirm it here:`,
    '',
    url,
    '',
    'If it was not you, ignore this message — nothing will be sent and the',
    'address will not be used.',
    '',
    'THE KK FACTOR — The Greek Eurobeat Show',
    'with Roula Krikellis, on RPP FM 98.7 / 98.3',
  ].join('\n');

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#17121B">
  <h1 style="font-size:20px;margin:0 0 16px">Almost there</h1>
  <p style="margin:0 0 14px">
    Somebody asked for a reminder before <strong>THE KK FACTOR</strong> goes on air,
    using this address (${escapeHtml(email)}).
  </p>
  <p style="margin:0 0 22px">If that was you, confirm it:</p>
  <p style="margin:0 0 22px">
    <a href="${url}" style="background:#D6156F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">
      Yes, remind me
    </a>
  </p>
  <p style="margin:0 0 14px;color:#6b6472;font-size:14px">
    If it was not you, ignore this message. Nothing will be sent and the address will not be used.
  </p>
  <hr style="border:none;border-top:1px solid #e8e2e9;margin:24px 0">
  <p style="margin:0;color:#6b6472;font-size:13px">
    THE KK FACTOR — The Greek Eurobeat Show<br>with Roula Krikellis, on RPP FM 98.7 / 98.3
  </p>
</div>`.trim();

  return { subject: 'Confirm your KK Factor reminder', text, html };
}

function reminderMail({ schedule, startsAt, unsubscribeUrl }) {
  const when = formatWhen(startsAt, schedule.timezone);
  const title = schedule.title || 'The Greek Eurobeat Show';
  const site = siteUrl();

  const text = [
    `${title} is on soon.`,
    '',
    `${when} (${schedule.abbreviation || 'Melbourne time'})`,
    schedule.note || 'Live on RPP FM 98.7 / 98.3 and on YouTube',
    '',
    `Listen here: ${site}/show`,
    '',
    '---',
    `To stop these reminders: ${unsubscribeUrl}`,
  ].join('\n');

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;color:#17121B">
  <p style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#D6156F">On soon</p>
  <h1 style="font-size:22px;margin:0 0 14px">${escapeHtml(title)}</h1>
  <p style="margin:0 0 6px;font-size:17px"><strong>${escapeHtml(when)}</strong> ${escapeHtml(schedule.abbreviation || '')}</p>
  <p style="margin:0 0 22px;color:#6b6472">${escapeHtml(schedule.note || '')}</p>
  <p style="margin:0 0 26px">
    <a href="${site}/show" style="background:#D6156F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block;font-weight:600">
      Listen on the site
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #e8e2e9;margin:24px 0">
  <p style="margin:0;color:#6b6472;font-size:13px">
    You asked for this reminder at ${escapeHtml(site)}.<br>
    <a href="${unsubscribeUrl}" style="color:#6b6472">Stop receiving them</a>
  </p>
</div>`.trim();

  return { subject: `${title} is on soon`, text, html };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------ the sending -- */

/**
 * Sends the reminder, if there is one due.
 *
 * Answers with what it did rather than throwing, because its caller is a
 * scheduler that must carry on to the next thing either way.
 */
async function sendDueReminders({ now = new Date(), force = false } = {}) {
  if (!isConfigured()) {
    return { skipped: true, reason: 'SMTP is not configured', sent: 0 };
  }

  const stored = await Setting.read(SCHEDULE_KEY);
  const schedule = describeSchedule(stored, now);

  if (!schedule.enabled || !schedule.next) {
    return { skipped: true, reason: 'No schedule to remind anybody about', sent: 0 };
  }

  const startsAt = schedule.next.startsAt;
  const minutesAway = (Date.parse(startsAt) - now.getTime()) / 60000;

  if (!force && (minutesAway > WINDOW_MINUTES || minutesAway < 0)) {
    return {
      skipped: true,
      reason: `Next broadcast is ${Math.round(minutesAway)} minutes away`,
      sent: 0,
    };
  }

  const due = await Subscriber.find({
    confirmed: true,
    last_sent_for: { $ne: startsAt },
  }).limit(BATCH);

  if (!due.length) {
    return { skipped: false, reason: 'Everybody has already been told', sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of due) {
    // The token is only stored hashed, so the link has to be rebuilt from a
    // fresh one each time. Cheap, and it means a leaked message from last
    // week cannot unsubscribe somebody this week.
    const { token, hash } = Subscriber.makeToken();
    const unsubscribeUrl = `${siteUrl()}/api/reminders/unsubscribe?token=${encodeURIComponent(token)}`;

    const mail = reminderMail({ schedule, startsAt, unsubscribeUrl });
    const result = await sendMail({ ...mail, to: subscriber.email, listUnsubscribeUrl: unsubscribeUrl });

    if (result.sent) {
      subscriber.unsubscribe_token_hash = hash;
      subscriber.last_sent_for = startsAt;
      await subscriber.save();
      sent += 1;
    } else {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[reminders] ${subscriber.email}: ${result.reason}`);
    }
  }

  return { skipped: false, startsAt, sent, failed, considered: due.length };
}

module.exports = {
  sendDueReminders,
  confirmationMail,
  reminderMail,
  formatWhen,
  escapeHtml,
  WINDOW_MINUTES,
  SCHEDULE_KEY,
};
