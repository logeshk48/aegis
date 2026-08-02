import { useState, useEffect } from 'react';
import api from '../api/axios';
import AskAegis from '../components/AskAegis';
import Suggestions from '../components/Suggestions';
import '../styles/home.css';

const todayStr = () => new Date().toISOString().split('T')[0];

const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] < todayStr();
};

const isDueToday = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] === todayStr();
};

function Home() {
  const userName = localStorage.getItem('userName') || 'there';
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/habits'),
        ]);
        setTasks(tasksRes.data);
        setHabits(habitsRes.data);
      } catch (err) {
        console.error('Could not load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks(tasks.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error('Could not toggle task:', err);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits(habits.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      console.error('Could not check in habit:', err);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    if (suggestion.type === 'habit') {
      const res = await api.post('/habits', { name: suggestion.title });
      setHabits((prev) => [res.data, ...prev]);
    } else {
      const res = await api.post('/tasks', { title: suggestion.title, priority: 'medium' });
      setTasks((prev) => [res.data, ...prev]);
    }
  };

  const isHabitDoneToday = (habit) => habit.completedDates?.includes(todayStr());

  const overdueTasks = tasks.filter(isOverdue);
  const dueTodayTasks = tasks.filter(isDueToday);
  const pendingTasks = tasks.filter((t) => !t.completed);

  const completedToday = tasks.filter(
    (t) => t.completed && new Date(t.updatedAt).toISOString().split('T')[0] === todayStr()
  ).length;

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return <p className="text-slate-400 text-sm max-w-4xl mx-auto">Loading your day...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto relative z-10">
      {/* Greeting */}
      <h1 className="heading-xl">
        {greeting}, {userName} 👋
      </h1>
      <p className="text-slate-400 mt-1 mb-6">
        {pendingTasks.length === 0
          ? "You're all caught up. Nice. 🎉"
          : `You have ${pendingTasks.length} thing${pendingTasks.length > 1 ? 's' : ''} on your plate.`}
      </p>

      {/* AI Suggestions */}
      <Suggestions onAccept={handleAcceptSuggestion} />

      {/* Stats row */}
      <div className="bento-grid bento-grid-stats">
        <div className="glass-tile text-center">
          <div className="stat-value" style={{ color: 'var(--sand)' }}>{pendingTasks.length}</div>
          <div className="tile-label mt-2">Pending</div>
        </div>
        <div className="glass-tile text-center">
          <div className="stat-value" style={{ color: 'var(--coral)' }}>{completedToday}</div>
          <div className="tile-label mt-2">Done today</div>
        </div>
        <div className="glass-tile text-center">
          <div className="stat-value" style={{ color: 'var(--sand)' }}>🔥 {bestStreak}</div>
          <div className="tile-label mt-2">Best streak</div>
        </div>
      </div>

      {/* Main bento row: tasks (wide) + habits (narrow) */}
      <div className="bento-grid bento-grid-main">
        {/* Tasks tile */}
        <div className="glass-tile bento-span-3">
          <div className="tile-label mb-3">📅 Today</div>

          {overdueTasks.length === 0 && dueTodayTasks.length === 0 ? (
            <div className="tile-empty">Nothing due today. Enjoy it. 🌤️</div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task._id} className="tile-row tile-row-overdue">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task._id)}
                    className="w-4 h-4 rounded cursor-pointer accent-orange-400"
                  />
                  <span className="flex-1 text-sm text-slate-100">{task.title}</span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--coral)' }}>
                    overdue
                  </span>
                </div>
              ))}

              {dueTodayTasks.map((task) => (
                <div key={task._id} className="tile-row">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task._id)}
                    className="w-4 h-4 rounded cursor-pointer accent-amber-300"
                  />
                  <span className="flex-1 text-sm text-slate-100">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Habits tile */}
        <div className="glass-tile bento-span-2">
          <div className="tile-label mb-3">🔥 Habits</div>

          {habits.length === 0 ? (
            <div className="tile-empty">No habits yet.</div>
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const done = isHabitDoneToday(habit);
                return (
                  <div key={habit._id} className={`tile-row ${done ? 'tile-row-done' : ''}`}>
                    <span className="flex-1 text-sm text-slate-100 truncate">{habit.name}</span>
                    <span className="streak-pill">🔥 {habit.streak}</span>
                    <button
                      onClick={() => handleCheckIn(habit._id)}
                      disabled={done}
                      className="btn-checkin"
                    >
                      {done ? '✓' : 'Do'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ask Aegis */}
      <div className="mb-8">
        <AskAegis />
      </div>
    </div>
  );
}

export default Home;