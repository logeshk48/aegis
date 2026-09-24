const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The date you WOKE UP, as YYYY-MM-DD in local time.
    // One record per night, so a night is never double-counted.
    date: {
      type: String,
      required: true,
    },
    sleepAt: {
      type: Date,
      default: null,
    },
    wakeAt: {
      type: Date,
      default: null,
    },
    // minutes asleep — stored rather than derived so a corrected
    // time can't silently change history elsewhere
    minutes: {
      type: Number,
      default: null,
    },
    // how we know: you told us, we guessed, or one of each
    source: {
      type: String,
      enum: ['logged', 'inferred', 'mixed'],
      default: 'inferred',
    },
    // true once you've seen it and not corrected it
    confirmed: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

sleepLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SleepLog', sleepLogSchema);