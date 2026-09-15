const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Somebody who asked to be reminded when the show is on.
 *
 * DOUBLE OPT-IN, and not as a formality. Anyone can type anyone's address into
 * a box on the internet. A row here does nothing at all until the person who
 * owns the address clicks the link in an email — so the worst a mischief-maker
 * achieves is one message their target ignores, rather than a weekly one they
 * did not ask for and cannot trace.
 *
 * It is also what the Spam Act asks of an Australian sender: consent, an
 * identified sender, and an unsubscribe that works. The unsubscribe here needs
 * no account and no password — a link in the email, and they are gone.
 *
 * The tokens are stored hashed for the same reason passwords are. They are
 * only reminder links, so the stakes are small; hashing them is three lines
 * and means a copy of this collection cannot be used to unsubscribe the whole
 * list or confirm addresses nobody agreed to.
 */
const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254, // the longest an address may be, per RFC 5321
    },

    /** False until they have clicked the link. Nothing is sent to them until then. */
    confirmed: { type: Boolean, default: false, index: true },
    confirmed_at: { type: Date, default: null },

    /** sha256 of the token in the confirmation link. Cleared once used. */
    confirm_token_hash: { type: String, default: null },

    /** sha256 of the token in every unsubscribe link. Never expires. */
    unsubscribe_token_hash: { type: String, required: true },

    /**
     * The start of the broadcast we last emailed this person about, as an ISO
     * instant. It is what stops a second reminder going out when the scheduler
     * ticks again half an hour later — per subscriber rather than one global
     * marker, so a send that fails halfway is simply retried for the people it
     * did not reach.
     */
    last_sent_for: { type: String, default: null },

    /** Rough provenance, for answering "where did this address come from?". */
    source: { type: String, default: 'site', maxlength: 40 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

subscriberSchema.index({ confirmed: 1, last_sent_for: 1 });

subscriberSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    // Tokens never leave the server, not even to an administrator.
    delete ret.confirm_token_hash;
    delete ret.unsubscribe_token_hash;
    return ret;
  },
});

/** A token for a link, and the hash to store beside it. */
subscriberSchema.statics.makeToken = function makeToken() {
  const token = crypto.randomBytes(24).toString('base64url');
  return { token, hash: crypto.createHash('sha256').update(token).digest('hex') };
};

subscriberSchema.statics.hashToken = function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
};

module.exports = mongoose.model('Subscriber', subscriberSchema);
