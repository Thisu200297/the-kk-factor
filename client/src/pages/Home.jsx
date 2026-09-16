import { Link } from 'react-router-dom';
import SponsorStrip from '../components/Sponsors/SponsorStrip';
import OrganisationsPanel from '../components/Sponsors/OrganisationsPanel';
import LiveBanner from '../components/Show/LiveBanner';
import ShowSection from '../components/Show/ShowSection';
import NextShow from '../components/Show/NextShow';
import CommunityNews from '../components/News/CommunityNews';
import Icon from '../components/common/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * The KK Factor home page.
 *
 * WHAT THE PORTRAIT LEFT BEHIND. The first build followed her mockup: three
 * columns, with a framed space in the middle reading "photograph to come".
 * The photograph did not come, and a bordered box saying so is an apology
 * sitting where the best thing on the page should be — so it is gone, and her
 * picture lives on About, where there is a page to hold it.
 *
 * WHAT TOOK ITS PLACE. The one question a visitor actually arrives with is
 * "when can I hear this?", so the answer occupies the space the portrait had:
 * the next broadcast, counting down, with a calendar button. Under it, the
 * three facts that answer the same question a different way — the night, the
 * frequencies, and where to watch instead.
 *
 * WHY THE NEWS MOVED DOWN. It was a narrow column beside the hero, three
 * headlines wide enough for four words each. Given half the page it can be
 * read. Nothing was removed in this rearrangement; the crowded things were
 * given room.
 *
 * The episode band stays the only dark part of the page, so the studio reads
 * as a different room without needing a separate site.
 */

const SOCIALS = [
  { label: 'Facebook', handle: 'Roula Krikellis', href: 'https://www.facebook.com/roula.krikelliskkrockchic', icon: 'facebook' },
  { label: 'Facebook page', handle: 'The KK Factor', href: 'https://www.facebook.com/TheKkFactor/', icon: 'facebook' },
  { label: 'Instagram', handle: '@kkrockchic', href: 'https://www.instagram.com/kkrockchic/?hl=en', icon: 'instagram' },
  { label: 'TikTok', handle: '@thekkfactor', href: 'https://www.tiktok.com/@thekkfactor', icon: 'tiktok' },
  { label: 'LinkedIn', handle: 'Roula Krikellis', href: 'https://www.linkedin.com/in/roula-krikellis-26961945/', icon: 'linkedin' },
  { label: 'YouTube', handle: '@RoulaKrikellis', href: 'https://www.youtube.com/@RoulaKrikellis', icon: 'youtube', accent: true },
];

const CREED = [
  'Proud of my heritage.',
  'Passionate about my people.',
  'Committed to making a difference.',
];

export default function Home() {
  useDocumentTitle();

  return (
    <>
      <SponsorStrip />
      <LiveBanner />

      {/* ---------------------------------------------------------- hero -- */}
      <section className="relative overflow-hidden">
        {/*
          * Two soft washes of colour behind the hero. They are the only
          * decoration on the page and they are cheap: two blurred circles, no
          * image to download, and they scale to any window because nothing
          * about them has a fixed size that matters.
          */}
        <span
          className="pointer-events-none absolute -right-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-primary/12 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="container-page relative grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14 lg:py-16">
          <div className="flex flex-col gap-5">
            <Wordmark />

            <span className="h-px w-full max-w-sm bg-line" />

            <div>
              <p className="text-headline-lg">Entertainer. MC. Presenter.</p>
              <p className="text-headline-lg text-primary">Voice of our community.</p>
            </div>

            <p className="max-w-[34ch] font-display text-xl italic leading-relaxed text-fg-muted">
              Connecting communities through culture, media, events and advocacy.
            </p>

            <div className="mt-1 flex flex-wrap gap-2.5">
              <Link to="/show" className="btn-primary">
                <Icon name="play_arrow" size={18} filled />
                Listen to the show
              </Link>
              <Link to="/about" className="btn-secondary">
                About Roula
              </Link>
            </div>
          </div>

          {/* The answer to "when can I hear this?", where the portrait was. */}
          <NextShow layout="stacked" className="w-full shadow-soft" />
        </div>
      </section>

      {/* ------------------------------------------------- how to listen -- */}
      <section className="container-page pb-12" aria-label="How to listen">
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact
            icon="schedule"
            label="Every Tuesday"
            value="7:30 – 9:30 pm"
            note="Melbourne time"
          />
          <Fact
            icon="radio"
            label="On the radio"
            value="RPP FM 98.7 / 98.3"
            note="Across Melbourne"
          />
          <Fact
            icon="play_arrow"
            label="Or watch live"
            value="YouTube"
            note="@RoulaKrikellis"
            href="https://www.youtube.com/@RoulaKrikellis"
          />
        </div>
      </section>

      {/* The episodes — the dark band, and the reason most people come. */}
      <ShowSection limit={4} />

      {/* --------------------------------------------- news and partners -- */}
      <div className="container-page grid gap-10 py-12 lg:grid-cols-2 lg:gap-14">
        <CommunityNews limit={4} />
        <OrganisationsPanel />
      </div>

      {/* ------------------------------------------------------- socials -- */}
      <div className="container-page pb-12">
        <div className="mb-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <h2 className="text-label-md uppercase text-fg-muted">Follow the KK Factor</h2>
          <span className="h-px flex-1 bg-line" />
        </div>

        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-7 sm:gap-x-12">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-[120px] flex-col items-center gap-2.5 text-center"
              >
                <span
                  className={
                    'flex h-13 w-13 items-center justify-center rounded-full border p-3.5 ' +
                    'transition-all duration-200 group-hover:-translate-y-0.5 ' +
                    (social.accent
                      ? 'border-primary text-primary'
                      : 'border-line-strong text-fg group-hover:border-primary group-hover:text-primary')
                  }
                >
                  <SocialGlyph name={social.icon} />
                </span>
                <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                  {social.label}
                </span>
                <span className="-mt-1.5 text-xs text-fg">{social.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* The closing line, and the last thing on the page. */}
      <div className="bg-primary text-primary-fg">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-1.5 py-4 text-center">
          {CREED.map((line, index) => (
            <span key={line} className="flex items-center gap-8">
              {index > 0 && <span className="hidden opacity-50 sm:inline" aria-hidden="true">&bull;</span>}
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">{line}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * One of the three facts under the hero.
 *
 * They answer the same question the countdown does — when and where — for the
 * reader who wants it at a glance rather than in a panel. The YouTube one is
 * a link because it goes somewhere; the other two are not, because a card
 * that looks pressable and is not wastes a press to find out.
 */
function Fact({ icon, label, value, note, href }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-label-md uppercase text-fg-muted">{label}</span>
        <span className="mt-0.5 block truncate text-headline-sm text-fg">{value}</span>
        <span className="block text-xs text-fg-subtle">{note}</span>
      </span>
    </>
  );

  const shell =
    'flex items-center gap-3.5 rounded-card border border-line bg-surface p-4 transition duration-300 ease-apple';

  if (!href) return <div className={shell}>{inner}</div>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${shell} hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft`}
    >
      {inner}
    </a>
  );
}

/**
 * The wordmark, set in type.
 *
 * A placeholder for her real KK artwork, which has not arrived yet — it is
 * deliberately close to the proportions of the logo in her own mockup so that
 * dropping the real file in later does not move anything around it.
 */
function Wordmark() {
  return (
    <div>
      <p className="font-display text-[7rem] font-extrabold leading-[0.82] tracking-[-0.06em] text-fg">
        K<span className="text-primary">K</span>
      </p>
      <p className="-mt-4 ml-[5.5rem] font-display text-4xl italic text-primary">Rock Chic</p>
      <p className="mt-2 text-sm font-bold tracking-[0.06em] text-accent">The KK Factor</p>
    </div>
  );
}


/**
 * Simple outline marks rather than the platforms' own logos — they scale, they
 * take the page's colours, and they are ours to change.
 */
function SocialGlyph({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true };

  if (name === 'instagram') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="4.6" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'tiktok') {
    return (
      <svg {...common}>
        <circle cx="9" cy="17" r="3.4" />
        <path d="M12.4 17V4.4c.9 2.4 2.6 3.7 5.2 3.9" />
      </svg>
    );
  }
  if (name === 'linkedin') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="2.4" />
        <path d="M8 10.6V16" />
        <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
        <path d="M12 16v-3.2c0-1.3.9-2.2 2-2.2s2 .9 2 2.2V16M12 10.6V16" />
      </svg>
    );
  }
  if (name === 'youtube') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="3.4" />
        <path d="M10.6 9.6l4.4 2.4-4.4 2.4z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 8h2.5V4.6h-2.9C11 4.6 9.8 6 9.8 8.3V10H7.4v3.4h2.4V21h3.5v-7.6h2.6l.5-3.4h-3.1V8.6c0-.4.3-.6.7-.6z" />
    </svg>
  );
}
