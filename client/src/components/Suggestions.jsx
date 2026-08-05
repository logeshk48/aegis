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
      setMessage(`Added "${suggestion.title}".`);
      setSuggestions((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
      setMessage('Could not add that.');
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <p className="eyebrow mb-3">Aegis is observing…</p>
        <div className="surface-tile">
          <p className="body-sm italic">Reading your patterns.</p>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return message ? (
      <div className="mb-6 flex items-center gap-3">
        <p className="body-sm" style={{ color: 'var(--gold)' }}>{message}</p>
        <button onClick={handleRefresh} className="body-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
          Look again
        </button>
      </div>
    ) : null;
  }

  return (
    <div className="mb-6">
      {/* header */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="eyebrow">Aegis noticed</p>
        <p className="body-sm" style={{ color: 'var(--text-faint)' }}>
          swipe →
        </p>
      </div>

      {message && (
        <p className="body-sm mb-3" style={{ color: 'var(--gold)' }}>{message}</p>
      )}

      {/* swipe rail */}
      <div className="swipe-rail">
        {suggestions.map((s, index) => (
          <div key={`${s.title}-${index}`} className="swipe-card">
            <div className="surface-tile surface-tile-accent h-full flex flex-col">
              <span
                className="eyebrow mb-2"
                style={{ color: s.type === 'habit' ? 'var(--gold)' : 'var(--rose)' }}
              >
                {s.type}
              </span>

              <h3 className="display-md mb-2" style={{ fontSize: '1.05rem' }}>
                {s.title}
              </h3>

              <p className="body-sm flex-1 mb-4" style={{ lineHeight: 1.55 }}>
                {s.reason}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAccept(s, index)}
                  disabled={accepting === index}
                  className="btn-mini"
                >
                  {accepting === index ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => handleDismiss(index)}
                  className="body-sm px-2 py-1 rounded-lg transition"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Suggestions;