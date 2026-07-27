const mongoose = require('mongoose');

const diaryEntrySchema = new mongoose.Schema(
  {
    // the user who owns this entry
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // the full diary text for the day
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // the date this entry is about (YYYY-MM-DD)
    entryDate: {
      type: String,
      required: true,
    },
    // how many tasks the AI extracted from this entry (for display)
    extractedTaskCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DiaryEntry', diaryEntrySchema);