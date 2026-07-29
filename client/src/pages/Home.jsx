import { useState, useEffect } from 'react';
import api from '../api/axios';

// helpers for date logic
const todayStr = () => new Date().toISOString().split('T')[0];

const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] < todayStr();
};

const isDueToday = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate).toISOString().split('T')[0] === todayStr();
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

  // compute the useful groupings
  const overdueTasks = tasks.filter(isOverdue);
  const dueTodayTasks = tasks.filter(isDueToday);
  const pendingTasks = tasks.filter((t) => !t.completed);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return <p className="text-slate-400 text-sm max-w-3xl mx-auto">Loading your day...</p>;
  }

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

      {/* Next commits will render: reminders, stats, habit check-ins, assistant.
          For now, a quick sanity check that data loaded: */}
      <div className="text-sm text-slate-400">
        {overdueTasks.length} overdue · {dueTodayTasks.length} due today · {habits.length} habits
      </div>
    </div>
  );
}

export default Home;