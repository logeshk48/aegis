const Habit = require('../models/Habit');

// @desc   Create a new habit
// @route  POST /api/habits
// @access Protected
const createHabit = async (req, res) => {
  try {
    const { name, frequency } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Habit name is required' });
    }

    const habit = await Habit.create({
      user: req.user._id,          // owner, from auth middleware
      name: name.trim(),
      frequency: frequency || 'daily',
    });

    res.status(201).json(habit);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Get all habits for the logged-in user
// @route  GET /api/habits
// @access Protected
const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(habits);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createHabit, getHabits };