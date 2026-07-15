const Groq = require('groq-sdk');
const { buildTaskParsePrompt } = require('./prompts');

// generic function: send any prompt, get the AI's text reply
const askAI = async (prompt) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
  });
  return completion.choices[0].message.content;
};

// clean up the AI's raw reply into a usable JSON string
const cleanJsonString = (raw) => {
  let cleaned = raw.trim();
  // remove markdown code fences if the AI added them
  cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();
  return cleaned;
};

// validate one task object and return a safe, cleaned version
const validateTask = (task) => {
  // must have a non-empty title
  if (!task || typeof task.title !== 'string' || !task.title.trim()) {
    return null;
  }

  // only allow valid priorities; default to 'medium'
  const validPriorities = ['low', 'medium', 'high'];
  const priority = validPriorities.includes(task.priority) ? task.priority : 'medium';

  // dueDate: keep it if it looks like a date string, otherwise null
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

// parse tasks from natural-language text using the AI
const parseTasksFromText = async (userText) => {
  const prompt = buildTaskParsePrompt(userText);
  const rawReply = await askAI(prompt);

  // 1. clean the reply
  const cleaned = cleanJsonString(rawReply);

  // 2. try to parse it as JSON
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error('AI did not return valid JSON');
  }

  // 3. make sure it's an array
  if (!Array.isArray(parsed)) {
    throw new Error('AI response was not a list of tasks');
  }

  // 4. validate each task, dropping any invalid ones
  const validTasks = parsed
    .map(validateTask)
    .filter((task) => task !== null);

  return validTasks;
};

module.exports = { askAI, parseTasksFromText };