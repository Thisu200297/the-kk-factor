# Permissions and licences

What this site is allowed to publish, who said so, and when. Written down
because in two years nobody will remember, and the question only ever comes up
when somebody is unhappy.

---

## Greek City Times — republishing their articles

**Status: on.** `NEWS_FULL_TEXT=true`, so whole articles are stored and shown
on this site rather than only a headline and a link.

| | |
| --- | --- |
| What was claimed | Written permission to republish their articles **and their photographs** |
| Who claimed it | Roula Krikellis, the client |
| Told to | The site's developer |
| When | 10 September 2026 |
| Copy of the written permission | **Not provided.** Asked for; the client said it could not be sent. |

### Why that gap matters

The site currently republishes another newsroom's work in full, on the
strength of a message relayed by word of mouth. If Greek City Times ever ask
who authorised it, there is nothing here to show them.

That is the client's risk rather than the developer's — she gave the
instruction and she is the publisher — but it is worth her knowing it is a
risk, and worth someone asking once more for the email.

**If they ever object, the fix takes one minute and no code:** set
`NEWS_FULL_TEXT=false` in Render. The site drops back to a headline, a photo,
a two-line excerpt and a link to them, which needs nobody's permission.

### What to ask for, if the chance comes up again

- The email or letter itself, forwarded. Anything with a date and a sender.
- A name at Greek City Times, and their role.
- Confirmation in writing that it covers the **photographs**. Newsrooms
  routinely license agency pictures (AAP, Reuters, Getty) for their own site
  only and are not able to pass that on. The client says it is covered; a line
  in an email saying so is what would settle it.

### What the site does either way

Whether or not the full text is on, every imported story carries:

- the journalist's byline, not this site's admin account
- "Originally published by Greek City Times", above the article
- a second credit below it, and a link to the original
- `rel="canonical"` pointing at their URL, so search engines treat theirs as
  the original and their ranking is not split with ours

Those are not optional extras. They are most of what a newsroom is agreeing to
when it says yes.

---

## Music

**Not settled, and not the code's to settle.**

- **Uploaded tracks.** A broadcast licence covers playing a record on air. It
  does not cover the same recording streamed on demand from a website. If the
  files uploaded through the dashboard are commercial recordings, that is a
  separate licence — APRA AMCOS and PPCA in Australia.
- **The YouTube playlist.** Nothing to arrange. Embedding is covered by
  YouTube's own agreements with the rights holders, which is exactly why it is
  offered alongside the uploads.

---

## Logos

Every sponsor and organisation logo on the site needs that organisation's
permission to use it. Showing a body's mark can read as an endorsement by
them, which is a different claim from "she supports us".

Outstanding: Hellenic Medical Society of Australia, Greek Australian Society,
RPP FM 98.7 — their logos have not been supplied, and the site shows their
initials instead.

---

## Listener email addresses

The reminder list is double opt-in: an address does nothing until the person
clicks the link in a confirmation email. Every message carries an unsubscribe
link that works without signing in. Nothing else is collected, and the list is
not used for anything but the weekly reminder.

That is what Australian law asks for — consent, an identified sender, and a
working unsubscribe — and it is also the only defensible way to hold somebody's
address.
