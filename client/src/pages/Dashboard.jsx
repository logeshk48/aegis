import { useState, useEffect } from 'react';
import api from '../api/axios';

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

  // completion rate as a percentage
  const completionRate =
    stats.tasks.total > 0
      ? Math.round((stats.tasks.completed / stats.tasks.total) * 100)
      : 0;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px' }}>
      <h1>📊 Your Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Here's how you're doing.</p>

      {/* Task stats */}
      <h2 style={{ fontSize: '1.1rem', color: '#444' }}>Tasks</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total tasks" value={stats.tasks.total} color="#4f46e5" />
        <StatCard label="Completed" value={stats.tasks.completed} color="#22c55e" />
        <StatCard label="Pending" value={stats.tasks.pending} color="#f59e0b" />
        <StatCard label="Completion rate" value={`${completionRate}%`} color="#7c3aed" />
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