import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import '../styles/dashboard.css';

const PRIORITY_COLORS = {
  low: '#8fbf9f',
  medium: '#d4af7a',
  high: '#c98b8b',
};

function Metric({ value, label }) {
  return (
    <div className="metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
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
        setError('Could not load your figures.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <p className="body-sm max-w-4xl mx-auto">Gathering your figures…</p>;
  }

  if (error) {
    return (
      <p className="body-sm max-w-4xl mx-auto" style={{ color: 'var(--rose)' }}>
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

  const verdict = (() => {
    if (completionRate >= 80) return 'You finish what you start. That is rarer than it sounds.';
    if (completionRate >= 50) return 'Steady. More done than not.';
    if (completionRate > 0) return 'Plenty in motion. Worth closing a few loops.';
    return 'Early days. The numbers will come.';
  })();

  return (
    <div className="max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">The record</p>
        <h1 className="display-lg">Your figures</h1>
        <p className="body-text mt-1">{hasNoData ? 'Nothing measured yet.' : verdict}</p>
      </div>

      {hasNoData ? (
        <div className="empty-panel animate-rise delay-1">
          Add a few tasks and rituals — your figures will appear here.
        </div>
      ) : (
        <>
          {/* Metrics */}
          <div className="metric-grid animate-rise delay-1 mb-4">
            <Metric value={stats.tasks.total} label="Total" />
            <Metric value={stats.tasks.completed} label="Completed" />
            <Metric value={stats.tasks.pending} label="Open" />
            <Metric value={`${completionRate}%`} label="Rate" />
          </div>

          {/* Charts */}
          <div className="chart-grid animate-rise delay-2 mb-8">
            <div className="chart-card">
              <p className="eyebrow mb-3">By priority</p>
              {priorityData.length === 0 ? (
                <p className="lux-empty">Nothing to chart.</p>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={78}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {priorityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PRIORITY_COLORS[entry.name] || '#6b4d8f'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card">
              <p className="eyebrow mb-3">Completed vs open</p>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={statusData} barSize={44}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? '#d4af7a' : '#6b4d8f'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rituals */}
          <div className="group-head">
            <h2 className="display-md" style={{ fontSize: '1.05rem' }}>
              Rituals
            </h2>
          </div>

          <div className="metric-grid animate-rise delay-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <Metric value={stats.habits.total} label="Tracked" />
            <Metric value={stats.habits.bestStreak} label="Best streak" />
            <Metric value={stats.habits.totalCheckIns} label="Check-ins" />
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;