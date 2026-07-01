const User = require('../models/User');

// simple email format check
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// @desc   Register a new user
// @route  POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // 1. make sure all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    // clean up whitespace
    name = name.trim();
    email = email.trim().toLowerCase();

    // 2. validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // 3. validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // 4. check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 5. create the user (password gets hashed automatically by the model)
    const user = await User.create({ name, email, password });

    // 6. send back success — WITHOUT the password
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

module.exports = { registerUser };