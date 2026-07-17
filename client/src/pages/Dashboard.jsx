import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';

// a small reusable card component
function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        flex: '1 1 150px',
        background: 'white',
        border: '1px solid #eee',
        borderRadius: '10px',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

// colors for the priority pie chart
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
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        <p style={{ color: '#888' }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  const completionRate =
    stats.tasks.total > 0
      ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
      : 0;

  // if the user has no data at all yet, show a friendly prompt
  const hasNoData = stats.tasks.total === 0 && stats.habits.total === 0;

  // shape the priority data for the pie chart
  const priorityData = stats.tasks.byPriority.map((p) => ({
    name: p._id,
    value: p.count,
  }));

  // shape the completed/pending data for the bar chart
  const statusData = [
    { name: 'Completed', count: stats.tasks.completed },
    { name: 'Pending', count: stats.tasks.pending },
  ];

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px' }}>
      <h1>📊 Your Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Here's how you're doing.</p>

      {hasNoData && (
        <div
          style={{
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: '10px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: 0, color: '#6b21a8' }}>
            📭 No data yet! Add some tasks and habits, and your stats will appear here.
          </p>
        </div>
      )}

      {/* Task stats */}
      <h2 style={{ fontSize: '1.1rem', color: '#444' }}>Tasks</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total tasks" value={stats.tasks.total} color="#4f46e5" />
        <StatCard label="Completed" value={stats.tasks.completed} color="#22c55e" />
        <StatCard label="Pending" value={stats.tasks.pending} color="#f59e0b" />
        <StatCard label="Completion rate" value={`${completionRate}%`} color="#7c3aed" />
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
        {/* Pie: tasks by priority */}
        <div style={{ flex: '1 1 300px', background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#444' }}>Tasks by Priority</h3>
          {priorityData.length === 0 ? (
            <p style={{ color: '#999' }}>No tasks yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: completed vs pending */}
        <div style={{ flex: '1 1 300px', background: 'white', border: '1px solid #eee', borderRadius: '10px', padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#444' }}>Completed vs Pending</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Habit stats */}
      <h2 style={{ fontSize: '1.1rem', color: '#444' }}>Habits</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <StatCard label="Total habits" value={stats.habits.total} color="#4f46e5" />
        <StatCard label="Best streak 🔥" value={stats.habits.bestStreak} color="#ef4444" />
        <StatCard label="Total check-ins" value={stats.habits.totalCheckIns} color="#22c55e" />
      </div>
    </div>
  );
}

export default Dashboard;