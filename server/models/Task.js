const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    // the user who owns this task
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',           // links to the User model
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],  // only these values allowed
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,   // auto-adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Task', taskSchema);