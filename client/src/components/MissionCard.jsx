import { useState, useEffect, useCallback } from 'react';
import {
  Play, Feather, Shuffle, X, Check, Clock,
  MapPin, Zap, Monitor, Activity, ChevronDown,
} from 'lucide-react';
import {
  getMission, startFocus, endFocus, scheduleTask, setTaskKind, completeTask,
} from '../services/focusApi';
import '../styles/focus.css';
import '../styles/mission.css';

const NOTE = {
  drifting: "Ten minutes. That's all it has to be.",
  slipping: 'A small one. Just get started.',
  recovering: 'Sized for recovering — not too much.',
  steady: "You're steady. A full session.",
  unknown: 'A comfortable starting length.',
};

const FREE_MINUTES = 15;
const halve = (m) => Math.max(5, Math.floor(m / 2 / 5) * 5); // 45 → 20 → 10 → 5

const KIND_META = {
  focus: { label: 'Desk work', Icon: Monitor },
  errand: { label: 'Errand', Icon: MapPin },
  quick: { label: 'Quick', Icon: Zap },
  activity: { label: 'Activity', Icon: Activity },
};

// ---------- time helpers (all in your local time) ----------

const pad = (n) => String(n).padStart(2, '0');

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmtTime = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const whenLabel = (d) => {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return `today, ${fmtTime(d)}`;
  if (sameDay(d, tomorrow)) return `tomorrow, ${fmtTime(d)}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${fmtTime(d)}`;
};

const at = (dayOffset, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// an hour from now, rounded up to the next quarter hour
const inAnHour = () => {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
};

const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// slots that have already passed today are hidden
const buildSlots = () => {
  const soon = Date.now() + 15 * 60000;
  return [
    { key: 'hour', label: 'In an hour', date: inAnHour() },
    { key: 'morning', label: 'This morning', date: at(0, 10) },
    { key: 'lunch', label: 'After lunch', date: at(0, 14) },
    { key: 'evening', label: 'Evening', date: at(0, 18) },
    { key: 'tomorrow', label: 'Tomorrow', date: at(1, 10) },
  ].filter((s) => s.key === 'hour' || s.key === 'tomorrow' || s.date.getTime() > soon);
};

// ---------- small pieces ----------

// "Errand ▾" — tap to correct what kind of task this is
function KindChips({ task, onKind, busy }) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[task.kind] || KIND_META.focus;
  const Icon = meta.Icon;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="kind-chip"
        title="Not right? Change it"
      >
        <Icon size={11} /> {meta.label} <ChevronDown size={11} />
      </button>

      {open && (
        <div className="kind-menu">
          {Object.entries(KIND_META).map(([k, m]) => {
            const OptIcon = m.Icon;
            return (
              <button
                key={k}
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  if (k !== task.kind) onKind(task, k);
                }}
                className={`kind-opt ${k === task.kind ? 'kind-opt-on' : ''}`}
              >
                <OptIcon size={12} /> {m.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function TaskPicker({ tasks, current, onPick, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <p className="display-md" style={{ fontSize: '1.1rem' }}>
            Pick a desk task
          </p>
          <button onClick={onClose} className="btn-delete" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="picker-list">
          {tasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t)}
              className={`picker-item ${current?.id === t.id ? 'picker-item-active' : ''}`}
            >
              <span className="picker-title">
                {t.important ? '★ ' : ''}
                {t.title}
              </span>
              <span className="picker-reason">{t.reason}</span>
            </button>
          ))}

          <button
            onClick={() => onPick(null)}
            className={`picker-item ${!current ? 'picker-item-active' : ''}`}
          >
            <span className="picker-title">Free focus</span>
            <span className="picker-reason">no task</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- the timed desk mission ----------

function DeskMission({ mission, compact, outerBusy, onStarted, onKind }) {
  const first = mission.focus.task;
  const base = mission.baseMinutes;

  const [task, setTask] = useState(first);
  const [minutes, setMinutes] = useState(first ? base : Math.min(base, FREE_MINUTES));
  const [easied, setEasied] = useState(false);
  const [extraRound, setExtraRound] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickable = [mission.focus.task, ...(mission.focus.alternatives || [])].filter(Boolean);
  const disabled = busy || outerBusy;

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const session = await startFocus({
        taskId: task?.id || null,
        plannedMinutes: minutes,
        isExtraRound: extraRound || mission.missionDone,
        driftState: mission.state,
      });
      onStarted(session);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start.');
    } finally {
      setBusy(false);
    }
  };

  // the day's focus mission is already done
  if (mission.missionDone && !extraRound) {
    return (
      <div className={compact ? 'desk-block' : ''}>
        {compact && (
          <p className="eyebrow mb-3" style={{ color: 'var(--text-faint)' }}>
            Desk mission
          </p>
        )}
        <div className="flex items-baseline gap-2">
          <span className="mission-done-stat">{mission.minutesToday}</span>
          <span className="body-sm">minutes focused today</span>
        </div>
        <p className="mission-note">The day's focus mission is done. Anything more is a bonus.</p>
        <div className="mission-actions">
          <button onClick={() => setExtraRound(true)} className="btn-outline">
            Another round
          </button>
        </div>
      </div>
    );
  }

  const note = easied
    ? minutes <= 5
      ? 'As small as it gets. Just begin.'
      : 'Smaller is fine. Starting is the point.'
    : NOTE[mission.state] || NOTE.unknown;

  return (
    <div className={compact ? 'desk-block' : ''}>
      {compact && (
        <p className="eyebrow mb-3" style={{ color: 'var(--text-faint)' }}>
          {extraRound ? 'Another round' : 'Desk mission'}
        </p>
      )}

      <div className="mission-body">
        <div className={`mission-clock ${compact ? 'mission-clock-sm' : ''}`}>
          <span key={minutes} className="mission-minutes num-swap">
            {minutes}
          </span>
          <span className="mission-unit">min</span>
        </div>

        <div className="mission-info">
          <p className="mission-label">on</p>
          <p className={compact ? 'desk-title' : 'mission-task'}>
            {task ? task.title : 'Free focus'}
          </p>
          {!compact && task && (
            <div className="chip-row">
              <KindChips task={task} onKind={onKind} busy={disabled} />
              <span className="mission-reason">
                {task.important ? '★ ' : ''}
                {task.reason}
              </span>
            </div>
          )}
          <p className="mission-note">{note}</p>
        </div>
      </div>

      <div className="mission-actions">
        <button onClick={start} className="btn-gold mission-start" disabled={disabled}>
          <Play size={14} /> {busy ? 'Starting…' : 'Start'}
        </button>
        <button
          onClick={() => {
            setMinutes(halve);
            setEasied(true);
          }}
          className="btn-text"
          disabled={minutes <= 5}
        >
          <Feather size={14} /> Make it easier
        </button>
        <button onClick={() => setPickerOpen(true)} className="btn-text">
          <Shuffle size={14} /> Pick another
        </button>
      </div>

      {error && (
        <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {pickerOpen && (
        <TaskPicker
          tasks={pickable}
          current={task}
          onPick={(t) => {
            setTask(t);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- errands and activities: pick a time ----------

function PlanBlock({ kind, task, prep, busy, onSchedule, onDone, onKind, onPrep }) {
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(toLocalInput(inAnHour()));

  const slots = buildSlots();
  const Icon = KIND_META[kind].Icon;

  const setCustomTime = () => {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) onSchedule(task, d);
  };

  return (
    <div>
      <div className="plan-head">
        <span className="plan-icon">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mission-task">{task.title}</p>
          <div className="chip-row">
            <KindChips task={task} onKind={onKind} busy={busy} />
            <span className="mission-reason">
              {task.important ? '★ ' : ''}
              {task.reason}
            </span>
          </div>
        </div>
      </div>

      <p className="plan-question">
        {kind === 'errand' ? 'When will you go?' : 'When will you start?'}
      </p>
      <p className="mission-note">A fixed time makes it far more likely to actually happen.</p>

      <div className="slot-row">
        {slots.map((s) => (
          <button
            key={s.key}
            disabled={busy}
            onClick={() => onSchedule(task, s.date)}
            className="slot-chip"
          >
            {s.label}
            <span className="slot-time">{fmtTime(s.date)}</span>
          </button>
        ))}
        <button
          onClick={() => setCustom((c) => !c)}
          className={`slot-chip slot-pick ${custom ? 'slot-on' : ''}`}
        >
          <Clock size={13} /> Pick a time
        </button>
      </div>

      {custom && (
        <div className="slot-custom">
          <input
            type="datetime-local"
            value={value}
            min={toLocalInput(new Date())}
            onChange={(e) => setValue(e.target.value)}
            className="slot-input"
          />
          <button onClick={setCustomTime} className="btn-gold" disabled={busy}>
            Set
          </button>
        </div>
      )}

      {prep && (
        <div className="prep-row">
          <div className="min-w-0">
            <p className="prep-label">First, at your desk · {prep.minutes} min</p>
            <p className="prep-step">{prep.step}</p>
          </div>
          <button onClick={() => onPrep(task, prep)} className="btn-outline" disabled={busy}>
            <span className="inline-flex items-center gap-1.5">
              <Play size={13} /> Start
            </span>
          </button>
        </div>
      )}

      <div className="mission-actions">
        <button onClick={() => onDone(task)} className="btn-text" disabled={busy}>
          <Check size={14} /> {kind === 'errand' ? 'Already done' : 'Done it'}
        </button>
      </div>
    </div>
  );
}

// ---------- quick tasks: just clear them ----------

function QuickWins({ tasks, onComplete, onAllDone }) {
  const [doneIds, setDoneIds] = useState([]);
  const allDone = tasks.length > 0 && tasks.every((t) => doneIds.includes(t.id));

  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onAllDone, 1800);
    return () => clearTimeout(t);
  }, [allDone, onAllDone]);

  const check = async (t) => {
    setDoneIds((d) => [...d, t.id]);
    await onComplete(t);
  };

  return (
    <div>
      <div className="plan-head">
        <span className="plan-icon">
          <Zap size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mission-task">Quick wins</p>
          <p className="mission-note" style={{ marginTop: '0.35rem' }}>
            Small things. Clear them now and they stop taking up space in your head.
          </p>
        </div>
      </div>

      <div className="quick-list">
        {tasks.map((t) => {
          const done = doneIds.includes(t.id);
          return (
            <label key={t.id} className={`quick-row ${done ? 'quick-done' : ''}`}>
              <input
                type="checkbox"
                checked={done}
                disabled={done}
                onChange={() => check(t)}
                className="lux-check"
              />
              <span className="quick-title">{t.title}</span>
            </label>
          );
        })}
      </div>

      {allDone && <p className="mission-flash">Cleared. That's the two-minute rule at work.</p>}
    </div>
  );
}

// ---------- the card ----------

function MissionCard({ onStart, onResume, onTasksChanged }) {
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getMission();
      setMission(data);
      setError('');
    } catch (err) {
      console.error('Could not load mission:', err);
      setError('Could not load your mission.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(''), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  // run a change, then refresh the mission and the page's task list
  const act = async (fn, message) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      if (message) setFlash(message);
      onTasksChanged?.();
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = (task, date) =>
    act(() => scheduleTask(task.id, date), `${task.title} — planned for ${whenLabel(date)}.`);

  const handleDone = (task) => act(() => completeTask(task.id), `Done: ${task.title}.`);

  const handleKind = (task, kind) =>
    act(() => setTaskKind(task.id, kind), `Got it — "${task.title}" is ${KIND_META[kind].label.toLowerCase()}.`);

  const handleUnplan = (task) => act(() => scheduleTask(task.id, null));

  const handleQuickComplete = async (task) => {
    try {
      await completeTask(task.id);
      onTasksChanged?.();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStarted = (session) => {
    setMission((m) => ({ ...m, active: session }));
    onStart?.(session);
  };

  const handlePrep = async (task, prep) => {
    setBusy(true);
    try {
      const session = await startFocus({
        taskId: null, // prep isn't the errand itself
        plannedMinutes: prep.minutes,
        isExtraRound: true, // doesn't use up the day's focus mission
        driftState: mission.state,
        title: `Prep · ${prep.step}`,
      });
      handleStarted(session);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start.');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!mission?.active) return;
    setBusy(true);
    try {
      await endFocus(mission.active.id, 'abandoned');
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // ---------- states ----------

  if (loading) {
    return (
      <div className="mission-card">
        <p className="eyebrow">Today's mission</p>
        <p className="mission-note">Working out the one thing that matters…</p>
      </div>
    );
  }

  if (!mission) {
    return error ? (
      <div className="mission-card">
        <p className="body-sm" style={{ color: 'var(--rose)' }}>{error}</p>
      </div>
    ) : null;
  }

  // a session is running
  if (mission.active) {
    const s = mission.active;
    return (
      <div className="mission-card animate-rise">
        <div className="mission-top">
          <p className="eyebrow">In progress</p>
          {s.pausedAt && <span className="mission-today">paused</span>}
        </div>
        <div className="mission-body">
          <div className="mission-clock">
            <span className="mission-minutes">{s.plannedMinutes}</span>
            <span className="mission-unit">min</span>
          </div>
          <div className="mission-info">
            <p className="mission-label">on</p>
            <p className="mission-task">{s.taskTitle}</p>
            <p className="mission-note">Pick up where you left off.</p>
          </div>
        </div>
        <div className="mission-actions">
          <button onClick={() => onResume?.(s)} className="btn-gold mission-start" disabled={busy}>
            <Play size={14} /> Resume
          </button>
          <button onClick={handleDiscard} className="btn-text" disabled={busy}>
            End it
          </button>
        </div>
      </div>
    );
  }

  const { primary } = mission;
  const primaryIsDesk = !primary || primary.type === 'focus';

  return (
    <div className="mission-card animate-rise">
      <div className="mission-top">
        <p className="eyebrow">Today's mission</p>
        {mission.minutesToday > 0 && (
          <span className="mission-today">{mission.minutesToday} min focused today</span>
        )}
      </div>

      {/* the primary mission — its shape follows the kind of task */}
      {primaryIsDesk && (
        <DeskMission
          key={mission.focus.task?.id || 'free'}
          mission={mission}
          outerBusy={busy}
          onStarted={handleStarted}
          onKind={handleKind}
        />
      )}

      {(primary?.type === 'errand' || primary?.type === 'activity') && (
        <PlanBlock
          key={primary.task.id}
          kind={primary.type}
          task={primary.task}
          prep={primary.prep}
          busy={busy}
          onSchedule={handleSchedule}
          onDone={handleDone}
          onKind={handleKind}
          onPrep={handlePrep}
        />
      )}

      {primary?.type === 'quick' && (
        <QuickWins
          key={primary.tasks.map((t) => t.id).join('-')}
          tasks={primary.tasks}
          onComplete={handleQuickComplete}
          onAllDone={load}
        />
      )}

      {/* a timed desk mission, alongside anything that isn't desk work */}
      {!primaryIsDesk && mission.focus.task && (
        <DeskMission
          key={`desk-${mission.focus.task.id}`}
          mission={mission}
          compact
          outerBusy={busy}
          onStarted={handleStarted}
          onKind={handleKind}
        />
      )}

      {flash && <p className="mission-flash">{flash}</p>}
      {error && (
        <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {/* what's already planned */}
      {mission.planned?.length > 0 && (
        <div className="planned-strip">
          <p className="eyebrow mb-2" style={{ color: 'var(--text-faint)' }}>
            Planned
          </p>
          {mission.planned.map((t) => (
            <div key={t.id} className="planned-row">
              <span className="planned-dot"></span>
              <span className="planned-title">{t.title}</span>
              <span className="planned-when">{whenLabel(new Date(t.scheduledAt))}</span>
              <button
                onClick={() => handleDone(t)}
                className="planned-btn"
                title="Mark done"
                disabled={busy}
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => handleUnplan(t)}
                className="planned-btn"
                title="Change the time"
                disabled={busy}
              >
                change
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MissionCard;