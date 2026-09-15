const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sanitizePlain } = require('../utils/sanitize');

/**
 * Her YouTube playlist, shown beside the tracks uploaded to the site.
 *
 * WHY BOTH, AND WHY NOT SPOTIFY
 *
 * Three ways to put a playlist on a website, and the client chose two of
 * them:
 *
 *   Uploaded files play in full for everyone, need no account, and survive
 *   the listener moving to another page, because that player lives outside
 *   the router. The cost is that somebody has to upload each track, and that
 *   a commercial recording streamed on demand needs a licence the broadcast
 *   one does not cover (APRA AMCOS and PPCA in Australia).
 *
 *   A YouTube playlist is one link. Full-length playback for everyone, no
 *   account, and nothing for the client to licence — embedding is covered by
 *   YouTube's own agreements with the rights holders. The cost is that it is
 *   an iframe on one page: navigate away and it stops.
 *
 *   Spotify was the third and is not here. Spotify's own documentation says
 *   an embed will "only stream a preview clip of less than 30 seconds" in
 *   some situations, and full playback depends on the visitor being signed in
 *   to Spotify themselves. Thirty seconds a track, for most of the audience,
 *   is not a music player.
 *
 * So: uploads for the listening experience, YouTube for the catalogue.
 */

const KEY = 'music.youtube';

const DEFAULTS = {
  enabled: false,
  playlistId: null,
  title: 'The KK Factor playlist',
  note: 'Straight from the show, on YouTube.',
};

/**
 * A playlist id out of whatever was pasted.
 *
 * People paste the address bar, and the address bar has the playlist id in
 * different places depending on whether they were watching a video at the
 * time. All three are common enough to handle.
 */
function toPlaylistId(input) {
  const value = String(input || '').trim();
  if (!value) return null;

  // Already an id. YouTube's are PL…, UU… (a channel's uploads), OLAK5uy_…
  // for auto-generated album playlists, and a few other prefixes; they are
  // all a safe alphabet and longer than a video id.
  if (/^[A-Za-z0-9_-]{12,60}$/.test(value) && !/^https?:/i.test(value)) return value;

  const match = /[?&]list=([A-Za-z0-9_-]{12,60})/.exec(value);
  return match ? match[1] : null;
}

/** GET /api/music/youtube — public. */
const getYoutubePlaylist = asyncHandler(async (_req, res) => {
  const stored = await Setting.read(KEY);
  const playlist = { ...DEFAULTS, ...(stored || {}) };

  // Never announce a playlist that has no id; the client would render an
  // empty black rectangle where the music should be.
  if (!playlist.playlistId) playlist.enabled = false;

  return res.json({ success: true, data: { playlist } });
});

/** PUT /api/music/youtube (admin). */
const setYoutubePlaylist = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const wanted = body.playlist ?? body.playlistId ?? body.url ?? '';
  const playlistId = toPlaylistId(wanted);

  if (wanted && !playlistId) {
    throw ApiError.badRequest(
      'That is not a YouTube playlist link. Open the playlist on YouTube and copy the address — it has "list=" in it.'
    );
  }

  const playlist = {
    enabled: body.enabled === undefined ? Boolean(playlistId) : Boolean(body.enabled),
    playlistId,
    title: sanitizePlain(String(body.title ?? '')).slice(0, 120) || DEFAULTS.title,
    note: sanitizePlain(String(body.note ?? '')).slice(0, 200) || DEFAULTS.note,
  };

  await Setting.write(KEY, playlist, { isPublic: true });
  return res.json({ success: true, data: { playlist } });
});

module.exports = { getYoutubePlaylist, setYoutubePlaylist, toPlaylistId, DEFAULTS, KEY };
