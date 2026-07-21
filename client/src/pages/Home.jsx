import { useState } from 'react';
import { Link } from 'react-router-dom';
import { askAegis } from '../services/aiApi';

function Home() {
  const userName = localStorage.getItem('userName') || 'there';

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestions = [
    'How many tasks do I have pending?',
    'What is my longest habit streak?',
    'Do I have anything overdue?',
  ];

  const handleAsk = async (e, presetQuestion) => {
    if (e) e.preventDefault();
    const q = presetQuestion || question;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');
    if (presetQuestion) setQuestion(presetQuestion);

    try {
      const data = await askAegis(q);
      setAnswer(data.answer);
    } catch (err) {
      setError('Could not get an answer. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { to: '/tasks', emoji: '✅', title: 'Tasks', desc: 'Tell Aegis your plans and let AI organize them.' },
    { to: '/habits', emoji: '🔥', title: 'Habits', desc: 'Build daily streaks and stay consistent.' },
    { to: '/dashboard', emoji: '📊', title: 'Dashboard', desc: 'See your progress at a glance.' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900">
        Welcome back, {userName} 👋
      </h1>
      <p className="text-slate-500 mt-1 mb-6">
        Your AI assistant for staying organized — effortlessly.
      </p>

      {/* Ask Aegis */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 mb-8">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <span>💬</span> Ask Aegis
        </h2>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">
          Ask anything about your tasks and habits.
        </p>

        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Do I have anything overdue?"
            className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition whitespace-nowrap"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>

        {/* suggestion chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleAsk(null, s)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition"
            >
              {s}
            </button>
          ))}
        </div>

        {answer && (
          <div className="mt-4 bg-white border border-indigo-100 rounded-lg p-4">
            <p className="text-sm text-slate-800 leading-relaxed">{answer}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* nav cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="text-3xl mb-2">{card.emoji}</div>
            <h2 className="font-semibold text-slate-900">{card.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;