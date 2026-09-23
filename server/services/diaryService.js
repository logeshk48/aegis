const DiaryEntry = require('../models/DiaryEntry');
const Task = require('../models/Task');
const { parseTasksFromText } = require('./aiService');
const { extractAndStoreMemories } = require('./memoryService');

const getToday = () => new Date().toISOString().split('T')[0];

/**
 * Saves a diary entry and runs both extractions.
 * One place on purpose: the controller and the agent's write_diary tool
 * must not drift apart. A memory that gets extracted through one route
 * and not the other is the worst kind of bug to find later.
 */
const saveEntry = async (userId, { content, entryDate } = {}) => {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text) {
    const err = new Error('Diary content is required');
    err.status = 400;
    throw err;
  }

  // Two independent AI calls. Run them together — one after the other
  // meant writing an entry waited on two round trips.
  // allSettled so neither can take the entry down with it.
  const [taskResult, memoryResult] = await Promise.allSettled([
    parseTasksFromText(text),
    extractAndStoreMemories(userId, text, 'diary'),
  ]);

  let createdTasks = [];
  if (taskResult.status === 'fulfilled' && taskResult.value?.length > 0) {
    try {
      createdTasks = await Task.insertMany(
        taskResult.value.map((t) => ({
          user: userId,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
        }))
      );
    } catch (insertErr) {
      console.error('Task insert failed (entry still saved):', insertErr.message);
    }
  } else if (taskResult.status === 'rejected') {
    console.error('Task extraction failed (entry still saved):', taskResult.reason?.message);
  }

  const learned =
    memoryResult.status === 'fulfilled' && Array.isArray(memoryResult.value)
      ? memoryResult.value
      : [];
  if (memoryResult.status === 'rejected') {
    console.error('Memory extraction failed (entry still saved):', memoryResult.reason?.message);
  }

  const entry = await DiaryEntry.create({
    user: userId,
    content: text,
    entryDate: entryDate || getToday(),
    extractedTaskCount: createdTasks.length,
  });

  const parts = [];
  if (createdTasks.length > 0) {
    parts.push(`${createdTasks.length} task${createdTasks.length > 1 ? 's' : ''} drawn out`);
  }
  if (learned.length > 0) {
    parts.push(`${learned.length} thing${learned.length > 1 ? 's' : ''} learned about you`);
  }

  return {
    entry,
    createdTasks,
    learned,
    message: parts.length > 0 ? `Kept — ${parts.join(', ')}.` : 'Kept.',
  };
};

module.exports = { saveEntry };