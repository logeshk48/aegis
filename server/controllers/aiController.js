const Task = require('../models/Task');
const { parseTasksFromText } = require('../services/aiService');

// @desc   Parse text into tasks using AI, then save them
// @route  POST /api/ai/parse
// @access Protected
const parseAndCreateTasks = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Please provide some text to parse' });
    }

    // 1. ask the AI to extract validated tasks
    const parsedTasks = await parseTasksFromText(text);

    if (parsedTasks.length === 0) {
      return res.status(200).json({
        message: 'No tasks found in that text.',
        tasks: [],
      });
    }

    // 2. save each parsed task, tied to the logged-in user
    const tasksToCreate = parsedTasks.map((task) => ({
      user: req.user._id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);

    // 3. return the created tasks
    res.status(201).json({
      message: `Created ${createdTasks.length} task(s) from your text.`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('AI parse error:', error.message);
    res.status(500).json({ message: 'Could not parse tasks', error: error.message });
  }
};

module.exports = { parseAndCreateTasks };