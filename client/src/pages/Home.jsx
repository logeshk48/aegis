import { useState, useEffect } from 'react';
import api from '../api/axios';
import AskAegis from '../components/AskAegis';
import Suggestions from '../components/Suggestions';

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

  const handleCheckIn = async (id) => {
    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits(habits.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      console.error('Could not check in habit:', err);
    }
  };

  // create a task or habit from an AI suggestion
  const handleAcceptSuggestion = async (suggestion) => {
    if (suggestion.type === 'habit') {
      const res = await api.post('/habits', { name: suggestion.title });
      setHabits((prev) => [res.data, ...prev]);
    } else {
      const res = await api.post('/tasks', { title: suggestion.title, priority: 'medium' });
      setTasks((prev) => [res.data, ...prev]);
    }
  };

  const isHabitDoneToday = (habit) =>
    habit.completedDates?.includes(todayStr());

  const overdueTasks = tasks.filter(isOverdue);
  const dueTodayTasks = tasks.filter(isDueToday);
  const pendingTasks = tasks.filter((t) => !t.completed);

  const completedToday = tasks.filter(
    (t) => t.completed && new Date(t.updatedAt).toISOString().split('T')[0] === todayStr()
  ).length;

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

      {/* AI Suggestions */}
      <Suggestions onAccept={handleAcceptSuggestion} />

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

      {/* Habits */}
      {habits.length > 0 && (
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            🔥 Today's habits
          </h2>
          <div className="space-y-2">
            {habits.map((habit) => {
              const done = isHabitDoneToday(habit);
              return (
                <div
                  key={habit._id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition ${
                    done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="flex-1 text-sm font-medium text-slate-800">{habit.name}</span>
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                    🔥 {habit.streak}
                  </span>
                  <button
                    onClick={() => handleCheckIn(habit._id)}
                    disabled={done}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      done
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {done ? '✓ Done' : 'Check in'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ask Aegis */}
      <div className="mb-8">
        <AskAegis />
      </div>
    </div>
  );
}

export default Home;