const Task = require('../models/Task');
const { findDuplicate } = require('../utils/taskSimilarity');

/**
 * Creates a task unless one just like it is already open.
 *
 * Only OPEN tasks count as duplicates. If you finished "call the bank" last
 * month and want to call them again, that is a new task — the check is for
 * the same thing being added twice, not for ever having done it.
 *
 * `alsoAgainst` lets one batch dedupe against itself, for when an extraction
 * returns the same task twice from one diary entry.
 */
const createTaskIfNew = async (userId, fields = {}, alsoAgainst = []) => {
  const title = String(fields.title || '').trim();
  if (!title) throw Object.assign(new Error('A title is required.'), { status: 400 });

  const open = await Task.find({ user: userId, completed: false }).select('title').lean();

  const existing = findDuplicate([...open, ...alsoAgainst], title);
  if (existing) return { task: null, duplicateOf: existing };

  const task = await Task.create({ user: userId, ...fields, title });
  return { task, duplicateOf: null };
};

module.exports = { createTaskIfNew };