// map each priority to a color
const priorityColors = {
  low: '#22c55e',      // green
  medium: '#eab308',   // yellow
  high: '#ef4444',     // red
};

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '0.75rem 1rem',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: task.completed ? '#f5f5f5' : 'white',
      }}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task._id)}
        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
      />
      <strong
        style={{
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? '#999' : '#000',
        }}
      >
        {task.title}
      </strong>

      <span
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: '#888',
          fontSize: '0.8rem',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: priorityColors[task.priority] || '#999',
            display: 'inline-block',
          }}
        />
        {task.priority}
      </span>

      <button
        onClick={() => onDelete(task._id)}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#c00',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '0 0.25rem',
        }}
        title="Delete task"
      >
        ✕
      </button>
    </li>
  );
}

export default TaskItem;