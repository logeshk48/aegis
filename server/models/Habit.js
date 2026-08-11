const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema(
  {
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
    // which area of life this habit serves
    category: {
      type: String,
      enum: ['health', 'mind', 'craft', 'connection'],
      default: 'health',
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    completedDates: {
      type: [String],
      default: [],
    },
    streak: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Habit', habitSchema);