import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/habits.css';

const CATEGORIES = [
  { key: 'health', label: 'Health', desc: 'Body and energy' },
  { key: 'mind', label: 'Mind', desc: 'Focus and calm' },
  { key: 'craft', label: 'Craft', desc: 'Skill and work' },
  { key: 'connection', label: 'Connection', desc: 'People who matter' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

// last 7 days, oldest → newest
const lastSevenDays = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      letter: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
    });
  }
  return days;
};

// momentum instead of priority
const getMomentum = (habit) => {
  const dates = habit.completedDates || [];
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dates.includes(today)) return { key: 'thriving', label: `${habit.streak} day streak` };
  if (dates.includes(yesterday)) return { key: 'risk', label: 'At risk today' };
  if (dates.length === 0) return { key: 'dormant', label: 'Not started' };
  return { key: 'dormant', label: 'Dormant' };
};

function Habits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('health');

  const week = lastSevenDays();

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const res = await api.get('/habits');
        setHabits(res.data);
      } catch (err) {
        setError('Could not load habits.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHabits();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/habits', { name: newName, category: newCategory });
      setHabits([res.data, ...habits]);
      setNewName('');
    } catch (err) {
      setError('Could not add habit.');
      console.error(err);
    }
  };

  const handleCheckIn = async (id) => {
    const habit = habits.find((h) => h._id === id);
    if (!habit || habit.completedDates?.includes(todayStr())) return;

    // optimistic
    const optimistic = {
      ...habit,
      streak: (habit.streak || 0) + 1,
      completedDates: [...(habit.completedDates || []), todayStr()],
    };
    setHabits((prev) => prev.map((h) => (h._id === id ? optimistic : h)));

    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits((prev) => prev.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      setHabits((prev) => prev.map((h) => (h._id === id ? habit : h)));
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this ritual?')) return;
    try {
      await api.delete(`/habits/${id}`);
      setHabits(habits.filter((h) => h._id !== id));
    } catch (err) {
      setError('Could not delete.');
      console.error(err);
    }
  };

  const doneToday = habits.filter((h) => h.completedDates?.includes(todayStr())).length;

  return (
    <div className="max-w-3xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Your practice</p>
        <h1 className="display-lg">Rituals</h1>
        <p className="body-text mt-1">
          {loading
            ? 'Gathering…'
            : habits.length === 0
            ? 'Small things, repeated, become who you are.'
            : `${doneToday} of ${habits.length} tended today.`}
        </p>
      </div>

      {/* Add form */}
      <div className="surface-tile animate-rise delay-1 mb-8">
        <p className="eyebrow mb-3">New ritual</p>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Read ten pages…"
            className="input-lux mb-3"
          />

          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setNewCategory(c.key)}
                className={`cat-pick cat-${c.key} ${
                  newCategory === c.key ? 'cat-pick-active' : ''
                }`}
                title={c.desc}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button type="submit" className="btn-gold">
            Begin
          </button>
        </form>
      </div>

      {error && (
        <p className="body-sm mb-4" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {/* Grouped by life area */}
      {loading ? (
        <p className="body-sm">Loading…</p>
      ) : habits.length === 0 ? (
        <div className="empty-panel">No rituals yet. Begin with one.</div>
      ) : (
        <div className="space-y-8 animate-rise delay-2">
          {CATEGORIES.map((cat) => {
            const inCat = habits.filter((h) => (h.category || 'health') === cat.key);
            if (inCat.length === 0) return null;

            const catDone = inCat.filter((h) =>
              h.completedDates?.includes(todayStr())
            ).length;

            return (
              <div key={cat.key} className={`cat-${cat.key}`}>
                <div className="cat-header">
                  <span className="cat-dot"></span>
                  <span className="cat-label">{cat.label}</span>
                  <span className="body-sm" style={{ fontSize: '0.7rem' }}>
                    {catDone}/{inCat.length} today
                  </span>
                </div>

                <div className="space-y-2">
                  {inCat.map((habit) => {
                    const dates = habit.completedDates || [];
                    const mom = getMomentum(habit);
                    const isDoneToday = dates.includes(todayStr());

                    return (
                      <div key={habit._id} className={`habit-card cat-${cat.key}`}>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--text-display)' }}
                          >
                            {habit.name}
                          </p>
                          <span className={`momentum mom-${mom.key} inline-block mt-1.5`}>
                            {mom.label}
                          </span>
                        </div>

                        {/* week grid */}
                        <div className="week-grid">
                          {week.map((d) => (
                            <div
                              key={d.date}
                              className={`day-cell ${
                                dates.includes(d.date) ? 'day-done' : ''
                              } ${d.date === todayStr() ? 'day-today' : ''}`}
                              title={d.date}
                            >
                              {d.letter}
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleCheckIn(habit._id)}
                          disabled={isDoneToday}
                          className="btn-mini"
                        >
                          {isDoneToday ? '✓' : 'Tend'}
                        </button>

                        <button
                          onClick={() => handleDelete(habit._id)}
                          className="btn-delete"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Habits;