const DiaryEntry = require('../models/DiaryEntry');
const Task = require('../models/Task');
const { parseTasksFromText } = require('../services/aiService');
const { extractAndStoreMemories } = require('../services/memoryService');

// helper: today's date as YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];

// @desc   Create a diary entry (auto-extracts tasks and memories)
// @route  POST /api/diary
// @access Protected
const createEntry = async (req, res) => {
  try {
    const { content, entryDate } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Diary content is required' });
    }

    // Two independent AI calls. Run them together — one after the other
    // meant writing an entry waited on two round trips.
    // allSettled so neither can take the entry down with it.
    const [taskResult, memoryResult] = await Promise.allSettled([
      parseTasksFromText(content),
      extractAndStoreMemories(req.user._id, content, 'diary'),
    ]);

    let createdTasks = [];
    if (taskResult.status === 'fulfilled' && taskResult.value?.length > 0) {
      try {
        const tasksToCreate = taskResult.value.map((task) => ({
          user: req.user._id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
        }));
        createdTasks = await Task.insertMany(tasksToCreate);
      } catch (insertErr) {
        console.error('Task insert failed (entry still saved):', insertErr.message);
      }
    } else if (taskResult.status === 'rejected') {
      console.error('Task extraction failed (entry still saved):', taskResult.reason?.message);
    }

    const learned =
      memoryResult.status === 'fulfilled' && Array.isArray(memoryResult.value)
        ? memoryResult.value
        : [];
    if (memoryResult.status === 'rejected') {
      console.error('Memory extraction failed (entry still saved):', memoryResult.reason?.message);
    }

    // --- save the entry ---
    const entry = await DiaryEntry.create({
      user: req.user._id,
      content: content.trim(),
      entryDate: entryDate || getToday(),
      extractedTaskCount: createdTasks.length,
    });

    // --- compose the response message ---
    const parts = [];
    if (createdTasks.length > 0) {
      parts.push(`${createdTasks.length} task${createdTasks.length > 1 ? 's' : ''} drawn out`);
    }
    if (learned.length > 0) {
      parts.push(`${learned.length} thing${learned.length > 1 ? 's' : ''} learned about you`);
    }

    const message = parts.length > 0 ? `Kept — ${parts.join(', ')}.` : 'Kept.';

    res.status(201).json({
      entry,
      extractedTasks: createdTasks,
      learnedMemories: learned,
      message,
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
    const entries = await DiaryEntry.find({ user: req.user._id }).sort({
      entryDate: -1,
      createdAt: -1,
    });
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