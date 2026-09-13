const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // a single durable fact, written as one short sentence
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['identity', 'pattern', 'preference', 'goal', 'struggle'],
      default: 'identity',
    },
    // how sure we are (AI-extracted memories start lower than stated ones)
    confidence: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    // where this came from
    source: {
      type: String,
      enum: ['diary', 'conversation', 'manual', 'observation'],
      default: 'diary',
    },
    // how many times this has been reinforced by new evidence
    reinforcedCount: {
      type: Number,
      default: 1,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Memory', memorySchema);