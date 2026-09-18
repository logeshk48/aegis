const { getPatterns } = require('../services/patternService');

// @desc   Get behavioural patterns detected in the user's history
// @route  GET /api/patterns
// @access Protected
const getUserPatterns = async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const result = await getPatterns(req.user._id, force);
    res.status(200).json(result);
  } catch (error) {
    console.error('Pattern error:', error.message);
    res.status(500).json({ message: 'Could not read your patterns', error: error.message });
  }
};

module.exports = { getUserPatterns };