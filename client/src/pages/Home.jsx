import { useState, useEffect } from 'react';
import api from '../api/axios';
import AskAegis from '../components/AskAegis';
import Suggestions from '../components/Suggestions';
import '../styles/home.css';

const todayStr = () => new Date().toISOString().split('T')[0];

const isOverdue = (t) =>
  t.dueDate && !t.completed && new Date(t.dueDate).toISOString().split('T')[0] < todayStr();

const isDueToday = (t) =>
  t.dueDate && !t.completed && new Date(t.dueDate).toISOString().split('T')[0] === todayStr();

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
      console.error(err);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits(habits.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptSuggestion = async (s) => {
    if (s.type === 'habit') {
      const res = await api.post('/habits', { name: s.title });
      setHabits((prev) => [res.data, ...prev]);
    } else {
      const res = await api.post('/tasks', { title: s.title, priority: 'medium' });
      setTasks((prev) => [res.data, ...prev]);
    }
  };

  const isHabitDoneToday = (h) => h.completedDates?.includes(todayStr());

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

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return <p className="body-sm max-w-4xl mx-auto">Loading your day…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-8">
        <p className="eyebrow mb-2">{dateLine}</p>
        <h1 className="display-lg">
          {greeting}, <span className="text-shimmer">{userName}</span>
        </h1>
        <p className="body-text mt-2">
          {pendingTasks.length === 0
            ? 'Everything is handled. Enjoy the stillness.'
            : `${pendingTasks.length} item${pendingTasks.length > 1 ? 's' : ''} await your attention.`}
        </p>
      </div>

      {/* Suggestions */}
      <div className="animate-rise delay-1">
        <Suggestions onAccept={handleAcceptSuggestion} />
      </div>

      {/* Stats */}
      <div className="bento bento-stats animate-rise delay-2">
        <div className="surface-tile surface-tile-accent text-center">
          <div className="numeral">{pendingTasks.length}</div>
          <div className="eyebrow mt-2" style={{ color: 'var(--text-muted)' }}>Pending</div>
        </div>
        <div className="surface-tile surface-tile-accent text-center">
          <div className="numeral">{completedToday}</div>
          <div className="eyebrow mt-2" style={{ color: 'var(--text-muted)' }}>Completed</div>
        </div>
        <div className="surface-tile surface-tile-accent text-center">
          <div className="numeral">{bestStreak}</div>
          <div className="eyebrow mt-2" style={{ color: 'var(--text-muted)' }}>Best streak</div>
        </div>
      </div>

      {/* Main bento */}
      <div className="bento bento-main animate-rise delay-3">
        {/* Today */}
        <div className="surface-tile span-3">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="display-md">Today</h2>
            {overdueTasks.length > 0 && (
              <span className="eyebrow" style={{ color: 'var(--rose)' }}>
                {overdueTasks.length} overdue
              </span>
            )}
          </div>

          {overdueTasks.length === 0 && dueTodayTasks.length === 0 ? (
            <div className="lux-empty">Nothing scheduled for today.</div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <div key={task._id} className="lux-row lux-row-alert">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task._id)}
                    className="lux-check"
                  />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-display)' }}>
                    {task.title}
                  </span>
                  <span className="eyebrow" style={{ color: 'var(--rose)' }}>Overdue</span>
                </div>
              ))}
              {dueTodayTasks.map((task) => (
                <div key={task._id} className="lux-row">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task._id)}
                    className="lux-check"
                  />
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-display)' }}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="surface-tile span-2">
          <h2 className="display-md mb-4">Rituals</h2>

          {habits.length === 0 ? (
            <div className="lux-empty">No rituals yet.</div>
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const done = isHabitDoneToday(habit);
                return (
                  <div key={habit._id} className={`lux-row ${done ? 'lux-row-done' : ''}`}>
                    <span
                      className="flex-1 text-sm truncate"
                      style={{ color: 'var(--text-display)' }}
                    >
                      {habit.name}
                    </span>
                    <span className="chip-streak">{habit.streak}d</span>
                    <button
                      onClick={() => handleCheckIn(habit._id)}
                      disabled={done}
                      className="btn-mini"
                    >
                      {done ? '✓' : 'Mark'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ask Aegis */}
      <div className="animate-rise delay-4 mb-8">
        <AskAegis />
      </div>
    </div>
  );
}

export default Home;