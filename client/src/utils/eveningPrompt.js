// The evening question is chosen from what actually happened today.
// No AI call: this has to work every single night, including the nights
// Groq is down, and a blank textarea is the thing people don't fill in.

export const EVENING_HOUR = 20; // 8pm

export const isEvening = (hour = new Date().getHours()) => hour >= EVENING_HOUR;

export const buildEveningPrompt = ({
  completedToday = 0,
  openCount = 0,
  overdueCount = 0,
  habitsDone = 0,
  habitsTotal = 0,
} = {}) => {
  // Nothing done while things waited. Ask about the obstacle, never the failure —
  // "why didn't you" gets you defensiveness, "what got in the way" gets you data.
  if (completedToday === 0 && (openCount > 0 || overdueCount > 0)) {
    return {
      headline: 'Rough one?',
      question: 'What got in the way today?',
      hint: 'Naming the obstacle is the useful part. No need to be fair to yourself.',
    };
  }

  // Everything landed.
  if (habitsTotal > 0 && habitsDone === habitsTotal && completedToday > 0) {
    return {
      headline: 'Full day.',
      question: 'What made today work?',
      hint: 'Worth knowing, so you can do it again on purpose.',
    };
  }

  // A pile of things keeps not happening.
  if (overdueCount >= 3) {
    return {
      headline: `${overdueCount} still waiting.`,
      question: "What's the one you keep stepping around?",
      hint: 'Usually there is one, and usually you already know which.',
    };
  }

  if (completedToday >= 3) {
    return {
      headline: 'Busy day.',
      question: 'Of everything you did today, what actually mattered?',
      hint: 'Motion and progress are not the same thing.',
    };
  }

  return {
    headline: 'Before you close the day.',
    question: 'What actually happened today?',
    hint: 'A few lines is plenty. Aegis reads it and learns you.',
  };
};