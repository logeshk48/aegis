import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import { logout } from './utils/auth';

// the navigation bar — knows whether you're logged in
function NavBar() {
  const navigate = useNavigate();

  // check login state by looking for a stored token
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav style={{ padding: '1rem', fontFamily: 'sans-serif', borderBottom: '1px solid #ddd' }}>
      <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>

      {isLoggedIn ? (
        <>
          <span style={{ marginRight: '1rem' }}>Hi, {userName} 👋</span>
          <button onClick={handleLogout} style={{ padding: '0.3rem 0.8rem' }}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/signup" style={{ marginRight: '1rem' }}>Sign Up</Link>
          <Link to="/login">Log In</Link>
        </>
      )}
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;