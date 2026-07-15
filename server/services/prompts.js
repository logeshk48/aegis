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

module.exports = { buildTaskParsePrompt };