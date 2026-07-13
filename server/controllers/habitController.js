const Habit = require('../models/Habit');

// helper: get today's date as "YYYY-MM-DD"
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

// helper: calculate the current streak from a list of completed dates
const calculateStreak = (completedDates) => {
  if (completedDates.length === 0) return 0;

  // make a Set for fast lookup
  const dateSet = new Set(completedDates);

  let streak = 0;
  const current = new Date();

  // count backwards from today, day by day, while each date is present
  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1); // step back one day
    } else {
      break; // streak broken
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

// @desc   Mark a habit as done for today
// @route  PATCH /api/habits/:id/checkin
// @access Protected
const checkInHabit = async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);

    if (!habit) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    // ownership check
    if (habit.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this habit' });
    }

    const today = getToday();

    // don't allow marking the same day twice
    if (habit.completedDates.includes(today)) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // add today and recalculate the streak
    habit.completedDates.push(today);
    habit.streak = calculateStreak(habit.completedDates);

    const updatedHabit = await habit.save();
    res.status(200).json(updatedHabit);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createHabit, getHabits, checkInHabit };