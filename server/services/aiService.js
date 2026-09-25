const Groq = require('groq-sdk');
const Habit = require('../models/Habit');
const Task = require('../models/Task');
const {
  buildTaskParsePrompt,
  buildQuestionPrompt,
  buildSuggestionsPrompt,
} = require('./prompts');
const { buildUserContext } = require('./contextService');
const { findDuplicate } = require('../utils/taskSimilarity');

// generic function: send any prompt, get the AI's text reply
const askAI = async (prompt) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
  });
  return completion.choices[0].message.content;
};

// clean up the AI's raw reply into a usable JSON string
const cleanJsonString = (raw) => {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();
  return cleaned;
};

// validate one task object and return a safe, cleaned version
const validateTask = (task) => {
  if (!task || typeof task.title !== 'string' || !task.title.trim()) {
    return null;
  }

  const validPriorities = ['low', 'medium', 'high'];
  const priority = validPriorities.includes(task.priority) ? task.priority : 'medium';

  let dueDate = null;
  if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
    dueDate = task.dueDate;
  }

  return {
    title: task.title.trim(),
    priority,
    dueDate,
  };
};

// validate one suggestion object
const validateSuggestion = (s) => {
  if (!s || typeof s.title !== 'string' || !s.title.trim()) return null;
  if (s.type !== 'habit' && s.type !== 'task') return null;

  return {
    type: s.type,
    title: s.title.trim(),
    reason: typeof s.reason === 'string' ? s.reason.trim() : '',
  };
};

// parse tasks from natural-language text using the AI
const parseTasksFromText = async (userText) => {
  const prompt = buildTaskParsePrompt(userText);
  const rawReply = await askAI(prompt);

  const cleaned = cleanJsonString(rawReply);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error('AI did not return valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a list of tasks');
  }

  return parsed.map(validateTask).filter((task) => task !== null);
};

// answer a question about the user's own data (RAG)
const answerUserQuestion = async (userId, question) => {
  // 1. RETRIEVE
  const context = await buildUserContext(userId);
  // 2. AUGMENT
  const prompt = buildQuestionPrompt(context, question);
  // 3. GENERATE
  const answer = await askAI(prompt);

  return answer.trim();
};

// generate personalized habit/task suggestions from the user's data (RAG)
const generateSuggestions = async (userId) => {
  const context = await buildUserContext(userId);
  const prompt = buildSuggestionsPrompt(context);
  const rawReply = await askAI(prompt);

  const cleaned = cleanJsonString(rawReply);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Suggestions JSON parse failed:', err.message);
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid = parsed.map(validateSuggestion).filter((s) => s !== null);
  if (valid.length === 0) return [];

  // The context already lists what exists, and the model still suggested
  // "Write Diary" to someone whose Rituals contain "write diary". Telling it
  // again would be hoping. Checking is not.
  const [habits, openTasks] = await Promise.all([
    Habit.find({ user: userId }).select('name').lean(),
    Task.find({ user: userId, completed: false }).select('title').lean(),
  ]);

  // findDuplicate reads a `title` field, so habits are shaped to match
  const habitTitles = habits.map((h) => ({ title: h.name }));

  const fresh = valid.filter((s) => {
    const against = s.type === 'habit' ? habitTitles : openTasks;
    const existing = findDuplicate(against, s.title);

    if (existing) {
      console.log(`Suggestion dropped — "${s.title}" already exists as "${existing.title}"`);
      return false;
    }
    return true;
  });

  // Returning nothing is a valid answer. Suggesting things you already have
  // to avoid an empty rail is how an assistant stops being believed.
  return fresh.slice(0, 4);
};

module.exports = {
  askAI,
  cleanJsonString,
  parseTasksFromText,
  answerUserQuestion,
  generateSuggestions,
};