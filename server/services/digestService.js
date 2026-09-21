const Task = require('../models/Task');
const Habit = require('../models/Habit');
const FocusSession = require('../models/FocusSession');
const { getDriftReport } = require('./driftService');
const { generateRead } = require('./readService');

const DAY = 86400000;
const TZ = process.env.DIGEST_TZ || 'Asia/Kolkata';
const todayStr = () => new Date().toISOString().split('T')[0];

const STATE_COLOR = {
  steady: '#8fbf9f',
  recovering: '#d4af7a',
  slipping: '#e8c99b',
  drifting: '#c98b8b',
  unknown: '#6b4d8f',
};

const STATE_WORD = {
  steady: 'Holding steady',
  recovering: 'Recovering',
  slipping: 'Slipping',
  drifting: 'Drifting',
  unknown: 'Still learning you',
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// times are written in the user's timezone, not the server's (UTC)
const timeIn = (d) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

const label = (text) =>
  `<h3 style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;margin:28px 0 10px;">${text}</h3>`;

const list = (items) =>
  `<ul style="margin:0;padding-left:18px;color:#c9c2d4;font-size:14px;line-height:1.9;">${items.join('')}</ul>`;

/**
 * Builds the morning brief: what Aegis thinks, what's planned,
 * and the one thing worth doing — not just a task list.
 */
const buildDigestForUser = async (user) => {
  const today = todayStr();
  const now = new Date();
  const in24h = new Date(now.getTime() + DAY);
  const yesterday = new Date(now.getTime() - DAY);

  // --- gather ---
  const [tasks, habits, planned, focusSessions, doneYesterday] = await Promise.all([
    Task.find({ user: user._id, completed: false }).sort({ dueDate: 1 }).limit(15),
    Habit.find({ user: user._id }),
    Task.find({
      user: user._id,
      completed: false,
      scheduledAt: { $gte: now, $lt: in24h },
    }).sort({ scheduledAt: 1 }),
    FocusSession.find({
      user: user._id,
      endedAt: { $gte: yesterday },
      status: { $in: ['completed', 'abandoned', 'expired'] },
    }),
    Task.countDocuments({
      user: user._id,
      completed: true,
      updatedAt: { $gte: yesterday },
    }),
  ]);

  const focusMinutes = Math.round(
    focusSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
  );

  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] < today
  );

  // planned things get their own section, so leave them out of "Today"
  const dueToday = tasks.filter(
    (t) =>
      !t.scheduledAt &&
      t.dueDate &&
      new Date(t.dueDate).toISOString().split('T')[0] === today
  );

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const habitsPending = habits.filter((h) => !h.completedDates?.includes(today));

  // --- what Aegis thinks (fails soft — the email still sends without it) ---
  let drift = null;
  let read = null;

  try {
    drift = await getDriftReport(user._id);
  } catch (err) {
    console.error('Digest: drift unavailable —', err.message);
  }

  try {
    read = await generateRead(user._id);
  } catch (err) {
    console.error('Digest: read unavailable —', err.message);
  }

  const state = drift?.state || 'unknown';
  const accent = STATE_COLOR[state];

  // the single most important thing today
  const firstStep =
    drift?.plan?.[0]?.step ||
    (planned.length > 0 ? `${planned[0].title} at ${timeIn(planned[0].scheduledAt)}` : null) ||
    (overdue.length > 0 ? `Clear "${overdue[0].title}"` : null) ||
    (habitsPending.length > 0 ? `Tend "${habitsPending[0].name}"` : null) ||
    'Write a line in your diary tonight';

  // --- compose ---
  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: TZ,
  });

  const downSignals =
    drift?.signals?.filter((s) => s.direction === 'down').slice(0, 3) || [];
  const showSignals = downSignals.length > 1 || overdue.length > 0;

  const signalHtml = showSignals
    ? `<ul style="margin:12px 0 0;padding-left:18px;color:#8a819e;font-size:13px;line-height:1.9;">
        ${downSignals
          .map((s) => `<li>${s.label} down ${Math.abs(s.changePct)}% from your normal</li>`)
          .join('')}
        ${overdue.length > 0 ? `<li>${plural(overdue.length, 'task')} past their date</li>` : ''}
      </ul>`
    : '';

  const plannedHtml =
    planned.length > 0
      ? label('Planned') +
        list(
          planned.map(
            (t) =>
              `<li>${t.title} <span style="color:#d4af7a;font-size:12px;">— ${timeIn(
                t.scheduledAt
              )}</span></li>`
          )
        )
      : '';

  const taskHtml =
    dueToday.length > 0 || overdue.length > 0
      ? label('Today') +
        list([
          ...overdue.map(
            (t) =>
              `<li>${t.title} <span style="color:#c98b8b;font-size:12px;">— overdue</span></li>`
          ),
          ...dueToday.map((t) => `<li>${t.title}</li>`),
        ])
      : '';

  const habitHtml =
    habitsPending.length > 0
      ? label('Rituals waiting') +
        list(
          habitsPending
            .slice(0, 5)
            .map(
              (h) =>
                `<li>${h.name}${
                  h.streak > 0
                    ? ` <span style="color:#8a819e;font-size:12px;">— ${plural(h.streak, 'day')}</span>`
                    : ''
                }</li>`
            )
        )
      : '';

  const footerBits = [];
  if (focusMinutes > 0) footerBits.push(`You focused ${plural(focusMinutes, 'minute')} yesterday.`);
  if (doneYesterday > 0) footerBits.push(`You finished ${plural(doneYesterday, 'thing')}.`);
  if (bestStreak > 0) footerBits.push(`Longest streak: ${plural(bestStreak, 'day')}.`);

  const html = `
  <div style="background:#14101f;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:linear-gradient(160deg,#1e1830 0%,#14101f 100%);border:1px solid rgba(212,175,122,0.12);border-radius:20px;padding:32px 28px;">

      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#8a819e;">${dateLine}</p>

      <p style="margin:18px 0 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${accent};font-weight:600;">
        ${STATE_WORD[state]}
      </p>

      <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;color:#f7f4f0;font-weight:600;">
        ${drift?.headline || 'Good morning.'}
      </h1>

      ${
        drift?.explanation
          ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.75;color:#c9c2d4;">${drift.explanation}</p>`
          : ''
      }

      ${signalHtml}

      <div style="margin:28px 0 0;padding:18px 20px;background:rgba(212,175,122,0.07);border-left:2px solid #d4af7a;border-radius:0 12px 12px 0;">
        <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;">One thing today</p>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#f7f4f0;">${firstStep}</p>
      </div>

      ${plannedHtml}
      ${taskHtml}
      ${habitHtml}

      ${
        footerBits.length > 0
          ? `<p style="margin:28px 0 0;font-size:13px;line-height:1.7;color:#8a819e;">${footerBits.join(' ')}</p>`
          : ''
      }

      ${
        read?.closing
          ? `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid rgba(212,175,122,0.12);font-size:16px;line-height:1.5;color:#d4af7a;text-align:center;font-style:italic;">
              ${read.closing}
             </p>`
          : ''
      }

      <p style="margin:28px 0 0;font-size:11px;color:#5d5570;text-align:center;">Aegis</p>
    </div>
  </div>`;

  const subject =
    state === 'drifting' || state === 'slipping'
      ? `${STATE_WORD[state]} — one thing today`
      : planned.length > 0
      ? `Today: ${planned[0].title} at ${timeIn(planned[0].scheduledAt)}`
      : drift?.headline
      ? drift.headline.replace(/\.$/, '')
      : 'Your morning brief';

  return { subject, html };
};

module.exports = { buildDigestForUser };