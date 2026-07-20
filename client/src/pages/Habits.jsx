import { useState, useEffect } from 'react';
import api from '../api/axios';
import HabitItem from '../components/HabitItem';

function Habits() {
  const [habits, setHabits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

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

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/habits', { name: newName });
      setHabits([res.data, ...habits]);
      setNewName('');
    } catch (err) {
      setError('Could not add habit.');
      console.error(err);
    }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits(habits.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not check in.';
      setError(msg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit? This cannot be undone.')) return;
    try {
      await api.delete(`/habits/${id}`);
      setHabits(habits.filter((h) => h._id !== id));
    } catch (err) {
      setError('Could not delete habit.');
      console.error(err);
    }
  };

  const isDoneToday = (habit) => {
    const today = new Date().toISOString().split('T')[0];
    return habit.completedDates?.includes(today);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Habits</h1>
      <p className="text-slate-500 text-sm mb-6">
        Build streaks by checking in every day. 🔥
      </p>

      <form onSubmit={handleAddHabit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Read 10 pages, Gym, Drink water"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          Add Habit
        </button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading your habits...</p>
      ) : habits.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400">No habits yet. Start one above! 🔥</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {habits.map((habit) => (
            <HabitItem
              key={habit._id}
              habit={habit}
              onCheckIn={handleCheckIn}
              onDelete={handleDelete}
              isDoneToday={isDoneToday}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default Habits;