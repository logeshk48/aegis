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

// @desc   Get all tasks for the logged-in user
// @route  GET /api/tasks
// @access Protected
const getTasks = async (req, res) => {
  try {
    // only fetch tasks owned by this user, newest first
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Update a task
// @route  PUT /api/tasks/:id
// @access Protected
const updateTask = async (req, res) => {
  try {
    // 1. find the task by its id
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 2. make sure this task belongs to the logged-in user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this task' });
    }

    // 3. update only the fields that were provided
    const { title, description, priority, dueDate, completed } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (completed !== undefined) task.completed = completed;

    // 4. save the changes
    const updatedTask = await task.save();

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Delete a task
// @route  DELETE /api/tasks/:id
// @access Protected
const deleteTask = async (req, res) => {
  try {
    // 1. find the task
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 2. make sure it belongs to the logged-in user
    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    // 3. delete it
    await task.deleteOne();

    res.status(200).json({ message: 'Task deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask };