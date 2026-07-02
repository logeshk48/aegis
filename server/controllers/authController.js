const User = require('../models/User');
const jwt = require('jsonwebtoken');

// helper: create a signed JWT for a given user id
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d', // token stays valid for 7 days
  });
};

// simple email format check
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// @desc   Register a new user
// @route  POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Log in an existing user
// @route  POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    // 1. make sure both fields are provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    email = email.trim().toLowerCase();

    // 2. find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. check the password using the method we built
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 4. success — create a token and send it back
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { registerUser, loginUser };