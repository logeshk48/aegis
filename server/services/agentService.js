const Groq = require('groq-sdk');
const { toolDefinitions, executeTool } = require('./tools');
const { buildCompactContext } = require('./contextService');

const MAX_STEPS = 6; // hard cap against runaway loops

const buildSystemPrompt = (context) => `You are Aegis, this person's personal assistant. You have tools that let you read and change their tasks, habits and diary.

--- WHO THEY ARE ---
${context}
--- END ---

Today's date is ${new Date().toISOString().split('T')[0]}.

HOW TO WORK:
- Read before you write. Call get_tasks or get_habits to get real ids before changing anything. Never guess an id.
- Chain tools when needed. It is normal to read, then act several times.
- Only do what was asked. Do not create or change things they did not ask for.
- If a tool returns an error, read it and adjust. Do not repeat the same failing call.
- When you are done, reply in plain language saying what you did. Be brief.

HOW TO SPEAK:
- Second person. Warm, direct, no filler.
- Report what you actually did, not what you intended.
- If you could not do something, say so plainly.
- No emoji. No exclamation marks.`;

/**
 * Runs the agent loop: the model picks tools, we execute them,
 * feed results back, and repeat until it gives a final answer.
 *
 * Returns { reply, steps } where steps is the visible trace.
 */
const runAgent = async (userId, userMessage, history = []) => {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const context = await buildCompactContext(userId);

  const messages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const steps = [];

  for (let i = 0; i < MAX_STEPS; i++) {
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
      });
    } catch (err) {
      console.error('Agent model call failed:', err.message);
      return {
        reply: 'I could not reach my reasoning just then. Try again in a moment.',
        steps,
        error: true,
      };
    }

    const choice = completion.choices[0].message;

    // no tool calls → this is the final answer
    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return {
        reply: (choice.content || '').trim() || 'Done.',
        steps,
      };
    }

    // record the assistant's tool-calling turn
    messages.push(choice);

    // execute each requested tool
    for (const call of choice.tool_calls) {
      const name = call.function.name;

      let args = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch (err) {
        args = {};
      }

      const result = await executeTool(userId, name, args);

      steps.push({ tool: name, args, result });

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // hit the cap without a final answer
  return {
    reply:
      "I got partway through that but stopped before finishing. Here's what I did — try asking again more specifically.",
    steps,
    hitLimit: true,
  };
};

module.exports = { runAgent };