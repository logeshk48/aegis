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

// parse tasks from natural-language text using the AI
const parseTasksFromText = async (userText) => {
  const prompt = buildTaskParsePrompt(userText);
  const rawReply = await askAI(prompt);
  return rawReply; // raw text for now — we validate & parse it in the next commit
};

module.exports = { askAI, parseTasksFromText };