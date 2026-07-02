const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// POST /api/auth/register  →  runs the registerUser logic
router.post('/register', registerUser);

// POST /api/auth/login  →  runs the loginUser logic
router.post('/login', loginUser);

module.exports = router;