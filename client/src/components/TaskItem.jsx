const prioClass = {
  low: 'prio prio-low',
  medium: 'prio prio-medium',
  high: 'prio prio-high',
};

function TaskItem({ task, onToggle, onDelete }) {
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <li className={`task-row ${task.completed ? 'task-row-done' : ''}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task._id)}
        className="lux-check"
      />

      <span
        className={`flex-1 text-sm ${task.completed ? 'task-title-done' : ''}`}
        style={!task.completed ? { color: 'var(--text-display)' } : undefined}
      >
        {task.title}
      </span>

      {due && (
        <span className="body-sm" style={{ fontSize: '0.7rem' }}>
          {due}
        </span>
      )}

      <span className={prioClass[task.priority] || 'prio prio-low'}>
        {task.priority}
      </span>

      <button onClick={() => onDelete(task._id)} className="btn-delete" title="Delete">
        ✕
      </button>
    </li>
  );
}

export default TaskItem;