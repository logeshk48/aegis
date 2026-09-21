const mongoose = require('mongoose');

// One row per user per day = "today's brief has been sent".
// The unique index is what makes retries safe.
const digestLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // the user's local calendar date, YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

digestLogSchema.index({ user: 1, date: 1 }, { unique: true });

// old rows clean themselves up after 30 days
digestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('DigestLog', digestLogSchema);