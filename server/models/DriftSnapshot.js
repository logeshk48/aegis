const mongoose = require('mongoose');

const driftSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // YYYY-MM-DD — one snapshot per day per user
    date: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      enum: ['steady', 'slipping', 'drifting', 'recovering', 'unknown'],
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    // the raw signal readings, so we can chart trends later
    signals: [
      {
        key: String,
        label: String,
        recent: Number,
        baseline: Number,
        changePct: Number,
        direction: String,
      },
    ],
    overdue: {
      type: Number,
      default: 0,
    },
    // the AI's one-line read of that day, kept for the timeline
    headline: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// one snapshot per user per day
driftSnapshotSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DriftSnapshot', driftSnapshotSchema);