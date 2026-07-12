const express = require('express');
const router = express.Router();
const { createHabit, getHabits } = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

// all habit routes require login
router.use(protect);

// POST /api/habits  →  create a habit
router.post('/', createHabit);

// GET /api/habits   →  get the logged-in user's habits
router.get('/', getHabits);

module.exports = router;