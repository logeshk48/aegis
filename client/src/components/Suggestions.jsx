import { useState, useEffect } from 'react';
import { getSuggestions } from '../services/aiApi';

function Suggestions({ onAccept }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await getSuggestions();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error('Could not load suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  const handleAccept = async (suggestion, index) => {
    setAccepting(index);
    try {
      await onAccept(suggestion);
      setMessage(`✅ Added "${suggestion.title}" to your ${suggestion.type}s.`);
      setSuggestions((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Could not accept suggestion:', err);
      setMessage('Could not add that. Try again.');
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (index) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await getSuggestions();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Could not refresh suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl bg-slate-900 p-6">
        <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
          </span>
          Aegis is reading your patterns...
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return message ? (
      <div className="mb-8 rounded-2xl bg-slate-900 p-5">
        <p className="text-sm text-green-300">{message}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-xs text-indigo-300 hover:text-white transition"
        >
          ↻ Look again
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 shadow-xl shadow-indigo-900/20">
      {/* header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
          Aegis noticed
        </span>
      </div>
      <p className="text-white text-lg font-semibold mb-5">
        {suggestions.length} idea{suggestions.length > 1 ? 's' : ''} based on your patterns
      </p>

      {message && (
        <p className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-4">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {suggestions.map((s, index) => (
          <div
            key={`${s.title}-${index}`}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                  s.type === 'habit'
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'bg-sky-500/20 text-sky-300'
                }`}
              >
                {s.type}
              </span>
              <span className="font-semibold text-white">{s.title}</span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-3">{s.reason}</p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAccept(s, index)}
                disabled={accepting === index}
                className="px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 transition"
              >
                {accepting === index ? 'Adding...' : `+ Add this ${s.type}`}
              </button>
              <button
                onClick={() => handleDismiss(index)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                Not now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Suggestions;