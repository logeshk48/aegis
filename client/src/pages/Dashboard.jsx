import { useState, useEffect } from 'react';
import api from '../api/axios';

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

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px' }}>
      <h1>📊 Your Dashboard</h1>
      <p style={{ color: '#666' }}>Here's how you're doing.</p>

      {/* stat cards and charts will go here in the next commits */}
      <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
        {JSON.stringify(stats, null, 2)}
      </pre>
    </div>
  );
}

export default Dashboard;