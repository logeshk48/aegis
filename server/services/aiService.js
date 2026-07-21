const Groq = require('groq-sdk');
const { buildTaskParsePrompt, buildQuestionPrompt } = require('./prompts');
const { buildUserContext } = require('./contextService');

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

  const validTasks = parsed
    .map(validateTask)
    .filter((task) => task !== null);

  return validTasks;
};

// answer a question about the user's own data (RAG)
const answerUserQuestion = async (userId, question) => {
  // 1. RETRIEVE: gather the user's data as context
  const context = await buildUserContext(userId);

  // 2. AUGMENT: build a prompt containing the data + the question
  const prompt = buildQuestionPrompt(context, question);

  // 3. GENERATE: let the AI answer, grounded in that data
  const answer = await askAI(prompt);

  return answer.trim();
};

module.exports = { askAI, parseTasksFromText, answerUserQuestion };