import { useState, useEffect } from 'react';
import { getDrift } from '../services/driftApi';

const STATE_LABEL = {
  steady: 'Holding steady',
  recovering: 'Recovering',
  slipping: 'Slipping',
  drifting: 'Drifting',
  unknown: 'Learning you',
};

function DriftPanel({ onStartRecovery }) {
  const [drift, setDrift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getDrift();
        setDrift(data);
        // open the plan automatically when they actually need it
        if (data.state === 'drifting' || data.state === 'slipping') setShowPlan(true);
      } catch (err) {
        console.error('Could not read drift:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleStart = async () => {
    if (!drift?.plan?.length) return;
    setStarting(true);
    try {
      await onStartRecovery(drift.plan);
      setStarted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="drift-panel state-unknown mb-6">
        <p className="drift-state-label">Reading your patterns</p>
        <p className="body-sm mt-3 italic">One moment.</p>
      </div>
    );
  }

  if (!drift) return null;

  const stateClass = `state-${drift.state}`;

  return (
    <div className={`drift-panel ${stateClass} mb-6 animate-rise`}>
      {/* state + headline */}
      <p className="drift-state-label">{STATE_LABEL[drift.state] || drift.state}</p>
      <h2 className="drift-headline">{drift.headline}</h2>
      {drift.explanation && <p className="drift-explain">{drift.explanation}</p>}

      {/* signals */}
      {drift.signals?.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {drift.signals.map((s) => (
            <div key={s.key} className="signal-row">
              <span className="signal-label">{s.label}</span>
              <div className="signal-track">
                <div
                  className={`signal-fill signal-${s.direction}`}
                  style={{ width: `${Math.max(3, Math.min(100, s.recent))}%` }}
                ></div>
              </div>
              <span
                className="signal-delta"
                style={{
                  color:
                    s.direction === 'down'
                      ? 'var(--rose)'
                      : s.direction === 'up'
                      ? '#8fbf9f'
                      : 'var(--text-faint)',
                }}
              >
                {s.changePct > 0 ? '+' : ''}
                {s.changePct}%
              </span>
            </div>
          ))}

          {drift.overdue > 0 && (
            <div className="signal-row">
              <span className="signal-label">Overdue</span>
              <div className="signal-track">
                <div
                  className="signal-fill signal-down"
                  style={{ width: `${Math.min(100, drift.overdue * 18)}%` }}
                ></div>
              </div>
              <span className="signal-delta" style={{ color: 'var(--rose)' }}>
                {drift.overdue}
              </span>
            </div>
          )}
        </div>
      )}

      {/* plan */}
      {drift.plan?.length > 0 && (
        <div className="mt-5">
          {!showPlan ? (
            <button
              onClick={() => setShowPlan(true)}
              className="body-sm hover:underline"
              style={{ color: 'var(--gold)' }}
            >
              See today's plan →
            </button>
          ) : (
            <>
              <p className="eyebrow mb-3">Today's plan</p>
              <div className="space-y-2">
                {drift.plan.map((p, i) => (
                  <div key={i} className="plan-step">
                    <span className="plan-num">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="plan-text">{p.step}</p>
                      {p.why && <p className="plan-why">{p.why}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleStart}
                  disabled={starting || started}
                  className="btn-gold"
                >
                  {started ? 'Added to today' : starting ? 'Setting up…' : 'Start recovery'}
                </button>
                {started && (
                  <span className="body-sm" style={{ color: 'var(--text-faint)' }}>
                    Find them in Tasks.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DriftPanel;