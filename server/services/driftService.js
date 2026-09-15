const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const { askAI, cleanJsonString } = require('./aiService');
const { buildCompactContext } = require('./contextService');
const { buildDriftPrompt } = require('./prompts');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * DAY);

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

// ---------- the main calculation ----------

const calculateDrift = async (userId) => {
  const now = new Date();
  const recentFrom = daysAgo(7);
  const baselineFrom = daysAgo(37);
  const baselineTo = daysAgo(7);

  const [tasks, habits, entries] = await Promise.all([
    Task.find({ user: userId }),
    Habit.find({ user: userId }),
    DiaryEntry.find({ user: userId }),
  ]);

  const accountAge = tasks.length + habits.length + entries.length;
  if (accountAge < 5) {
    return {
      state: 'unknown',
      score: 0,
      signals: [],
      overdue: 0,
      hasEnoughData: false,
    };
  }

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

  let state;
  if (upCount >= 2 && score < 25 && !catastrophic) state = 'recovering';
  else if (score >= 50 || downCount >= 3) state = 'drifting';
  else if (score >= 25 || downCount >= 2 || catastrophic) state = 'slipping';
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
    // don't cache failures — retry next time
    return { ...drift, ...(FALLBACKS[drift.state] || FALLBACKS.steady) };
  }
};

module.exports = { calculateDrift, getDriftReport };