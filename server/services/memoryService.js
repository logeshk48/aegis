const Memory = require('../models/Memory');
const { askAI, cleanJsonString } = require('./aiService');
const { buildMemoryExtractionPrompt } = require('./prompts');

const VALID_CATEGORIES = ['identity', 'pattern', 'preference', 'goal', 'struggle'];

// crude similarity check — catches near-duplicates without needing embeddings
const isSimilar = (a, b) => {
  const norm = (s) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3);

  const wordsA = new Set(norm(a));
  const wordsB = norm(b);
  if (wordsA.size === 0 || wordsB.length === 0) return false;

  const overlap = wordsB.filter((w) => wordsA.has(w)).length;
  return overlap / Math.max(wordsA.size, wordsB.length) > 0.6;
};

const validateMemory = (m) => {
  if (!m || typeof m.content !== 'string' || !m.content.trim()) return null;
  if (m.content.trim().length > 200) return null;

  return {
    content: m.content.trim(),
    category: VALID_CATEGORIES.includes(m.category) ? m.category : 'identity',
  };
};

/**
 * Reads new user writing, extracts durable facts, and stores them.
 * Reinforces existing memories instead of duplicating them.
 * Fails soft — never throws, since this is a background enhancement.
 */
const extractAndStoreMemories = async (userId, text, source = 'diary') => {
  try {
    if (!text || text.trim().length < 40) return [];

    const existing = await Memory.find({ user: userId }).sort({ updatedAt: -1 }).limit(60);

    const prompt = buildMemoryExtractionPrompt(text, existing);
    const raw = await askAI(prompt);
    const cleaned = cleanJsonString(raw);

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error('Memory extraction: bad JSON —', err.message);
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    const candidates = parsed.map(validateMemory).filter(Boolean).slice(0, 3);
    const stored = [];

    for (const cand of candidates) {
      const match = existing.find((m) => isSimilar(m.content, cand.content));

      if (match) {
        match.reinforcedCount += 1;
        match.lastSeenAt = new Date();
        match.confidence = Math.min(1, match.confidence + 0.05);
        await match.save();
        continue;
      }

      const created = await Memory.create({
        user: userId,
        content: cand.content,
        category: cand.category,
        source,
        confidence: 0.7,
      });
      stored.push(created);
    }

    if (stored.length > 0) {
      console.log(`🧠 Learned ${stored.length} new thing(s) about user ${userId}`);
    }

    return stored;
  } catch (err) {
    console.error('Memory extraction failed:', err.message);
    return [];
  }
};

module.exports = { extractAndStoreMemories };