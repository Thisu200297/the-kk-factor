const express = require('express');
const ctrl = require('../controllers/importController');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * `optionalAuth` rather than `requireAuth`: an admin arrives with a token, an
 * outside scheduler arrives with the shared secret and no token at all. The
 * controller decides which it got — rejecting here would lock the scheduler
 * out before it could present its secret.
 */
router.post('/run', optionalAuth, ctrl.run);

router.get('/status', requireAuth, requireAdmin, ctrl.status);

// Same two callers as /run, so the same optional auth.
router.get('/check', optionalAuth, ctrl.check);

module.exports = router;
