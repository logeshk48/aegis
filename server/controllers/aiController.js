const Task = require('../models/Task');
const { parseTasksFromText, answerUserQuestion } = require('../services/aiService');

// @desc   Parse text into tasks using AI, then save them
// @route  POST /api/ai/parse
// @access Protected
const parseAndCreateTasks = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Please provide some text to parse' });
    }

    const parsedTasks = await parseTasksFromText(text);

    if (parsedTasks.length === 0) {
      return res.status(200).json({
        message: 'No tasks found in that text.',
        tasks: [],
      });
    }

    const tasksToCreate = parsedTasks.map((task) => ({
      user: req.user._id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);

    res.status(201).json({
      message: `Created ${createdTasks.length} task(s) from your text.`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('AI parse error:', error.message);
    res.status(500).json({ message: 'Could not parse tasks', error: error.message });
  }
};

// @desc   Answer a question about the user's own data (RAG)
// @route  POST /api/ai/ask
// @access Protected
const askAboutMyData = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Please provide a question' });
    }

    const answer = await answerUserQuestion(req.user._id, question.trim());

    res.status(200).json({ question: question.trim(), answer });
  } catch (error) {
    console.error('AI ask error:', error.message);
    res.status(500).json({ message: 'Could not answer that', error: error.message });
  }
};

module.exports = { parseAndCreateTasks, askAboutMyData };