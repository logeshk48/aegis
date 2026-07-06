import { Navigate } from 'react-router-dom';

// wraps any page that should only be seen by logged-in users
function ProtectedRoute({ children }) {
  const isLoggedIn = !!localStorage.getItem('accessToken');

  // if not logged in, redirect to the login page
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // otherwise, show the page as normal
  return children;
}

export default ProtectedRoute;