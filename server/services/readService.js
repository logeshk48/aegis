const { askAI, cleanJsonString } = require('./aiService');
const { buildUserContext } = require('./contextService');
const { buildReadPrompt } = require('./prompts');
const Memory = require('../models/Memory');
const DiaryEntry = require('../models/DiaryEntry');

// cache — this is expensive and shouldn't change hour to hour
const readCache = new Map();
const CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

const FALLBACK = {
  opening:
    'There is not much here yet. Write a few diary entries and let Aegis watch for a while — then this becomes worth reading.',
  sections: [],
  closing: '',
  thin: true,
};

const validateSections = (sections) => {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter(
      (s) =>
        s &&
        typeof s.title === 'string' &&
        s.title.trim() &&
        typeof s.body === 'string' &&
        s.body.trim()
    )
    .map((s) => ({ title: s.title.trim(), body: s.body.trim() }))
    .slice(0, 5);
};

const generateRead = async (userId, force = false) => {
  const key = userId.toString();

  if (!force) {
    const cached = readCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.read, cached: true };
    }
  }

  // need something to work with
  const [memoryCount, entryCount] = await Promise.all([
    Memory.countDocuments({ user: userId }),
    DiaryEntry.countDocuments({ user: userId }),
  ]);

  if (memoryCount < 2 && entryCount < 2) {
    return FALLBACK;
  }

  try {
    const context = await buildUserContext(userId);
    const prompt = buildReadPrompt(context);
    const raw = await askAI(prompt);
    const cleaned = cleanJsonString(raw);
    const parsed = JSON.parse(cleaned);

    const read = {
      opening:
        typeof parsed.opening === 'string' && parsed.opening.trim()
          ? parsed.opening.trim()
          : FALLBACK.opening,
      sections: validateSections(parsed.sections),
      closing: typeof parsed.closing === 'string' ? parsed.closing.trim() : '',
      generatedAt: new Date(),
      thin: false,
    };

    readCache.set(key, { read, expiresAt: Date.now() + CACHE_MS });
    return read;
  } catch (err) {
    console.error('Read generation failed:', err.message);
    return FALLBACK;
  }
};

module.exports = { generateRead };