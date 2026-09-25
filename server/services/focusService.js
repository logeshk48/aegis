const FocusSession = require('../models/FocusSession');
const Task = require('../models/Task');
const { calculateDrift } = require('./driftService');
const { extractAndStoreMemories } = require('./memoryService');
const { classifyTask, prepFor } = require('../utils/classifyTask');
const { staleFor } = require('../utils/staleness');

const STALE_GRACE_MS = 30 * 60 * 1000; // 30 min past planned end
const PAUSE_LIMIT_MS = 3 * 60 * 60 * 1000; // paused 3h → closed
const PREP_MINUTES = 5;

const MINUTES_BY_STATE = {
  drifting: 10,
  slipping: 15,
  recovering: 25,
  steady: 45,
  unknown: 25,
};

const VALID_STATES = Object.keys(MINUTES_BY_STATE);

const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const todayStr = () => dateStr(new Date());

const fail = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const kindOf = (t) => t.kind || classifyTask(t.title);

// errands and activities with a time still ahead are "planned" — handled for now
const isPlanned = (t, now) => !!t.scheduledAt && new Date(t.scheduledAt) > now;

// ---------- time maths ----------

const activeMs = (s, now = new Date()) => {
  const end = s.endedAt || now;
  let paused = s.pausedMs || 0;
  if (s.pausedAt && !s.endedAt) paused += now - new Date(s.pausedAt);
  return Math.max(0, end - new Date(s.startedAt) - paused);
};

const toMinutes = (ms) => Math.round((ms / 60000) * 10) / 10;

// ---------- task ranking ----------

const rankTask = (t) => {
  const today = todayStr();
  const due = t.dueDate ? dateStr(t.dueDate) : null;
  const overdue = due && due < today;
  const dueToday = due === today;

  if (overdue && t.important) return 0;
  if (overdue) return 1;
  if (dueToday && t.important) return 2;
  if (dueToday) return 3;
  if (t.important) return 4;
  if (due) return 5;
  return 6;
};

const compareTasks = (a, b) => {
  const r = rankTask(a) - rankTask(b);
  if (r !== 0) return r;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return new Date(b.createdAt) - new Date(a.createdAt);
};

const reasonFor = (t) => {
  const r = rankTask(t);
  if (r <= 1) return 'overdue';
  if (r <= 3) return 'due today';
  if (r === 4) return 'starred';
  if (r === 5) {
    return `due ${new Date(t.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
  }
  return 'on your list';
};

const shapeTask = (t) => ({
  id: t._id.toString(),
  title: t.title,
  important: !!t.important,
  reason: reasonFor(t),
  kind: kindOf(t),
  kindIsManual: !!t.kind,
  scheduledAt: t.scheduledAt || null,
  offeredDays: t.offeredDays || 0,
});

const shapeSession = (s) => ({
  id: s._id.toString(),
  taskId: s.task ? s.task.toString() : null,
  taskTitle: s.taskTitle,
  plannedMinutes: s.plannedMinutes,
  actualMinutes: s.actualMinutes,
  status: s.status,
  startedAt: s.startedAt,
  pausedAt: s.pausedAt,
  pausedMs: s.pausedMs,
  isExtraRound: s.isExtraRound,
  driftStateAtStart: s.driftStateAtStart,
});

// ---------- housekeeping ----------

const expireStale = async (userId) => {
  const active = await FocusSession.find({ user: userId, status: 'active' });
  const now = new Date();

  for (const s of active) {
    const planMs = s.plannedMinutes * 60000;
    const overran = now - new Date(s.startedAt) > planMs + (s.pausedMs || 0) + STALE_GRACE_MS;
    const pausedTooLong = s.pausedAt && now - new Date(s.pausedAt) > PAUSE_LIMIT_MS;

    if ((overran && !s.pausedAt) || pausedTooLong) {
      s.actualMinutes = Math.min(s.plannedMinutes, toMinutes(activeMs(s, now)));
      if (s.pausedAt) {
        s.pausedMs += now - new Date(s.pausedAt);
        s.pausedAt = null;
      }
      s.status = 'expired';
      s.endedAt = now;
      await s.save();
    }
  }
};

const findOwned = async (userId, id) => {
  const s = await FocusSession.findById(id).catch(() => null);
  if (!s || s.user.toString() !== userId.toString()) fail(404, 'Session not found');
  return s;
};

/**
 * Notes that this task was put in front of the user today.
 * Guarded by the date so ten page loads count as one offer — otherwise
 * "how many days have you skipped this" becomes "how often do you refresh".
 */
const recordOffer = async (task) => {
  const today = todayStr();
  if (task.lastOfferedOn === today) return task.offeredDays || 0;

  task.lastOfferedOn = today;
  task.offeredDays = (task.offeredDays || 0) + 1;
  await task.save();

  return task.offeredDays;
};

// ---------- the mission ----------
// The mission is your most important unplanned task, and its FORMAT follows
// what kind of task it is:
//   focus    → a timed session
//   errand   → pick when you'll go (+ a desk prep step if there's one)
//   quick    → clear up to three small ones right now
//   activity → pick when you'll start
// Alongside, a timed "desk mission" is always offered on the top focus task.

const getMission = async (userId) => {
  await expireStale(userId);

  // pure maths — no AI call
  const drift = await calculateDrift(userId);
  const state = VALID_STATES.includes(drift.state) ? drift.state : 'unknown';

  const since = new Date(todayStr());
  const now = new Date();

  const [active, todays, open] = await Promise.all([
    FocusSession.findOne({ user: userId, status: 'active' }),
    FocusSession.find({
      user: userId,
      startedAt: { $gte: since },
      status: { $ne: 'active' },
    }),
    Task.find({ user: userId, completed: false }),
  ]);

  open.sort(compareTasks);

  const unplanned = open.filter((t) => !isPlanned(t, now));
  const planned = open
    .filter((t) => isPlanned(t, now))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 4);

  // the primary mission — shaped by the kind of the top task
  const top = unplanned[0] || null;
  let primary = null;

  if (top) {
    const kind = kindOf(top);

    // count today's offer before shaping, so the number in `stale` includes it
    const offeredDays = await recordOffer(top);

    if (kind === 'quick') {
      primary = {
        type: 'quick',
        tasks: unplanned.filter((t) => kindOf(t) === 'quick').slice(0, 3).map(shapeTask),
      };
    } else if (kind === 'errand') {
      const step = prepFor(top.title);
      primary = {
        type: 'errand',
        task: shapeTask(top),
        prep: step ? { step, minutes: PREP_MINUTES } : null,
      };
    } else if (kind === 'activity') {
      primary = { type: 'activity', task: shapeTask(top) };
    } else {
      primary = { type: 'focus', task: shapeTask(top) };
    }

    // Null until the third day. Aegis says nothing about a task you have
    // skipped once — everyone skips one.
    primary.stale = staleFor({ offeredDays, kind });
    primary.staleTaskId = top._id.toString();
  }

  // the timed desk mission — only ever on focus-kind tasks
  const focusTasks = unplanned.filter((t) => kindOf(t) === 'focus');

  const minutesToday = Math.round(
    todays.reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
  );

  return {
    state,
    baseMinutes: MINUTES_BY_STATE[state],
    minutesToday,
    sessionsToday: todays.length,
    missionDone: todays.some((s) => s.status === 'completed' && !s.isExtraRound),
    active: active ? shapeSession(active) : null,
    primary,
    focus: {
      task: focusTasks[0] ? shapeTask(focusTasks[0]) : null,
      alternatives: focusTasks.slice(1, 9).map(shapeTask),
    },
    planned: planned.map(shapeTask),
  };
};

// ---------- session lifecycle ----------

const getActive = async (userId) => {
  await expireStale(userId);
  const s = await FocusSession.findOne({ user: userId, status: 'active' });
  return s ? shapeSession(s) : null;
};

const startSession = async (
  userId,
  { taskId, plannedMinutes, isExtraRound, driftState, title }
) => {
  const minutes = Math.round(Number(plannedMinutes));
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120) {
    fail(400, 'plannedMinutes must be between 5 and 120');
  }

  let task = null;
  if (taskId) {
    task = await Task.findById(taskId).catch(() => null);
    if (!task || task.user.toString() !== userId.toString()) fail(404, 'Task not found');
    if (task.completed) fail(400, 'That task is already done');
  }

  // only one active session at a time
  const now = new Date();
  const leftovers = await FocusSession.find({ user: userId, status: 'active' });
  for (const s of leftovers) {
    s.actualMinutes = Math.min(s.plannedMinutes, toMinutes(activeMs(s, now)));
    s.status = 'abandoned';
    s.endedAt = now;
    s.pausedAt = null;
    await s.save();
  }

  // a custom title is used for prep steps and free focus
  const customTitle = typeof title === 'string' ? title.trim().slice(0, 140) : '';

  const session = await FocusSession.create({
    user: userId,
    task: task ? task._id : null,
    taskTitle: task ? task.title : customTitle || 'Free focus',
    plannedMinutes: minutes,
    driftStateAtStart: VALID_STATES.includes(driftState) ? driftState : 'unknown',
    isExtraRound: !!isExtraRound,
    startedAt: now,
  });

  return shapeSession(session);
};

const pauseSession = async (userId, id) => {
  const s = await findOwned(userId, id);
  if (s.status !== 'active') fail(400, 'Session is not active');

  if (!s.pausedAt) {
    s.pausedAt = new Date();
    await s.save();
  }
  return shapeSession(s);
};

const resumeSession = async (userId, id) => {
  const s = await findOwned(userId, id);
  if (s.status !== 'active') fail(400, 'Session is not active');

  if (s.pausedAt) {
    s.pausedMs += new Date() - new Date(s.pausedAt);
    s.pausedAt = null;
    await s.save();
  }
  return shapeSession(s);
};

const endSession = async (userId, id, outcome) => {
  if (!['completed', 'abandoned'].includes(outcome)) {
    fail(400, 'outcome must be completed or abandoned');
  }

  const s = await findOwned(userId, id);
  if (s.status !== 'active') return shapeSession(s); // idempotent

  const now = new Date();
  if (s.pausedAt) {
    s.pausedMs += now - new Date(s.pausedAt);
    s.pausedAt = null;
  }

  s.endedAt = now;
  s.actualMinutes = Math.min(s.plannedMinutes, toMinutes(activeMs(s, now)));
  s.status = outcome;
  s.completed = outcome === 'completed';

  await s.save();
  return shapeSession(s);
};

const reflectOnSession = async (userId, id, { completeTask, reflection }) => {
  const s = await findOwned(userId, id);
  if (s.status === 'active') fail(400, 'End the session first');

  let taskCompleted = false;
  if (completeTask && s.task) {
    const task = await Task.findOne({ _id: s.task, user: userId });
    if (task && !task.completed) {
      task.completed = true;
      await task.save();
      taskCompleted = true;
    }
  }

  const text = typeof reflection === 'string' ? reflection.trim().slice(0, 500) : '';
  if (text) {
    s.reflection = text;
    await s.save();

    const context =
      `Focus session on "${s.taskTitle}" (${s.actualMinutes} of ${s.plannedMinutes} minutes, ` +
      `${s.completed ? 'finished' : 'stopped early'}). Their reflection: ${text}`;
    extractAndStoreMemories(userId, context, 'observation').catch(() => {});
  }

  return { session: shapeSession(s), taskCompleted };
};

module.exports = {
  getMission,
  getActive,
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  reflectOnSession,
};