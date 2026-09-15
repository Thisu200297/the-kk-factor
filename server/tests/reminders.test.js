/**
 * The reminder list.
 *
 * Sending mail is the part that needs a server, so it is not tested here.
 * What is tested is everything that decides WHO gets a message and WHETHER
 * one is due — which is where the mistakes that reach a reader's inbox live.
 */
const Subscriber = require('../models/Subscriber');
const { formatWhen, escapeHtml, reminderMail, confirmationMail, WINDOW_MINUTES } =
  require('../services/reminders');

describe('tokens', () => {
  it('makes a token and a hash that agree', () => {
    const { token, hash } = Subscriber.makeToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(Subscriber.hashToken(token)).toBe(hash);
  });

  it('makes a different one every time', () => {
    const seen = new Set();
    for (let i = 0; i < 50; i += 1) seen.add(Subscriber.makeToken().token);
    expect(seen.size).toBe(50);
  });

  it('hashes to something that is not the token', () => {
    // The point of storing the hash: a copy of the collection must not let
    // anyone unsubscribe the whole list or confirm addresses nobody agreed to.
    const { token, hash } = Subscriber.makeToken();
    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('does not throw on a missing token', () => {
    expect(Subscriber.hashToken(undefined)).toMatch(/^[a-f0-9]{64}$/);
    expect(Subscriber.hashToken(null)).toBe(Subscriber.hashToken(''));
  });
});

describe('formatWhen', () => {
  it('says the time in her zone, not the server\'s', () => {
    // 09:30 UTC is 7.30pm in Melbourne in September. A server in the United
    // States formatting this in its own zone would tell listeners 5.30am.
    const out = formatWhen('2026-09-15T09:30:00.000Z', 'Australia/Melbourne');
    expect(out).toMatch(/Tuesday/);
    expect(out).toMatch(/7:30/);
    expect(out).toMatch(/pm/i);
  });

  it('falls back to Melbourne rather than to the server', () => {
    const out = formatWhen('2026-09-15T09:30:00.000Z', null);
    expect(out).toMatch(/7:30/);
  });
});

describe('escapeHtml', () => {
  it('escapes what would otherwise be markup in an email', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('Rock & Roll')).toBe('Rock &amp; Roll');
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('survives null', () => {
    expect(escapeHtml(null)).toBe('');
  });
});

describe('the reminder message', () => {
  const schedule = {
    title: 'The Greek Eurobeat Show',
    note: 'Live on RPP FM 98.7 / 98.3',
    timezone: 'Australia/Melbourne',
    abbreviation: 'AEST',
  };
  const mail = reminderMail({
    schedule,
    startsAt: '2026-09-15T09:30:00.000Z',
    unsubscribeUrl: 'https://the-kk-factor.onrender.com/api/reminders/unsubscribe?token=abc',
  });

  it('says when, in her time', () => {
    expect(mail.text).toMatch(/Tuesday/);
    expect(mail.text).toMatch(/7:30/);
    expect(mail.subject).toContain('The Greek Eurobeat Show');
  });

  it('carries an unsubscribe link in both the text and the html', () => {
    // Required of an Australian sender, and the thing that stops a reader
    // reaching for "report spam" instead.
    expect(mail.text).toContain('/api/reminders/unsubscribe?token=abc');
    expect(mail.html).toContain('/api/reminders/unsubscribe?token=abc');
  });

  it('has a plain-text part, not only html', () => {
    expect(mail.text.length).toBeGreaterThan(50);
    expect(mail.text).not.toMatch(/<[a-z]/i);
  });

  it('does not put a title containing markup into the html unescaped', () => {
    const nasty = reminderMail({
      schedule: { ...schedule, title: '<img src=x onerror=alert(1)>' },
      startsAt: '2026-09-15T09:30:00.000Z',
      unsubscribeUrl: 'https://x/u',
    });
    expect(nasty.html).not.toMatch(/<img src=x/);
    expect(nasty.html).toContain('&lt;img');
  });
});

describe('the confirmation message', () => {
  const mail = confirmationMail({ email: 'someone@example.com', token: 'tok123' });

  it('carries the link and says who it is for', () => {
    expect(mail.text).toContain('token=tok123');
    expect(mail.text).toContain('someone@example.com');
    expect(mail.html).toContain('token=tok123');
  });

  it('tells somebody who did not ask for it that they can ignore it', () => {
    // This is the whole of what makes a public subscribe box safe: the worst
    // a mischief-maker achieves is one message their target ignores.
    expect(mail.text.toLowerCase()).toMatch(/ignore this message/);
    expect(mail.html.toLowerCase()).toMatch(/ignore this message/);
  });

  it('escapes the address, which came from a stranger', () => {
    const nasty = confirmationMail({ email: '<b>x</b>@example.com', token: 't' });
    expect(nasty.html).not.toContain('<b>x</b>');
  });
});

describe('the window', () => {
  it('is longer than the half-hourly check that triggers it', () => {
    // If the window were shorter than the gap between ticks, a Tuesday could
    // pass with the show going out and no reminder sent at all.
    expect(WINDOW_MINUTES).toBeGreaterThan(30);
  });
});
