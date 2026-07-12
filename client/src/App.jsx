import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './utils/auth';

function NavBar() {
  const navigate = useNavigate();

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
          <Link to="/tasks" style={{ marginRight: '1rem' }}>Tasks</Link>
          <Link to="/habits" style={{ marginRight: '1rem' }}>Habits</Link>
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/habits"
          element={
            <ProtectedRoute>
              <Habits />
            </ProtectedRoute>
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;