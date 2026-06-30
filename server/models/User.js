const mongoose = require('mongoose');

// the "shape" of a user in our database
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,      // no two users can share an email
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,    // auto-adds createdAt and updatedAt
  }
);

// create the model from the schema, and export it
module.exports = mongoose.model('User', userSchema);