const Task = require('../models/Task');
const { KINDS } = require('../utils/classifyTask');

// null/'' clears the override; an unknown value is rejected (undefined)
const cleanKind = (k) => {
  if (k === null || k === '') return null;
  return KINDS.includes(k) ? k : undefined;
};

// null/'' clears the time; an invalid date is rejected (undefined)
const cleanDate = (d) => {
  if (d === null || d === '') return null;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

// @desc   Create a new task
// @route  POST /api/tasks
// @access Protected
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, important, kind, scheduledAt } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const scheduled = cleanDate(scheduledAt) ?? null;

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description || '',
      priority: priority || 'medium',
      // a scheduled time also sets the day it belongs to
      dueDate: dueDate || scheduled || null,
      important: !!important,
      kind: cleanKind(kind) ?? null,
      scheduledAt: scheduled,
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
    const task = await Task.findById(req.params.id).catch(() => null);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this task' });
    }

    const { title, description, priority, dueDate, completed, important, kind, scheduledAt } =
      req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (completed !== undefined) task.completed = completed;
    if (important !== undefined) task.important = important;

    if (kind !== undefined) {
      const k = cleanKind(kind);
      if (k === undefined) {
        return res.status(400).json({ message: `kind must be one of: ${KINDS.join(', ')}` });
      }
      task.kind = k;
    }

    if (scheduledAt !== undefined) {
      const s = cleanDate(scheduledAt);
      if (s === undefined) {
        return res.status(400).json({ message: 'scheduledAt is not a valid date' });
      }
      task.scheduledAt = s;
      // keep the day in sync unless a due date was sent explicitly
      if (s && dueDate === undefined) task.dueDate = s;
    }

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
    const task = await Task.findById(req.params.id).catch(() => null);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();
    res.status(200).json({ message: 'Task deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// @desc   Toggle a task's completed status
// @route  PATCH /api/tasks/:id/toggle
// @access Protected
const toggleTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).catch(() => null);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this task' });
    }

    task.completed = !task.completed;
    const updatedTask = await task.save();

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, toggleTask };