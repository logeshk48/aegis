const Memory = require('../models/Memory');

// @desc   Get all memories for the logged-in user
// @route  GET /api/memories
// @access Protected
const getMemories = async (req, res) => {
  try {
    const memories = await Memory.find({ user: req.user._id }).sort({
      reinforcedCount: -1,
      updatedAt: -1,
    });
    res.status(200).json(memories);
  } catch (error) {
    res.status(500).json({ message: 'Could not load memories', error: error.message });
  }
};

// @desc   Create a memory manually
// @route  POST /api/memories
// @access Protected
const createMemory = async (req, res) => {
  try {
    const { content, category } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Memory content is required' });
    }

    const memory = await Memory.create({
      user: req.user._id,
      content: content.trim(),
      category: category || 'identity',
      source: 'manual',
      confidence: 1, // you said it yourself, so it's certain
    });

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({ message: 'Could not save memory', error: error.message });
  }
};

// @desc   Edit a memory
// @route  PUT /api/memories/:id
// @access Protected
const updateMemory = async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { content, category } = req.body;
    if (content !== undefined) memory.content = content.trim();
    if (category !== undefined) memory.category = category;

    const updated = await memory.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Could not update memory', error: error.message });
  }
};

// @desc   Forget a memory
// @route  DELETE /api/memories/:id
// @access Protected
const deleteMemory = async (req, res) => {
  try {
    const memory = await Memory.findById(req.params.id);
    if (!memory) return res.status(404).json({ message: 'Memory not found' });
    if (memory.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await memory.deleteOne();
    res.status(200).json({ message: 'Forgotten', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete memory', error: error.message });
  }
};

// @desc   Forget everything (nuclear option)
// @route  DELETE /api/memories
// @access Protected
const clearMemories = async (req, res) => {
  try {
    const result = await Memory.deleteMany({ user: req.user._id });
    res.status(200).json({ message: 'All memories cleared', count: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Could not clear memories', error: error.message });
  }
};

module.exports = {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  clearMemories,
};