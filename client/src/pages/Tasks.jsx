import { useState, useEffect } from 'react';
import api from '../api/axios';
import TaskItem from '../components/TaskItem';
import { parseTextToTasks } from '../services/aiApi';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  // state for the AI input box
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

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

  // send the AI text, get back tasks, add them to the list
  const handleAiParse = async (e) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    setAiLoading(true);
    setAiMessage('');
    setError('');

    try {
      const data = await parseTextToTasks(aiText);
      if (data.tasks && data.tasks.length > 0) {
        setTasks([...data.tasks, ...tasks]);
        setAiMessage(`✨ Created ${data.tasks.length} task(s)!`);
      } else {
        setAiMessage('No tasks found in that text. Try being more specific.');
      }
      setAiText('');
    } catch (err) {
      setError('AI could not process that. Try again.');
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks(tasks.map((task) => (task._id === id ? res.data : task)));
    } catch (err) {
      setError('Could not update task.');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter((task) => task._id !== id));
    } catch (err) {
      setError('Could not delete task.');
      console.error(err);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>My Tasks {!loading && `(${tasks.length})`}</h1>

      {/* AI brain-dump box */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          border: '1px solid #ddd6fe',
          borderRadius: '10px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', fontSize: '1.05rem' }}>
          🤖 Tell Aegis your plans
        </label>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Type naturally — Aegis will sort it into organized tasks.
        </p>
        <form onSubmit={handleAiParse}>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="e.g. gym after work, finish the report by Friday, call mom tomorrow"
            rows={3}
            style={{
              width: '100%',
              padding: '0.6rem',
              boxSizing: 'border-box',
              resize: 'vertical',
              border: '1px solid #c4b5fd',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
            }}
          />
          <button
            type="submit"
            disabled={aiLoading}
            style={{
              marginTop: '0.6rem',
              padding: '0.55rem 1.3rem',
              background: aiLoading ? '#a78bfa' : '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: aiLoading ? 'default' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95rem',
            }}
          >
            {aiLoading ? '🤔 Thinking...' : '✨ Organize with AI'}
          </button>
          {aiMessage && (
            <p style={{ marginTop: '0.6rem', color: '#7c3aed', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {aiMessage}
            </p>
          )}
        </form>
      </div>

      {/* manual add form */}
      <form onSubmit={handleAddTask} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Or add one task manually..."
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
            <TaskItem
              key={task._id}
              task={task}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default Tasks;