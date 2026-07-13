const Habit = require('../models/Habit');

// helper: get today's date as "YYYY-MM-DD"
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

// helper: calculate the current streak from a list of completed dates
const calculateStreak = (completedDates) => {
  if (completedDates.length === 0) return 0;

  const dateSet = new Set(completedDates);
  let streak = 0;
  const current = new Date();

  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

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
      user: req.user._id,
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

// @desc   Mark a habit as done for today
// @route  PATCH /api/habits/:id/checkin
// @access Protected
const checkInHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this habit' });
    }

    const today = getToday();

    if (habit.completedDates.includes(today)) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    habit.completedDates.push(today);
    habit.streak = calculateStreak(habit.completedDates);

    const updatedHabit = await habit.save();
    res.status(200).json(updatedHabit);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Delete a habit
// @route  DELETE /api/habits/:id
// @access Protected
const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }
    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this habit' });
    }
    await habit.deleteOne();
    res.status(200).json({ message: 'Habit deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createHabit, getHabits, checkInHabit, deleteHabit };