import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, CheckSquare, Flame, BarChart3, BookOpen, LogOut } from 'lucide-react';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Dashboard from './pages/Dashboard';
import Diary from './pages/Diary';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './utils/auth';

function PillNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem('accessToken');
  if (!isLoggedIn) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/habits', label: 'Habits', icon: Flame },
    { to: '/diary', label: 'Diary', icon: BookOpen },
    { to: '/dashboard', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      <nav
        className="flex items-center gap-0.5 sm:gap-1 rounded-full px-1.5 py-1.5 sm:px-2 sm:py-2"
        style={{
          background: 'rgba(20, 16, 31, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-full px-2.5 py-2 sm:px-3 sm:py-2.5"
              style={{
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                ...(active
                  ? {
                      background: 'var(--gradient-gold)',
                      color: '#14101f',
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                    }
                  : { color: 'var(--text-muted)' }),
              }}
            >
              <Icon size={19} strokeWidth={2} />
              {active && <span className="text-sm font-semibold">{item.label}</span>}
            </Link>
          );
        })}

        <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-subtle)' }}></div>

        <button
          onClick={handleLogout}
          className="flex items-center rounded-full px-2.5 py-2 sm:px-3 sm:py-2.5"
          style={{ color: 'var(--text-muted)', transition: 'color 0.3s' }}
          title="Logout"
        >
          <LogOut size={19} strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen pt-8 sm:pt-12 px-4 pb-28 relative overflow-hidden"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* ambient light */}
        <div
          className="pointer-events-none fixed -top-52 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(107, 77, 143, 0.25)' }}
        ></div>
        <div
          className="pointer-events-none fixed bottom-0 -right-40 w-[450px] h-[450px] rounded-full blur-3xl"
          style={{ background: 'rgba(212, 175, 122, 0.07)' }}
        ></div>

        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
          <Route path="/diary" element={<ProtectedRoute><Diary /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Routes>
        <PillNav />
      </div>
    </BrowserRouter>
  );
}

export default App;