const SleepLog = require('../models/SleepLog');
const Task = require('../models/Task');
const DiaryEntry = require('../models/DiaryEntry');
const FocusSession = require('../models/FocusSession');

const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;

// The server runs in UTC on Render; you don't. Everything below works in
// local minutes so a night doesn't get filed under the wrong day.
const TZ_OFFSET_MIN = Number(process.env.TZ_OFFSET_MIN || 330); // IST
const toLocal = (d) => new Date(new Date(d).getTime() + TZ_OFFSET_MIN * MINUTE);
const localDateStr = (d) => toLocal(d).toISOString().split('T')[0];
const localMinutes = (d) => {
  const l = toLocal(d);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
};

// A night belongs to the morning you wake into. Shifting twelve hours
// forward puts both "23:30" and "01:30" on the same date.
const nightDateFor = (sleepAt) => localDateStr(new Date(new Date(sleepAt).getTime() + 12 * HOUR));

// Bedtime as minutes past noon, so 23:30 and 00:30 are 60 minutes apart
// rather than 1380. Without this, any average bedtime near midnight is nonsense.
const bedtimeAxis = (sleepAt) => {
  const m = localMinutes(sleepAt);
  return m < 720 ? m + 1440 : m;
};

// ---------- inference ----------
// A gap in app usage is NOT sleep. It is the absence of evidence, and the
// first version happily reported a 13-hour "night" that was really a Sunday
// off. These bounds are what separates a night from not opening the app.

const MIN_GAP_MS = 4 * HOUR;
const MAX_GAP_MS = 11 * HOUR;

const plausibleBedtime = (d) => {
  const m = localMinutes(d);
  return m >= 19 * 60 || m <= 5 * 60; // 19:00–05:00
};

const plausibleWake = (d) => {
  const m = localMinutes(d);
  return m >= 4 * 60 && m <= 12 * 60; // 04:00–12:00
};

/**
 * Guesses last night from timestamps we already have.
 * Deliberately conservative: no evidence means no record, and whatever it
 * does return is a question to ask you, never a fact. Nothing computed
 * downstream is allowed to use it until you confirm it.
 */
const inferNight = async (userId, date) => {
  const dayStart = new Date(`${date}T00:00:00.000Z`).getTime() - TZ_OFFSET_MIN * MINUTE;
  const from = new Date(dayStart - 6 * HOUR); // 18:00 the evening before
  const to = new Date(dayStart + 12 * HOUR); // noon on the day itself

  const [tasks, entries, sessions] = await Promise.all([
    Task.find({ user: userId, updatedAt: { $gte: from, $lte: to } }).select('updatedAt'),
    DiaryEntry.find({ user: userId, createdAt: { $gte: from, $lte: to } }).select('createdAt'),
    FocusSession.find({ user: userId, startedAt: { $gte: from, $lte: to } }).select(
      'startedAt endedAt'
    ),
  ]);

  const stamps = [
    ...tasks.map((t) => new Date(t.updatedAt).getTime()),
    ...entries.map((e) => new Date(e.createdAt).getTime()),
    ...sessions.flatMap((s) =>
      [s.startedAt, s.endedAt].filter(Boolean).map((d) => new Date(d).getTime())
    ),
  ].sort((a, b) => a - b);

  if (stamps.length < 2) return null;

  let best = null;
  for (let i = 1; i < stamps.length; i++) {
    const start = new Date(stamps[i - 1]);
    const end = new Date(stamps[i]);
    const gap = stamps[i] - stamps[i - 1];

    if (gap < MIN_GAP_MS || gap > MAX_GAP_MS) continue;
    if (!plausibleBedtime(start) || !plausibleWake(end)) continue;

    if (!best || gap > best.gap) best = { gap, start, end };
  }

  if (!best) return null;

  return {
    sleepAt: best.start,
    wakeAt: best.end,
    minutes: Math.round(best.gap / MINUTE),
    source: 'inferred',
  };
};

// ---------- writing ----------

const upsertNight = async (userId, date, fields) =>
  SleepLog.findOneAndUpdate(
    { user: userId, date },
    { $set: { user: userId, date, ...fields } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

/**
 * "Turning in." Stamps the start of tonight, filed under tomorrow's date.
 */
const logSleepStart = async (userId, at = new Date()) => {
  const when = new Date(at);
  const date = nightDateFor(when);
  const existing = await SleepLog.findOne({ user: userId, date });

  const minutes = existing?.wakeAt
    ? Math.max(0, Math.round((new Date(existing.wakeAt) - when) / MINUTE))
    : null;

  return upsertNight(userId, date, {
    sleepAt: when,
    minutes,
    source: existing?.wakeAt && existing.source === 'inferred' ? 'mixed' : 'logged',
  });
};

/**
 * "Just woke up." Completes the night, or opens one if you forgot to say
 * goodnight — in which case we fall back to the inferred sleep time, and
 * confirming it is what promotes that guess into a fact.
 */
const logWake = async (userId, at = new Date()) => {
  const when = new Date(at);
  const date = localDateStr(when);
  const existing = await SleepLog.findOne({ user: userId, date });

  let sleepAt = existing?.sleepAt || null;
  let source = 'logged';

  if (!sleepAt) {
    const guess = await inferNight(userId, date);
    if (guess) {
      sleepAt = guess.sleepAt;
      source = 'mixed';
    }
  } else if (existing.source === 'inferred') {
    source = 'mixed';
  }

  return upsertNight(userId, date, {
    sleepAt,
    wakeAt: when,
    minutes: sleepAt ? Math.max(0, Math.round((when - new Date(sleepAt)) / MINUTE)) : null,
    source,
    confirmed: true,
  });
};

/**
 * A manual correction always wins, and marks the night confirmed.
 */
const correctNight = async (userId, date, { sleepAt, wakeAt, note }) => {
  const s = sleepAt ? new Date(sleepAt) : null;
  const w = wakeAt ? new Date(wakeAt) : null;

  if (s && Number.isNaN(s.getTime())) {
    throw Object.assign(new Error('Invalid sleepAt'), { status: 400 });
  }
  if (w && Number.isNaN(w.getTime())) {
    throw Object.assign(new Error('Invalid wakeAt'), { status: 400 });
  }
  if (s && w && w <= s) {
    throw Object.assign(new Error('Wake time must be after sleep time'), { status: 400 });
  }

  return upsertNight(userId, date, {
    ...(s ? { sleepAt: s } : {}),
    ...(w ? { wakeAt: w } : {}),
    ...(s && w ? { minutes: Math.round((w - s) / MINUTE) } : {}),
    ...(typeof note === 'string' ? { note: note.slice(0, 200) } : {}),
    source: 'logged',
    confirmed: true,
  });
};

/**
 * Confirms a guess as-is, without editing it.
 */
const confirmNight = async (userId, date) => {
  const log = await SleepLog.findOne({ user: userId, date });
  if (!log) throw Object.assign(new Error('No record for that night'), { status: 404 });

  log.confirmed = true;
  await log.save();
  return log;
};

/**
 * Fills in missing recent nights from inference. Runs on read, so a history
 * builds itself — but every row it writes is unconfirmed and inert until
 * you say yes to it.
 */
const backfill = async (userId, days = 7) => {
  const today = localDateStr(new Date());
  const existing = await SleepLog.find({ user: userId }).select('date').lean();
  const have = new Set(existing.map((e) => e.date));

  for (let i = 1; i <= days; i++) {
    const date = localDateStr(new Date(Date.now() - i * DAY));
    if (have.has(date) || date === today) continue;

    const guess = await inferNight(userId, date);
    if (guess) await upsertNight(userId, date, { ...guess, confirmed: false });
  }
};

// ---------- reading ----------

const getRecent = async (userId, days = 14) => {
  const from = localDateStr(new Date(Date.now() - days * DAY));
  return SleepLog.find({ user: userId, date: { $gte: from } }).sort({ date: 1 }).lean();
};

/**
 * Rhythm, not streak. Regularity is the number that matters, and it
 * degrades gently instead of shattering on one late night.
 *
 * Confirmed nights only. A guess is not evidence.
 */
const getRhythm = (nights) => {
  const known = nights.filter((n) => n.confirmed);
  const withBed = known.filter((n) => n.sleepAt);
  const withMinutes = known.filter((n) => n.minutes > 0);

  if (withBed.length < 2) {
    return {
      nights: withBed.length,
      bedtimeSpreadMin: null,
      avgMinutes: null,
      avgBedtimeMin: null,
    };
  }

  const axes = withBed.map((n) => bedtimeAxis(n.sleepAt));
  const mean = axes.reduce((a, b) => a + b, 0) / axes.length;
  const variance = axes.reduce((sum, a) => sum + (a - mean) ** 2, 0) / axes.length;

  return {
    nights: withBed.length,
    bedtimeSpreadMin: Math.round(Math.sqrt(variance)),
    avgBedtimeMin: Math.round(mean),
    avgMinutes: withMinutes.length
      ? Math.round(withMinutes.reduce((s, n) => s + n.minutes, 0) / withMinutes.length)
      : null,
  };
};

/**
 * What last night bought you. Sleep sets how much Aegis asks for today —
 * it does not hand out points. A bad night makes the day gentler, which is
 * the same logic as giving a drifting person a ten-minute mission.
 */
const capacityFor = ({ minutes, bedtimeSpreadMin, nights }) => {
  if (!minutes) return { factor: 1, reason: 'No sleep recorded for last night.' };

  const h = minutes / 60;
  const hours = h.toFixed(1);

  if (h < 5.5) return { factor: 0.6, reason: `Only ${hours} hours. Today is smaller on purpose.` };
  if (h < 6.5) return { factor: 0.8, reason: `${hours} hours — a little short, so today asks less.` };
  if (h > 10) return { factor: 0.9, reason: `${hours} hours is a lot. Easing in.` };

  const steady = nights >= 5 && bedtimeSpreadMin !== null && bedtimeSpreadMin < 45;
  if (h >= 7 && steady) {
    return { factor: 1.3, reason: `${hours} hours and a steady bedtime. Today can be bigger.` };
  }
  if (h >= 7) return { factor: 1.1, reason: `${hours} hours. Good to go.` };

  return { factor: 1, reason: `${hours} hours. A normal day.` };
};

/**
 * The whole picture in one call — what the Home card and the mission both read.
 */
const getSleepState = async (userId) => {
  await backfill(userId, 7);

  const nights = await getRecent(userId, 14);
  const rhythm = getRhythm(nights);

  const today = localDateStr(new Date());
  const lastNight = nights.find((n) => n.date === today) || null;

  // Only a confirmed night is allowed to change today's size.
  const capacity = capacityFor({
    minutes: lastNight?.confirmed ? lastNight.minutes : null,
    bedtimeSpreadMin: rhythm.bedtimeSpreadMin,
    nights: rhythm.nights,
  });

  // you said goodnight but never said good morning
  const pendingWake = !!(lastNight && lastNight.sleepAt && !lastNight.wakeAt);

  // a guess waiting to be accepted or corrected
  const needsConfirm = !!(lastNight && !lastNight.confirmed && lastNight.minutes);

  return {
    lastNight,
    pendingWake,
    needsConfirm,
    rhythm,
    capacity,
    nights,
  };
};

module.exports = {
  inferNight,
  logSleepStart,
  logWake,
  correctNight,
  confirmNight,
  getRecent,
  getRhythm,
  capacityFor,
  getSleepState,
  localDateStr,
  nightDateFor,
  bedtimeAxis,
};