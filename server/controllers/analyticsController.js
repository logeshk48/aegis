const Task = require('../models/Task');
const Habit = require('../models/Habit');

// @desc   Get analytics/stats for the logged-in user
// @route  GET /api/analytics
// @access Protected
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // --- TASK STATS ---
    // total tasks and how many are completed
    const totalTasks = await Task.countDocuments({ user: userId });
    const completedTasks = await Task.countDocuments({ user: userId, completed: true });
    const pendingTasks = totalTasks - completedTasks;

    // tasks grouped by priority (using aggregation)
    const tasksByPriority = await Task.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // --- HABIT STATS ---
    const totalHabits = await Habit.countDocuments({ user: userId });

    // the best (highest) current streak among habits
    const habits = await Habit.find({ user: userId });
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    // total habit check-ins across all habits (sum of all completedDates lengths)
    const totalCheckIns = habits.reduce(
      (sum, h) => sum + (h.completedDates ? h.completedDates.length : 0),
      0
    );

    // --- send it all back ---
    res.status(200).json({
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        byPriority: tasksByPriority, // e.g. [{ _id: 'high', count: 3 }, ...]
      },
      habits: {
        total: totalHabits,
        bestStreak,
        totalCheckIns,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not load analytics', error: error.message });
  }
};

module.exports = { getAnalytics };