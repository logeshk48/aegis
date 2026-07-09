import { useState, useEffect } from 'react';
import api from '../api/axios';

function Tasks() {
  const [tasks, setTasks] = useState([]);   // holds the list of tasks
  const [error, setError] = useState('');

  // fetch tasks when the page first loads
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks');
        setTasks(res.data);
      } catch (err) {
        setError('Could not load tasks.');
        console.error(err);
      }
    };

    fetchTasks();
  }, []); // the empty [] means "run once when the page loads"

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>My Tasks</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task._id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
            }}
          >
            <strong>{task.title}</strong>
            <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
              [{task.priority}]
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Tasks;