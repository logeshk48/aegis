const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const DriftSnapshot = require('../models/DriftSnapshot');
const FocusSession = require('../models/FocusSession');
const { askAI, cleanJsonString } = require('./aiService');
const { buildCompactContext } = require('./contextService');
const { buildDriftPrompt } = require('./prompts');
const {
  disruptedDaySet,
  activeDisruption,
  listDisruptions,
  REASONS,
  dstr,
  todayStr,
} = require('./disruptionService');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// Focus tuning.
const FOCUS_REFERENCE_MIN = 120;
const MIN_BASELINE_FOCUS_MINUTES = 60;

// Judging a week from the two days you happened to be upright is not
// better than not judging it. Below this, every signal returns null.
const MIN_USABLE_DAYS = 3;

/** Local date strings covering a window, inclusive. */
const daysBetween = (from, to) => {
  const out = [];
  let cur = new Date(from).getTime();
  const end = new Date(to).getTime();
  while (cur <= end) {
    out.push(dstr(new Date(cur)));
    cur += DAY;
  }
  return out;
};

// ---------- individual signals ----------
// Each takes the list of days that actually count. Disrupted days are not
// in that list, so they are never scored as zero — they are not scored.

const taskCompletion = (tasks, days) => {
  const set = new Set(days);
  const inWindow = tasks.filter((t) => set.has(dstr(t.createdAt)));
  if (inWindow.length === 0) return null;

  const done = inWindow.filter((t) => t.completed).length;
  return done / inWindow.length;
};

const habitConsistency = (habits, days) => {
  if (habits.length === 0 || days.length === 0) return null;

  let expected = 0;
  let actual = 0;

  for (const h of habits) {
    const born = dstr(h.createdAt);
    const done = new Set(h.completedDates || []);

    for (const d of days) {
      // a three-day-old habit is judged over three days, not thirty
      if (d < born) continue;
      expected++;
      if (done.has(d)) actual++;
    }
  }

  if (expected === 0) return null;
  return Math.min(1, actual / expected);
};

const diaryEngagement = (entries, days) => {
  if (days.length === 0) return null;

  const set = new Set(days);
  const written = new Set(entries.map((e) => e.entryDate).filter((d) => set.has(d)));
  return Math.min(1, written.size / days.length);
};

const focusMinutesIn = (sessions, days) => {
  const set = new Set(days);
  return sessions.reduce((sum, s) => {
    const d = dstr(s.startedAt);
    return set.has(d) ? sum + (Number(s.actualMinutes) || 0) : sum;
  }, 0);
};

const focusRate = (minutes, dayCount) =>
  Math.min(1, minutes / Math.max(1, dayCount) / FOCUS_REFERENCE_MIN);

// ---------- the main calculation ----------

const calculateDrift = async (userId) => {
  const now = new Date();
  const recentFrom = daysAgo(7);
  const baselineFrom = daysAgo(37);
  const baselineTo = daysAgo(7);

  const [tasks, habits, entries, sessions, skip, active, history] = await Promise.all([
    Task.find({ user: userId }),
    Habit.find({ user: userId }),
    DiaryEntry.find({ user: userId }),
    FocusSession.find({
      user: userId,
      status: { $in: ['completed', 'abandoned'] },
      startedAt: { $gte: baselineFrom },
    }).select('startedAt actualMinutes'),
    disruptedDaySet(userId, 60),
    activeDisruption(userId),
    listDisruptions(userId, 14),
  ]);

  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && dateStr(t.dueDate) < dateStr(now)
  ).length;

  // Coming back is the fragile part, so the day after a disruption gets
  // treated gently whatever the numbers say.
  const today = todayStr();
  const justReturned = history.some(
    (d) => d.to && d.to < today && (Date.now() - new Date(`${d.to}T00:00:00Z`).getTime()) <= 2 * DAY
  );

  // You are out. There is nothing here to judge, and pretending otherwise
  // is how an app stops being believed.
  if (active) {
    return {
      state: 'paused',
      score: 0,
      signals: [],
      overdue,
      hasEnoughData: false,
      justReturned: false,
      disruption: {
        id: active._id.toString(),
        from: active.from,
        to: active.to,
        reason: active.reason,
        reasonLabel: REASONS[active.reason] || REASONS.other,
        note: active.note || '',
      },
      calculatedAt: now,
    };
  }

  const accountAge =
    tasks.length + habits.length + entries.length + sessions.length;
  if (accountAge < 5) {
    return {
      state: 'unknown',
      score: 0,
      signals: [],
      overdue,
      hasEnoughData: false,
      justReturned,
      disruption: null,
    };
  }

  const recentDays = daysBetween(recentFrom, now).filter((d) => !skip.has(d));
  const baselineDays = daysBetween(baselineFrom, baselineTo).filter((d) => !skip.has(d));

  // Most of the last week was written off. Say so rather than scoring it.
  if (recentDays.length < MIN_USABLE_DAYS || baselineDays.length < MIN_USABLE_DAYS) {
    return {
      state: 'unknown',
      score: 0,
      signals: [],
      overdue,
      hasEnoughData: false,
      justReturned,
      disruption: null,
      thinWindow: true,
    };
  }

  const focusBaselineMins = focusMinutesIn(sessions, baselineDays);
  const focusRecentMins = focusMinutesIn(sessions, recentDays);
  const focusHasBaseline = focusBaselineMins >= MIN_BASELINE_FOCUS_MINUTES;

  const signals = [];

  const pairs = [
    {
      key: 'tasks',
      label: 'Task completion',
      recent: taskCompletion(tasks, recentDays),
      baseline: taskCompletion(tasks, baselineDays),
    },
    {
      key: 'habits',
      label: 'Habit consistency',
      recent: habitConsistency(habits, recentDays),
      baseline: habitConsistency(habits, baselineDays),
    },
    {
      key: 'diary',
      label: 'Journalling',
      recent: diaryEngagement(entries, recentDays),
      baseline: diaryEngagement(entries, baselineDays),
    },
    {
      key: 'focus',
      label: 'Focus time',
      recent: focusHasBaseline ? focusRate(focusRecentMins, recentDays.length) : null,
      baseline: focusHasBaseline ? focusRate(focusBaselineMins, baselineDays.length) : null,
    },
  ];

  for (const p of pairs) {
    if (p.recent === null || p.baseline === null || p.baseline === 0) continue;

    const delta = (p.recent - p.baseline) / p.baseline;
    signals.push({
      key: p.key,
      label: p.label,
      recent: Math.round(p.recent * 100),
      baseline: Math.round(p.baseline * 100),
      changePct: Math.round(delta * 100),
      direction: delta < -0.1 ? 'down' : delta > 0.1 ? 'up' : 'steady',
    });
  }

  let score = 0;
  for (const s of signals) {
    if (s.direction === 'down') {
      score += Math.min(35, Math.abs(s.changePct) / 2);
    } else if (s.direction === 'up') {
      score -= 8;
    }
  }
  if (overdue >= 5) score += 20;
  else if (overdue >= 3) score += 12;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const downCount = signals.filter((s) => s.direction === 'down').length;
  const upCount = signals.filter((s) => s.direction === 'up').length;
  const catastrophic = signals.some((s) => s.changePct <= -75);

  // Proportions, not counts. A signal can drop out on any given day, so a
  // fixed "3 signals down" would quietly mean something different depending
  // on how many reported.
  const total = signals.length;
  const downRatio = total ? downCount / total : 0;
  const upRatio = total ? upCount / total : 0;

  let state;
  if (upRatio >= 0.5 && score < 25 && !catastrophic) state = 'recovering';
  else if (score >= 50 || downRatio >= 0.75) state = 'drifting';
  else if (score >= 25 || downRatio >= 0.5 || catastrophic) state = 'slipping';
  else state = 'steady';

  return {
    state,
    score,
    signals,
    overdue,
    hasEnoughData: true,
    justReturned,
    disruption: null,
    usableDays: { recent: recentDays.length, baseline: baselineDays.length },
    calculatedAt: now,
  };
};

// ---------- AI interpretation ----------

const FALLBACKS = {
  steady: {
    headline: 'You are holding steady.',
    explanation: 'Your patterns look close to normal. Nothing needs fixing right now.',
    plan: [{ step: 'Carry on as you are', why: 'It is working' }],
    tone: 'calm',
  },
  unknown: {
    headline: 'Still learning your rhythm.',
    explanation:
      'There is not enough history yet to know what normal looks like for you. Keep using Aegis and this will sharpen.',
    plan: [{ step: 'Write a diary entry tonight', why: 'It is how Aegis learns you' }],
    tone: 'calm',
  },
};

const pausedReport = (drift) => {
  const label = (drift.disruption?.reasonLabel || 'away').toLowerCase();
  return {
    headline: 'Paused.',
    explanation: `You marked this time as ${label}. Nothing is being measured and nothing is expected — these days are set aside, not counted against you.`,
    plan: [{ step: 'Nothing today', why: 'That is the whole point' }],
    tone: 'gentle',
  };
};

const validatePlan = (plan) => {
  if (!Array.isArray(plan)) return [];
  return plan
    .filter((p) => p && typeof p.step === 'string' && p.step.trim())
    .map((p) => ({
      step: p.step.trim(),
      why: typeof p.why === 'string' ? p.why.trim() : '',
    }))
    .slice(0, 4);
};

// in-memory cache: drift doesn't change minute to minute,
// and recalculating on every page load hammers the AI rate limit
const driftCache = new Map();
const CACHE_MS = 60 * 60 * 1000; // 1 hour

const getDriftReport = async (userId, force = false) => {
  const key = userId.toString();

  if (!force) {
    const cached = driftCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.report, cached: true };
    }
  }

  const drift = await calculateDrift(userId);

  // No model call while paused. There is nothing to interpret, and
  // spending a request to say "nothing" is worse than saying it plainly.
  if (drift.state === 'paused') {
    const report = { ...drift, ...pausedReport(drift) };
    driftCache.set(key, { report, expiresAt: Date.now() + CACHE_MS });
    return report;
  }

  if (!drift.hasEnoughData) {
    const report = { ...drift, ...FALLBACKS.unknown };
    driftCache.set(key, { report, expiresAt: Date.now() + CACHE_MS });
    return report;
  }

  try {
    const context = await buildCompactContext(userId);
    const prompt = buildDriftPrompt(drift, context);
    const raw = await askAI(prompt);
    const cleaned = cleanJsonString(raw);
    const parsed = JSON.parse(cleaned);

    const report = {
      ...drift,
      headline:
        typeof parsed.headline === 'string' && parsed.headline.trim()
          ? parsed.headline.trim()
          : FALLBACKS.steady.headline,
      explanation:
        typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
      plan: validatePlan(parsed.plan),
      tone: ['calm', 'encouraging', 'gentle', 'celebratory'].includes(parsed.tone)
        ? parsed.tone
        : 'calm',
    };

    driftCache.set(key, { report, expiresAt: Date.now() + CACHE_MS });
    return report;
  } catch (err) {
    console.error('Drift interpretation failed:', err.message);
    return { ...drift, ...(FALLBACKS[drift.state] || FALLBACKS.steady) };
  }
};

// ---------- history ----------

/**
 * Records today's drift state so we can build a history.
 * Upserts — one snapshot per day, updated if it runs again.
 */
const recordSnapshot = async (userId, report) => {
  try {
    // A paused day is still worth recording — the timeline should show a
    // pause, not a hole that later reads as a collapse.
    if (!report.hasEnoughData && report.state !== 'paused') return null;

    const date = new Date().toISOString().split('T')[0];

    const snapshot = await DriftSnapshot.findOneAndUpdate(
      { user: userId, date },
      {
        user: userId,
        date,
        state: report.state,
        score: report.score,
        signals: report.signals || [],
        overdue: report.overdue || 0,
        headline: report.headline || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return snapshot;
  } catch (err) {
    console.error('Snapshot failed:', err.message);
    return null;
  }
};

/**
 * Returns the last N days of drift history, oldest first.
 * Days with no snapshot are filled as 'unknown' so the timeline has no holes.
 */
const getDriftHistory = async (userId, days = 60) => {
  const from = new Date(Date.now() - days * DAY).toISOString().split('T')[0];

  const [snapshots, skip] = await Promise.all([
    DriftSnapshot.find({ user: userId, date: { $gte: from } }).sort({ date: 1 }),
    disruptedDaySet(userId, days + 5),
  ]);

  const byDate = new Map(snapshots.map((s) => [s.date, s]));

  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY).toISOString().split('T')[0];
    const snap = byDate.get(d);

    // A marked day reads as paused even if the snapshot that ran before
    // you marked it said otherwise — the correction applies backwards.
    if (skip.has(d)) {
      timeline.push({
        date: d,
        state: 'paused',
        score: null,
        headline: snap ? snap.headline : '',
        hasData: true,
      });
      continue;
    }

    timeline.push({
      date: d,
      state: snap ? snap.state : 'unknown',
      score: snap ? snap.score : null,
      headline: snap ? snap.headline : '',
      hasData: !!snap,
    });
  }

  // group consecutive same-state days into periods
  const periods = [];
  for (const day of timeline) {
    const last = periods[periods.length - 1];
    if (last && last.state === day.state) {
      last.days += 1;
      last.to = day.date;
    } else {
      periods.push({ state: day.state, from: day.date, to: day.date, days: 1 });
    }
  }

  return { timeline, periods };
};

module.exports = {
  calculateDrift,
  getDriftReport,
  recordSnapshot,
  getDriftHistory,
};