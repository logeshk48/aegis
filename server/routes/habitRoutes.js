const express = require('express');
const router = express.Router();
const {
  createHabit,
  getHabits,
  checkInHabit,
  deleteHabit,
} = require('../controllers/habitController');
const { protect } = require('../middleware/authMiddleware');

// all habit routes require login
router.use(protect);

// POST /api/habits              →  create a habit
router.post('/', createHabit);

// GET /api/habits               →  get the logged-in user's habits
router.get('/', getHabits);

// PATCH /api/habits/:id/checkin →  mark habit done for today
router.patch('/:id/checkin', checkInHabit);

// DELETE /api/habits/:id        →  delete a habit
router.delete('/:id', deleteHabit);

module.exports = router;