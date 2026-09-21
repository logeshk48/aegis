import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Check, X, Maximize2, Minimize2 } from 'lucide-react';
import { pauseFocus, resumeFocus, endFocus, reflectFocus } from '../services/focusApi';
import { useNoise } from '../hooks/useNoise';
import '../styles/focus.css';

const R = 140;
const C = 2 * Math.PI * R;
const NOISES = ['brown', 'pink', 'white'];

const fmt = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const minutesLabel = (m) => {
  if (!m || m < 1) return 'Under a minute';
  const r = Math.round(m);
  return `${r} minute${r === 1 ? '' : 's'}`;
};

function FocusMode({ session, onClose }) {
  const plannedMs = session.plannedMinutes * 60000;
  const startedAt = new Date(session.startedAt).getTime();

  const [pausedAt, setPausedAt] = useState(
    session.pausedAt ? new Date(session.pausedAt).getTime() : null
  );
  const [pausedMs, setPausedMs] = useState(session.pausedMs || 0);
  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState('running'); // running | ending | reflect | saving
  const [result, setResult] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [finishTask, setFinishTask] = useState(null);
  const [reflection, setReflection] = useState('');
  const [isFull, setIsFull] = useState(false);

  const { noise, toggleNoise, stopNoise } = useNoise();
  const endingRef = useRef(false);
  const quitTimer = useRef(null);

  // ---- time: always derived from timestamps, never a counter ----
  const currentPause = pausedAt ? now - pausedAt : 0;
  const elapsed = Math.max(0, now - startedAt - pausedMs - currentPause);
  const remaining = Math.max(0, plannedMs - elapsed);
  const progress = remaining / plannedMs;

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  // ---- ending ----
  const finish = useCallback(
    async (outcome) => {
      if (endingRef.current) return;
      endingRef.current = true;
      setPhase('ending');
      stopNoise();

      try {
        const ended = await endFocus(session.id, outcome);
        setResult(ended);
      } catch (err) {
        console.error('Could not end session:', err);
        setResult({ status: outcome, actualMinutes: 0 });
      }
      setPhase('reflect');
    },
    [session.id, stopNoise]
  );

  // time's up
  useEffect(() => {
    if (phase === 'running' && !pausedAt && remaining <= 0) finish('completed');
  }, [phase, pausedAt, remaining, finish]);

  // ---- pause / resume ----
  const togglePause = async () => {
    const t = Date.now();

    if (pausedAt) {
      setPausedMs((p) => p + (t - pausedAt));
      setPausedAt(null);
      setNow(t);
      try {
        const s = await resumeFocus(session.id);
        setPausedMs(s.pausedMs);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPausedAt(t);
      setNow(t);
      try {
        await pauseFocus(session.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ---- give up: tap twice, no dialog ----
  const handleGiveUp = () => {
    if (confirmQuit) {
      clearTimeout(quitTimer.current);
      finish('abandoned');
    } else {
      setConfirmQuit(true);
      quitTimer.current = setTimeout(() => setConfirmQuit(false), 3000);
    }
  };

  useEffect(() => () => clearTimeout(quitTimer.current), []);

  // ---- keep the screen awake ----
  useEffect(() => {
    let lock = null;

    const acquire = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* not supported or denied — fine */
      }
    };

    acquire();
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release?.().catch(() => {});
    };
  }, []);

  // ---- lock page scroll, restore title on exit ----
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevTitle = document.title;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.title = prevTitle;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // the browser tab shows the countdown
  useEffect(() => {
    if (phase === 'running') {
      document.title = `${pausedAt ? '⏸ ' : ''}${fmt(remaining)} · Aegis`;
    }
  }, [phase, remaining, pausedAt]);

  // ---- fullscreen (not available on iPhone Safari — the button hides) ----
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* ignore */
    }
  };

  // ---- after the session ----
  const handleContinue = async () => {
    setPhase('saving');
    let taskCompleted = false;
    const text = reflection.trim();

    if (finishTask || text) {
      try {
        const r = await reflectFocus(session.id, {
          completeTask: !!finishTask,
          reflection: text,
        });
        taskCompleted = r.taskCompleted;
      } catch (err) {
        console.error(err);
      }
    }

    onClose({ taskCompleted });
  };

  // ================= render =================

  if (phase === 'ending') {
    return (
      <div className="focus-overlay">
        <p className="focus-of">Saving your minutes…</p>
      </div>
    );
  }

  if (phase === 'reflect' || phase === 'saving') {
    const done = result?.status === 'completed';
    const mins = result?.actualMinutes || 0;

    return (
      <div className="focus-overlay">
        <div className="focus-result">
          <div className={`focus-seal ${done ? 'focus-seal-done' : ''}`}>
            {done ? (
              <Check size={36} strokeWidth={2.5} />
            ) : (
              <span className="focus-seal-num">{mins < 1 ? '<1' : Math.round(mins)}</span>
            )}
          </div>

          <h2 className="focus-result-title">
            {done ? `${minutesLabel(mins)}. Done.` : `${minutesLabel(mins)} — it still counts.`}
          </h2>
          <p className="focus-result-sub">
            {done ? 'That was the hard part. Starting.' : 'Stopping is fine. You showed up.'}
          </p>

          {session.taskId && (
            <div className="focus-q">
              <p className="eyebrow mb-3">{session.taskTitle}</p>
              <div className="focus-choice-row">
                <button
                  onClick={() => setFinishTask(true)}
                  className={`focus-choice ${finishTask === true ? 'is-on' : ''}`}
                >
                  Mark it finished
                </button>
                <button
                  onClick={() => setFinishTask(false)}
                  className={`focus-choice ${finishTask === false ? 'is-on' : ''}`}
                >
                  Keep it open
                </button>
              </div>
            </div>
          )}

          <div className="focus-q">
            <p className="eyebrow mb-3">
              {done ? 'What made this startable?' : 'What got in the way?'}
            </p>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Optional — one line is plenty."
              rows={3}
              maxLength={500}
              className="focus-reflect"
            />
          </div>

          <button
            onClick={handleContinue}
            disabled={phase === 'saving'}
            className="btn-gold focus-continue"
          >
            {phase === 'saving' ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // running
  return (
    <div className="focus-overlay">
      <div className="focus-top">
        <span className="eyebrow">{pausedAt ? 'Paused' : 'Focus'}</span>
        <div className="focus-top-actions">
          {NOISES.map((k) => (
            <button
              key={k}
              onClick={() => toggleNoise(k)}
              className={`noise-chip ${noise === k ? 'noise-on' : ''}`}
              title={`${k} noise`}
            >
              {k}
            </button>
          ))}
          {canFullscreen && (
            <button onClick={toggleFull} className="focus-icon-btn" title="Fullscreen">
              {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
        </div>
      </div>

      <div className={`focus-ring-stage ${pausedAt ? 'is-paused' : ''}`}>
        <div className="focus-breath"></div>

        <svg viewBox="0 0 320 320" className="focus-ring-svg">
          <defs>
            <linearGradient id="focusGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8c99b" />
              <stop offset="50%" stopColor="#d4af7a" />
              <stop offset="100%" stopColor="#c9a068" />
            </linearGradient>
          </defs>
          <circle className="focus-track" cx="160" cy="160" r={R} />
          <circle
            className="focus-fill"
            cx="160"
            cy="160"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>

        <div className="focus-center">
          <span className="focus-time">{fmt(remaining)}</span>
          <span className="focus-of">
            {pausedAt ? 'paused' : `of ${session.plannedMinutes} min`}
          </span>
        </div>
      </div>

      <p className="focus-task">{session.taskTitle}</p>

      <div className="focus-controls">
        <button
          onClick={handleGiveUp}
          className={`focus-btn ${confirmQuit ? 'focus-btn-warn' : ''}`}
        >
          {confirmQuit ? 'Tap again to stop' : (
            <>
              <X size={15} /> Give up
            </>
          )}
        </button>

        <button onClick={togglePause} className="focus-btn focus-btn-main">
          {pausedAt ? (
            <>
              <Play size={15} /> Resume
            </>
          ) : (
            <>
              <Pause size={15} /> Pause
            </>
          )}
        </button>

        <button onClick={() => finish('completed')} className="focus-btn">
          <Check size={15} /> Done
        </button>
      </div>
    </div>
  );
}

export default FocusMode;