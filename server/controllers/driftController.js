const { getDriftReport } = require('../services/driftService');

// @desc   Get the user's drift diagnosis and recovery plan
// @route  GET /api/drift
// @access Protected
const getDrift = async (req, res) => {
  try {
    const report = await getDriftReport(req.user._id);
    res.status(200).json(report);
  } catch (error) {
    console.error('Drift error:', error.message);
    res.status(500).json({ message: 'Could not read your state', error: error.message });
  }
};

module.exports = { getDrift };