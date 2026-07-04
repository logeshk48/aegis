const User = require('../models/User');
const jwt = require('jsonwebtoken');

// helper: short-lived access token (used on every request)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '15m', // 15 minutes
  });
};

// helper: long-lived refresh token (only used to get new access tokens)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d', // 7 days
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      refreshToken, // temporary — in Commit 4 we'll move this into a secure cookie
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

// @desc   Get the logged-in user's profile
// @route  GET /api/auth/profile  (protected)
const getProfile = async (req, res) => {
  // req.user was attached by the protect middleware
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
};

module.exports = { registerUser, loginUser, getProfile };