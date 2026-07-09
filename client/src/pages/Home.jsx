import { Link } from 'react-router-dom';

function Home() {
  const userName = localStorage.getItem('userName') || 'there';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px' }}>
      <h1>Welcome back, {userName} 👋</h1>
      <p>This is your Aegis dashboard. Ready to get organized?</p>
      <Link
        to="/tasks"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.6rem 1.2rem',
          background: '#4f46e5',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Go to My Tasks →
      </Link>
    </div>
  );
}

export default Home;