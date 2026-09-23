const DiaryEntry = require('../models/DiaryEntry');
const { saveEntry } = require('../services/diaryService');

// @desc   Create a diary entry (auto-extracts tasks and memories)
// @route  POST /api/diary
// @access Protected
const createEntry = async (req, res) => {
  try {
    const { content, entryDate } = req.body;
    const result = await saveEntry(req.user._id, { content, entryDate });

    res.status(201).json({
      entry: result.entry,
      extractedTasks: result.createdTasks,
      learnedMemories: result.learned,
      message: result.message,
    });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.status ? error.message : 'Could not save entry', error: error.message });
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