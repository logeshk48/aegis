const Task = require('../models/Task');
const Habit = require('../models/Habit');
const DiaryEntry = require('../models/DiaryEntry');

const DAY = 86400000;
const dateStr = (d) => new Date(d).toISOString().split('T')[0];
const todayStr = () => dateStr(new Date());

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
      description: "Mark a habit as done for today. Only when the user says they've done it.",
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
];

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
    const task = await Task.findById(args.taskId).catch(() => null);
    if (!task) return { error: 'No task with that id.' };
    if (task.user.toString() !== userId.toString()) {
      return { error: 'Not your task.' };
    }

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
      dueDate: task.dueDate ? dateStr(task.dueDate) : null,
    };
  },

  complete_task: async (userId, args) => {
    const task = await Task.findById(args.taskId).catch(() => null);
    if (!task) return { error: 'No task with that id.' };
    if (task.user.toString() !== userId.toString()) {
      return { error: 'Not your task.' };
    }
    if (task.completed) return { alreadyDone: true, title: task.title };

    task.completed = true;
    await task.save();
    return { completed: true, title: task.title };
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
    const habit = await Habit.findById(args.habitId).catch(() => null);
    if (!habit) return { error: 'No habit with that id.' };
    if (habit.user.toString() !== userId.toString()) {
      return { error: 'Not your habit.' };
    }

    const today = todayStr();
    if ((habit.completedDates || []).includes(today)) {
      return { alreadyDone: true, name: habit.name, streak: habit.streak };
    }

    habit.completedDates.push(today);

    // recalculate streak
    const set = new Set(habit.completedDates);
    let streak = 0;
    const cursor = new Date();
    while (set.has(dateStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    habit.streak = streak;

    await habit.save();
    return { checkedIn: true, name: habit.name, streak: habit.streak };
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

module.exports = { toolDefinitions, executeTool };