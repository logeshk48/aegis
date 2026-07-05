import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      {/* simple nav links so we can click between pages */}
      <nav style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Home</Link>
        <Link to="/signup" style={{ marginRight: '1rem' }}>Sign Up</Link>
        <Link to="/login">Log In</Link>
      </nav>

      {/* the routes: which URL shows which page */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;