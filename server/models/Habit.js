const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
    // the user who owns this habit
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    // a list of dates (as YYYY-MM-DD strings) when the habit was completed
    completedDates: {
      type: [String],
      default: [],
    },
    // current streak count (we'll calculate and update this tomorrow)
    streak: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Habit', habitSchema);