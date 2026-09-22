const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const DriftSnapshot = require('../models/DriftSnapshot');
const FocusSession = require('../models/FocusSession');
const { askAI, cleanJsonString } = require('./aiService');
const { buildCompactContext } = require('./contextService');
const { buildDriftPrompt } = require('./prompts');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// Focus tuning.
// REFERENCE is the daily minute count the rate saturates at, so the signal
// stays a 0..1 rate like the other three. Two hours a day is deliberately
// high: above it we stop distinguishing, the same way habit consistency and
// journalling already cap at 1.
const FOCUS_REFERENCE_MIN = 120;

// Focus sessions are sparse by nature. Without a real baseline habit, one
// quiet week reads as -100% and would wrongly trip the catastrophic floor,
// so we refuse to judge focus at all below this much history.
const MIN_BASELINE_FOCUS_MINUTES = 60;

// ---------- individual signals ----------

const taskCompletion = (tasks, from, to) => {
  const inWindow = tasks.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= from && created <= to;
  });
  if (inWindow.length === 0) return null;
  const done = inWindow.filter((t) => t.completed).length;
  return done / inWindow.length;
};

const habitConsistency = (habits, from, to) => {
  if (habits.length === 0) return null;

  const days = Math.max(1, Math.round((to - from) / DAY));
  let expected = 0;
  let actual = 0;

  for (const h of habits) {
    const created = new Date(h.createdAt);
    const activeDays = Math.max(
      0,
      Math.min(days, Math.round((to - Math.max(from, created)) / DAY))
    );
    if (activeDays === 0) continue;

    expected += activeDays;
    actual += (h.completedDates || []).filter((d) => {
      const dd = new Date(d);
      return dd >= from && dd <= to;
    }).length;
  }

  if (expected === 0) return null;
  return Math.min(1, actual / expected);
};

const diaryEngagement = (entries, from, to) => {
  const days = Math.max(1, Math.round((to - from) / DAY));
  const written = new Set(
    entries
      .filter((e) => {
        const d = new Date(e.entryDate);
        return d >= from && d <= to;
      })
      .map((e) => e.entryDate)
  );
  return Math.min(1, written.size / days);
};

/**
 * Total focus minutes started inside a window.
 * Attributed by startedAt, matching how getMission counts "today".
 */
const focusMinutesIn = (sessions, from, to) =>
  sessions.reduce((sum, s) => {
    const started = new Date(s.startedAt);
    if (started < from || started > to) return sum;
    return sum + (Number(s.actualMinutes) || 0);
  }, 0);

const focusRate = (minutes, from, to) => {
  const days = Math.max(1, Math.round((to - from) / DAY));
  return Math.min(1, minutes / days / FOCUS_REFERENCE_MIN);
};

// ---------- the main calculation ----------

const calculateDrift = async (userId) => {
  const now = new Date();
  const recentFrom = daysAgo(7);
  const baselineFrom = daysAgo(37);
  const baselineTo = daysAgo(7);

  const [tasks, habits, entries, sessions] = await Promise.all([
    Task.find({ user: userId }),
    Habit.find({ user: userId }),
    DiaryEntry.find({ user: userId }),
    // Only sessions the user actually ended. 'expired' is excluded on purpose:
    // those are orphans closed by expireStale, and their actualMinutes is
    // capped at plannedMinutes rather than measured, so counting them would
    // credit time nobody spent.
    FocusSession.find({
      user: userId,
      status: { $in: ['completed', 'abandoned'] },
      startedAt: { $gte: baselineFrom },
    }).select('startedAt actualMinutes'),
  ]);

  const accountAge =
    tasks.length + habits.length + entries.length + sessions.length;
  if (accountAge < 5) {
    return {
      state: 'unknown',
      score: 0,
      signals: [],
      overdue: 0,
      hasEnoughData: false,
    };
  }

  const focusBaselineMins = focusMinutesIn(sessions, baselineFrom, baselineTo);
  const focusRecentMins = focusMinutesIn(sessions, recentFrom, now);
  const focusHasBaseline = focusBaselineMins >= MIN_BASELINE_FOCUS_MINUTES;

  const signals = [];

  const pairs = [
    {
      key: 'tasks',
      label: 'Task completion',
      recent: taskCompletion(tasks, recentFrom, now),
      baseline: taskCompletion(tasks, baselineFrom, baselineTo),
    },
    {
      key: 'habits',
      label: 'Habit consistency',
      recent: habitConsistency(habits, recentFrom, now),
      baseline: habitConsistency(habits, baselineFrom, baselineTo),
    },
    {
      key: 'diary',
      label: 'Journalling',
      recent: diaryEngagement(entries, recentFrom, now),
      baseline: diaryEngagement(entries, baselineFrom, baselineTo),
    },
    {
      key: 'focus',
      label: 'Focus time',
      recent: focusHasBaseline ? focusRate(focusRecentMins, recentFrom, now) : null,
      baseline: focusHasBaseline
        ? focusRate(focusBaselineMins, baselineFrom, baselineTo)
        : null,
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

  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && dateStr(t.dueDate) < dateStr(now)
  ).length;

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

  // Proportions, not counts. A signal can drop out on any given day (no tasks
  // created, no focus baseline), so a fixed "3 signals down" would quietly
  // mean something different depending on how many reported. These ratios
  // reproduce the old three-signal behaviour exactly and keep the same
  // meaning when a fourth signal joins.
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
    if (!report.hasEnoughData) return null;

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

  const snapshots = await DriftSnapshot.find({
    user: userId,
    date: { $gte: from },
  }).sort({ date: 1 });

  const byDate = new Map(snapshots.map((s) => [s.date, s]));

  const timeline = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY).toISOString().split('T')[0];
    const snap = byDate.get(d);
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