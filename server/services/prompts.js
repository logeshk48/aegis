// builds the prompt that tells the AI how to parse tasks from text
const buildTaskParsePrompt = (userText) => {
  return `You are a task-parsing assistant. Read the user's text and extract individual tasks from it.

Return ONLY a valid JSON array (no markdown, no explanation, no code fences). Each task must be an object with these exact fields:
- "title": a short, clear task name (string)
- "priority": one of "low", "medium", or "high" (string) — infer from urgency words
- "dueDate": a date in YYYY-MM-DD format if a time is mentioned, otherwise null

Rules:
- Today's date is ${new Date().toISOString().split('T')[0]}. Use it to resolve words like "today", "tomorrow", "Friday".
- If no priority is clear, use "medium".
- If the text has no tasks, return an empty array [].
- Return ONLY the JSON array, nothing else.

User's text: "${userText}"`;
};

// builds the prompt for answering questions about the user's own data
const buildQuestionPrompt = (context, question) => {
  return `You are Aegis, a helpful personal assistant. Answer the user's question using ONLY the data provided below about their tasks and habits.

IMPORTANT RULES:
- Answer ONLY from the data given. Do not invent or assume anything.
- If the data doesn't contain the answer, say so honestly (e.g. "I don't have a record of that").
- Be concise and friendly — 1 to 3 sentences.
- When mentioning dates, write them naturally (e.g. "July 14" instead of "2026-07-14").
- Do not list all the data back; just answer what was asked.

--- USER'S DATA ---
${context}
--- END OF DATA ---

User's question: "${question}"

Your answer:`;
};

module.exports = { buildTaskParsePrompt, buildQuestionPrompt };