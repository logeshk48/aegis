function HabitItem({ habit, onCheckIn, onDelete, isDoneToday }) {
  const done = isDoneToday(habit);

  return (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '0.85rem 1rem',
        marginBottom: '0.6rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: done ? '#f0fdf4' : 'white',
      }}
    >
      <strong style={{ fontSize: '1rem' }}>{habit.name}</strong>

      <span
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: '#fff7ed',
          color: '#c2410c',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
        }}
        title="Current streak"
      >
        🔥 {habit.streak}
      </span>

      <button
        onClick={() => onCheckIn(habit._id)}
        disabled={done}
        style={{
          padding: '0.4rem 0.8rem',
          background: done ? '#ccc' : '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: done ? 'default' : 'pointer',
        }}
      >
        {done ? '✓ Done' : 'Done today'}
      </button>

      <button
        onClick={() => onDelete(habit._id)}
        style={{
          border: 'none',
          background: 'transparent',
          color: '#c00',
          cursor: 'pointer',
          fontSize: '1.1rem',
          padding: '0 0.25rem',
        }}
        title="Delete habit"
      >
        ✕
      </button>
    </li>
  );
}

export default HabitItem;