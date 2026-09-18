import { useState, useEffect } from 'react';
import { getPatterns } from '../services/patternApi';

function Patterns() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        // stagger behind the read call to stay inside the AI rate limit
        await new Promise((r) => setTimeout(r, 3000));
        const res = await getPatterns();
        setData(res);
      } catch (err) {
        console.error('Could not load patterns:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // reveal cards one at a time
  useEffect(() => {
    if (!data?.patterns?.length) return;
    if (revealed >= data.patterns.length) return;

    const timer = setTimeout(() => setRevealed((r) => r + 1), 550);
    return () => clearTimeout(timer);
  }, [data, revealed]);

  if (loading) {
    return (
      <div className="mt-12">
        <p className="eyebrow mb-4">Patterns</p>
        <div className="read-thinking">
          <span className="think-dot"></span>
          <span className="think-dot"></span>
          <span className="think-dot"></span>
          <span className="ml-2">Looking for what repeats.</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between mb-4">
        <p className="eyebrow">Patterns</p>
        {!data.thin && data.patterns?.length > 0 && (
          <p className="body-sm" style={{ color: 'var(--text-faint)' }}>
            {data.patterns.length} found
          </p>
        )}
      </div>

      {data.thin || !data.patterns?.length ? (
        <div className="pattern-empty">{data.message}</div>
      ) : (
        <div className="space-y-3">
          {data.patterns.map((p, i) =>
            revealed >= i + 1 ? (
              <div
                key={p.key}
                className="pattern-card read-in"
                style={{ '--strength': `${Math.round((p.strength || 0.4) * 80)}%` }}
              >
                <h3 className="pattern-title">{p.title}</h3>
                <p className="pattern-observation">{p.observation}</p>
                {p.meaning && <p className="pattern-meaning">{p.meaning}</p>}
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export default Patterns;