const {
  logSleepStart,
  logWake,
  correctNight,
  confirmNight,
  getSleepState,
} = require('../services/sleepService');

// @desc   Everything the sleep card and the mission need
// @route  GET /api/sleep
// @access Protected
const getSleep = async (req, res) => {
  try {
    const state = await getSleepState(req.user._id);
    res.status(200).json(state);
  } catch (error) {
    res.status(500).json({ message: 'Could not read sleep', error: error.message });
  }
};

// @desc   "Turning in"
// @route  POST /api/sleep/bed
// @access Protected
const startSleep = async (req, res) => {
  try {
    const log = await logSleepStart(req.user._id, req.body?.at || new Date());
    res.status(201).json(log);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// @desc   "Just woke up"
// @route  POST /api/sleep/wake
// @access Protected
const endSleep = async (req, res) => {
  try {
    const log = await logWake(req.user._id, req.body?.at || new Date());
    res.status(201).json(log);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// @desc   Accept an inferred night as-is
// @route  POST /api/sleep/:date/confirm
// @access Protected
const acceptNight = async (req, res) => {
  try {
    const log = await confirmNight(req.user._id, req.params.date);
    res.status(200).json(log);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

// @desc   Correct a night by hand
// @route  PUT /api/sleep/:date
// @access Protected
const updateNight = async (req, res) => {
  try {
    const { sleepAt, wakeAt, note } = req.body;
    const log = await correctNight(req.user._id, req.params.date, { sleepAt, wakeAt, note });
    res.status(200).json(log);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};

module.exports = { getSleep, startSleep, endSleep, acceptNight, updateNight };