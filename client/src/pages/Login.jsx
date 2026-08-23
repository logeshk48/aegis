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

      setMessage('Welcome back.');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || 'Something went wrong. Try again.';
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center pt-10 relative z-10">
      <div className="surface w-full max-w-md p-8 animate-rise">
        <div className="flex flex-col items-center mb-7">
          <img
            src="/logo.png"
            alt="Aegis"
            className="w-36 h-36 object-contain mb-3"
            style={{ mixBlendMode: 'lighten' }}
          />
          <p className="body-sm">Your day is waiting.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="eyebrow block mb-2" style={{ color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-lux"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2" style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="input-lux"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full"
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {message && (
          <p className="body-sm mt-4 text-center" style={{ color: 'var(--gold)' }}>
            {message}
          </p>
        )}

        <p className="body-sm mt-7 text-center">
          New here?{' '}
          <Link
            to="/signup"
            className="font-semibold hover:underline"
            style={{ color: 'var(--gold)' }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;