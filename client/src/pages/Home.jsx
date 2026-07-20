import { Link } from 'react-router-dom';

function Home() {
  const userName = localStorage.getItem('userName') || 'there';

  const cards = [
    {
      to: '/tasks',
      emoji: '✅',
      title: 'Tasks',
      desc: 'Tell Aegis your plans and let AI organize them.',
    },
    {
      to: '/habits',
      emoji: '🔥',
      title: 'Habits',
      desc: 'Build daily streaks and stay consistent.',
    },
    {
      to: '/dashboard',
      emoji: '📊',
      title: 'Dashboard',
      desc: 'See your progress at a glance.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900">
        Welcome back, {userName} 👋
      </h1>
      <p className="text-slate-500 mt-1 mb-8">
        Your AI assistant for staying organized — effortlessly.
      </p>

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