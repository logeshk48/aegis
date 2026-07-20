function HabitItem({ habit, onCheckIn, onDelete, isDoneToday }) {
  const done = isDoneToday(habit);

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
        done
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <span className="flex-1 text-sm font-medium text-slate-800">{habit.name}</span>

      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
        🔥 {habit.streak}
      </span>

      <button
        onClick={() => onCheckIn(habit._id)}
        disabled={done}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          done
            ? 'bg-slate-100 text-slate-400 cursor-default'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {done ? '✓ Done' : 'Done today'}
      </button>

      <button
        onClick={() => onDelete(habit._id)}
        className="text-slate-300 hover:text-red-500 transition text-lg leading-none px-1"
        title="Delete habit"
      >
        ✕
      </button>
    </li>
  );
}

export default HabitItem;