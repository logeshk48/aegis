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

  // mark a habit done for today
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

  // delete a habit
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

  // helper: has this habit been done today?
  const isDoneToday = (habit) => {
    const today = new Date().toISOString().split('T')[0];
    return habit.completedDates?.includes(today);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>My Habits {!loading && `(${habits.length})`}</h1>

      <form onSubmit={handleAddHabit} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Read 10 pages, Gym, Drink water"
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>Add Habit</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: '#888' }}>Loading your habits...</p>
      ) : habits.length === 0 ? (
        <p style={{ color: '#888' }}>No habits yet. Start one above! 🔥</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
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