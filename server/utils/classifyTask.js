// Works out what KIND of task something is from its title.
// Deterministic and free — no AI call. It's recomputed on the fly, so renaming
// a task re-classifies it. A kind the user sets by hand always wins.

const KINDS = ['focus', 'errand', 'quick', 'activity'];

const words = (list) => new RegExp(`\\b(${list.join('|')})\\b`, 'i');

// quick tasks usually START with the verb: "call mom", "pay rent"
const QUICK_START =
  /^(call|phone|ring|text|message|whatsapp|email|e-mail|mail|reply|respond|pay|book|order|renew|send|confirm|cancel|recharge|transfer|remind|ping)\b/i;

// deliberately avoids ambiguous words like "run" (run the tests)
// or "cycle" (billing cycle)
const ACTIVITY = words([
  'gym', 'workout', 'work out', 'exercise', 'go for a run', 'morning run', 'evening run',
  'running', 'jog', 'jogging', 'walk', 'walking', 'yoga', 'swim', 'swimming',
  'cycling', 'bike ride', 'stretch', 'stretching', 'cricket', 'football',
  'badminton', 'meditate', 'meditation', 'hike', 'hiking',
]);

const ERRAND = words([
  'go to', 'go out', 'visit', 'buy', 'pick up', 'pickup', 'drop off', 'collect',
  'groceries', 'grocery', 'shop', 'shopping', 'bank', 'atm', 'post office',
  'pharmacy', 'chemist', 'market', 'supermarket', 'store', 'mall', 'hospital',
  'doctor', 'dentist', 'clinic', 'salon', 'haircut', 'barber', 'deposit',
  'withdraw', 'passport', 'rto', 'embassy', 'courier', 'laundry', 'dry clean',
  'petrol', 'fuel', 'xerox',
]);

const QUICK = words([
  'call', 'email', 'e-mail', 'text', 'reply', 'respond', 'whatsapp',
  'pay the', 'pay bill', 'renew', 'recharge', 'book a', 'book an',
]);

const classifyTask = (title = '') => {
  const t = String(title).trim().toLowerCase();
  if (!t) return 'focus';
  if (QUICK_START.test(t)) return 'quick'; // "call the bank" is a call, not an errand
  if (ACTIVITY.test(t)) return 'activity';
  if (ERRAND.test(t)) return 'errand';
  if (QUICK.test(t)) return 'quick';
  return 'focus';
};

// a small desk step before an errand — only where there's something to prepare
const PREP_RULES = [
  {
    match: words([
      'bank', 'atm', 'deposit', 'withdraw', 'passport', 'rto', 'embassy', 'visa',
      'licence', 'license', 'tax', 'insurance', 'loan', 'government',
    ]),
    step: 'Gather the documents you need to take',
  },
  {
    match: words(['doctor', 'dentist', 'hospital', 'clinic']),
    step: 'Note your symptoms and questions',
  },
  {
    match: words([
      'buy', 'groceries', 'grocery', 'shop', 'shopping', 'market',
      'supermarket', 'store', 'mall', 'pharmacy', 'chemist',
    ]),
    step: 'Write the list',
  },
  {
    match: words(['courier', 'post office', 'drop off', 'return']),
    step: 'Pack it and have the address ready',
  },
];

const prepFor = (title = '') => {
  const rule = PREP_RULES.find((r) => r.match.test(String(title)));
  return rule ? rule.step : null;
};

module.exports = { KINDS, classifyTask, prepFor };