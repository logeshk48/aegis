import { useState, useEffect } from 'react';
import {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  clearMemories,
} from '../services/memoryApi';
import '../styles/memory.css';

const CATEGORIES = [
  { key: 'all', label: 'Everything' },
  { key: 'identity', label: 'Identity' },
  { key: 'pattern', label: 'Patterns' },
  { key: 'preference', label: 'Preferences' },
  { key: 'goal', label: 'Goals' },
  { key: 'struggle', label: 'Struggles' },
];

function Memory() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('identity');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getMemories();
        setMemories(data);
      } catch (err) {
        setError('Could not load memories.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    try {
      const created = await createMemory(newContent, newCategory);
      setMemories([created, ...memories]);
      setNewContent('');
    } catch (err) {
      setError('Could not save that.');
      console.error(err);
    }
  };

  const startEdit = (mem) => {
    setEditingId(mem._id);
    setDraft(mem.content);
  };

  const commitEdit = async (id) => {
    const clean = draft.trim();
    const original = memories.find((m) => m._id === id);
    setEditingId(null);

    if (!clean || clean === original.content) return;

    setMemories((prev) => prev.map((m) => (m._id === id ? { ...m, content: clean } : m)));
    try {
      await updateMemory(id, { content: clean });
    } catch (err) {
      setMemories((prev) => prev.map((m) => (m._id === id ? original : m)));
      console.error(err);
    }
  };

  const handleForget = async (id) => {
    const original = memories.find((m) => m._id === id);
    setMemories((prev) => prev.filter((m) => m._id !== id));
    try {
      await deleteMemory(id);
    } catch (err) {
      setMemories((prev) => [original, ...prev]);
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Forget everything Aegis has learned about you? This cannot be undone.'))
      return;
    try {
      await clearMemories();
      setMemories([]);
    } catch (err) {
      setError('Could not clear memories.');
      console.error(err);
    }
  };

  const visible =
    filter === 'all' ? memories : memories.filter((m) => m.category === filter);

  const countIn = (key) =>
    key === 'all' ? memories.length : memories.filter((m) => m.category === key).length;

  return (
    <div className="max-w-3xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">What Aegis knows</p>
        <h1 className="display-lg">Memory</h1>
        <p className="body-text mt-1">
          {loading
            ? 'Recalling…'
            : memories.length === 0
            ? 'Nothing learned yet. Write a diary entry and Aegis will start noticing things.'
            : `${memories.length} thing${memories.length > 1 ? 's' : ''} learned about you. Correct anything that\u2019s wrong.`}
        </p>
      </div>

      {/* Add manually */}
      <div className="surface-tile animate-rise delay-1 mb-8">
        <p className="eyebrow mb-3">Tell it something directly</p>
        <form onSubmit={handleAdd}>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Works best late at night"
            className="input-lux mb-3"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="input-lux"
              style={{ width: 'auto' }}
            >
              {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-gold">
              Remember this
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p className="body-sm mb-4" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {/* Filters */}
      {!loading && memories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5 animate-rise delay-2">
          {CATEGORIES.map((c) => {
            const n = countIn(c.key);
            if (n === 0 && c.key !== 'all') return null;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`mem-filter ${filter === c.key ? 'mem-filter-active' : ''}`}
              >
                {c.label} <span style={{ opacity: 0.6 }}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="body-sm">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="empty-panel">
          {memories.length === 0
            ? 'Aegis hasn\u2019t learned anything yet.'
            : 'Nothing in this category.'}
        </div>
      ) : (
        <div className="space-y-2 animate-rise delay-3">
          {visible.map((mem) => (
            <div key={mem._id} className={`mem-card mem-cat-${mem.category}`}>
              <div className="flex-1 min-w-0">
                {editingId === mem._id ? (
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(mem._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(mem._id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="mem-edit w-full"
                    autoFocus
                  />
                ) : (
                  <p
                    className="mem-text cursor-text"
                    onClick={() => startEdit(mem)}
                    title="Click to correct"
                  >
                    {mem.content}
                  </p>
                )}

                <div className="mem-meta">
                  <span className="mem-badge">{mem.category}</span>
                  <div className="conf-track">
                    <div
                      className="conf-fill"
                      style={{ width: `${Math.round(mem.confidence * 100)}%` }}
                    ></div>
                  </div>
                  {mem.reinforcedCount > 1 && (
                    <span className="mem-note">seen {mem.reinforcedCount}×</span>
                  )}
                  <span className="mem-note">
                    {mem.source === 'manual' ? 'you told it' : `from ${mem.source}`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleForget(mem._id)}
                className="btn-delete"
                title="Forget this"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Nuclear option */}
      {memories.length > 0 && (
        <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleClearAll}
            className="body-sm hover:underline"
            style={{ color: 'var(--text-faint)' }}
          >
            Forget everything
          </button>
        </div>
      )}
    </div>
  );
}

export default Memory;