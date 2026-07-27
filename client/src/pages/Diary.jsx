import { useState, useEffect } from 'react';
import { createDiaryEntry, getDiaryEntries, deleteDiaryEntry } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

function Diary() {
  const [entries, setEntries] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  // append spoken text to the entry
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
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteDiaryEntry(id);
      setEntries(entries.filter((en) => en._id !== id));
    } catch (err) {
      setError('Could not delete entry.');
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">My Diary 📔</h1>
      <p className="text-slate-500 text-sm mb-6">
        Write about your day — Aegis will remember it and pull out any tasks.
      </p>

      {/* Write box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
        <form onSubmit={handleSave}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Today I... (write or speak the whole story of your day)"
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          />

          {listening && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Listening... tell me about your day
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition"
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>

            {isSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  listening
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                {listening ? '⏹ Stop' : '🎤 Speak'}
              </button>
            )}
          </div>

          {message && <p className="mt-3 text-sm font-medium text-indigo-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      </div>

      {/* Past entries */}
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Past entries</h2>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-slate-400">No entries yet. Write about your day above! 📔</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry._id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{formatDate(entry.entryDate)}</span>
                <button
                  onClick={() => handleDelete(entry._id)}
                  className="text-slate-300 hover:text-red-500 transition text-lg leading-none"
                  title="Delete entry"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{entry.content}</p>
              {entry.extractedTaskCount > 0 && (
                <p className="mt-3 text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded-full">
                  ✨ {entry.extractedTaskCount} task(s) extracted
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Diary;