const express = require('express');
const ctrl = require('../controllers/reminderController');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { subscribeLimiter, writeLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/** Public: is the list open at all? The sign-up box asks before it renders. */
router.get('/', ctrl.status);

/** Public, and tightly limited — each call sends mail to a typed-in address. */
router.post('/subscribe', subscribeLimiter, ctrl.subscribe);

/** The links in the emails. No account, by design. */
router.get('/confirm', ctrl.confirm);
router.get('/unsubscribe', ctrl.unsubscribe);

/**
 * What a mail client sends when the reader uses its own unsubscribe button.
 * It must work with no page and no session, so it is not behind anything.
 */
router.post('/unsubscribe', ctrl.unsubscribe);

/** The outside scheduler, or an admin pressing the button in the dashboard. */
router.post('/send', writeLimiter, optionalAuth, ctrl.send);

/** Admin: how many people are on the list. */
router.get('/subscribers', requireAuth, requireAdmin, ctrl.stats);

module.exports = router;
