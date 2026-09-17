const Task = require('../models/Task');
const Habit = require('../models/Habit');
const { getDriftReport } = require('./driftService');
const { generateRead } = require('./readService');

const DAY = 86400000;
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

/**
 * Builds the morning brief: what Aegis thinks, not just what's on your list.
 */
const buildDigestForUser = async (user) => {
  const today = todayStr();

  // --- gather ---
  const [tasks, habits] = await Promise.all([
    Task.find({ user: user._id, completed: false }).sort({ dueDate: 1 }).limit(10),
    Habit.find({ user: user._id }),
  ]);

  const yesterday = new Date(Date.now() - DAY);
  const doneYesterday = await Task.countDocuments({
    user: user._id,
    completed: true,
    updatedAt: { $gte: yesterday },
  });

  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] < today
  );

  const dueToday = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] === today
  );

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const habitsPending = habits.filter((h) => !h.completedDates?.includes(today));

  // --- what Aegis thinks (fails soft — email still sends without it) ---
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
    (overdue.length > 0 ? `Clear "${overdue[0].title}"` : null) ||
    (habitsPending.length > 0 ? `Tend "${habitsPending[0].name}"` : null) ||
    'Write a line in your diary tonight';

  // --- compose ---
  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const signalLines =
    drift?.signals?.filter((s) => s.direction === 'down').slice(0, 3) || [];

  const signalHtml =
    signalLines.length > 0
      ? `<ul style="margin:12px 0 0;padding-left:18px;color:#8a819e;font-size:13px;line-height:1.9;">
          ${signalLines
            .map(
              (s) =>
                `<li>${s.label} down ${Math.abs(s.changePct)}% from your normal</li>`
            )
            .join('')}
          ${overdue.length > 0 ? `<li>${overdue.length} task${overdue.length > 1 ? 's' : ''} past their date</li>` : ''}
        </ul>`
      : '';

  const taskHtml =
    dueToday.length > 0 || overdue.length > 0
      ? `<h3 style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;margin:28px 0 10px;">Today</h3>
         <ul style="margin:0;padding-left:18px;color:#c9c2d4;font-size:14px;line-height:1.9;">
           ${overdue.map((t) => `<li>${t.title} <span style="color:#c98b8b;font-size:12px;">— overdue</span></li>`).join('')}
           ${dueToday.map((t) => `<li>${t.title}</li>`).join('')}
         </ul>`
      : '';

  const habitHtml =
    habitsPending.length > 0
      ? `<h3 style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;margin:28px 0 10px;">Rituals waiting</h3>
         <ul style="margin:0;padding-left:18px;color:#c9c2d4;font-size:14px;line-height:1.9;">
           ${habitsPending.slice(0, 5).map((h) => `<li>${h.name}${h.streak > 0 ? ` <span style="color:#8a819e;font-size:12px;">— ${h.streak} day streak</span>` : ''}</li>`).join('')}
         </ul>`
      : '';

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

      <!-- the one thing -->
      <div style="margin:28px 0 0;padding:18px 20px;background:rgba(212,175,122,0.07);border-left:2px solid #d4af7a;border-radius:0 12px 12px 0;">
        <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af7a;">One thing today</p>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#f7f4f0;">${firstStep}</p>
      </div>

      ${taskHtml}
      ${habitHtml}

      ${
        doneYesterday > 0 || bestStreak > 0
          ? `<p style="margin:28px 0 0;font-size:13px;color:#8a819e;">
              ${doneYesterday > 0 ? `You finished ${doneYesterday} yesterday.` : ''}
              ${bestStreak > 0 ? ` Longest streak: ${bestStreak} days.` : ''}
             </p>`
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
      : drift?.headline
      ? drift.headline.replace(/\.$/, '')
      : 'Your morning brief';

  return { subject, html };
};

module.exports = { buildDigestForUser };