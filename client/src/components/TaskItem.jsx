import { dueLabel, groupOf } from '../utils/taskGroups';

const dueChipClass = (task) => {
  const g = groupOf(task);
  if (g === 'overdue') return 'due-chip due-overdue';
  if (g === 'today') return 'due-chip due-today';
  return 'due-chip due-soon';
};

function TaskItem({ task, onToggle, onDelete, onToggleImportant }) {
  const label = dueLabel(task);

  return (
    <li className={`task-row ${task.completed ? 'task-row-done' : ''}`}>
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

      <span
        className={`flex-1 text-sm ${task.completed ? 'task-title-done' : ''}`}
        style={!task.completed ? { color: 'var(--text-display)' } : undefined}
      >
        {task.title}
      </span>

      {label && !task.completed && <span className={dueChipClass(task)}>{label}</span>}

      <button onClick={() => onDelete(task._id)} className="btn-delete" title="Delete">
        ✕
      </button>
    </li>
  );
}

export default TaskItem;