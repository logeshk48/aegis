const Task = require('../models/Task');

// @desc   Create a new task
// @route  POST /api/tasks
// @access Protected
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;

    // title is required
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    // create the task, tied to the logged-in user
    const task = await Task.create({
      user: req.user._id,      // ← the owner, from the auth middleware
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      dueDate: dueDate || null,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createTask };