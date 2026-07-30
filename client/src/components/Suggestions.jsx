import { useState, useEffect } from 'react';
import { getSuggestions } from '../services/aiApi';

function Suggestions({ onAccept }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

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
      // remove it from the list once accepted
      setSuggestions((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Could not accept suggestion:', err);
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (index) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  // don't render anything if loading or nothing to suggest
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">💡 Aegis noticed...</h2>
        <div className="px-4 py-6 bg-white rounded-lg border border-slate-200 text-sm text-slate-400">
          Looking at your patterns...
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
        💡 Aegis noticed...
      </h2>
      <div className="space-y-2">
        {suggestions.map((s, index) => (
          <div
            key={`${s.title}-${index}`}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.type === 'habit'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {s.type}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{s.title}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">{s.reason}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleAccept(s, index)}
                disabled={accepting === index}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition"
              >
                {accepting === index ? 'Adding...' : `+ Add ${s.type}`}
              </button>
              <button
                onClick={() => handleDismiss(index)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Suggestions;