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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        My Tasks {!loading && <span className="text-slate-400 font-normal">({tasks.length})</span>}
      </h1>

      {/* AI brain-dump box */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <span>🤖</span> Tell Aegis your plans
        </h2>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">
          Type naturally — Aegis will sort it into organized tasks.
        </p>

        <form onSubmit={handleAiParse}>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="e.g. gym after work, finish the report by Friday, call mom tomorrow"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />
          <button
            type="submit"
            disabled={aiLoading}
            className="mt-3 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition"
          >
            {aiLoading ? '🤔 Thinking...' : '✨ Organize with AI'}
          </button>
          {aiMessage && (
            <p className="mt-3 text-sm font-medium text-indigo-700">{aiMessage}</p>
          )}
        </form>
      </div>

      {/* manual add form */}
      <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Or add one task manually..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition"
        >
          Add
        </button>
      </form>

      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading your tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400">No tasks yet. Add your first one above! 🎯</p>
        </div>
      ) : (
        <ul className="space-y-2">
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