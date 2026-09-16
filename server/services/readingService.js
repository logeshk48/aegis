const { askAI, cleanJsonString } = require('./aiService');
const { buildUserContext } = require('./contextService');
const { buildReadingPrompt } = require('./prompts');
const Memory = require('../models/Memory');
const DiaryEntry = require('../models/DiaryEntry');

// readings are expensive and don't change hourly — cache for 6 hours
const cache = new Map();
const CACHE_MS = 6 * 60 * 60 * 1000;

const FALLBACK = {
  opening:
    'There is not enough of you here yet. Write a few diary entries and let Aegis watch for a while — then this will be worth reading.',
  sections: [],
  closing: 'Come back when there is more to see.',
};

const validateSections = (sections) => {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter(
      (s) =>
        s &&
        typeof s.label === 'string' &&
        s.label.trim() &&
        typeof s.text === 'string' &&
        s.text.trim()
    )
    .map((s) => ({ label: s.label.trim(), text: s.text.trim() }))
    .slice(0, 4);
};

const generateReading = async (userId, force = false) => {
  const key = userId.toString();

  if (!force) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.reading, cached: true };
    }
  }

  // need enough material to say anything worthwhile
  const [memCount, diaryCount] = await Promise.all([
    Memory.countDocuments({ user: userId }),
    DiaryEntry.countDocuments({ user: userId }),
  ]);

  if (memCount < 2 && diaryCount < 2) {
    return { ...FALLBACK, hasEnoughData: false };
  }

  try {
    const context = await buildUserContext(userId);
    const prompt = buildReadingPrompt(context);
    const raw = await askAI(prompt);
    const parsed = JSON.parse(cleanJsonString(raw));

    const reading = {
      opening:
        typeof parsed.opening === 'string' && parsed.opening.trim()
          ? parsed.opening.trim()
          : FALLBACK.opening,
      sections: validateSections(parsed.sections),
      closing: typeof parsed.closing === 'string' ? parsed.closing.trim() : '',
      hasEnoughData: true,
      generatedAt: new Date(),
    };

    cache.set(key, { reading, expiresAt: Date.now() + CACHE_MS });
    return reading;
  } catch (err) {
    console.error('Reading failed:', err.message);
    return { ...FALLBACK, hasEnoughData: false };
  }
};

module.exports = { generateReading };