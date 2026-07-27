import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, CheckSquare, Flame, BarChart3, LogOut } from 'lucide-react';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Tasks from './pages/Tasks';
import Habits from './pages/Habits';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { logout } from './utils/auth';

function PillNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem('accessToken');
  if (!isLoggedIn) return null; // no nav on login/signup

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/habits', label: 'Habits', icon: Flame },
    { to: '/dashboard', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-1 bg-slate-900 rounded-full px-2 py-2 shadow-xl shadow-slate-900/20">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-full transition-all duration-300 ${
                active
                  ? 'bg-white text-slate-900 px-4 py-2.5'
                  : 'text-slate-400 hover:text-white px-3 py-2.5'
              }`}
            >
              <Icon size={20} strokeWidth={2} />
              {active && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {/* divider */}
        <div className="w-px h-6 bg-slate-700 mx-1"></div>

        <button
          onClick={handleLogout}
          className="flex items-center rounded-full text-slate-400 hover:text-red-400 px-3 py-2.5 transition"
          title="Logout"
        >
          <LogOut size={20} strokeWidth={2} />
        </button>
      </nav>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 pt-8 px-4 pb-28">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
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