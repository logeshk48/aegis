const { getDriftReport, recordSnapshot, getDriftHistory } = require('../services/driftService');

// @desc   Get the user's drift diagnosis and recovery plan
// @route  GET /api/drift
// @access Protected
const getDrift = async (req, res) => {
  try {
    const report = await getDriftReport(req.user._id);

    // record today's state (fire and forget — never blocks the response)
    recordSnapshot(req.user._id, report);

    res.status(200).json(report);
  } catch (error) {
    console.error('Drift error:', error.message);
    res.status(500).json({ message: 'Could not read your state', error: error.message });
  }
};

// @desc   Get drift history for the timeline
// @route  GET /api/drift/history
// @access Protected
const getHistory = async (req, res) => {
  try {
    const days = Math.min(180, parseInt(req.query.days, 10) || 60);
    const history = await getDriftHistory(req.user._id, days);
    res.status(200).json(history);
  } catch (error) {
    console.error('Drift history error:', error.message);
    res.status(500).json({ message: 'Could not load history', error: error.message });
  }
};

module.exports = { getDrift, getHistory };