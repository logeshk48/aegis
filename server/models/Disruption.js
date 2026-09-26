const mongoose = require('mongoose');

const disruptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Local dates, YYYY-MM-DD. `to` of null means it is still going —
    // you rarely know in advance when you will be well again.
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      enum: ['unwell', 'away', 'family', 'crunch', 'rest', 'other'],
      default: 'other',
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

disruptionSchema.index({ user: 1, from: -1 });

module.exports = mongoose.model('Disruption', disruptionSchema);