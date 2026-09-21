const {
  getMission,
  getActive,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  reflectOnSession,
} = require('../services/focusService');

// shared error handling — service errors carry their own status
const handle = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
    res.status(200).json(data);
  } catch (error) {
    if (!error.status) console.error('Focus error:', error.message);
    res.status(error.status || 500).json({ message: error.message || 'Something went wrong' });
  }
};

// GET  /api/focus/mission
const mission = handle((req) => getMission(req.user._id));

// GET  /api/focus/active
const active = handle(async (req) => ({ session: await getActive(req.user._id) }));

// POST /api/focus/start
const start = handle((req) => startSession(req.user._id, req.body || {}));

// POST /api/focus/:id/pause
const pause = handle((req) => pauseSession(req.user._id, req.params.id));

// POST /api/focus/:id/resume
const resume = handle((req) => resumeSession(req.user._id, req.params.id));

// POST /api/focus/:id/end   { outcome: 'completed' | 'abandoned' }
const end = handle((req) => endSession(req.user._id, req.params.id, req.body?.outcome));

// POST /api/focus/:id/reflect   { completeTask?: boolean, reflection?: string }
const reflect = handle((req) => reflectOnSession(req.user._id, req.params.id, req.body || {}));

module.exports = { mission, active, start, pause, resume, end, reflect };