const Groq = require('groq-sdk');
const {
  toolDefinitions,
  executeTool,
  describeCall,
  LOSSY,
  BULK_THRESHOLD,
  MAX_LOSSY_PER_RUN,
} = require('./tools');
const { createProposal, consumeProposal, discardProposal } = require('./approvals');
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
- Changing three or more things at once will be held for their approval rather than done. That is expected. Do not try to slip around it by spreading the changes over several turns.
- When you are done, reply in plain language saying what you did. Be brief.

HOW TO SPEAK:
- Second person. Warm, direct, no filler.
- Report what you actually did, not what you intended.
- If you could not do something, say so plainly.
- No emoji. No exclamation marks.`;

const parseArgs = (call) => {
  try {
    return JSON.parse(call.function.arguments || '{}');
  } catch (err) {
    return {};
  }
};

/**
 * Turns a set of tool calls into a proposal and a plain-language reply.
 * Nothing has touched the database at this point.
 */
const proposeBatch = async (userId, calls, steps, reason) => {
  const actions = [];
  for (const call of calls) {
    const name = call.function.name;
    const args = parseArgs(call);
    actions.push({ tool: name, args, describe: await describeCall(userId, name, args) });
  }

  const proposal = createProposal(userId, actions);

  // Deterministic, not model-written. The list of what is about to happen
  // is the one sentence that must not be improvised.
  const lines = proposal.actions.map((a) => `- ${a}`).join('\n');

  return {
    reply: `${reason}\n\n${lines}\n\nApprove and I will do all of it. Otherwise tell me what to change.`,
    steps,
    proposal,
    needsApproval: true,
  };
};

/**
 * Runs the agent loop: the model picks tools, we execute them,
 * feed results back, and repeat until it gives a final answer.
 *
 * Returns { reply, steps } where steps is the visible trace.
 * May instead return { proposal, needsApproval } when a batch of lossy
 * changes has to be confirmed first.
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
  let lossySoFar = 0;

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

    const lossyCalls = choice.tool_calls.filter((c) => LOSSY.has(c.function.name));

    // Gate one: too much at once.
    if (lossyCalls.length >= BULK_THRESHOLD) {
      return proposeBatch(
        userId,
        lossyCalls,
        steps,
        `That is ${lossyCalls.length} changes, so I have not made them yet.`
      );
    }

    // Gate two: too much across the whole run. Closes the loophole of
    // doing two changes a turn for six turns.
    if (lossyCalls.length && lossySoFar + lossyCalls.length > MAX_LOSSY_PER_RUN) {
      return proposeBatch(
        userId,
        lossyCalls,
        steps,
        `I have already changed ${lossySoFar} things this turn, so I stopped before these.`
      );
    }

    // record the assistant's tool-calling turn
    messages.push(choice);

    // execute each requested tool
    for (const call of choice.tool_calls) {
      const name = call.function.name;
      const args = parseArgs(call);

      const result = await executeTool(userId, name, args);
      if (LOSSY.has(name) && !result.error) lossySoFar++;

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

/**
 * Runs a batch the user approved. The proposal id is the only thing that
 * authorises this — the model cannot mint one, and every executor still
 * re-checks ownership on the record it touches.
 */
const approveProposal = async (userId, proposalId) => {
  const proposal = consumeProposal(userId, proposalId);
  if (!proposal) {
    return { error: 'That approval has expired or was already used.' };
  }

  const steps = [];
  let done = 0;
  let failed = 0;

  for (const action of proposal.actions) {
    const result = await executeTool(userId, action.tool, action.args);
    if (result.error) failed++;
    else done++;
    steps.push({ tool: action.tool, args: action.args, result });
  }

  return {
    reply:
      failed === 0
        ? `Done — ${done} ${done === 1 ? 'change' : 'changes'} made.`
        : `Made ${done} of ${done + failed}. ${failed} did not go through.`,
    steps,
    applied: done,
    failed,
  };
};

const rejectProposal = async (userId, proposalId) => ({
  reply: discardProposal(userId, proposalId)
    ? 'Left everything as it was.'
    : 'That approval had already expired.',
  steps: [],
});

module.exports = { runAgent, approveProposal, rejectProposal };