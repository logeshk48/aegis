import { useState, useEffect } from 'react';
import api from '../api/axios';

const todayStr = () => new Date().toISOString().split('T')[0];

const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] < todayStr();
};

const isDueToday = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] === todayStr();
};

const priorityDot = {
  low: 'bg-green-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

function Home() {
  const userName = localStorage.getItem('userName') || 'there';
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/habits'),
        ]);
        setTasks(tasksRes.data);
        setHabits(habitsRes.data);
      } catch (err) {
        console.error('Could not load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks(tasks.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error('Could not toggle task:', err);
    }
  };

  const overdueTasks = tasks.filter(isOverdue);
  const dueTodayTasks = tasks.filter(isDueToday);
  const pendingTasks = tasks.filter((t) => !t.completed);

  // completed today (tasks marked done today)
  const completedToday = tasks.filter(
    (t) => t.completed && new Date(t.updatedAt).toISOString().split('T')[0] === todayStr()
  ).length;

  // best current streak across habits
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return <p className="text-slate-400 text-sm max-w-3xl mx-auto">Loading your day...</p>;
  }

  // a small reusable task row
  const TaskRow = ({ task }) => (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-200">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => handleToggle(task._id)}
        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
      <span className={`w-2 h-2 rounded-full ${priorityDot[task.priority] || 'bg-slate-400'}`}></span>
      <span className="flex-1 text-sm text-slate-800">{task.title}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900">
        {greeting}, {userName} 👋
      </h1>
      <p className="text-slate-500 mt-1 mb-8">
        {pendingTasks.length === 0
          ? "You're all caught up. Nice. 🎉"
          : `You have ${pendingTasks.length} thing${pendingTasks.length > 1 ? 's' : ''} on your plate.`}
      </p>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{pendingTasks.length}</div>
          <div className="text-xs text-slate-500 mt-1">Pending</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{completedToday}</div>
          <div className="text-xs text-slate-500 mt-1">Done today</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">🔥 {bestStreak}</div>
          <div className="text-xs text-slate-500 mt-1">Best streak</div>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
            ⏰ Overdue ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <div
                key={task._id}
                className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-lg border border-red-200"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task._id)}
                  className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="flex-1 text-sm text-slate-800">{task.title}</span>
                <span className="text-xs text-red-600 font-medium">
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due today */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
          📅 Due today ({dueTodayTasks.length})
        </h2>
        {dueTodayTasks.length === 0 ? (
          <div className="px-4 py-6 bg-white rounded-lg border border-dashed border-slate-200 text-center text-sm text-slate-400">
            Nothing due today. {overdueTasks.length === 0 ? 'Enjoy the breathing room. 🌤️' : ''}
          </div>
        ) : (
          <div className="space-y-2">
            {dueTodayTasks.map((task) => (
              <TaskRow key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;