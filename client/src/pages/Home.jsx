import { Link } from 'react-router-dom';

function Home() {
  const userName = localStorage.getItem('userName') || 'there';

  const linkStyle = {
    display: 'inline-block',
    marginTop: '1rem',
    marginRight: '0.75rem',
    padding: '0.6rem 1.2rem',
    background: '#4f46e5',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>Welcome back, {userName} 👋</h1>
      <p>This is your Aegis dashboard. Ready to get organized?</p>
      <Link to="/tasks" style={linkStyle}>Go to My Tasks →</Link>
      <Link to="/dashboard" style={linkStyle}>View Dashboard 📊</Link>
    </div>
  );
}

export default Home;