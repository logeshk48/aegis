// Word-overlap matching, same crude approach memoryService uses on memories.
// It catches the case that actually happens — the same task written twice in
// slightly different words — and it will miss "Review PR" against "Review
// pull request", because nothing here understands meaning. That is the known
// limit, and the same vector-search migration fixes both.

const STOP = new Set([
  'the', 'a', 'an', 'to', 'for', 'of', 'about', 'my', 'me', 'i', 'on', 'at',
  'in', 'and', 'with', 'it', 'this', 'that', 'please', 'need', 'needs',
  'have', 'has', 'do', 'get', 'some', 'any',
]);

const tokens = (title) =>
  String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

/**
 * Jaccard overlap: shared words over total distinct words.
 * Symmetric on purpose — "call bank" should match "call the bank about the
 * account" just as strongly in either direction.
 */
const similarity = (a, b) => {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;

  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;

  return shared / (A.size + B.size - shared);
};

// 0.6 is deliberate. At 0.5 "pay electricity bill" and "pay water bill"
// collapse into one task, and silently losing a bill is far worse than
// occasionally keeping a near-duplicate you can delete yourself.
const DUPLICATE_AT = 0.6;

const findDuplicate = (candidates, title) =>
  candidates.find((c) => similarity(c.title, title) >= DUPLICATE_AT) || null;

module.exports = { tokens, similarity, findDuplicate, DUPLICATE_AT };