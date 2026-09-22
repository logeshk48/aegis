// Pending bulk changes, held until the user approves them.
// In-memory on purpose: these are short-lived and a restart losing them is
// the safe failure — nothing runs that wasn't confirmed.

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const pending = new Map();

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const sweep = () => {
  const now = Date.now();
  for (const [id, p] of pending) if (p.expiresAt <= now) pending.delete(id);
};

/**
 * Stores a batch of tool calls awaiting approval.
 * actions: [{ tool, args, describe }]
 */
const createProposal = (userId, actions) => {
  sweep();
  const id = newId();
  pending.set(id, {
    id,
    user: userId.toString(),
    actions,
    expiresAt: Date.now() + TTL_MS,
  });
  return { id, actions: actions.map((a) => a.describe), expiresIn: TTL_MS / 1000 };
};

/**
 * Takes a proposal once. Returns null if missing, expired, or owned by
 * someone else — the ownership check is here as well as in the executors.
 */
const consumeProposal = (userId, id) => {
  sweep();
  const p = pending.get(id);
  if (!p) return null;
  if (p.user !== userId.toString()) return null;
  pending.delete(id);
  return p;
};

const discardProposal = (userId, id) => !!consumeProposal(userId, id);

module.exports = { createProposal, consumeProposal, discardProposal };