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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95vw]">
      <nav
        className="flex items-center gap-0.5 sm:gap-1 rounded-full px-1.5 py-1.5 sm:px-2 sm:py-2 shadow-2xl"
        style={{
          background: 'rgba(20, 17, 40, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-full transition-all duration-300 px-2.5 py-2 sm:px-3 sm:py-2.5"
              style={
                active
                  ? { background: 'var(--sand)', color: '#312c51', paddingLeft: '0.9rem', paddingRight: '0.9rem' }
                  : { color: 'rgba(176,171,196,0.9)' }
              }
            >
              <Icon size={19} strokeWidth={2} />
              {active && <span className="text-sm font-semibold">{item.label}</span>}
            </Link>
          );
        })}

        <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(255,255,255,0.15)' }}></div>

        <button
          onClick={handleLogout}
          className="flex items-center rounded-full px-2.5 py-2 sm:px-3 sm:py-2.5 transition"
          style={{ color: 'rgba(176,171,196,0.9)' }}
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
        className="min-h-screen pt-6 sm:pt-8 px-3 sm:px-4 pb-28 relative overflow-hidden"
        style={{ background: '#312c51' }}
      >
        {/* ambient gradient blobs — what the glass blurs against */}
        <div
          className="pointer-events-none fixed -top-40 -left-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(72,66,109,0.9)' }}
        ></div>
        <div
          className="pointer-events-none fixed top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(241,170,155,0.15)' }}
        ></div>
        <div
          className="pointer-events-none fixed bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'rgba(240,195,142,0.12)' }}
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