import { useState, useEffect } from 'react';
import { Pause, Play, X } from 'lucide-react';
import api from '../api/axios';

// en-CA gives YYYY-MM-DD, and toLocaleDateString respects the device
// timezone — so this is the user's local today, not UTC's.
const localToday = () => new Date().toLocaleDateString('en-CA');

const pretty = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

const shortPretty = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

// The four Aegis offers when it notices a stop. 'crunch' and 'other' exist
// in the model but aren't offered here — a question with six buttons isn't
// a question, it's a form.
const ASK_REASONS = [
  { key: 'unwell', label: 'I was unwell' },
  { key: 'away', label: 'I was away' },
  { key: 'family', label: 'Family' },
  { key: 'rest', label: 'I needed a break' },
];

const ALL_REASONS = [
  { key: 'unwell', label: 'Unwell' },
  { key: 'away', label: 'Away' },
  { key: 'family', label: 'Family' },
  { key: 'crunch', label: 'Crunch at work' },
  { key: 'rest', label: 'Taking a break' },
  { key: 'other', label: 'Other' },
];

const DISMISS_KEY = 'aegis_cliff_dismissed';

function DisruptionCard({ onChange }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // cliff flow
  const [picked, setPicked] = useState(null);

  // manual flow
  const [opening, setOpening] = useState(false);
  const [manualReason, setManualReason] = useState('away');
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/disruption');
      setState(res.data);
    } catch (err) {
      console.error('Could not load disruption state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const finish = async () => {
    await load();
    // Drift is cached for an hour and its windows just changed, so Home
    // has to refetch or it shows the old verdict.
    if (onChange) onChange();
  };

  const dismissed = () => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  };

  const dismissCliff = (since) => {
    try {
      localStorage.setItem(DISMISS_KEY, since);
    } catch {
      /* private mode — it'll ask again, which is the safe direction */
    }
    setState((s) => ({ ...s, cliff: null }));
  };

  // ---- actions ----

  const markPast = async (reason, stillOut) => {
    setBusy(true);
    try {
      await api.post('/disruption', {
        from: state.cliff.since,
        to: stillOut ? null : localToday(),
        reason,
      });
      setPicked(null);
      await finish();
    } catch (err) {
      console.error('Could not mark disruption:', err);
    } finally {
      setBusy(false);
    }
  };

  const startNow = async () => {
    setBusy(true);
    try {
      await api.post('/disruption', {
        from: localToday(),
        to: null,
        reason: manualReason,
        note: note.trim(),
      });
      setOpening(false);
      setNote('');
      await finish();
    } catch (err) {
      console.error('Could not start disruption:', err);
    } finally {
      setBusy(false);
    }
  };

  const endActive = async () => {
    setBusy(true);
    try {
      await api.post(`/disruption/${state.active._id}/end`, { to: localToday() });
      await finish();
    } catch (err) {
      console.error('Could not end disruption:', err);
    } finally {
      setBusy(false);
    }
  };

  const removeActive = async () => {
    setBusy(true);
    try {
      await api.delete(`/disruption/${state.active._id}`);
      await finish();
    } catch (err) {
      console.error('Could not remove disruption:', err);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !state) return null;

  // ---- 1. currently paused ----

  if (state.active) {
    const a = state.active;
    return (
      <div className="dis-panel dis-active mb-6 animate-rise">
        <div className="dis-head">
          <Pause size={13} />
          <span className="dis-eyebrow">Paused</span>
        </div>

        <p className="dis-headline">
          {a.reasonLabel || 'Away'} since {pretty(a.from)}.
        </p>
        <p className="dis-body">
          These days are set aside. Nothing is being measured and nothing is
          expected of you.
        </p>
        {a.note ? <p className="dis-note">“{a.note}”</p> : null}

        <div className="dis-actions">
          <button className="dis-btn dis-btn-primary" onClick={endActive} disabled={busy}>
            <Play size={12} /> I'm back
          </button>
          <button className="dis-btn-quiet" onClick={removeActive} disabled={busy}>
            Marked this by mistake
          </button>
        </div>
      </div>
    );
  }

  // ---- 2. Aegis noticed a stop ----

  if (state.cliff && dismissed() !== state.cliff.since) {
    const c = state.cliff;
    return (
      <div className="dis-panel dis-ask mb-6 animate-rise">
        <div className="dis-head">
          <span className="dis-eyebrow">Something changed</span>
          <button
            className="dis-x"
            onClick={() => dismissCliff(c.since)}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>

        <p className="dis-headline">
          Everything stopped on {pretty(c.since)}.
        </p>
        <p className="dis-body">
          {c.daysQuiet} quiet day{c.daysQuiet === 1 ? '' : 's'} after weeks of
          steady use. That's usually life, not a habit breaking. Which was it?
        </p>

        {!picked ? (
          <div className="dis-choices">
            {ASK_REASONS.map((r) => (
              <button
                key={r.key}
                className="dis-choice"
                onClick={() => setPicked(r.key)}
                disabled={busy}
              >
                {r.label}
              </button>
            ))}
            <button
              className="dis-choice dis-choice-alt"
              onClick={() => dismissCliff(c.since)}
              disabled={busy}
            >
              Something's actually wrong
            </button>
          </div>
        ) : (
          <div className="dis-followup">
            <p className="dis-followup-q">And now?</p>
            <div className="dis-actions">
              <button
                className="dis-btn dis-btn-primary"
                onClick={() => markPast(picked, false)}
                disabled={busy}
              >
                I'm back
              </button>
              <button
                className="dis-btn"
                onClick={() => markPast(picked, true)}
                disabled={busy}
              >
                Still out
              </button>
              <button className="dis-btn-quiet" onClick={() => setPicked(null)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- 3. nothing to say ----
  // A line, not a card. Home already has enough boxes.

  if (!opening) {
    return (
      <button className="dis-trigger mb-6" onClick={() => setOpening(true)}>
        <Pause size={11} /> Going to be away? Mark the time
      </button>
    );
  }

  return (
    <div className="dis-panel mb-6 animate-rise">
      <div className="dis-head">
        <Pause size={13} />
        <span className="dis-eyebrow">Mark time away</span>
        <button className="dis-x" onClick={() => setOpening(false)} aria-label="Cancel">
          <X size={13} />
        </button>
      </div>

      <p className="dis-body" style={{ marginTop: '0.5rem' }}>
        Starting today. Aegis stops measuring until you say you're back — it
        won't guess an end date.
      </p>

      <div className="dis-choices">
        {ALL_REASONS.map((r) => (
          <button
            key={r.key}
            className={`dis-choice ${manualReason === r.key ? 'dis-choice-on' : ''}`}
            onClick={() => setManualReason(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <input
        className="dis-input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything worth remembering later (optional)"
        maxLength={140}
      />

      <div className="dis-actions">
        <button className="dis-btn dis-btn-primary" onClick={startNow} disabled={busy}>
          Pause Aegis
        </button>
        <button className="dis-btn-quiet" onClick={() => setOpening(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default DisruptionCard;