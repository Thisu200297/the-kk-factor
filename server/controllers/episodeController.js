const { Episode, Setting } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uniqueSlug } = require('../utils/slugify');
const { sanitizePlain } = require('../utils/sanitize');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(value);

/**
 * How much of the archive the public sees.
 *
 * The YouTube importer takes the channel's latest fifteen, which is the right
 * amount to HOLD: a correction, a re-ordering or a change of mind then costs
 * nothing, because the episodes are already here. How many to SHOW is a
 * different question, and the answer today is three — she wants the archive
 * short while the show is young, and did not want fifteen on the page.
 *
 * So it is a setting rather than a constant, and it caps the view rather than
 * the import. Deciding to show six next month is then a number in the
 * dashboard instead of a re-import and a deploy, and nothing has been thrown
 * away in the meantime. Newer episodes still arrive on their own; they simply
 * take the top of a list this long.
 *
 * Zero means no cap. Administrators always see everything, because a cap that
 * hid episodes from the person managing them would make the dashboard lie.
 */
const ARCHIVE_KEY = 'show.archive';
const ARCHIVE_DEFAULTS = { limit: 3 };

async function archiveLimit() {
  const stored = await Setting.read(ARCHIVE_KEY);
  const value = Number.parseInt(stored?.limit, 10);
  if (!Number.isFinite(value) || value < 0) return ARCHIVE_DEFAULTS.limit;
  return value;
}

/**
 * How a cap turns into one page of a shortened archive.
 *
 * Pure arithmetic, exported, and tested — because the obvious version of this
 * is wrong in a way nobody notices until a visitor clicks. Capping only the
 * page size still reports the real total, so the pager offers a page two that
 * the cap then answers with nothing. The total has to shrink first, and the
 * page takes whatever is left of it.
 */
function clampToArchive({ total, cap, offset, limit }) {
  const visible = cap > 0 ? Math.min(total, cap) : total;
  const take = Math.min(limit, Math.max(0, visible - offset));
  return { visible, take };
}

/**
 * What a listener is allowed to see.
 *
 * Hidden episodes are for admins only. Premium episodes are listed for
 * everyone — being able to see that something exists is the point of a
 * premium tier — but `locked` marks the ones this viewer cannot play, and
 * the playable URLs are stripped from those before the response leaves here.
 */
function visibleFilter(req) {
  if (req.user?.role === 'admin') return {};
  return { status: 'published' };
}

function canPlay(episode, user) {
  if (episode.tier !== 'premium') return true;
  return user?.role === 'admin' || user?.tier === 'premium';
}

/** Strips the playable sources from an episode this viewer may not play. */
function forViewer(episode, user) {
  const json = episode.toJSON();
  const playable = canPlay(episode, user);
  json.locked = !playable;
  if (!playable) {
    json.video_url = null;
    json.audio_url = null;
    json.youtube_id = null;
  }
  return json;
}

/** GET /api/episodes */
const listEpisodes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query, { defaultLimit: 12, maxLimit: 60 });
  const filter = visibleFilter(req);

  const isAdmin = req.user?.role === 'admin';
  const cap = isAdmin ? 0 : await archiveLimit();

  const total = await Episode.countDocuments(filter);
  const { visible, take } = clampToArchive({ total, cap, offset, limit });

  const rows = take
    ? await Episode.find(filter)
        .sort({ is_featured: -1, published_at: -1 })
        .skip(offset)
        .limit(take)
    : [];

  const data = paginatedResponse({ count: visible, rows }, page, limit);
  data.items = data.items.map((episode) => forViewer(episode, req.user));
  return res.json({ success: true, data });
});

/** GET /api/episodes/archive — how many are shown. Public, so the page knows. */
const getArchiveSettings = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: { archive: { limit: await archiveLimit() } } })
);

/** PUT /api/episodes/archive (admin). */
const setArchiveSettings = asyncHandler(async (req, res) => {
  const raw = req.body?.limit;
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value) || value < 0 || value > 500) {
    throw ApiError.badRequest('Give a whole number of episodes to show, or 0 for all of them.');
  }

  const archive = { limit: value };
  await Setting.write(ARCHIVE_KEY, archive, { isPublic: true });
  return res.json({ success: true, data: { archive } });
});

/**
 * GET /api/episodes/latest
 *
 * Powers the big player at the top of the show section, so it answers with the
 * featured episode if there is one and the newest otherwise — the home page
 * should never have to make that decision itself.
 */
const latestEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findOne({ status: 'published' }).sort({
    is_featured: -1,
    published_at: -1,
  });

  if (!episode) return res.json({ success: true, data: { episode: null } });
  return res.json({ success: true, data: { episode: forViewer(episode, req.user) } });
});

/** GET /api/episodes/:id — accepts an id or a slug. */
const getEpisode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const episode = await Episode.findOne(isObjectId(id) ? { _id: id } : { slug: id });

  if (!episode) throw ApiError.notFound('Episode not found');
  if (episode.status !== 'published' && req.user?.role !== 'admin') {
    throw ApiError.notFound('Episode not found');
  }

  return res.json({ success: true, data: { episode: forViewer(episode, req.user) } });
});

/**
 * POST /api/episodes (admin)
 *
 * For an episode that did not come from YouTube — an uploaded recording, or
 * one added by hand before the feed catches up.
 */
const createEpisode = asyncHandler(async (req, res) => {
  const title = sanitizePlain(req.body.title);

  const episode = await Episode.create({
    title,
    slug: await uniqueSlug(Episode, title),
    source: req.body.audioUrl ? 'upload' : 'youtube',
    youtube_id: req.body.youtubeId || undefined,
    video_url: req.body.videoUrl || null,
    audio_url: req.body.audioUrl || null,
    thumbnail_url: req.body.thumbnailUrl || null,
    description: sanitizePlain(req.body.description) || null,
    published_at: req.body.publishedAt ? new Date(req.body.publishedAt) : new Date(),
    duration: Number.parseInt(req.body.duration, 10) || 0,
    status: req.body.status || 'published',
    tier: req.body.tier || 'normal',
    is_featured: Boolean(req.body.isFeatured),
  });

  return res.status(201).json({ success: true, data: { episode } });
});

/** PUT /api/episodes/:id (admin) */
const updateEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findById(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');

  if (req.body.title !== undefined) {
    episode.title = sanitizePlain(req.body.title);
    episode.slug = await uniqueSlug(Episode, episode.title, episode._id);
  }
  if (req.body.description !== undefined) {
    episode.description = sanitizePlain(req.body.description) || null;
  }
  if (req.body.thumbnailUrl !== undefined) episode.thumbnail_url = req.body.thumbnailUrl || null;
  if (req.body.videoUrl !== undefined) episode.video_url = req.body.videoUrl || null;
  if (req.body.audioUrl !== undefined) episode.audio_url = req.body.audioUrl || null;
  if (req.body.duration !== undefined) episode.duration = Number.parseInt(req.body.duration, 10) || 0;
  if (req.body.status !== undefined) episode.status = req.body.status;
  if (req.body.tier !== undefined) episode.tier = req.body.tier;
  if (req.body.publishedAt !== undefined) episode.published_at = new Date(req.body.publishedAt);

  /**
   * Featuring is exclusive — the show page has one slot at the top. Clearing
   * the old one here means an editor never has to remember to un-feature it.
   */
  if (req.body.isFeatured !== undefined) {
    episode.is_featured = Boolean(req.body.isFeatured);
    if (episode.is_featured) {
      await Episode.updateMany(
        { _id: { $ne: episode._id }, is_featured: true },
        { $set: { is_featured: false } }
      );
    }
  }

  await episode.save();
  return res.json({ success: true, data: { episode } });
});

/** DELETE /api/episodes/:id (admin) */
const deleteEpisode = asyncHandler(async (req, res) => {
  const episode = await Episode.findByIdAndDelete(req.params.id);
  if (!episode) throw ApiError.notFound('Episode not found');
  return res.json({ success: true, data: { message: 'Episode removed', id: req.params.id } });
});

/** POST /api/episodes/:id/play — play counter, same shape as tracks. */
const registerPlay = asyncHandler(async (req, res) => {
  const episode = await Episode.findByIdAndUpdate(
    req.params.id,
    { $inc: { plays: 1 } },
    { returnDocument: 'after' }
  );
  if (!episode) throw ApiError.notFound('Episode not found');
  return res.json({ success: true, data: { id: String(episode._id), plays: episode.plays } });
});

module.exports = {
  listEpisodes,
  latestEpisode,
  getEpisode,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  registerPlay,
  getArchiveSettings,
  setArchiveSettings,
  ARCHIVE_KEY,
  ARCHIVE_DEFAULTS,
  clampToArchive,
};
