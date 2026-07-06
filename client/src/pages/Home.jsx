function Home() {
  const userName = localStorage.getItem('userName') || 'there';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Welcome back, {userName} 👋</h1>
      <p>This is your Aegis dashboard. Soon this is where your tasks and habits will live.</p>
    </div>
  );
}

export default Home;