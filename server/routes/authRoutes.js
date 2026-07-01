const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// POST /api/auth/register  →  runs the registerUser logic
router.post('/register', registerUser);

module.exports = router;