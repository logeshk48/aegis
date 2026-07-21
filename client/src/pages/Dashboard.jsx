import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const PRIORITY_COLORS = { low: '#22c55e', medium: '#eab308', high: '#ef4444' };

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/analytics');
        setStats(res.data);
      } catch (err) {
        setError('Could not load analytics.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <p className="text-slate-400 text-sm">Loading your dashboard...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        {error}
      </p>
    );
  }

  const completionRate =
    stats.tasks.total > 0
      ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
      : 0;

  const hasNoData = stats.tasks.total === 0 && stats.habits.total === 0;

  const priorityData = stats.tasks.byPriority.map((p) => ({
    name: p._id,
    value: p.count,
  }));

  const statusData = [
    { name: 'Completed', count: stats.tasks.completed },
    { name: 'Pending', count: stats.tasks.pending },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard 📊</h1>
      <p className="text-slate-500 text-sm mb-6">Here's how you're doing.</p>

      {hasNoData && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
          <p className="text-sm text-indigo-800">
            📭 No data yet! Add some tasks and habits, and your stats will appear here.
          </p>
        </div>
      )}

      {/* Task stats */}
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Tasks</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-8">
        <StatCard label="Total tasks" value={stats.tasks.total} accent="text-indigo-600" />
        <StatCard label="Completed" value={stats.tasks.completed} accent="text-green-600" />
        <StatCard label="Pending" value={stats.tasks.pending} accent="text-amber-500" />
        <StatCard label="Completion rate" value={`${completionRate}%`} accent="text-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Tasks by Priority</h3>
          {priorityData.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">No tasks yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Completed vs Pending</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Habit stats */}
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Habits</h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Total habits" value={stats.habits.total} accent="text-indigo-600" />
        <StatCard label="Best streak 🔥" value={stats.habits.bestStreak} accent="text-orange-500" />
        <StatCard label="Total check-ins" value={stats.habits.totalCheckIns} accent="text-green-600" />
      </div>
    </div>
  );
}

export default Dashboard;