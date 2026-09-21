const { runAgent } = require('../services/agentService');

// @desc   Send a message to the agent
// @route  POST /api/agent
// @access Protected
const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Say something first.' });
    }

    // only keep recent turns, and only plain text ones
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
          )
          .slice(-6)
      : [];

    const result = await runAgent(req.user._id, message.trim(), safeHistory);

    res.status(200).json(result);
  } catch (error) {
    console.error('Agent error:', error.message);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = { chat };