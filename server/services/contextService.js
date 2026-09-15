const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const Memory = require('../models/Memory');

/**
 * FULL context — everything the AI might need.
 * Used for question answering and suggestions.
 * Kept deliberately tight: oversized context blows past the
 * provider's tokens-per-minute limit.
 */
const buildUserContext = async (userId) => {
  const today = new Date().toISOString().split('T')[0];

  const memories = await Memory.find({ user: userId })
    .sort({ reinforcedCount: -1, updatedAt: -1 })
    .limit(40);

  const tasks = await Task.find({ user: userId }).sort({ createdAt: -1 }).limit(30);
  const habits = await Habit.find({ user: userId });
  const diaryEntries = await DiaryEntry.find({ user: userId })
    .sort({ entryDate: -1 })
    .limit(10);

  // --- memories, grouped by category ---
  let memoryLines = '(nothing learned yet)';
  if (memories.length > 0) {
    const byCategory = memories.reduce((acc, m) => {
      (acc[m.category] = acc[m.category] || []).push(m);
      return acc;
    }, {});

    memoryLines = Object.entries(byCategory)
      .map(([cat, items]) => {
        const lines = items
          .map((m) => `  - ${m.content}${m.reinforcedCount > 2 ? ' (seen often)' : ''}`)
          .join('\n');
        return `${cat.toUpperCase()}:\n${lines}`;
      })
      .join('\n');
  }

  // --- tasks (compact) ---
  const taskLines =
    tasks.length > 0
      ? tasks
          .map((t) => {
            const status = t.completed ? 'done' : 'pending';
            const due = t.dueDate
              ? new Date(t.dueDate).toISOString().split('T')[0]
              : 'no date';
            const star = t.important ? ' *' : '';
            return `- "${t.title}"${star} | ${status} | due ${due}`;
          })
          .join('\n')
      : '(no tasks)';

  // --- habits (last 14 dates only) ---
  const habitLines =
    habits.length > 0
      ? habits
          .map((h) => {
            const dates =
              h.completedDates && h.completedDates.length > 0
                ? h.completedDates.slice(-14).join(', ')
                : 'never';
            return `- "${h.name}" (${h.category || 'health'}) | streak ${h.streak} | done: ${dates}`;
          })
          .join('\n')
      : '(no habits)';

  // --- diary (truncated per entry) ---
  const diaryLines =
    diaryEntries.length > 0
      ? diaryEntries
          .map((d) => {
            const snippet =
              d.content.length > 400 ? d.content.slice(0, 400) + '…' : d.content;
            return `[${d.entryDate}]: ${snippet}`;
          })
          .join('\n\n')
      : '(no diary entries)';

  return `Today's date is ${today}.

WHAT YOU KNOW ABOUT THIS USER:
${memoryLines}

USER'S TASKS:
${taskLines}

USER'S HABITS:
${habitLines}

USER'S DIARY ENTRIES:
${diaryLines}`;
};

/**
 * COMPACT context — just who the user is, no raw history.
 * Used by drift analysis, which already has the numbers it needs
 * and only requires personal context to explain them well.
 * Roughly a fifth of the tokens of the full context.
 */
const buildCompactContext = async (userId) => {
  const memories = await Memory.find({ user: userId })
    .sort({ reinforcedCount: -1, updatedAt: -1 })
    .limit(30);

  const habits = await Habit.find({ user: userId });

  const memoryLines =
    memories.length > 0
      ? memories.map((m) => `- [${m.category}] ${m.content}`).join('\n')
      : '(nothing learned yet)';

  const habitLines =
    habits.length > 0
      ? habits.map((h) => `- "${h.name}" | streak ${h.streak}`).join('\n')
      : '(no habits)';

  return `WHAT YOU KNOW ABOUT THIS USER:
${memoryLines}

THEIR HABITS:
${habitLines}`;
};

module.exports = { buildUserContext, buildCompactContext };