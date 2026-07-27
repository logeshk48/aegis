const DiaryEntry = require('../models/DiaryEntry');
const Task = require('../models/Task');
const { parseTasksFromText } = require('../services/aiService');

// helper: today's date as YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];

// @desc   Create a diary entry (and auto-extract tasks from it)
// @route  POST /api/diary
// @access Protected
const createEntry = async (req, res) => {
  try {
    const { content, entryDate } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Diary content is required' });
    }

    // extract tasks from the diary text using the AI (reusing existing function)
    let createdTasks = [];
    try {
      const parsedTasks = await parseTasksFromText(content);
      if (parsedTasks.length > 0) {
        const tasksToCreate = parsedTasks.map((task) => ({
          user: req.user._id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
        }));
        createdTasks = await Task.insertMany(tasksToCreate);
      }
    } catch (aiErr) {
      // if AI extraction fails, we still save the diary entry — it's not critical
      console.error('Task extraction failed (entry still saved):', aiErr.message);
    }

    // save the diary entry, recording how many tasks were extracted
    const entry = await DiaryEntry.create({
      user: req.user._id,
      content: content.trim(),
      entryDate: entryDate || getToday(),
      extractedTaskCount: createdTasks.length,
    });

    res.status(201).json({
      entry,
      extractedTasks: createdTasks,
      message:
        createdTasks.length > 0
          ? `Saved your entry and found ${createdTasks.length} task(s).`
          : 'Saved your entry.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not save entry', error: error.message });
  }
};

// @desc   Get all diary entries for the user (newest first)
// @route  GET /api/diary
// @access Protected
const getEntries = async (req, res) => {
  try {
    const entries = await DiaryEntry.find({ user: req.user._id }).sort({ entryDate: -1, createdAt: -1 });
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Could not load entries', error: error.message });
  }
};

// @desc   Delete a diary entry
// @route  DELETE /api/diary/:id
// @access Protected
const deleteEntry = async (req, res) => {
  try {
    const entry = await DiaryEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    if (entry.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await entry.deleteOne();
    res.status(200).json({ message: 'Entry deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete entry', error: error.message });
  }
};

module.exports = { createEntry, getEntries, deleteEntry };