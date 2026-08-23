import { useState } from 'react';
import api from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [name, setName] = useState('');
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
      await api.post('/auth/register', { name, email, password });
      setMessage('Account created. Taking you to sign in…');
      setTimeout(() => navigate('/login'), 1500);
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
        <p className="eyebrow mb-2">Begin</p>
        <h1 className="display-lg mb-1" style={{ fontSize: '1.9rem' }}>
          Create your Aegis
        </h1>
        <p className="body-sm mb-7">
          A quiet place to keep what matters.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="eyebrow block mb-2" style={{ color: 'var(--text-muted)' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should Aegis call you?"
              className="input-lux"
            />
          </div>

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
              placeholder="At least six characters"
              className="input-lux"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full"
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {message && (
          <p className="body-sm mt-4 text-center" style={{ color: 'var(--gold)' }}>
            {message}
          </p>
        )}

        <p className="body-sm mt-7 text-center">
          Already have one?{' '}
          <Link
            to="/login"
            className="font-semibold hover:underline"
            style={{ color: 'var(--gold)' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;