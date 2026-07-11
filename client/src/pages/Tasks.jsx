import { useState, useEffect } from 'react';
import api from '../api/axios';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks');
        setTasks(res.data);
      } catch (err) {
        setError('Could not load tasks.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await api.post('/tasks', { title: newTitle, priority });
      setTasks([res.data, ...tasks]);
      setNewTitle('');
      setPriority('medium');
    } catch (err) {
      setError('Could not add task.');
      console.error(err);
    }
  };

  // toggle a task's completed status
  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      // replace the old task with the updated one from the server
      setTasks(tasks.map((task) => (task._id === id ? res.data : task)));
    } catch (err) {
      setError('Could not update task.');
      console.error(err);
    }
  };

  // delete a task
  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      // remove the deleted task from the list
      setTasks(tasks.filter((task) => task._id !== id));
    } catch (err) {
      setError('Could not delete task.');
      console.error(err);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>My Tasks {!loading && `(${tasks.length})`}</h1>

      <form onSubmit={handleAddTask} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs doing?"
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ padding: '0.5rem' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" style={{ padding: '0.5rem 1rem' }}>Add</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: '#888' }}>Loading your tasks...</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: '#888' }}>No tasks yet. Add your first one above! 🎯</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map((task) => (
            <li
              key={task._id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: task.completed ? '#f5f5f5' : 'white',
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task._id)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <strong
                style={{
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? '#999' : '#000',
                }}
              >
                {task.title}
              </strong>
              <span style={{ marginLeft: 'auto', color: '#888', fontSize: '0.85rem' }}>
                [{task.priority}]
              </span>
              <button
                onClick={() => handleDelete(task._id)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#c00',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0 0.25rem',
                }}
                title="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Tasks;