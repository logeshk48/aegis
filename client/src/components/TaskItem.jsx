import { useState, useRef, useEffect } from 'react';
import { dueLabel, groupOf } from '../utils/taskGroups';

const dueChipClass = (task) => {
  const g = groupOf(task);
  if (g === 'overdue') return 'due-chip due-overdue';
  if (g === 'today') return 'due-chip due-today';
  return 'due-chip due-soon';
};

// date helpers for quick scheduling
const offsetDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

const QUICK = [
  { label: 'Today', days: 0 },
  { label: 'Tmrw', days: 1 },
  { label: 'Next wk', days: 7 },
];

// null = let the classifier decide. An explicit kind always wins,
// which is what effectiveKind does on the server.
const KINDS = [
  { value: null, label: 'Auto', hint: 'Let Aegis decide' },
  { value: 'focus', label: 'Focus', hint: 'Desk work — gets a timer' },
  { value: 'errand', label: 'Errand', hint: 'Somewhere to go — gets a plan' },
  { value: 'quick', label: 'Quick', hint: 'Two minutes — gets batched' },
  { value: 'activity', label: 'Activity', hint: 'Just start — no timer' },
];

function TaskItem({
  task,
  onToggle,
  onDelete,
  onToggleImportant,
  onRename,
  onReschedule,
  onSetKind,
  index = 0,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [kindOpen, setKindOpen] = useState(false);
  const inputRef = useRef(null);
  const kindRef = useRef(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // close the kind menu on an outside click or Escape
  useEffect(() => {
    if (!kindOpen) return;
    const onDown = (e) => {
      if (kindRef.current && !kindRef.current.contains(e.target)) setKindOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setKindOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [kindOpen]);

  const commit = () => {
    const clean = draft.trim();
    if (clean && clean !== task.title) {
      onRename(task._id, clean);
    } else {
      setDraft(task.title);
    }
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(task.title);
      setEditing(false);
    }
  };

  const label = dueLabel(task);

  // effectiveKind comes from the server virtual; task.kind is the override.
  const shownKind = task.effectiveKind || task.kind || 'focus';
  const isAuto = !task.kind;
  const current = KINDS.find((k) => k.value === shownKind) || KINDS[1];

  const pickKind = (value) => {
    setKindOpen(false);
    if (value !== (task.kind || null)) onSetKind(task._id, value);
  };

  return (
    <li
      className={`task-row row-in ${task.completed ? 'task-row-done' : ''}`}
      style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task._id)}
        className="lux-check"
      />

      <button
        onClick={() => onToggleImportant(task._id, !task.important)}
        className={`star-btn ${task.important ? 'star-on' : ''}`}
        title={task.important ? 'Unmark as important' : 'Mark as important'}
      >
        {task.important ? '★' : '☆'}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="edit-input"
        />
      ) : (
        <span
          onClick={() => !task.completed && setEditing(true)}
          className={`flex-1 text-sm task-title-editable ${
            task.completed ? 'task-title-done' : ''
          }`}
          style={!task.completed ? { color: 'var(--text-display)' } : undefined}
          title="Click to edit"
        >
          {task.title}
        </span>
      )}

      {/* kind — dim while it's a guess, solid once you've set it */}
      {!editing && !task.completed && (
        <div className="kind-wrap" ref={kindRef}>
          <button
            onClick={() => setKindOpen((o) => !o)}
            className={`kind-chip ${isAuto ? 'kind-auto' : 'kind-set'}`}
            title={isAuto ? `Guessed: ${current.label}. Click to set it.` : `Set to ${current.label}`}
          >
            {current.label}
          </button>

          {kindOpen && (
            <div className="kind-menu">
              {KINDS.map((k) => {
                const active = (task.kind || null) === k.value;
                return (
                  <button
                    key={k.label}
                    onClick={() => pickKind(k.value)}
                    className={`kind-option ${active ? 'kind-option-active' : ''}`}
                  >
                    <span className="kind-option-label">{k.label}</span>
                    <span className="kind-option-hint">{k.hint}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* quick schedule — revealed on hover */}
      {!editing && !task.completed && (
        <div className="quick-sched">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => onReschedule(task._id, offsetDate(q.days))}
              className="sched-chip"
              title={`Move to ${q.label}`}
            >
              {q.label}
            </button>
          ))}
          {task.dueDate && (
            <button
              onClick={() => onReschedule(task._id, null)}
              className="sched-chip"
              title="Remove date"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {label && !task.completed && !editing && (
        <span className={dueChipClass(task)}>{label}</span>
      )}

      {!editing && (
        <button onClick={() => onDelete(task._id)} className="btn-delete" title="Delete">
          ✕
        </button>
      )}
    </li>
  );
}

export default TaskItem;