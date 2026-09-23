const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');
const { saveEntry } = require('./diaryService');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const todayStr = () => dateStr(new Date());

// ---------- what counts as risky ----------
// LOSSY tools overwrite something we cannot reconstruct afterwards: a due
// date, a completion flag, a streak. Creates are deliberately NOT lossy —
// the worst a stray create_task does is add clutter you can delete, and
// gating "plan my week" behind a confirmation would be maddening.
//
// One or two lossy changes run straight away and come back with undo data,
// which is the pattern the rest of Aegis already uses. Three or more get
// proposed instead, because undoing forty reschedules one toast at a time
// is not undo.

const LOSSY = new Set([
  'reschedule_task',
  'complete_task',
  'uncomplete_task',
  'check_in_habit',
  'undo_habit_checkin',
]);

const BULK_THRESHOLD = 3; // lossy calls in one turn before we stop and ask
const MAX_LOSSY_PER_RUN = 4; // cumulative ceiling across the whole run

// ---------- tool definitions (what the model sees) ----------

const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description:
        "Read the user's tasks. Use this before changing anything, so you know what exists and have the real task ids.",
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'open', 'completed', 'overdue', 'today'],
            description: 'Which tasks to return. Defaults to open.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task for the user. Use when they ask for something to be added, or when a plan needs a concrete step.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short, clear task name' },
          dueDate: {
            type: 'string',
            description: 'Due date as YYYY-MM-DD. Omit if there is no deadline.',
          },
          important: {
            type: 'boolean',
            description: 'Mark as important if it clearly matters more than the rest.',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_task',
      description:
        "Change a task's due date. Use when the user wants to move something, or to spread out an overloaded day.",
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task _id from get_tasks' },
          dueDate: {
            type: 'string',
            description: 'New date as YYYY-MM-DD, or the string "none" to remove the date.',
          },
        },
        required: ['taskId', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as done. Only use when the user says they have done it.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task _id from get_tasks' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uncomplete_task',
      description:
        'Reopen a task that was marked done by mistake. Use when the user says they had not actually finished it.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task _id from get_tasks' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_habits',
      description: "Read the user's habits with their streaks and recent completion dates.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description:
        'Start tracking a new habit. Use when the user wants to build a routine, not a one-off task.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short habit name' },
          category: {
            type: 'string',
            enum: ['health', 'mind', 'craft', 'connection'],
            description: 'Which area of life it serves',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_in_habit',
      description:
        "Mark a habit as done for today. Only when the user says they've done it. This changes their streak, so never guess.",
      parameters: {
        type: 'object',
        properties: {
          habitId: { type: 'string', description: 'The habit _id from get_habits' },
        },
        required: ['habitId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'undo_habit_checkin',
      description:
        "Remove today's check-in from a habit, for when it was logged by mistake. Recalculates the streak.",
      parameters: {
        type: 'object',
        properties: {
          habitId: { type: 'string', description: 'The habit _id from get_habits' },
        },
        required: ['habitId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_diary',
      description:
        "Search the user's diary entries for a word or phrase. Use to answer questions about their past.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Word or phrase to look for' },
          limit: { type: 'number', description: 'Max entries to return (default 5)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_diary',
      description:
        "Save what the user told you about their day as a diary entry. Use this whenever they are recounting what happened, how they felt, or what is on their mind — not when they are giving you an instruction. Pass their words through EXACTLY as they wrote them: never summarise, tidy or rephrase, because this is their record and the memory extraction reads the original wording. Saving also draws out any tasks mentioned in the text, so do NOT also call create_task for things already in what you saved.",
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: "The user's own words, verbatim.",
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_focus',
      description:
        'Offer the user a focus session on one of their tasks. This does NOT start anything — it puts a start button in front of them. Use when they ask what to work on, or say they want to get going.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task _id from get_tasks' },
          minutes: {
            type: 'number',
            description: 'Session length, 5 to 120. Keep it small if they sound stuck.',
          },
          why: {
            type: 'string',
            description: 'One short line on why this task, in their own terms.',
          },
        },
        required: ['taskId'],
      },
    },
  },
];

// ---------- shared helpers ----------

const recalcStreak = (habit) => {
  const set = new Set(habit.completedDates || []);
  let streak = 0;
  const cursor = new Date();
  while (set.has(dateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  habit.streak = streak;
  return streak;
};

const ownedTask = async (userId, taskId) => {
  const task = await Task.findById(taskId).catch(() => null);
  if (!task) return { error: 'No task with that id.' };
  if (task.user.toString() !== userId.toString()) return { error: 'Not your task.' };
  return { task };
};

const ownedHabit = async (userId, habitId) => {
  const habit = await Habit.findById(habitId).catch(() => null);
  if (!habit) return { error: 'No habit with that id.' };
  if (habit.user.toString() !== userId.toString()) return { error: 'Not your habit.' };
  return { habit };
};

// ---------- executors (what actually runs) ----------
// Every executor scopes to userId. The model supplies arguments;
// it never supplies identity.

const executors = {
  get_tasks: async (userId, args) => {
    const filter = args.filter || 'open';
    const query = { user: userId };

    if (filter === 'open') query.completed = false;
    if (filter === 'completed') query.completed = true;

    let tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 }).limit(40);

    if (filter === 'overdue') {
      tasks = tasks.filter(
        (t) => !t.completed && t.dueDate && dateStr(t.dueDate) < todayStr()
      );
    }
    if (filter === 'today') {
      tasks = tasks.filter(
        (t) => !t.completed && t.dueDate && dateStr(t.dueDate) === todayStr()
      );
    }

    return {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        completed: t.completed,
        important: !!t.important,
        dueDate: t.dueDate ? dateStr(t.dueDate) : null,
      })),
    };
  },

  create_task: async (userId, args) => {
    if (!args.title || !args.title.trim()) {
      return { error: 'A title is required.' };
    }

    let dueDate = null;
    if (args.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(args.dueDate)) {
      dueDate = new Date(`${args.dueDate}T12:00:00.000Z`);
    }

    const task = await Task.create({
      user: userId,
      title: args.title.trim(),
      dueDate,
      important: !!args.important,
    });

    return {
      created: true,
      task: {
        id: task._id.toString(),
        title: task.title,
        dueDate: task.dueDate ? dateStr(task.dueDate) : null,
      },
    };
  },

  reschedule_task: async (userId, args) => {
    const found = await ownedTask(userId, args.taskId);
    if (found.error) return found;
    const { task } = found;

    // captured before the write, so the toast can put it back
    const previous = task.dueDate ? dateStr(task.dueDate) : 'none';

    if (args.dueDate === 'none') {
      task.dueDate = null;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate || '')) {
      task.dueDate = new Date(`${args.dueDate}T12:00:00.000Z`);
    } else {
      return { error: 'dueDate must be YYYY-MM-DD or "none".' };
    }

    await task.save();
    return {
      updated: true,
      title: task.title,
      previousDueDate: previous,
      dueDate: task.dueDate ? dateStr(task.dueDate) : null,
      undo: {
        tool: 'reschedule_task',
        args: { taskId: task._id.toString(), dueDate: previous },
      },
    };
  },

  complete_task: async (userId, args) => {
    const found = await ownedTask(userId, args.taskId);
    if (found.error) return found;
    const { task } = found;

    if (task.completed) return { alreadyDone: true, title: task.title };

    task.completed = true;
    await task.save();
    return {
      completed: true,
      title: task.title,
      undo: { tool: 'uncomplete_task', args: { taskId: task._id.toString() } },
    };
  },

  uncomplete_task: async (userId, args) => {
    const found = await ownedTask(userId, args.taskId);
    if (found.error) return found;
    const { task } = found;

    if (!task.completed) return { alreadyOpen: true, title: task.title };

    task.completed = false;
    await task.save();
    return {
      reopened: true,
      title: task.title,
      undo: { tool: 'complete_task', args: { taskId: task._id.toString() } },
    };
  },

  get_habits: async (userId) => {
    const habits = await Habit.find({ user: userId });
    return {
      count: habits.length,
      habits: habits.map((h) => ({
        id: h._id.toString(),
        name: h.name,
        category: h.category || 'health',
        streak: h.streak || 0,
        doneToday: (h.completedDates || []).includes(todayStr()),
        recentDates: (h.completedDates || []).slice(-7),
      })),
    };
  },

  create_habit: async (userId, args) => {
    if (!args.name || !args.name.trim()) return { error: 'A name is required.' };

    const valid = ['health', 'mind', 'craft', 'connection'];
    const habit = await Habit.create({
      user: userId,
      name: args.name.trim(),
      category: valid.includes(args.category) ? args.category : 'health',
    });

    return { created: true, habit: { id: habit._id.toString(), name: habit.name } };
  },

  check_in_habit: async (userId, args) => {
    const found = await ownedHabit(userId, args.habitId);
    if (found.error) return found;
    const { habit } = found;

    const today = todayStr();
    if ((habit.completedDates || []).includes(today)) {
      return { alreadyDone: true, name: habit.name, streak: habit.streak };
    }

    habit.completedDates.push(today);
    recalcStreak(habit);
    await habit.save();

    return {
      checkedIn: true,
      name: habit.name,
      streak: habit.streak,
      undo: { tool: 'undo_habit_checkin', args: { habitId: habit._id.toString() } },
    };
  },

  undo_habit_checkin: async (userId, args) => {
    const found = await ownedHabit(userId, args.habitId);
    if (found.error) return found;
    const { habit } = found;

    const today = todayStr();
    if (!(habit.completedDates || []).includes(today)) {
      return { notCheckedIn: true, name: habit.name, streak: habit.streak };
    }

    habit.completedDates = habit.completedDates.filter((d) => d !== today);
    recalcStreak(habit);
    await habit.save();

    return {
      undone: true,
      name: habit.name,
      streak: habit.streak,
      undo: { tool: 'check_in_habit', args: { habitId: habit._id.toString() } },
    };
  },

  search_diary: async (userId, args) => {
    if (!args.query || !args.query.trim()) return { error: 'A query is required.' };

    const limit = Math.min(10, args.limit || 5);
    const entries = await DiaryEntry.find({
      user: userId,
      content: { $regex: args.query.trim(), $options: 'i' },
    })
      .sort({ entryDate: -1 })
      .limit(limit);

    return {
      count: entries.length,
      entries: entries.map((e) => ({
        date: e.entryDate,
        excerpt:
          e.content.length > 300 ? e.content.slice(0, 300) + '…' : e.content,
      })),
    };
  },

  // Routes through the same service the diary page uses, so an entry made
  // by talking to the agent is indistinguishable from one typed in — same
  // task extraction, same memory extraction, same drift signal.
  write_diary: async (userId, args) => {
    const result = await saveEntry(userId, { content: args.content });
    return {
      saved: true,
      entryDate: result.entry.entryDate,
      tasksCreated: result.createdTasks.map((t) => t.title),
      memoriesLearned: result.learned.length,
      summary: result.message,
    };
  },

  // Writes nothing. Hands the frontend a start button and lets the
  // person decide — which is what "propose" has to mean if the word
  // is going to be worth anything.
  propose_focus: async (userId, args) => {
    const found = await ownedTask(userId, args.taskId);
    if (found.error) return found;
    const { task } = found;

    if (task.completed) return { error: 'That task is already done.' };

    const raw = Math.round(Number(args.minutes));
    const minutes = Number.isFinite(raw) ? Math.max(5, Math.min(120, raw)) : 25;

    return {
      proposedFocus: {
        taskId: task._id.toString(),
        title: task.title,
        minutes,
        why: typeof args.why === 'string' ? args.why.trim().slice(0, 140) : '',
      },
    };
  },
};

// ---------- previews (what a proposal says out loud) ----------
// Resolves ids to titles WITHOUT writing anything, so the confirmation
// names the things you recognise rather than a row of Mongo ids.

const describeCall = async (userId, name, args = {}) => {
  try {
    if (name === 'reschedule_task') {
      const found = await ownedTask(userId, args.taskId);
      if (found.error) return `Reschedule an unknown task (${found.error})`;
      const from = found.task.dueDate ? dateStr(found.task.dueDate) : 'no date';
      const to = args.dueDate === 'none' ? 'no date' : args.dueDate;
      return `Move "${found.task.title}" from ${from} to ${to}`;
    }
    if (name === 'complete_task' || name === 'uncomplete_task') {
      const found = await ownedTask(userId, args.taskId);
      if (found.error) return `${name} on an unknown task (${found.error})`;
      return name === 'complete_task'
        ? `Mark "${found.task.title}" done`
        : `Reopen "${found.task.title}"`;
    }
    if (name === 'check_in_habit' || name === 'undo_habit_checkin') {
      const found = await ownedHabit(userId, args.habitId);
      if (found.error) return `${name} on an unknown habit (${found.error})`;
      return name === 'check_in_habit'
        ? `Check in "${found.habit.name}" for today (streak ${found.habit.streak || 0})`
        : `Remove today's check-in from "${found.habit.name}"`;
    }
    return `${name}(${JSON.stringify(args)})`;
  } catch (err) {
    return `${name} — could not be described: ${err.message}`;
  }
};

// ---------- dispatcher ----------

/**
 * Runs a tool by name. Never throws — errors come back as data
 * so the model can read them and adjust.
 */
const executeTool = async (userId, name, args = {}) => {
  const fn = executors[name];
  if (!fn) return { error: `Unknown tool: ${name}` };

  try {
    return await fn(userId, args);
  } catch (err) {
    console.error(`Tool ${name} failed:`, err.message);
    return { error: `${name} failed: ${err.message}` };
  }
};

module.exports = {
  toolDefinitions,
  executeTool,
  describeCall,
  LOSSY,
  BULK_THRESHOLD,
  MAX_LOSSY_PER_RUN,
};