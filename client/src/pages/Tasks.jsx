import { useState, useEffect } from 'react';
import api from '../api/axios';
import TaskItem from '../components/TaskItem';
import UndoToast from '../components/UndoToast';
import { parseTextToTasks } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { GROUPS, groupOf, sortTasks } from '../utils/taskGroups';
import '../styles/tasks.css';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newImportant, setNewImportant] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) setAiText((prev) => (prev ? prev + ' ' + transcript : transcript));
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
      const res = await api.post('/tasks', {
        title: newTitle,
        dueDate: newDue || null,
        important: newImportant,
      });
      setTasks([res.data, ...tasks]);
      setNewTitle('');
      setNewDue('');
      setNewImportant(false);
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
      if (data.tasks?.length > 0) {
        setTasks([...data.tasks, ...tasks]);
        setAiMessage(`${data.tasks.length} captured.`);
      } else {
        setAiMessage('Nothing actionable found.');
      }
      setAiText('');
    } catch (err) {
      setError('Could not process that.');
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleImportant = async (id, value) => {
    const original = tasks.find((t) => t._id === id);
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, important: value } : t)));
    try {
      await api.put(`/tasks/${id}`, { important: value });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === id ? original : t)));
      console.error(err);
    }
  };

  const handleRename = async (id, title) => {
    const original = tasks.find((t) => t._id === id);
    setTasks((prev) => prev.map((t) => (t._id === id ? { ...t, title } : t)));
    try {
      await api.put(`/tasks/${id}`, { title });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === id ? original : t)));
      console.error(err);
    }
  };

  // remove from view immediately; actually delete when the toast expires
  const handleDelete = (id) => {
    const task = tasks.find((t) => t._id === id);
    if (!task) return;
    setTasks((prev) => prev.filter((t) => t._id !== id));
    setPendingDelete({ task });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { task } = pendingDelete;
    setPendingDelete(null);
    try {
      await api.delete(`/tasks/${task._id}`);
    } catch (err) {
      setTasks((prev) => [task, ...prev]);
      console.error(err);
    }
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    setTasks((prev) => [pendingDelete.task, ...prev]);
    setPendingDelete(null);
  };

  const openTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed).sort(sortTasks);

  return (
    <div className="max-w-3xl mx-auto relative z-10">
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Your list</p>
        <h1 className="display-lg">Tasks</h1>
        <p className="body-text mt-1">
          {loading
            ? 'Gathering…'
            : openTasks.length === 0
            ? 'Nothing open. Well handled.'
            : `${openTasks.length} open.`}
        </p>
      </div>

      {/* AI capture */}
      <div className="ai-panel animate-rise delay-1 mb-6">
        <p className="eyebrow mb-1">Capture</p>
        <h2 className="display-md mb-1">Tell Aegis your plans</h2>
        <p className="body-sm mb-4">Mention dates and it will schedule them for you.</p>

        <form onSubmit={handleAiParse}>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="finish the report by Friday, call mom tomorrow…"
            rows={3}
            className="ai-textarea"
          />

          {listening && (
            <div className="flex items-center gap-2 mt-3 body-sm" style={{ color: 'var(--rose)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--rose)' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--rose)' }}></span>
              </span>
              Listening…
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

          {aiMessage && (
            <p className="body-sm mt-3" style={{ color: 'var(--gold)' }}>{aiMessage}</p>
          )}
        </form>
      </div>

      {/* Manual add */}
      <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 mb-8 animate-rise delay-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add one directly…"
          className="input-lux flex-1"
          style={{ minWidth: '180px' }}
        />
        <input
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          className="date-input"
        />
        <button
          type="button"
          onClick={() => setNewImportant(!newImportant)}
          className={`btn-outline ${newImportant ? 'star-on' : ''}`}
          style={newImportant ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : undefined}
          title="Mark as important"
        >
          {newImportant ? '★' : '☆'}
        </button>
        <button type="submit" className="btn-gold">Add</button>
      </form>

      {error && <p className="body-sm mb-4" style={{ color: 'var(--rose)' }}>{error}</p>}

      {/* Grouped by derived urgency */}
      {loading ? (
        <p className="body-sm">Loading…</p>
      ) : openTasks.length === 0 ? (
        <div className="empty-panel">Nothing open. Capture something above.</div>
      ) : (
        <div className="space-y-8 animate-rise delay-3">
          {GROUPS.map((g) => {
            const inGroup = openTasks.filter((t) => groupOf(t) === g.key).sort(sortTasks);
            if (inGroup.length === 0) return null;

            return (
              <div key={g.key}>
                <div className="group-head">
                  <h2
                    className="display-md"
                    style={{
                      fontSize: '1.05rem',
                      color: g.key === 'overdue' ? 'var(--rose)' : undefined,
                    }}
                  >
                    {g.label}
                  </h2>
                  <span className="group-count">{inGroup.length}</span>
                </div>

                <ul className="space-y-2">
                  {inGroup.map((task) => (
                    <TaskItem
                      key={task._id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onToggleImportant={handleToggleImportant}
                      onRename={handleRename}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed, collapsed */}
      {doneTasks.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowDone(!showDone)}
            className="body-sm hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {showDone ? '▾' : '▸'} Completed ({doneTasks.length})
          </button>

          {showDone && (
            <ul className="space-y-2 mt-3">
              {doneTasks.map((task) => (
                <TaskItem
                  key={task._id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onToggleImportant={handleToggleImportant}
                  onRename={handleRename}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {pendingDelete && (
        <UndoToast
          message={`"${pendingDelete.task.title}" deleted`}
          onUndo={undoDelete}
          onExpire={confirmDelete}
        />
      )}
    </div>
  );
}

export default Tasks;