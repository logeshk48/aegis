import { useState, useEffect } from 'react';
import { Play, Feather, Shuffle, X } from 'lucide-react';
import { getMission, startFocus, endFocus } from '../services/focusApi';
import '../styles/focus.css';

const NOTE = {
  drifting: "Ten minutes. That's all it has to be.",
  slipping: 'A small one. Just get started.',
  recovering: 'Sized for recovering — not too much.',
  steady: "You're steady. A full session.",
  unknown: 'A comfortable starting length.',
};

const FREE_MINUTES = 15;

// 45 → 20 → 10 → 5, never below 5
const halve = (m) => Math.max(5, Math.floor(m / 2 / 5) * 5);

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
            Pick a task
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

function MissionCard({ onStart, onResume }) {
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null); // null = free focus
  const [minutes, setMinutes] = useState(25);
  const [easied, setEasied] = useState(false);
  const [extraRound, setExtraRound] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getMission();
      setMission(data);
      setTask(data.task);
      setMinutes(data.task ? data.baseMinutes : Math.min(data.baseMinutes, FREE_MINUTES));
      setEasied(false);
      setError('');
    } catch (err) {
      console.error('Could not load mission:', err);
      setError('Could not load your mission.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStart = async () => {
    setBusy(true);
    setError('');
    try {
      const session = await startFocus({
        taskId: task?.id || null,
        plannedMinutes: minutes,
        isExtraRound: extraRound || mission.missionDone,
        driftState: mission.state,
      });
      setMission((m) => ({ ...m, active: session }));
      onStart?.(session);
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

  const handleEasier = () => {
    setMinutes(halve);
    setEasied(true);
  };

  const handlePick = (t) => {
    setTask(t);
    setPickerOpen(false);
  };

  // ---------- states ----------

  if (loading) {
    return (
      <div className="mission-card">
        <p className="eyebrow">Today's mission</p>
        <p className="mission-note">Finding the right size for today…</p>
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

  // a session is already running
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

  // today's mission already done
  if (mission.missionDone && !extraRound) {
    return (
      <div className="mission-card animate-rise">
        <p className="eyebrow mb-4">Mission complete</p>
        <div className="flex items-baseline gap-2">
          <span className="mission-done-stat">{mission.minutesToday}</span>
          <span className="body-sm">minutes focused today</span>
        </div>
        <p className="mission-note">The day's mission is done. Anything more is a bonus.</p>
        <div className="mission-actions">
          <button onClick={() => setExtraRound(true)} className="btn-outline">
            Another round
          </button>
        </div>
      </div>
    );
  }

  // the proposal
  const pickable = [mission.task, ...(mission.alternatives || [])].filter(Boolean);

  return (
    <>
      <div className="mission-card animate-rise">
        <div className="mission-top">
          <p className="eyebrow">{extraRound ? 'Another round' : "Today's mission"}</p>
          {mission.minutesToday > 0 && (
            <span className="mission-today">{mission.minutesToday} min today</span>
          )}
        </div>

        <div className="mission-body">
          <div className="mission-clock">
            <span key={minutes} className="mission-minutes num-swap">
              {minutes}
            </span>
            <span className="mission-unit">min</span>
          </div>

          <div className="mission-info">
            <p className="mission-label">on</p>
            <p className="mission-task">{task ? task.title : 'Free focus'}</p>
            {task && (
              <span className="mission-reason">
                {task.important ? '★ ' : ''}
                {task.reason}
              </span>
            )}
            <p className="mission-note">
              {easied
                ? minutes <= 5
                  ? 'As small as it gets. Just begin.'
                  : 'Smaller is fine. Starting is the point.'
                : NOTE[mission.state] || NOTE.unknown}
            </p>
          </div>
        </div>

        <div className="mission-actions">
          <button onClick={handleStart} className="btn-gold mission-start" disabled={busy}>
            <Play size={14} /> {busy ? 'Starting…' : 'Start'}
          </button>
          <button onClick={handleEasier} className="btn-text" disabled={minutes <= 5}>
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
      </div>

      {pickerOpen && (
        <TaskPicker
          tasks={pickable}
          current={task}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

export default MissionCard;