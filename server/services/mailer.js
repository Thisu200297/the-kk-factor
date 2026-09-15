const nodemailer = require('nodemailer');
const config = require('../config/env');

/**
 * Sending mail, over SMTP, from whatever provider the site is configured with.
 *
 * SMTP RATHER THAN A PROVIDER'S OWN API, deliberately. Every free tier worth
 * using — Brevo, Resend, Mailgun, Postmark, or a plain mailbox — speaks SMTP,
 * so moving between them is four environment variables rather than a rewrite.
 * Tying the site to one vendor's HTTP API to save a dependency is a trade the
 * wrong way round for a project whose whole hosting story is "free tiers that
 * might change their minds".
 *
 * NOT CONFIGURED IS A NORMAL STATE. On a laptop, and on the site before the
 * client has signed up anywhere, there is no SMTP server. Nothing here throws
 * in that case: `isConfigured` is false, the reminder sign-up says reminders
 * are not switched on yet, and the rest of the site is unaffected. An email
 * feature that takes the site down when the mail server is missing is a worse
 * feature than no email at all.
 */

let transport = null;

function getTransport() {
  if (!config.mail.isConfigured) return null;
  if (transport) return transport;

  transport = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    // 465 is implicit TLS; everything else starts in the clear and upgrades.
    secure: config.mail.port === 465,
    auth: { user: config.mail.user, pass: config.mail.pass },
    // A sleeping free instance means every send is a cold connection, so
    // pooling buys nothing and a stuck socket costs a whole reminder run.
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  return transport;
}

/**
 * Sends one message. Resolves `{ sent: false, reason }` rather than throwing,
 * because one bad address must not abandon the rest of a reminder run.
 */
async function sendMail({ to, subject, text, html, listUnsubscribeUrl }) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: 'SMTP is not configured' };

  try {
    const headers = {};

    /**
     * The unsubscribe link every mail client puts in its own interface, above
     * the message. A reader who cannot find the link in the footer clicks
     * "report spam" instead, and enough of those poison the sending domain for
     * everybody. One-Click is what Gmail and Yahoo now expect of bulk senders.
     */
    if (listUnsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${listUnsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const info = await mailer.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
      headers,
    });

    return { sent: true, id: info.messageId };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

/** Checks the credentials without sending anything. Used by the dashboard. */
async function verify() {
  const mailer = getTransport();
  if (!mailer) return { ok: false, reason: 'SMTP is not configured' };

  try {
    await mailer.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

/** Forgets the transport, so changed settings are picked up without a restart. */
function reset() {
  transport = null;
}

module.exports = { sendMail, verify, reset, isConfigured: () => config.mail.isConfigured };
