import { useState, useEffect } from 'react';
import { createDiaryEntry, getDiaryEntries, deleteDiaryEntry } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import '../styles/diary.css';

const relativeDay = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

function Diary() {
  const [entries, setEntries] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});

  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setContent((prev) => (prev ? prev + ' ' + transcript : transcript));
    }
  }, [transcript]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await getDiaryEntries();
        setEntries(data);
      } catch (err) {
        setError('Could not load entries.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const data = await createDiaryEntry(content);
      setEntries([data.entry, ...entries]);
      setMessage(data.message);
      setContent('');
    } catch (err) {
      setError('Could not save entry.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this entry?')) return;
    try {
      await deleteDiaryEntry(id);
      setEntries(entries.filter((en) => en._id !== id));
    } catch (err) {
      setError('Could not delete entry.');
      console.error(err);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const promptLine = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'What are you carrying into today?';
    if (h < 18) return 'How has the day treated you?';
    return 'What happened today worth remembering?';
  })();

  return (
    <div className="max-w-3xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Your record</p>
        <h1 className="display-lg">Diary</h1>
        <p className="body-text mt-1">
          {loading
            ? 'Gathering…'
            : entries.length === 0
            ? 'Write your day. Aegis will remember it for you.'
            : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} kept.`}
        </p>
      </div>

      {/* Composer */}
      <div className="diary-composer animate-rise delay-1 mb-10">
        <p className="eyebrow mb-1">Today</p>
        <h2 className="display-md mb-4">{promptLine}</h2>

        <form onSubmit={handleSave}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write freely — Aegis will pull out anything that needs doing…"
            rows={7}
            className="diary-textarea"
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
              Listening — speak freely, then stop when you're done.
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button type="submit" disabled={saving || !content.trim()} className="btn-gold">
              {saving ? 'Keeping…' : 'Keep this'}
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

            <span className="word-count ml-auto">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>

          {message && (
            <p className="body-sm mt-3" style={{ color: 'var(--gold)' }}>
              {message}
            </p>
          )}
          {error && (
            <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>
              {error}
            </p>
          )}
        </form>
      </div>

      {/* Past entries */}
      <div className="group-head">
        <h2 className="display-md" style={{ fontSize: '1.05rem' }}>
          Earlier
        </h2>
        {!loading && <span className="group-count">{entries.length}</span>}
      </div>

      {loading ? (
        <p className="body-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="empty-panel">Nothing written yet. Begin above.</div>
      ) : (
        <div className="entry-list space-y-4 animate-rise delay-2">
          {entries.map((entry) => {
            const isOpen = expanded[entry._id];
            const isLong = entry.content.length > 260;

            return (
              <div key={entry._id} className="entry-card">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="entry-date truncate">{formatDate(entry.entryDate)}</span>
                    <span className="entry-relative">{relativeDay(entry.entryDate)}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(entry._id)}
                    className="btn-delete"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>

                <p className={`entry-body ${isLong && !isOpen ? 'entry-clamped' : ''}`}>
                  {entry.content}
                </p>

                {isLong && (
                  <button
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [entry._id]: !prev[entry._id] }))
                    }
                    className="entry-more block"
                  >
                    {isOpen ? 'Show less' : 'Read more'}
                  </button>
                )}

                {entry.extractedTaskCount > 0 && (
                  <div className="mt-4">
                    <span className="extract-chip">
                      ✦ {entry.extractedTaskCount} task
                      {entry.extractedTaskCount > 1 ? 's' : ''} drawn out
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Diary;