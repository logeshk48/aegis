const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// ---------- individual signals ----------

// what fraction of tasks due in a window were completed
const taskCompletion = (tasks, from, to) => {
  const inWindow = tasks.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= from && created <= to;
  });
  if (inWindow.length === 0) return null; // no data ≠ bad performance
  const done = inWindow.filter((t) => t.completed).length;
  return done / inWindow.length;
};

// what fraction of expected habit check-ins actually happened
const habitConsistency = (habits, from, to) => {
  if (habits.length === 0) return null;

  const days = Math.max(1, Math.round((to - from) / DAY));
  let expected = 0;
  let actual = 0;

  for (const h of habits) {
    const created = new Date(h.createdAt);
    // only count days after the habit existed
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

// fraction of days in the window that have a diary entry
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

/**
 * Compares the last 7 days against the previous 30-day baseline.
 * Returns a structured diagnosis with per-signal deltas.
 */
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

  // not enough history to judge anything
  const accountAge = tasks.length + habits.length + entries.length;
  if (accountAge < 5) {
    return {
      state: 'unknown',
      score: 0,
      signals: [],
      summary: 'Not enough history yet to know your normal.',
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

    const delta = (p.recent - p.baseline) / p.baseline; // negative = worse
    signals.push({
      key: p.key,
      label: p.label,
      recent: Math.round(p.recent * 100),
      baseline: Math.round(p.baseline * 100),
      changePct: Math.round(delta * 100),
      direction: delta < -0.1 ? 'down' : delta > 0.1 ? 'up' : 'steady',
    });
  }

  // overdue is absolute, not relative — treated separately
  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && dateStr(t.dueDate) < dateStr(now)
  ).length;

  // ---------- scoring ----------
  // each signal down by >10% adds weight; overdue adds its own
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

  let state;
  if (upCount >= 2 && score < 25) state = 'recovering';
  else if (score >= 50 || downCount >= 3) state = 'drifting';
  else if (score >= 25 || downCount >= 2) state = 'slipping';
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

module.exports = { calculateDrift };