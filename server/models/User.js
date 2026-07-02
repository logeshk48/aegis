const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// BEFORE saving a user, automatically hash their password
userSchema.pre('save', async function () {
  // only hash if the password is new or was changed
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// METHOD: check if a typed password matches this user's stored hash
userSchema.methods.matchPassword = async function (typedPassword) {
  return await bcrypt.compare(typedPassword, this.password);
};

// create the model from the schema, and export it
module.exports = mongoose.model('User', userSchema);