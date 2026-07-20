import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './utils/auth';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // highlight the active page
  const linkClass = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      location.pathname === path
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-100'
    }`;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <span className="text-xl font-bold text-slate-900">Aegis</span>
        </Link>

        {/* links */}
        <div className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <Link to="/tasks" className={linkClass('/tasks')}>Tasks</Link>
              <Link to="/habits" className={linkClass('/habits')}>Habits</Link>
              <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
              <span className="hidden sm:inline text-sm text-slate-500 ml-2 mr-1">
                {userName}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkClass('/login')}>Log In</Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
            <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;