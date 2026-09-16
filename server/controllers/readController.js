const { generateRead } = require('../services/readService');

// @desc   Get Aegis's personal read of the user
// @route  GET /api/read
// @access Protected
const getRead = async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const read = await generateRead(req.user._id, force);
    res.status(200).json(read);
  } catch (error) {
    console.error('Read error:', error.message);
    res.status(500).json({ message: 'Could not read you', error: error.message });
  }
};

module.exports = { getRead };