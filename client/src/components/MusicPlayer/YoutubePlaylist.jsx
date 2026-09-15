import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import { useFetch } from '../../hooks/useFetch';
import { usePlayer } from '../../hooks/usePlayer';
import { musicApi } from '../../utils/api';

/**
 * Her YouTube playlist, embedded.
 *
 * CLICK TO LOAD. The iframe is not on the page until somebody asks for it.
 * A YouTube embed pulls the best part of a megabyte and sets cookies before
 * anyone has pressed anything, on a page most visitors are only passing
 * through. The poster is a still from the playlist, served by YouTube, and
 * costs about thirty kilobytes.
 *
 * `youtube-nocookie.com` for the same reason it is used for the show: no
 * tracking cookie unless the visitor actually plays something.
 *
 * NOT PERSISTENT, and that is a real difference from the uploaded tracks. The
 * site's own player lives outside the router, so audio survives the listener
 * moving to another page. An iframe cannot: navigating away unmounts it and
 * the music stops. Both are on this page precisely so the listener can choose
 * — the tracks for listening while they read, the playlist for the catalogue.
 */
export default function YoutubePlaylist() {
  const fetcher = useCallback(() => musicApi.getYoutube(), []);
  const { data, loading } = useFetch(fetcher);
  const [loaded, setLoaded] = useState(false);

  const { isMusicPlaying, toggleMusic, isRadioPlaying, pauseRadio } = usePlayer();

  const playlist = data?.playlist;

  if (loading) {
    return <div className="aspect-video w-full animate-pulse rounded-panel bg-surface-2" />;
  }

  if (!playlist?.enabled || !playlist.playlistId) {
    return (
      <div className="rounded-panel border border-dashed border-line-strong p-8 text-center">
        <Icon name="queue_music" size={28} className="mx-auto text-fg-subtle" />
        <p className="mt-3 text-headline-sm text-fg">No playlist yet</p>
        <p className="mt-1.5 text-sm text-fg-muted">
          Paste a YouTube playlist link in the dashboard and it appears here.
        </p>
      </div>
    );
  }

  const start = () => {
    // Two things playing at once is nobody's idea of a music page, and the
    // iframe has no idea the rest of the site exists.
    if (isMusicPlaying) toggleMusic();
    if (isRadioPlaying) pauseRadio();
    setLoaded(true);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-panel bg-black">
        {loaded ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/videoseries?list=${playlist.playlistId}&autoplay=1&rel=0`}
            title={playlist.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={start}
            className="group relative block aspect-video w-full"
            aria-label={`Play ${playlist.title}`}
          >
            <img
              src={`https://i.ytimg.com/vi_webp/${playlist.playlistId}/hqdefault.webp`}
              alt=""
              loading="lazy"
              onError={(event) => {
                // A playlist id is not a video id, so the thumbnail is a
                // best effort. Falling back to the gradient is fine.
                event.currentTarget.style.display = 'none';
              }}
              className="h-full w-full object-cover opacity-70"
            />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/25 to-black/60">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lift transition-transform group-hover:scale-105">
                <Icon name="play_arrow" size={30} filled />
              </span>
              <span className="px-6 text-center text-[0.9375rem] font-semibold text-white">
                {playlist.title}
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {playlist.note && <p className="text-sm text-fg-muted">{playlist.note}</p>}
        <a
          href={`https://www.youtube.com/playlist?list=${playlist.playlistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Open on YouTube
          <Icon name="open_in_new" size={14} />
        </a>
      </div>

      <p className="text-xs text-fg-subtle">
        This one plays here on the page. The tracks tab keeps playing while you move around the
        site.
      </p>
    </div>
  );
}
