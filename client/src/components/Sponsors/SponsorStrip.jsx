import { useCallback, useEffect, useState } from 'react';
import Icon from '../common/Icon';
import Modal from '../common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { partnersApi } from '../../utils/api';
import { mediaUrl } from '../../utils/constants';

/**
 * "Proudly supported by" — the strip across the top of the site.
 *
 * The brief is that every sponsor is seen, and that there may be ten to
 * twenty of them. A static grid met that by wrapping into rows, which worked
 * but pushed the site down the page and gave the twentieth sponsor the worst
 * seat in the house. The client asked for it to move instead, so it does: one
 * unbroken line drifting left, every logo passing through the middle of the
 * screen in turn.
 *
 * HOW THE LOOP HAS NO SEAM. The list is rendered twice inside one track and
 * the track is translated by exactly -50%. The moment the first copy has
 * fully left, the animation restarts with the second copy sitting precisely
 * where the first began, so there is no jump to see. The catch is that -50%
 * is only exact if the two copies are the same width *including* whatever
 * separates them — so the gap after the last tile belongs to the copy, as
 * trailing padding, and the track itself has no gap of its own. Put the gap
 * on the track and the loop slips half a gap every lap.
 *
 * WHY THE SPEED IS MEASURED RATHER THAN SET. A fixed duration means the
 * distance covered depends on how much there is to cover: three sponsors
 * would streak past and twenty would crawl, and the client adds sponsors over
 * time. The width is measured and the duration derived from it, so the strip
 * drifts at the same few pixels a second however long it grows.
 *
 * WHY THE LIST IS REPEATED RATHER THAN LEFT STILL WHEN IT FITS. This first
 * stood still whenever the sponsors already fitted the screen, on the
 * reasoning that a short clump of logos sliding through acres of empty strip
 * reads as a fault rather than a flourish. True — but the client has five
 * sponsors, which fits a desktop with room to spare, so the wall they asked
 * to see moving would have sat there motionless on the very screen they were
 * going to check it on. The fault was in the remedy, not the diagnosis: the
 * answer to a gap is to fill it, so the list is repeated as many times as it
 * takes to overrun the strip and then the belt turns. Five sponsors become a
 * continuous procession rather than a clump, and the loop stays seamless
 * because the repeated block, not the single list, is what gets halved.
 *
 * REDUCED MOTION: this wall keeps moving, and that is a decision rather
 * than an oversight.
 *
 * `prefers-reduced-motion` normally settles this on its own and the honest
 * default is to obey it — some people get genuinely ill from movement they
 * did not ask for. It was obeyed here until the client's own two machines
 * both showed a motionless bar. On Windows that flag is not only set by
 * somebody choosing "I want less motion": battery saver, performance modes
 * and some factory images all switch off animation effects, and the setting
 * roams with a Microsoft account, which is how two laptops end up agreeing.
 * So on that platform it is a noisy signal, and obeying it was costing the
 * client the feature on the very screens they check.
 *
 * What makes it defensible to keep moving anyway is the kind of movement:
 * one row of logos drifting sideways at forty-two pixels a second — no
 * parallax, no zoom, no flashing, a small band of the page — and it stops
 * for hover, for keyboard focus and for a finger held on it, which is the
 * pause mechanism WCAG 2.2.2 asks of anything that moves by itself for more
 * than five seconds.
 *
 * It is one line to give back: put `&& !reduceMotion` into `animated` below
 * and the wall returns to the wrapping grid for those visitors. If a
 * listener ever says the strip makes them unwell, that is the line.
 *
 * It also stops on hover, on keyboard focus, and while a finger is down, for
 * the plain reason that a link you cannot hit is not a link. That pause is
 * what WCAG asks of any movement that starts automatically and runs for more
 * than five seconds.
 */

/** How fast the strip drifts, in pixels a second. Slow enough to read a logo. */
const SPEED_PX_PER_SECOND = 42;

/** The gap between tiles, in pixels. Must match GAP_CLASS. */
const GAP_PX = 14;
const GAP_CLASS = 'gap-[14px]';

const SIZE = 'h-[62px] w-[122px] sm:h-[74px] sm:w-[148px]';

/** Grey by default, full colour on hover: a supporter wall, not an ad break. */
const TILE =
  `flex ${SIZE} shrink-0 items-center justify-center rounded-lg border border-line bg-white ` +
  'p-2 transition duration-300 ease-apple sm:p-2.5 ' +
  'grayscale hover:grayscale-0 hover:border-primary/40 hover:shadow-soft ' +
  'focus-visible:grayscale-0 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-primary/60 focus-visible:ring-offset-1';

export default function SponsorStrip() {
  const fetcher = useCallback(() => partnersApi.list('sponsor'), []);
  const { data, loading } = useFetch(fetcher);

  /** A sponsor with no website shows its phone and email instead. */
  const [contact, setContact] = useState(null);
  const [touching, setTouching] = useState(false);

  /**
   * The measured nodes are held in state, not in refs, because switching
   * between the moving track and the static grid replaces them — and an
   * observer still watching the node that was torn out reports a width of
   * zero, which says the wall now fits, which switches back to static, which
   * tears out the other one. It oscillated exactly that way until these
   * became state and the effect started following the node it is given.
   */
  const [tileNode, setTileNode] = useState(null);
  const [viewportNode, setViewportNode] = useState(null);

  /** One tile, and the strip showing them. Everything else is arithmetic. */
  const [tileWidth, setTileWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const sponsors = data?.items || [];
  const tileCount = sponsors.length;

  /**
   * MEASURE A TILE, NOT THE ROW.
   *
   * Measuring the row is the obvious thing and it is a trap: when the row is
   * not scrolling it is a wrapping grid, so it measures exactly as wide as
   * its container, which says it fits, which keeps it wrapping — it could
   * never start again, not on resize and not when the client adds a sponsor.
   * A tile is a fixed size, so its width answers the question without
   * depending on the answer, and the rest is multiplication.
   *
   * It still has to be watched: the tile changes size at the `sm` breakpoint
   * and the strip changes size whenever the window does, and both feed the
   * duration that holds the speed steady.
   */
  useEffect(() => {
    if (!tileNode || !viewportNode) return undefined;

    const measure = () => {
      const tile = tileNode.getBoundingClientRect().width;
      const viewport = viewportNode.getBoundingClientRect().width;
      // A detached or not-yet-laid-out node measures zero. That is an absence
      // of information, not a very small wall.
      if (tile > 0) setTileWidth(tile);
      if (viewport > 0) setViewportWidth(viewport);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(tileNode);
    observer.observe(viewportNode);
    return () => observer.disconnect();
  }, [tileNode, viewportNode]);

  /** One pass of the sponsor list: every tile, each carrying its trailing gap. */
  const listWidth = tileCount * (tileWidth + GAP_PX);

  /**
   * How many passes it takes to overrun the strip. One is enough the moment
   * the sponsors already exceed the width; five sponsors on a desktop need
   * two or three. The belt is then this block rendered twice and shifted by
   * half, so the seam still lands exactly.
   */
  const repeats = listWidth > 0 ? Math.max(1, Math.ceil(viewportWidth / listWidth)) : 1;

  /** What the animation travels before it starts again. */
  const beltWidth = repeats * listWidth;

  const animated = tileWidth > 0 && !loading;

  const paused = Boolean(contact) || touching;

  const open = (sponsor) => {
    partnersApi.registerClick(sponsor.id);
    if (sponsor.website_url) {
      window.open(sponsor.website_url, '_blank', 'noopener,noreferrer');
    } else {
      setContact(sponsor);
    }
  };

  /**
   * No sponsors, no strip.
   *
   * There used to be three dashed "your logo here" tiles here, so the wall
   * never looked bare. They went because they were padding: on a wall of five
   * real sponsors they were three eighths of what was moving past, and a
   * reader counting logos was counting placeholders. The invitation survives
   * as the line underneath, which says the same thing without taking a seat
   * from a business that paid for one.
   *
   * That leaves the empty case with nothing to draw, and an empty bordered
   * band under a heading reading "Proudly supported by" is worse than no band
   * at all — so the section removes itself until there is something in it.
   */
  if (!loading && sponsors.length === 0) return null;

  const copy = { sponsors, onOpen: open, measureRef: setTileNode };

  return (
    <section className="border-b border-line bg-surface" aria-label="Our sponsors">
      <div className="container-page py-5">
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <h2 className="text-label-md uppercase text-fg-muted">Proudly supported by</h2>
          <span className="h-px flex-1 bg-line" />
        </div>

        {loading ? (
          <div className={`flex justify-center ${GAP_CLASS}`}>
            {[0, 1, 2, 3, 4].map((key) => (
              <div key={key} className={`skeleton ${SIZE} rounded-lg`} />
            ))}
          </div>
        ) : (
          <div
            ref={setViewportNode}
            /**
             * Bleeding to the gutter edges and fading there while it moves: a
             * tile that simply vanished at a hard border would read as broken
             * layout, where a fade reads as "there is more of this".
             *
             * The negative margin has to cancel `container-page`'s padding
             * exactly, and that padding changes with the breakpoint — 16, 24,
             * 40. A flat -20px was close enough to look right and four pixels
             * too wide on a phone, which is all it takes to make the whole
             * page scroll sideways.
             */
            className={
              '-mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10' +
              (animated
                ? ' [mask-image:linear-gradient(to_right,transparent,black_36px,black_calc(100%-36px),transparent)]'
                : '')
            }
            onTouchStart={() => setTouching(true)}
            onTouchEnd={() => setTouching(false)}
            onTouchCancel={() => setTouching(false)}
          >
            {animated ? (
              <div
                /**
                 * `marquee-track` is not decoration: it is what outranks the
                 * global reduced-motion reset in index.css, which is `*`
                 * with !important and would otherwise stop this dead at
                 * frame zero. The duration rides along as a custom property
                 * for the same reason — the reset rewrites
                 * `animation-duration`, but it cannot touch a variable.
                 */
                className={
                  'marquee-track flex w-max animate-marquee ' +
                  'hover:[animation-play-state:paused] ' +
                  'focus-within:[animation-play-state:paused]' +
                  (paused ? ' [animation-play-state:paused]' : '')
                }
                style={{
                  '--marquee-duration': `${(beltWidth / SPEED_PX_PER_SECOND).toFixed(2)}s`,
                  animationDuration: `${(beltWidth / SPEED_PX_PER_SECOND).toFixed(2)}s`,
                }}
              >
                {Array.from({ length: repeats * 2 }).map((_, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <SponsorRow key={index} {...copy} clone={index > 0} />
                ))}
              </div>
            ) : (
              /**
               * Standing still: centre it and let it wrap. The second copy is
               * not rendered at all — with nothing scrolling it would simply
               * be every sponsor listed twice.
               */
              <SponsorRow {...copy} wrap />
            )}
          </div>
        )}

        <p className="mt-3.5 text-center text-xs text-fg-muted">
          Room for more —{' '}
          <a href="/contact" className="font-medium text-primary hover:underline">
            become a KK Factor partner
          </a>
        </p>
      </div>

      <Modal
        open={Boolean(contact)}
        onClose={() => setContact(null)}
        title={contact?.name || ''}
        size="sm"
      >
        <div className="space-y-4">
          {contact?.logo_url && (
            <div className="flex h-24 items-center justify-center rounded-xl border border-line bg-white p-4">
              <img
                src={mediaUrl(contact.logo_url)}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          {contact?.description && <p className="text-sm text-fg-muted">{contact.description}</p>}

          <div className="flex flex-col gap-2">
            {contact?.phone && (
              <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="btn-secondary justify-start">
                <Icon name="headphones" size={18} />
                {contact.phone}
              </a>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="btn-secondary justify-start">
                <Icon name="email" size={18} />
                {contact.email}
              </a>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}

/**
 * One copy of the wall.
 *
 * Scrolling, it is a single unbroken line carrying its own trailing gap, so
 * that two side by side are exactly twice one and -50% lands without a seam.
 * Standing still, it wraps and centres instead.
 *
 * The second copy is scenery: hidden from screen readers and skipped by the
 * Tab key, so the wall is announced and tabbed through once, not twice.
 *
 * Declared out here rather than inside SponsorStrip on purpose. A component
 * defined during render is a new type on every render, so React throws the
 * whole subtree away and builds it again each time — which loses focus, and
 * which detached the very tile being measured.
 */
function SponsorRow({ sponsors, onOpen, measureRef, clone = false, wrap = false }) {
  return (
    <div
      className={
        wrap
          ? `flex flex-wrap items-center justify-center ${GAP_CLASS}`
          : `flex shrink-0 items-center ${GAP_CLASS} pr-[14px]`
      }
      aria-hidden={clone || undefined}
    >
      {sponsors.map((sponsor, index) => (
        <button
          key={sponsor.id}
          ref={!clone && index === 0 ? measureRef : undefined}
          type="button"
          tabIndex={clone ? -1 : undefined}
          onClick={() => onOpen(sponsor)}
          className={TILE}
          title={sponsor.name}
          aria-label={
            sponsor.website_url ? `Visit ${sponsor.name}` : `Contact details for ${sponsor.name}`
          }
        >
          <SponsorMark sponsor={sponsor} />
        </button>
      ))}

    </div>
  );
}

/** The logo, or the sponsor's name set in type when no file has arrived yet. */
function SponsorMark({ sponsor }) {
  if (sponsor.logo_url) {
    return (
      <img
        src={mediaUrl(sponsor.logo_url)}
        alt={sponsor.name}
        loading="lazy"
        draggable="false"
        className="max-h-full max-w-full object-contain"
      />
    );
  }
  return (
    <span className="px-1 text-center text-[0.6875rem] font-semibold leading-tight text-fg">
      {sponsor.name}
    </span>
  );
}

