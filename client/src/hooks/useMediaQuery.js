import { useEffect, useState } from 'react';

/** Matches a CSS media query in JS — used to collapse the player on mobile. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Whether the visitor has asked their system for less movement.
 *
 * index.css already flattens every animation under this query, which is right
 * for a hover transition and wrong for anything whose layout depends on the
 * animation running — a marquee frozen at frame zero shows its first few
 * items and clips the rest. Components like that need to know, so they can
 * render something else entirely rather than render something broken.
 */
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)');

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
