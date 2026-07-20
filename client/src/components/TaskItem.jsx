const priorityStyles = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <li
      className={`group flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
        task.completed
          ? 'bg-slate-50 border-slate-200'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task._id)}
        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />

      <span
        className={`flex-1 text-sm ${
          task.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
        }`}
      >
        {task.title}
      </span>

      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          priorityStyles[task.priority] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {task.priority}
      </span>

      <button
        onClick={() => onDelete(task._id)}
        className="text-slate-300 hover:text-red-500 transition text-lg leading-none px-1"
        title="Delete task"
      >
        ✕
      </button>
    </li>
  );
}

export default TaskItem;