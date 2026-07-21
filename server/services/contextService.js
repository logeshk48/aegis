const Task = require('../models/Task');
const Habit = require('../models/Habit');

// gather a user's data into a text summary the AI can read
const buildUserContext = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  // fetch the user's tasks (most recent 50 to keep the prompt manageable)
  const tasks = await Task.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(50);

  // fetch all habits
  const habits = await Habit.find({ user: userId });

  // --- format tasks as readable lines ---
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

  // --- format habits with their completion history ---
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

  return `Today's date is ${today}.

USER'S TASKS:
${taskLines}

USER'S HABITS:
${habitLines}`;
};

module.exports = { buildUserContext };