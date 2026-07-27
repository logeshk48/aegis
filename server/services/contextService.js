const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');

// gather a user's data into a text summary the AI can read
const buildUserContext = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  // fetch the user's tasks (most recent 50)
  const tasks = await Task.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50);

  // fetch all habits
  const habits = await Habit.find({ user: userId });

  // fetch recent diary entries (most recent 20)
  const diaryEntries = await DiaryEntry.find({ user: userId })
    .sort({ entryDate: -1 })
    .limit(20);

  // --- format tasks ---
  const taskLines =
    tasks.length > 0
      ? tasks
          .map((t) => {
            const status = t.completed ? 'completed' : 'pending';
            const due = t.dueDate
              ? `due ${new Date(t.dueDate).toISOString().split('T')[0]}`
              : 'no due date';
            const created = new Date(t.createdAt).toISOString().split('T')[0];
            const done = t.completed
              ? `, completed on ${new Date(t.updatedAt).toISOString().split('T')[0]}`
              : '';
            return `- "${t.title}" | ${t.priority} priority | ${status} | ${due} | created ${created}${done}`;
          })
          .join('\n')
      : '(no tasks)';

  // --- format habits ---
  const habitLines =
    habits.length > 0
      ? habits
          .map((h) => {
            const dates =
              h.completedDates && h.completedDates.length > 0
                ? h.completedDates.slice(-30).join(', ')
                : 'never';
            return `- "${h.name}" | current streak: ${h.streak} days | completed on: ${dates}`;
          })
          .join('\n')
      : '(no habits)';

  // --- format diary entries ---
  const diaryLines =
    diaryEntries.length > 0
      ? diaryEntries
          .map((d) => `[${d.entryDate}]: ${d.content}`)
          .join('\n\n')
      : '(no diary entries)';

  return `Today's date is ${today}.

USER'S TASKS:
${taskLines}

USER'S HABITS:
${habitLines}

USER'S DIARY ENTRIES:
${diaryLines}`;
};

module.exports = { buildUserContext };