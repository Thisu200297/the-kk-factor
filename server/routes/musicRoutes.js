const express = require('express');
const ctrl = require('../controllers/musicController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/** Public: the playlist the Music page embeds. */
router.get('/youtube', ctrl.getYoutubePlaylist);

/** Admin: paste a YouTube playlist link. */
router.put('/youtube', writeLimiter, requireAuth, requireAdmin, ctrl.setYoutubePlaylist);

module.exports = router;
