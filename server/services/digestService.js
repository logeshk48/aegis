const Task = require('../models/Task');
const Habit = require('../models/Habit');

// build the digest data + HTML for one user
const buildDigestForUser = async (user) => {
  const today = new Date().toISOString().split('T')[0];

  // --- gather tasks ---
  const pendingTasks = await Task.find({ user: user._id, completed: false })
    .sort({ dueDate: 1 })
    .limit(10);

  // tasks completed in the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentlyCompleted = await Task.countDocuments({
    user: user._id,
    completed: true,
    updatedAt: { $gte: yesterday },
  });

  // tasks due today or overdue
  const dueSoon = pendingTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().split('T')[0] <= today
  );

  // --- gather habits ---
  const habits = await Habit.find({ user: user._id });
  const habitsDoneToday = habits.filter((h) => h.completedDates?.includes(today));
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  // --- compose the HTML email ---
  const taskListHtml =
    pendingTasks.length > 0
      ? pendingTasks
          .map(
            (t) =>
              `<li style="margin-bottom:6px;">${t.title} <span style="color:#888;font-size:12px;">(${t.priority})</span></li>`
          )
          .join('')
      : '<li style="color:#888;">Nothing pending — nice work! 🎉</li>';

  const habitListHtml =
    habits.length > 0
      ? habits
          .map(
            (h) =>
              `<li style="margin-bottom:6px;">${h.name} — 🔥 ${h.streak} day streak</li>`
          )
          .join('')
      : '<li style="color:#888;">No habits yet.</li>';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
      <h2 style="color:#4f46e5;">Good morning, ${user.name} 👋</h2>
      <p style="color:#64748b;">Here's your Aegis daily brief.</p>

      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;"><strong>Yesterday:</strong> you completed <strong>${recentlyCompleted}</strong> task(s).</p>
        <p style="margin:8px 0 0;"><strong>Habits done today:</strong> ${habitsDoneToday.length} of ${habits.length}</p>
        ${bestStreak > 0 ? `<p style="margin:8px 0 0;"><strong>Best streak:</strong> 🔥 ${bestStreak} days</p>` : ''}
      </div>

      ${
        dueSoon.length > 0
          ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;">
               <strong style="color:#b91c1c;">⏰ Due today or overdue (${dueSoon.length}):</strong>
               <ul style="margin:8px 0 0;padding-left:20px;">
                 ${dueSoon.map((t) => `<li>${t.title}</li>`).join('')}
               </ul>
             </div>`
          : ''
      }

      <h3 style="margin-bottom:8px;">📋 Your pending tasks</h3>
      <ul style="padding-left:20px;margin-top:0;">${taskListHtml}</ul>

      <h3 style="margin-bottom:8px;">🔥 Your habits</h3>
      <ul style="padding-left:20px;margin-top:0;">${habitListHtml}</ul>

      <p style="margin-top:24px;color:#94a3b8;font-size:12px;">
        Sent by Aegis — your AI personal assistant.
      </p>
    </div>
  `;

  return {
    subject: `Your Aegis brief — ${pendingTasks.length} task(s) pending`,
    html,
  };
};

module.exports = { buildDigestForUser };