const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const { askAI, cleanJsonString } = require('./aiService');
const { buildCompactContext } = require('./contextService');
const { buildPatternPrompt } = require('./prompts');

const DAY = 86400000;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayOf = (dateLike) => new Date(dateLike).getDay();
const pct = (n) => Math.round(n * 100);

// ---------- individual detectors ----------
// Each returns a finding object, or null if the evidence is too weak.
// Staying quiet is always better than claiming a weak pattern.

const habitDayBias = (habits) => {
  if (habits.length === 0) return null;

  const earliest = habits.reduce(
    (min, h) => Math.min(min, new Date(h.createdAt).getTime()),
    Date.now()
  );
  const totalDays = Math.floor((Date.now() - earliest) / DAY);
  if (totalDays < 14) return null;

  const done = [0, 0, 0, 0, 0, 0, 0];
  const possible = [0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(Date.now() - i * DAY);
    possible[d.getDay()] += habits.filter((h) => new Date(h.createdAt) <= d).length;
  }

  for (const h of habits) {
    for (const dateStr of h.completedDates || []) {
      done[dayOf(dateStr)] += 1;
    }
  }

  const rates = possible.map((p, i) => (p > 0 ? done[i] / p : null));
  const valid = rates.map((r, i) => ({ rate: r, day: i })).filter((x) => x.rate !== null);
  if (valid.length < 5) return null;

  const avg = valid.reduce((s, x) => s + x.rate, 0) / valid.length;
  const worst = valid.reduce((min, x) => (x.rate < min.rate ? x : min));
  const best = valid.reduce((max, x) => (x.rate > max.rate ? x : max));

  if (avg === 0 || worst.rate / avg > 0.6) return null;

  return {
    key: 'habit_day_bias',
    strength: 1 - worst.rate / avg,
    facts: {
      worstDay: DAY_NAMES[worst.day],
      worstRate: pct(worst.rate),
      bestDay: DAY_NAMES[best.day],
      bestRate: pct(best.rate),
      averageRate: pct(avg),
    },
    raw: `Habits are completed ${pct(worst.rate)}% of the time on ${
      DAY_NAMES[worst.day]
    }s, versus ${pct(avg)}% on an average day. Best day is ${DAY_NAMES[best.day]} at ${pct(
      best.rate
    )}%.`,
  };
};

const starCorrelation = (tasks) => {
  const starred = tasks.filter((t) => t.important);
  const plain = tasks.filter((t) => !t.important);

  if (starred.length < 4 || plain.length < 4) return null;

  const starredRate = starred.filter((t) => t.completed).length / starred.length;
  const plainRate = plain.filter((t) => t.completed).length / plain.length;

  const gap = Math.abs(starredRate - plainRate);
  if (gap < 0.2) return null;

  return {
    key: 'star_correlation',
    strength: gap,
    facts: {
      starredRate: pct(starredRate),
      plainRate: pct(plainRate),
      starredCount: starred.length,
      plainCount: plain.length,
      starsHelp: starredRate > plainRate,
    },
    raw: `Tasks marked important are completed ${pct(
      starredRate
    )}% of the time (${starred.length} of them). Unmarked tasks: ${pct(plainRate)}% (${
      plain.length
    }).`,
  };
};

const completionLag = (tasks) => {
  const done = tasks.filter((t) => t.completed && t.createdAt && t.updatedAt);
  if (done.length < 5) return null;

  const lags = done.map((t) => (new Date(t.updatedAt) - new Date(t.createdAt)) / DAY);
  const avg = lags.reduce((s, l) => s + l, 0) / lags.length;
  const sameDay = lags.filter((l) => l < 1).length / lags.length;

  if (sameDay < 0.6 && avg < 3) return null;

  return {
    key: 'completion_lag',
    strength: sameDay > 0.6 ? sameDay : Math.min(1, avg / 10),
    facts: {
      averageDays: Math.round(avg * 10) / 10,
      sameDayRate: pct(sameDay),
      sampleSize: done.length,
    },
    raw: `Of ${done.length} completed tasks, ${pct(
      sameDay
    )}% were finished the same day they were created. Average time from creation to completion: ${
      Math.round(avg * 10) / 10
    } days.`,
  };
};

const diaryRhythm = (entries) => {
  if (entries.length < 5) return null;

  const dates = entries
    .map((e) => e.entryDate)
    .sort()
    .map((d) => new Date(d).getTime());

  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push(Math.round((dates[i] - dates[i - 1]) / DAY));
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const maxGap = Math.max(...gaps);

  const byDay = [0, 0, 0, 0, 0, 0, 0];
  entries.forEach((e) => byDay[dayOf(e.entryDate)]++);
  const topDay = byDay.indexOf(Math.max(...byDay));
  const topShare = byDay[topDay] / entries.length;

  if (avgGap < 1.5 && topShare < 0.3) return null;

  return {
    key: 'diary_rhythm',
    strength: Math.min(1, avgGap / 5),
    facts: {
      averageGapDays: Math.round(avgGap * 10) / 10,
      longestGapDays: maxGap,
      favouriteDay: DAY_NAMES[topDay],
      favouriteDayShare: pct(topShare),
      entryCount: entries.length,
    },
    raw: `Across ${entries.length} entries, the average gap between writing is ${
      Math.round(avgGap * 10) / 10
    } days, longest ${maxGap}. ${pct(topShare)}% of entries fall on a ${DAY_NAMES[topDay]}.`,
  };
};

const fragileHabit = (habits) => {
  const eligible = habits.filter((h) => {
    const age = (Date.now() - new Date(h.createdAt)) / DAY;
    return age >= 10;
  });

  if (eligible.length < 2) return null;

  const scored = eligible.map((h) => {
    const age = Math.max(1, Math.floor((Date.now() - new Date(h.createdAt)) / DAY));
    return {
      name: h.name,
      category: h.category || 'health',
      rate: Math.min(1, (h.completedDates?.length || 0) / age),
      streak: h.streak || 0,
    };
  });

  const weakest = scored.reduce((min, s) => (s.rate < min.rate ? s : min));
  const strongest = scored.reduce((max, s) => (s.rate > max.rate ? s : max));

  if (strongest.rate - weakest.rate < 0.25) return null;

  return {
    key: 'fragile_habit',
    strength: strongest.rate - weakest.rate,
    facts: {
      weakest: weakest.name,
      weakestRate: pct(weakest.rate),
      strongest: strongest.name,
      strongestRate: pct(strongest.rate),
    },
    raw: `"${weakest.name}" is kept ${pct(weakest.rate)}% of days, while "${
      strongest.name
    }" is kept ${pct(strongest.rate)}%.`,
  };
};

// ---------- orchestrator ----------

const findPatterns = async (userId) => {
  const [tasks, habits, entries] = await Promise.all([
    Task.find({ user: userId }),
    Habit.find({ user: userId }),
    DiaryEntry.find({ user: userId }),
  ]);

  const findings = [
    habitDayBias(habits),
    starCorrelation(tasks),
    completionLag(tasks),
    diaryRhythm(entries),
    fragileHabit(habits),
  ].filter(Boolean);

  findings.sort((a, b) => b.strength - a.strength);

  return {
    findings: findings.slice(0, 4),
    dataPoints: tasks.length + habits.length + entries.length,
  };
};

// ---------- AI phrasing ----------

// cache — patterns are structural and change slowly
const patternCache = new Map();
const CACHE_MS = 12 * 60 * 60 * 1000; // 12 hours

const validatePatterns = (items, findings) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (p) =>
        p &&
        typeof p.title === 'string' &&
        p.title.trim() &&
        typeof p.observation === 'string' &&
        p.observation.trim()
    )
    .map((p, i) => ({
      key: findings[i]?.key || `pattern_${i}`,
      title: p.title.trim(),
      observation: p.observation.trim(),
      meaning: typeof p.meaning === 'string' ? p.meaning.trim() : '',
      strength: findings[i]?.strength ?? 0,
    }))
    .slice(0, findings.length);
};

// plain fallback if the AI is unavailable — the facts still stand
const rawFallback = (findings) =>
  findings.map((f) => ({
    key: f.key,
    title: 'A pattern in your data',
    observation: f.raw,
    meaning: '',
    strength: f.strength,
  }));

const getPatterns = async (userId, force = false) => {
  const key = userId.toString();

  if (!force) {
    const cached = patternCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }
  }

  const { findings, dataPoints } = await findPatterns(userId);

  if (findings.length === 0) {
    return {
      patterns: [],
      dataPoints,
      thin: true,
      message:
        dataPoints < 15
          ? 'Not enough history yet. Patterns need a few weeks of use to appear.'
          : 'Nothing stands out yet. Your behaviour is fairly even — which is its own kind of pattern.',
    };
  }

  try {
    const context = await buildCompactContext(userId);
    const prompt = buildPatternPrompt(findings, context);
    const raw = await askAI(prompt);
    const cleaned = cleanJsonString(raw);
    const parsed = JSON.parse(cleaned);

    const patterns = validatePatterns(parsed, findings);
    const result = {
      patterns: patterns.length > 0 ? patterns : rawFallback(findings),
      dataPoints,
      thin: false,
      generatedAt: new Date(),
    };

    patternCache.set(key, { result, expiresAt: Date.now() + CACHE_MS });
    return result;
  } catch (err) {
    console.error('Pattern phrasing failed:', err.message);
    return { patterns: rawFallback(findings), dataPoints, thin: false };
  }
};

module.exports = { findPatterns, getPatterns };