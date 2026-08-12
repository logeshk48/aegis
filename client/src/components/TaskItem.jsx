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

function TaskItem({ task, onToggle, onDelete, onToggleImportant, onRename, onReschedule, index = 0 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

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