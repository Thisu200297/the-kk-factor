const config = require('../config/env');
const { Subscriber } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendMail, isConfigured } = require('../services/mailer');
const { confirmationMail, sendDueReminders } = require('../services/reminders');

/**
 * The reminder list.
 *
 * THE SAME ANSWER EVERY TIME. Subscribing replies "check your email" whether
 * the address was new, already on the list, or already confirmed. Anything
 * else turns the box into a way of asking whether a particular person listens
 * to this station — the same reason the sign-in form does not say whether an
 * account exists.
 *
 * CONFIRM AND UNSUBSCRIBE ARE LINKS IN AN EMAIL, so they are GET requests that
 * redirect back to the site with a message rather than returning JSON nobody
 * will see. Unsubscribe also accepts POST, because that is what Gmail and
 * Yahoo send when a reader uses the unsubscribe button in their own interface.
 */

/** Deliberately simple. The confirmation email is the real check. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function siteUrl() {
  return String(config.publicSiteUrl || '').replace(/\/+$/, '');
}

const backToSite = (res, state) => res.redirect(`${siteUrl()}/?reminders=${state}`);

/** GET /api/reminders — whether the list is open at all. Public. */
const status = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: { available: isConfigured() } })
);

/** POST /api/reminders/subscribe — public, rate limited. */
const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!EMAIL_SHAPE.test(email) || email.length > 254) {
    throw ApiError.badRequest('That does not look like an email address.');
  }

  if (!isConfigured()) {
    throw ApiError.badRequest(
      'Email reminders are not switched on yet. The countdown and the calendar button work in the meantime.'
    );
  }

  const answer = {
    success: true,
    data: { message: 'Check your email — there is a link to confirm.' },
  };

  const existing = await Subscriber.findOne({ email });

  // Already confirmed: say the same thing and send nothing. Re-sending would
  // let anyone use this box to pester an address that is already on the list.
  if (existing?.confirmed) return res.json(answer);

  const { token, hash } = Subscriber.makeToken();

  if (existing) {
    existing.confirm_token_hash = hash;
    await existing.save();
  } else {
    const unsubscribe = Subscriber.makeToken();
    await Subscriber.create({
      email,
      confirm_token_hash: hash,
      unsubscribe_token_hash: unsubscribe.hash,
      source: 'site',
    });
  }

  const mail = confirmationMail({ email, token });
  const result = await sendMail({ ...mail, to: email });

  if (!result.sent) {
    // eslint-disable-next-line no-console
    console.error(`[reminders] confirmation to ${email} failed: ${result.reason}`);
    throw ApiError.badRequest('The confirmation email could not be sent. Please try again later.');
  }

  return res.json(answer);
});

/** GET /api/reminders/confirm?token=… — the link in the confirmation email. */
const confirm = asyncHandler(async (req, res) => {
  const hash = Subscriber.hashToken(req.query.token);
  const subscriber = await Subscriber.findOne({ confirm_token_hash: hash });

  if (!subscriber) return backToSite(res, 'invalid');

  subscriber.confirmed = true;
  subscriber.confirmed_at = new Date();
  subscriber.confirm_token_hash = null; // one use
  await subscriber.save();

  return backToSite(res, 'confirmed');
});

/**
 * GET or POST /api/reminders/unsubscribe?token=…
 *
 * POST is what a mail client sends when the reader uses its own unsubscribe
 * button (List-Unsubscribe-Post). It must work without the reader ever seeing
 * a page, so it answers 200 rather than redirecting.
 */
const unsubscribe = asyncHandler(async (req, res) => {
  const token = req.query.token || req.body?.token;
  const hash = Subscriber.hashToken(token);

  const subscriber = await Subscriber.findOne({ unsubscribe_token_hash: hash });
  if (subscriber) await Subscriber.deleteOne({ _id: subscriber._id });

  if (req.method === 'POST') {
    return res.json({ success: true, data: { removed: Boolean(subscriber) } });
  }

  // An unknown token still says "you are unsubscribed": the reader wanted to
  // be off the list, and they are. Telling them the link was invalid would
  // send them looking for another one.
  return backToSite(res, 'unsubscribed');
});

/**
 * POST /api/reminders/send — the outside scheduler, or an administrator.
 *
 * Same secret as the feed refresh, for the same reason: a free instance
 * sleeps, and a sleeping instance runs no timers.
 */
const send = asyncHandler(async (req, res) => {
  const secret = config.imports.secret;
  const provided = req.get('x-import-secret');
  const isAdmin = req.user?.role === 'admin';

  const allowed =
    isAdmin || (secret && provided && timingSafeEqual(provided, secret));

  if (!allowed) {
    throw ApiError.unauthorized('Sign in as an administrator, or send a valid import secret');
  }

  const result = await sendDueReminders({ force: Boolean(req.body?.force) && isAdmin });
  return res.json({ success: true, data: result });
});

/** Compares without leaking the answer through how long it took. */
function timingSafeEqual(a, b) {
  const crypto = require('crypto');
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** GET /api/reminders/subscribers (admin) — how many, and how many confirmed. */
const stats = asyncHandler(async (_req, res) => {
  const [total, confirmed] = await Promise.all([
    Subscriber.countDocuments(),
    Subscriber.countDocuments({ confirmed: true }),
  ]);

  return res.json({
    success: true,
    data: { total, confirmed, pending: total - confirmed, available: isConfigured() },
  });
});

module.exports = { status, subscribe, confirm, unsubscribe, send, stats };
