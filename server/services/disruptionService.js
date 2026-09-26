const Disruption = require('../models/Disruption');
const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const FocusSession = require('../models/FocusSession');

const MINUTE = 60000;
const DAY = 86400000;

const TZ_OFFSET_MIN = Number(process.env.TZ_OFFSET_MIN || 330); // IST
const toLocal = (d) => new Date(new Date(d).getTime() + TZ_OFFSET_MIN * MINUTE);
const dstr = (d) => toLocal(d).toISOString().split('T')[0];
const parseDay = (s) => new Date(`${s}T00:00:00.000Z`).getTime() - TZ_OFFSET_MIN * MINUTE;
const todayStr = () => dstr(new Date());

const REASONS = {
  unwell: 'Unwell',
  away: 'Away',
  family: 'Family',
  crunch: 'Work crunch',
  rest: 'Deliberate rest',
  other: 'Something else',
};

const VALID_REASONS = Object.keys(REASONS);

const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Every date string from `from` to `to`, inclusive. */
const expandRange = (from, to) => {
  const out = [];
  let cur = parseDay(from);
  const end = parseDay(to);
  if (end < cur) return out;
  while (cur <= end) {
    out.push(dstr(new Date(cur)));
    cur += DAY;
  }
  return out;
};

// ---------- reading ----------

const listDisruptions = async (userId, days = 90) => {
  const since = dstr(new Date(Date.now() - days * DAY));
  return Disruption.find({ user: userId, from: { $gte: since } })
    .sort({ from: -1 })
    .lean();
};

/** The one you are inside right now, if any. */
const activeDisruption = async (userId) => {
  const today = todayStr();
  const open = await Disruption.find({ user: userId })
    .sort({ from: -1 })
    .limit(20)
    .lean();

  return (
    open.find((d) => d.from <= today && (d.to === null || d.to >= today)) || null
  );
};

/**
 * Every day currently marked as disrupted, as a Set of date strings.
 * This is what drift subtracts — those days are not scored as zero,
 * they are not scored at all.
 */
const disruptedDaySet = async (userId, days = 90) => {
  const list = await listDisruptions(userId, days);
  const set = new Set();
  const today = todayStr();

  for (const d of list) {
    // an open disruption runs up to today, not forever
    for (const day of expandRange(d.from, d.to || today)) set.add(day);
  }
  return set;
};

/** How many days in a window are actually usable. */
const usableDays = (from, to, skip = new Set()) =>
  expandRange(from, to).filter((d) => !skip.has(d)).length;

// ---------- writing ----------

const startDisruption = async (userId, { from, to, reason, note } = {}) => {
  const start = isDateStr(from) ? from : todayStr();
  const end = to === null || to === undefined || to === '' ? null : to;

  if (end !== null && !isDateStr(end)) {
    throw Object.assign(new Error('to must be YYYY-MM-DD or null'), { status: 400 });
  }
  if (end !== null && end < start) {
    throw Object.assign(new Error('to cannot be before from'), { status: 400 });
  }

  return Disruption.create({
    user: userId,
    from: start,
    to: end,
    reason: VALID_REASONS.includes(reason) ? reason : 'other',
    note: typeof note === 'string' ? note.trim().slice(0, 200) : '',
  });
};

const endDisruption = async (userId, id, to) => {
  const d = await Disruption.findById(id).catch(() => null);
  if (!d) throw Object.assign(new Error('Not found'), { status: 404 });
  if (d.user.toString() !== userId.toString()) {
    throw Object.assign(new Error('Not yours'), { status: 403 });
  }

  const end = isDateStr(to) ? to : todayStr();
  if (end < d.from) {
    throw Object.assign(new Error('to cannot be before from'), { status: 400 });
  }

  d.to = end;
  await d.save();
  return d;
};

const removeDisruption = async (userId, id) => {
  const d = await Disruption.findById(id).catch(() => null);
  if (!d) throw Object.assign(new Error('Not found'), { status: 404 });
  if (d.user.toString() !== userId.toString()) {
    throw Object.assign(new Error('Not yours'), { status: 403 });
  }
  await d.deleteOne();
  return { removed: true, id };
};

// ---------- noticing ----------
// Decline is gradual and uneven: one signal goes first, the others follow
// over days. Disruption is a wall — everything stops on the same day.
// That difference is measurable, so Aegis can ask instead of assuming.

const MIN_ACTIVE_BEFORE = 3; // days of normal life before the wall
const MIN_QUIET = 2; // everyone skips one day
const LOOKBACK = 14;

const activityByDay = async (userId) => {
  const since = new Date(Date.now() - (LOOKBACK + 1) * DAY);

  const [tasks, habits, entries, sessions] = await Promise.all([
    Task.find({ user: userId, updatedAt: { $gte: since } }).select('updatedAt').lean(),
    Habit.find({ user: userId }).select('completedDates').lean(),
    DiaryEntry.find({ user: userId, createdAt: { $gte: since } }).select('entryDate').lean(),
    FocusSession.find({ user: userId, startedAt: { $gte: since } }).select('startedAt').lean(),
  ]);

  const byDay = {};
  const bump = (day) => {
    if (day) byDay[day] = (byDay[day] || 0) + 1;
  };

  tasks.forEach((t) => bump(dstr(t.updatedAt)));
  entries.forEach((e) => bump(e.entryDate));
  sessions.forEach((s) => bump(dstr(s.startedAt)));
  habits.forEach((h) => (h.completedDates || []).forEach((d) => bump(d)));

  return byDay;
};

/**
 * Returns { since, daysQuiet } when the pattern looks like a wall rather
 * than a fade — and null the rest of the time, including for anything
 * already marked.
 */
const detectCliff = async (userId) => {
  const [byDay, skip] = await Promise.all([
    activityByDay(userId),
    disruptedDaySet(userId, 30),
  ]);

  const today = todayStr();
  const days = [];
  for (let i = LOOKBACK - 1; i >= 0; i--) {
    days.push(dstr(new Date(parseDay(today) + DAY - i * DAY)));
  }

  let quiet = 0;
  let i = days.length - 1;
  while (i >= 0 && (byDay[days[i]] || 0) < 1) {
    quiet++;
    i--;
  }
  if (quiet < MIN_QUIET) return null;

  let active = 0;
  while (i >= 0 && (byDay[days[i]] || 0) >= 1) {
    active++;
    i--;
  }
  if (active < MIN_ACTIVE_BEFORE) return null;

  const since = days[days.length - quiet];

  // already accounted for — do not ask twice
  if (skip.has(since)) return null;

  return { since, daysQuiet: quiet };
};

// ---------- the whole picture ----------

const getDisruptionState = async (userId) => {
  const [active, recent, cliff] = await Promise.all([
    activeDisruption(userId),
    listDisruptions(userId, 90),
    detectCliff(userId),
  ]);

  return {
    active,
    recent,
    // only offered when nothing is already marked
    suggestion: active ? null : cliff,
    reasons: REASONS,
  };
};

module.exports = {
  REASONS,
  VALID_REASONS,
  expandRange,
  usableDays,
  listDisruptions,
  activeDisruption,
  disruptedDaySet,
  startDisruption,
  endDisruption,
  removeDisruption,
  detectCliff,
  getDisruptionState,
  dstr,
  todayStr,
};