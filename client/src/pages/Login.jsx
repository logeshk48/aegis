import { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });

      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('userName', res.data.user.name);

      setMessage('✅ Logged in! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || 'Something went wrong. Try again.';
      setMessage('❌ ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-10 relative z-10">
      <div className="glass w-full max-w-md p-8">
        <h1 className="heading-xl mb-1">Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Log in to your Aegis account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="tile-label block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-glass"
            />
          </div>

          <div>
            <label className="tile-label block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="input-glass"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-sand w-full">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            {message}
          </p>
        )}

        <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold hover:underline" style={{ color: 'var(--sand)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;