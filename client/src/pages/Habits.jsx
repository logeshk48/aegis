import { useState, useEffect } from 'react';
import api from '../api/axios';

function Habits() {
  const [habits, setHabits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  // fetch habits when the page loads
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

  // add a new habit
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
            <li
              key={habit._id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <strong>{habit.name}</strong>
              <span style={{ marginLeft: 'auto', color: '#888', fontSize: '0.85rem' }}>
                🔥 {habit.streak} day streak
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Habits;