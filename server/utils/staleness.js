// A task that has been offered and skipped repeatedly is information.
// Aegis already notices drift across your habits; this notices avoidance
// of one specific thing, which is usually the more actionable of the two.
//
// The measure is DAYS OFFERED, not age. A task created last week that only
// reached the top of the list this morning is not being avoided — it has
// simply been waiting its turn.

const ASKS = {
  errand: {
    noticed: 'Pick the time you will actually go.',
    stuck: 'Put a day and time on it, or let it go.',
  },
  focus: {
    noticed: 'What is the smallest version of this?',
    stuck: 'Cut it down to one step, or drop it.',
  },
  quick: {
    noticed: 'Two minutes now, or let it go.',
    stuck: 'It has never been worth two minutes. Drop it?',
  },
  activity: {
    noticed: 'Pick the time you will start.',
    stuck: 'Put a time on it, or let it go.',
  },
};

// Two days of silence first. Everyone skips a day; naming it that early
// makes Aegis a nag rather than an observer.
const NOTICED_AT = 3;
const STUCK_AT = 5;

const staleFor = ({ offeredDays = 0, kind = 'focus' } = {}) => {
  if (offeredDays < NOTICED_AT) return null;

  const level = offeredDays >= STUCK_AT ? 'stuck' : 'noticed';
  const asks = ASKS[kind] || ASKS.focus;

  return {
    level,
    offeredDays,
    line:
      level === 'stuck'
        ? `${offeredDays} days at the top of your list now. Something about this is not landing.`
        : `${offeredDays} days running, this has been first and stayed undone.`,
    ask: asks[level],
    canDrop: level === 'stuck',
  };
};

module.exports = { staleFor, NOTICED_AT, STUCK_AT };