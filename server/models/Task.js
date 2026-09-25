const mongoose = require('mongoose');
const { classifyTask } = require('../utils/classifyTask');

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    // kept for backwards compatibility + AI parsing
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    important: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // the user's override of the auto-detected kind — null means "let Aegis decide"
    kind: {
      type: String,
      enum: ['focus', 'errand', 'quick', 'activity', null],
      default: null,
    },
    // an exact planned time — used for errands and activities
    scheduledAt: {
      type: Date,
      default: null,
    },
    // How many separate DAYS this has been the mission and survived it.
    // Not page loads: refreshing Home ten times is one offer.
    offeredDays: {
      type: Number,
      default: 0,
    },
    lastOfferedOn: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// what kind this task actually is: the user's choice, or the title-based guess
taskSchema.virtual('effectiveKind').get(function () {
  return this.kind || classifyTask(this.title);
});

module.exports = mongoose.model('Task', taskSchema);