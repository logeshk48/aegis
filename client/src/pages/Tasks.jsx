import { useState, useEffect } from 'react';
import api from '../api/axios';
import TaskItem from '../components/TaskItem';
import { parseTextToTasks } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import '../styles/tasks.css';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setAiText((prev) => (prev ? prev + ' ' + transcript : transcript));
    }
  }, [transcript]);

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
        setAiMessage(`${data.tasks.length} task${data.tasks.length > 1 ? 's' : ''} captured.`);
      } else {
        setAiMessage('Nothing actionable found. Try being more specific.');
      }
      setAiText('');
    } catch (err) {
      setError('Could not process that. Try again.');
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

  const visibleTasks = tasks.filter((t) => {
    if (filter === 'open') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const openCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="max-w-3xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Your list</p>
        <h1 className="display-lg">Tasks</h1>
        <p className="body-text mt-1">
          {loading
            ? 'Gathering everything…'
            : openCount === 0
            ? 'Nothing open. Well handled.'
            : `${openCount} open of ${tasks.length} total.`}
        </p>
      </div>

      {/* AI panel */}
      <div className="ai-panel animate-rise delay-1 mb-6">
        <p className="eyebrow mb-1">Capture</p>
        <h2 className="display-md mb-1">Tell Aegis your plans</h2>
        <p className="body-sm mb-4">
          Write or speak naturally — it will sort itself out.
        </p>

        <form onSubmit={handleAiParse}>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="gym after work, finish the report by Friday, call mom tomorrow…"
            rows={3}
            className="ai-textarea"
          />

          {listening && (
            <div className="flex items-center gap-2 mt-3 body-sm" style={{ color: 'var(--rose)' }}>
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: 'var(--rose)' }}
                ></span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--rose)' }}
                ></span>
              </span>
              Listening — speak freely, then stop when done.
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <button type="submit" disabled={aiLoading} className="btn-gold">
              {aiLoading ? 'Thinking…' : 'Organise'}
            </button>

            {isSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className="btn-outline"
                style={listening ? { borderColor: 'var(--rose)', color: 'var(--rose)' } : undefined}
              >
                {listening ? '⏹ Stop' : '🎤 Speak'}
              </button>
            )}
          </div>

          {!isSupported && (
            <p className="body-sm mt-3" style={{ color: 'var(--text-faint)' }}>
              Voice input needs Chrome or Edge.
            </p>
          )}

          {aiMessage && (
            <p className="body-sm mt-3" style={{ color: 'var(--gold)' }}>
              {aiMessage}
            </p>
          )}
        </form>
      </div>

      {/* Manual add */}
      <form onSubmit={handleAddTask} className="flex gap-2 mb-6 animate-rise delay-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add one directly…"
          className="input-lux flex-1"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="input-lux"
          style={{ width: 'auto' }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="btn-outline">
          Add
        </button>
      </form>

      {error && (
        <p className="body-sm mb-4" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {/* Filters */}
      {!loading && tasks.length > 0 && (
        <div className="flex items-center gap-2 mb-4 animate-rise delay-3">
          {[
            { key: 'all', label: 'All' },
            { key: 'open', label: 'Open' },
            { key: 'done', label: 'Done' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`filter-tab ${filter === f.key ? 'filter-tab-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="body-sm">Loading…</p>
      ) : visibleTasks.length === 0 ? (
        <div className="empty-panel animate-rise delay-3">
          {tasks.length === 0
            ? 'Nothing here yet. Capture your first thought above.'
            : 'Nothing in this view.'}
        </div>
      ) : (
        <ul className="space-y-2 animate-rise delay-3">
          {visibleTasks.map((task) => (
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