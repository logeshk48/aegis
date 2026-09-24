import { useState, useEffect, useCallback } from 'react';
import {
  getSleep,
  logBedtime,
  logWake,
  confirmNight,
  correctNight,
} from '../services/sleepApi';
import '../styles/sleep.css';

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (d) => {
  const t = new Date(d);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
};
const duration = (min) => `${Math.floor(min / 60)}h ${pad(min % 60)}m`;

// Night runs from 20:00 to 04:00; morning from 04:00 to 12:00. Outside
// those the card has nothing to ask, so it just reports.
const phaseNow = (h = new Date().getHours()) => {
  if (h >= 20 || h < 4) return 'night';
  if (h < 12) return 'morning';
  return 'day';
};

// A wake date of 2026-09-25 with a bedtime of 23:30 means the bedtime was
// on the 24th. Anything from noon onwards belongs to the previous day.
const isoFor = (date, time) => {
  const [hh, mm] = time.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`);
  if (hh >= 12) d.setDate(d.getDate() - 1);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};

function SleepCard({ onChanged }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getSleep();
      setState(data);
      if (data.lastNight?.sleepAt) setBedTime(hhmm(data.lastNight.sleepAt));
      if (data.lastNight?.wakeAt) setWakeTime(hhmm(data.lastNight.wakeAt));
    } catch (err) {
      console.error('Could not read sleep:', err);
      setState({ failed: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
      onChanged?.();
    } catch (err) {
      setError('That did not save. Try again.');
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const saveCorrection = () =>
    run(async () => {
      const date = state.lastNight?.date || new Date().toISOString().split('T')[0];
      await correctNight(date, {
        sleepAt: isoFor(date, bedTime),
        wakeAt: isoFor(date, wakeTime),
      });
      setEditing(false);
    });

  if (!state || state.failed) return null;

  const { lastNight, pendingWake, needsConfirm, rhythm, capacity } = state;
  const phase = phaseNow();

  // ---- the correction form, reachable from any state ----
  if (editing) {
    return (
      <div className="sleep-card animate-rise">
        <p className="eyebrow mb-3">Last night</p>
        <div className="sleep-fields">
          <label className="sleep-field">
            <span className="xs-label">Asleep</span>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              className="date-input"
            />
          </label>
          <label className="sleep-field">
            <span className="xs-label">Awake</span>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="date-input"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={saveCorrection} disabled={busy} className="btn-gold">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-outline">Cancel</button>
        </div>
        {error && <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>{error}</p>}
      </div>
    );
  }

  // ---- morning: a guess waiting to be accepted ----
  if (phase === 'morning' && needsConfirm && lastNight) {
    return (
      <div className="sleep-card animate-rise">
        <p className="eyebrow mb-2">Last night</p>
        <h2 className="display-md">
          {hhmm(lastNight.sleepAt)} to {hhmm(lastNight.wakeAt)}
          <span className="sleep-dur"> · {duration(lastNight.minutes)}</span>
        </h2>
        <p className="body-sm mt-1">
          Worked out from when you stopped and started using Aegis. Worth a glance —
          it only counts once you say so.
        </p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => run(() => confirmNight(lastNight.date))} disabled={busy} className="btn-gold">
            {busy ? 'Saving…' : 'That is right'}
          </button>
          <button onClick={() => setEditing(true)} className="btn-outline">Not quite</button>
        </div>
      </div>
    );
  }

  // ---- morning: you said goodnight, never said good morning ----
  if (phase === 'morning' && pendingWake && lastNight) {
    return (
      <div className="sleep-card animate-rise">
        <p className="eyebrow mb-2">Morning</p>
        <h2 className="display-md">You turned in at {hhmm(lastNight.sleepAt)}</h2>
        <p className="body-sm mt-1">Tap when you are properly up and I will close the night.</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => run(() => logWake())} disabled={busy} className="btn-gold">
            {busy ? 'Saving…' : 'Just woke up'}
          </button>
          <button onClick={() => setEditing(true)} className="btn-outline">Set the time</button>
        </div>
      </div>
    );
  }

  // ---- night: the one tap that makes tomorrow's number real ----
  if (phase === 'night') {
    const loggedTonight = lastNight && lastNight.sleepAt && !lastNight.wakeAt;

    return (
      <div className="sleep-card animate-rise">
        <p className="eyebrow mb-2">Tonight</p>
        {loggedTonight ? (
          <>
            <h2 className="display-md">Turned in at {hhmm(lastNight.sleepAt)}</h2>
            <p className="body-sm mt-1">Sleep well. I will ask how it went in the morning.</p>
            <button onClick={() => setEditing(true)} className="btn-outline mt-4">
              Change the time
            </button>
          </>
        ) : (
          <>
            <h2 className="display-md">Calling it a night?</h2>
            <p className="body-sm mt-1">
              One tap now is what lets Aegis size tomorrow to what you actually have.
            </p>
            <button onClick={() => run(() => logBedtime())} disabled={busy} className="btn-gold mt-4">
              {busy ? 'Saving…' : 'Turning in'}
            </button>
          </>
        )}
        {error && <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>{error}</p>}
      </div>
    );
  }

  // ---- daytime: what last night bought you ----
  const spread = rhythm.bedtimeSpreadMin;

  return (
    <div className="sleep-card animate-rise">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Sleep</p>
        <button onClick={() => setEditing(true)} className="sleep-edit">edit</button>
      </div>

      {lastNight?.confirmed && lastNight.minutes ? (
        <>
          <h2 className="display-md mt-1">{duration(lastNight.minutes)}</h2>
          <p className="body-sm mt-1" style={{ color: 'var(--text-body)' }}>{capacity.reason}</p>
        </>
      ) : (
        <>
          <h2 className="display-md mt-1">Nothing logged</h2>
          <p className="body-sm mt-1">Tap "Turning in" tonight and this starts meaning something.</p>
        </>
      )}

      {rhythm.nights >= 2 && (
        <div className="sleep-rhythm">
          <span className="numeral-sm">{spread === null ? '—' : `±${spread}m`}</span>
          <span className="xs-label">
            bedtime spread over {rhythm.nights} night{rhythm.nights === 1 ? '' : 's'}
            {spread !== null && spread < 45 ? ' — steady' : spread !== null ? ' — uneven' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default SleepCard;