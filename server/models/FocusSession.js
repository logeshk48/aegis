const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // null means a free focus with no task attached
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // copied at start, so history survives if the task is deleted
    taskTitle: {
      type: String,
      default: 'Free focus',
    },
    plannedMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 120,
    },
    actualMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned', 'expired'],
      default: 'active',
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    // pause bookkeeping — lets the timer survive refreshes
    pausedAt: {
      type: Date,
      default: null,
    },
    pausedMs: {
      type: Number,
      default: 0,
    },
    driftStateAtStart: {
      type: String,
      enum: ['steady', 'slipping', 'drifting', 'recovering', 'unknown'],
      default: 'unknown',
    },
    isExtraRound: {
      type: Boolean,
      default: false,
    },
    reflection: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FocusSession', focusSessionSchema);