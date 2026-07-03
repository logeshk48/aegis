const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register  →  runs the registerUser logic
router.post('/register', registerUser);

// POST /api/auth/login  →  runs the loginUser logic
router.post('/login', loginUser);

// GET /api/auth/profile  →  protected: only works with a valid token
router.get('/profile', protect, getProfile);

module.exports = router;