const {
  getDisruptionState,
  startDisruption,
  endDisruption,
  removeDisruption,
} = require('../services/disruptionService');

// @desc   Active disruption, recent history, and whether Aegis has noticed one
// @route  GET /api/disruptions
// @access Protected
const getDisruptions = async (req, res) => {
  try {
    const state = await getDisruptionState(req.user._id);
    res.status(200).json(state);
  } catch (error) {
    res.status(500).json({ message: 'Could not read disruptions', error: error.message });
  }
};

// @desc   Mark a stretch of days as disrupted — past, present or planned
// @route  POST /api/disruptions
// @access Protected
const createDisruption = async (req, res) => {
  try {
    const { from, to, reason, note } = req.body;
    const d = await startDisruption(req.user._id, { from, to, reason, note });
    res.status(201).json(d);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// @desc   "I'm back" — closes an open disruption
// @route  POST /api/disruptions/:id/end
// @access Protected
const finishDisruption = async (req, res) => {
  try {
    const d = await endDisruption(req.user._id, req.params.id, req.body?.to);
    res.status(200).json(d);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// @desc   Delete one (marked by mistake)
// @route  DELETE /api/disruptions/:id
// @access Protected
const deleteDisruption = async (req, res) => {
  try {
    const out = await removeDisruption(req.user._id, req.params.id);
    res.status(200).json(out);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = { getDisruptions, createDisruption, finishDisruption, deleteDisruption };