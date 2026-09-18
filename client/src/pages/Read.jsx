import { useState, useEffect } from 'react';
import { getRead } from '../services/readApi';
import Patterns from '../components/Patterns';
import '../styles/read.css';

function Read() {
  const [read, setRead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revealed, setRevealed] = useState(0);

  const load = async (force = false) => {
    try {
      const data = await getRead(force);
      setRead(data);
      setRevealed(0);
    } catch (err) {
      console.error('Could not load read:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // reveal sections one at a time
  useEffect(() => {
    if (!read || read.thin) return;
    const total = (read.sections?.length || 0) + 2; // opening + sections + closing
    if (revealed >= total) return;

    const timer = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 400 : 700);
    return () => clearTimeout(timer);
  }, [read, revealed]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="read-stage">
          <div className="read-thinking">
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="ml-2">Aegis is reading you.</span>
          </div>
        </div>
      </div>
    );
  }

  if (!read) return null;

  const sections = read.sections || [];

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Observed</p>
        <h1 className="display-lg">What Aegis sees</h1>
      </div>

      <div className="read-stage">
        {refreshing ? (
          <div className="read-thinking">
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="ml-2">Looking again.</span>
          </div>
        ) : (
          <>
            {/* opening */}
            {revealed >= 1 && <p className="read-opening read-in">{read.opening}</p>}

            {/* sections */}
            {!read.thin &&
              sections.map((s, i) =>
                revealed >= i + 2 ? (
                  <div key={i} className="read-section read-in">
                    <p className="read-section-title">{s.title}</p>
                    <p className="read-section-body">{s.body}</p>
                  </div>
                ) : null
              )}

            {/* closing */}
            {!read.thin && revealed >= sections.length + 2 && read.closing && (
              <p className="read-closing read-in">{read.closing}</p>
            )}
          </>
        )}
      </div>

      {/* Patterns */}
      <Patterns />

      {/* footer */}
      <div className="flex items-center justify-between mt-8 mb-8">
        <p className="body-sm" style={{ color: 'var(--text-faint)' }}>
          {read.generatedAt
            ? `Read ${new Date(read.generatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`
            : ''}
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="body-sm hover:underline"
          style={{ color: 'var(--gold)' }}
        >
          {refreshing ? 'Reading…' : 'Look again'}
        </button>
      </div>
    </div>
  );
}

export default Read;